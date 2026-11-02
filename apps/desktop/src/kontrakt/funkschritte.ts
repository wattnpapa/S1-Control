/**
 * Die Bedienschritte des Funkplans (KONZEPT-FUNKPLAN.md §5, §8) — Entwürfe
 * für den Ruf `bedienen`.
 *
 * Eigene Datei neben `bedienschritte.ts` und `versorgungsschritte.ts`, damit
 * jene nicht weiter wächst. Jede Funktion baut genau einen Entwurf;
 * geschrieben wird im Worker, in einer Transaktion, wie jeder andere
 * Bedienschritt.
 *
 * **Die Rufgruppe der Einheit geht durch `inlineEntwurf`.** Die Zelle im
 * Blatt „Funkplan" und die Zelle der Einheitentabelle schreiben dasselbe
 * Ereignis; die Zuordnung Spalte → Ereignisart steht in Ring 2
 * (`projektion/tabelle.ts`), und eine zweite Bauweise hier wäre dieselbe
 * Tabelle ein zweites Mal. Dasselbe gilt für Funkhinweis und
 * Erreichbarkeit (F2): Die Zelle im Blatt, die Zelle der Einheitentabelle und
 * die Maske „Funk und Erreichbarkeit" bauen denselben Entwurf.
 *
 * Jeder Schritt an der Einheit schickt den Wert, den Zelle oder Maske beim
 * Öffnen sah, und verlangt die Vorwert-Prüfung: Ein Kollege, der dasselbe
 * Feld inzwischen anders gesetzt hat, wird nicht still überschrieben.
 */

import { projektion, type Funkteilnehmer } from "@s1/domaene";

import { inlineEntwurf } from "./bedienschritte.js";
import type { Entwurf } from "./index.js";

/** Die bekannten Betriebsarten in der Reihenfolge der Maske; der Bereich bleibt offen (§3.7). */
export const BETRIEBSARTEN = ["TMO", "DMO", "ANALOG"] as const;

export interface Rufgruppenanlage {
  readonly rufgruppeId: string;
  readonly betriebsart: string;
  readonly name: string;
  readonly zweck?: string;
  readonly hoert?: string;
  readonly gateway?: string;
  readonly bemerkung?: string;
  readonly reihenfolge?: number;
  readonly abschnittId?: string;
}

export function rufgruppeAnlegen(anlage: Rufgruppenanlage): Entwurf {
  return { typ: "RufgruppeAngelegt", nutzlast: { ...anlage } };
}

/** Die Felder, die die Maske ändert; `reihenfolge` bleibt der Anlage vorbehalten. */
export const RUFGRUPPENFELDER = ["betriebsart", "name", "zweck", "hoert", "gateway", "abschnittId", "bemerkung"] as const;
export type Rufgruppenmaskenfeld = (typeof RUFGRUPPENFELDER)[number];

/** Ein Feld der Rufgruppe; `vorher` ist der Wert, den die Maske beim Öffnen sah. */
export function rufgruppeGeaendert(
  rufgruppeId: string,
  feld: Rufgruppenmaskenfeld,
  vorher: string | null,
  neu: string | null,
): Entwurf {
  return { typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId, feld }, vorher, neu, vorwertPruefen: true };
}

/** Auflösen verlangt einen Grund; die Teilnehmer setzt es nicht um (Entscheidung 9). */
export function rufgruppeAufgeloest(rufgruppeId: string, grund: string): Entwurf {
  return { typ: "RufgruppeAufgeloest", nutzlast: { rufgruppeId }, vorher: null, neu: true, grund };
}

export function rufgruppeWiederhergestellt(rufgruppeId: string): Entwurf {
  return { typ: "RufgruppeWiederhergestellt", nutzlast: { rufgruppeId }, vorher: true, neu: false };
}

/**
 * Die Hauptrufgruppe einer Einheit setzen; `null` heißt „keine Rufgruppe".
 * `vorher` ist die Gruppe, die die Zelle beim Öffnen sah; der Worker weist ab,
 * wenn ein anderer Arbeitsplatz sie inzwischen anders gesetzt hat.
 */
