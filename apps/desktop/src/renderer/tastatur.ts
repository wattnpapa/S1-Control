/**
 * Die Tastenkarte des Arbeitsplatzes (M3.6).
 *
 * **Eine Stelle, an der ein Kürzel angemeldet wird**, und sie ist zugleich die
 * Quelle der Abkürzungsliste im Hilfefenster. Zwei Listen — eine im Code, eine
 * in der Hilfe — sind nach der dritten Änderung zwei verschiedene Listen, und
 * die falsche steht in der Hilfe.
 *
 * **Die Buchstaben sind die der Excel.** Die Führungsstelle bedient heute
 * `m_makroFunktionen` (Bestandsaufnahme `excel-domaenenmodell.md` §2,
 * „Tastenkürzel"): Strg+N fügt eine Zeile ein, Strg+E entfernt, Strg+M
 * verschiebt, Strg+D schreibt „jetzt“ in die aktive Zelle, Strg+Q liest einen
 * digitalen EEB ein, Strg+H öffnet die Abkürzungsliste. Dieselben Buchstaben
 * hier zu vergeben ist kein Zitat, sondern der billigste Teil der Umstellung:
 * Wer die Excel seit Jahren bedient, hat sie in den Fingern.
 *
 * Zwei Kürzel kommen hinzu, weil die Excel sie von Haus aus mitbrachte:
 * Strg+F sucht, Strg+Z nimmt zurück.
 *
 * Nicht übernommen wird **Strg+A** (in der Excel die Eingabemaske). Im
 * Browser markiert es alles, und ein Kürzel, das eine so tief verankerte
 * Bedienung überschreibt, kostet mehr, als es einbringt.
 */

import { useEffect } from "react";

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

/** Steht der Fokus in einem Feld, in das getippt wird? */
export function inEingabefeld(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof HTMLElement)) return false;
  if (ziel.isContentEditable) return true;
  const marke = ziel.tagName.toLowerCase();
  return marke === "input" || marke === "textarea" || marke === "select";
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

export type Kuerzelhandlungen = Partial<Record<string, () => void>>;

/**
 * Hängt die angemeldeten Kürzel an das Fenster.
 *
 * **Angemeldet wird je Ansicht und nicht global.** Eine Ansicht, die
 * „anlegen" nicht kann, meldet es nicht an — und dann greift Strg+N dort auch
 * nicht, statt eine Maske zu öffnen, die zu ihr nicht gehört. Der Hörer hängt
 * am Fenster und nicht an einem Knoten, weil der Fokus beim Drücken irgendwo
 * stehen kann; welche Handlung greift, entscheidet die Anmeldung.
 *
 * `preventDefault` nur, wenn eine Handlung greift: Strg+F ohne angemeldete
 * Suche soll die Suchleiste des Fensters öffnen dürfen.
 */
export function useKuerzel(handlungen: Kuerzelhandlungen): void {
  useEffect(() => {
    function beiTaste(ereignis: KeyboardEvent): void {
      const gefunden = findeKuerzel(ereignis, inEingabefeld(ereignis.target));
      if (gefunden === undefined) return;
      const handlung = handlungen[gefunden.name];
      if (handlung === undefined) return;
      ereignis.preventDefault();
      handlung();
    }
    window.addEventListener("keydown", beiTaste);
    return () => {
      window.removeEventListener("keydown", beiTaste);
    };
  }, [handlungen]);
}
