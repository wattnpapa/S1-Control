/**
 * Die Einheitentabelle als Projektion (M3.2).
 *
 * Die Excel führt eine Einheit als **eine Zeile mit 48 Spalten** (Blatt
 * „Stärke", B..AW; Bestandsaufnahme `excel-domaenenmodell.md` §2). Drei
 * Spaltengruppen sind darin ausgeblendet und per Menü zuschaltbar —
 * „Ressourcenplanung" (L:Y), „Logistikdaten" (AC:AI), „Kostenübersicht"
 * (AN:AW). Genau diese Gruppen nennt die DoD von M3.2 mit „ein- und
 * ausblendbar", und genau sie stehen deshalb hier: als Tabelle, nicht als
 * Fallunterscheidung in einer Komponente.
 *
 * **Warum die Spalten in Ring 2 stehen.** An jeder Spalte hängt mehr als eine
 * Überschrift: der Feldpfad, unter dem der Wert im Zustand liegt (§3.2), die
 * Ereignisart, mit der eine Änderung geschrieben wird (§5.4), und damit auch
 * die Stelle, an der ein `vorherPasstNicht` sichtbar wird (§2.2a, Auflage 6).
 * Wer diese Zuordnung im Renderer führt, führt sie neben dem Katalog ein
 * zweites Mal — und eine Inline-Bearbeitung, die die falsche Ereignisart
 * schreibt, fällt erst am Konflikthinweis eines anderen Arbeitsplatzes auf.
 *
 * **Die Excel-Spaltenbuchstaben stehen mit dabei.** Sie sind kein Zierat: Die
 * Führungsstelle arbeitet die Referenzlage (Entscheidung 8) in der Excel und
 * vergleicht sie Spalte für Spalte gegen diese Tabelle.
 */

import {
  EINHEIT_STATUS,
  ORGANISATIONEN,
  PERSONAL_ERFASSUNGEN,
  SCHICHTEN,
  TAKTISCHE_EBENEN,
} from "../ereignis.js";
import { anzeigename, auftragsText, erreichbarkeit, gesamtstaerke, geraeteText, herkunftText, logistik } from "../kennzahlen.js";
import type { Id, Staerke } from "../werte.js";
import type { Beobachtung, EinheitZustand, Konflikthinweis, Zustand } from "../zustand.js";

// ---------------------------------------------------------------------------
// Die Spalten
// ---------------------------------------------------------------------------

/**
 * Die vier Gruppen der Excel plus die Stärke.
 *
 * `GRUNDDATEN` und `STAERKE` sind in der Vorlage immer sichtbar (Spalten B..K,
 * Z..AB und AJ..AM); die anderen drei sind ausgeblendet. Die Vorbelegung
 * unten führt dieselbe Wahl fort — nicht aus Nachahmung, sondern weil eine
 * Tabelle mit 48 sichtbaren Spalten auf einem Führungsstellen-Laptop
 * horizontal scrollt, und die Lage steht in den ersten elf.
 */
export type Spaltengruppe =
  | "GRUNDDATEN"
  | "STAERKE"
  | "RESSOURCENPLANUNG"
  | "LOGISTIKDATEN"
  | "KOSTENUEBERSICHT";

export const SPALTENGRUPPEN: readonly Spaltengruppe[] = [
  "GRUNDDATEN",
  "STAERKE",
  "RESSOURCENPLANUNG",
  "LOGISTIKDATEN",
  "KOSTENUEBERSICHT",
];

/** Die Gruppen, die ohne Zutun sichtbar sind (Excel `sheet2.xml <cols>`). */
export const SICHTBARE_GRUPPEN_VORBELEGUNG: readonly Spaltengruppe[] = ["GRUNDDATEN", "STAERKE"];

/**
 * Wie eine Änderung an dieser Spalte geschrieben wird (§5.4).
 *
 * Vier Wege, und die Unterscheidung gehört in diese Tabelle und nirgendwo
 * sonst: `EinheitStammdatenGeaendert` benennt sein Feld in der Nutzlast,
 * `ZeitpunktGesetzt` und `LogistikGesetzt` ebenso (mit Präfix), und die drei
 * Arten mit festem Feld (`StatusGesetzt`, `SchichtGesetzt`,
 * `StaerkeGeaendert`) tragen gar keinen Feldnamen.
 */
