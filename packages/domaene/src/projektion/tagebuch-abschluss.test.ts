/**
 * Die Tagebuchsätze zum Abschluss des Einsatzes (§5.2).
 *
 * Beenden, Wiedereröffnen und Archivieren sind die Zeilen, die nach einem
 * Einsatz am häufigsten nachgeschlagen werden — „wann war Schluss, und wer
 * hat ihn wieder aufgemacht?". Sie nennen deshalb den Einsatz beim Namen und
 * das Ende als Uhrzeit, nicht als Kennung und ISO-Zeichenkette.
 */

import { describe, expect, it } from "vitest";

import { zeitpunktText } from "../beschriftungen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import { tagebuchzeile } from "./tagebuch.js";

const EINSATZ = einsatzAngelegt(hlc(1, 0, "a"), 1, {
  einsatzId: "E1",
  name: "Hochwasser Weser",
  art: "EINSATZ",
  fuestName: "FüSt Varel",
  beginn: "2026-10-30T06:00:00+01:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const ENDE = "2026-10-30T18:00:00+01:00";

function satz(...weitere: EingehendesEreignis[]): string {
  const alle = [EINSATZ, ...weitere];
  const zustand = materialisiere(falteHinzu(leereFaltung(), alle));
  return tagebuchzeile(zustand, alle[alle.length - 1] as EingehendesEreignis).satz;
}

describe("Das Tagebuch zum Abschluss des Einsatzes", () => {
  it("schreibt das Ende als Uhrzeit", () => {
    const ende = feldEreignis(hlc(2, 0, "a"), 2, "EinsatzBeendet", { einsatzId: "E1" }, null, ENDE, "Lage bereinigt");
    expect(satz(ende)).toBe(`Hochwasser Weser: Einsatz beendet: (leer) → ${zeitpunktText(ENDE)}`);
  });

  it("nennt beim Wiedereröffnen das aufgehobene Ende", () => {
    const ende = feldEreignis(hlc(2, 0, "a"), 2, "EinsatzBeendet", { einsatzId: "E1" }, null, ENDE);
    const auf = feldEreignis(hlc(3, 0, "a"), 3, "EinsatzWiedereroeffnet", { einsatzId: "E1" }, ENDE, null);
    expect(satz(ende, auf)).toBe(`Hochwasser Weser: Einsatz wiedereröffnet: ${zeitpunktText(ENDE)} → (leer)`);
  });

  it("nennt bei der Archivierung den Einsatz und nicht die Kennung", () => {
    const archiv = anlageEreignis(hlc(4, 0, "a"), 4, "EinsatzArchiviert", {
      einsatzId: "E1",
      zeitpunkt: ENDE,
      snapshotHash: "a".repeat(64),
    });
    expect(satz(archiv)).toBe("Hochwasser Weser: Einsatz archiviert");
  });
});
