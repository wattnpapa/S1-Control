/**
 * Der Fold — eine **Mengenfunktion mit Rebase**, gesteuert vom Katalog.
 *
 * Auflage 4 und 02-ZIELBILD.md Nr. 3: „Der Fold ist eine Mengenfunktion, der
 * Live-Pfad ist ein Rebase, jedes materialisierte Feld traegt die HLC seines
 * Gewinners."
 *
 * ## Warum hier keine Fallunterscheidung nach Ereignisart steht
 *
 * Welches Feld eine Art setzt, in welcher Form und nach welcher Klasse, steht
 * in `katalog/index.ts` — Zeile fuer Zeile aus KONZEPT-EREIGNISSE.md §5
 * abgeschrieben und dort pruefbar. Eine Regel, die nur im Code steht, ist eine
 * Auslegung; das ist der Zustand, den `akte.ts` in M0.3 hatte und der dort
 * zehn Befunde gekostet hat. Der Fold liest die Tabelle.
 *
 * ## Warum hier nirgends sortiert wird
 *
 * Der Fold nimmt Ereignisse einzeln entgegen und verrechnet sie in einen
 * Akkumulator, dessen Aufnahmeoperation kommutativ, assoziativ und idempotent
 * ist: je Feld die **beiden hoechsten** Beobachtungen nach einer totalen
 * Ordnung (§3.3, §3.5). Es gibt keine Stelle, an der eine Ereignisliste
 * sortiert und dann der Reihe nach angewandt wuerde.
 *
 * Das ist keine Stilfrage, sondern die Voraussetzung fuer beides zugleich:
 *
 *   * **Rebase.** Ein nachtraeglich eintreffendes Ereignis darf ein Feld noch
 *     ueberschreiben, wenn seine HLC hoeher ist als die des bisherigen
 *     Gewinners — und darf es nicht, wenn sie niedriger ist.
 *   * **Auflage 18.** Ein Fold, der intern sortiert, macht P1 (Permutation)
 *     zur Tautologie ueber die Sortierfunktion.
 *
 * Sortiert wird ausschliesslich in {@link materialisiere}, und dort nur zur
 * Ausgabe bereits feststehender Mengen. Keine dieser Sortierungen entscheidet
 * einen Konflikt.
 *
 * ## Stand
 *
 * M1.3 Stufe 3a: die Formen (a) und (b) ueber alle Katalogarten. Die beiden
 * strukturellen Arten der Form (c), die Barriere `EinsatzArchiviert`, Undo und
 * die Regeln §5.3.1 bis §5.3.2 folgen in den naechsten Stufen; wo sie fehlen,
 * steht es an der Stelle.
 */

import {
  ABSCHNITTSTYPEN,
  EINHEIT_STATUS,
  ORGANISATIONEN,
  SCHICHTEN,
  TAKTISCHE_EBENEN,
  type Akteur,
  type EreignisId,
} from "./ereignis.js";
import { vergleicheHlc, type Hlc } from "./hlc.js";
import { KATALOG, type Katalogeintrag } from "./katalog/index.js";
import {
  kanonischeSerialisierung,
  vergleicheNachCodepunkt,
  type KanonischerWert,
} from "./kanonisch.js";
import {
  STAERKE_NULL,
  staerkeGeklemmt,
  staerkeGleich,
  staerkeIstNegativ,
  staerkeMinus,
  staerkePlus,
  type Staerke,
  type StaerkeRechnerisch,
} from "./werte.js";
import {
  ARCHIV_ABSCHNITT_ID,
  AUFFANG_ABSCHNITT_ID,
  FOLD_VERSION,
  KAPPUNG_MAX,
  type AbschnittZustand,
  type Beobachtung as ZustandsBeobachtung,
  type Erstwert,
  type Feld,
  type Konflikthinweis,
  type UnbekanntesEreignis,
  type VerworfeneAnlage,
  type VerworfenerSchluessel,
  type WartendeBeobachtung,
  type Zustand,
} from "./zustand.js";

// ---------------------------------------------------------------------------
// Eingang
// ---------------------------------------------------------------------------

/**
 * Was der Fold entgegennimmt: der Rahmen aus §2.1 mit einem beliebigen `typ`.
 *
 * Bewusst **kein** diskriminiertes Union ueber die bekannten Arten. Ein
 * Ereignis einer Art, die dieser Client nicht kennt, ist gueltiger Eingang und
 * wird durchgereicht (§3.7 Regel 1); ein Typ, der das ausschloesse, machte den
 * haeufigsten Fall des gemischten Betriebs zum Compilerfehler.
 */
export interface EingehendesEreignis {
  readonly id: EreignisId;
  readonly hlc: Hlc;
  readonly vorgaenger?: string;
  /** Version der **Nutzlast dieser Art** (§4.1). */
  readonly schemaVersion: number;
  readonly typ: string;
  readonly akteur: Akteur;
  readonly wanduhr: string;
  readonly vorher?: unknown;
  readonly neu?: unknown;
  readonly undoOf?: EreignisId;
  readonly korrekturVon?: EreignisId;
  readonly grund?: string;
  readonly nutzlast?: unknown;
}

// ---------------------------------------------------------------------------
// Der Akkumulator je Feld
// ---------------------------------------------------------------------------

/** Was ein einzelnes Ereignis fuer ein Feld gesetzt hat. */
interface Beobachtung<T> {
  readonly hlc: Hlc;
  readonly ereignisId: EreignisId;
  readonly neu: T;
  /**
   * Der gesehene Vorher-Wert (§2.2a); fehlt bei Anlagen.
   *
   * Ein **Behaelter** und kein blosser Wert: `undefined` und `null` muessen
   * sich unterscheiden lassen — „kein Vorher-Wert mitgefuehrt" gegen
   * „ausdruecklich als ungesetzt gesehen".
   */
  readonly vorher?: { readonly wert: T };
  readonly wanduhr?: string;
  readonly fachlicheZeit?: string;
  readonly zeitklasse?: "IST" | "PLAN";
  readonly undoOf?: EreignisId;
  /** Die Ereignisart — die Entitaet grenzt sie nur ein, sie bestimmt sie nicht (§3.6). */
  readonly ereignisart?: string;
  /** Rahmenfeld `grund` (§2.4); getrennt von der Nutzlast gehalten. */
  readonly grund?: string;
  /** Die **reine Nutzlast**, unveraendert (§3.6); nur bei Anlagen gesetzt. */
  readonly nutzlast?: unknown;
}

/**
 * Die beiden hoechsten Beobachtungen eines Feldes (§3.3).
 *
 * Mehr wird nicht gebraucht: Der Gewinner liefert Wert und Feld-HLC, der
 * Zweite den Wert, gegen den `gesehenerVorher` des Gewinners geprueft wird.
 * „Die beiden groessten Elemente einer Menge bezueglich einer totalen Ordnung"
 * ist kommutativ, assoziativ und idempotent — daher die ganze Aufnahme.
 */
interface FeldStand<T> {
  readonly gewinner: Beobachtung<T>;
  readonly zweiter?: Beobachtung<T>;
}

/**
 * Die totale Ordnung auf Beobachtungen: erst die HLC (§3.5), bei Gleichstand
 * die Ereignis-Id in Codepoint-Ordnung.
 *
 * Der zweite Schritt ist keine Verzierung. Zwei **verschiedene** Ereignisse
 * mit derselben HLC sind ein Protokollbruch — genau den erzeugt aber das
 * geklonte Profil, dessen Injektion M0 verlangt. Ohne den zweiten Schritt
 * entschiede der Akkumulator dann nach Eintreffreihenfolge, und der Fold waere
 * ausgerechnet dort keine Mengenfunktion mehr, wofuer die Fehlerinjektion
 * gebaut ist.
 */
function vergleicheBeobachtung(a: Beobachtung<unknown>, b: Beobachtung<unknown>): number {
  const nachHlc = vergleicheHlc(a.hlc, b.hlc);
  if (nachHlc !== 0) return nachHlc;
  return vergleicheNachCodepunkt(a.ereignisId, b.ereignisId);
}

function nimmBeobachtung<T>(stand: FeldStand<T> | undefined, neu: Beobachtung<T>): FeldStand<T> {
  if (stand === undefined) return { gewinner: neu };

  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand; // dasselbe Ereignis noch einmal — idempotent (P2)
  if (gegenGewinner > 0) return { gewinner: neu, zweiter: stand.gewinner };

  if (stand.zweiter === undefined) return { gewinner: stand.gewinner, zweiter: neu };
  return vergleicheBeobachtung(neu, stand.zweiter) > 0
    ? { gewinner: stand.gewinner, zweiter: neu }
    : stand;
}

/**
 * Der Akkumulator einer **Anlage**: die kleinste HLC gilt, jede weitere geht
 * in die Ablage (§3.11, §3.5).
 *
 * Bei Gleichstand gilt die **kleinere** Id — Anlagen und Erstwert-Felder sind
 * Minimumsbildungen und tragen dieselbe Richtung.
 */
interface AnlageStand {
  readonly gewinner: Beobachtung<unknown>;
  readonly verworfen: ReadonlyMap<EreignisId, Beobachtung<unknown>>;
}

function nimmAnlage(stand: AnlageStand | undefined, neu: Beobachtung<unknown>): AnlageStand {
  if (stand === undefined) return { gewinner: neu, verworfen: new Map() };

  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand;

  const verworfen = new Map(stand.verworfen);
  if (gegenGewinner < 0) {
    // Die kleinere HLC uebernimmt, auch wenn sie spaeter eintrifft.
    verworfen.set(stand.gewinner.ereignisId, stand.gewinner);
    return { gewinner: neu, verworfen };
  }
  verworfen.set(neu.ereignisId, neu);
  return { gewinner: stand.gewinner, verworfen };
}

/**
 * Der Akkumulator eines **Erstwert**-Feldes: die kleinste HLC gilt, die
 * uebrigen stehen als `verdraengt` daneben (§3.3, §3.4).
 *
 * Genau zwei Felder tragen ihn: `einheit.abgeteiltVon` und
 * `einheit.aufgegangenIn`. Warum die verdraengten mitgefuehrt werden muessen:
 * Bei drei Zusammenfuehrungen derselben Quelle (HLC 5, 7, 9) hielte ein
 * Max-2-Akkumulator 9 und 7 — der Gewinner 5 waere verloren, und zwar in
 * jeder Permutation und nach jedem Schnappschuss.
 */
