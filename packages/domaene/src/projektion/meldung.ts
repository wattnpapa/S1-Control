/**
 * Der Eingangskorb des Meldekopfs und die Revisionen einer Reihe (M6.1, M6.2).
 *
 * Die Excel kennt diesen Weg bereits, nur von Hand: Der Meldekopf trägt die
 * Bögen zeilenweise in eine Google-Tabelle ein und markiert sie **gelb**; die
 * Führungsstelle kopiert die Zeile in ihre Mappe und markiert **grün**;
 * ändert sich etwas, setzt der Meldekopf wieder gelb
 * (`excel-handbuch-anforderungen.md`, Hinweise C159–C172, EXH F-E1).
 *
 * Diese Ampel ist hier kein Anstrich, sondern der abgeleitete
 * `uebernahmeZustand` aus §5.8.1:
 *
 * ```
 * NEU          gelb    eingetroffen, noch nicht übernommen
 * GEAENDERT    gelb    übernommen, aber es liegt eine jüngere Fassung vor
 * UEBERNOMMEN  grün    übernommen, und es ist die jüngste Fassung
 * ABGELEHNT    grau    bewusst nicht übernommen — bleibt sichtbar
 * ```
 *
 * **Nichts verschwindet.** §5.8.1: Der Empfang ist eine Tatsache, die Meldung
 * ist unveränderlich, Löschen ist verboten. Wer eine Meldung nicht will, lehnt
 * sie ab — und sie bleibt im Korb. Dieselbe Regel führt die Excel als
 * „Google-Zeilen werden bis Einsatzende nicht gelöscht (Nachvollziehbarkeit,
 * Schutz vor Datenverlust)".
 */

import { bogenDiff, type BogenDiff } from "@bos/meldekopf";
import type { Erfassungsbogen } from "@bos/eeb-format";

import * as kennzahlen from "../kennzahlen.js";
import type { Id } from "../werte.js";
import type { MeldungZustand, Zustand } from "../zustand.js";

/** Die vier Zustände in der Ordnung, in der der Korb sie zeigt. */
export const MELDE_ZUSTAENDE = ["NEU", "GEAENDERT", "UEBERNOMMEN", "ABGELEHNT"] as const;
export type Meldezustand = (typeof MELDE_ZUSTAENDE)[number];

const RANG: Readonly<Record<string, number>> = Object.fromEntries(
  MELDE_ZUSTAENDE.map((wert, stelle) => [wert, stelle]),
);

/** Eine Zeile des Eingangskorbs. */
export interface Meldungszeile {
  readonly id: Id;
  readonly zustand: Meldezustand;
  /** Die Revisionsreihe — der Fingerabdruck der Einheit (§5.8.1). */
  readonly einheitSchluessel: string;
  /** Der Stand, den der Absender gemeldet hat. Ordnet die Reihe (§2.6). */
  readonly stand: string;
  /** Wann sie hier eingetroffen ist. Ordnet den Korb. */
  readonly empfangenAm: string;
  readonly quelle: string;
  /** `GUELTIG`, `UNGUELTIG` oder leer für unsigniert (§5.8.1). */
  readonly signatur: string;
  /** Die Bezeichnung aus dem Bogen — ohne sie ist eine Zeile nicht lesbar. */
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly staerke: string;
  /** Die Einheit, auf die übernommen wurde; fehlt, solange nichts übernommen ist. */
  readonly einheitId?: Id;
  readonly uebernommeneFelder: readonly string[];
  /** Wievielte Fassung dieser Reihe, nach `stand` gezählt — 1 ist die älteste. */
  readonly fassung: number;
  /** Wie viele Fassungen die Reihe insgesamt hat. */
  readonly fassungen: number;
  /** Ist dies der Revisionskopf der Reihe (K26)? */
  readonly kopf: boolean;
}

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert.length > 0 ? wert : ersatz;
}

/**
 * Liest Bezeichnung, Organisation und Stärke aus dem mitgeführten Bogen.
 *
 * **Aus dem Bogen und nicht aus der übernommenen Einheit.** Der Korb zeigt,
 * was gemeldet wurde; was daraus geworden ist, steht im Lagebild. Bei einer
 * abgelehnten Meldung gibt es die Einheit gar nicht, und eine Zeile ohne
 * Bezeichnung ließe sich nicht beurteilen.
 */
