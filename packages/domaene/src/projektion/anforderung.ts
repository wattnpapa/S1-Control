/**
 * Die Anforderungsliste (M5.3).
 *
 * Die Excel führt die Anforderung als sechs Spalten einer Einheitenzeile — N
 * bis S: Ablösung angefordert, Anforderungs-ID, Zugesagt für, Zugesagt von,
 * Vorgesehene Einheit, Vorgesehener Auftrag (`excel-domaenenmodell.md` §2).
 * Im Zielmodell ist sie eine **eigene Entität** mit einer Zustandsmaschine
 * (KONZEPT-EREIGNISSE.md §5.6). Der Unterschied ist nicht kosmetisch: Eine
 * Anforderung, die noch keine Einheit hat, hätte in der Vorlage keine Zeile,
 * und genau das ist der Normalfall zwischen Anforderung und Zusage.
 *
 * **Der Zustand wird hier nicht gerechnet.** `zustand` ist nach §5.6.2 aus
 * drei gewöhnlichen Feldern abgeleitet, und der Fold leitet ihn ab. Diese
 * Projektion liest ihn und stellt ihn dar. Ein zweiter Ableitungspfad wäre
 * die zweite Wahrheit, die P6 gerade ausschließt.
 */

import type { Id } from "../werte.js";
import type { AnforderungZustand, Konflikthinweis, Zustand } from "../zustand.js";

/**
 * Die vier Zustände in der Ordnung, in der die Liste sie zeigt.
 *
 * Offen zuerst: Das ist die Arbeitsliste der Führungsstelle. Storniert
 * zuletzt, weil eine stornierte Anforderung nur noch als Nachweis dasteht.
 */
export const ANFORDERUNG_ZUSTAENDE = ["OFFEN", "ZUGESAGT", "EINGETROFFEN", "STORNIERT"] as const;
export type Anforderungszustand = (typeof ANFORDERUNG_ZUSTAENDE)[number];

const RANG: Readonly<Record<string, number>> = Object.fromEntries(
  ANFORDERUNG_ZUSTAENDE.map((wert, stelle) => [wert, stelle]),
);

/** Eine Zeile der Liste. */
export interface Anforderungszeile {
  readonly id: Id;
  readonly kennung: string;
  readonly zustand: Anforderungszustand;
  readonly angefordertAm: string;
  /** Die Einheit, die abgelöst werden soll — Id und, wenn vorhanden, ihr Name. */
  readonly abzuloesendeEinheitId?: Id;
  readonly abzuloesendeEinheit?: string;
  readonly vorgeseheneEinheitText: string;
  readonly vorgesehenerAuftrag: string;
  readonly bemerkung: string;
  /** Wofür zugesagt ist, wenn eine Zusage gilt (§5.6.2) — Spalte P der Vorlage. */
  readonly zugesagtFuer?: string;
  /** Wer zugesagt hat — Spalte Q. */
  readonly zugesagtVon?: string;
  readonly erledigtAm?: string;
  readonly storniert: boolean;
  /** Hinweise, deren Feldpfad auf diese Anforderung zeigt (§3.8a). */
  readonly hinweise: readonly Konflikthinweis[];
}

/** Der Feldpfad, unter dem Hinweise zu dieser Anforderung stehen (§3.8a). */
export function anforderungspfad(anforderungId: Id): string {
  return `anforderung/${anforderungId}`;
}

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert.length > 0 ? wert : ersatz;
}

/**
 * Baut die Zeile einer Anforderung.
 *
 * Der Name der abzulösenden Einheit wird **beim Bauen** nachgeschlagen und
 * nicht mitgeschrieben: Wird die Einheit umbenannt, soll die Liste den neuen
 * Namen zeigen. Dieselbe Regel gilt im Tagebuch (§5.9.1).
 */
export function anforderungszeile(
  zustand: Zustand,
  anforderung: AnforderungZustand,
): Anforderungszeile {
  const pfad = anforderungspfad(anforderung.id);
  const abzuloesendeId = anforderung.abzuloesendeEinheitId?.wert;
  const einheit =
    typeof abzuloesendeId === "string" ? zustand.einheiten[abzuloesendeId] : undefined;

  // §3.2: Ein Gegenereignis setzt den Wert auf `null` beziehungsweise `false`,
  // das **Feld** bleibt stehen. Gefragt wird deshalb nach dem Wert und nicht
  // nach dem Vorhandensein — dieselbe Prüfung, die der Fold `gilt` nennt
  // (§5.6.2). Sonst zeigte eine zurückgenommene Zusage weiter eine Zusage an.
  const gilt = (wert: unknown): boolean => wert !== null && wert !== undefined && wert !== false;
  const zusage: unknown = anforderung.zusage?.wert;
  const erledigung: unknown = anforderung.erledigung?.wert;
  const storno: unknown = anforderung.storno?.wert;

  return {
    id: anforderung.id,
    kennung: text(anforderung.kennung.wert),
    zustand: anforderung.zustand,
    angefordertAm: text(anforderung.angefordertAm?.wert),
    ...(typeof abzuloesendeId === "string" ? { abzuloesendeEinheitId: abzuloesendeId } : {}),
    ...(einheit === undefined
      ? {}
      : { abzuloesendeEinheit: text(einheit.bezeichnung.wert, abzuloesendeId as string) }),
    vorgeseheneEinheitText: text(anforderung.vorgeseheneEinheitText?.wert),
    vorgesehenerAuftrag: text(anforderung.vorgesehenerAuftrag?.wert),
    bemerkung: text(anforderung.bemerkung?.wert),
    // Der Schlüssel `zugesagtFuer` ist der, den der Fold plausibilisiert
    // (§2.5, Klasse PLAN). `zustand.ts` beschreibt das Feld mit
    // `{einheitText, zugesagtAm}` und §5.6 mit `{zugesagtFuer, zugesagtVon,
    // abloesendeEinheitId?}` — drei Beschreibungen einer Größe. Gelesen wird
    // die des Folds, weil sie die einzige ist, an der Verhalten hängt; die
    // Abweichung steht als Befund im Bericht.
    ...(gilt(zusage)
      ? {
          zugesagtFuer: text((zusage as { zugesagtFuer?: string }).zugesagtFuer),
          zugesagtVon: text((zusage as { zugesagtVon?: string }).zugesagtVon),
        }
      : {}),
    ...(gilt(erledigung)
      ? { erledigtAm: text((erledigung as { erledigtAm?: string }).erledigtAm) }
      : {}),
    // `storno` trägt nach dem Katalog den **festen** Wert `true`
    // (`festerWert: true`), nicht `{storniertAm}` wie `zustand.ts` es
    // beschreibt. Angezeigt wird deshalb nur, **dass** storniert wurde; wann
    // und von wem, steht im Tagebuch. Auch das ist ein Befund.
    storniert: gilt(storno),
    hinweise: zustand.hinweise.filter((hinweis) => hinweis.feldpfad.startsWith(pfad)),
  };
}

