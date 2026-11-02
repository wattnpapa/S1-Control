/**
 * Die Vorausschau der Verpflegung (S4.1, KONZEPT-S4.md §5.2).
 *
 * Die Frage des S4 am Nachmittag lautet nicht „wie viele sind heute da",
 * sondern „was brauche ich zu welcher Mahlzeit bis morgen um diese Zeit".
 * Diese Datei beantwortet sie je Mahlzeit der nächsten 24 (oder 48) Stunden:
 *
 *  * **Bestand** sind die Einheiten der Einsatzbereiche — dieselbe Menge wie
 *    im Logistikblatt (`logistik.ts`), nach Mahlzeitenregel und Schicht
 *    gefiltert. Ausgenommen sind nur Einheiten mit Status Anmarsch (oder
 *    Angefordert), deren gemeldete Eintreffzeit noch in der Zukunft liegt:
 *    Sie stehen unter den Zugängen, sonst zählten sie doppelt.
 *  * **Zugänge** sind Einheiten im Bereich „Angefordert / Anmarsch" (oder mit
 *    Status Anmarsch) mit gemeldeter Eintreffzeit; sie zählen ab dieser Zeit.
 *  * **Abgänge** sind Einheiten, deren „verfügbar bis", Einsatzende oder
 *    Rückführung erreicht ist; sie zählen ab dieser Zeit nicht mehr.
 *  * Was **keine Zeit** trägt, steht in der Liste als „nicht eingerechnet"
 *    und nicht in der Zahl (Entscheidung 6).
 *
 * Grenzen sind halboffen, `[ab, ende)`: Wer genau zur Ausgabezeit eintrifft,
 * isst mit; wer genau zur Ausgabezeit geht, nicht mehr.
 *
 * **`jetzt` wird übergeben, nie gelesen** — wie in K18: Dieses Paket kennt
 * keine Uhr. Ebenso der Versatz der Ortszeit gegen UTC, denn die
 * Ausgabezeiten der Mahlzeitenregel sind Ortszeit („Abend 1800"), und welche
 * Zone gilt, weiß nur die Schale. Ein Wechsel Sommer-/Winterzeit innerhalb
 * des Horizonts verschiebt die Zeiten um eine Stunde; das ist hingenommen.
 */

import { ANGEFORDERT, gesamtstaerke, logistik } from "../kennzahlen.js";
import { SCHICHTEN } from "../ereignis.js";
import { MAHLZEITENREGEL_VORBELEGUNG, type Mahlzeit, type Mahlzeitenregel } from "../werte.js";
import type { EinheitZustand, Zustand } from "../zustand.js";

import { abschnittsbaum, baumZeilen } from "./baum.js";

/** Portionen und Kostformen — die drei Zahlen jeder Verpflegungszelle. */
export interface Kost {
  readonly portionen: number;
  readonly vegetarisch: number;
  readonly vegan: number;
}

export const KOST_NULL: Kost = { portionen: 0, vegetarisch: 0, vegan: 0 };

export function kostPlus(a: Kost, b: Kost): Kost {
  return {
    portionen: a.portionen + b.portionen,
    vegetarisch: a.vegetarisch + b.vegetarisch,
    vegan: a.vegan + b.vegan,
  };
}

function kostMinus(a: Kost, b: Kost): Kost {
  return {
    portionen: a.portionen - b.portionen,
    vegetarisch: a.vegetarisch - b.vegetarisch,
    vegan: a.vegan - b.vegan,
  };
}

/** Die Zählregel, wie sie in jeder S4-Ansicht sichtbar steht (§3). */
export const VERSORGUNG_ZAEHLREGEL =
  "Zählung: alle erfassten Einheiten der Einsatzbereiche, auch in Ruhe; Anmarsch getrennt. " +
  "Einheiten ohne Schicht essen wie die Tagschicht.";

/** Die Rechenregel der Vorausschau, für den Fuß von 4g und 4h. */
export const VORAUSSCHAU_REGEL =
  "Bestand = Einheiten der Einsatzbereiche je Mahlzeit nach Mahlzeitenregel und Schicht. " +
  "Zugänge zählen ab der gemeldeten Eintreffzeit, Abgänge ab „verfügbar bis“, Einsatzende oder " +
  "Rückführung. Was keine Zeit trägt, steht in der Liste, aber nicht in der Zahl.";

/** Wohin eine Einheit in der Versorgung gehört. */
export type Versorgungsklasse = "BESTAND" | "ZUGANG" | "OHNE_ZEIT";

