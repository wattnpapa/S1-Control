/**
 * Die Tastenkarte als Daten (M3.6, nach Ring 2 gezogen in M8.1).
 *
 * **Warum sie hier steht und nicht im Renderer.** Sie hat drei Leser: das
 * Fenster, das die Kürzel greifen lässt; die In-App-Hilfe, die sie zeigt; und
 * das Handbuch, das sie druckt. Drei Leser einer Liste sind das Muster, das
 * seit M7.3 gilt — zwei Fassungen desselben Satzes driften auseinander, und
 * die falsche steht dann in der Dokumentation.
 *
 * **Ring 2 verträgt sie**, weil hier nichts Plattformabhängiges steht: ein
 * Tastenname als Zeichenkette, drei Wahrheitswerte, ein Text. Das Einhängen
 * eines Hörers am Fenster bleibt im Renderer (`tastatur.ts`) — dort gehört es
 * hin, und ohne DOM wäre es nicht schreibbar.
 *
 * Die Kürzel selbst stammen aus der Excel; woher, steht bei jedem Eintrag.
 * Wer die Mappe bedient hat, soll nichts Neues lernen müssen.
 */

/** In welchem Teil der Oberfläche ein Kürzel gilt — die Gliederung der Hilfe. */
export type Kuerzelbereich = "Allgemein" | "Abschnitte" | "Einheiten" | "Tagebuch" | "Masken";

export interface Kuerzel {
  /** Der Name des Kürzels; darüber meldet eine Ansicht ihre Handlung an. */
  readonly name: string;
  /** `event.key`, kleingeschrieben verglichen. */
  readonly taste: string;
  readonly strg?: true;
  readonly umschalt?: true;
  readonly bereich: Kuerzelbereich;
  readonly beschreibung: string;
  /**
   * Gilt auch, während der Fokus in einem Eingabefeld steht.
   *
   * Vorbelegung ist `false`, und das ist der Regelfall: Wer in ein Textfeld
   * „neuer Abschnitt“ tippt, will beim `n` kein neues Formular. Die
   * Ausnahmen sind die Kürzel, die **gerade** für das Eingabefeld gedacht
   * sind — Strg+D schreibt „jetzt“ in das Feld, unter dem der Cursor steht,
   * und Enter und Escape schließen die Maske, in der getippt wird.
   */
  readonly auchImEingabefeld?: true;
  /** Der Vorgang aus der Excel, aus dem dieses Kürzel stammt — für die Hilfe. */
  readonly excel?: string;
}

const k = (kuerzel: Kuerzel): Kuerzel => kuerzel;

/** Die vollständige Tastenkarte — zugleich der Inhalt der Abkürzungsliste. */
export const KUERZEL: readonly Kuerzel[] = [
  k({ name: "anlegen", taste: "n", strg: true, bereich: "Allgemein",
      beschreibung: "Neuen Eintrag anlegen — Abschnitt oder Einheit, je nach gewählter Ansicht",
      excel: "Strg+N (Zeilen einfügen)" }),
  k({ name: "entfernen", taste: "e", strg: true, bereich: "Allgemein",
      beschreibung: "Gewählten Eintrag entfernen; verlangt einen Grund (§2.4)",
      excel: "Strg+E (Zeilen entfernen)" }),
  k({ name: "verschieben", taste: "m", strg: true, bereich: "Allgemein",
      beschreibung: "Gewählte Einheiten in einen anderen Abschnitt verschieben",
      excel: "Strg+M (Zeilen verschieben)" }),
  k({ name: "suchen", taste: "f", strg: true, bereich: "Allgemein",
      beschreibung: "In die Suche springen" }),
  k({ name: "zurueck", taste: "z", strg: true, bereich: "Allgemein",
      beschreibung: "Letzte eigene Aktion zurücknehmen (§6 U3)" }),
  k({ name: "jetzt", taste: "d", strg: true, bereich: "Masken", auchImEingabefeld: true,
      beschreibung: "„Jetzt“ in das Zeitfeld schreiben, in dem der Cursor steht",
      excel: "Strg+D (=Now in die aktive Zelle)" }),
  k({ name: "eeb", taste: "q", strg: true, bereich: "Einheiten",
      beschreibung: "Erfassungsbogen vom Handscanner einlesen",
      excel: "Strg+Q (digitaler EEB in neue Zeile)" }),
  k({ name: "hilfe", taste: "h", strg: true, bereich: "Allgemein",
      beschreibung: "Abkürzungsliste und Tastenkarte öffnen",
      excel: "Strg+H (AküLi)" }),
  k({ name: "bestaetigen", taste: "enter", bereich: "Masken", auchImEingabefeld: true,
      beschreibung: "Maske bestätigen" }),
  k({ name: "abbrechen", taste: "escape", bereich: "Masken", auchImEingabefeld: true,
      beschreibung: "Maske abbrechen, Auswahl aufheben" }),
];

const KUERZEL_JE_NAME: ReadonlyMap<string, Kuerzel> = new Map(KUERZEL.map((eintrag) => [eintrag.name, eintrag]));

export function kuerzel(name: string): Kuerzel | undefined {
  return KUERZEL_JE_NAME.get(name);
}

/** „Strg+N", „Enter" — so, wie es in der Hilfe und in einem `title` steht. */
export function kuerzelText(eintrag: Kuerzel): string {
  const teile: string[] = [];
  if (eintrag.strg === true) teile.push("Strg");
  if (eintrag.umschalt === true) teile.push("Umschalt");
  teile.push(eintrag.taste.length === 1 ? eintrag.taste.toUpperCase() : grossAnfang(eintrag.taste));
  return teile.join("+");
}

function grossAnfang(wort: string): string {
  return wort.charAt(0).toUpperCase() + wort.slice(1);
}

/** Das minimale Tastenereignis, das {@link passt} braucht — so ist es ohne DOM prüfbar. */
export interface Tastendruck {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

/**
 * Passt dieser Tastendruck zu diesem Kürzel?
 *
 * `metaKey` zählt wie `ctrlKey`, und das ist keine Bequemlichkeit: macOS ist
 * nach Entscheidung 13 des Umsetzungsplans die Entwicklungsplattform, und dort
 * liegt die Befehlstaste an der Stelle, an der Windows Strg hat. Ein Kürzel,
 * das dort nicht greift, ist auf der Entwicklungsmaschine nicht bedienbar und
 * fällt deshalb nie auf.
 *
 * `altKey` schließt dagegen aus: Alt+Strg+N ist auf deutschen Tastaturen die
 * dritte Belegungsebene, und wer sie drückt, meint ein Zeichen und keine
 * Handlung.
 */
export function passt(eintrag: Kuerzel, druck: Tastendruck): boolean {
  if (druck.altKey === true) return false;
  if (druck.key.toLowerCase() !== eintrag.taste) return false;
  const strg = druck.ctrlKey === true || druck.metaKey === true;
  if ((eintrag.strg === true) !== strg) return false;
  return (eintrag.umschalt === true) === (druck.shiftKey === true);
}

/**
 * Findet das Kürzel zu einem Tastendruck — oder keines.
 *
 * Ohne DOM prüfbar, und genau deshalb getrennt vom Haken unten: Die Regel,
 * welcher Druck welche Handlung auslöst, ist die, auf die es ankommt; das
 * Ein- und Aushängen des Hörers ist Beiwerk.
 */
export function findeKuerzel(druck: Tastendruck, imEingabefeld: boolean): Kuerzel | undefined {
  return KUERZEL.find(
    (eintrag) => passt(eintrag, druck) && (!imEingabefeld || eintrag.auchImEingabefeld === true),
  );
}