export type Schreibweg =
  | { readonly art: "stammdaten"; readonly feld: string }
  | { readonly art: "festeArt"; readonly typ: string }
  | { readonly art: "zeitpunkt"; readonly feld: string }
  | { readonly art: "logistik"; readonly feld: string };

export interface Spalte {
  /** Schlüssel der Spalte und zugleich Name des Zustandsfeldes, wo es eines gibt. */
  readonly schluessel: string;
  readonly kopf: string;
  /** Die Spalte des Blatts „Stärke", aus der sie stammt. */
  readonly excel: string;
  readonly gruppe: Spaltengruppe;
  readonly art: "text" | "zahl" | "auswahl" | "zeitpunkt" | "staerke" | "berechnet";
  /** Bei `auswahl`: die bekannte Liste (§3.7 — der Bereich bleibt offen). */
  readonly werte?: readonly string[];
  /** Fehlt bei berechneten Spalten und bei den Sammelspalten aus Untertabellen. */
  readonly schreibt?: Schreibweg;
  /** Der Feldpfad im Zustand, an dem Hinweise dieser Spalte hängen (§3.8a). */
  readonly feldpfad?: string;
}

const s = (spalte: Spalte): Spalte => spalte;

/**
 * Die Spalten in der Reihenfolge des Blatts „Stärke".
 *
 * Die Reihenfolge ist die der Excel und nicht die des Zielmodells: Wer die
 * Referenzlage vergleicht, liest von links nach rechts in beiden.
 */