interface ErstwertStand {
  readonly gewinner: Beobachtung<unknown>;
  /** Nach `ereignisId` geschluesselt — eine Menge, damit P2 haelt (§3.6). */
  readonly verdraengt: ReadonlyMap<EreignisId, Beobachtung<unknown>>;
}

function nimmErstwert(stand: ErstwertStand | undefined, neu: Beobachtung<unknown>): ErstwertStand {
  if (stand === undefined) return { gewinner: neu, verdraengt: new Map() };
  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand;

  const verdraengt = new Map(stand.verdraengt);
  if (gegenGewinner < 0) {
    verdraengt.set(stand.gewinner.ereignisId, stand.gewinner);
    return { gewinner: neu, verdraengt };
  }
  verdraengt.set(neu.ereignisId, neu);
  return { gewinner: stand.gewinner, verdraengt };
}

/** Wertgleichheit ueber die kanonische Serialisierung (§7.6) — Skalare wie Strukturen. */
function wertGleich(a: unknown, b: unknown): boolean {
  return (
    kanonischeSerialisierung(a as KanonischerWert) === kanonischeSerialisierung(b as KanonischerWert)
  );
}

// ---------------------------------------------------------------------------
// Der Akkumulator des ganzen Einsatzes
// ---------------------------------------------------------------------------

/** Was der Fold zu **einer** Entitaet haelt. */
interface EntitaetFaltung {
  /** Ohne sie ist die Entitaet noch nicht materialisierbar (§3.10). */
  anlage?: AnlageStand;
  /** Restpfad unter der Entitaet → die beiden hoechsten Beobachtungen. */
  readonly felder: Map<string, FeldStand<unknown>>;
  /** Die beiden Erstwert-Felder `abgeteiltVon` und `aufgegangenIn` (§3.4). */
  readonly erstwerte: Map<string, ErstwertStand>;
}

/** Ein Ereignis, das eine reservierte Id treffen wollte (§5.3.4). */
interface ReservierterTreffer {
  readonly id: string;
  readonly beobachtung: Beobachtung<unknown>;
}

export interface Faltung {
  readonly foldVersion: number;
  /** §3.6: ein Ereignis mit bereits gefalteter `id` wird nicht zweimal verrechnet. */
  readonly gesehen: Set<EreignisId>;
  /** Schluessel ist der Entitaetspfad: `einsatz` oder `<art>/<id>`. */
  readonly entitaeten: Map<string, EntitaetFaltung>;
  readonly reservierteId: Map<EreignisId, ReservierterTreffer>;
  readonly unbekannt: Map<EreignisId, UnbekanntesEreignis>;
}

export function leereFaltung(): Faltung {
  return {
    foldVersion: FOLD_VERSION,
    gesehen: new Set(),
    entitaeten: new Map(),
    reservierteId: new Map(),
    unbekannt: new Map(),
  };
}

function kopiere(faltung: Faltung): Faltung {
  const entitaeten = new Map<string, EntitaetFaltung>();
  for (const [pfad, eintrag] of faltung.entitaeten) {
    entitaeten.set(pfad, {
      anlage: eintrag.anlage,
      felder: new Map(eintrag.felder),
      erstwerte: new Map(eintrag.erstwerte),
    });
  }
  return {
    foldVersion: faltung.foldVersion,
    gesehen: new Set(faltung.gesehen),
    entitaeten,
    reservierteId: new Map(faltung.reservierteId),
    unbekannt: new Map(faltung.unbekannt),
  };
}

// ---------------------------------------------------------------------------
// Die Aufnahmeoperation
// ---------------------------------------------------------------------------

/** Der Entitaetspfad, unter dem eine Art ihre Beobachtungen ablegt (§3.2). */
function entitaetspfad(eintrag: Katalogeintrag, id: string): string {
  if (eintrag.entitaet === "einsatz") return "einsatz";
  if (eintrag.entitaet === "schichtplan") {
    // §3.10: Der Schichtplan wartet unter dem **Dienstposten**, nicht unter
    // sich selbst — die fehlende Entitaet ist der Dienstposten.
    return `dienstposten/${id}`;
  }
  return `${eintrag.entitaet}/${id}`;
}

function alsText(wert: unknown): string | undefined {
  return typeof wert === "string" && wert.length > 0 ? wert : undefined;
}

/** Die Id, auf die ein Ereignis zielt — aus dem Nutzlastfeld der Katalogzeile. */
function idAus(eintrag: Katalogeintrag, nutzlast: unknown): string | undefined {
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  return alsText((nutzlast as Record<string, unknown>)[eintrag.idFeld]);
}

/** Der Restpfad des gesetzten Feldes bei Form (a) (§5.1). */
function feldpfadAus(eintrag: Katalogeintrag, nutzlast: unknown): string | undefined {
  const feld = eintrag.feld;
  if (feld === undefined) return undefined;
  if (feld.art === "fest") return feld.pfad;
  if (typeof nutzlast !== "object" || nutzlast === null) return undefined;
  const name = alsText((nutzlast as Record<string, unknown>)[feld.schluessel]);
  if (name === undefined) return undefined;
  if (eintrag.entitaet === "schichtplan") return `schichtplan/${name}`;
  return feld.praefix === undefined ? name : `${feld.praefix}/${name}`;
}

function fuegeEin(faltung: Faltung, pfad: string): EntitaetFaltung {
  const vorhanden = faltung.entitaeten.get(pfad);
  if (vorhanden !== undefined) return vorhanden;
  const neu: EntitaetFaltung = { felder: new Map(), erstwerte: new Map() };
  faltung.entitaeten.set(pfad, neu);
  return neu;
}

function setzeFeld(
  faltung: Faltung,
  pfad: string,
  feld: string,
  beobachtung: Beobachtung<unknown>,
): void {
  const eintrag = fuegeEin(faltung, pfad);
  eintrag.felder.set(feld, nimmBeobachtung(eintrag.felder.get(feld), beobachtung));
}

/** Der gemeinsame Rahmenanteil jeder Beobachtung. */
function rahmenAnteil(ereignis: EingehendesEreignis): Omit<Beobachtung<unknown>, "neu"> {
  return {
    hlc: ereignis.hlc,
    ereignisId: ereignis.id,
    wanduhr: ereignis.wanduhr,
    ereignisart: ereignis.typ,
    ...(ereignis.grund === undefined ? {} : { grund: ereignis.grund }),
    ...(ereignis.undoOf === undefined ? {} : { undoOf: ereignis.undoOf }),
  };
}

function alsUnbekannt(
  ereignis: EingehendesEreignis,
  grund: UnbekanntesEreignis["grund"],
): UnbekanntesEreignis {
  return {
    id: ereignis.id,
    typ: ereignis.typ,
    schemaVersion: ereignis.schemaVersion,
    hlc: ereignis.hlc,
    akteurBenutzer: ereignis.akteur.benutzer,
    akteurHost: ereignis.akteur.host,
    grund,
  };
}

/**
 * Die Formpruefung aus §2.2, als Teil der Gueltigkeit nach §3.7 Punkt 4.
 *
 * Ungueltig ist: ein Ereignis der Form (a) **ohne** `neu`, eines der Form (b)
 * **mit** `neu`, eines der Form (c) mit `neu` oder `vorher` im Rahmen. Der
 * Wert `null` ist dabei ein gueltiges `neu` („Wert loeschen"); geprueft wird
 * die Anwesenheit des Schluessels, nicht seine Wahrheit.
 */
function formPasst(eintrag: Katalogeintrag, ereignis: EingehendesEreignis): boolean {
  const hatNeu = "neu" in ereignis;
  const hatVorher = "vorher" in ereignis;
  if (eintrag.form === "a") return hatNeu;
  if (eintrag.form === "b") return !hatNeu;
  return !hatNeu && !hatVorher;
}

/**
 * Die `grund`-Pflicht aus §2.4.
 *
 * Die eine Ausnahme haengt am Wert des Rahmenfeldes `neu` und nicht allein an
 * der Art: `EebMeldungAbgelehnt` mit `neu = false` ist die Ruecknahme der
 * Ablehnung, und fuer sie ist `grund` frei. Im Nutzlastschema ist das nicht
 * ausdrueckbar, deshalb steht es hier.
 */
function grundPasst(eintrag: Katalogeintrag, ereignis: EingehendesEreignis): boolean {
  if (eintrag.grundPflicht !== true) return true;
  if (eintrag.typ === "EebMeldungAbgelehnt" && ereignis.neu === false) return true;
  return typeof ereignis.grund === "string" && ereignis.grund.length > 0;
}

/**
 * Die Feldpfade, die eine Anlage belegt (§2.3).
 *
 * Genau die Felder, die ihr Nutzlastschema fuer den Zustand setzt — ohne die
 * Kennung selbst. **Ein optionales Feld, das in der Nutzlast fehlt, belegt
 * keinen Pfad**: Die Anlage setzt es nicht auf abwesend, sie aeussert sich
 * nicht dazu. Sonst ueberschriebe eine nachlaufende Anlage ohne Bemerkung eine
 * bereits gesetzte Bemerkung mit „leer".
 */
function anlageFelder(
  eintrag: Katalogeintrag,
  nutzlast: Record<string, unknown>,
): Map<string, unknown> {
  const felder = new Map<string, unknown>();
  for (const [name, wert] of Object.entries(nutzlast)) {
    if (name === eintrag.idFeld) continue;
    if (wert === undefined) continue;
    if (eintrag.anlageUnterpfade?.includes(name) === true) {
      // Ein Block, dessen Bestandteile je einen eigenen Pfad belegen — die
      // vier `einsatz/kosten/<feld>`, damit ein spaeteres
      // `KostenParameterGeaendert` denselben Pfad trifft (§2.3).
      if (typeof wert === "object" && wert !== null) {
        for (const [teil, teilwert] of Object.entries(wert as Record<string, unknown>)) {
          if (teilwert !== undefined) felder.set(`${name}/${teil}`, teilwert);
        }
      }
      continue;
    }
    felder.set(name, wert);
  }
  return felder;
}

/** Die beiden reservierten Abschnitts-Ids (§5.3.4). */
function istReserviert(eintrag: Katalogeintrag, id: string): boolean {
  return (
    eintrag.entitaet === "abschnitt" &&
    (id === AUFFANG_ABSCHNITT_ID || id === ARCHIV_ABSCHNITT_ID)
  );
}

function setzeErstwert(
  faltung: Faltung,
  pfad: string,
  feld: string,
  beobachtung: Beobachtung<unknown>,
): void {
  const eintrag = fuegeEin(faltung, pfad);
  eintrag.erstwerte.set(feld, nimmErstwert(eintrag.erstwerte.get(feld), beobachtung));
}

