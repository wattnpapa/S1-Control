/**
 * Regressionstests zur dritten Behebung der Audits Nachrichten, Runde 2
 * (2026-11-18), soweit sie in Ring 2 gerechnet werden:
 *
 * - R2-FaBe P1-4: die Kopie des eigenen Ausgangs ist für den Verfasser nicht „neu“.
 * - R2-FM P2-5, R2-Si P2-2: Schwelle vor dem Sichter je Vorrang.
 * - R2-LdF P2-1, P2-2, LdF P2-3: Wegmarken der Nachweisungszeile.
 * - R2-ETB P2-4, R2-SGL P2-2: Konflikthinweise an Nachrichten in Worten.
 * - R2-LdF P2-7, R2-ETB P2-2: der Abschlussvermerk beim Beenden.
 * - R2-ETB P2-5, ETB P1-7, FM P2-7: die Tagebuchzeile einer Nachricht.
 * - R2-ETB P2-7: das Handzeichenverzeichnis.
 * - R2-ETB P3-3: der Satz des Zurückziehens.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { handzeichenverzeichnis } from "./handzeichenverzeichnis.js";
import { konflikthinweisText } from "./konflikthinweistext.js";
import { nachrichtenausschnitt, nachrichtenlage, nachrichtNach, posteingangsstand } from "./nachrichten.js";
import { abschlussvermerk } from "./nachrichtenoffen.js";
import { tagebuchbezug, mitTagebuchbezug, zurueckgezogenSatz } from "./nachrichtenzusatz.js";
import { GRUND_KOPIEN, nachrichtensatz } from "./tagebuch-nachrichten.js";

const BEGINN_MS = Date.parse("2026-09-08T08:00:00+02:00");
let n = 0;
function h(minute: number, client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(BEGINN_MS + minute * 60000, n, client);
}
const um = (minute: number): string => new Date(BEGINN_MS + minute * 60000).toISOString();

function anfang(...parameter: readonly [string, unknown][]): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(0), n, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" }),
    ...parameter.map(([feld, wert]) => feldEreignis(h(0), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld }, null, wert)),
  ];
}

function nachricht(minute: number, id: string, angaben: Record<string, unknown> = {}): EingehendesEreignis {
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

function vermerk(minute: number, typ: string, nutzlast: Record<string, unknown>, neu: unknown, vorher: unknown = null, grund?: string): EingehendesEreignis {
  return feldEreignis(h(minute), n, typ, nutzlast, vorher, neu, grund);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

const ausgang = (minute: number, id: string, angaben: Record<string, unknown> = {}): EingehendesEreignis =>
  nachricht(minute, id, { richtung: "AUSGANG", absender: "S4", funktion: "S4", anschrift: "OV Brake", aufnahme: undefined, zeichen: "Ru", ...angaben });

describe("R2-FaBe P1-4: die Kopie des eigenen Ausgangs", () => {
  it("gilt für die Stelle des Verfassers als gelesen, ohne Kenntnisnahme zu behaupten", () => {
    const ereignisse = [
      ...anfang(),
      ausgang(1, "A1", { vorrang: "BLITZ" }),
      vermerk(2, "NachrichtBefoerdert", { nachrichtId: "A1" }, { mittel: "FUNK", zeitpunkt: um(2), handzeichen: "Fm" }),
      vermerk(2, "NachrichtGesichtet", { nachrichtId: "A1", stelle: "FMZ" }, { zeitpunkt: um(2), handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }] }, null, GRUND_KOPIEN),
    ];
    const z = zustand(ereignisse);
    const zeile = nachrichtNach(z, "A1");
    expect(zeile?.verteiler.find((m) => m.stelle === "S4")).toMatchObject({ gelesen: true, eigenerAusgang: true, erledigt: false });
    expect(zeile?.verteiler.find((m) => m.stelle === "S4")?.kenntnis).toBeUndefined();
    // S2 bekommt die rote Kopie weiter als neu.
    expect(zeile?.verteiler.find((m) => m.stelle === "S2")).toMatchObject({ gelesen: false });
    expect(zeile === undefined ? undefined : posteingangsstand(zeile, ["S4"])).toBe("GELESEN");
    expect(nachrichtenlage(z, ["S4"], um(3)).neuFuerStellen).toBe(0);
    expect(nachrichtenlage(z, ["S2"], um(3)).neuFuerStellen).toBe(1);
  });
});

describe("R2-FM P2-5, R2-Si P2-2: Schwelle vor dem Sichter je Vorrang", () => {
  it("Blitz nach 5, Sofort nach 10, einfach nach der Schwelle der FmZ", () => {
    const z = zustand([...anfang(), nachricht(0, "B", { vorrang: "BLITZ" }), nachricht(0, "S", { vorrang: "SOFORT" }), nachricht(0, "E")]);
    const nach = (minute: number, id: string): boolean | undefined => nachrichtNach(z, id, um(minute))?.sichterSchwelleUeberschritten;
    expect([nach(4, "B"), nach(5, "B"), nach(9, "S"), nach(10, "S"), nach(19, "E"), nach(20, "E")]).toEqual([false, true, false, true, false, true]);
    expect(nachrichtenlage(z, ["FMZ"], um(6)).vorSichterUeberSchwelle).toBe(1);
    // Ohne Uhr keine Aussage.
    expect(nachrichtNach(z, "B")?.sichterSchwelleUeberschritten).toBeUndefined();
  });

  it("nimmt die Parameter des Einsatzes, und ein Vorrang wartet nie länger als einfach", () => {
    const z = zustand([...anfang(["sichterSchwelleBlitzMinuten", 2], ["fmzSchwelleMinuten", 3]), nachricht(0, "B", { vorrang: "BLITZ" }), nachricht(0, "S", { vorrang: "SOFORT" })]);
    expect(nachrichtNach(z, "B", um(2))?.sichterSchwelleUeberschritten).toBe(true);
    // Sofort 10 > einfach 3: es gilt 3.
    expect(nachrichtNach(z, "S", um(3))?.sichterSchwelleUeberschritten).toBe(true);
  });
});

describe("R2-LdF P2-1, P2-2, LdF P2-3: Wegmarken", () => {
  it("nennt die Abweichung vom Vorschlag und „Verfasser = Nachweiser“", () => {
    const z = zustand([
      ...anfang(["ldfStation", true]),
      ausgang(1, "A1"),
      vermerk(2, "NachrichtAngenommen", { nachrichtId: "A1" }, { zeitpunkt: um(2), handzeichen: "Fm" }),
      vermerk(3, "NachrichtUebermittlungVorgeschlagen", { nachrichtId: "A1" }, { mittel: "TELEFON", fernmelder: "Fm2", zeitpunkt: um(3), handzeichen: "Ld" }),
      vermerk(4, "NachrichtBefoerdert", { nachrichtId: "A1", abweichungVomVorschlag: "Telefon → Funk" }, { mittel: "FUNK", zeitpunkt: um(4), handzeichen: "Fm" }),
      vermerk(4, "NachrichtNachgewiesen", { nachrichtId: "A1" }, { nummer: 1, zeitpunkt: um(4), handzeichen: "ru" }),
    ]);
    expect(nachrichtNach(z, "A1")).toMatchObject({ abweichungVomVorschlag: "Telefon → Funk", verfasserGleichNachweiser: true });
  });

  it("trägt „ohne Vorschlag des LdF“ aus der Nutzlast der geltenden Beförderung", () => {
    const befoerdert = vermerk(4, "NachrichtBefoerdert", { nachrichtId: "A1", ohneVorschlag: true }, { mittel: "FUNK", zeitpunkt: um(4), handzeichen: "Fm" });
    const ereignisse = [...anfang(["ldfStation", true]), ausgang(1, "A1"), befoerdert];
    const zeilen = mitTagebuchbezug(nachrichtenausschnitt(zustand(ereignisse), { sicht: "nachweisung" }).zeilen, tagebuchbezug(ereignisse));
    expect(zeilen[0]?.ohneVorschlag).toBe(true);
    const satz = nachrichtensatz(zustand(ereignisse), befoerdert, "");
    expect(satz).toContain("befördert (Funk, Hz. Fm), ohne Vorschlag des LdF");
  });
});

describe("R2-ETB P2-4, R2-SGL P2-2: Konflikthinweise in Worten", () => {
  it("nennt bei doppelter Nummer beide Nachrichten, bei zwei Sichtungen beide Sichter und Verteiler", () => {
    const sichtung = (hz: string, minute: number, stellen: readonly string[]) => ({ zeitpunkt: um(minute), handzeichen: hz, verteiler: stellen.map((stelle) => ({ stelle, kopie: "GRUEN" })) });
    const z = zustand([
      ...anfang(),
      nachricht(1, "E1", { betreff: "Pumpen" }),
      ausgang(1, "A1", { betreff: "Sandsäcke" }),
      vermerk(2, "NachrichtNachgewiesen", { nachrichtId: "E1" }, { nummer: 7, zeitpunkt: um(2), handzeichen: "Fm" }),
      vermerk(2, "NachrichtNachgewiesen", { nachrichtId: "A1" }, { nummer: 7, zeitpunkt: um(2), handzeichen: "Fm" }),
      feldEreignis(h(3, "si"), n, "NachrichtGesichtet", { nachrichtId: "E1" }, null, sichtung("Si", 3, ["S2", "S3"])),
      feldEreignis(h(4, "zw"), n, "NachrichtGesichtet", { nachrichtId: "E1" }, null, sichtung("Zw", 4, ["S2", "S4"])),
    ]);
    const zeilen = new Map(nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen.map((zeile) => [zeile.id, zeile]));
    const texte = z.hinweise.map((hinweis) => konflikthinweisText(hinweis, zeilen)).filter((t) => t !== undefined);
    // Geordnet nach Kennung der Nachricht, wie der Hinweis sie führt.
    expect(texte).toContain("Nummer 7 zweimal: A 7 ‚Sandsäcke‘ und E 7 ‚Pumpen‘");
    expect(texte.filter((t) => t?.includes("Sichtung von") === true)).toHaveLength(1);
    expect(texte.some((t) => /^E 7 ‚Pumpen‘: Sichtung von Si \d{4} und Zw \d{4}, Verteiler S2, S3 gegen S2, S4$/u.test(t ?? ""))).toBe(true);
  });
});

describe("R2-LdF P2-7, R2-ETB P2-2: Abschlussvermerk", () => {
  it("nennt offene Nachrichten und fehlende Nummern, schweigt ohne Offenes", () => {
    const leer = { vorFmz: 0, beimLdf: 0, vorSichter: 0, ohneNummer: 0, ungelesenMitVorrang: 0 };
    expect(abschlussvermerk(leer, [])).toBeUndefined();
    expect(abschlussvermerk({ ...leer, vorFmz: 1, ohneNummer: 2, ungelesenMitVorrang: 1 }, [3, 7])).toBe(
      "Einsatz beendet, offene Nachrichten: 1 vor der FmZ, 2 ohne Nummer, 1 mit Vorrang ungelesen; fehlende Nummern: 3, 7",
    );
    expect(abschlussvermerk(leer, [2])).toBe("Einsatz beendet, keine Nachricht offen; fehlende Nummern: 2");
  });
});

describe("R2-ETB P2-5, ETB P1-7, FM P2-7: die Tagebuchzeile", () => {
  it("nennt Vorrang, Mittel und Gegenstelle der Aufnahme, den Vermerk des Sichters und das Handzeichen der Erledigung", () => {
    const anlage = nachricht(1, "E1", { vorrang: "BLITZ", gegenstelle: "Heros Brake 10" });
    const sichtung = vermerk(2, "NachrichtGesichtet", { nachrichtId: "E1" }, { zeitpunkt: um(2), handzeichen: "Si", verteiler: [{ stelle: "S3", kopie: "GRUEN" }], vermerke: "S3 bearbeitet" });
    const erledigt = vermerk(3, "NachrichtErledigt", { nachrichtId: "E1", stelle: "S3", handzeichen: "Mü" }, true);
    const z = zustand([...anfang(), anlage, sichtung, erledigt]);
    expect(nachrichtensatz(z, anlage, "")).toBe("Blitz-Nachricht E aufgenommen (Funk, von Heros Brake 10): THW OV Brake an FüSt, ‚Deichbruch droht‘");
    expect(nachrichtensatz(z, sichtung, "")).toContain("verteilt an S3 (grün), Vermerk „S3 bearbeitet“");
    expect(nachrichtensatz(z, erledigt, "")).toContain("für S3 erledigt (Hz. Mü)");
  });

  it("schreibt die Berichtigung der Aufnahme mit altem und neuem Wert", () => {
    const anlage = nachricht(1, "E1");
    const berichtigt = vermerk(5, "NachrichtAufnahmeBerichtigt", { nachrichtId: "E1" }, { mittel: "TELEFON", zeitpunkt: um(2), handzeichen: "Fm" }, { mittel: "FUNK", zeitpunkt: um(1), handzeichen: "Fm" }, "Zahlendreher");
    const z = zustand([...anfang(), anlage, berichtigt]);
    expect(nachrichtensatz(z, berichtigt, "")).toMatch(/^Nachricht E Aufnahme berichtigt \(Funk \d{4} → Telefon \d{4}, Hz\. Fm\): /u);
    expect(nachrichtNach(z, "E1")?.aufnahme?.mittel).toBe("TELEFON");
  });
});

describe("R2-ETB P2-7: Handzeichenverzeichnis", () => {
  it("führt je Handzeichen Arbeitsplätze, Stellen, ersten und letzten Eintrag", () => {
    const ereignisse = [
      ...anfang(),
      nachricht(1, "E1"),
      vermerk(2, "NachrichtNachgewiesen", { nachrichtId: "E1", stelle: "FMZ" }, { nummer: 1, zeitpunkt: um(2), handzeichen: "Fm" }),
      feldEreignis(h(3, "si"), n, "NachrichtGesichtet", { nachrichtId: "E1", stelle: "SICHTER" }, null, { zeitpunkt: um(3), handzeichen: "Si", verteiler: [] }),
    ];
    const verzeichnis = handzeichenverzeichnis(ereignisse);
    expect(verzeichnis.map((e) => e.handzeichen)).toEqual(["Fm", "Si"]);
    expect(verzeichnis[0]).toMatchObject({ namen: ["Bediener a"], stellen: ["FMZ"], anzahl: 2 });
    expect(verzeichnis[1]).toMatchObject({ namen: ["Bediener si"], stellen: ["SICHTER"], anzahl: 1 });
  });
});

describe("R2-ETB P3-3: der Satz des Zurückziehens", () => {
  it("nennt Zeit, wer und warum", () => {
    expect(zurueckgezogenSatz({ zeitpunkt: "2026-11-17T19:41:00Z", grund: "Fehlanlage", durch: "S3 · Mü" })).toBe("Zurückgezogen 17.11.2026 20:41 von S3 · Mü, Grund: „Fehlanlage“");
    expect(zurueckgezogenSatz({ zeitpunkt: "2026-11-17T19:41:00Z" })).toBe("Zurückgezogen 17.11.2026 20:41");
  });
});

describe("R2-LdF P2-4: die Schwellenzahl getrennt nach LdF und FmZ", () => {
  it("zählt einen Ausgang beim LdF und einen vor der FmZ getrennt, nur mit LdF als Station", () => {
    const ereignisse = [
      ...anfang(["ldfStation", true]),
      ausgang(0, "A1"),
      ausgang(0, "A2"),
      // Seit FOLD_VERSION 15 steht ein Ausgang bis zur Zuteilung beim LdF; A2 ist zugeteilt und liegt vor der FmZ.
      vermerk(0, "NachrichtUebermittlungVorgeschlagen", { nachrichtId: "A2" }, { mittel: "FUNK", fernmelder: "Fm1", zeitpunkt: um(0), handzeichen: "Ld" }),
    ];
    const lage = nachrichtenlage(zustand(ereignisse), ["FMZ"], um(25));
    expect(lage).toMatchObject({ ueberSchwelle: 2, ueberSchwelleLdf: 1, ueberSchwelleFmz: 1 });
    expect(nachrichtenlage(zustand([...anfang(), ausgang(0, "A1")]), ["FMZ"], um(25)).ueberSchwelleLdf).toBeUndefined();
  });
});

