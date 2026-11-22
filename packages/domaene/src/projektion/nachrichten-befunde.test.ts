/**
 * Regressionstests zu den Audits des 4-fach-Vordrucks (2026-11-17):
 * ETB P0-1/P0-2 (Tagebuch und Nachricht), LdF P0-2 (Schwelle ab Eintreffen),
 * SGL P0-1 (Stand „befördert", „ohne Nummer"), SGL P1-7 (offen je Stelle),
 * LdF P2-2 (Nummernlücken), ETB P1-6 (offene Nachrichten beim Beenden),
 * Sichter-Audit (Sicht „gesichtet").
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { nachrichtenausschnitt, nachrichtenlage, nachrichtNach } from "./nachrichten.js";
import { nummernluecken, nummernlueckenText, offeneNachrichten } from "./nachrichtenoffen.js";
import { alleNachrichtenzeilen, zeilenkontext } from "./nachrichtenzeile.js";
import { tagebuchausschnitt } from "./tagebuch.js";

const BEGINN_MS = Date.parse("2026-09-08T08:00:00+02:00");
let n = 0;
/** HLC in Minuten ab 08:00: `minute` ist die Wanduhr des schreibenden Rechners. */
function h(minute: number, client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(BEGINN_MS + minute * 60000, n, client);
}
const um = (minute: number): string => new Date(BEGINN_MS + minute * 60000).toISOString();

function verfasst(minute: number, id: string, angaben: Record<string, unknown> = {}, client = "a"): EingehendesEreignis {
  return anlageEreignis(h(minute, client), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "AUSGANG",
    anschrift: "OV Brake",
    absender: "S4",
    funktion: "S4",
    zeichen: "Ru",
    betreff: "Verpflegung 40 Portionen",
    inhalt: "Bitte liefern.",
    abfassungszeit: um(minute),
    ...angaben,
  });
}

function vermerk(minute: number, typ: string, id: string, neu: unknown, vorher: unknown = null, extra: Record<string, unknown> = {}): EingehendesEreignis {
  return feldEreignis(h(minute), n, typ, { nachrichtId: id, ...extra }, vorher, neu);
}