function ausBogen(meldung: MeldungZustand): {
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly staerke: string;
} {
  const bogen = meldung.bogen?.wert as
    | {
        einheit?: { organisation?: unknown; hierarchie?: { name?: unknown }[] };
        staerkeManuell?: { fuehrer?: unknown; unterfuehrer?: unknown; mannschaft?: unknown };
        personal?: unknown[];
      }
    | undefined;
  const herkunft = text(bogen?.einheit?.hierarchie?.[0]?.name);
  const s = bogen?.staerkeManuell;
  const zahl = (wert: unknown): number => (typeof wert === "number" ? wert : 0);
  const staerke =
    s === undefined
      ? String(bogen?.personal?.length ?? 0)
      : `${String(zahl(s.fuehrer))}/${String(zahl(s.unterfuehrer))}/${String(zahl(s.mannschaft))}`;
  return {
    bezeichnung: herkunft === "" ? text(meldung.einheitSchluessel?.wert, meldung.id) : herkunft,
    organisation: String(bogen?.einheit?.organisation ?? ""),
    staerke,
  };
}

/**
 * Baut die Zeile einer Meldung.
 *
 * `fassung` und `fassungen` brauchen die ganze Reihe und werden deshalb außen
 * gesetzt; hier steht, was aus der einen Meldung folgt.
 */
export function meldungszeile(
  meldung: MeldungZustand,
  reihe: readonly MeldungZustand[],
  kopfId: string | undefined,
): Meldungszeile {
  const uebernahme = meldung.uebernahme?.wert as
    | { einheitId?: Id; uebernommeneFelder?: readonly string[] }
    | null
    | undefined;
  const geordnet = [...reihe].sort((a, b) =>
    String(a.stand.wert ?? "").localeCompare(String(b.stand.wert ?? "")),
  );
  const inhalt = ausBogen(meldung);

  return {
    id: meldung.id,
    zustand: meldung.uebernahmeZustand,
    einheitSchluessel: text(meldung.einheitSchluessel?.wert),
    stand: text(meldung.stand.wert),
    empfangenAm: text(meldung.empfangenAm.wert),
    quelle: text(meldung.quelle?.wert),
    // §5.8: Der Zustand ist zweiwertig; unsigniert bleibt leer und ist kein
    // Fehler — der Empfang ist eine Tatsache, die Signatur entscheidet nichts.
    signatur: text((meldung.signatur?.wert as { zustand?: unknown } | undefined)?.zustand),
    ...inhalt,
    ...(uebernahme === null || uebernahme === undefined
      ? { uebernommeneFelder: [] }
      : {
          ...(uebernahme.einheitId === undefined ? {} : { einheitId: uebernahme.einheitId }),
          uebernommeneFelder: uebernahme.uebernommeneFelder ?? [],
        }),
    fassung: geordnet.findIndex((m) => m.id === meldung.id) + 1,
    fassungen: geordnet.length,
    kopf: meldung.id === kopfId,
  };
}

export interface Meldungsoptionen {
  /** Nur diese Zustände; ohne Angabe alle. */
  readonly zustaende?: readonly Meldezustand[];
  /** Nur diese Revisionsreihe — für die Revisionsansicht (M6.2). */
  readonly einheitSchluessel?: string;
  /** Volltext über Bezeichnung, Organisation und Reihe. */
  readonly suche?: string;
  /**
   * Nur den Revisionskopf je Reihe zeigen (K26).
   *
   * Der Korb einer Mehrtageslage trägt sonst je Einheit so viele Zeilen, wie
   * es Meldetage gab; gebraucht wird die jüngste.
   */
  readonly nurKoepfe?: boolean;
  readonly von?: number;
  readonly anzahl?: number;
}

export interface Meldungsausschnitt {
  readonly zeilen: readonly Meldungszeile[];
  readonly von: number;
  readonly gesamtzahl: number;
  readonly jeZustand: { readonly [zustand: string]: number };
  /** Wie viele Meldungen auf eine Entscheidung warten — `NEU` plus `GEAENDERT` (K27). */
  readonly offen: number;
}

