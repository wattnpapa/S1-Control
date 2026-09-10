/**
 * Erzeugte Abschnitte für die Dokumentation (M7.3, erweitert in M8.2).
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

import { AKUELI, ANSICHTEN, KUERZEL, STOERFAELLE, kuerzelText } from "@s1/domaene";

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
  return zwischenMarken(dokument, MARKE_ANFANG, MARKE_ENDE, stoerfallmatrixMarkdown());
}

// ---------------------------------------------------------------------------
// Das Handbuch (M8.2)
// ---------------------------------------------------------------------------
//
// Dieselbe Begründung wie oben, dreimal weiter getrieben: Tastenkürzel,
// Abkürzungen und Ansichtstexte stehen im Baum je genau einmal. Ein Handbuch,
// das sie abschreibt, ist nach der dritten Änderung an drei Stellen falsch —
// und die Stelle, die dann niemand berichtigt, ist die Dokumentation.

export const MARKE_TASTEN_ANFANG = "<!-- TASTENKARTE ANFANG — erzeugt, nicht von Hand ändern -->";
export const MARKE_TASTEN_ENDE = "<!-- TASTENKARTE ENDE -->";
export const MARKE_ANSICHTEN_ANFANG = "<!-- ANSICHTEN ANFANG — erzeugt, nicht von Hand ändern -->";
export const MARKE_ANSICHTEN_ENDE = "<!-- ANSICHTEN ENDE -->";
export const MARKE_AKUELI_ANFANG = "<!-- AKÜLI ANFANG — erzeugt, nicht von Hand ändern -->";
export const MARKE_AKUELI_ENDE = "<!-- AKÜLI ENDE -->";

/** Die Tastenkarte als Tabellen, nach Bereichen gegliedert wie im Hilfefenster. */
export function tastenkarteMarkdown(): string {
  const bereiche = [...new Set(KUERZEL.map((eintrag) => eintrag.bereich))];
  const teile: string[] = [];
  for (const bereich of bereiche) {
    teile.push(`### ${bereich}`);
    teile.push("");
    teile.push("| Taste | Was sie tut | In der Excel |");
    teile.push("|---|---|---|");
    for (const eintrag of KUERZEL.filter((k) => k.bereich === bereich)) {
      teile.push(`| ${kuerzelText(eintrag)} | ${eintrag.beschreibung} | ${eintrag.excel ?? "—"} |`);
    }
    teile.push("");
  }
  return `${teile.join("\n").trimEnd()}\n`;
}

/** Die Ansichten mit ihren drei Antworten — dieselben, die die Hilfemarke zeigt. */
export function ansichtenMarkdown(): string {
  const teile: string[] = [];
  for (const ansicht of ANSICHTEN) {
    teile.push(`### ${ansicht.titel}`);
    teile.push("");
    teile.push(ansicht.wozu);
    teile.push("");
    teile.push(`**Zuerst:** ${ansicht.zuerst}`);
    teile.push("");
    teile.push(`**Gut zu wissen:** ${ansicht.ueberraschung}`);
    if (ansicht.kuerzel.length > 0) {
      const namen = ansicht.kuerzel
        .map((name) => KUERZEL.find((k) => k.name === name))
        .filter((k) => k !== undefined)
        .map((k) => kuerzelText(k));
      teile.push("");
      teile.push(`**Kürzel:** ${namen.join(" · ")}`);
    }
    teile.push("");
  }
  return `${teile.join("\n").trimEnd()}\n`;
}

/**
 * Die Abkürzungsliste, nach Gruppen.
 *
 * Sie ist mit über hundert Einträgen der längste erzeugte Abschnitt, und sie
 * gehört trotzdem ins Handbuch: Wer am Meldekopf ein Kürzel hört, das er nicht
 * kennt, hat nicht immer einen Bildschirm vor sich.
 */
export function akueliMarkdown(): string {
  const gruppen = [...new Set(AKUELI.map((eintrag) => eintrag.gruppe))];
  // Die Gruppenschlüssel sind Schlüssel und keine Überschriften; „EINHEITEN"
  // als Zwischentitel wäre gebrüllt. Fehlt eine Übersetzung, steht der
  // Schlüssel da — sichtbar falsch ist besser als still verschwunden.
  const titel: Readonly<Record<string, string>> = {
    EINHEITEN: "Einheiten",
    FAHRZEUGE_UND_GERAETE: "Fahrzeuge und Geräte",
  };
  const teile: string[] = [];
  for (const gruppe of gruppen) {
    teile.push(`### ${titel[gruppe] ?? gruppe}`);
    teile.push("");
    teile.push("| Kürzel | Bedeutung |");
    teile.push("|---|---|");
    for (const eintrag of AKUELI.filter((e) => e.gruppe === gruppe)) {
      teile.push(`| ${eintrag.kuerzel} | ${eintrag.bedeutung} |`);
    }
    teile.push("");
  }
  return `${teile.join("\n").trimEnd()}\n`;
}

/**
 * Trägt einen erzeugten Block zwischen zwei Marken ein.
 *
 * Aus {@link mitStoerfallmatrix} herausgezogen, als der zweite Block dazukam:
 * Vier Marken und vier fast gleiche Funktionen wären vier Stellen gewesen, an
 * denen dieselbe Abschneide-Regel hätte stimmen müssen.
 */
export function zwischenMarken(
  dokument: string,
  anfangsmarke: string,
  endmarke: string,
  block: string,
): string {
  const anfang = dokument.indexOf(anfangsmarke);
  const ende = dokument.indexOf(endmarke);
  if (anfang < 0 || ende < 0 || ende < anfang) {
    throw new Error(`Das Dokument führt die Marken ${anfangsmarke} und ${endmarke} nicht.`);
  }
  return `${dokument.slice(0, anfang + anfangsmarke.length)}\n\n${block}\n${dokument.slice(ende)}`;
}

/** Alle erzeugten Abschnitte des Handbuchs auf einmal. */
export function mitHandbuchabschnitten(dokument: string): string {
  let ergebnis = zwischenMarken(dokument, MARKE_TASTEN_ANFANG, MARKE_TASTEN_ENDE, tastenkarteMarkdown());
  ergebnis = zwischenMarken(ergebnis, MARKE_ANSICHTEN_ANFANG, MARKE_ANSICHTEN_ENDE, ansichtenMarkdown());
  ergebnis = zwischenMarken(ergebnis, MARKE_AKUELI_ANFANG, MARKE_AKUELI_ENDE, akueliMarkdown());
  return zwischenMarken(ergebnis, MARKE_ANFANG, MARKE_ENDE, stoerfallmatrixMarkdown());
}
