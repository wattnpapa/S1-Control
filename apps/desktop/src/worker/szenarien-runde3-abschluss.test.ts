/**
 * Funktionalität: Nachrichten, dritte Behebung der Audits Runde 2 —
 * Abschluss, Akte, Lagebild und die Bausteine des Workers.
 *
 * - R2-LdF P2-7, R2-ETB P2-2: Abschlussvermerk und Abschlusszeile mit Stelle.
 * - R2-ETB P2-1: ältere Stände in `ausgaben/fruehere/`, Stempel der
 *   zurückgezogenen Nachricht; R2-ETB P2-7: Handzeichenverzeichnis.
 * - R2-ETB P2-4, R2-SGL P2-2: Konflikthinweise mit Satz im Lagebild.
 * - R2-ETB P3-2: Programmfassung im Druckkopf.
 * - R2-FM P2-5, R2-Si P2-2: säumiger Sichter (Ersatzregel ohne Rückfrage).
 * - R2-LdF P3-3, P3-4, LdF P1-2: Fernmelder aus der Präsenz, „LdF nicht
 *   besetzt“, `naechsteNummer` auch für Sichter und LdF.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { liesZip } from "@s1/ausgaben";
import { projektion } from "@s1/domaene";

import { einsatzBeendet } from "../kontrakt/bedienschritte.js";
import { nachrichtAnnehmen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtenParameterSetzen } from "../kontrakt/fmzschritte.js";
import type { Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtSichten, nachrichtVerfassen, nachrichtZurueckziehen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { TEXT_VORBEHALT_SICHTER } from "../kontrakt/stellenvorbehalt.js";
import { fernmelderwahlAusPraesenz } from "./nachrichtendienst.js";
import { nachtragswarnungen } from "./nachtragspruefung.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz, ohneLdf } from "./pruefhilfen/werkstatt.js";
import { sichterSaeumig } from "./sitzungsangaben.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return { nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück.", absender: "S3", funktion: "S3", abfassungszeit: jetzt(), ...teile };
}

const eingang = (teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage =>
  anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "THW OV Brake", anschrift: "FüSt", funktion: "EL", aufnahme: { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }, ...teile });

function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

describe("R2-LdF P2-7, R2-ETB P2-2: Einsatz beenden", () => {
  it("Szenario: offene Nachrichten stehen im Tagebuch, die Abschlusszeile nennt Stelle und Handzeichen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await ohneLdf(platz); // der Weg ohne LdF (seit FOLD_VERSION 17 ausdrücklich)
    platz.dienst.stellenSetzen(["S1"], "Mü");
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    expect((await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, jetzt()))).art).toBe("geschrieben");
    const zeilen = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen;
    const vermerk = zeilen.find((z) => z.typ === "EtbEintragErfasst");
    expect(vermerk?.satz).toBe("Tagebucheintrag: Einsatz beendet, offene Nachrichten: 1 vor der FmZ");
    expect(vermerk).toMatchObject({ stelle: "S1", handzeichen: "Mü" });
    const ende = zeilen.find((z) => z.typ === "EinsatzBeendet");
    expect(ende === undefined ? "" : projektion.akteurText(ende)).toBe("S1 · Mü");
    // Der Vermerk steht vor dem Ende — nach dem Ende nähme der Einsatz nichts mehr an.
    expect((vermerk?.laufendeNummer ?? 0) < (ende?.laufendeNummer ?? 0)).toBe(true);
    const html = platz.dienst.ausgabeHtml("tagebuch").html;
    expect(html).toMatch(/Einsatztagebuch abgeschlossen \d{2}\.\d{2}\.\d{4} \d{2}:\d{2}, S1 · Mü/u);
    // R2-ETB P3-2: die Programmfassung statt der Kernfassung.
    expect(html).toContain('<p class="kern">S1-Control 0.0.0-test</p>');
  });
});

describe("R2-ETB P2-1, P2-7: Einsatzakte", () => {
  it("Szenario: zwei Stände des Tagebuchs — der ältere liegt unter fruehere/, dazu Stempel und Handzeichenverzeichnis", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(eingang()));
    await platz.dienst.bediene(nachrichtZurueckziehen("E-1", "Fehlanlage"));
    const ausgaben = path.join(platz.share, "ausgaben");
    const { writeFileSync, mkdirSync } = await import("node:fs");
    mkdirSync(ausgaben, { recursive: true });
    writeFileSync(path.join(ausgaben, "tagebuch_2000-01-01_0800.html"), "alt");
    const akte = await platz.dienst.erzeugeAkte();
    expect(akte.nachrichtenbeilagen).toMatchObject({ gestempelt: 1, handzeichenverzeichnis: true });
    const pfade = liesZip(new Uint8Array(readFileSync(akte.pfad))).map((e) => e.pfad);
    expect(pfade).toContain("ausgaben/fruehere/tagebuch_2000-01-01_0800.html");
    expect(pfade.filter((p) => /^ausgaben\/tagebuch_/u.test(p))).toHaveLength(1);
    expect(pfade.some((p) => /^ausgaben\/handzeichen_.*\.html$/u.test(p))).toBe(true);
    // Auf dem Share bleibt jede Datei, wo sie ist.
    expect(readdirSync(ausgaben)).toContain("tagebuch_2000-01-01_0800.html");
  });
});

describe("R2-ETB P2-4, R2-SGL P2-2: Konflikthinweise im Lagebild", () => {
  it("Szenario: doppelte Nummer — der Hinweis nennt beide Nachrichten", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    const nachweis = { nummer: 5, zeitpunkt: jetzt(), handzeichen: "Fm" };
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis }));
    await platz.dienst.bediene(nachrichtAufnehmen(anlage(), { nachweis, nachtrag: true }));
    const hinweis = lagebild(platz).konflikthinweise?.find((h) => h.art === "nachweisnummerDoppelt");
    expect(hinweis?.text).toBe("Nummer 5 zweimal: A 5 ‚Sandsäcke‘ und E 5 ‚Sandsäcke‘");
  });
});

describe("R2-FM P2-5, R2-Si P2-2: säumiger, aber besetzter Sichter", () => {
  it("Szenario: über der Schwelle sichtet die FmZ ohne Rückfrage, vorher mit", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(eingang({ vorrang: "BLITZ" })));
    const sichten = nachrichtSichten("E-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm", verteiler: [{ stelle: "S3", kopie: "GRUEN" }] });
    // Vor der Schwelle: der Vorbehalt des Sichters gilt.
    expect(await a.dienst.bediene(sichten)).toMatchObject({ art: "brauchtGrund", hinweis: TEXT_VORBEHALT_SICHTER });
    // Die Uhr des Workers sechs Minuten später: Blitz über 5 Minuten.
    expect(sichterSaeumig(a.dienst.zustand, sichten, Date.now() + 6 * 60_000)).toBe(true);
    expect(sichterSaeumig(a.dienst.zustand, sichten, Date.now() + 60_000)).toBe(false);
    const zeile = projektion.nachrichtNach(a.dienst.zustand, "E-1", new Date(Date.now() + 6 * 60_000).toISOString());
    expect(zeile?.sichterSchwelleUeberschritten).toBe(true);
  });

  it("Szenario: die Schwellen sind Parameter des Einsatzes und stehen in den Stammdaten", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, "sichterSchwelleBlitzMinuten", null, 3);
    if (entwurf === undefined) throw new Error("kein Entwurf");
    expect((await platz.dienst.bediene(entwurf)).art).toBe("geschrieben");
    expect((await platz.dienst.bediene({ ...entwurf, neu: 0, vorher: 3 })).art).toBe("abgewiesen");
    expect(lagebild(platz).stammdaten?.sichterSchwelleBlitzMinuten).toBe(3);
  });
});

describe("R2-LdF P3-3, P3-4, LdF P1-2: Angaben der Nachrichtenansicht", () => {
  it("Szenario: Fernmelder aus der Präsenz, „LdF nicht besetzt“ und die nächste Nummer in jeder Sicht", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["FMZ", "SICHTER"], "Ha");
    await takteBis([a, b]);
    const ldf = nachrichtenParameterSetzen(EINSATZ_ID, "ldfStation", null, true);
    if (ldf === undefined) throw new Error("kein Entwurf");
    await a.dienst.bediene(ldf);
    await a.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 9, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    // Ein angenommener Ausgang ohne Vorschlag liegt beim LdF — und keiner ist besetzt.
    await a.dienst.bediene(nachrichtVerfassen(anlage()));
    await a.dienst.bediene(nachrichtAnnehmen("A-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const fmz = a.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "ldf" });
    // Seit 2026-11-21: Fm1 bis Fm3 zuerst, die Plätze mit dem Altwert FMZ mit Anzeigenamen dahinter.
    expect(fmz.fernmelder).toEqual(["Fm1", "Fm2", "Fm3", "Arbeitsplatz 1", "Arbeitsplatz 2"]);
    expect(fmz.zeilen[0]).toMatchObject({ laufzustand: "VOR_LDF", ldfNichtBesetzt: true });
    for (const sicht of ["sichter", "ldf"] as const) expect(a.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht }).naechsteNummer).toBe(10);
    expect(fernmelderwahlAusPraesenz(["S3"], "Ich", [{ veraltet: true, anzeigename: "Alt", stellen: ["FMZ"] }])).toEqual({ fernmelder: ["Fm1", "Fm2", "Fm3"], besetzung: {} });
  });
});

describe("R2-LdF P3-2: Akteur des Ersatzvorschlags", () => {
  it("Szenario: ohne LdF gilt die Beförderung als Vorschlag — im Tagebuch unter FmZ, nicht „LdF · Fm“", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    const ldf = nachrichtenParameterSetzen(EINSATZ_ID, "ldfStation", null, true);
    if (ldf === undefined) throw new Error("kein Entwurf");
    await platz.dienst.bediene(ldf);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const zeile = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nachrichtId: "A-1" }).zeilen.find((z) => z.typ === "NachrichtUebermittlungVorgeschlagen");
    expect(zeile === undefined ? "" : projektion.akteurText(zeile)).toBe("FmZ · Fm");
  });
});

describe("R2-ETB P2-6, R2-Si P2-1: Bezug und Ersatzsichtung an der Zeile", () => {
  it("Szenario: Anschrift mit Bezug auf einen Abschnitt; die FmZ sichtet ohne Sichter — die Zeile sagt beides", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    const bezug = { entitaet: "ABSCHNITT" as const, id: "EA-1" };
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ anschriftBezug: bezug, absenderBezug: { entitaet: "STELLE", id: "S3" } })));
    await platz.dienst.bediene(nachrichtVerfassen(eingang()));
    await platz.dienst.bediene(nachrichtSichten("E-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm", verteiler: [{ stelle: "S3", kopie: "GRUEN" }] }));
    const zeilen = new Map(platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen.map((z) => [z.id, z]));
    expect(zeilen.get("A-1")).toMatchObject({ anschriftBezug: bezug, absenderBezug: { entitaet: "STELLE", id: "S3" } });
    expect(zeilen.get("E-1")?.ersatzsichtung).toBe(true);
    expect(zeilen.get("A-1")?.ersatzsichtung).toBeUndefined();
  });
});

describe("R2-SGL P2-1: nachtragswarnungen", () => {
  it("prüft Abfassung ≤ Aufnahme/Annahme ≤ Beförderung ≤ jetzt", () => {
    const t = (min: number) => new Date(Date.UTC(2026, 10, 17, 19, min)).toISOString();
    expect(nachtragswarnungen({ abfassungszeit: t(0), annahme: t(5), befoerderung: { zeitpunkt: t(10) } }, Date.UTC(2026, 10, 17, 20))).toEqual([]);
    expect(nachtragswarnungen({ abfassungszeit: t(10), annahme: t(5) }, Date.UTC(2026, 10, 17, 20))[0]).toMatch(/^Nachtrag: Annahme \(\d{4}\) liegt vor der Abfassung/u);
  });
});

describe("Fernmelder als eigene Stellen (2026-11-21)", () => {
  it("die Wahl nennt Fm1 bis Fm3 mit den Plätzen, die sie besetzen; veraltete zählen nicht", () => {
    const wahl = fernmelderwahlAusPraesenz(["FM2"], "Meyer", [
      { veraltet: false, anzeigename: "Schulz", stellen: ["FM1", "S6"] },
      { veraltet: false, anzeigename: "Kaya", stellen: ["FM2"] },
      { veraltet: true, anzeigename: "Alt", stellen: ["FM3"] },
      { veraltet: false, anzeigename: "Altclient", stellen: ["FMZ"] },
    ]);
    expect(wahl.fernmelder).toEqual(["Fm1", "Fm2", "Fm3", "Altclient"]);
    expect(wahl.besetzung).toEqual({ Fm1: "Schulz", Fm2: "Meyer, Kaya" });
  });
});
