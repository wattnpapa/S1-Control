/**
 * Regressionstests zum zweiten Durchlauf der Nachrichten-Audits:
 *  * Wartezeit: Spalte „Wartet“ und Band rechnen aus einer Quelle
 *    (`wartezeitMinuten`), eine 25 Minuten alte Nachricht zeigt 25.
 *  * Sichter P1-4: Wartezeit vor dem Sichter und `vorSichterUeberSchwelle`.
 *  * ETB P1-2, P1-3: ETB-Nummer und Grund des Zurückziehens aus den Ereignissen.
 *  * Nachweisung: Mittel „(vorgeschlagen)“, Zeitraum und Schichtfilter (LdF P2-5).
 *  * ETB P1-7: Stelle und Handzeichen im Akteur der Tagebuchzeile.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { nachrichtenausschnitt, nachrichtenlage, nachrichtNach } from "./nachrichten.js";
import {
  mitTagebuchbezug,
  nachweisungImZeitraum,
  nachweisungsmittel,
  nachweisungszeitraum,
  tagebuchbezug,
  wartezeitMinuten,
  wartezeitVorSichterMinuten,
} from "./nachrichtenzusatz.js";
import { tagebuchausschnitt } from "./tagebuch.js";
import { akteurText } from "./tagebuch-nachrichtenbezug.js";

const BEGINN_MS = Date.parse("2026-09-08T08:00:00+02:00");
let n = 0;
function h(minute: number, client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(BEGINN_MS + minute * 60000, n, client);
}
const um = (minute: number): string => new Date(BEGINN_MS + minute * 60000).toISOString();

function verfasst(minute: number, id: string, angaben: Record<string, unknown> = {}): EingehendesEreignis {
  return anlageEreignis(h(minute), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "AUSGANG",
    anschrift: "OV Brake",
    absender: "S4",
    funktion: "S4",
    zeichen: "Ru",
    betreff: "Verpflegung",
    inhalt: "Bitte liefern.",
    abfassungszeit: um(minute),
    ...angaben,
  });
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function einsatz(): EingehendesEreignis {
  n = 0;
  return einsatzAngelegt(h(0), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" });
}

describe("Wartezeit: eine Rechnung für Spalte und Band", () => {
  it("eine 25 Minuten alte Nachricht wartet 25 Minuten, in Zeile, Zustand und Band", () => {
    const z = zustand([einsatz(), verfasst(1, "A1")]);
    const jetzt = um(26);
    const zeile = nachrichtenausschnitt(z, { sicht: "fmz", jetzt }).zeilen[0];
    expect(zeile?.wartetSeit).toBe(25);
    expect(zeile?.eintreffenBeiFmz).toBe(um(1));
    expect(zeile?.fmzUeberSchwelle).toBe(true);
    // Die Zeile trägt den Zeitpunkt: Auch eine zum Abruf ohne Uhr geholte Zeile rechnet später richtig.
    const ohneUhr = nachrichtenausschnitt(z, { sicht: "fmz" }).zeilen[0];
    expect(ohneUhr?.wartetSeit).toBeUndefined();
    expect(ohneUhr === undefined ? undefined : wartezeitMinuten(ohneUhr, jetzt)).toBe(25);
    const n1 = z.nachrichten?.["A1"];
    expect(n1 === undefined ? undefined : wartezeitMinuten(n1, jetzt)).toBe(25);
    const lage = nachrichtenlage(z, ["FMZ"], jetzt);
    expect(lage).toMatchObject({ ueberSchwelle: 1, gerechnetUm: jetzt });
  });

  it("Spalte und Band kippen in derselben Minute", () => {
    const z = zustand([einsatz(), verfasst(1, "A1")]);
    for (const minute of [20, 21, 22]) {
      const jetzt = um(minute);
      const zeile = nachrichtenausschnitt(z, { sicht: "fmz", jetzt }).zeilen[0];
      const ueber = (zeile?.wartetSeit ?? 0) >= 20;
      expect(zeile?.fmzUeberSchwelle).toBe(ueber);
      expect(nachrichtenlage(z, ["FMZ"], jetzt).ueberSchwelle).toBe(ueber ? 1 : 0);
    }
  });
});

describe("Sichter P1-4: Eingänge vor dem Sichter", () => {
  it("zählt Eingänge über der Schwelle vor dem Sichter und trägt die Wartezeit in der Zeile", () => {
    const z = zustand([einsatz(), verfasst(1, "E1", { richtung: "EINGANG", absender: "Polizei", funktion: undefined }), verfasst(15, "E2", { richtung: "EINGANG", absender: "EA", funktion: undefined })]);
    const jetzt = um(25);
    const zeilen = nachrichtenausschnitt(z, { sicht: "sichter", jetzt }).zeilen;
    expect(zeilen.map((zeile) => [zeile.id, zeile.wartetSeitSichter])).toEqual([["E1", 24], ["E2", 10]]);
    expect(zeilen[0]?.vorSichterSeit).toBe(um(1));
    expect(nachrichtenlage(z, ["FMZ"], jetzt).vorSichterUeberSchwelle).toBe(1);
    const e1 = z.nachrichten?.["E1"];
    expect(e1 === undefined ? undefined : wartezeitVorSichterMinuten(e1, jetzt)).toBe(24);
  });
});

describe("ETB P1-2, P1-3: ETB-Nummer und Grund aus den Ereignissen", () => {
  it("die ETB-Nummer ist die laufende Nummer der Anlage im Tagebuch, der Grund steht an der Zeile", () => {
    const ereignisse = [einsatz(), verfasst(1, "A1"), verfasst(2, "A2"), feldEreignis(h(3), n, "NachrichtZurueckgezogen", { nachrichtId: "A1" }, null, true, "Doppelt aufgegeben")];
    const z = zustand(ereignisse);
    const zeilen = mitTagebuchbezug(nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen, tagebuchbezug(ereignisse));
    const a1 = zeilen.find((zeile) => zeile.id === "A1");
    expect(a1?.etbNummer).toBe(2);
    expect(zeilen.find((zeile) => zeile.id === "A2")?.etbNummer).toBe(3);
    expect(a1?.zurueckgezogenMit).toMatchObject({ grund: "Doppelt aufgegeben" });
    // Dieselbe Zählung wie das gedruckte Tagebuch: älteste zuerst, ab 1.
    const tagebuch = [...tagebuchausschnitt(z, ereignisse).zeilen].reverse();
    expect(tagebuch[1]?.nachrichtId).toBe("A1");
    // Ohne Ereignisse (Ring 2) steht Zeit, kein Grund.
    expect(nachrichtNach(z, "A1")?.zurueckgezogenMit?.grund).toBeUndefined();
    expect(nachrichtNach(z, "A1")?.zurueckgezogenMit?.zeitpunkt).toEqual(expect.any(String));
  });
});

describe("Nachweisung: Mittel, Zeitraum, Schicht", () => {
  it("zeigt bei nur vorgeschlagenem Weg das Mittel mit „(vorgeschlagen)“", () => {
    const vorschlag = { mittel: "TELEFON", fernmelder: "Fm1", zeitpunkt: um(2), handzeichen: "Lf" };
    expect(nachweisungsmittel({ vorschlag })).toBe("Telefon (vorgeschlagen)");
    expect(nachweisungsmittel({ vorschlag, befoerderung: { mittel: "FUNK", zeitpunkt: um(3), handzeichen: "Fm" } })).toBe("Funk");
    expect(nachweisungsmittel({})).toBeUndefined();
  });

  it("nennt den Zeitraum und filtert eine Schicht", () => {
    const z = zustand([einsatz(), verfasst(1, "A1"), verfasst(30, "A2"), verfasst(90, "A3")]);
    const zeilen = nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen;
    expect(nachweisungszeitraum(zeilen)).toEqual({ von: um(1), bis: um(90) });
    expect(nachweisungImZeitraum(zeilen, um(10), um(60)).map((zeile) => zeile.id)).toEqual(["A2"]);
    expect(nachweisungImZeitraum(zeilen, um(10)).map((zeile) => zeile.id)).toEqual(["A2", "A3"]);
  });
});

describe("ETB P1-7: Akteur mit Stelle und Handzeichen", () => {
  it("nimmt Stelle und Handzeichen aus dem Ereignis, sonst den Anzeigenamen", () => {
    const ereignisse = [einsatz(), verfasst(1, "A1")];
    const zeilen = tagebuchausschnitt(zustand(ereignisse), ereignisse).zeilen;
    const aufgegeben = zeilen.find((zeile) => zeile.typ === "NachrichtVerfasst");
    expect(aufgegeben).toMatchObject({ stelle: "S4", handzeichen: "Ru" });
    expect(aufgegeben === undefined ? "" : akteurText(aufgegeben)).toBe("S4 · Ru");
    const anlage = zeilen.find((zeile) => zeile.typ === "EinsatzAngelegt");
    expect(anlage === undefined ? "" : akteurText(anlage)).toBe(anlage?.akteur);
    expect(akteurText({ akteur: "Arbeitsplatz", stelle: "SICHTER", handzeichen: "Si" })).toBe("Sichter · Si");
  });
});