/** Eine Einheit, wie die Versorgung sie sieht — einmal klassifiziert, oft gezählt. */
export interface Versorgungseinheit {
  readonly einheit: EinheitZustand;
  readonly abschnittId: string;
  readonly bereich: string;
  readonly klasse: Versorgungsklasse;
  readonly schicht: string;
  readonly kost: Kost;
  /** Ab wann die Einheit mitisst (ms); nur bei `ZUGANG`. */
  readonly ab?: number;
  /** Ab wann sie nicht mehr mitisst (ms), mit dem Grund. */
  readonly ende?: { readonly ms: number; readonly grund: string };
}

const ERWARTETE_STATUS: ReadonlySet<string> = new Set([ANGEFORDERT, "ANMARSCH"]);

function zeitVon(wert: unknown): number | undefined {
  if (typeof wert !== "string") return undefined;
  const ms = Date.parse(wert);
  return Number.isNaN(ms) ? undefined : ms;
}

function endeVon(einheit: EinheitZustand): Versorgungseinheit["ende"] {
  const kandidaten = [
    { ms: zeitVon(einheit.verfuegbarBis?.wert), grund: "verfügbar bis" },
    { ms: zeitVon(einheit.einsatzendeAm?.wert), grund: "Einsatzende" },
    { ms: zeitVon(einheit.rueckfuehrungAm?.wert), grund: "Rückführung" },
  ];
  let frueheste: Versorgungseinheit["ende"];
  for (const k of kandidaten) {
    if (k.ms === undefined) continue;
    if (frueheste === undefined || k.ms < frueheste.ms) frueheste = { ms: k.ms, grund: k.grund };
  }
  return frueheste;
}

/** Ohne oder mit unbekannter Schicht isst eine Einheit wie die Tagschicht. */
export function versorgungsschicht(einheit: EinheitZustand): string {
  const wert = einheit.schicht?.wert;
  return typeof wert === "string" && (SCHICHTEN as readonly string[]).includes(wert) ? wert : "TAG";
}

/** Die Kost einer Einheit: Köpfe (K1) und Kostformen (K4). */
export function kostDer(zustand: Zustand, einheit: EinheitZustand): Kost {
  const zahlen = logistik(zustand, einheit);
  return { portionen: gesamtstaerke(einheit), vegetarisch: zahlen.vegetarisch, vegan: zahlen.vegan };
}

function klassifiziere(
  einheit: EinheitZustand,
  imAnmarschbereich: boolean,
  jetzt: number,
): { klasse: Versorgungsklasse; ab?: number } {
  const eintreffen = zeitVon(einheit.eingetroffenAm?.wert);
  if (imAnmarschbereich) {
    return eintreffen === undefined ? { klasse: "OHNE_ZEIT" } : { klasse: "ZUGANG", ab: eintreffen };
  }
  const status = einheit.status.wert;
  if (typeof status === "string" && ERWARTETE_STATUS.has(status) && eintreffen !== undefined && eintreffen > jetzt) {
    return { klasse: "ZUGANG", ab: eintreffen };
  }
  return { klasse: "BESTAND" };
}

/**
 * Alle Einheiten des Logistikblatts, je einmal klassifiziert.
 *
 * Die Bereiche und ihre Reihenfolge kommen aus dem Abschnittsbaum, genau wie
 * in `logistikblatt`; `ARCHIV` fällt heraus, `ANGEFORDERT` liefert Zugänge.
 */
export function versorgungseinheiten(zustand: Zustand, jetzt: number): readonly Versorgungseinheit[] {
  const liste: Versorgungseinheit[] = [];
  const einheiten = Object.values(zustand.einheiten).filter(
    (e) => e.entfernt?.wert !== true && !e.wirksamAufgegangen,
  );
  for (const knoten of baumZeilen(abschnittsbaum(zustand))) {
    const abschnitt = zustand.abschnitte[knoten.id];
    const typ = typeof abschnitt?.typ.wert === "string" ? abschnitt.typ.wert : "EINSATZORT";
    if (typ === "ARCHIV") continue;
    const bereich = typeof abschnitt?.name.wert === "string" ? abschnitt.name.wert : knoten.id;
    for (const einheit of einheiten) {
      if (einheit.wirksamerAbschnittId !== knoten.id) continue;
      const { klasse, ab } = klassifiziere(einheit, typ === ANGEFORDERT, jetzt);
      const ende = endeVon(einheit);
      liste.push({
        einheit,
        abschnittId: knoten.id,
        bereich,
        klasse,
        schicht: versorgungsschicht(einheit),
        kost: kostDer(zustand, einheit),
        ...(ab === undefined ? {} : { ab }),
        ...(ende === undefined ? {} : { ende }),
      });
    }
  }
  return liste;
}

// ---------------------------------------------------------------------------
// Die Zeitfolge der Mahlzeiten
// ---------------------------------------------------------------------------