export interface Anforderungsoptionen {
  /** Nur diese Zustände; ohne Angabe alle. */
  readonly zustaende?: readonly Anforderungszustand[];
  /** Volltext über Kennung, vorgesehene Einheit, Auftrag und Bemerkung. */
  readonly suche?: string;
  /** Erste Zeile des Ausschnitts (M3.7). */
  readonly von?: number;
  readonly anzahl?: number;
}

export interface Anforderungsausschnitt {
  readonly zeilen: readonly Anforderungszeile[];
  readonly von: number;
  readonly gesamtzahl: number;
  /** Zahl je Zustand — die Führungsstelle will wissen, wie viel offen ist. */
  readonly jeZustand: { readonly [zustand: string]: number };
}

/**
 * Ordnet zwei Zeilen: Zustand, dann Anforderungszeit, dann Id.
 *
 * Die Id als letzter Schlüssel ist keine Kosmetik, sondern dieselbe Regel wie
 * in §5.3: Ohne sie hinge die Reihenfolge zweier gleichzeitiger Anforderungen
 * an der Aufzählungsreihenfolge eines Objekts, und zwei Clients zeigten
 * dieselbe Liste verschieden.
 */
export function vergleicheAnforderungen(links: Anforderungszeile, rechts: Anforderungszeile): number {
  const nachZustand = (RANG[links.zustand] ?? 0) - (RANG[rechts.zustand] ?? 0);
  if (nachZustand !== 0) return nachZustand;
  const nachZeit = links.angefordertAm.localeCompare(rechts.angefordertAm);
  if (nachZeit !== 0) return nachZeit;
  return links.id < rechts.id ? -1 : links.id > rechts.id ? 1 : 0;
}

function trifft(zeile: Anforderungszeile, suche: string): boolean {
  if (suche === "") return true;
  return [zeile.kennung, zeile.vorgeseheneEinheitText, zeile.vorgesehenerAuftrag, zeile.bemerkung, zeile.abzuloesendeEinheit ?? ""]
    .join(" ")
    .toLocaleLowerCase("de-DE")
    .includes(suche);
}

export function anforderungsliste(
  zustand: Zustand,
  optionen: Anforderungsoptionen = {},
): Anforderungsausschnitt {
  const suche = optionen.suche?.trim().toLocaleLowerCase("de-DE") ?? "";
  const erlaubt = optionen.zustaende === undefined ? undefined : new Set(optionen.zustaende);

  const alle = Object.values(zustand.anforderungen).map((a) => anforderungszeile(zustand, a));
  const jeZustand: Record<string, number> = Object.fromEntries(
    ANFORDERUNG_ZUSTAENDE.map((wert) => [wert, 0]),
  );
  for (const zeile of alle) jeZustand[zeile.zustand] = (jeZustand[zeile.zustand] ?? 0) + 1;

  const gefiltert = alle
    .filter((zeile) => (erlaubt === undefined || erlaubt.has(zeile.zustand)) && trifft(zeile, suche))
    .sort(vergleicheAnforderungen);

  const von = Math.max(0, optionen.von ?? 0);
  const anzahl = optionen.anzahl ?? gefiltert.length;
  return {
    zeilen: gefiltert.slice(von, von + anzahl),
    von,
    gesamtzahl: gefiltert.length,
    jeZustand,
  };
}

/**
 * Die Anforderung, die an einer Einheitenzeile steht — für die Spalten N bis S
 * der Einheitentabelle.
 *
 * Sie ist die jüngste nicht stornierte Anforderung, die diese Einheit ablösen
 * soll (K12). Sie steht hier als eigene Funktion, damit die Tabelle sie nicht
 * über die ganze Anforderungsmenge suchen muss.
 */
export function anforderungZurEinheit(
  zustand: Zustand,
  einheitId: Id,
): Anforderungszeile | undefined {
  const treffer = Object.values(zustand.anforderungen)
    .filter((a) => a.abzuloesendeEinheitId?.wert === einheitId && a.zustand !== "STORNIERT")
    .map((a) => anforderungszeile(zustand, a))
    .sort((links, rechts) => {
      const nachZeit = rechts.angefordertAm.localeCompare(links.angefordertAm);
      return nachZeit !== 0 ? nachZeit : links.id < rechts.id ? -1 : 1;
    });
  return treffer[0];
}