const zeit = (minute: number, hz = "Fm"): { zeitpunkt: string; handzeichen: string } => ({ zeitpunkt: um(minute), handzeichen: hz });
const verteiler = (...stellen: [string, string][]): { stelle: string; kopie: string }[] => stellen.map(([stelle, kopie]) => ({ stelle, kopie }));

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function einsatz(): EingehendesEreignis {
  n = 0;
  return einsatzAngelegt(h(0), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" });
}

describe("LdF P0-2: die Schwelle läuft ab dem Eintreffen bei der FmZ", () => {
  it("ein Blitz ohne Annahme zählt nach 25 Minuten, mit Wartezeit in der Zeile", () => {
    const z = zustand([einsatz(), verfasst(1, "A1", { vorrang: "BLITZ" })]);
    const zeile = nachrichtenausschnitt(z, { sicht: "fmz", jetzt: um(26) }).zeilen[0];
    expect(zeile).toMatchObject({ id: "A1", fmzUeberSchwelle: true, wartetSeit: 25, laufstand: "vorFmz" });
    expect(nachrichtenlage(z, ["FMZ"], um(26)).ueberSchwelle).toBe(1);
    expect(nachrichtenausschnitt(z, { sicht: "fmz", jetzt: um(15) }).zeilen[0]).toMatchObject({ fmzUeberSchwelle: false, wartetSeit: 14 });
  });

  it("eine vom Papier nacherfasste, frühere Annahme zählt ab der Annahme; nach der Beförderung keine Wartezeit", () => {
    const basis = [einsatz(), verfasst(30, "A1"), vermerk(30, "NachrichtAngenommen", "A1", zeit(5))];
    expect(nachrichtenausschnitt(zustand(basis), { sicht: "fmz", jetzt: um(31) }).zeilen[0]).toMatchObject({ fmzUeberSchwelle: true, wartetSeit: 26 });
    const befoerdert = zustand([...basis, vermerk(32, "NachrichtBefoerdert", "A1", { mittel: "FUNK", ...zeit(32) })]);
    const zeile = nachrichtNach(befoerdert, "A1", um(60));
    expect(zeile?.fmzUeberSchwelle).toBe(false);
    expect(zeile?.wartetSeit).toBeUndefined();
  });
});

describe("SGL P0-1: Stand und Vermerk der FmZ in der Zeile", () => {
  it("unterscheidet vor der FmZ, angenommen, befördert ohne Nummer, verteilt und erledigt", () => {
    const basis = [einsatz(), verfasst(1, "A1")];
    const stand = (ereignisse: EingehendesEreignis[]) => nachrichtNach(zustand(ereignisse), "A1");
    expect(stand(basis)).toMatchObject({ laufstand: "vorFmz", ohneNummer: false });
    const angenommen = [...basis, vermerk(2, "NachrichtAngenommen", "A1", zeit(2))];
    expect(stand(angenommen)).toMatchObject({ laufstand: "angenommen", laufzustand: "VOR_FMZ" });
    const befoerdert = [...angenommen, vermerk(3, "NachrichtBefoerdert", "A1", { mittel: "FUNK", ...zeit(3) })];
    // Der Laufzustand des Folds bleibt ERLEDIGT, die Zeile sagt „befördert" mit der Marke „ohne Nummer".
    expect(stand(befoerdert)).toMatchObject({ laufzustand: "ERLEDIGT", laufstand: "befoerdert", ohneNummer: true });
    expect(stand(befoerdert)?.fmzVermerkText).toMatch(/^angenommen \(FmZ\) \d{4} Fm · Quittung der Gegenstelle \d{4} Fm \(Funk\)$/);
    const kopien = [...befoerdert, vermerk(4, "NachrichtGesichtet", "A1", { ...zeit(4), verteiler: verteiler(["S2", "ROT"], ["S4", "GRUEN"]) })];
    expect(stand(kopien)).toMatchObject({ laufstand: "verteilt", ohneNummer: true });
    const alleErledigt = [
      ...kopien,
      vermerk(5, "NachrichtErledigt", "A1", true, null, { stelle: "S2" }),
      vermerk(5, "NachrichtErledigt", "A1", true, null, { stelle: "S4" }),
    ];
    // Ohne Nummer nie „erledigt".
    expect(stand(alleErledigt)).toMatchObject({ laufzustand: "ERLEDIGT", laufstand: "verteilt", ohneNummer: true });
    const nummeriert = [...alleErledigt, vermerk(6, "NachrichtNachgewiesen", "A1", { nummer: 1, ...zeit(6) })];
    expect(stand(nummeriert)).toMatchObject({ laufstand: "erledigt", ohneNummer: false, nummer: 1 });
  });
});

describe("SGL P1-7 und Sichter-Audit: offen je Stelle, Sicht „offen“ und „gesichtet“", () => {
  function lage(): EingehendesEreignis[] {
    return [
      einsatz(),
      verfasst(1, "E1", { richtung: "EINGANG", absender: "EA Nord", funktion: undefined, vorrang: "SOFORT" }),
      vermerk(2, "NachrichtGesichtet", "E1", { ...zeit(2, "Si"), verteiler: verteiler(["S3", "GRUEN"], ["S2", "ROT"]) }),
      vermerk(3, "NachrichtErledigt", "E1", true, null, { stelle: "S3" }),
      verfasst(4, "E2", { richtung: "EINGANG", absender: "Polizei", funktion: undefined, vorrang: "BLITZ" }),
      verfasst(5, "A1", { absender: "S3", funktion: "S3", vorrang: "SOFORT" }, "b"),
    ];
  }

  it("zählt mit Vorrang offen nur, was für die Stellen der Sitzung unerledigt ist", () => {
    const z = zustand(lage());
    expect(nachrichtenlage(z, ["S3"]).mitVorrangOffen).toBe(1); // nur der eigene Ausgang A 1
    expect(nachrichtenlage(z, ["S2"]).mitVorrangOffen).toBe(1); // E 1, rote Kopie
    expect(nachrichtenlage(z, ["SICHTER"]).mitVorrangOffen).toBe(1); // der Blitz vor dem Sichter
    // FmZ: A 1 in der Warteschlange und E 1, verteilt ohne Nummer (die Nachweisung fehlt).
    expect(nachrichtenlage(z, ["FMZ"]).mitVorrangOffen).toBe(2);
    expect(nachrichtenlage(z, ["FMZ"], undefined, { sichterBesetzt: false }).mitVorrangOffen).toBe(3);
    expect(nachrichtenlage(z, []).mitVorrangOffen).toBe(3);
  });

  it("Sicht „offen“: nach Vorrang und Alter; Sicht „gesichtet“: neueste zuerst, „meine Sichtungen“", () => {
    const ids = (anfrage: Parameters<typeof nachrichtenausschnitt>[1]): string[] => nachrichtenausschnitt(zustand(lage()), anfrage).zeilen.map((z) => z.id);
    expect(ids({ sicht: "offen", stellen: ["S2", "S3"] })).toEqual(["E1", "A1"]);
    expect(ids({ sicht: "offen", stellen: ["SICHTER", "S2"] })).toEqual(["E2", "E1"]);
    expect(ids({ sicht: "gesichtet" })).toEqual(["E1"]);
    expect(ids({ sicht: "gesichtet", nurEigeneSichtungen: true, handzeichen: "si" })).toEqual(["E1"]);
    expect(ids({ sicht: "gesichtet", nurEigeneSichtungen: true, handzeichen: "Xy", clientId: "c" })).toEqual([]);
    expect(ids({ sicht: "nachweisung", nachrichtId: "E2" })).toEqual(["E2"]);
  });
});

describe("LdF P2-2 und ETB P1-6: Nummernlücken und offene Nachrichten", () => {
  it("nennt die fehlenden Nummern und fasst Folgen zusammen", () => {
    expect(nummernluecken([{ nummer: 1 }, { nummer: 4 }, { nummer: 8 }, {}])).toEqual([2, 3, 5, 6, 7]);
    expect(nummernlueckenText([2, 3, 5, 6, 7])).toBe("2, 3, 5–7");
    expect(nummernlueckenText([])).toBe("lückenlos");
    expect(nummernluecken([{ nummer: 5000 }], 10)).toHaveLength(10);
  });

  it("zählt vor der FmZ, beim Sichter, ohne Nummer und ungelesen mit Vorrang", () => {
    const z = zustand([
      einsatz(),
      verfasst(1, "A1"),
      verfasst(2, "E1", { richtung: "EINGANG", vorrang: "BLITZ" }),
      vermerk(3, "NachrichtGesichtet", "E1", { ...zeit(3, "Si"), verteiler: verteiler(["S2", "ROT"]) }),
      verfasst(4, "E2", { richtung: "EINGANG" }),
      verfasst(5, "A2"),
      feldEreignis(h(6), n, "NachrichtZurueckgezogen", { nachrichtId: "A2" }, null, true, "doppelt"),
    ]);
    const zeilen = alleNachrichtenzeilen(z, zeilenkontext(z));
    expect(offeneNachrichten(zeilen)).toEqual({ vorFmz: 1, beimLdf: 0, beimLdfNachBefoerderung: 0, vorSichter: 1, ohneNummer: 2, ungelesenMitVorrang: 1 });
  });
});

describe("ETB P0-1 und P0-2: die Nachricht im Tagebuch", () => {
  function berichtigt(): EingehendesEreignis[] {
    return [
      einsatz(),
      verfasst(1, "E", { richtung: "EINGANG", absender: "Polizei", funktion: undefined, betreff: "Deichlage Brake", aufnahme: { mittel: "FUNK", ...zeit(1) } }),
      vermerk(1, "NachrichtNachgewiesen", "E", { nummer: 2, ...zeit(1) }),
      vermerk(2, "NachrichtNachgewiesen", "E", { nummer: 3, ...zeit(2) }, { nummer: 2, ...zeit(1) }),
      vermerk(3, "NachrichtGesichtet", "E", { ...zeit(3, "Si"), verteiler: verteiler(["S2", "ROT"]) }),
      vermerk(4, "NachrichtGesichtet", "E", { ...zeit(4, "Si"), verteiler: verteiler(["S2", "ROT"], ["S4", "GRUEN"]) }, { ...zeit(3, "Si"), verteiler: verteiler(["S2", "ROT"]) }),
      verfasst(5, "A"),
      feldEreignis(h(6), n, "NachrichtZurueckgezogen", { nachrichtId: "A" }, null, true, "Doppelt aufgegeben"),
      anlageEreignis(h(7), n, "EtbEintragErfasst", { etbId: "T1", zeitpunkt: um(7), text: "Rückruf Polizei", bezug: { entitaet: "NACHRICHT", id: "E" } }),
    ];
  }

  it("trägt Kennung, Nummer zur Zeit des Ereignisses und Handzeichen; filtert nach der Kennung", () => {
    const ereignisse = berichtigt();
    const z = zustand(ereignisse);
    const zeilen = tagebuchausschnitt(z, ereignisse, { nachrichtId: "E" }).zeilen;
    expect(zeilen.map((x) => x.satz)).toEqual([
      "Tagebucheintrag: Rückruf Polizei",
      "Nachricht E 3 nachgesichtet (zweite Sichtung, Hz. Si), verteilt an S2 (rot), S4 (grün): Polizei an OV Brake, ‚Deichlage Brake‘",
      "Nachricht E 3 gesichtet (Hz. Si), verteilt an S2 (rot): Polizei an OV Brake, ‚Deichlage Brake‘",
      "Nachricht E 3 Nachweisnummer berichtigt (E 2 → E 3, Hz. Fm): Polizei an OV Brake, ‚Deichlage Brake‘",
      "Nachricht E 2 (jetzt E 3) nachgewiesen (Hz. Fm): Polizei an OV Brake, ‚Deichlage Brake‘",
      "Nachricht E (jetzt E 3) aufgenommen (Funk): Polizei an OV Brake, ‚Deichlage Brake‘",
    ]);
    expect(zeilen.map((x) => x.nachrichtNummer)).toEqual(["E 3", "E 3", "E 3", "E 3", "E 2", "E"]);
    expect(zeilen.every((x) => x.nachrichtId === "E")).toBe(true);
    expect(zeilen[5]?.handzeichen).toBe("Fm");
  });

  it("„Nur Rücknahmen und Berichtigungen“ schließt Nummernberichtigung, Nachsichtung und Zurückziehen ein", () => {
    const ereignisse = berichtigt();
    const zeilen = tagebuchausschnitt(zustand(ereignisse), ereignisse, { nurRuecknahmen: true }).zeilen;
    expect(zeilen.map((x) => x.satz)).toEqual([
      expect.stringMatching(/^Nachricht A zurückgezogen, Grund: „Doppelt aufgegeben“ \(abgefasst \d{6}[a-z]{3}\d{2}, Zeichen Ru\): S4 an OV Brake/),
      expect.stringMatching(/^Nachricht E 3 nachgesichtet/),
      expect.stringMatching(/^Nachricht E 3 Nachweisnummer berichtigt/),
    ]);
    expect(zeilen.every((x) => x.berichtigung === true)).toBe(true);
  });
});