/**
 * Die beiden Arten der Form (c): sie wirken auf **mehrere** Entitaeten
 * zugleich (§2.2, §5.4.2, §5.4.3).
 *
 * Je betroffener Entitaet genau ein Feld, und der Wert je Entitaet steht in
 * der Nutzlast unter der Kennung dieser Entitaet — im Rahmen duerfen weder
 * `neu` noch `vorher` stehen, weil beide einwertig sind.
 */
function nimmStrukturell(
  faltung: Faltung,
  eintrag: Katalogeintrag,
  nutzlast: Record<string, unknown>,
  rahmen: Omit<Beobachtung<unknown>, "neu">,
): void {
  if (eintrag.typ === "EinheitAufgeteilt") {
    const neueId = nutzlast["neueEinheitId"] as string;
    const quellId = nutzlast["quellEinheitId"] as string;
    const neueEinheit = nutzlast["neueEinheit"] as Record<string, unknown>;
    const pfad = `einheit/${neueId}`;

    // Der Anlageteil: `EinheitAufgeteilt` legt die neue Einheit an und
    // unterliegt damit §3.11 wie jede Anlage. `inhalt` ist die **ganze**
    // Nutzlast einschliesslich des (c)-Teils — der hat gewirkt, auch wenn der
    // Anlageteil verliert (§3.8a).
    const derEntitaet = fuegeEin(faltung, pfad);
    derEntitaet.anlage = nimmAnlage(derEntitaet.anlage, {
      ...rahmen,
      neu: nutzlast,
      nutzlast,
    });
    for (const [name, wert] of Object.entries(neueEinheit)) {
      if (wert !== undefined) setzeFeld(faltung, pfad, name, { ...rahmen, neu: wert });
    }

    // Die Wirkung steht an der **neuen** Einheit, nicht an der Quelle
    // (§5.4.2): Zwei gleichzeitige Aufteilungen erzeugten sonst beide Teile,
    // und die Quelle saenke nur einmal.
    setzeErstwert(faltung, pfad, "abgeteiltVon", {
      ...rahmen,
      neu: {
        quellEinheitId: quellId,
        abgeteilteStaerke: nutzlast["abgeteilteStaerke"],
        gesehen: nutzlast["gesehen"],
      },
    });

    // Die uebernommenen Fahrzeuge und Personen wechseln mit — je betroffener
    // Entitaet ein Feld, mit dem in der **Nutzlast** mitgefuehrten gesehenen
    // Vorher-Wert. Fehlt er, war die Entitaet keiner Einheit zugeordnet
    // (§2.2a: ein fehlendes optionales Nutzlastfeld sagt „ich sah nichts").
    const uebernahmen: readonly [string, string, string][] = [
      ["uebernommeneFahrzeuge", "fahrzeugId", "fahrzeug"],
      ["uebernommenePersonen", "personId", "person"],
    ];
    for (const [liste, idFeld, art] of uebernahmen) {
      for (const eintragDerListe of (nutzlast[liste] ?? []) as Record<string, string>[]) {
        setzeFeld(faltung, `${art}/${eintragDerListe[idFeld] as string}`, "einheitId", {
          ...rahmen,
          neu: neueId,
          vorher: { wert: eintragDerListe["gesehenEinheitId"] ?? null },
        });
      }
    }
    return;
  }

  // `EinheitZusammengefuehrt` schreibt auf die **Quellen**, nicht auf das Ziel
  // (§5.4.3). Eine aufgegangene Einheit bleibt im Zustand, `zaehlt` ist
  // falsch, ihre Zahlen stecken im Ziel.
  const zielId = nutzlast["zielEinheitId"] as string;
  for (const quelle of (nutzlast["quellen"] ?? []) as Record<string, unknown>[]) {
    setzeErstwert(faltung, `einheit/${quelle["einheitId"] as string}`, "aufgegangenIn", {
      ...rahmen,
      neu: { zielEinheitId: zielId, gesehen: quelle["gesehen"] },
    });
  }
}

function nimmAuf(faltung: Faltung, ereignis: EingehendesEreignis): void {
  if (faltung.gesehen.has(ereignis.id)) return; // §3.6
  faltung.gesehen.add(ereignis.id);

  const eintrag = KATALOG.get(ereignis.typ);
  if (eintrag === undefined) {
    // §3.7 Regel 1: unbekannte Arten werden durchgereicht, nicht verworfen.
    faltung.unbekannt.set(ereignis.id, alsUnbekannt(ereignis, "ART"));
    return;
  }
  if (ereignis.schemaVersion > eintrag.nutzlastVersion) {
    // §3.7 Regel 2: es gibt keinen Downcaster (§4.3).
    faltung.unbekannt.set(ereignis.id, alsUnbekannt(ereignis, "VERSION"));
    return;
  }

  const geprueft = eintrag.schema.safeParse(ereignis.nutzlast);
  if (
    !geprueft.success ||
    !formPasst(eintrag, ereignis) ||
    !grundPasst(eintrag, ereignis) ||
    idAus(eintrag, ereignis.nutzlast) === undefined
  ) {
    // §3.7 Regel 4: der Fold raet nicht und stuerzt nicht ab.
    faltung.unbekannt.set(ereignis.id, alsUnbekannt(ereignis, "SCHEMA"));
    return;
  }

  const nutzlast = ereignis.nutzlast as Record<string, unknown>;
  const id = idAus(eintrag, nutzlast) as string;
  const rahmen = rahmenAnteil(ereignis);

  if (eintrag.form === "c") {
    nimmStrukturell(faltung, eintrag, nutzlast, rahmen);
    return;
  }

  if (eintrag.entitaet === "archivierungen") {
    // Die Barriere `EinsatzArchiviert` und ihre Ruecknahme kommen in Stufe 3e
    // dazu (§7). Bis dahin ebenso sichtbar wie oben.
    faltung.unbekannt.set(ereignis.id, alsUnbekannt(ereignis, "ART"));
    return;
  }

  if (istReserviert(eintrag, id)) {
    // §5.3.4: Anlage **und** jedes aendernde Ereignis auf `AUFFANG` oder
    // `ARCHIV` sind wirkungslos; beide gehen unter `art: "RESERVIERTE_ID"` in
    // `verworfeneSchluessel`, damit nichts still verpufft.
    faltung.reservierteId.set(ereignis.id, {
      id,
      beobachtung: {
        ...rahmen,
        neu: ereignis.neu,
        ...("vorher" in ereignis ? { vorher: { wert: ereignis.vorher } } : {}),
        nutzlast,
      },
    });
    return;
  }

  const pfad = entitaetspfad(eintrag, id);

  if (eintrag.form === "b") {
    const eintragDerEntitaet = fuegeEin(faltung, pfad);
    eintragDerEntitaet.anlage = nimmAnlage(eintragDerEntitaet.anlage, {
      ...rahmen,
      neu: nutzlast,
      nutzlast,
    });
    // §3.11: Auch die **verworfene** Anlage belegt ihre Feldpfade nach der
    // gewoehnlichen Auswahl. Die Beobachtungen gehen deshalb unabhaengig
    // davon in die Felder, welche Anlage `angelegtDurch` stellt.
    for (const [name, wert] of anlageFelder(eintrag, nutzlast)) {
      setzeFeld(faltung, pfad, name, { ...rahmen, neu: wert });
    }
    return;
  }

  // Form (a): genau ein Feld, der Wert steht im Rahmen (§2.2).
  const feld = feldpfadAus(eintrag, nutzlast);
  if (feld === undefined) {
    faltung.unbekannt.set(ereignis.id, alsUnbekannt(ereignis, "SCHEMA"));
    return;
  }
  const wert = eintrag.festerWert === undefined ? ereignis.neu : eintrag.festerWert;
  setzeFeld(faltung, pfad, feld, {
    ...rahmen,
    neu: wert,
    ...("vorher" in ereignis ? { vorher: { wert: ereignis.vorher } } : {}),
    ...(typeof nutzlast["meldezeit"] === "string"
      ? { fachlicheZeit: nutzlast["meldezeit"], zeitklasse: "IST" as const }
      : {}),
  });
}

/**
 * Nimmt Ereignisse in eine bestehende Faltung auf — der Live-Pfad (Rebase).
 *
 * Rein: die uebergebene Faltung bleibt unveraendert, das Ergebnis ist eine
 * neue. Die Reihenfolge der uebergebenen Ereignisse ist ohne Bedeutung, und
 * ebenso, ob sie in einem Aufruf oder in mehreren kommen. Genau das prueft P1.
 */
export function falteHinzu(faltung: Faltung, ereignisse: Iterable<EingehendesEreignis>): Faltung {
  const naechste = kopiere(faltung);
  for (const ereignis of ereignisse) nimmAuf(naechste, ereignis);
  return naechste;
}

/** Faltet eine Ereignismenge von Grund auf. */
export function falteAuf(ereignisse: Iterable<EingehendesEreignis>): Faltung {
  return falteHinzu(leereFaltung(), ereignisse);
}

// ---------------------------------------------------------------------------
// Materialisierung (§3.2 und §3.8)
// ---------------------------------------------------------------------------

function beobachtungAus(b: Beobachtung<unknown>): ZustandsBeobachtung<unknown> {
  return {
    wert: b.neu === undefined ? null : (b.neu as unknown),
    hlc: b.hlc,
    durch: b.ereignisId,
    ...(b.wanduhr === undefined ? {} : { wanduhr: b.wanduhr }),
    ...(b.fachlicheZeit === undefined ? {} : { fachlicheZeit: b.fachlicheZeit }),
    ...(b.zeitklasse === undefined ? {} : { zeitklasse: b.zeitklasse }),
    ...(b.undoOf === undefined ? {} : { undoOf: b.undoOf }),
    ...(b.vorher === undefined
      ? {}
      : { gesehenerVorher: { wert: b.vorher.wert === undefined ? null : b.vorher.wert } }),
  };
}

/**
 * Baut ein Feld samt seiner zweithoechsten Beobachtung (§3.3).
 *
 * Der `zweiter` steht im Zustand und nicht nur im Akkumulator: Ohne ihn liesse
 * sich `vorherPasstNicht` nach einem Schnappschuss nicht mehr bilden, und der
 * Rebase nach dem Laden entschiede anders als der volle Fold (P7).
 */
function feldAus(stand: FeldStand<unknown>): Feld<unknown> {
  const gewinner = beobachtungAus(stand.gewinner);
  if (stand.zweiter === undefined) return gewinner;
  return { ...gewinner, zweiter: beobachtungAus(stand.zweiter) };
}