const TAG_MS = 24 * 60 * 60 * 1000;

/** Eine Mahlzeit als Zeitpunkt im Horizont. */
export interface Ausgabetermin {
  readonly mahlzeit: Mahlzeit;
  readonly uhrzeit: string;
  readonly ms: number;
  readonly zeitpunkt: string;
  /** 0 heute, 1 morgen, 2 übermorgen — in Ortszeit. */
  readonly tag: number;
  readonly schichten: readonly string[];
}

function uhrzeitMs(uhrzeit: string): number | undefined {
  const treffer = /^(\d{2})(\d{2})$/.exec(uhrzeit);
  if (treffer === null) return undefined;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return undefined;
  return (stunden * 60 + minuten) * 60 * 1000;
}

/**
 * Die Mahlzeiten im Horizont `[jetzt, jetzt + stunden)`, in Zeitfolge.
 *
 * Eine Mahlzeit genau „jetzt" gehört dazu: Sie wird gerade ausgegeben.
 */
export function ausgabetermine(
  regel: Mahlzeitenregel,
  jetzt: number,
  versatzMinuten: number,
  stunden: number,
): readonly Ausgabetermin[] {
  if (!Number.isFinite(jetzt) || !Number.isFinite(versatzMinuten)) return [];
  const versatz = versatzMinuten * 60 * 1000;
  const heute = Math.floor((jetzt + versatz) / TAG_MS) * TAG_MS;
  const bis = jetzt + stunden * 60 * 60 * 1000;
  const termine: Ausgabetermin[] = [];
  for (let tag = 0; tag * 24 <= stunden + 24; tag += 1) {
    for (const zeile of regel) {
      const uhr = uhrzeitMs(zeile.uhrzeit);
      if (uhr === undefined) continue;
      const ms = heute + tag * TAG_MS + uhr - versatz;
      if (ms < jetzt || ms >= bis) continue;
      termine.push({
        mahlzeit: zeile.mahlzeit,
        uhrzeit: zeile.uhrzeit,
        ms,
        zeitpunkt: new Date(ms).toISOString(),
        tag,
        schichten: zeile.schichten,
      });
    }
  }
  return termine.sort((a, b) => a.ms - b.ms);
}

// ---------------------------------------------------------------------------
// Die Vorausschau
// ---------------------------------------------------------------------------

/** Eine Mahlzeit der Vorausschau mit der Rechnung dahinter. */
export interface Mahlzeitvorausschau extends Omit<Ausgabetermin, "schichten" | "ms"> {
  readonly bestand: Kost;
  readonly zugang: Kost;
  readonly abgang: Kost;
  /** `bestand + zugang − abgang`. */
  readonly vorausschau: Kost;
  /** Der Bestand je Bereich, in der Ordnung des Logistikblatts. */
  readonly jeBereich: readonly { readonly abschnittId: string; readonly bereich: string; readonly bestand: Kost }[];
}

/** Ein Eintrag der Liste „Zu- und Abgänge". */
export interface Versorgungsbewegung {
  readonly art: "ZUGANG" | "ABGANG" | "OHNE_ZEIT";
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly schicht: string;
  readonly koepfe: number;
  /** Fehlt bei `OHNE_ZEIT`. */
  readonly zeitpunkt?: string;
  readonly grund: string;
}

export interface Vorausschau {
  readonly stunden: number;
  readonly mahlzeiten: readonly Mahlzeitvorausschau[];
  readonly bewegungen: readonly Versorgungsbewegung[];
}

export interface Versorgungsoptionen {
  /** Der Zeitpunkt, ab dem vorausgeschaut wird — übergeben, nie gelesen. */
  readonly jetzt: string;
  /** Ortszeit minus UTC in Minuten (MEZ: 60). */
  readonly versatzMinuten?: number;
  /** Der Horizont, 24 oder 48 Stunden. */
  readonly stunden?: number;
  readonly regel?: Mahlzeitenregel;
}

function isstZu(eintrag: Versorgungseinheit, termin: Ausgabetermin): boolean {
  if (!termin.schichten.includes(eintrag.schicht)) return false;
  if (eintrag.klasse === "OHNE_ZEIT") return false;
  return eintrag.klasse === "BESTAND" || (eintrag.ab ?? Infinity) <= termin.ms;
}

