/**
 * Regressionstests zu den Audits Nachrichten, Runde 2 (2026-11-17), soweit
 * sie in Ring 2 gerechnet werden:
 *
 * - R2-LdF P1-2, R2-Si P1-1: Uhr beim LdF (`wartetSeitLdf`), Vorrang beim LdF
 *   zählt für die Stelle LDF als offen.
 * - R2-Si P1-2: bei zwei Sichtungen beide Vermerke mit Handzeichen.
 * - R2-LdF P1-2 alt: Karte „Ohne Nummer“ mit Eingängen.
 * - R2-ETB P1-1: Stelle des Akteurs — Aufnahme nicht unter der Funktion des
 *   Absenders, Kopien nach Beförderung unter FmZ, auch für ältere Ereignisse.
 * - R2-FaBe P0-2, R2-SGL P3-4: der Vermerk der FmZ in Worten (`fmzVermerkTextAus`).
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc, ldfAus } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { nachrichtenlage, nachrichtNach } from "./nachrichten.js";
import { ohneNummerZeilen } from "./nachrichtenoffen.js";
import { fmzVermerkTextAus } from "./nachrichtenstand.js";
import { alleNachrichtenzeilen, zeilenkontext } from "./nachrichtenzeile.js";
import { vereinigteVermerke } from "./nachrichtenzusatz.js";
import { GRUND_KOPIEN, nachrichtensatz } from "./tagebuch-nachrichten.js";
import { stelleDer } from "./tagebuch-nachrichtenbezug.js";

const BEGINN_MS = Date.parse("2026-09-08T08:00:00+02:00");
let n = 0;
function h(minute: number): ReturnType<typeof hlc> {
  n += 1;
  return hlc(BEGINN_MS + minute * 60000, n, "a");
}
const um = (minute: number): string => new Date(BEGINN_MS + minute * 60000).toISOString();

function eingang(minute: number, id: string, angaben: Record<string, unknown> = {}): EingehendesEreignis {
  return anlageEreignis(h(minute), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: "FüSt",
    absender: "THW OV Brake",
    funktion: "EL",
    betreff: "Deichbruch droht",
    inhalt: "x",
    aufnahme: { mittel: "FUNK", zeitpunkt: um(minute), handzeichen: "Fm" },
    ...angaben,
  });
}

function vermerk(minute: number, typ: string, id: string, neu: unknown, vorher: unknown = null, grund?: string): EingehendesEreignis {
  return feldEreignis(h(minute), n, typ, { nachrichtId: id }, vorher, neu, grund);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  // Der Weg ohne LdF ist hier der Gegenstand; seit FOLD_VERSION 17 muss er ausdrücklich abgeschaltet sein.
  return materialisiere(falteHinzu(leereFaltung(), [ldfAus(), ...ereignisse]));
}

function mitLdf(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(0), n, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" }),
    feldEreignis(h(0), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "ldfStation" }, null, true),
  ];
}

describe("R2-LdF P1-2, R2-Si P1-1: der Eingang beim LdF", () => {
  it("hat eine Uhr ab der Aufnahme und zählt mit Vorrang für den LdF als offen", () => {
    const z = zustand([...mitLdf(), eingang(1, "E1", { vorrang: "BLITZ" })]);
    const zeile = nachrichtNach(z, "E1", um(8));
    expect(zeile).toMatchObject({ laufzustand: "VOR_LDF", laufstand: "beimLdf", wartetSeitLdf: 7, vorLdfSeit: um(1) });
    expect(nachrichtenlage(z, ["LDF"], um(8)).mitVorrangOffen).toBe(1);
    // Nach der Weitergabe läuft die Uhr des Sichters, die des LdF nicht mehr.
    const weiter = zustand([...mitLdf(), eingang(1, "E1", { vorrang: "BLITZ" }), vermerk(9, "NachrichtWeitergegeben", "E1", { zeitpunkt: um(9), handzeichen: "Ld" })]);
    expect(nachrichtNach(weiter, "E1", um(12))?.wartetSeitLdf).toBeUndefined();
  });
});

describe("R2-Si P1-2: zwei Sichtungen", () => {
  it("führen beide Vermerke mit Handzeichen, der ältere zuerst", () => {
    const s1 = { zeitpunkt: um(5), handzeichen: "Si", verteiler: [{ stelle: "S3", kopie: "GRUEN" }], vermerke: "S3 bearbeitet Sandsäcke." };
    const s2 = { zeitpunkt: um(6), handzeichen: "Zw", verteiler: [{ stelle: "S4", kopie: "GRUEN" }], vermerke: "Zw: S4 Sandsäcke liefern." };
    n = 0;
    const z = zustand([
      einsatzAngelegt(h(0), n, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" }),
      eingang(1, "E1"),
      vermerk(5, "NachrichtGesichtet", "E1", s1),
      vermerk(6, "NachrichtGesichtet", "E1", s2),
    ]);
    const zeile = nachrichtNach(z, "E1");
    expect(zeile?.zweiteSichtung).toBeDefined();
    expect(zeile?.vermerke).toBe("Si: S3 bearbeitet Sandsäcke. / Zw: S4 Sandsäcke liefern.");
    expect(vereinigteVermerke(s1, undefined)).toBe("S3 bearbeitet Sandsäcke.");
    expect(vereinigteVermerke(s1, { ...s2, vermerke: s1.vermerke, handzeichen: "Si" })).toBe("Si: S3 bearbeitet Sandsäcke.");
  });
});

describe("R2-LdF P1-2 alt: die Karte „Ohne Nummer“", () => {
  it("führt aufgenommene Eingänge und beförderte Ausgänge ohne Nummer, nach Vorrang", () => {
    n = 0;
    const z = zustand([
      einsatzAngelegt(h(0), n, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" }),
      eingang(1, "E1"),
      eingang(2, "E2", { vorrang: "BLITZ" }),
      anlageEreignis(h(3), n, "NachrichtVerfasst", { nachrichtId: "A1", richtung: "AUSGANG", anschrift: "OV", absender: "S4", betreff: "b", inhalt: "i" }),
      vermerk(4, "NachrichtBefoerdert", "A1", { mittel: "FUNK", zeitpunkt: um(4), handzeichen: "Fm" }),
      anlageEreignis(h(5), n, "NachrichtVerfasst", { nachrichtId: "A2", richtung: "AUSGANG", anschrift: "OV", absender: "S4", betreff: "b", inhalt: "i" }),
    ]);
    const zeilen = alleNachrichtenzeilen(z, zeilenkontext(z));
    expect(ohneNummerZeilen(zeilen).map((x) => x.id)).toEqual(["E2", "E1", "A1"]);
  });
});

describe("R2-ETB P1-1: die Stelle des Akteurs", () => {
  it("nennt bei der Aufnahme nicht die Funktion des Absenders, sondern die Stelle der Sitzung, wo sie steht", () => {
    n = 0;
    expect(stelleDer(eingang(1, "E1"))).toBeUndefined();
    expect(stelleDer(eingang(1, "E1", { stelle: "FMZ" }))).toBe("FMZ");
    const ausgang = anlageEreignis(h(2), n, "NachrichtVerfasst", { nachrichtId: "A1", richtung: "AUSGANG", anschrift: "OV", absender: "S4", funktion: "S4", betreff: "b", inhalt: "i" });
    expect(stelleDer(ausgang)).toBe("S4");
  });

  it("führt die Kopien nach Beförderung unter FmZ — am Grund und bei älteren Ereignissen am Vermerk", () => {
    n = 0;
    const neu = { zeitpunkt: um(3), handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: "ROT" }], vermerke: "Kopien nach Beförderung: rot S2" };
    const mitGrund = vermerk(3, "NachrichtGesichtet", "A1", neu, null, GRUND_KOPIEN);
    const alt = vermerk(3, "NachrichtGesichtet", "A1", neu);
    expect(stelleDer(mitGrund)).toBe("FMZ");
    expect(stelleDer(alt)).toBe("FMZ");
    const z = zustand([]);
    expect(nachrichtensatz(z, alt, "")).toContain("Kopien nach Beförderung (Hz. Fm), verteilt an S2 (rot)");
    // Eine gewöhnliche Sichtung bleibt die des Sichters.
    expect(stelleDer(vermerk(4, "NachrichtGesichtet", "E1", { ...neu, vermerke: "an S3" }))).toBe("SICHTER");
  });
});

describe("R2-FaBe P0-2: der Vermerk der FmZ in Worten", () => {
  const annahme = { zeitpunkt: "2026-11-17T16:10:00.000Z", handzeichen: "Fm" };
  const befoerderung = { mittel: "TELEFON", zeitpunkt: "2026-11-17T16:20:00.000Z", handzeichen: "Ha" };

  it("nennt beim Ausgang die Annahme der FmZ und die Quittung der Gegenstelle", () => {
    expect(fmzVermerkTextAus(undefined, annahme, befoerderung, true)).toBe("angenommen (FmZ) 1710 Fm · Quittung der Gegenstelle 1720 Ha (Telefon)");
  });

  it("sagt ohne Beförderung „noch nicht übermittelt“, auch ganz ohne Vermerk", () => {
    expect(fmzVermerkTextAus(undefined, annahme, undefined, true)).toBe("angenommen (FmZ) 1710 Fm · noch nicht übermittelt");
    expect(fmzVermerkTextAus(undefined, undefined, undefined, true)).toBe("noch nicht übermittelt");
  });

  it("nennt beim Eingang die Aufnahme der FmZ mit dem Mittel und schweigt ohne sie", () => {
    const aufnahme = { mittel: "FUNK", zeitpunkt: "2026-11-17T16:05:00.000Z", handzeichen: "Fm" };
    expect(fmzVermerkTextAus(aufnahme, undefined, undefined)).toBe("aufgenommen (FmZ) 1705 Fm (Funk)");
    expect(fmzVermerkTextAus(undefined, undefined, undefined)).toBeUndefined();
  });
});
