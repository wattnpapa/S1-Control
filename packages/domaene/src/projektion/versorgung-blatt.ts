/**
 * Das Blatt „Versorgung" und die Zahlen des Monitors (S4.1, KONZEPT-S4.md §5, §6).
 *
 * Neben der Vorausschau (`versorgung.ts`) braucht der S4 drei Tabellen und
 * eine Handvoll Zahlen. Alle stehen hier, in Ring 2, damit weder Renderer
 * noch Ausgabe eine zweite Summe bilden (§3): Der Mahlzeitenplan, die Liste
 * der Einheiten mit Übernachtungsbedarf, die Abarbeitungsliste des
 * Sofortbedarfs und die kleine Zusammenfassung für das Lagebild.
 */

import { uebernachtung } from "../kennzahlen.js";
import { MAHLZEITEN, MAHLZEITENREGEL_VORBELEGUNG, type Mahlzeit, type Mahlzeitenregel } from "../werte.js";
import type { Zustand } from "../zustand.js";

import { logistikblatt } from "./logistik.js";
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
  const liste = [...zeilen.values()].filter((z) => z.koepfe > 0);
  return {
    regel: regel.map((r) => ({ mahlzeit: r.mahlzeit, uhrzeit: r.uhrzeit, schichten: r.schichten })),
    zeilen: liste,
    summe: liste.reduce(zeilenSumme, leerePlanzeile("GESAMT", "Gesamt")),
    anmarsch,
  };
}

// ---------------------------------------------------------------------------
// Unterbringung (4e) und Sofortbedarf (4f)
// ---------------------------------------------------------------------------

export interface Bedarfszeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly schicht: string;
  readonly m: number;
  readonly w: number;
  readonly d: number;
  readonly ruhezeit: boolean;
  /** Noch im Anmarsch — der Bedarf kommt, ist aber nicht da. */
  readonly anmarsch: boolean;
}

interface Bogenbedarf {
  readonly verpflegungPersonen?: number;
  readonly dieselLiter?: number;
  readonly benzinLiter?: number;
  readonly gemischLiter?: number;
  readonly unterbringung?: boolean;
  readonly ruhezeitErforderlich?: boolean;
}

function bogenbedarf(eintrag: Versorgungseinheit): Bogenbedarf | undefined {
  const wert: unknown = eintrag.einheit.sofortbedarf?.wert;
  return typeof wert === "object" && wert !== null ? (wert as Bogenbedarf) : undefined;
}

function zahl(wert: unknown): number {
  return typeof wert === "number" && Number.isFinite(wert) ? wert : 0;
}

function bezeichnung(eintrag: Versorgungseinheit): string {
  const wert = eintrag.einheit.bezeichnung.wert;
  return typeof wert === "string" ? wert : eintrag.einheit.id;
}

/** Die Einheiten mit Übernachtungsbedarf (K6), Anmarsch zuletzt. */
export function unterbringungsbedarf(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): readonly Bedarfszeile[] {
  const zeilen: Bedarfszeile[] = [];
  for (const eintrag of einheiten) {
    const bedarf = uebernachtung(zustand, eintrag.einheit);
    if (bedarf.m + bedarf.w + bedarf.d === 0) continue;
    zeilen.push({
      einheitId: eintrag.einheit.id,
      einheit: bezeichnung(eintrag),
      bereich: eintrag.bereich,
      schicht: eintrag.schicht,
      ...bedarf,
      ruhezeit: bogenbedarf(eintrag)?.ruhezeitErforderlich === true,
      anmarsch: eintrag.klasse !== "BESTAND",
    });
  }
  return zeilen.sort((a, b) => Number(a.anmarsch) - Number(b.anmarsch));
}

export interface Sofortbedarfszeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly eingetroffenAm?: string;
  readonly verpflegungPersonen: number;
  readonly dieselLiter: number;
  readonly benzinLiter: number;
  readonly gemischLiter: number;
  readonly unterbringung: boolean;
  readonly ruhezeit: boolean;
  /** Der Stand des Bogens, aus dem der Bedarf stammt. */
  readonly stand?: string;
}

export interface Sofortbedarfsliste {
  readonly zeilen: readonly Sofortbedarfszeile[];
  readonly summe: { readonly verpflegungPersonen: number; readonly dieselLiter: number; readonly benzinLiter: number; readonly gemischLiter: number; readonly unterbringung: number; readonly ruhezeit: number };
}