export const SPALTEN: readonly Spalte[] = [
  // B..K — die immer sichtbaren Grunddaten
  s({ schluessel: "fuestKennung", kopf: "FüSt.", excel: "B", gruppe: "GRUNDDATEN", art: "text",
      schreibt: { art: "stammdaten", feld: "fuestKennung" }, feldpfad: "fuestKennung" }),
  s({ schluessel: "bezeichnung", kopf: "Bezeichnung", excel: "C", gruppe: "GRUNDDATEN", art: "text",
      schreibt: { art: "stammdaten", feld: "bezeichnung" }, feldpfad: "bezeichnung" }),
  s({ schluessel: "organisation", kopf: "Organisation", excel: "D", gruppe: "GRUNDDATEN",
      art: "auswahl", werte: ORGANISATIONEN,
      schreibt: { art: "stammdaten", feld: "organisation" }, feldpfad: "organisation" }),
  s({ schluessel: "herkunft", kopf: "Herkunft", excel: "E", gruppe: "GRUNDDATEN", art: "berechnet" }),
  s({ schluessel: "ebene", kopf: "Gliederungsebene", excel: "F/G/H/I", gruppe: "GRUNDDATEN",
      art: "auswahl", werte: TAKTISCHE_EBENEN,
      schreibt: { art: "stammdaten", feld: "ebene" }, feldpfad: "ebene" }),
  // Spalte J und K der Excel sind mehrzeiliger Freitext; im Zielmodell sind es
  // eigene Entitäten (Fahrzeug, Auftrag). Die Tabelle zeigt sie als Sammelzeile
  // und schreibt sie nicht — die Untertabellen tun das (ZDM §3.2).
  s({ schluessel: "geraete", kopf: "Geräte / Fahrzeuge", excel: "J", gruppe: "GRUNDDATEN", art: "berechnet" }),
  s({ schluessel: "auftraege", kopf: "Aufträge", excel: "K", gruppe: "GRUNDDATEN", art: "berechnet" }),
  s({ schluessel: "status", kopf: "Status", excel: "Z", gruppe: "GRUNDDATEN", art: "auswahl",
      werte: EINHEIT_STATUS, schreibt: { art: "festeArt", typ: "StatusGesetzt" }, feldpfad: "status" }),
  s({ schluessel: "schicht", kopf: "Schicht", excel: "AA", gruppe: "GRUNDDATEN", art: "auswahl",
      werte: SCHICHTEN, schreibt: { art: "festeArt", typ: "SchichtGesetzt" }, feldpfad: "schicht" }),
  s({ schluessel: "einheitSchluessel", kopf: "ID Erfassungsbogen", excel: "AB", gruppe: "GRUNDDATEN",
      art: "text", schreibt: { art: "stammdaten", feld: "einheitSchluessel" }, feldpfad: "einheitSchluessel" }),
  s({ schluessel: "personalErfassung", kopf: "Personalerfassung", excel: "—", gruppe: "GRUNDDATEN",
      art: "auswahl", werte: PERSONAL_ERFASSUNGEN,
      schreibt: { art: "stammdaten", feld: "personalErfassung" }, feldpfad: "personalErfassung" }),

  // AJ..AM — die Stärke
  s({ schluessel: "staerke", kopf: "Fü / UFü / He", excel: "AJ/AK/AL", gruppe: "STAERKE",
      art: "staerke", schreibt: { art: "festeArt", typ: "StaerkeGeaendert" }, feldpfad: "staerke" }),
  s({ schluessel: "gesamt", kopf: "Gesamt", excel: "AM", gruppe: "STAERKE", art: "berechnet" }),

  // L..Y — Ressourcenplanung
  s({ schluessel: "erreichbarkeit", kopf: "Erreichbarkeit", excel: "L", gruppe: "RESSOURCENPLANUNG",
      art: "text", schreibt: { art: "stammdaten", feld: "erreichbarkeitOverride" },
      feldpfad: "erreichbarkeitOverride" }),
  s({ schluessel: "verfuegbarBis", kopf: "Verfügbar bis", excel: "M", gruppe: "RESSOURCENPLANUNG",
      art: "zeitpunkt", schreibt: { art: "zeitpunkt", feld: "verfuegbarBis" }, feldpfad: "verfuegbarBis" }),
  s({ schluessel: "eingetroffenAm", kopf: "Eingetroffen", excel: "T", gruppe: "RESSOURCENPLANUNG",
      art: "zeitpunkt", schreibt: { art: "zeitpunkt", feld: "eingetroffenAm" }, feldpfad: "eingetroffenAm" }),
  s({ schluessel: "einsatzendeAm", kopf: "Einsatzende", excel: "U", gruppe: "RESSOURCENPLANUNG",
      art: "zeitpunkt", schreibt: { art: "zeitpunkt", feld: "einsatzendeAm" }, feldpfad: "einsatzendeAm" }),
  s({ schluessel: "rueckfuehrungAm", kopf: "Rückführung", excel: "V", gruppe: "RESSOURCENPLANUNG",
      art: "zeitpunkt", schreibt: { art: "zeitpunkt", feld: "rueckfuehrungAm" }, feldpfad: "rueckfuehrungAm" }),
  s({ schluessel: "bemerkung", kopf: "Bemerkungen", excel: "W", gruppe: "RESSOURCENPLANUNG",
      art: "text", schreibt: { art: "stammdaten", feld: "bemerkung" }, feldpfad: "bemerkung" }),

  // AC..AI — Logistikdaten
  s({ schluessel: "weiblich", kopf: "Weibl.", excel: "AC", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "weiblich" }, feldpfad: "logistik/weiblich" }),
  s({ schluessel: "divers", kopf: "Div.", excel: "AD", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "divers" }, feldpfad: "logistik/divers" }),
  s({ schluessel: "vegetarisch", kopf: "Veget.", excel: "AE", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "vegetarisch" }, feldpfad: "logistik/vegetarisch" }),
  s({ schluessel: "vegan", kopf: "Vegan.", excel: "AF", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "vegan" }, feldpfad: "logistik/vegan" }),
  s({ schluessel: "uebernachtungM", kopf: "ÜN (m)", excel: "AG", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "uebernachtungM" }, feldpfad: "logistik/uebernachtungM" }),
  s({ schluessel: "uebernachtungW", kopf: "ÜN (w)", excel: "AH", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "uebernachtungW" }, feldpfad: "logistik/uebernachtungW" }),
  s({ schluessel: "uebernachtungD", kopf: "ÜN (d)", excel: "AI", gruppe: "LOGISTIKDATEN", art: "zahl",
      schreibt: { art: "logistik", feld: "uebernachtungD" }, feldpfad: "logistik/uebernachtungD" }),

  // AN..AW — Kostenübersicht. Nur die **eine** Eingabespalte der Excel; alles
  // Übrige dort ist Formel und gehört nach Stufe 2 (Entscheidung 1).
  s({ schluessel: "psaSaetzeProTag", kopf: "PSA-Sätze pro Tag", excel: "AO", gruppe: "KOSTENUEBERSICHT",
      art: "zahl", schreibt: { art: "festeArt", typ: "PsaBedarfGesetzt" }, feldpfad: "psaSaetzeProTag" }),
];

