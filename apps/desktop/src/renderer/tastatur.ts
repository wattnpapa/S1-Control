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

import { findeKuerzel } from "@s1/domaene";

export {
  KUERZEL,
  findeKuerzel,
  kuerzel,
  kuerzelText,
  passt,
  type Kuerzel,
  type Kuerzelbereich,
  type Tastendruck,
} from "@s1/domaene";

/** Steht der Fokus in einem Feld, in das getippt wird? */
export function inEingabefeld(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof HTMLElement)) return false;
  if (ziel.isContentEditable) return true;
  const marke = ziel.tagName.toLowerCase();
  return marke === "input" || marke === "textarea" || marke === "select";
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