/** Die Abarbeitungsliste der Erstmeldungen aus dem Bogen (4f). */
export function sofortbedarfsliste(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): Sofortbedarfsliste {
  const zeilen: Sofortbedarfszeile[] = [];
  for (const eintrag of einheiten) {
    const bedarf = bogenbedarf(eintrag);
    if (bedarf === undefined) continue;
    const eingetroffen = eintrag.einheit.eingetroffenAm?.wert;
    const meldungId = eintrag.einheit.meldungId?.wert;
    const stand = typeof meldungId === "string" ? zustand.meldungen[meldungId]?.stand.wert : undefined;
    zeilen.push({
      einheitId: eintrag.einheit.id,
      einheit: bezeichnung(eintrag),
      bereich: eintrag.bereich,
      ...(typeof eingetroffen === "string" ? { eingetroffenAm: eingetroffen } : {}),
      verpflegungPersonen: zahl(bedarf.verpflegungPersonen),
      dieselLiter: zahl(bedarf.dieselLiter),
      benzinLiter: zahl(bedarf.benzinLiter),
      gemischLiter: zahl(bedarf.gemischLiter),
      unterbringung: bedarf.unterbringung === true,
      ruhezeit: bedarf.ruhezeitErforderlich === true,
      ...(typeof stand === "string" ? { stand } : {}),
    });
  }
  const summe = zeilen.reduce(
    (s, z) => ({
      verpflegungPersonen: s.verpflegungPersonen + z.verpflegungPersonen,
      dieselLiter: s.dieselLiter + z.dieselLiter,
      benzinLiter: s.benzinLiter + z.benzinLiter,
      gemischLiter: s.gemischLiter + z.gemischLiter,
      unterbringung: s.unterbringung + (z.unterbringung ? 1 : 0),
      ruhezeit: s.ruhezeit + (z.ruhezeit ? 1 : 0),
    }),
    { verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: 0, ruhezeit: 0 },
  );
  return { zeilen, summe };
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
}

export interface Versorgungszahlen {
  /** Die nächste Mahlzeit, Bestand nach Mahlzeitenregel — ohne Anmarsch (4a). */
  readonly naechste?: Kost & { readonly mahlzeit: Mahlzeit; readonly zeitpunkt: string };
  /** Die Mahlzeiten der nächsten 24 Stunden mit Vorausschau (4h). */
  readonly mahlzeiten: readonly Mahlzeitzahlen[];
  /** Köpfe im Anmarsch — stehen daneben, nie darin. */
  readonly anmarsch: number;
  /** Übernachtungsbedarf der Einsatzbereiche nach m/w/d (K6). */
  readonly betten: { readonly m: number; readonly w: number; readonly d: number };
}

/** Die kleine Zusammenfassung fürs Lagebild — aus derselben Vorausschau wie das Blatt. */
export function versorgungszahlen(zustand: Zustand, optionen: Versorgungsoptionen): Versorgungszahlen {
  const jetzt = Date.parse(optionen.jetzt);
  const einheiten = Number.isNaN(jetzt) ? [] : versorgungseinheiten(zustand, jetzt);
  const schau = vorausschauAus(einheiten, jetzt, { ...optionen, stunden: 24 });
  const anmarsch = einheiten
    .filter((e) => e.klasse !== "BESTAND")
    .reduce((summe, e) => summe + e.kost.portionen, 0);
  const erste = schau.mahlzeiten[0];
  return {
    ...(erste === undefined ? {} : { naechste: { mahlzeit: erste.mahlzeit, zeitpunkt: erste.zeitpunkt, ...erste.bestand } }),
    mahlzeiten: schau.mahlzeiten.map((m) => ({
      mahlzeit: m.mahlzeit,
      zeitpunkt: m.zeitpunkt,
      ...m.vorausschau,
      bestand: m.bestand.portionen,
      zugang: m.zugang.portionen,
      abgang: m.abgang.portionen,
    })),
    anmarsch,
    betten: logistikblatt(zustand).gesamt.uebernachtung,
  };
}

/** Alles, was das Blatt braucht — ein Ruf, eine Rechnung. */
export interface Versorgungsblatt {
  readonly vorausschau: Vorausschau;
  readonly plan: Mahlzeitenplan;
  readonly regeltext: string;
  readonly unterbringung: readonly Bedarfszeile[];
  readonly sofortbedarf: Sofortbedarfsliste;
}

export function versorgungsblatt(zustand: Zustand, optionen: Versorgungsoptionen): Versorgungsblatt {
  const regel = optionen.regel ?? MAHLZEITENREGEL_VORBELEGUNG;
  const jetzt = Date.parse(optionen.jetzt);
  const einheiten = Number.isNaN(jetzt) ? [] : versorgungseinheiten(zustand, jetzt);
  return {
    vorausschau: Number.isNaN(jetzt)
      ? { stunden: optionen.stunden ?? 24, mahlzeiten: [], bewegungen: [] }
      : vorausschauAus(einheiten, jetzt, { ...optionen, regel }),
    plan: mahlzeitenplan(einheiten, regel),
    regeltext: regeltext(regel),
    unterbringung: unterbringungsbedarf(zustand, einheiten),
    sofortbedarf: sofortbedarfsliste(zustand, einheiten),
  };
}