/**
 * Ordnet zwei Zeilen: Zustand, dann Empfangszeit, dann Id.
 *
 * Offenes zuerst: Der Korb ist eine Arbeitsliste. Innerhalb eines Zustands
 * nach **`empfangenAm`** und nicht nach `stand` — der Korb ordnet nach dem,
 * was zuerst hereinkam, die Revisionsreihe nach dem, was zuletzt gemeldet
 * wurde (§2.6, zwei Ordnungen, die nie vermischt werden).
 */
export function vergleicheMeldungen(links: Meldungszeile, rechts: Meldungszeile): number {
  const nachZustand = (RANG[links.zustand] ?? 0) - (RANG[rechts.zustand] ?? 0);
  if (nachZustand !== 0) return nachZustand;
  const nachZeit = links.empfangenAm.localeCompare(rechts.empfangenAm);
  if (nachZeit !== 0) return nachZeit;
  return links.id < rechts.id ? -1 : links.id > rechts.id ? 1 : 0;
}

/** Die Meldungen je Revisionsreihe — der Schlüssel ist der Fingerabdruck. */
function nachReihe(zustand: Zustand): Map<string, MeldungZustand[]> {
  const reihen = new Map<string, MeldungZustand[]>();
  for (const id of Object.keys(zustand.meldungen).sort()) {
    const meldung = zustand.meldungen[id];
    if (meldung === undefined) continue;
    const schluessel = text(meldung.einheitSchluessel?.wert, meldung.id);
    reihen.set(schluessel, [...(reihen.get(schluessel) ?? []), meldung]);
  }
  return reihen;
}

export function eingangskorb(zustand: Zustand, optionen: Meldungsoptionen = {}): Meldungsausschnitt {
  const reihen = nachReihe(zustand);
  const koepfe = new Set(kennzahlen.revisionskoepfe(zustand).map((m) => m.id));
  const suche = optionen.suche?.trim().toLocaleLowerCase("de-DE") ?? "";
  const erlaubt = optionen.zustaende === undefined ? undefined : new Set(optionen.zustaende);

  const alle: Meldungszeile[] = [];
  for (const [schluessel, reihe] of reihen) {
    const kopfId = reihe.find((m) => koepfe.has(m.id))?.id;
    for (const meldung of reihe) {
      if (optionen.einheitSchluessel !== undefined && schluessel !== optionen.einheitSchluessel) {
        continue;
      }
      alle.push(meldungszeile(meldung, reihe, kopfId));
    }
  }

  const jeZustand: Record<string, number> = Object.fromEntries(
    MELDE_ZUSTAENDE.map((wert) => [wert, 0]),
  );
  for (const zeile of alle) jeZustand[zeile.zustand] = (jeZustand[zeile.zustand] ?? 0) + 1;

  const gefiltert = alle
    .filter((zeile) => {
      if (optionen.nurKoepfe === true && !zeile.kopf) return false;
      if (erlaubt !== undefined && !erlaubt.has(zeile.zustand)) return false;
      if (suche === "") return true;
      return [zeile.bezeichnung, zeile.organisation, zeile.einheitSchluessel]
        .join(" ")
        .toLocaleLowerCase("de-DE")
        .includes(suche);
    })
    .sort(vergleicheMeldungen);

  const von = Math.max(0, optionen.von ?? 0);
  const anzahl = optionen.anzahl ?? gefiltert.length;
  return {
    zeilen: gefiltert.slice(von, von + anzahl),
    von,
    gesamtzahl: gefiltert.length,
    jeZustand,
    offen: (jeZustand["NEU"] ?? 0) + (jeZustand["GEAENDERT"] ?? 0),
  };
}

/**
 * Die Revisionen einer Reihe, älteste zuerst (M6.2).
 *
 * **Nach `stand` und nicht nach HLC** (§2.6): Ein nachgescannter Papierbogen
 * von gestern hat die höhere HLC und den älteren `stand`. Nach HLC geordnet
 * stünde er als jüngste Fassung da, und die Lage zeigte den Stand von
 * gestern.
 */
