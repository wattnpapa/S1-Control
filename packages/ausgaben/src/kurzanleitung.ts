/**
 * Die Störfallkarte als Text (M7.3).
 *
 * **Der zweite Leser der Matrix.** Die Diagnoseansicht zeigt die sechs Fälle
 * auf dem Bildschirm; diese Datei setzt dieselben sechs für Papier. Beide
 * lesen `STOERFAELLE` aus Ring 2 — deshalb kann die Karte neben dem Rechner
 * nicht anderes sagen als das Programm darauf. Genau das war der Grund, die
 * Matrix als Daten zu führen und nicht als zwei Texte.
 *
 * **Warum Markdown und nicht PDF.** Die Karte gehört in den Baum und wird mit
 * ihm versioniert; wer sie drucken will, druckt die Seite. Ein PDF im
 * Repository wäre ein Erzeugnis, dessen Abweichung vom Quelltext niemand
 * sieht — und die Prüfung in `bau/` könnte es nicht vergleichen.
 *
 * **Warum in Ring 3 und nicht in Ring 2.** Die Fälle sind Daten, das Setzen
 * ist eine Ausgabe. Dieselbe Trennung wie bei jeder anderen Ausgabe seit M4.1:
 * Ring 2 weiß, was gilt; `@s1/ausgaben` weiß, wie es aussieht.
 */

import { STOERFAELLE } from "@s1/domaene";

/**
 * Die Marken, zwischen denen der erzeugte Block steht.
 *
 * Sie stehen im Zieldokument und nicht hier im Code, damit die Kurzanleitung
 * um den Block herum von Hand geschrieben werden kann: Was ein Mensch
 * formuliert hat, bleibt beim Erneuern stehen.
 */
export const MARKE_ANFANG = "<!-- STÖRFALLMATRIX ANFANG — erzeugt, nicht von Hand ändern -->";
export const MARKE_ENDE = "<!-- STÖRFALLMATRIX ENDE -->";

/**
 * Der erzeugte Block, ohne die Marken.
 *
 * Eine Überschrift je Fall statt einer Tabelle: Eine Tabelle mit drei
 * Schritten in einer Zelle ist auf Papier unlesbar, und gelesen wird diese
 * Karte im Stehen.
 */
export function stoerfallmatrixMarkdown(): string {
  const teile: string[] = [];
  for (const fall of STOERFAELLE) {
    teile.push(`### ${fall.titel}`);
    teile.push("");
    teile.push(`**Woran es auffällt:** ${fall.woran}`);
    teile.push("");
    teile.push(`**Was dahintersteckt:** ${fall.ursache}`);
    teile.push("");
    for (const [nummer, schritt] of fall.schritte.entries()) {
      teile.push(`${String(nummer + 1)}. ${schritt}`);
    }
    teile.push("");
    teile.push(`**Nicht:** ${fall.nicht}`);
    teile.push("");
    teile.push(`Grundlage: ${fall.quelle}`);
    teile.push("");
  }
  // Der letzte Leerzeile-Eintrag wird abgeschnitten: Der Block endet mit
  // genau einem Zeilenumbruch, sonst wüchse die Datei bei jedem Erneuern.
  return `${teile.join("\n").trimEnd()}\n`;
}

/**
 * Trägt den Block in ein Dokument ein, das die beiden Marken führt.
 *
 * Wirft, wenn eine Marke fehlt oder in der falschen Reihenfolge steht: Ein
 * stillschweigend unverändertes Dokument wäre die Art Fehler, die erst auf
 * Papier auffällt.
 */
export function mitStoerfallmatrix(dokument: string): string {
  const anfang = dokument.indexOf(MARKE_ANFANG);
  const ende = dokument.indexOf(MARKE_ENDE);
  if (anfang < 0 || ende < 0 || ende < anfang) {
    throw new Error("Das Dokument führt die beiden Marken der Störfallmatrix nicht.");
  }
  const vorne = dokument.slice(0, anfang + MARKE_ANFANG.length);
  const hinten = dokument.slice(ende);
  return `${vorne}\n\n${stoerfallmatrixMarkdown()}\n${hinten}`;
}