/**
 * Prueft den gesehenen Vorher-Wert des Gewinners gegen die zweithoechste
 * Beobachtung (§2.2a, Auflage 6).
 *
 * Ohne zweithoechste Beobachtung kein Hinweis: Es gibt nichts, dem die
 * Behauptung des Schreibers widerspraeche — niemandes Arbeit wurde verdraengt.
 * Der Fold prueft Verdraengung, nicht Wahrhaftigkeit.
 *
 * Der Akkumulator haelt je Feld zwei Beobachtungen; bei drei und mehr
 * nebenlaeufigen Schreibern erhaelt nur der zweithoechste einen Hinweis. Das
 * folgt aus §3.1 — ein Schnappschuss traegt den Zustand, nicht den
 * Ereignisstrom — und steht in §8.2 als Nicht-Zusicherung.
 */
function vorherHinweis(
  stand: FeldStand<unknown>,
  feldpfad: string,
): Konflikthinweis | undefined {
  const { gewinner, zweiter } = stand;
  if (zweiter === undefined) return undefined;

  if (gewinner.vorher === undefined) {
    // Der Gewinner hat keinen Vorher-Wert mitgefuehrt — das ist die Anlage
    // (§2.3) — und verdraengt trotzdem eine Aenderung. Er kann sie nicht
    // gesehen haben; ohne Hinweis waere das stilles Verwerfen.
    return wertGleich(gewinner.neu, zweiter.neu)
      ? undefined
      : {
          art: "ohneVorherWertVerdraengt",
          feldpfad,
          gewinner: gewinner.ereignisId,
          verdraengt: zweiter.ereignisId,
          verdraengterWert: zweiter.neu as KanonischerWert,
        };
  }

  if (wertGleich(gewinner.vorher.wert, zweiter.neu)) return undefined;
  return {
    art: "vorherPasstNicht",
    feldpfad,
    gewinner: gewinner.ereignisId,
    verdraengt: zweiter.ereignisId,
    gesehen: gewinner.vorher.wert as KanonischerWert,
    verdraengterWert: zweiter.neu as KanonischerWert,
  };
}

/** Die verworfenen Anlagen einer Entitaet (§3.2), nach `durch` geordnet. */
function verworfeneAnlagenAus(stand: AnlageStand): VerworfeneAnlage[] {
  return [...stand.verworfen.values()]
    .map((b) => ({
      durch: b.ereignisId,
      hlc: b.hlc,
      ereignisart: b.ereignisart ?? "",
      inhalt: (b.nutzlast ?? b.neu) as KanonischerWert,
      ...(b.grund === undefined ? {} : { grund: b.grund }),
    }))
    .sort((a, c) => vergleicheNachCodepunkt(a.durch, c.durch));
}

/**
 * Der Hinweis zu jeder verworfenen Anlage (§3.11).
 *
 * **Auch bei Inhaltsgleichheit.** Zwei Clients, die dieselbe Einheit gleich
 * anlegen, sind eine Auskunft ueber die Lage der Arbeitsplaetze — anders als
 * bei den Inhaltsschluesseln aus §3.6, wo dasselbe zweimal zu scannen ein
 * Alltagsvorgang ist (T100, T52).
 */
function anlageHinweise(
  feldpfad: string,
  stand: AnlageStand,
  verworfene: readonly VerworfeneAnlage[],
): Konflikthinweis[] {
  return verworfene.map((v) => ({
    art: "zweiteAnlageVerworfen" as const,
    feldpfad,
    verworfen: v.durch,
    gilt: stand.gewinner.ereignisId,
    ereignisart: v.ereignisart,
    inhalt: v.inhalt,
    ...(v.grund === undefined ? {} : { grund: v.grund }),
  }));
}

/** Die Anlagedaten, die §3.2 an jeder Entitaet verlangt. */
function anlageAus(stand: AnlageStand): Record<string, unknown> {
  const g = stand.gewinner;
  return {
    angelegtDurch: g.ereignisId,
    angelegtMit: g.hlc,
    angelegtMitNutzlast: (g.nutzlast ?? g.neu) as KanonischerWert,
    angelegtMitArt: g.ereignisart ?? "",
    ...(g.grund === undefined ? {} : { angelegtMitGrund: g.grund }),
  };
}

/**
 * Setzt einen Restpfad mit `/` als verschachteltes Objekt (§3.2).
 *
 * Betrifft `einsatz/kosten/<feld>` und `einheit/logistik/<feld>`: Der Zustand
 * fuehrt sie als Block, der Katalog als eigenen Feldpfad je Bestandteil —
 * damit ein spaeteres `KostenParameterGeaendert` denselben Pfad trifft (§2.3).
 */
function setzeVerschachtelt(ziel: Record<string, unknown>, pfad: string, wert: unknown): void {
  const teile = pfad.split("/");
  let ebene = ziel;
  for (const teil of teile.slice(0, -1)) {
    const vorhanden = ebene[teil];
    if (typeof vorhanden !== "object" || vorhanden === null) {
      ebene[teil] = Object.create(null) as Record<string, unknown>;
    }
    ebene = ebene[teil] as Record<string, unknown>;
  }
  ebene[teile[teile.length - 1] as string] = wert;
}

/** Die offenen Wertebereiche und ihre bekannten Werte (§3.7). */
const OFFENE_BEREICHE: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["einheit.status", new Set<string>(EINHEIT_STATUS)],
  ["einheit.schicht", new Set<string>(SCHICHTEN)],
  ["einheit.organisation", new Set<string>(ORGANISATIONEN)],
  ["einheit.ebene", new Set<string>(TAKTISCHE_EBENEN)],
  ["abschnitt.typ", new Set<string>(ABSCHNITTSTYPEN)],
]);

/**
 * Felder, deren Wert auf eine andere Entitaet verweist (§3.10).
 *
 * Das Feld wird **gefaltet und behalten** — der Verweis ist der gemeldete
 * Wert —, die Entitaet erscheint, und es entsteht `fremdreferenzUnbekannt`.
 * Eine Person ohne bekannte Einheit ist eine reale Meldung.
 */
const FREMDREFERENZEN: ReadonlyMap<string, string> = new Map([
  ["person.einheitId", "einheit"],
  ["fahrzeug.einheitId", "einheit"],
  ["auftrag.einheitId", "einheit"],
  ["anforderung.abzuloesendeEinheitId", "einheit"],
  ["anhang.einheitId", "einheit"],
]);

/**
 * Die beiden systemseitigen Abschnitte (§5.3.4).
 *
 * Sie entstehen ohne Ereignis; deshalb tragen sie weder eine echte Feld-HLC
 * noch eine Ereignis-Id noch eine Wanduhr — eine erfundene Ereignis-Id waere
 * eine, die `zerlegeEreignisId` zu Recht zurueckwiese. Die Platzhalter-HLC
 * steht nur in ihren Feldern und wird nirgends verglichen: Beide nehmen an
 * keinem Konflikt teil, weil ihre Ids reserviert sind.
 */
const SYSTEM_HLC: Hlc = { millisekunden: 0, zaehler: 0, clientId: "system" };

/** `ANGEFORDERT` und `ARCHIV` zaehlen nicht; ein **unbekannter** Typ zaehlt (§3.7). */
const NICHT_ZAEHLENDE_TYPEN: ReadonlySet<string> = new Set(["ANGEFORDERT", "ARCHIV"]);

function zaehltTyp(typ: unknown): boolean {
  return typeof typ === "string" ? !NICHT_ZAEHLENDE_TYPEN.has(typ) : true;
}

const AUFFANG: AbschnittZustand = {
  id: AUFFANG_ABSCHNITT_ID,
  angelegtMit: SYSTEM_HLC,
  name: { wert: "Auffang", hlc: SYSTEM_HLC },
  typ: { wert: "EINSATZORT", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 0, hlc: SYSTEM_HLC },
  verworfeneAnlagen: [],
  systemAbschnitt: true,
  zaehltInGesamtstaerke: true,
};

const ARCHIV: AbschnittZustand = {
  id: ARCHIV_ABSCHNITT_ID,
  angelegtMit: SYSTEM_HLC,
  // Der Name folgt der Excel (`Staerke!B431`), die Reihenfolge setzt das
  // Archiv ans Ende jeder Sortierung (§5.3.4).
  name: { wert: "Einsatz beendet", hlc: SYSTEM_HLC },
  typ: { wert: "ARCHIV", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 999999, hlc: SYSTEM_HLC },
  verworfeneAnlagen: [],
  systemAbschnitt: true,
  zaehltInGesamtstaerke: false,
};

/** Schluessel in Codepoint-Ordnung — §7.6 ordnet so, und der Zustand soll es auch tun. */
function sortierteSchluessel<T>(quelle: ReadonlyMap<string, T>): string[] {
  return [...quelle.keys()].sort(vergleicheNachCodepunkt);
}

/**
 * Baut aus einer Map die Datensammlung des Zustands: Schluessel in
 * Codepoint-Ordnung, **ohne Prototyp**.
 *
 * Der fehlende Prototyp ist kein Feinschliff. Eine Entitaets-Id ist Nutzlast
 * aus einer fremden Datei; heisst sie `__proto__`, waere `sammlung[id] = wert`
 * an einem gewoehnlichen Objekt kein Eintrag, sondern ein Aufruf des
 * Prototyp-Setzers — die Entitaet verschwaende spurlos, und P5 waere trivial
 * erfuellt, weil es sie gar nicht mehr gaebe.
 */
function alsDatensammlung<T>(quelle: ReadonlyMap<string, T>): { readonly [id: string]: T } {
  const sammlung = Object.create(null) as Record<string, T>;
  for (const id of sortierteSchluessel(quelle)) {
    sammlung[id] = quelle.get(id) as T;
  }
  return sammlung;
}

function leereSammlung<T>(): { readonly [id: string]: T } {
  return Object.create(null) as Record<string, T>;
}

