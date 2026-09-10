/**
 * Der Undo-Stapel — KONZEPT-EREIGNISSE.md §6, Regeln U1 bis U6 (Auflage 11).
 *
 * Er steht in Ring 2 und nicht im Worker, obwohl er ein Bedienwerkzeug ist.
 * Der Grund steht in U3: **„Der Stapel liegt nirgends."** Er wird aus den
 * Ereignissen abgeleitet, und eine Ableitung gehoert dorthin, wo sie ohne
 * Dateisystem und ohne Electron gegen den Katalog geprueft werden kann.
 * KONZEPT-SPEICHER.md §4.4 leitet ihn aus dem lokalen Spiegel ab und verweist
 * die Semantik ausdruecklich hierher; diese Datei ist diese Semantik.
 *
 * Zwei Dinge tut dieses Modul, und kein drittes:
 *
 *  * Es sagt, **was** zurueckgenommen werden kann — der Stapel je Client.
 *  * Es baut den **Entwurf** der Kompensation aus dem Katalog. Ein Entwurf,
 *    kein Ereignis: Id, HLC und Akteur gehoeren dem Schreiber (§2.1), und die
 *    Zeile schreibt `@s1/speicher`.
 *
 * Was es ausdruecklich **nicht** tut: den Fold veraendern. U1 sagt, der Fold
 * hat keinen Sonderpfad fuer Undo, und `fold.ts` liest `undoOf` nirgends als
 * Entscheidungsgrund. Eine Kompensation ist ein gewoehnliches Ereignis ihrer
 * Art.
 */

import { KATALOG, type Katalogeintrag } from "./katalog/index.js";
import { vergleicheHlc, type Hlc } from "./hlc.js";
import { vergleicheNachCodepunkt } from "./kanonisch.js";
import type { EingehendesEreignis } from "./fold.js";
import type { EreignisId } from "./ereignis.js";
import type { Feld, Zustand } from "./zustand.js";

/**
 * Startwert S4: die Tiefe des Stapels.
 *
 * §6 U3 begruendet die Zahl: „Der Stapel dient dem Zuruecknehmen eines
 * Vertippers, nicht dem Zurueckrollen einer Schicht." Zwanzig Schritte decken
 * jede Bedienfolge ab, die ein Mensch als „gerade eben" empfindet, und
 * begrenzen, wie weit ein Undo in fremde Arbeit reicht.
 */
export const UNDO_TIEFE = 20;

/** Ein Eintrag des Stapels, so wie die Oberflaeche ihn zeigt. */
export interface StapelEintrag {
  readonly id: EreignisId;
  readonly hlc: Hlc;
  readonly typ: string;
  /** Nur Anzeige, nie Ordnung (§2.6). */
  readonly wanduhr: string;
  /** Das Ereignis selbst — Quelle des `vorher` fuer die Kompensation (U1). */
  readonly ereignis: EingehendesEreignis;
}

/**
 * Was ein Aufrufer zum Schreiben mitgibt.
 *
 * Formgleich mit `Ereignisentwurf` aus `@s1/speicher` — bewusst strukturell
 * und nicht ueber einen gemeinsamen Typ: Ring 2 kennt Ring 3 nicht.
 */
export interface Kompensationsentwurf {
  readonly typ: string;
  readonly nutzlast: Record<string, unknown>;
  readonly neu: unknown;
  readonly vorher?: unknown;
  readonly undoOf: EreignisId;
  readonly grund?: string;
  readonly schemaVersion: number;
}

/** Das Ergebnis eines Rueckname-Versuchs. */
export type Kompensation =
  /** Fertig zum Schreiben. */
  | { readonly art: "entwurf"; readonly entwurf: Kompensationsentwurf }
  /**
   * U2, Zeile „strukturell rueckgaengig": der **inverse Fachvorgang**, nicht
   * ein technisches Zurueckrollen. Er laesst sich nicht aus dem Original
   * ableiten — eine Zusammenfuehrung braucht die Staerke, die zurueckgehen
   * soll, und die steht nirgends im aufgeteilten Ereignis. Die Oberflaeche
   * oeffnet dafuer dieselbe Maske wie fuer die Handlung selbst.
   */
  | { readonly art: "strukturell"; readonly inverseArt: string; readonly meldung: string }
  /** §2.4: Die Zielart verlangt einen `grund`. Die Oberflaeche muss fragen. */
  | { readonly art: "brauchtGrund"; readonly zielArt: string }
  /** U2, Zeile „nicht rueckgaengig", und alles andere, was hier nicht geht. */
  | { readonly art: "nichtMoeglich"; readonly meldung: string };

