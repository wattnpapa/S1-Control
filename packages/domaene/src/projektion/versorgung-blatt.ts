/**
 * Das Blatt „Versorgung" und die Zahlen des Monitors (S4.1, KONZEPT-S4.md §5, §6).
 *
 * Neben der Vorausschau (`versorgung.ts`) braucht der S4 drei Tabellen und
 * eine Handvoll Zahlen. Alle stehen hier, in Ring 2, damit weder Renderer
 * noch Ausgabe eine zweite Summe bilden (§3): Der Mahlzeitenplan, die Liste
 * der Einheiten mit Übernachtungsbedarf, die Abarbeitungsliste des
 * Sofortbedarfs und die kleine Zusammenfassung für das Lagebild.
 */

import { MAHLZEITEN, MAHLZEITENREGEL_VORBELEGUNG, type Mahlzeit, type Mahlzeitenregel } from "../werte.js";
import type { Zustand } from "../zustand.js";

import { logistikblatt } from "./logistik.js";
import { belegung, unterbringung, type Belegung, type Bettensumme, type Unterbringungsbedarf } from "./unterkunft.js";
import {
  ausgabestelleDes,
  ausgabestellen,
  bestellverlauf,
  geltendeBestellung,
  type Ausgabestellenzeile,
  type Bestellzeile,
} from "./bestellung.js";
import { regelstand } from "./mahlzeitenregel.js";
import { sofortbedarfsliste, type Sofortbedarfsliste } from "./sofortbedarf.js";
import {
  versorgungseinheiten,
  vorausschauAus,
  type Kost,
  type Versorgungseinheit,
  type Versorgungsoptionen,
  type Vorausschau,
} from "./versorgung.js";

/** Die Wörter der Mahlzeiten — kurz für Tabellenköpfe. */
export const MAHLZEIT_TEXT: Readonly<Record<Mahlzeit, string>> = {
  FRUEHSTUECK: "Frühstück",
  MITTAG: "Mittag",
  ABEND: "Abend",
  NACHT: "Nacht",
};

/** Die Wörter der Mahlzeiten — lang für den Monitor. */
export const MAHLZEIT_LANG: Readonly<Record<Mahlzeit, string>> = {
  FRUEHSTUECK: "Frühstück",
  MITTAG: "Mittagessen",
  ABEND: "Abendessen",
  NACHT: "Nachtverpflegung",
};

const SCHICHT_TEXT: Readonly<Record<string, string>> = { TAG: "Tag", NACHT: "Nacht", FRUEH: "Früh", SPAET: "Spät" };

/** Die Regel als ein Satz: „TAG → Frühstück, Mittag, Abend · NACHT → …". */
export function regeltext(regel: Mahlzeitenregel): string {
  const jeSchicht = new Map<string, string[]>();
  for (const zeile of regel) {
    for (const schicht of zeile.schichten) {
      jeSchicht.set(schicht, [...(jeSchicht.get(schicht) ?? []), MAHLZEIT_TEXT[zeile.mahlzeit]]);
    }
  }
  return [...jeSchicht.entries()]
    .map(([schicht, mahlzeiten]) => `${SCHICHT_TEXT[schicht] ?? schicht} → ${mahlzeiten.join(", ")}`)
    .join(" · ");
}

// ---------------------------------------------------------------------------
// Mahlzeitenplan (4d)
// ---------------------------------------------------------------------------

export interface Planzeile {
  readonly abschnittId: string;
  readonly bereich: string;
  readonly jeMahlzeit: Readonly<Record<Mahlzeit, number>>;
  readonly koepfe: number;
  readonly vegetarisch: number;
  readonly vegan: number;
  /** S4.3: die Ausgabestelle des Bereichs, gesetzt oder vorbelegt. */
  readonly ausgabestelle?: { readonly id?: string; readonly name: string; readonly vorbelegt: boolean };
}

export interface Mahlzeitenplan {
  readonly regel: readonly { readonly mahlzeit: Mahlzeit; readonly uhrzeit: string; readonly schichten: readonly string[] }[];
  readonly zeilen: readonly Planzeile[];
  readonly summe: Planzeile;
  /** Angefordert / Anmarsch — getrennt, nie in der Summe (§3). */
  readonly anmarsch: Planzeile;
}

function leerePlanzeile(abschnittId: string, bereich: string): Planzeile {
  return {
    abschnittId,
    bereich,
    jeMahlzeit: { FRUEHSTUECK: 0, MITTAG: 0, ABEND: 0, NACHT: 0 },
    koepfe: 0,
    vegetarisch: 0,
    vegan: 0,
  };
}

