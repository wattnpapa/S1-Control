/**
 * Funktionalität: Befunde der Audits zum 4-fach-Vordruck an der echten
 * Strecke (Aktendienst, Dateisystem, Ruf, Lagebild):
 *
 *  * ETB P0-1: das Tagebuch einer Nachricht über die Kennung, der Ruf
 *    `nachrichtAnfordern`;
 *  * ETB P0-2: Nummernberichtigung und Zurückziehen im Filter „Nur Rücknahmen
 *    und Berichtigungen";
 *  * ETB P0-3: das gedruckte Tagebuch mit Abschlusszeile;
 *  * ETB P1-5: Vordrucke und Nachweisung in der Einsatzakte;
 *  * ETB P1-6: offene Nachrichten im Lagebild für „Einsatz beenden";
 *  * LdF P2-2: Nummernlücken in Band und Nachweisung.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { liesZip } from "@s1/ausgaben";

import { einsatzBeendet } from "../kontrakt/bedienschritte.js";
import { nachrichtNachweisen } from "../kontrakt/fmzschritte.js";
import type { Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtVerfassen, nachrichtZurueckziehen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { EINSATZ_ID, grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(id: string, teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: id,
    richtung: "AUSGANG",
    anschrift: "OV Brake",
    betreff: "Verpflegung 40 Portionen",
    inhalt: "Bitte liefern.",
    absender: "S4",
    zeichen: "Ru",
    abfassungszeit: jetzt(),
    ...teile,
  };
}

const nachweis = (nummer: number) => ({ nummer, zeitpunkt: jetzt(), handzeichen: "Fm" });

async function einsatzMitNachrichten(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  platz.dienst.stellenSetzen(["S4"], "Ru");
  for (const entwurf of [
    nachrichtVerfassen(anlage("N-1")),
    nachrichtNachweisen("N-1", null, nachweis(2)),
    nachrichtNachweisen("N-1", nachweis(2), nachweis(3)),
    nachrichtVerfassen(anlage("N-2", { betreff: "Verpflegung 40 Portionen" })),
    nachrichtZurueckziehen("N-2", "Doppelt aufgegeben"),
    nachrichtVerfassen(anlage("N-3", { richtung: "EINGANG", absender: "Polizei", vorrang: "BLITZ" })),
  ]) {
    expect((await platz.dienst.bediene(entwurf)).art).toBe("geschrieben");
  }
  return platz;
}

function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

describe("Szenario: Nachricht und Tagebuch über die Kennung (ETB P0-1, P0-2)", () => {
  it("filtert das Tagebuch nach der Kennung und nennt die Berichtigung der Nummer", async () => {
    const platz = await einsatzMitNachrichten();
    const zeilen = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nachrichtId: "N-1" }).zeilen;
    expect(zeilen.map((z) => z.satz)).toEqual([
      "Nachricht A 3 Nachweisnummer berichtigt (A 2 → A 3, Hz. Fm): S4 an OV Brake, ‚Verpflegung 40 Portionen‘",
      "Nachricht A 2 (jetzt A 3) nachgewiesen (Hz. Fm): S4 an OV Brake, ‚Verpflegung 40 Portionen‘",
      "Nachricht A (jetzt A 3) aufgegeben: S4 an OV Brake, ‚Verpflegung 40 Portionen‘",
    ]);
    // Die gleichlautende N-2 steht nicht darin — die Textsuche hätte sie gefunden.
    expect(zeilen.every((z) => z.nachrichtId === "N-1")).toBe(true);
  });

  it("schließt Berichtigung und Zurückziehen in „Nur Rücknahmen und Berichtigungen“ ein", async () => {
    const platz = await einsatzMitNachrichten();
    const zeilen = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nurRuecknahmen: true }).zeilen;
    expect(zeilen.map((z) => z.nachrichtId)).toEqual(["N-2", "N-1"]);
    expect(zeilen[0]?.satz).toMatch(/^Nachricht A zurückgezogen, Grund: „Doppelt aufgegeben“ \(abgefasst \d{6}[a-z]{3}\d{2}, Zeichen Ru\)/u);
  });

  it("liefert eine einzelne Nachricht über `nachrichtAnfordern`, sonst null", async () => {
    const platz = await einsatzMitNachrichten();
    expect(platz.dienst.nachricht("N-1")).toMatchObject({ id: "N-1", nummer: 3, laufstand: "vorFmz" });
    expect(platz.dienst.nachricht("N-9")).toBeNull();
    const ansicht = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung", nachrichtId: "N-3" });
    expect(ansicht.zeilen.map((z) => z.id)).toEqual(["N-3"]);
    expect(ansicht.nummernluecken).toEqual([1, 2]);
  });
});

describe("Szenario: Lagebild beim Beenden und Nummernlücken (ETB P1-6, LdF P2-2)", () => {
  it("nennt offene Nachrichten und die fehlenden Nummern", async () => {
    const platz = await einsatzMitNachrichten();
    const bild = lagebild(platz);
    expect(bild.offeneNachrichten).toEqual({ vorFmz: 1, beimLdf: 0, vorSichter: 1, ohneNummer: 1, ungelesenMitVorrang: 0 });
    expect(bild.nachrichten?.nummernluecken).toEqual([1, 2]);
  });
});

describe("Szenario: Einsatzakte und gedrucktes Tagebuch (ETB P0-3, P1-5)", () => {
  it("legt fehlende Vordrucke und die Nachweisung bei und schließt das Tagebuch ab", async () => {
    const platz = await einsatzMitNachrichten();
    expect((await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, jetzt(), "Lage bereinigt"))).art).toBe("geschrieben");
    const akte = await platz.dienst.erzeugeAkte();
    // N-2 ist zurückgezogen: zwei Vordrucke, beide neu.
    expect(akte.nachrichtenbeilagen).toEqual({ erzeugt: 2, vorhanden: 0, fehlgeschlagen: 0 });
    const pfade = liesZip(new Uint8Array(readFileSync(akte.pfad))).map((e) => e.pfad);
    expect(pfade.filter((p) => p.startsWith("ausgaben/nachrichten/") && p.endsWith(".pdf"))).toHaveLength(2);
    expect(pfade.some((p) => /^ausgaben\/nachweisung_.*\.html$/u.test(p))).toBe(true);
    const tagebuch = readdirSync(path.join(platz.share, "ausgaben")).find((name) => name.startsWith("tagebuch_"));
    expect(readFileSync(path.join(platz.share, "ausgaben", tagebuch ?? ""), "utf8")).toMatch(/Einsatztagebuch abgeschlossen \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}, /u);

    // Ein zweites Mal: Die Vordrucke liegen schon und bleiben, wie sie sind.
    expect((await platz.dienst.erzeugeAkte()).nachrichtenbeilagen).toEqual({ erzeugt: 0, vorhanden: 2, fehlgeschlagen: 0 });
  });
});
