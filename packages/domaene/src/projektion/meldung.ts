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
