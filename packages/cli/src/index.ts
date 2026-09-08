/**
 * `@s1/cli` — Ring 3: die Kommandozeile `s1`.
 *
 * Geplant sind `akte pruefe | falte | exportiere`, `simuliere` und
 * `diagnose` (02-ZIELBILD.md, Abschnitt „Diagnose im Einsatz"). Dieser Stand
 * kennt nur `diagnose` und beweist damit, dass die CLI alle @s1/*-Pakete
 * erreicht — Electron und React aber nicht.
 */

import { einsatzKennung } from "@s1/domaene";
import { kopfAlsHtml } from "@s1/ausgaben";
import { HINWEIS_PORT } from "@s1/netz";
import { EINSATZ_UNTERORDNER, einsatzOrdner } from "@s1/speicher";

/** Ergebnis eines Kommandos: Ausgabetext und Exitcode. */
export interface Ergebnis {
  readonly text: string;
  readonly code: number;
}

const HILFE = [
  "s1 — Kommandozeile zu S1-Control",
  "",
  "  s1 diagnose <share-wurzel>   Verdrahtung und Ablagepfade anzeigen",
  "",
].join("\n");

/**
 * Fuehrt ein Kommando aus.
 *
 * Bewusst als reine Funktion ueber `argv` statt mit direktem Zugriff auf
 * `process`: so ist jedes Kommando ohne Unterprozess testbar. Den Griff nach
 * `process` macht allein `bin.ts`.
 */
export function fuehreAus(argv: readonly string[]): Ergebnis {
  const [kommando, ...reste] = argv;

  if (kommando === undefined || kommando === "hilfe" || kommando === "--help") {
    return { text: HILFE, code: 0 };
  }

  if (kommando === "diagnose") {
    const wurzel = reste[0] ?? ".";
    const beispiel = einsatzKennung("2026-09-08", "Beispiel");
    const zeilen = [
      `Share-Wurzel:      ${wurzel}`,
      `Beispiel-Einsatz:  ${einsatzOrdner(wurzel, "2026-09-08", "Beispiel")}`,
      `Kennung:           ${beispiel.ordner}`,
      `Unterordner:       ${EINSATZ_UNTERORDNER.join(", ")}`,
      `UDP-Hinweis-Port:  ${HINWEIS_PORT}`,
      `Ausgabekopf:       ${kopfAlsHtml({ datum: "2026-09-08", einsatzName: "Beispiel", stand: "Probe" }).split("\n").length} Zeilen HTML`,
    ];
    return { text: zeilen.join("\n"), code: 0 };
  }

  return { text: `Unbekanntes Kommando: ${kommando}\n\n${HILFE}`, code: 2 };
}