export function revisionen(zustand: Zustand, einheitSchluessel: string): readonly Meldungszeile[] {
  const ausschnitt = eingangskorb(zustand, { einheitSchluessel });
  return [...ausschnitt.zeilen].sort((links, rechts) => {
    const nachStand = links.stand.localeCompare(rechts.stand);
    if (nachStand !== 0) return nachStand;
    return links.empfangenAm.localeCompare(rechts.empfangenAm);
  });
}

// ---------------------------------------------------------------------------
// Der Diff zweier Fassungen (M6.2)
// ---------------------------------------------------------------------------

/**
 * Was sich von einer Fassung zur nächsten geändert hat.
 *
 * **Die Rechnung kommt aus dem geteilten Kern** (`@bos/meldekopf`,
 * `meldung-diff.ts`) und wird hier nicht nachgebaut. Sein Modulkopf sagt,
 * warum es diesen Vergleich überhaupt gibt: „die Historie zeigt Stände, der
 * Diff zeigt Bewegung (Stärke 12 → 9, Fahrzeug abgemeldet, Ruhezeit jetzt
 * erforderlich)". Für eine Schichtübergabe ist die Bewegung die Auskunft, und
 * für eine Führungsstelle, die eine Tagesmeldung übernehmen soll, ebenso.
 *
 * Er liefert **fertige Anzeigetexte**, keine Rohwerte — mit Absicht: So zeigen
 * die Ansicht im Erfassungsbogen und die hier denselben Wortlaut, und die
 * Zahlen sind so formatiert, wie sie im Bogen stehen.
 *
 * **Die Zuordnung ist eine Heuristik**, und der Kern sagt das auch: Personen
 * über „Nachname, Vorname", Fahrzeuge über das Kennzeichen. Ein nachgetragenes
 * Kennzeichen erscheint deshalb als Abgang plus Zugang statt als Änderung —
 * bewusst, weil nicht entscheidbar.
 */
export interface Fassungsvergleich {
  readonly vonId: Id;
  readonly nachId: Id;
  readonly vonStand: string;
  readonly nachStand: string;
  readonly diff: BogenDiff;
}

/** Der Bogen einer Meldung, sofern er lesbar mitgeführt wurde (§5.8.1). */
function bogenVon(meldung: MeldungZustand | undefined): Erfassungsbogen | undefined {
  const wert = meldung?.bogen?.wert;
  return wert === undefined || wert === null ? undefined : (wert as unknown as Erfassungsbogen);
}

/**
 * Vergleicht zwei Fassungen einer Reihe.
 *
 * `undefined`, wenn eine der beiden Meldungen fehlt oder ihren Bogen nicht
 * mitführt. Letzteres ist kein Fehler: `bogen` ist im Katalog optional, und
 * eine Meldung, die aus einer fremden Fassung stammt, kann ihn auslassen. Ein
 * Vergleich, der dann etwas erfände, wäre schlimmer als keiner.
 */
export function fassungsvergleich(
  zustand: Zustand,
  vonId: Id,
  nachId: Id,
): Fassungsvergleich | undefined {
  const von = zustand.meldungen[vonId];
  const nach = zustand.meldungen[nachId];
  const bogenVor = bogenVon(von);
  const bogenNach = bogenVon(nach);
  if (von === undefined || nach === undefined || bogenVor === undefined || bogenNach === undefined) {
    return undefined;
  }
  return {
    vonId,
    nachId,
    vonStand: text(von.stand.wert),
    nachStand: text(nach.stand.wert),
    diff: bogenDiff(bogenVor, bogenNach),
  };
}

/**
 * Der Vergleich der beiden jüngsten Fassungen einer Reihe — was die
 * Führungsstelle sehen will, bevor sie eine Tagesmeldung übernimmt.
 *
 * `undefined` bei einer Reihe mit nur einer Fassung: Dort gibt es keine
 * Bewegung, nur einen Stand.
 */
export function letzteAenderung(
  zustand: Zustand,
  einheitSchluessel: string,
): Fassungsvergleich | undefined {
  const reihe = revisionen(zustand, einheitSchluessel);
  if (reihe.length < 2) return undefined;
  const vorletzte = reihe[reihe.length - 2];
  const letzte = reihe[reihe.length - 1];
  if (vorletzte === undefined || letzte === undefined) return undefined;
  return fassungsvergleich(zustand, vorletzte.id, letzte.id);
}