/** Die Spalte zu einem Schlüssel — die Tabelle wird oft und punktuell gefragt. */
const SPALTE_JE_SCHLUESSEL: ReadonlyMap<string, Spalte> = new Map(
  SPALTEN.map((spalte) => [spalte.schluessel, spalte]),
);

export function spalte(schluessel: string): Spalte | undefined {
  return SPALTE_JE_SCHLUESSEL.get(schluessel);
}

export function spaltenDerGruppen(gruppen: readonly Spaltengruppe[]): readonly Spalte[] {
  const gewaehlt = new Set(gruppen);
  return SPALTEN.filter((sp) => gewaehlt.has(sp.gruppe));
}

// ---------------------------------------------------------------------------
// Die Zeile
// ---------------------------------------------------------------------------

/**
 * Eine Zelle.
 *
 * `wert` ist der Wert, den ein Bedienschritt als `vorher` mitschickt
 * (§2.2a, Auflage 6) — **nicht** der angezeigte Text. Die Trennung ist der
 * Kern der Inline-Bearbeitung: Angezeigt wird „9 Helfer", geschickt wird das
 * Tripel, und geprüft wird gegen den Wert, den dieser Client gesehen hat.
 */
export interface Zelle {
  readonly text: string;
  readonly wert: unknown;
  /** `true`, sobald ein Hinweis an diesem Feldpfad hängt (§3.8). */
  readonly umstritten: boolean;
  /** Fehlt, wo das Feld nie gesetzt wurde (§3.2). */
  readonly wanduhr?: string;
}

export interface Tabellenzeile {
  readonly einheitId: Id;
  readonly abschnittId: Id;
  readonly reihenfolge: number;
  readonly anzeige: string;
  readonly staerke: Staerke;
  readonly gesamt: number;
  /** §5.4.5: entfernte Einheiten bleiben im Zustand und sind hier gekennzeichnet. */
  readonly entfernt: boolean;
  /** §5.4.3: die Einheit ist in einer anderen aufgegangen und zählt nicht mehr. */
  readonly aufgegangen: boolean;
  /** Hinweise, deren Feldpfad auf diese Einheit zeigt (§3.8a). */
  readonly hinweise: readonly Konflikthinweis[];
  readonly zellen: { readonly [schluessel: string]: Zelle };
}

function beobachtung(einheit: EinheitZustand, feld: string): Beobachtung<unknown> | undefined {
  const teile = feld.split("/");
  if (teile[0] === "logistik") {
    return (einheit.logistik as Record<string, Beobachtung<unknown> | undefined>)[teile[1] ?? ""];
  }
  return (einheit as unknown as Record<string, Beobachtung<unknown> | undefined>)[feld];
}

function alsText(wert: unknown): string {
  if (wert === undefined || wert === null) return "";
  if (typeof wert === "string") return wert;
  if (typeof wert === "number") return String(wert);
  if (typeof wert === "boolean") return wert ? "ja" : "nein";
  return "";
}

function staerkeText(staerke: Staerke): string {
  return `${String(staerke.fuehrer)}/${String(staerke.unterfuehrer)}/${String(staerke.mannschaft)}`;
}