function planPlus(zeile: Planzeile, eintrag: Versorgungseinheit, regel: Mahlzeitenregel): Planzeile {
  const jeMahlzeit = { ...zeile.jeMahlzeit };
  for (const r of regel) {
    if (r.schichten.includes(eintrag.schicht)) jeMahlzeit[r.mahlzeit] += eintrag.kost.portionen;
  }
  return {
    ...zeile,
    jeMahlzeit,
    koepfe: zeile.koepfe + eintrag.kost.portionen,
    vegetarisch: zeile.vegetarisch + eintrag.kost.vegetarisch,
    vegan: zeile.vegan + eintrag.kost.vegan,
  };
}

function zeilenSumme(a: Planzeile, b: Planzeile): Planzeile {
  const jeMahlzeit = { ...a.jeMahlzeit };
  for (const m of MAHLZEITEN) jeMahlzeit[m] += b.jeMahlzeit[m];
  return { ...a, jeMahlzeit, koepfe: a.koepfe + b.koepfe, vegetarisch: a.vegetarisch + b.vegetarisch, vegan: a.vegan + b.vegan };
}

/** Der Mahlzeitenplan des Tages: je Bereich die Portionen je Mahlzeit (ohne Zeitbezug). */
export function mahlzeitenplan(
  einheiten: readonly Versorgungseinheit[],
  regel: Mahlzeitenregel = MAHLZEITENREGEL_VORBELEGUNG,
  zustand?: Zustand,
): Mahlzeitenplan {
  const zeilen = new Map<string, Planzeile>();
  let anmarsch = leerePlanzeile("ANGEFORDERT", "Angefordert / Anmarsch");
  for (const eintrag of einheiten) {
    if (eintrag.klasse !== "BESTAND") {
      anmarsch = planPlus(anmarsch, eintrag, regel);
      continue;
    }
    const bisher = zeilen.get(eintrag.abschnittId) ?? leerePlanzeile(eintrag.abschnittId, eintrag.bereich);
    zeilen.set(eintrag.abschnittId, planPlus(bisher, eintrag, regel));
  }
  const liste = [...zeilen.values()]
    .filter((z) => z.koepfe > 0)
    .map((z) => {
      const stelle = zustand === undefined ? undefined : ausgabestelleDes(zustand, z.abschnittId);
      return stelle === undefined ? z : { ...z, ausgabestelle: stelle };
    });
  return {
    regel: regel.map((r) => ({ mahlzeit: r.mahlzeit, uhrzeit: r.uhrzeit, schichten: r.schichten })),
    zeilen: liste,
    summe: liste.reduce(zeilenSumme, leerePlanzeile("GESAMT", "Gesamt")),
    anmarsch,
  };
}

// ---------------------------------------------------------------------------
// Die Zahlen des Monitors (Lagebild.versorgung, §6)
// ---------------------------------------------------------------------------

/** Je Mahlzeit sieben Zahlen; `bestellt` folgt mit S4.3. */
export interface Mahlzeitzahlen extends Kost {
  readonly mahlzeit: Mahlzeit;
  readonly zeitpunkt: string;
  readonly bestand: number;
  readonly zugang: number;
  readonly abgang: number;
  readonly bestellt?: number;
  /** `bestellt − portionen`, sofern bestellt ist; negativ heißt, es fehlen Portionen. */
  readonly differenz?: number;
}

export interface Versorgungszahlen {
  /** Die nächste Mahlzeit, Bestand nach Mahlzeitenregel — ohne Anmarsch (4a). */
  readonly naechste?: Kost & { readonly mahlzeit: Mahlzeit; readonly zeitpunkt: string };
  /** Die Mahlzeiten der nächsten 24 Stunden mit Vorausschau (4h). */
  readonly mahlzeiten: readonly Mahlzeitzahlen[];
  /** Köpfe im Anmarsch — stehen daneben, nie darin. */
  readonly anmarsch: number;
  /** Übernachtungsbedarf der Einsatzbereiche nach m/w/d (K6) und zusammen. */
  readonly betten: Bettensumme;
  /** S4.2: belegt und frei über die geltenden Unterkünfte — nur, wenn es welche gibt. */
  readonly belegt?: number;
  readonly frei?: number;
  /** S4.2: Bedarf der Einsatzbereiche ohne Unterkunft, Köpfe und Einheiten. */
  readonly ohneZuweisung: number;
  readonly ohneZuweisungEinheiten: number;
}

function bestelltFuer(
  verlauf: readonly Bestellzeile[],
  datum: string,
  mahlzeit: string,
  bedarf: number,
): { bestellt?: number; differenz?: number } {
  const b = geltendeBestellung(verlauf, datum, mahlzeit);
  return b === undefined ? {} : { bestellt: b.portionen, differenz: b.portionen - bedarf };
}