// ---------------------------------------------------------------------------
// Der Stapel
// ---------------------------------------------------------------------------

/**
 * `true`, wenn diese Art ueberhaupt auf den Stapel darf.
 *
 * Drei Ausschluesse, jeder mit seiner Regel:
 *  * unbekannte Art — dieser Client kann nicht kompensieren, was er nicht
 *    kennt (§3.7 Regel 1);
 *  * `ohneUndo` im Katalog — die sechs Arten aus U2, Zeile „nicht
 *    rueckgaengig", dazu `KorrekturVon` (U4);
 *  * ein Ereignis, das selbst ein `undoOf` traegt — es zurueckzunehmen waere
 *    ein Redo, und U5 sagt, das gibt es nicht.
 */
function darfAufDenStapel(ereignis: EingehendesEreignis): boolean {
  if (ereignis.undoOf !== undefined) return false;
  const eintrag = KATALOG.get(ereignis.typ);
  return eintrag !== undefined && eintrag.ohneUndo !== true;
}

/**
 * Der abgeleitete Stapel eines Clients (U3).
 *
 * Er nimmt jedes Ereignis entgegen, das dieser Client sieht — eigene wie
 * fremde. Die eigenen sind die Kandidaten; die fremden zaehlen mit, weil ein
 * fremdes `undoOf` einen eigenen Kandidaten aus dem Stapel nimmt.
 *
 * **Warum er alle eigenen Ereignisse behaelt und nicht nur zwanzig.** Wird ein
 * Kandidat kompensiert, faellt er weg und der naechstaeltere rueckt nach; ein
 * Ring der Laenge zwanzig haette den Nachruecker bereits vergessen. §4.4 des
 * Speicherkonzepts leitet den Stapel ohnehin aus dem **lokalen Spiegel** ab,
 * also aus allen eigenen Zeilen — hier steht dieselbe Menge im Speicher. Bei
 * 50.000 Ereignissen je Einsatz (§2.6) und fuenf Arbeitsplaetzen ist das der
 * kleinere Preis gegenueber einem Stapel, der falsch endet.
 */
export class Undostapel {
  readonly #clientId: string;
  readonly #tiefe: number;
  /** Eigene Kandidaten, nach Ereignis-Id. */
  readonly #eigene = new Map<EreignisId, EingehendesEreignis>();
  /**
   * Jede Id, die **irgendein** Client kompensiert hat.
   *
   * U3 weicht hier ausdruecklich von KONZEPT-SPEICHER.md §4.4 ab (Befund B2):
   * „Kompensiert ist ein Ereignis, sobald *irgendein* Client es kompensiert
   * hat." Sonst setzte die zweite Ruecknahme denselben Wert ein zweites Mal,
   * mit einer HLC ueber allem, was zwischenzeitlich geschrieben wurde.
   */
  readonly #kompensiert = new Set<EreignisId>();

  constructor(clientId: string, tiefe: number = UNDO_TIEFE) {
    this.#clientId = clientId;
    this.#tiefe = tiefe;
  }

  /** Meldet ein gesehenes Ereignis — gleich, ob eigen oder fremd, gelesen oder geschrieben. */
  nimmAuf(ereignis: EingehendesEreignis): void {
    if (ereignis.undoOf !== undefined) this.#kompensiert.add(ereignis.undoOf);
    if (ereignis.akteur.clientId !== this.#clientId) return;
    if (!darfAufDenStapel(ereignis)) return;
    this.#eigene.set(ereignis.id, ereignis);
  }

  nimmAlleAuf(ereignisse: Iterable<EingehendesEreignis>): void {
    for (const ereignis of ereignisse) this.nimmAuf(ereignis);
  }

  /**
   * Der Stapel, neuestes zuerst, hoechstens {@link UNDO_TIEFE} Eintraege.
   *
   * Geordnet wird nach §3.5: HLC, bei Gleichstand die Ereignis-Id. Dieselbe
   * Ordnung wie im Fold — ein Stapel, der anders ordnete als der Fold, zeigte
   * eine andere „letzte Aktion" als die, die im Zustand oben liegt.
   */
  get eintraege(): readonly StapelEintrag[] {
    const offen: EingehendesEreignis[] = [];
    for (const ereignis of this.#eigene.values()) {
      if (this.#kompensiert.has(ereignis.id)) continue;
      offen.push(ereignis);
    }
    offen.sort((a, b) => {
      const nachHlc = vergleicheHlc(b.hlc, a.hlc);
      return nachHlc !== 0 ? nachHlc : vergleicheNachCodepunkt(b.id, a.id);
    });
    return offen.slice(0, this.#tiefe).map((ereignis) => ({
      id: ereignis.id,
      hlc: ereignis.hlc,
      typ: ereignis.typ,
      wanduhr: ereignis.wanduhr,
      ereignis,
    }));
  }

