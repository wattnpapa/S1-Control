/**
 * Rückfragen mit zweitem Klick in den Masken des Vordrucks — wie „Trotzdem
 * ohne Nummer“ bei der Beförderung (LdF P0-1): Die Maske sperrt nicht, sie
 * fragt einmal und sagt im festen Fuß, worum es geht.
 *
 * - **Abfassungszeit weit weg** (R2-FaBe P2-5): „171534“ wurde kommentarlos
 *   als vor fünf Stunden gelesen; ein Zahlendreher (1534 statt 2034) fiel
 *   niemandem auf. Liegt die Zeit mehr als 24 Stunden zurück oder in der
 *   Zukunft, fragt die Maske — außer im Papier-Nachtrag, wo alte Zeiten die
 *   Regel sind (§6 „Papier-Rückfall“).
 * - **Aufnahme ohne Nummer** (R2-LdF P1-2 alt, LdF P1-2): Ein Eingang ohne
 *   Nachweisungsnummer ging ohne Rückfrage durch; jetzt einmal „Ohne
 *   Nachweisungsnummer aufnehmen?“, außer im Nachtrag (dort steht, was auf
 *   dem Blatt steht).
 * - **Nummernsprung** (R2-LdF P2-7): Nr. 50 statt 6 setzte die Folge
 *   dauerhaft hoch; jetzt fragt die Maske, wenn die Nummer über der nächsten
 *   freien liegt, und nennt die Lücke.
 *
 * Eine Bestätigung gilt nur für den Wert, den sie sah: Die Kennung der Frage
 * enthält ihn, wer ihn ändert, wird neu gefragt.
 */

import { useState } from "react";

import { dtg, zeitAusEingabe, zeitHinweis } from "./nachrichtenformate.js";

export interface Rueckfrage {
  /** Art und Wert, etwa „sprung:50“ — eine neue Eingabe ist eine neue Frage. */
  readonly id: string;
  readonly frage: string;
  /** Der Text des Hauptknopfs, solange die Frage steht. */
  readonly knopf: string;
}

/** Die Rückfrage zur Abfassungszeit; im Nachtrag und bei unlesbarer oder naher Zeit keine (R2-FaBe P2-5). */
export function abfassungsfrage(eingabe: string, nachtrag: boolean, jetzt: Date = new Date()): Rueckfrage | undefined {
  if (nachtrag) return undefined;
  const zeitpunkt = zeitAusEingabe(eingabe, jetzt);
  const hinweis = zeitHinweis(zeitpunkt, jetzt);
  if (zeitpunkt === undefined || hinweis === undefined) return undefined;
  return { id: `abfassung:${zeitpunkt}`, frage: `Die Abfassungszeit ${dtg(zeitpunkt)} ${hinweis.replace(" – bitte prüfen", "")}. Stimmt das?`, knopf: "Zeit stimmt" };
}

/** Die Rückfrage zur Aufnahme ohne Nummer; im Nachtrag keine (R2-LdF P1-2 alt). */
export function ohneNummerFrage(nummer: string, nachtrag: boolean): Rueckfrage | undefined {
  if (nachtrag || nummer.trim() !== "") return undefined;
  return { id: "ohneNummer", frage: "Ohne Nachweisungsnummer aufnehmen? Die Nummer lässt sich später in der Nachweisung nachtragen.", knopf: "Ohne Nummer aufnehmen" };
}

/** Die Rückfrage bei einem Sprung über die nächste freie Nummer (R2-LdF P2-7). */
export function nummernsprungFrage(nummer: number | undefined, naechste: number | undefined): Rueckfrage | undefined {
  if (nummer === undefined || naechste === undefined || nummer <= naechste) return undefined;
  const luecke = nummer - 1 === naechste ? `Nr. ${String(naechste)} bleibt leer` : `Nr. ${String(naechste)} bis ${String(nummer - 1)} bleiben leer`;
  return { id: `sprung:${String(nummer)}`, frage: `${luecke} (die nächste freie ist ${String(naechste)}). Trotzdem Nr. ${String(nummer)}?`, knopf: `Trotzdem Nr. ${String(nummer)}` };
}

export interface Rueckfragen {
  /** Die Frage, die gerade im Fuß steht. */
  readonly sichtbar: Rueckfrage | undefined;
  /**
   * Beim Klick auf den Hauptknopf: wahr, wenn dieser Klick nur eine Frage
   * zeigt oder bestätigt und noch eine weitere offen ist — dann wird nicht geschrieben.
   */
  readonly halteAn: () => boolean;
}

/** Die offenen Fragen nacheinander, je eine mit zweitem Klick. */
export function useRueckfragen(fragen: readonly (Rueckfrage | undefined)[]): Rueckfragen {
  const [gezeigt, setzeGezeigt] = useState<string | undefined>(undefined);
  const [bestaetigt, setzeBestaetigt] = useState<readonly string[]>([]);
  const offen = fragen.filter((f): f is Rueckfrage => f !== undefined && !bestaetigt.includes(f.id));
  const aktuell = offen[0];
  return {
    sichtbar: aktuell !== undefined && aktuell.id === gezeigt ? aktuell : undefined,
    halteAn: () => {
      if (aktuell === undefined) return false;
      if (aktuell.id !== gezeigt) {
        setzeGezeigt(aktuell.id);
        return true;
      }
      setzeBestaetigt([...bestaetigt, aktuell.id]);
      const naechste = offen[1];
      if (naechste === undefined) return false;
      setzeGezeigt(naechste.id);
      return true;
    },
  };
}