function rechneMahlzeit(
  einheiten: readonly Versorgungseinheit[],
  termin: Ausgabetermin,
): Mahlzeitvorausschau {
  let bestand = KOST_NULL;
  let zugang = KOST_NULL;
  let abgang = KOST_NULL;
  const jeBereich = new Map<string, { abschnittId: string; bereich: string; bestand: Kost }>();
  for (const eintrag of einheiten) {
    if (eintrag.klasse === "BESTAND") {
      const zeile = jeBereich.get(eintrag.abschnittId) ?? { abschnittId: eintrag.abschnittId, bereich: eintrag.bereich, bestand: KOST_NULL };
      jeBereich.set(eintrag.abschnittId, zeile);
    }
    if (!isstZu(eintrag, termin)) continue;
    if (eintrag.klasse === "BESTAND") {
      bestand = kostPlus(bestand, eintrag.kost);
      const zeile = jeBereich.get(eintrag.abschnittId);
      if (zeile !== undefined) zeile.bestand = kostPlus(zeile.bestand, eintrag.kost);
    } else {
      zugang = kostPlus(zugang, eintrag.kost);
    }
    if (eintrag.ende !== undefined && eintrag.ende.ms <= termin.ms) abgang = kostPlus(abgang, eintrag.kost);
  }
  return {
    mahlzeit: termin.mahlzeit,
    uhrzeit: termin.uhrzeit,
    zeitpunkt: termin.zeitpunkt,
    tag: termin.tag,
    bestand,
    zugang,
    abgang,
    vorausschau: kostMinus(kostPlus(bestand, zugang), abgang),
    jeBereich: [...jeBereich.values()],
  };
}

function bewegungDer(eintrag: Versorgungseinheit, art: Versorgungsbewegung["art"], ms?: number): Versorgungsbewegung {
  const grund =
    art === "ZUGANG"
      ? "Anmarsch, Eintreffen gemeldet"
      : art === "ABGANG"
        ? (eintrag.ende?.grund ?? "")
        : "Anmarsch ohne Eintreffzeit";
  return {
    art,
    einheitId: eintrag.einheit.id,
    einheit: typeof eintrag.einheit.bezeichnung.wert === "string" ? eintrag.einheit.bezeichnung.wert : eintrag.einheit.id,
    bereich: eintrag.bereich,
    schicht: eintrag.schicht,
    koepfe: eintrag.kost.portionen,
    ...(ms === undefined ? {} : { zeitpunkt: new Date(ms).toISOString() }),
    grund,
  };
}

/** Die Zu- und Abgänge bis zum Ende des Horizonts, dann was keine Zeit trägt. */
export function versorgungsbewegungen(
  einheiten: readonly Versorgungseinheit[],
  bis: number,
): readonly Versorgungsbewegung[] {
  const mitZeit: { ms: number; bewegung: Versorgungsbewegung }[] = [];
  const ohneZeit: Versorgungsbewegung[] = [];
  for (const eintrag of einheiten) {
    if (eintrag.klasse === "OHNE_ZEIT") ohneZeit.push(bewegungDer(eintrag, "OHNE_ZEIT"));
    if (eintrag.klasse === "ZUGANG" && eintrag.ab !== undefined && eintrag.ab < bis) {
      mitZeit.push({ ms: eintrag.ab, bewegung: bewegungDer(eintrag, "ZUGANG", eintrag.ab) });
    }
    if (eintrag.klasse !== "OHNE_ZEIT" && eintrag.ende !== undefined && eintrag.ende.ms < bis) {
      mitZeit.push({ ms: eintrag.ende.ms, bewegung: bewegungDer(eintrag, "ABGANG", eintrag.ende.ms) });
    }
  }
  mitZeit.sort((a, b) => a.ms - b.ms);
  return [...mitZeit.map((m) => m.bewegung), ...ohneZeit];
}

/** Die Vorausschau aus bereits klassifizierten Einheiten — für Aufrufer, die sie mehrfach brauchen. */
export function vorausschauAus(
  einheiten: readonly Versorgungseinheit[],
  jetzt: number,
  optionen: Omit<Versorgungsoptionen, "jetzt">,
): Vorausschau {
  const stunden = optionen.stunden ?? 24;
  const termine = ausgabetermine(optionen.regel ?? MAHLZEITENREGEL_VORBELEGUNG, jetzt, optionen.versatzMinuten ?? 0, stunden);
  return {
    stunden,
    mahlzeiten: termine.map((termin) => rechneMahlzeit(einheiten, termin)),
    bewegungen: versorgungsbewegungen(einheiten, jetzt + stunden * 60 * 60 * 1000),
  };
}

/** Die Vorausschau je Mahlzeit über den Horizont (Standard 24 h). */
export function vorausschau(zustand: Zustand, optionen: Versorgungsoptionen): Vorausschau {
  const jetzt = Date.parse(optionen.jetzt);
  if (Number.isNaN(jetzt)) return { stunden: optionen.stunden ?? 24, mahlzeiten: [], bewegungen: [] };
  return vorausschauAus(versorgungseinheiten(zustand, jetzt), jetzt, optionen);
}