  /** „Letzte Aktion rueckgaengig" (U3) — oder nichts, wenn der Stapel leer ist. */
  oberster(): StapelEintrag | undefined {
    return this.eintraege[0];
  }
}

// ---------------------------------------------------------------------------
// Der aktuelle Feldwert — Quelle des `vorher` der Kompensation
// ---------------------------------------------------------------------------

/** Von der Katalog-Entitaetsart auf die Datensammlung des Zustands (§3.2). */
const SAMMLUNG: Readonly<Record<string, keyof Zustand>> = {
  abschnitt: "abschnitte",
  einheit: "einheiten",
  fahrzeug: "fahrzeuge",
  person: "personen",
  auftrag: "auftraege",
  anforderung: "anforderungen",
  dienstposten: "dienstposten",
  schichtplan: "schichtplan",
  meldung: "meldungen",
  anhang: "anhaenge",
  etbEintrag: "etbEintraege",
  archivierungen: "archivierungen",
};

/** Der Feldpfad, den ein Eintrag setzt — dieselbe Ableitung wie im Fold (§5.1). */
function feldpfad(eintrag: Katalogeintrag, nutzlast: Record<string, unknown>): string | undefined {
  const wahl = eintrag.feld;
  if (wahl === undefined) return undefined;
  if (wahl.art === "fest") return wahl.pfad;
  const teil = nutzlast[wahl.schluessel];
  if (typeof teil !== "string") return undefined;
  return wahl.praefix === undefined ? teil : `${wahl.praefix}/${teil}`;
}

/**
 * Liest den **geltenden** Wert eines Feldes aus dem materialisierten Zustand.
 *
 * Das ist der Vorher-Wert, den Auflage 6 an der Kompensation verlangt: nicht
 * das, was das Original verdraengt hat, sondern das, was dieser Client jetzt
 * sieht. Nimmt jemand zwischen Original und Ruecknahme eine fremde Aenderung
 * vor, ist genau das der Wert, der in U6 den Hinweis
 * `undoTrifftFremdenStand` traegt.
 *
 * `undefined` heisst „ungesetzt" und ist von `null` („ausdruecklich geloescht")
 * zu unterscheiden — §2.2 haengt daran, ob `vorher` ueberhaupt mitgeschrieben
 * wird.
 */
export function geltenderFeldwert(
  zustand: Zustand,
  entitaet: string,
  id: string,
  pfad: string,
): unknown {
  const wurzel: unknown =
    entitaet === "einsatz"
      ? zustand.einsatz
      : (zustand[SAMMLUNG[entitaet] as keyof Zustand] as Record<string, unknown> | undefined)?.[id];
  if (wurzel === undefined || wurzel === null) return undefined;
  let knoten: unknown = wurzel;
  for (const teil of pfad.split("/")) {
    if (typeof knoten !== "object" || knoten === null) return undefined;
    knoten = (knoten as Record<string, unknown>)[teil];
    if (knoten === undefined) return undefined;
  }
  const feld = knoten as Feld<unknown> | undefined;
  if (feld === undefined || typeof feld !== "object" || !("wert" in feld)) return undefined;
  return feld.wert;
}

// ---------------------------------------------------------------------------
// Der Kompensationsentwurf (U1, U2)
// ---------------------------------------------------------------------------

function nutzlastAls(ereignis: EingehendesEreignis): Record<string, unknown> {
  const roh: unknown = ereignis.nutzlast;
  return typeof roh === "object" && roh !== null ? (roh as Record<string, unknown>) : {};
}

