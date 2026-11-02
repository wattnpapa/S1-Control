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
 * Tabelle ein zweites Mal.
 */

import { projektion } from "@s1/domaene";

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
