/**
 * Die Sätze, die der Worker zu einem gelungenen Schreiben mitgibt
 * (`Bedienergebnis.warnungen`), mit ihrer Stufe (R2-ETB P3-1).
 *
 * Die Masken der FmZ meldeten jeden Satz als Auskunft („info“), und die
 * verfällt im Hinweiskasten nach zwanzig Sekunden — auch „Nummer 7 ist
 * bereits vergeben“. Der Worker sagt jetzt je Satz, ob er stehen bleiben muss
 * (`warnungStufen`, gleich lang wie `warnungen`, optional gelesen); fehlt die
 * Angabe, gilt die bisherige Stufe der Maske.
 */

import { useLaden } from "./laden.js";

export type Warnstufe = "info" | "warnung";

/** Die Stufe je Satz: die gelieferte, sonst `standard`. */
export function warnstufen(ergebnis: { readonly warnungen?: readonly string[] | undefined }, standard: Warnstufe): readonly { readonly text: string; readonly stufe: Warnstufe }[] {
  const stufen = (ergebnis as { readonly warnungStufen?: readonly unknown[] }).warnungStufen;
  return (ergebnis.warnungen ?? []).map((text, i) => {
    const stufe = stufen?.[i];
    return { text, stufe: stufe === "warnung" || stufe === "info" ? stufe : standard };
  });
}

/** Meldet die Sätze in den Hinweiskasten, jeden in seiner Stufe. */
export function meldeWarnungen(ergebnis: { readonly warnungen?: readonly string[] | undefined }, standard: Warnstufe): void {
  for (const { text, stufe } of warnstufen(ergebnis, standard)) useLaden.getState().melde(stufe, text);
}
