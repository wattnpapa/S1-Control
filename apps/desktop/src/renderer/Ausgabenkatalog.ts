/**
 * Welche Ausgaben das Blatt „Exporte“ anbietet und wie sie gruppiert sind.
 *
 * Vorher standen 26 gleichrangige Knöpfe in einer Reihe; wer „Tagebuch als
 * PDF“ suchte, musste jeden lesen. Jetzt hat jede Ausgabe eine Zeile mit
 * kurzem Zweck und die Formate stehen in festen Spalten (PDF, HTML, XLSX).
 * Die Gruppen folgen dem Anlass, nicht dem Dateiformat: Lagebesprechung,
 * Logistik und Abrechnung, Protokolle und Funk, Betrieb ohne Rechner.
 *
 * Die Reihenfolge ist Absicht: Druck, Status und Einheitenliste sind die drei
 * Ausdrucke der Lagebesprechung und stehen zusammen; der Funkplan steht
 * unmittelbar vor dem Papier-Vordruck, weil beide am Platz der Sprechfunker
 * hängen.
 */

import type { Laden } from "./laden.js";

export type Ausgabeart = Parameters<Laden["erzeugeAusgabe"]>[0];

export type Ausgabeformat = "pdf" | "html" | "xlsx";

export interface Formatangebot {
  readonly format: Ausgabeformat;
  /** Abweichende Ausgabeart für dieses Format (Logistik → ungeschützte Wertekopie). */
  readonly ausgabe?: Ausgabeart;
  /** Zusatz hinter dem Format, etwa „ungeschützt“. */
  readonly zusatz?: string;
  readonly titel?: string;
}

export interface Ausgabezeile {
  readonly ausgabe: Ausgabeart;
  readonly name: string;
  readonly zweck: string;
  readonly formate: readonly Formatangebot[];
  /** Nur der Druck weist zusätzlich die Stärke einer Organisation aus. */
  readonly mitOrganisation?: boolean;
}

export interface Ausgabegruppe {
  readonly titel: string;
  readonly zeilen: readonly Ausgabezeile[];
}

const PDF_HTML: readonly Formatangebot[] = [{ format: "pdf" }, { format: "html" }];

export const AUSGABEGRUPPEN: readonly Ausgabegruppe[] = [
  {
    titel: "Lagebesprechung",
    zeilen: [
      // Stab-Review 2026-11-22 (LtrStab A2): die Mappe für den Vortrag auf einem Blatt.
      {
        ausgabe: "lagevortrag",
        name: "Lagevortrag",
        zweck: "Kräfte, Kommen und Gehen, Aufträge, Anforderungen, Rücklauf und letzte Einträge auf einem Blatt",
        formate: PDF_HTML,
      },
      { ausgabe: "druck", name: "Druck", zweck: "Stärke je Bereich für die Lagekarte", formate: PDF_HTML, mitOrganisation: true },
      { ausgabe: "status", name: "Status", zweck: "Kräftebilanz nach Organisation, Status und Schicht", formate: PDF_HTML },
      // Der Druck sagt „wie viele wo“, die Einheitenliste „wer genau“ — auch
      // die Rückfallebene, wenn der Rechner ausfällt.
      { ausgabe: "einheitenliste", name: "Einheitenliste", zweck: "Jede Einheit unter ihrem Bereich", formate: PDF_HTML },
      // Gezeichnet wird, was im Abschnittsbaum bedient wird (M8.3).
      { ausgabe: "fueorg", name: "Führungsorganisation", zweck: "Führungsharke aus dem Abschnittsbaum", formate: PDF_HTML },
    ],
  },
  {
    titel: "Logistik und Abrechnung",
    zeilen: [
      {
        ausgabe: "log",
        name: "Logistik",
        zweck: "Eine Zeile je Bereich: wie viele wo",
        formate: [
          ...PDF_HTML,
          {
            format: "xlsx",
            ausgabe: "logfrei",
            zusatz: "ungeschützt",
            titel: "Wertekopie der Logistik ohne Blattschutz, zum Weiterschicken und Weiterrechnen",
          },
        ],
      },
      { ausgabe: "kosten", name: "Kosten", zweck: "Kostenübersicht für die Abrechnung", formate: PDF_HTML },
      // Die einzige Ausgabe mit der Bereichszugehörigkeit als Attribut (M4.2).
      { ausgabe: "auswertung", name: "Auswertung", zweck: "Alle Einheiten mit Bereich, zum Filtern und Weiterrechnen", formate: [{ format: "xlsx" }] },
      {
        ausgabe: "oldenburg",
        name: "Oldenburger Block",
        zweck: "Alle Einheiten in der Spaltenordnung der bisherigen Excel-Vorlage, zum Einfügen dort",
        formate: [{ format: "xlsx" }],
      },
    ],
  },
  {
    titel: "Protokolle und Funk",
    zeilen: [
      { ausgabe: "anforderungen", name: "Anforderungen", zweck: "Mit Notizspalte, für die Schichtübergabe", formate: PDF_HTML },
      { ausgabe: "tagebuch", name: "Tagebuch", zweck: "Mit Notizspalte, für die Schichtübergabe", formate: PDF_HTML },
      { ausgabe: "funkplan", name: "Funkplan", zweck: "Teilnehmer je Rufgruppe, mit Leerzeilen zum Weiterführen", formate: PDF_HTML },
    ],
  },
  {
    titel: "Betrieb ohne Rechner",
    zeilen: [
      {
        ausgabe: "papier",
        name: "Papier-Vordruck",
        zweck: "Leere Vordrucke: Meldeblock, Einheitenliste, Funkprotokoll, Funkplan, dazu der Nachrichtenvordruck",
        formate: PDF_HTML,
      },
    ],
  },
];

export const FORMATSPALTEN: readonly Ausgabeformat[] = ["pdf", "html", "xlsx"];

/** Der zugängliche Name des Knopfs — so hießen die Knöpfe auch vorher. */
export function knopfname(zeile: Ausgabezeile, angebot: Formatangebot): string {
  const zusatz = angebot.zusatz === undefined ? "" : ` (${angebot.zusatz})`;
  return `${zeile.name} als ${angebot.format.toUpperCase()}${zusatz}`;
}