/**
 * Loest die Zyklen im Abschnittswald auf (§5.3.1, Auflage 10).
 *
 * **Die Regel wirkt auf das abgeleitete Feld, nicht auf die Beobachtung.**
 * `parentId` behaelt seinen Gewinner samt HLC; hier faellt nur die Kante mit
 * der **groessten** HLC eines Zyklus aus, und der Abschnitt haengt an der
 * Wurzel. Setzte die Regel `parentId` selbst zurueck, gewaenne eine spaeter
 * eintreffende Umhaengung mit kleinerer HLC gegen ein leeres Feld, und ein
 * Client aus dem Schnappschuss kaeme zu einem anderen Baum als der volle Fold.
 *
 * Die groessere HLC weicht, weil sie die juengere Handlung ist und
 * deterministisch waehlbar. An die Wurzel, weil der gesehene Vorher-Wert dem
 * Feld einen Wert gaebe, den kein Ereignis dieser HLC gesetzt hat — die Wurzel
 * ist der einzige Wert, der immer existiert und keinen Zyklus schliessen kann.
 *
 * Terminierung: In einem Elternzeiger-Wald sind Zyklen knoten- und
 * kantendisjunkt; das Loesen einer Kante erzeugt keinen neuen.
 */
function loeseZyklen(
  kanten: ReadonlyMap<string, Feld<unknown>>,
  hinweise: Konflikthinweis[],
): Set<string> {
  const gefallen = new Set<string>();
  const farbe = new Map<string, "laeuft" | "fertig">();

  const elternteil = (id: string): string | undefined => {
    if (gefallen.has(id)) return undefined;
    const wert = kanten.get(id)?.wert;
    return typeof wert === "string" && kanten.has(wert) ? wert : undefined;
  };

  for (const start of [...kanten.keys()].sort(vergleicheNachCodepunkt)) {
    if (farbe.get(start) === "fertig") continue;
    const pfad: string[] = [];
    let laufend: string | undefined = start;
    while (laufend !== undefined && farbe.get(laufend) !== "fertig") {
      if (farbe.get(laufend) === "laeuft") {
        // Ein Zyklus: alles ab dem ersten Auftreten von `laufend`.
        const zyklus = pfad.slice(pfad.indexOf(laufend));
        let schwaechste = zyklus[0] as string;
        for (const id of zyklus) {
          const a = kanten.get(id) as Feld<unknown>;
          const b = kanten.get(schwaechste) as Feld<unknown>;
          const nachHlc = vergleicheHlc(a.hlc, b.hlc);
          const groesser =
            nachHlc !== 0
              ? nachHlc > 0
              : vergleicheNachCodepunkt(a.durch ?? "", b.durch ?? "") > 0;
          if (groesser) schwaechste = id;
        }
        const kante = kanten.get(schwaechste) as Feld<unknown>;
        gefallen.add(schwaechste);
        hinweise.push({
          art: "zyklusAufgeloest",
          feldpfad: `abschnitt/${schwaechste}/parentId`,
          ereignis: kante.durch ?? "",
          gewuenschterParentId: kante.wert as string,
        });
        break;
      }
      farbe.set(laufend, "laeuft");
      pfad.push(laufend);
      laufend = elternteil(laufend);
    }
    for (const id of pfad) farbe.set(id, "fertig");
  }
  return gefallen;
}

/** Wie eine Aufloesungskette endet (§5.3.2 Nr. 3). */
type Kettenende =
  | { readonly art: "REGULAER"; readonly ziel: string }
  | { readonly art: "KREIS" }
  | { readonly art: "UNBEKANNT"; readonly id: string };

/**
 * Folgt der Kette aufgeloester Abschnitte (§5.3.2 Nr. 3).
 *
 * Sie endet auf drei Weisen, und jede hat ihre eigenen Hinweise. Der Abbruch
 * bei der ersten Wiederholung macht die Verfolgung linear. Alles, was die
 * Kette braucht, steht im Zustand — die Regel gilt damit auch nach einem
 * Schnappschuss.
 */
function folgeAufloesung(
  start: string,
  abschnitte: ReadonlyMap<string, AbschnittZustand>,
): Kettenende {
  const gesehen = new Set<string>([start]);
  let laufend = start;
  for (;;) {
    const aufgeloest = abschnitte.get(laufend)?.aufgeloest?.wert as
      | { zielAbschnittId?: string }
      | null
      | undefined;
    const ziel = aufgeloest?.zielAbschnittId;
    if (typeof ziel !== "string") return { art: "REGULAER", ziel: laufend };
    if (!abschnitte.has(ziel)) return { art: "UNBEKANNT", id: ziel };
    if (gesehen.has(ziel)) return { art: "KREIS" };
    gesehen.add(ziel);
    laufend = ziel;
  }
}

/** Das Ziel, das die Aufloesung des **ersten** Kettenglieds benennt (§5.3.2). */
function zielDesErstenGlieds(abschnitt: AbschnittZustand | undefined): string {
  const wert = abschnitt?.aufgeloest?.wert as { zielAbschnittId?: string } | null | undefined;
  return typeof wert?.zielAbschnittId === "string" ? wert.zielAbschnittId : "";
}

/** `true`, wenn ein Feld einen Wert traegt, der weder `null` noch `false` ist (§5.6.2). */
function gilt(feld: Feld<unknown> | undefined): boolean {
  return feld !== undefined && feld.wert !== null && feld.wert !== false;
}

/** Ein Erstwert-Feld, wie §3.2 es im Zustand haelt. */
function erstwertAus(stand: ErstwertStand): Erstwert<unknown> {
  return {
    ...beobachtungAus(stand.gewinner),
    verdraengt: [...stand.verdraengt.values()]
      .map(beobachtungAus)
      .sort((a, b) => vergleicheNachCodepunkt(a.durch ?? "", b.durch ?? "")),
  };
}

interface GebauteEntitaet {
  readonly art: string;
  readonly id: string;
  readonly werte: Record<string, unknown>;
  readonly felder: ReadonlyMap<string, Feld<unknown>>;
  readonly erstwerte: ReadonlyMap<string, ErstwertStand>;
}

/**
 * Baut eine Entitaet aus ihren Feldern und ihrer Anlage.
 *
 * Generisch und nicht je Art, weil der Katalog die Feldnamen festlegt: Was
 * §5 als Feldpfad nennt, ist ein `Feld<T>` unter demselben Namen (§3.2). Die
 * abgeleiteten Merkmale kommen danach je Art dazu; sie sind die einzige
 * Stelle, an der der Fold ueber die Tabelle hinaus etwas weiss.
 */
function baueEntitaet(
  art: string,
  id: string,
  eintrag: EntitaetFaltung,
  hinweise: Konflikthinweis[],
): GebauteEntitaet {
  const anlage = eintrag.anlage as AnlageStand;
  const verworfeneAnlagen = verworfeneAnlagenAus(anlage);
  const pfadDerEntitaet = art === "einsatz" ? "einsatz" : `${art}/${id}`;

  const werte: Record<string, unknown> = { ...anlageAus(anlage) };
  if (art !== "einsatz") werte["id"] = id;
  // `Meldung` und `Anhang` gehen ueber den Inhaltsschluessel und legen ihre
  // Verlierer in `verworfeneSchluessel` ab, tragen also **kein**
  // `verworfeneAnlagen` (§3.2).
  if (art !== "meldung" && art !== "anhang") werte["verworfeneAnlagen"] = verworfeneAnlagen;

  const felder = new Map<string, Feld<unknown>>();
  for (const name of sortierteSchluessel(eintrag.felder)) {
    const stand = eintrag.felder.get(name) as FeldStand<unknown>;
    const feld = feldAus(stand);
    felder.set(name, feld);
    setzeVerschachtelt(werte, name, feld);

    const feldpfad = `${pfadDerEntitaet}/${name}`;
    const hinweis = vorherHinweis(stand, feldpfad);
    if (hinweis !== undefined) hinweise.push(hinweis);

    // §2.2a: Wertbezogene Hinweise entstehen nur am **Gewinner** eines Feldes.
    const bekannte = OFFENE_BEREICHE.get(`${art}.${name}`);
    if (bekannte !== undefined && typeof feld.wert === "string" && !bekannte.has(feld.wert)) {
      hinweise.push({ art: "unbekannterWert", feldpfad, wert: feld.wert });
    }
  }

  for (const name of sortierteSchluessel(eintrag.erstwerte)) {
    const stand = eintrag.erstwerte.get(name) as ErstwertStand;
    werte[name] = erstwertAus(stand);
    // §3.12: Der Hinweis entsteht **je verdraengter Beobachtung**, nicht je
    // Entitaet — bei drei Zusammenfuehrungen derselben Quelle stehen zwei
    // Eintraege in `verdraengt` und zwei Hinweise im Zustand.
    for (const verdraengt of stand.verdraengt.values()) {
      hinweise.push({
        art: "wirkungslosGegenTerminalzustand",
        feldpfad: `${pfadDerEntitaet}/${name}`,
        ereignis: verdraengt.ereignisId,
        grund: name === "abgeteiltVon" ? "ZWEITE_AUFTEILUNG" : "QUELLE_BEREITS_AUFGEGANGEN",
      });
    }
  }

  hinweise.push(...anlageHinweise(pfadDerEntitaet, anlage, verworfeneAnlagen));

  return { art, id, werte, felder, erstwerte: eintrag.erstwerte };
}

/**
 * Erzeugt aus der Faltung den materialisierten Zustand nach §3.2.
 *
 * Rein und ohne Zustand: derselbe Akkumulator ergibt immer denselben Zustand,
 * und zwar bis in die Schluesselreihenfolge der Datensammlungen hinein.
 */
