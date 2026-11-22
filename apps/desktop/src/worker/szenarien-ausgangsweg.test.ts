/**
 * Funktionalität: der Weg eines Ausgangs mit LdF als Station — die
 * Absicherungen aus dem Rollen-Review vom 2026-11-21.
 *
 * Abschalten der Station mit offenen Ausgängen, der hängende Ausgang beim
 * fehlenden LdF, Nachweis vor der Weitergabe ohne Überschreiben einer
 * vergebenen Nummer, die Ersatzsichtung des LdF und die Uhr vor dem Sichter.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import { nachrichtBefoerdern, nachrichtenParameterSetzen, nachrichtNachweisen, nachrichtVorschlagen } from "../kontrakt/fmzschritte.js";
import { nachrichtNachweisenUndWeitergeben, nachrichtWeitergeben } from "../kontrakt/ldfschritte.js";
import { nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();
const BEFOERDERUNG = { mittel: "FUNK", zeitpunkt: "2026-11-21T10:05:00.000Z", handzeichen: "Ka", gegenstelle: "OV Wildeshausen" };

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return { nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück.", absender: "S4", funktion: "S4", abfassungszeit: jetzt(), ...teile };
}

function zeile(platz: Platz, id = "A-1") {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen.find((z) => z.id === id);
}

async function setze(platz: Platz, feld: "ldfStation" | "sichtungAuchAusgang", wert: boolean, vorher: boolean | null = null): Promise<void> {
  const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, feld, vorher, wert);
  if (entwurf === undefined) throw new Error("kein Entwurf");
  expect((await platz.dienst.bediene(entwurf)).art).toBe("geschrieben");
}

/** Aufgegeben, an Fm1 zugeteilt, befördert — mit LdF in der Präsenz liegt der Ausgang danach beim LdF. */
async function befoerdertBeimLdf(a: Platz, b: Platz): Promise<void> {
  await grundlage(a);
  a.dienst.stellenSetzen(["FM1"], "Ka");
  b.dienst.stellenSetzen(["LDF", "SICHTER"], "Lf");
  await setze(a, "ldfStation", true);
  await takteBis([a, b]);
  await a.dienst.bediene(nachrichtVerfassen(anlage()));
  await takteBis([a, b]);
  await b.dienst.bediene(nachrichtVorschlagen("A-1", null, { mittel: "FUNK", fernmelder: "Fm1", zeitpunkt: jetzt(), handzeichen: "Lf" }));
  await takteBis([a, b]);
  await a.dienst.bediene(nachrichtBefoerdern("A-1", null, BEFOERDERUNG));
  await takteBis([a, b]);
  expect(zeile(b)?.laufzustand).toBe("VOR_LDF");
}

describe("Funktionalität: Ausgangsweg mit LdF — Absicherungen (Review 2026-11-21)", () => {
  it("Szenario: Abschalten der Station schreibt die Kopien für den beförderten Ausgang beim LdF nach", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await befoerdertBeimLdf(a, b);
    await setze(b, "ldfStation", false, true);
    const z = zeile(b);
    expect(z?.laufzustand).toBe("VERTEILT");
    expect(z?.verteiler.map((m) => [m.stelle, m.kopie])).toEqual(expect.arrayContaining([["S2", "ROT"], ["S4", "GRUEN"]]));
  });

  it("Szenario: Geht der LdF nach der Beförderung, gibt ein Fernmelder den Ausgang selbst weiter", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await befoerdertBeimLdf(a, b);
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b]);
    const schlange = a.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "fmz" });
    expect(schlange.zeilen.map((z) => [z.id, projektion.ldfSchrittDer(z)])).toEqual([["A-1", "weitergabe"]]);
    expect((await a.dienst.bediene(nachrichtNachweisenUndWeitergeben("A-1", { nummer: 3, zeitpunkt: jetzt(), handzeichen: "Ka" }, { zeitpunkt: jetzt(), handzeichen: "Ka" }))).art).toBe("geschrieben");
    expect(zeile(a)).toMatchObject({ laufzustand: "VOR_SICHTER", nummer: 3 });
  });

  it("Szenario: Der LdF weist nach und gibt weiter — die Nummer steht vor der Weitergabe, eine vergebene wird nicht überschrieben", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await befoerdertBeimLdf(a, b);
    // Inzwischen weist der Fernmelder selbst nach.
    await a.dienst.bediene(nachrichtNachweisen("A-1", null, { nummer: 6, zeitpunkt: jetzt(), handzeichen: "Ka" }));
    await takteBis([a, b]);
    const abgewiesen = await b.dienst.bediene(nachrichtNachweisenUndWeitergeben("A-1", { nummer: 7, zeitpunkt: jetzt(), handzeichen: "Lf" }, { zeitpunkt: jetzt(), handzeichen: "Lf" }));
    expect(abgewiesen.art).not.toBe("geschrieben");
    expect(zeile(b)).toMatchObject({ nummer: 6, laufzustand: "VOR_LDF" });
    // Mit Nummer gibt der LdF nur weiter.
    expect((await b.dienst.bediene(nachrichtWeitergeben("A-1", null, { zeitpunkt: jetzt(), handzeichen: "Lf" }))).art).toBe("geschrieben");
    expect(zeile(b)?.laufzustand).toBe("VOR_SICHTER");
  });

  it("Szenario: Der Ausgang vor dem Sichter hat eine Uhr; der LdF ohne Sichter verteilt als Ersatzsichter", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["LDF", "FM1"], "Lf");
    await setze(platz, "ldfStation", true);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtVorschlagen("A-1", null, { mittel: "FUNK", fernmelder: "Fm1", zeitpunkt: jetzt(), handzeichen: "Lf" }));
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, BEFOERDERUNG));
    const ergebnis = await platz.dienst.bediene(nachrichtNachweisenUndWeitergeben("A-1", { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Lf" }, { zeitpunkt: jetzt(), handzeichen: "Lf" }));
    const warnungen = ergebnis.art === "geschrieben" ? ergebnis.warnungen ?? [] : [];
    expect(warnungen.some((w) => w.startsWith("Kein Sichter besetzt: Der LdF hat S2 rot und den Verfasser grün verteilt."))).toBe(true);
    const z = zeile(platz);
    expect(z?.laufzustand).toBe("VERTEILT");
    // Das Tagebuch steht neueste zuerst: Die Weitergabe ist jünger als der Nachweis.
    const texte = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen.map((t) => t.satz);
    expect(texte.some((t) => t.includes("als Ersatzsichter gesichtet"))).toBe(true);
    expect(texte.findIndex((t) => t.includes("an den Sichter weitergegeben"))).toBeLessThan(texte.findIndex((t) => t.includes("nachgewiesen")));
  });

  it("Szenario: Mit „Ausgänge zum Sichter“ läuft der beförderte Ausgang wie bisher direkt zum Sichter", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FM1"], "Ka");
    await setze(platz, "ldfStation", true);
    await setze(platz, "sichtungAuchAusgang", true);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, BEFOERDERUNG));
    const z = zeile(platz);
    expect(z?.laufzustand).toBe("VOR_SICHTER");
    const sichter = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "sichter" });
    expect(sichter.zeilen[0]?.wartetSeitSichter).toBeTypeOf("number");
  });
});
