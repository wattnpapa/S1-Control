/**
 * Regressionstest: „⚠ 1 Konflikthinweis“ im frisch angelegten Einsatz
 * (Audits Nachrichten Runde 2: R2-Si P3-6, R2-FM P3-6, dazu der LdF-Durchlauf).
 *
 * Ursache, gefunden an den Ereignissen der Prüfeinsätze: Die Reviewer legten
 * den Einsatz gegen 20:13 an und trugen als Beginn „08:00“ desselben Tages
 * ein. Der Beginn war eine Ist-Zeit mit der Schwelle S1 (zwölf Stunden in
 * beide Richtungen) und erzeugte `meldezeitUnplausibel` an `einsatz/beginn`.
 * Seit FOLD_VERSION 13 darf der Beginn bis zu sieben Tage zurückliegen; nach
 * vorn bleibt die Schwelle.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "./fold.js";
import { einsatzAngelegt, hlc } from "./pruefhilfen/ereignisbau.js";

/** Die Bauhilfe leitet die Wanduhr aus der HLC ab: 08.09.2026 08:00 (Berlin) plus Millisekunden. */
const STUNDE = 3_600_000;

function hinweiseBeiBeginn(beginn: string, angelegtNachMs: number) {
  const anlage = einsatzAngelegt(hlc(angelegtNachMs, 0, "a"), 1, {
    einsatzId: "X",
    name: "Hochwasser",
    art: "EINSATZ",
    fuestName: "FüSt",
    beginn,
    schichtmodell: "ZWEI_SCHICHT",
  });
  return materialisiere(falteHinzu(leereFaltung(), [anlage])).hinweise;
}

describe("Der Einsatzbeginn im frisch angelegten Einsatz", () => {
  it("erzeugt keinen Konflikthinweis, wenn der Einsatz abends mit Beginn am Morgen angelegt wird", () => {
    // Angelegt 08.09. 20:13, Beginn 08.09. 08:00 — zwölf Stunden und dreizehn Minuten zurück.
    expect(hinweiseBeiBeginn("2026-09-08T08:00:00+02:00", 12 * STUNDE + 13 * 60_000)).toEqual([]);
  });

  it("bleibt still bis sieben Tage zurück und meldet erst danach", () => {
    expect(hinweiseBeiBeginn("2026-09-02T08:00:00+02:00", 0)).toEqual([]);
    expect(hinweiseBeiBeginn("2026-08-31T07:00:00+02:00", 0)).toEqual([
      expect.objectContaining({ art: "meldezeitUnplausibel", feldpfad: "einsatz/beginn" }),
    ]);
  });

  it("meldet einen Beginn mehr als zwölf Stunden in der Zukunft weiter", () => {
    expect(hinweiseBeiBeginn("2026-09-08T21:00:00+02:00", 0)).toEqual([
      expect.objectContaining({ art: "meldezeitUnplausibel", feldpfad: "einsatz/beginn", zeitklasse: "IST" }),
    ]);
  });
});