/** Der Feldpfad, unter dem Hinweise zu dieser Einheit stehen (§3.8a). */
export function einheitspfad(einheitId: Id): string {
  return `einheit/${einheitId}`;
}

/**
 * Baut die Zellen einer Einheit.
 *
 * Die drei berechneten Spalten kommen aus den Kennzahlen und nicht aus dem
 * Zustand: `herkunftText` (K27), `geraeteText` (K12) und `auftragsText` (K13)
 * sind dort gegen die Excel-Formeln geprüft, und eine zweite Fassung hier
 * wäre eine zweite Wahrheit über dieselbe Spalte.
 */
export function tabellenzeile(zustand: Zustand, einheit: EinheitZustand): Tabellenzeile {
  const pfad = einheitspfad(einheit.id);
  const hinweise = zustand.hinweise.filter(
    (hinweis) => hinweis.feldpfad === pfad || hinweis.feldpfad.startsWith(`${pfad}/`),
  );
  const umstritten = new Set(hinweise.map((hinweis) => hinweis.feldpfad));
  const zahlen = logistik(zustand, einheit);

  const berechnet: Readonly<Record<string, string>> = {
    herkunft: herkunftText(einheit),
    geraete: geraeteText(zustand, einheit.id),
    auftraege: auftragsText(zustand, einheit.id),
    gesamt: String(gesamtstaerke(einheit)),
  };

  const zellen: Record<string, Zelle> = {};
  for (const sp of SPALTEN) {
    if (sp.art === "berechnet") {
      zellen[sp.schluessel] = { text: berechnet[sp.schluessel] ?? "", wert: undefined, umstritten: false };
      continue;
    }
    if (sp.schluessel === "erreichbarkeit") {
      // K10: Die Erreichbarkeit ist eine Ableitung mit Vorrang des Overrides.
      // Angezeigt wird die Ableitung, geschrieben wird der Override.
      const feld = einheit.erreichbarkeitOverride;
      zellen[sp.schluessel] = {
        text: erreichbarkeit(einheit),
        wert: feld?.wert ?? null,
        umstritten: umstritten.has(`${pfad}/erreichbarkeitOverride`),
        ...(feld?.wanduhr === undefined ? {} : { wanduhr: feld.wanduhr }),
      };
      continue;
    }
    if (sp.schluessel === "staerke") {
      zellen[sp.schluessel] = {
        text: staerkeText(einheit.wirksameStaerke),
        wert: einheit.staerke.wert,
        umstritten: umstritten.has(`${pfad}/staerke`),
        ...(einheit.staerke.wanduhr === undefined ? {} : { wanduhr: einheit.staerke.wanduhr }),
      };
      continue;
    }
    if (sp.gruppe === "LOGISTIKDATEN") {
      // §5.4: Die Logistikfelder sind Overrides über einer Ableitung aus den
      // Personen. Angezeigt wird die Ableitung, geschrieben der Override.
      const feld = beobachtung(einheit, `logistik/${sp.schluessel}`);
      zellen[sp.schluessel] = {
        text: String((zahlen as unknown as Record<string, number>)[sp.schluessel] ?? 0),
        wert: feld?.wert ?? null,
        umstritten: umstritten.has(`${pfad}/${sp.feldpfad ?? sp.schluessel}`),
        ...(feld?.wanduhr === undefined ? {} : { wanduhr: feld.wanduhr }),
      };
      continue;
    }
    const feld = beobachtung(einheit, sp.feldpfad ?? sp.schluessel);
    zellen[sp.schluessel] = {
      text: alsText(feld?.wert),
      wert: feld?.wert ?? null,
      umstritten: umstritten.has(`${pfad}/${sp.feldpfad ?? sp.schluessel}`),
      ...(feld?.wanduhr === undefined ? {} : { wanduhr: feld.wanduhr }),
    };
  }

  return {
    einheitId: einheit.id,
    abschnittId: einheit.wirksamerAbschnittId,
    reihenfolge: typeof einheit.reihenfolge.wert === "number" ? einheit.reihenfolge.wert : 0,
    anzeige: anzeigename(einheit),
    staerke: einheit.wirksameStaerke,
    gesamt: gesamtstaerke(einheit),
    entfernt: einheit.entfernt?.wert === true,
    aufgegangen: einheit.wirksamAufgegangen,
    hinweise,
    zellen,
  };
}