function bettenAus(un: { readonly m: number; readonly w: number; readonly d: number }): Bettensumme {
  return { ...un, gesamt: un.m + un.w + un.d };
}

/** Die kleine Zusammenfassung fürs Lagebild — aus derselben Vorausschau wie das Blatt. */
export function versorgungszahlen(zustand: Zustand, optionen: Versorgungsoptionen): Versorgungszahlen {
  const jetzt = Date.parse(optionen.jetzt);
  const einheiten = Number.isNaN(jetzt) ? [] : versorgungseinheiten(zustand, jetzt);
  const schau = vorausschauAus(einheiten, jetzt, { ...optionen, regel: optionen.regel ?? regelstand(zustand).regel, stunden: 24 });
  const verlauf = bestellverlauf(zustand);
  const anmarsch = einheiten
    .filter((e) => e.klasse !== "BESTAND")
    .reduce((summe, e) => summe + e.kost.portionen, 0);
  const erste = schau.mahlzeiten[0];
  const b = belegung(zustand, einheiten);
  return {
    ...(erste === undefined ? {} : { naechste: { mahlzeit: erste.mahlzeit, zeitpunkt: erste.zeitpunkt, ...erste.bestand } }),
    mahlzeiten: schau.mahlzeiten.map((m) => ({
      mahlzeit: m.mahlzeit,
      zeitpunkt: m.zeitpunkt,
      ...m.vorausschau,
      bestand: m.bestand.portionen,
      zugang: m.zugang.portionen,
      abgang: m.abgang.portionen,
      ...bestelltFuer(verlauf, m.datum, m.mahlzeit, m.vorausschau.portionen),
    })),
    anmarsch,
    betten: bettenAus(logistikblatt(zustand).gesamt.uebernachtung),
    ...(b.unterkuenfte.length === 0 ? {} : { belegt: b.belegt, frei: b.frei }),
    ohneZuweisung: b.ohneZuweisung.koepfe,
    ohneZuweisungEinheiten: b.ohneZuweisung.einheiten,
  };
}

/** Alles, was das Blatt braucht — ein Ruf, eine Rechnung. */
export interface Versorgungsblatt {
  readonly vorausschau: Vorausschau;
  readonly plan: Mahlzeitenplan;
  readonly regeltext: string;
  readonly unterbringung: Unterbringungsbedarf;
  readonly belegung: Belegung;
  readonly sofortbedarf: Sofortbedarfsliste;
  /** S4.3: ob die Regel die Vorbelegung ist, und die Regel selbst zum Bearbeiten. */
  readonly regelVorbelegung: boolean;
  readonly ausgabestellen: readonly Ausgabestellenzeile[];
  /** Alle Bestellungen, jüngste zuerst. */
  readonly bestellungen: readonly Bestellzeile[];
  /** Je Mahlzeit der Vorausschau (gleiche Reihenfolge) die geltende Bestellung und die Differenz. */
  readonly bestellstand: readonly Bestellstand[];
}

export interface Bestellstand {
  readonly zeitpunkt: string;
  readonly datum: string;
  readonly bestellung?: Bestellzeile;
  /** `bestellt − Vorausschau`; negativ heißt: es fehlen Portionen. */
  readonly differenz?: number;
}

export function versorgungsblatt(zustand: Zustand, optionen: Versorgungsoptionen): Versorgungsblatt {
  const stand = regelstand(zustand);
  const regel = optionen.regel ?? stand.regel;
  const jetzt = Date.parse(optionen.jetzt);
  const einheiten = Number.isNaN(jetzt) ? [] : versorgungseinheiten(zustand, jetzt);
  const schau = Number.isNaN(jetzt)
    ? { stunden: optionen.stunden ?? 24, mahlzeiten: [], bewegungen: [] }
    : vorausschauAus(einheiten, jetzt, { ...optionen, regel });
  const verlauf = bestellverlauf(zustand);
  return {
    vorausschau: schau,
    plan: mahlzeitenplan(einheiten, regel, zustand),
    regeltext: regeltext(regel),
    unterbringung: unterbringung(zustand, einheiten),
    belegung: belegung(zustand, einheiten),
    sofortbedarf: sofortbedarfsliste(zustand, einheiten),
    regelVorbelegung: optionen.regel === undefined && stand.vorbelegung,
    ausgabestellen: ausgabestellen(zustand),
    bestellungen: verlauf,
    bestellstand: schau.mahlzeiten.map((m) => {
      const b = geltendeBestellung(verlauf, m.datum, m.mahlzeit);
      return { zeitpunkt: m.zeitpunkt, datum: m.datum, ...(b === undefined ? {} : { bestellung: b, differenz: b.portionen - m.vorausschau.portionen }) };
    }),
  };
}