export function rufgruppeDerEinheit(einheitId: string, vorher: string | null, neu: string | null): Entwurf {
  const spalte = projektion.spalte("rufgruppe");
  const entwurf = spalte === undefined ? undefined : inlineEntwurf(spalte, einheitId, vorher, neu);
  // Die Spalte steht fest in der Tabelle von Ring 2; fehlte sie, wäre das ein
  // Baufehler, und der Entwurf wird trotzdem in derselben Form gebaut.
  return { ...(entwurf ?? { typ: "EinheitRufgruppeGesetzt", nutzlast: { einheitId }, vorher, neu }), vorwertPruefen: true };
}

/** Der Schritt aus einer Zellwahl: `""` heißt „keine"; dieselbe Gruppe schreibt nichts. */
export function rufgruppenwahl(einheitId: string, vorher: string | undefined, gewaehlt: string): Entwurf | undefined {
  if (gewaehlt === (vorher ?? "")) return undefined;
  return rufgruppeDerEinheit(einheitId, vorher ?? null, gewaehlt === "" ? null : gewaehlt);
}

/** Leere Eingabe heißt „ausdrücklich leer" (`null`), wie in der Einheitentabelle. */
function textwert(eingabe: string): string | null {
  const geputzt = eingabe.trim();
  return geputzt === "" ? null : geputzt;
}

/** Das Stammdatenfeld, das die Spalte schreibt — nur für den Rückfall in {@link ueberSpalte}. */
const STAMMFELD_DER_SPALTE = { funkhinweis: "funkHinweis", erreichbarkeit: "erreichbarkeitOverride" } as const;

/** Ein Entwurf über die Spalte der Einheitentabelle, mit Vorwert-Prüfung. */
function ueberSpalte(schluessel: keyof typeof STAMMFELD_DER_SPALTE, einheitId: string, vorher: string | null, neu: string | null): Entwurf {
  const spalte = projektion.spalte(schluessel);
  const entwurf = spalte === undefined ? undefined : inlineEntwurf(spalte, einheitId, vorher, neu);
  // Wie bei der Rufgruppe: Fehlte die Spalte, wäre das ein Baufehler, und der
  // Entwurf entsteht trotzdem in derselben Form.
  const rueckfall = { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId, feld: STAMMFELD_DER_SPALTE[schluessel] }, vorher, neu };
  return { ...(entwurf ?? rueckfall), vorwertPruefen: true };
}

/**
 * Der Funkhinweis aus einer Eingabe: über die Spalte `funkhinweis`, also
 * derselbe Entwurf wie die Zelle der Einheitentabelle. Eine unveränderte
 * Eingabe schreibt nichts.
 */
export function funkhinweisDerEinheit(einheitId: string, vorher: string | undefined, eingabe: string): Entwurf | undefined {
  const neu = textwert(eingabe);
  if (neu === (vorher ?? null)) return undefined;
  return ueberSpalte("funkhinweis", einheitId, vorher ?? null, neu);
}

/** Der Override der Erreichbarkeit (K9); leer heißt „wieder aus Führungskraft und Kontakten". */
export function erreichbarkeitUeberschreiben(einheitId: string, vorher: string | undefined, eingabe: string): Entwurf | undefined {
  const neu = textwert(eingabe);
  if (neu === (vorher ?? null)) return undefined;
  return ueberSpalte("erreichbarkeit", einheitId, vorher ?? null, neu);
}

/**
 * Der Override des Funkrufnamens (K31); leer heißt „wieder aus dem
 * Fahrzeug". Keine Spalte schreibt ihn — der Funkrufname ist dort berechnet —,
 * deshalb hier unmittelbar als Stammdatum.
 */