export interface Tabellenoptionen {
  /** Nur Einheiten dieses wirksamen Abschnitts. */
  readonly abschnittId?: Id;
  /** Suchtext über Bezeichnung, Herkunft und FüSt-Kennung — ohne Groß-/Kleinschreibung. */
  readonly suche?: string;
  /** Entfernte und aufgegangene Einheiten mitzeigen (§5.4.5). Vorbelegung: nein. */
  readonly mitStillgelegten?: boolean;
  /** Ausschnitt für die Übertragung: ab welcher Zeile. */
  readonly von?: number;
  /** Ausschnitt: wie viele Zeilen höchstens. */
  readonly anzahl?: number;
}

export interface Tabellenausschnitt {
  readonly zeilen: readonly Tabellenzeile[];
  /** Wie viele Zeilen der Filter insgesamt trifft — die Zahl unter der Tabelle. */
  readonly gesamtzahl: number;
  readonly von: number;
}

/**
 * Die Tabelle, gefiltert und auf einen Ausschnitt beschnitten.
 *
 * **Der Ausschnitt ist der Grund, aus dem diese Funktion einen Ausschnitt und
 * keine Liste liefert.** Die DoD von M3.2 nennt 150 Einheiten; die Simulation
 * geht bis 5.000 (Entscheidung 10). Eine Projektion, die immer alles baut und
 * dem Aufrufer das Schneiden überlässt, baut bei 5.000 Einheiten 5.000 Zeilen
 * mit je 26 Zellen, um 50 davon zu zeigen — und zwar bei jeder Änderung.
 * Gefiltert und sortiert wird deshalb über den schmalen Zustandsobjekten,
 * gebaut werden nur die Zeilen des Ausschnitts.
 */
export function einheitentabelle(
  zustand: Zustand,
  optionen: Tabellenoptionen = {},
): Tabellenausschnitt {
  const suche = optionen.suche?.trim().toLocaleLowerCase("de-DE") ?? "";
  const gefiltert = Object.values(zustand.einheiten).filter((einheit) => {
    if (optionen.mitStillgelegten !== true && (einheit.entfernt?.wert === true || einheit.wirksamAufgegangen)) {
      return false;
    }
    if (optionen.abschnittId !== undefined && einheit.wirksamerAbschnittId !== optionen.abschnittId) {
      return false;
    }
    if (suche === "") return true;
    const heuhaufen = [
      einheit.bezeichnung.wert,
      einheit.organisation.wert,
      einheit.organisationName?.wert,
      einheit.fuestKennung?.wert,
      herkunftText(einheit),
    ]
      .filter((wert): wert is string => typeof wert === "string")
      .join(" ")
      .toLocaleLowerCase("de-DE");
    return heuhaufen.includes(suche);
  });

  // §5.3, „Sekundärsortierung": erst `reihenfolge`, dann die Id in
  // Codepoint-Ordnung — für Einheiten wie für Abschnitte. Ohne die zweite
  // Stufe hinge die Reihenfolge zweier gleichrangiger Zeilen an der
  // Schlüsselreihenfolge der Datensammlung, und zwei Clients zeigten
  // Verschiedenes, obwohl ihr Zustand konvergiert.
  gefiltert.sort((a, b) => {
    const ra = typeof a.reihenfolge.wert === "number" ? a.reihenfolge.wert : 0;
    const rb = typeof b.reihenfolge.wert === "number" ? b.reihenfolge.wert : 0;
    if (ra !== rb) return ra - rb;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const von = Math.max(0, optionen.von ?? 0);
  const anzahl = optionen.anzahl ?? gefiltert.length;
  return {
    zeilen: gefiltert.slice(von, von + anzahl).map((einheit) => tabellenzeile(zustand, einheit)),
    gesamtzahl: gefiltert.length,
    von,
  };
}
