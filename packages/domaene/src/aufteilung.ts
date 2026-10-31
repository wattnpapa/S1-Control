/**
 * Der Vorab-Check für „Einheit aufteilen“ (§5.4.2).
 *
 * Die Wirkung des Aufteilens ist relativ: `abgeteilteStaerke` wird der Quelle
 * abgezogen. Übersteigt der Abzug den Bestand, entstünde Personal aus dem
 * Nichts — die Quelle würde geklemmt (0/0/0 mit Warnzeichen), die neue Einheit
 * trüge die volle Stärke, und die Gesamtsumme wüchse. Die Prüfung steht in der
 * Domäne, damit Maske (Vorab) und Worker (maßgeblich) dieselbe Regel und
 * denselben Wortlaut benutzen.
 */

import type { Staerke } from "./ereignis.js";

export type Aufteilungsbefund =
  | { readonly ok: true }
  | { readonly ok: false; readonly meldung: string; readonly vorhanden: Staerke };

function text(s: Staerke): string {
  return `${String(s.fuehrer)}/${String(s.unterfuehrer)}/${String(s.mannschaft)}`;
}

/**
 * Prüft, ob `abzug` von `quelle` abgespalten werden kann — je Funktion
 * (Führer, Unterführer, Helfer). Abgelehnt wird auch ein Abzug ohne jede
 * Kraft: eine leere Einheit wäre eine Zeile ohne Inhalt.
 */
export function aufteilungPruefen(quelle: Staerke, abzug: Staerke): Aufteilungsbefund {
  const vorhanden: Staerke = {
    fuehrer: Math.max(0, quelle.fuehrer),
    unterfuehrer: Math.max(0, quelle.unterfuehrer),
    mannschaft: Math.max(0, quelle.mannschaft),
  };
  const zuViel =
    abzug.fuehrer > vorhanden.fuehrer ||
    abzug.unterfuehrer > vorhanden.unterfuehrer ||
    abzug.mannschaft > vorhanden.mannschaft;
  if (zuViel) {
    return {
      ok: false,
      vorhanden,
      meldung: `Es sind nur ${text(vorhanden)} (Fü/UFü/He) vorhanden, abgespalten werden sollen ${text(abzug)}.`,
    };
  }
  if (abzug.fuehrer + abzug.unterfuehrer + abzug.mannschaft === 0) {
    return { ok: false, vorhanden, meldung: "Es muss mindestens eine Kraft abgespalten werden." };
  }
  return { ok: true };
}