export function funkrufnameUeberschreiben(einheitId: string, vorher: string | undefined, eingabe: string): Entwurf | undefined {
  const neu = textwert(eingabe);
  if (neu === (vorher ?? null)) return undefined;
  return { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId, feld: "funkrufnameOverride" }, vorher: vorher ?? null, neu, vorwertPruefen: true };
}

/**
 * Die weiteren Rufgruppen als ganze Liste (LWW über die Liste). Eine leere
 * Liste wird `null`; dieselbe Liste in derselben Reihenfolge schreibt nichts.
 * `vorher` ist die Liste, die die Maske beim Öffnen sah.
 */
export function weitereRufgruppenDerEinheit(einheitId: string, vorher: readonly string[], neu: readonly string[]): Entwurf | undefined {
  const liste = [...new Set(neu)];
  if (liste.length === vorher.length && liste.every((id, stelle) => id === vorher[stelle])) return undefined;
  return {
    typ: "EinheitStammdatenGeaendert",
    nutzlast: { einheitId, feld: "weitereRufgruppenIds" },
    vorher: vorher.length === 0 ? null : [...vorher],
    neu: liste.length === 0 ? null : liste,
    vorwertPruefen: true,
  };
}

// --- Funkplan F3: Funkprobe und Schwelle „kein Kontakt" ----------------------

/** Was „Funkprobe eintragen" von der Einheit braucht: ihre Gruppe und die gesehenen Proben. */
export type Funkprobenziel = Pick<Funkteilnehmer, "einheitId" | "rufgruppeId" | "rufgruppeAufgeloest" | "letzteFunkproben">;

/**
 * Eine Funkprobe für die Einheit: über ihre geltende Hauptrufgruppe, mit der
 * Funkzeit `zeitpunkt` (die Oberfläche schickt „jetzt"). Das Ergebnis wählt
 * den Feldpfad; `vorher` ist die Probe desselben Ergebnisses, die das Blatt
 * zuletzt sah — die Rücknahme setzt sie wieder. Ohne Vorwert-Prüfung: Eine
 * Probe ist eine neue Beobachtung, keine Korrektur eines fremden Wertes, und
 * zwei Sprechfunker, die dieselbe Einheit kurz nacheinander proben, haben
 * beide recht. Bei „kein Kontakt" steht der Grund im Rahmen (Tagebuch) und im
 * Wert (Funkplan); Pflicht ist er dort, der Worker weist ohne ihn ab.
 */
export function funkprobe(ziel: Funkprobenziel, ergebnis: "KONTAKT" | "KEIN_KONTAKT", zeitpunkt: string, grund?: string): Entwurf {
  const rufgruppeId = ziel.rufgruppeAufgeloest ? undefined : ziel.rufgruppeId;
  const begruendet = grund?.trim() ?? "";
  const neu = {
    zeitpunkt,
    ...(rufgruppeId === undefined ? {} : { rufgruppeId }),
    ...(ergebnis === "KEIN_KONTAKT" && begruendet !== "" ? { grund: begruendet } : {}),
  };
  return {
    typ: "FunkprobeDurchgefuehrt",
    nutzlast: { einheitId: ziel.einheitId, ergebnis },
    vorher: ziel.letzteFunkproben?.[ergebnis] ?? null,
    neu,
    ...(ergebnis === "KEIN_KONTAKT" && begruendet !== "" ? { grund: begruendet } : {}),
  };
}

/**
 * Die Schwelle „kein Kontakt" des Einsatzes in Minuten. `vorher` ist die
 * Schwelle, die das Blatt zeigte — auch die Vorbelegung, wie bei den
 * Kostenparametern —; dieselbe Zahl schreibt nichts. Ohne Vorwert-Prüfung:
 * Der Einsatz hat einen Wert, und der zuletzt gesetzte gilt.
 */
export function funkSchwelleSetzen(einsatzId: string, vorher: number, neu: number): Entwurf | undefined {
  if (neu === vorher) return undefined;
  return { typ: "FunkParameterGesetzt", nutzlast: { einsatzId }, vorher, neu };
}