export function materialisiere(faltung: Faltung): Zustand {
  const hinweise: Konflikthinweis[] = [];
  const wartend = new Map<string, WartendeBeobachtung[]>();
  const gebaut = new Map<string, Map<string, GebauteEntitaet>>();

  for (const pfad of sortierteSchluessel(faltung.entitaeten)) {
    const eintrag = faltung.entitaeten.get(pfad) as EntitaetFaltung;
    const trenner = pfad.indexOf("/");
    const art = trenner === -1 ? pfad : pfad.slice(0, trenner);
    const id = trenner === -1 ? pfad : pfad.slice(trenner + 1);

    if (eintrag.anlage === undefined) {
      // §3.10: Ohne eigene Anlage gibt es die Entitaet nicht; sie zu zeigen
      // hiesse, ihre Pflichtfelder zu erfinden. Die Beobachtungen warten
      // sichtbar und wirken unveraendert, sobald die Anlage eintrifft.
      const wartende: WartendeBeobachtung[] = [];
      const ids = new Set<EreignisId>();
      for (const name of sortierteSchluessel(eintrag.felder)) {
        const stand = eintrag.felder.get(name) as FeldStand<unknown>;
        wartende.push({ feld: name, beobachtung: feldAus(stand) });
        ids.add(stand.gewinner.ereignisId);
        if (stand.zweiter !== undefined) ids.add(stand.zweiter.ereignisId);
      }
      // Aufgenommen wird wie sonst — je Feldpfad nach der Aufnahmeoperation
      // seiner Klasse (§3.10). Fuer die beiden Erstwert-Felder also die
      // kleinste plus die verdraengten; sonst verloere eine Zusammenfuehrung
      // auf eine noch nicht angelegte Quelle ihren Gewinner, sobald drei
      // Vorgaenge warten.
      for (const name of sortierteSchluessel(eintrag.erstwerte)) {
        const stand = eintrag.erstwerte.get(name) as ErstwertStand;
        wartende.push({ feld: name, beobachtung: erstwertAus(stand) });
        ids.add(stand.gewinner.ereignisId);
        for (const verdraengt of stand.verdraengt.values()) ids.add(verdraengt.ereignisId);
      }
      if (wartende.length === 0) continue;
      wartend.set(pfad, wartende);
      // Nur die Ids, die `wartend` **haelt** — nicht die aller je
      // eingetroffenen. Sonst hinge der Inhalt daran, ob dieser Client voll
      // gefaltet oder aus einem Schnappschuss geladen hat, und P7 fiele.
      hinweise.push({
        art: "anlageFehlt",
        feldpfad: pfad,
        wartende: [...ids].sort(vergleicheNachCodepunkt),
      });
      continue;
    }

    const entitaet = baueEntitaet(art, id, eintrag, hinweise);
    const nachArt = gebaut.get(art) ?? new Map<string, GebauteEntitaet>();
    nachArt.set(id, entitaet);
    gebaut.set(art, nachArt);
  }

  for (const { verworfen, treffer } of [...faltung.reservierteId].map(([verworfen, treffer]) => ({
    verworfen,
    treffer,
  }))) {
    // §5.3.4: Der `feldpfad` ist **immer** der Pfad der Entitaet — auch bei
    // einem aendernden Ereignis, das einen Feldpfad benennt: gesetzt wurde ja
    // keines. Welche Art verworfen wurde, steht im Eintrag, nicht im Hinweis.
    hinweise.push({
      art: "reservierteIdVerworfen",
      feldpfad: `abschnitt/${treffer.id}`,
      verworfen,
      id: treffer.id,
    });
  }

  // --- Abschnitte, einschliesslich der beiden systemseitigen --------------
  const abschnitte = new Map<string, AbschnittZustand>([
    [AUFFANG_ABSCHNITT_ID, AUFFANG],
    [ARCHIV_ABSCHNITT_ID, ARCHIV],
  ]);
  const elternKanten = new Map<string, Feld<unknown>>();
  for (const [id, entitaet] of gebaut.get("abschnitt") ?? []) {
    abschnitte.set(id, {
      ...entitaet.werte,
      zaehltInGesamtstaerke: zaehltTyp(entitaet.felder.get("typ")?.wert),
    } as unknown as AbschnittZustand);
    const parent = entitaet.felder.get("parentId");
    if (parent !== undefined && typeof parent.wert === "string") elternKanten.set(id, parent);
  }
  // Die beiden Systemabschnitte haben keine Elternkante und stehen trotzdem im
  // Wald: `AUFFANG` oder `ARCHIV` als Elternteil ist ein gueltiger Verweis.
  for (const id of [AUFFANG_ABSCHNITT_ID, ARCHIV_ABSCHNITT_ID]) {
    if (!elternKanten.has(id)) elternKanten.set(id, { wert: null, hlc: SYSTEM_HLC });
  }
  const gefalleneKanten = loeseZyklen(elternKanten, hinweise);
  for (const [id, kante] of elternKanten) {
    const vorhanden = abschnitte.get(id);
    if (vorhanden === undefined || vorhanden.systemAbschnitt === true) continue;
    if (gefalleneKanten.has(id) || typeof kante.wert !== "string") continue;
    abschnitte.set(id, { ...vorhanden, wirksamerParentId: kante.wert });
  }

  // --- Einheiten (§5.4.2, §5.4.2a, §5.4.3) --------------------------------
  const einheitenGebaut = gebaut.get("einheit") ?? new Map<string, GebauteEntitaet>();

  interface Kante {
    readonly traeger: string;
    readonly gegenseite: string;
    readonly gesehen: Staerke;
    readonly abgeteilteStaerke?: Staerke;
    readonly hlc: Hlc;
    readonly durch: EreignisId;
  }

  const abzuege = new Map<string, Kante>(); // Traeger → Kante `abgeteiltVon`
  const zuwaechse = new Map<string, Kante>(); // Traeger → Kante `aufgegangenIn`
  const entfernte = new Set<string>();

  for (const [id, entitaet] of einheitenGebaut) {
    if (gilt(entitaet.felder.get("entfernt"))) entfernte.add(id);

    const abgeteilt = entitaet.erstwerte.get("abgeteiltVon");
    if (abgeteilt !== undefined) {
      const wert = abgeteilt.gewinner.neu as {
        quellEinheitId: string;
        abgeteilteStaerke: Staerke;
        gesehen: Staerke;
      };
      // **(3)** Ein `abgeteiltVon` wirkt nur, wenn die Einheit, die es traegt,
      // durch **dieses** Ereignis angelegt wurde. Sonst haette die
      // Fuehrungsstelle einer fremden Meldung Helfer entnommen (§5.4.2a).
      // Die Bedingung gilt allein fuer `abgeteiltVon`: Ein `aufgegangenIn`
      // wird nie von der Entitaet getragen, die das Ereignis anlegt — wer sie
      // allgemein laese, kaeme dazu, dass kein einziger Zuwachs je wirkt.
      const durchDiesesEreignis = entitaet.werte["angelegtDurch"] === abgeteilt.gewinner.ereignisId;
      if (durchDiesesEreignis) {
        abzuege.set(id, {
          traeger: id,
          gegenseite: wert.quellEinheitId,
          gesehen: wert.gesehen,
          abgeteilteStaerke: wert.abgeteilteStaerke,
          hlc: abgeteilt.gewinner.hlc,
          durch: abgeteilt.gewinner.ereignisId,
        });
      }
    }

    const aufgegangen = entitaet.erstwerte.get("aufgegangenIn");
    if (aufgegangen !== undefined) {
      const wert = aufgegangen.gewinner.neu as { zielEinheitId: string; gesehen: Staerke };
      zuwaechse.set(id, {
        traeger: id,
        gegenseite: wert.zielEinheitId,
        gesehen: wert.gesehen,
        hlc: aufgegangen.gewinner.hlc,
        durch: aufgegangen.gewinner.ereignisId,
      });
    }
  }

  // Die Gegenseite muss im Zustand stehen. Kennt dieser Client sie nicht, ist
  // die Kante **nicht wirksam** (§5.4.2a): Die Quelle bleibt eigenstaendig und
  // zaehlt weiter — ohne diese Regel verschwaenden ihre Kraefte vollstaendig.
  // Der Hinweis verschwindet ohne Zutun, sobald die Anlage eintrifft.
  const unwirksam = new Set<string>();
  for (const [id, kante] of zuwaechse) {
    if (einheitenGebaut.has(kante.gegenseite)) continue;
    unwirksam.add(`aufgegangenIn/${id}`);
    hinweise.push({
      art: "fremdreferenzUnbekannt",
      feldpfad: `einheit/${id}/aufgegangenIn`,
      verweistAuf: kante.gegenseite,
    });
  }
  for (const [id, kante] of abzuege) {
    // Die Gegenrichtung braucht keine Wirksamkeitsregel: Der Abzug findet
    // keine Einheit, auf die er wirken koennte, und die Summe laeuft ueber die
    // Einheiten des Zustands. Sichtbar gemacht wird die Lage trotzdem (T133).
    if (einheitenGebaut.has(kante.gegenseite)) continue;
    hinweise.push({
      art: "fremdreferenzUnbekannt",
      feldpfad: `einheit/${id}/abgeteiltVon`,
      verweistAuf: kante.gegenseite,
    });
  }

  /**
   * **(4)** Kreise wirken nicht — und gesucht wird in **zwei getrennten
   * Graphen**, nicht in einem (§5.4.2a).
   *
   * Eine Kette, die zwischen `abgeteiltVon` und `aufgegangenIn` wechselt, ist
   * kein Kreis: Die beiden Kanten bedeuten Verschiedenes — die eine zieht
   * Kraefte ab und laesst die Einheit zaehlen, die andere laesst die Zahlen
   * stehen und schaltet die Zaehlbarkeit ab. Ohne diese Trennung waere der
   * haeufigste zusammengesetzte Vorgang der Fuehrungsstelle ein Kreis: U wird
   * um V abgeteilt, danach geht der Rest von U in V auf (T139).
   */
  const loeseKantenKreise = (
    kanten: ReadonlyMap<string, Kante>,
    feld: string,
    hinweisart: "aufteilungKreis" | "zusammenfuehrungKreis",
  ): void => {
    const farbe = new Map<string, "laeuft" | "fertig">();
    const naechster = (id: string): string | undefined => {
      if (unwirksam.has(`${feld}/${id}`)) return undefined;
      const kante = kanten.get(id);
      return kante !== undefined && kanten.has(kante.gegenseite) ? kante.gegenseite : undefined;
    };
    for (const start of [...kanten.keys()].sort(vergleicheNachCodepunkt)) {
      if (farbe.get(start) === "fertig") continue;
      const pfad: string[] = [];
      let laufend: string | undefined = start;
      while (laufend !== undefined && farbe.get(laufend) !== "fertig") {
        if (farbe.get(laufend) === "laeuft") {
          const kreis = pfad.slice(pfad.indexOf(laufend));
          let juengste = kreis[0] as string;
          for (const id of kreis) {
            const a = kanten.get(id) as Kante;
            const b = kanten.get(juengste) as Kante;
            const nachHlc = vergleicheHlc(a.hlc, b.hlc);
            const groesser =
              nachHlc !== 0 ? nachHlc > 0 : vergleicheNachCodepunkt(a.durch, b.durch) > 0;
            if (groesser) juengste = id;
          }
          unwirksam.add(`${feld}/${juengste}`);
          hinweise.push({
            art: hinweisart,
            feldpfad: `einheit/${juengste}/${feld}`,
            kanten: kreis
              .map((id) => (kanten.get(id) as Kante).durch)
              .sort(vergleicheNachCodepunkt),
            unwirksam: (kanten.get(juengste) as Kante).durch,
          });
          break;
        }
        farbe.set(laufend, "laeuft");
        pfad.push(laufend);
        laufend = naechster(laufend);
      }
      for (const id of pfad) farbe.set(id, "fertig");
    }
  };

  // **Die Reihenfolge steht fest: erst (3), dann (4), dann (1) und (2)**
  // (§5.4.2a). (3) ist oben schon gelaufen — eine Kante, die (3) fallen laesst,
  // hatte nie eine Wirkung und darf deshalb auch keine wirksame aus einem
  // Kreis schlagen (T140). (1) und (2) laufen **nach** der Kreissuche: Sonst
  // waere bei A→B, B→A und einem `EinheitEntfernt(A)` die Kante von A schon
  // weg, B ginge in die entfernte A auf, und B's Staerke verschwaende ohne
  // Hinweis (T132).
  loeseKantenKreise(abzuege, "abgeteiltVon", "aufteilungKreis");
  loeseKantenKreise(zuwaechse, "aufgegangenIn", "zusammenfuehrungKreis");

  const abzugWirksam = (id: string): boolean =>
    abzuege.has(id) &&
    !unwirksam.has(`abgeteiltVon/${id}`) &&
    einheitenGebaut.has((abzuege.get(id) as Kante).gegenseite);
  const zuwachsKanteWirksam = (id: string): boolean =>
    zuwaechse.has(id) && !unwirksam.has(`aufgegangenIn/${id}`);

  // Die flache Summe aus §5.4.2. **Ohne jede Bedingung an die HLC** — eine HLC
  // ist eine Linearisierung von Nebenlaeufigkeit und sagt nur „nicht kausal
  // davor", nicht „hat gesehen". Traegt `staerke` die **eigene** Staerke, kann
  // eine Meldung einen Zuwachs nie schon enthalten: Sie beschreibt ihn nicht.
  const rechnerisch = new Map<string, StaerkeRechnerisch>();
  for (const [id, entitaet] of einheitenGebaut) {
    rechnerisch.set(id, (entitaet.felder.get("staerke")?.wert ?? STAERKE_NULL) as Staerke);
  }
  for (const [id, kante] of abzuege) {
    // **(2)** Ein Abgang wirkt weiter, auch wenn die abgeteilte Einheit
    // entfernt ist: Die Abgeteilten sind gegangen; sie kommen nicht dadurch
    // zurueck, dass jemand ihren Eintrag entfernt.
    if (!abzugWirksam(id)) continue;
    const quelle = rechnerisch.get(kante.gegenseite);
    if (quelle === undefined) continue;
    rechnerisch.set(kante.gegenseite, staerkeMinus(quelle, kante.abgeteilteStaerke as Staerke));
  }
  for (const [id, kante] of zuwaechse) {
    if (!zuwachsKanteWirksam(id)) continue;
    // **(1)** Ein Zuwachs wirkt nicht, wenn seine Quelle entfernt ist:
    // `EinheitEntfernt` nimmt etwas aus allen Summen, das jemand gemeldet hat.
    if (entfernte.has(id)) continue;
    const ziel = rechnerisch.get(kante.gegenseite);
    if (ziel === undefined) continue;
    rechnerisch.set(kante.gegenseite, staerkePlus(ziel, kante.gesehen));
  }

  const einheiten = new Map<string, unknown>();
  for (const [id, entitaet] of einheitenGebaut) {
    const gemeldet = entitaet.felder.get("abschnittId")?.wert;
    const feldpfad = `einheit/${id}/abschnittId`;
    let wirksamerAbschnittId = AUFFANG_ABSCHNITT_ID;
    if (typeof gemeldet !== "string" || !abschnitte.has(gemeldet)) {
      // §5.3.3, erste Regel: Der Abschnitt ist unbekannt, das
      // `AbschnittAngelegt` noch unterwegs. Der Zustand ist **vorlaeufig** —
      // sobald es eintrifft, steht die Einheit ohne Zutun richtig. Die Staerke
      // einer real gemeldeten Einheit darf nicht dadurch aus der Gesamtstaerke
      // fallen, dass ein Ereignis noch fehlt (Auflage 10).
      if (typeof gemeldet === "string") {
        hinweise.push({ art: "abschnittUnbekannt", feldpfad, gemeldeterAbschnittId: gemeldet });
      }
    } else if (abschnitte.get(gemeldet)?.aufgeloest?.wert == null) {
      wirksamerAbschnittId = gemeldet;
    } else {
      // §5.3.3, zweite Regel: Der Abschnitt ist aufgeloest — eine Handlung mit
      // **benanntem Ziel**. Die Einheit in den Auffang zu legen waere eine
      // dauerhafte Verschlechterung; sie steht im Ziel. Ist das Ziel selbst
      // aufgeloest, wird der Kette gefolgt (§5.3.2 Nr. 3).
      hinweise.push({
        art: "abschnittAufgeloest",
        feldpfad,
        // Immer das **erste** Kettenglied, damit der Hinweis nicht davon
        // abhaengt, wie weit ein Client die Kette schon kennt.
        aufgeloesterAbschnittId: gemeldet,
        zielAbschnittId: zielDesErstenGlieds(abschnitte.get(gemeldet)),
      });
      const ende = folgeAufloesung(gemeldet, abschnitte);
      if (ende.art === "REGULAER") wirksamerAbschnittId = ende.ziel;
      else if (ende.art === "UNBEKANNT") {
        hinweise.push({ art: "abschnittUnbekannt", feldpfad, gemeldeterAbschnittId: ende.id });
      }
      // Beim Kreis bleibt es beim Auffang, und zwar **allein** mit
      // `abschnittAufgeloest`: Es gibt hier keinen unbekannten Abschnitt, und
      // `abschnittUnbekannt` haette kein Feld zu fuellen (T10, T169).
    }

    const summe = rechnerisch.get(id) as StaerkeRechnerisch;
    // **Die Klemmung ist der letzte Schritt.** Alles, was auf der Summe
    // aufsetzt — die Vergleichsgroesse aus §5.4.3 und die Bilanzsumme aus
    // §8.1 —, rechnet mit `wirksameStaerkeRechnerisch`; nur das Lagebild sieht
    // den geklemmten Wert.
    if (staerkeIstNegativ(summe)) {
      hinweise.push({
        art: "staerkeGeklemmt",
        feldpfad: `einheit/${id}/staerke`,
        rechnerisch: summe,
      });
    }
    const entfernt = entfernte.has(id);
    // Massgeblich ist `wirksamAufgegangen`, nicht das blosse Vorhandensein von
    // `aufgegangenIn`: Bei einem Kreis und bei unbekanntem Ziel bleibt die
    // Einheit eigenstaendig und zaehlt (§3.2). Das Entfernen der Quelle
    // gehoert **nicht** zu diesen Ausnahmen — es unterdrueckt den Summanden
    // beim Ziel, laesst die Kante aber wirksam (T152).
    const wirksamAufgegangen = zuwachsKanteWirksam(id);
    einheiten.set(id, {
      ...entitaet.werte,
      logistik: (entitaet.werte["logistik"] as Record<string, unknown>) ?? leereSammlung(),
      wirksamerAbschnittId,
      wirksameStaerkeRechnerisch: summe,
      wirksameStaerke: staerkeGeklemmt(summe),
      wirksamAufgegangen,
      zaehlt:
        !entfernt &&
        !wirksamAufgegangen &&
        (abschnitte.get(wirksamerAbschnittId)?.zaehltInGesamtstaerke ?? false),
    });
  }

  // §5.4.2a (1): Was das Entfernen **mitnimmt**, wird benannt — sonst
  // verschwaende gemeldete Staerke still. Nach unten die Quellen, die in die
  // entfernte Einheit aufgegangen sind; nach oben das Ziel, in das sie selbst
  // aufgegangen ist (T141, T152).
  for (const entfernteId of [...entfernte].sort(vergleicheNachCodepunkt)) {
    const betroffene: { einheitId: string; richtung: "QUELLE" | "ZIEL"; staerke: Staerke }[] = [];
    for (const [id, kante] of zuwaechse) {
      if (kante.gegenseite !== entfernteId || !zuwachsKanteWirksam(id) || entfernte.has(id)) {
        continue;
      }
      betroffene.push({ einheitId: id, richtung: "QUELLE", staerke: kante.gesehen });
    }
    const eigene = zuwaechse.get(entfernteId);
    if (eigene !== undefined && zuwachsKanteWirksam(entfernteId)) {
      betroffene.push({
        einheitId: eigene.gegenseite,
        richtung: "ZIEL",
        staerke: eigene.gesehen,
      });
    }
    if (betroffene.length === 0) continue;
    const entferntDurch = einheitenGebaut.get(entfernteId)?.felder.get("entfernt")?.durch;
    hinweise.push({
      art: "entfernungNimmtZugewachsenes",
      feldpfad: `einheit/${entfernteId}/entfernt`,
      entfernt: entferntDurch ?? "",
      betroffene: betroffene.sort((a, b) => vergleicheNachCodepunkt(a.einheitId, b.einheitId)),
    });
  }

  // §5.4.3: `gesehen` gegen die wirksame Staerke der Quelle. **Geprueft wird
  // allein die geltende Beobachtung** — eine verdraengte hat nichts bewegt,
  // und `wirkungslosGegenTerminalzustand` sagt bereits alles (T159). **Wirkt
  // die Kante nicht, unterbleibt der Vergleich** (T124, T168).
  for (const [id, kante] of zuwaechse) {
    if (!zuwachsKanteWirksam(id)) continue;
    const quellstaerke = rechnerisch.get(id);
    if (quellstaerke === undefined) continue;
    if (staerkeGleich(kante.gesehen, quellstaerke)) continue;
    hinweise.push({
      art: "vorgangSummeWeichtAb",
      feldpfad: `einheit/${id}/staerke`,
      vorgangsart: "ZUSAMMENFUEHRUNG",
      vorgang: kante.durch,
      gesehen: kante.gesehen,
      berechnet: quellstaerke,
    });
  }
  for (const [id, kante] of abzuege) {
    if (!abzugWirksam(id)) continue;
    const quellstaerke = rechnerisch.get(kante.gegenseite);
    if (quellstaerke === undefined) continue;
    // Der Stand, den die Quelle **ohne diese eine Aufteilung** haette:
    // `gesehen` ist der Stand vor dem Vorgang. Vergliche man gegen die
    // wirksame Staerke danach, truege jede fehlerfreie Aufteilung einen
    // Hinweis (§5.4.3).
    const ohneDiesen = staerkePlus(quellstaerke, kante.abgeteilteStaerke as Staerke);
    if (staerkeGleich(kante.gesehen, ohneDiesen)) continue;
    hinweise.push({
      art: "vorgangSummeWeichtAb",
      feldpfad: `einheit/${kante.gegenseite}/staerke`,
      vorgangsart: "AUFTEILUNG",
      vorgang: kante.durch,
      gesehen: kante.gesehen,
      berechnet: ohneDiesen,
    });
  }

  // --- Die uebrigen Entitaeten -------------------------------------------
  const sammlung = (art: string): Map<string, unknown> => {
    const ergebnis = new Map<string, unknown>();
    for (const [id, entitaet] of gebaut.get(art) ?? []) ergebnis.set(id, entitaet.werte);
    return ergebnis;
  };

  // §5.3.3: **Fahrzeuge gehen nicht in den Auffang.** Ein Fahrzeug hat keine
  // Staerke; die Zusicherung ueber Staerkezahlen greift nicht. Damit ist P5
  // sauber getrennt: Es spricht von Einheiten.
  const fahrzeuge = new Map<string, unknown>();
  for (const [id, entitaet] of gebaut.get("fahrzeug") ?? []) {
    const gemeldet = entitaet.felder.get("abschnittId")?.wert;
    const feldpfad = `fahrzeug/${id}/abschnittId`;
    let wirksamerAbschnittId: string | undefined;
    if (typeof gemeldet === "string" && !abschnitte.has(gemeldet)) {
      // Unmittelbar unbekannt: `abschnittId` bleibt gefaltet stehen,
      // `wirksamerAbschnittId` ist **abwesend** — das Fahrzeug haengt an
      // seiner Einheit (T15).
      hinweise.push({ art: "fremdreferenzUnbekannt", feldpfad, verweistAuf: gemeldet });
    } else if (typeof gemeldet === "string") {
      wirksamerAbschnittId = gemeldet;
      if (abschnitte.get(gemeldet)?.aufgeloest?.wert != null) {
        hinweise.push({
          art: "abschnittAufgeloest",
          feldpfad,
          aufgeloesterAbschnittId: gemeldet,
          zielAbschnittId: zielDesErstenGlieds(abschnitte.get(gemeldet)),
        });
        const ende = folgeAufloesung(gemeldet, abschnitte);
        if (ende.art === "REGULAER") wirksamerAbschnittId = ende.ziel;
        else if (ende.art === "UNBEKANNT") {
          hinweise.push({ art: "fremdreferenzUnbekannt", feldpfad, verweistAuf: ende.id });
        }
        // Im Kreis wie im Unbekannten behaelt das Fahrzeug **seinen eigenen**
        // `abschnittId` — nicht den Auffang und nicht „abwesend", denn der
        // Abschnitt, auf den es zeigt, existiert ja (§3.10, T173).
      }
    }
    fahrzeuge.set(id, {
      ...entitaet.werte,
      ...(wirksamerAbschnittId === undefined ? {} : { wirksamerAbschnittId }),
    });
  }

  const anforderungen = new Map<string, unknown>();
  for (const [id, entitaet] of gebaut.get("anforderung") ?? []) {
    // §5.6.2, die Zustandsmaschine, gegen die P6 misst.
    const zustand = gilt(entitaet.felder.get("erledigung"))
      ? "EINGETROFFEN"
      : gilt(entitaet.felder.get("storno"))
        ? "STORNIERT"
        : gilt(entitaet.felder.get("zusage"))
          ? "ZUGESAGT"
          : "OFFEN";
    anforderungen.set(id, { ...entitaet.werte, zustand });
  }

  // --- Meldungen: die Revisionsreihe (§5.8.1) -----------------------------
  const meldungen = new Map<string, unknown>();
  const meldungsListe = [...(gebaut.get("meldung") ?? [])];
  for (const [id, entitaet] of meldungsListe) {
    const schluessel = entitaet.felder.get("einheitSchluessel")?.wert;
    const stand = entitaet.felder.get("stand")?.wert;
    // „Juenger" heisst innerhalb der Reihe nach `stand`, nicht nach HLC
    // (§2.6): Ein nachgescannter Papierbogen von gestern hat die hoehere HLC
    // und den aelteren `stand`.
    const juengere = meldungsListe.some(
      ([fremdeId, fremde]) =>
        fremdeId !== id &&
        typeof schluessel === "string" &&
        fremde.felder.get("einheitSchluessel")?.wert === schluessel &&
        typeof stand === "string" &&
        typeof fremde.felder.get("stand")?.wert === "string" &&
        (fremde.felder.get("stand")?.wert as string) > stand,
    );
    const uebernahmeZustand =
      entitaet.felder.get("abgelehnt")?.wert === true
        ? "ABGELEHNT"
        : !gilt(entitaet.felder.get("uebernahme"))
          ? "NEU"
          : juengere
            ? "GEAENDERT"
            : "UEBERNOMMEN";
    meldungen.set(id, { ...entitaet.werte, uebernahmeZustand });
  }

  // --- Fremdreferenzen (§3.10) -------------------------------------------
  for (const [art, nachArt] of gebaut) {
    for (const [id, entitaet] of nachArt) {
      for (const [name, feld] of entitaet.felder) {
        const zielart = FREMDREFERENZEN.get(`${art}.${name}`);
        if (zielart === undefined) continue;
        if (typeof feld.wert !== "string") continue;
        const vorhanden = zielart === "einheit" ? einheiten.has(feld.wert) : false;
        if (!vorhanden) {
          hinweise.push({
            art: "fremdreferenzUnbekannt",
            feldpfad: `${art}/${id}/${name}`,
            verweistAuf: feld.wert,
          });
        }
      }
    }
  }

  // --- Einsatz ------------------------------------------------------------
  const einsatzGebaut = gebaut.get("einsatz")?.get("einsatz");
  const einsatz =
    einsatzGebaut === undefined
      ? undefined
      : {
          ...einsatzGebaut.werte,
          kosten: (einsatzGebaut.werte["kosten"] as Record<string, unknown>) ?? leereSammlung(),
          // §7.1: Die Kennung stammt aus der geltenden Anlage und ist das
          // einzige abgeleitete Kennungsfeld.
          id:
            ((einsatzGebaut.werte["angelegtMitNutzlast"] as Record<string, unknown>)?.[
              "einsatzId"
            ] as string) ?? "",
          // `ARCHIVIERT` kommt mit der Barriere in Stufe 3e dazu (§7).
          status: gilt(einsatzGebaut.felder.get("ende")) ? "BEENDET" : "AKTIV",
        };

  // --- Kappung (§3.2, Startwert S12) --------------------------------------
  const gekappt = <T extends { readonly id: string }>(werte: readonly T[]): T[] =>
    [...werte].sort((a, b) => vergleicheNachCodepunkt(a.id, b.id)).slice(0, KAPPUNG_MAX);

  const unbekannt = gekappt([...faltung.unbekannt.values()]);

  const verworfeneSchluessel: VerworfenerSchluessel[] = [...faltung.reservierteId]
    .map(([verworfen, treffer]) => ({
      art: "RESERVIERTE_ID" as const,
      schluessel: treffer.id,
      verworfen,
      hlc: treffer.beobachtung.hlc,
      ereignisart: treffer.beobachtung.ereignisart ?? "",
      inhalt: (treffer.beobachtung.nutzlast ?? {}) as KanonischerWert,
      ...(treffer.beobachtung.neu === undefined
        ? {}
        : { neu: treffer.beobachtung.neu as KanonischerWert }),
      ...(treffer.beobachtung.vorher === undefined
        ? {}
        : { vorher: treffer.beobachtung.vorher.wert as KanonischerWert }),
      ...(treffer.beobachtung.grund === undefined ? {} : { grund: treffer.beobachtung.grund }),
    }))
    .sort((a, b) => vergleicheNachCodepunkt(a.verworfen, b.verworfen))
    .slice(0, KAPPUNG_MAX);
  const behalten = new Set(verworfeneSchluessel.map((v) => v.verworfen));

  // §3.2 Schranke 2: Mit dem Eintrag faellt sein Hinweis — das ist gewollt und
  // in §8.2 benannt. Der Hinweis liest **denselben** Eintrag, nicht einen
  // anderen Zustandsteil; genau das macht die Kappung zulaessig.
  const uebrige = hinweise.filter(
    (h) => h.art !== "reservierteIdVerworfen" || behalten.has(h.verworfen),
  );

  // `hinweise` ist eine **Menge** (§3.8): bytegleiche Eintraege fallen
  // zusammen, sonst haenge ihre Zahl daran, wie oft eine Umsetzung die
  // Ableitung aufruft — und das ginge in den `zustandsHash` ein.
  const nachSerialisierung = new Map<string, Konflikthinweis>();
  for (const hinweis of uebrige) {
    nachSerialisierung.set(kanonischeSerialisierung(hinweis as unknown as KanonischerWert), hinweis);
  }
  const geordnet = [...nachSerialisierung.keys()]
    .sort(vergleicheNachCodepunkt)
    .map((schluessel) => nachSerialisierung.get(schluessel) as Konflikthinweis);

  return {
    foldVersion: faltung.foldVersion,
    einsatz: einsatz as Zustand["einsatz"],
    abschnitte: alsDatensammlung(abschnitte),
    einheiten: alsDatensammlung(einheiten) as Zustand["einheiten"],
    fahrzeuge: alsDatensammlung(fahrzeuge) as Zustand["fahrzeuge"],
    personen: alsDatensammlung(sammlung("person")) as Zustand["personen"],
    auftraege: alsDatensammlung(sammlung("auftrag")) as Zustand["auftraege"],
    anforderungen: alsDatensammlung(anforderungen) as Zustand["anforderungen"],
    dienstposten: alsDatensammlung(sammlung("dienstposten")) as Zustand["dienstposten"],
    schichtplan: leereSammlung(),
    meldungen: alsDatensammlung(meldungen) as Zustand["meldungen"],
    anhaenge: alsDatensammlung(sammlung("anhang")) as Zustand["anhaenge"],
    etbEintraege: alsDatensammlung(sammlung("etbEintrag")) as Zustand["etbEintraege"],
    archivierungen: leereSammlung(),
    hinweise: geordnet,
    unbekannt,
    wartend: alsDatensammlung(wartend),
    verworfeneSchluessel,
  };
}

/**
 * Faltet eine Ereignismenge zum Zustand — die Mengenfunktion aus Auflage 4.
 *
 * Das Ergebnis haengt allein von der Menge der Ereignisse ab, nicht von ihrer
 * Reihenfolge und nicht davon, in wie vielen Schueben sie ankommen.
 */
export function falte(ereignisse: Iterable<EingehendesEreignis>): Zustand {
  return materialisiere(falteAuf(ereignisse));
}