/**
 * Baut den Entwurf, mit dem das genannte Ereignis zurueckgenommen wird.
 *
 * Die Zielart kommt aus dem Katalog und nicht aus einer Fallunterscheidung
 * ueber Namen: U1 verlangt, dass fuer **jede** ruecknehmbare Art entweder ein
 * Gegenereignis benannt ist oder dieselbe Art mit `neu = vorher` genuegt. Wo
 * beides fehlt, ist das ein Katalogfehler und keine Bedienlage — dann meldet
 * diese Funktion `nichtMoeglich` statt etwas zu erfinden.
 *
 * Der `neu`-Wert stammt aus drei Quellen, in dieser Reihenfolge:
 *  1. dem `festerWert` der Zielart (`EinheitEntfernt` setzt `true`,
 *     `AbschnittWiederhergestellt` setzt `null`) — deshalb `Object.hasOwn`
 *     und nicht `!== undefined`: `null` ist hier ein Wert, keine Abwesenheit;
 *  2. dem `vorher` des Originals, wenn dieselbe Art die Ruecknahme traegt;
 *  3. `null`, wenn das Original nichts verdraengt hat — „Wert loeschen" (§2.2).
 */
export function kompensationFuer(
  original: EingehendesEreignis,
  zustand: Zustand,
  grund?: string,
): Kompensation {
  const eintrag = KATALOG.get(original.typ);
  if (eintrag === undefined) {
    return { art: "nichtMoeglich", meldung: `Unbekannte Ereignisart: ${original.typ}` };
  }
  if (eintrag.ohneUndo === true) {
    return {
      art: "nichtMoeglich",
      meldung: `${original.typ} ist nach §6 U2 nicht rücknehmbar.`,
    };
  }
  if (original.undoOf !== undefined) {
    return { art: "nichtMoeglich", meldung: "Ein Redo gibt es nicht (§6 U5)." };
  }

  if (eintrag.form === "c") {
    const inverse = eintrag.gegenereignis;
    if (inverse === undefined) {
      return { art: "nichtMoeglich", meldung: `${original.typ} nennt kein Gegenereignis.` };
    }
    return {
      art: "strukturell",
      inverseArt: inverse,
      meldung:
        `${original.typ} wird durch den inversen Fachvorgang ${inverse} zurückgenommen ` +
        "(§6 U2). Die Werte dafür stehen nicht im Original.",
    };
  }

  const zielArt = eintrag.gegenereignis ?? (eintrag.form === "a" ? eintrag.typ : undefined);
  if (zielArt === undefined) {
    return {
      art: "nichtMoeglich",
      meldung: `${original.typ} legt an und nennt kein Gegenereignis.`,
    };
  }
  const ziel = KATALOG.get(zielArt);
  if (ziel === undefined) {
    return { art: "nichtMoeglich", meldung: `Gegenereignis ${zielArt} steht nicht im Katalog.` };
  }
  if (ziel.grundPflicht === true && (grund === undefined || grund.length === 0)) {
    return { art: "brauchtGrund", zielArt };
  }

  const quelle = nutzlastAls(original);
  const id = quelle[eintrag.idFeld];
  if (typeof id !== "string") {
    return { art: "nichtMoeglich", meldung: `Im Original fehlt ${eintrag.idFeld}.` };
  }

  // Die Nutzlast der Kompensation traegt genau zwei Dinge: die Kennung und,
  // wo die Zielart ihr Feld aus der Nutzlast waehlt, dieselbe Feldwahl wie das
  // Original. Alles Weitere waere geraten.
  const nutzlast: Record<string, unknown> = { [ziel.idFeld]: id };
  if (ziel.feld?.art === "ausNutzlast") {
    const wahl = quelle[ziel.feld.schluessel];
    if (wahl === undefined) {
      return {
        art: "nichtMoeglich",
        meldung: `Im Original fehlt die Feldwahl ${ziel.feld.schluessel}.`,
      };
    }
    nutzlast[ziel.feld.schluessel] = wahl;
  }

  const geprueft = ziel.schema.safeParse(nutzlast);
  if (!geprueft.success) {
    return {
      art: "nichtMoeglich",
      meldung: `Die Nutzlast für ${zielArt} lässt sich nicht aus dem Original ableiten.`,
    };
  }

  const neu = Object.hasOwn(ziel, "festerWert")
    ? ziel.festerWert
    : original.vorher === undefined
      ? null
      : original.vorher;

  const pfad = feldpfad(ziel, nutzlast);
  const vorher =
    pfad === undefined ? undefined : geltenderFeldwert(zustand, ziel.entitaet, id, pfad);

  return {
    art: "entwurf",
    entwurf: {
      typ: zielArt,
      nutzlast,
      neu,
      ...(vorher === undefined ? {} : { vorher }),
      undoOf: original.id,
      ...(grund === undefined || grund.length === 0 ? {} : { grund }),
      schemaVersion: ziel.nutzlastVersion,
    },
  };
}
