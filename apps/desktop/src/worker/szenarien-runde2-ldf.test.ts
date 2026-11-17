/**
 * Funktionalität: Nachrichten, Audits Runde 2 — der LdF als Station, zwei
 * Sichtungen und die Nummernfolge.
 *
 * - R2-Si P1-1, R2-LdF P1-2: Ein Eingang mit Vorrang beim LdF meldet sich dem
 *   LdF (bei Blitz mit Ton), zählt bei ihm „mit Vorrang offen“, die Zeile hat
 *   eine Uhr (`wartetSeitLdf`), der Stauwächter kennt VOR_LDF.
 * - R2-LdF P1-3: Ohne Sichter, aber mit besetztem LdF sichtet der LdF beim
 *   Weitergeben, nicht die FmZ beim Aufnehmen.
 * - R2-Si P1-2: Bei zwei Sichtungen gelten beide Vermerke, und der zweite
 *   Sichter erfährt den des ersten.
 * - R2-LdF P2-7, R2-ETB P2-2: Die Sicht Nachweisung bekommt die Nummernlücken.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import { falteHinzu, leereFaltung, materialisiere } from "../../../../packages/domaene/src/fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../../../../packages/domaene/src/pruefhilfen/ereignisbau.js";
import type { Bedienergebnis, Mitteilung } from "../kontrakt/index.js";
import { nachrichtAufnehmen, nachrichtenParameterSetzen, nachrichtNachweisen } from "../kontrakt/fmzschritte.js";
import { nachrichtWeitergeben } from "../kontrakt/ldfschritte.js";
import { nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { HINWEIS_LDF_SICHTET, HINWEIS_LDF_VERTEILT, HINWEIS_WEITERGABE_OHNE_SICHTER } from "./nachrichtenfolgen.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";
import { Sichterstauwaechter, ldfstauText } from "./sichterstau.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function eingang(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "E-1",
    richtung: "EINGANG",
    anschrift: "FüSt",
    betreff: "Brücke gesperrt",
    inhalt: "Brücke Hunte gesperrt.",
    absender: "Polizei",
    abfassungszeit: jetzt(),
    aufnahme: { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" },
    ...teile,
  };
}

const laufzettel = (hz: string, vermerke?: string, stelle = "S3") => ({ zeitpunkt: jetzt(), handzeichen: hz, verteiler: [{ stelle, kopie: "GRUEN" }], ...(vermerke === undefined ? {} : { vermerke }) });
const warnungen = (e: Bedienergebnis): readonly string[] => (e.art === "geschrieben" ? (e.warnungen ?? []) : []);

function zeile(platz: Platz, id: string) {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen.find((z) => z.id === id);
}

async function ldfStation(platz: Platz): Promise<void> {
  const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, "ldfStation", null, true);
  if (entwurf === undefined) throw new Error("kein Entwurf");
  await platz.dienst.bediene(entwurf);
}

function hinweistexte(platz: Platz): readonly Extract<Mitteilung, { art: "hinweis" }>[] {
  return platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "hinweis" }> => m.art === "hinweis");
}

describe("Vorrang beim LdF (R2-Si P1-1, R2-LdF P1-2)", () => {
  it("Szenario: ein Blitz-Eingang beim LdF meldet sich dem LdF mit Ton, zählt als offen und hat eine Uhr", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    b.dienst.stellenSetzen(["LDF"], "Lf");
    await ldfStation(a);
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtAufnehmen(eingang({ vorrang: "BLITZ" }), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    await takteBis([a, b]);
    expect(hinweistexte(b).filter((h) => h.text.includes("-Nachricht"))).toEqual([
      { art: "hinweis", akteId: "akte-2", stufe: "warnung", text: "Blitz-Nachricht E 1 für LdF: Brücke gesperrt", ton: "blitz" },
    ]);
    b.dienst.sendeVollenStand();
    const stand = b.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
    expect(stand?.voll?.nachrichten?.mitVorrangOffen).toBe(1);
    const z = zeile(b, "E-1");
    expect(z).toMatchObject({ laufzustand: "VOR_LDF", wartetSeitLdf: 0 });
    expect(typeof z?.vorLdfSeit).toBe("string");
  });

  it("Szenario: der Stauwächter meldet einen Eingang, der die Schwelle lang beim LdF liegt — ab der Aufnahme", () => {
    const ereignisse = [
      einsatzAngelegt(hlc(1, 0, "a"), 1, { einsatzId: "X", name: "H", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
      feldEreignis(hlc(2, 0, "a"), 2, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "ldfStation" }, null, true),
      anlageEreignis(hlc(1000, 0, "a"), 3, "NachrichtVerfasst", { nachrichtId: "E1", richtung: "EINGANG", anschrift: "FüSt", absender: "Polizei", betreff: "Brücke", inhalt: "x", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-09-08T08:00:00+02:00", handzeichen: "Fm" } }),
    ];
    const zustand = materialisiere(falteHinzu(leereFaltung(), ereignisse));
    const waechter = new Sichterstauwaechter();
    const lage = { zustand, stellen: ["SICHTER"], sichterBesetzt: true };
    expect(waechter.pruefe({ ...lage, jetztMs: 1000 + 5 * 60_000 })).toBeUndefined();
    // Der Wächter rechnet auf die volle Minute abgerundet (wie das Lagebild): 20 ganze Minuten.
    expect(waechter.pruefe({ ...lage, jetztMs: 1000 + 21 * 60_000 })).toBe(ldfstauText(1, 20));
    // Je Nachricht einmal.
    expect(waechter.pruefe({ ...lage, jetztMs: 1000 + 22 * 60_000 })).toBeUndefined();
  });
});

describe("Ersatzsichter-Reihenfolge mit LdF (R2-LdF P1-3)", () => {
  it("Szenario: ohne Sichter sichtet der LdF beim Weitergeben, nicht die FmZ beim Aufnehmen", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["LDF"], "Lf");
    await ldfStation(a);
    await takteBis([a, b]);
    // Die Maske der FmZ schickt ohne Sichter einen Laufzettel mit; der Worker lässt ihn dem LdF.
    const aufgenommen = await a.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" }, sichtung: laufzettel("Fm") }));
    expect(warnungen(aufgenommen)).toContain(HINWEIS_LDF_SICHTET);
    expect(zeile(a, "E-1")).toMatchObject({ laufzustand: "VOR_LDF" });
    expect(zeile(a, "E-1")?.sichtung).toBeUndefined();

    await takteBis([a, b]);
    const weiter = await b.dienst.bediene(nachrichtWeitergeben("E-1", null, { zeitpunkt: jetzt(), handzeichen: "Lf" }, laufzettel("Lf")));
    expect(warnungen(weiter)).toContain(HINWEIS_LDF_VERTEILT);
    expect(zeile(b, "E-1")).toMatchObject({ laufzustand: "VERTEILT", sichtung: { handzeichen: "Lf" } });
    const tagebuch = b.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nachrichtId: "E-1" }).zeilen;
    expect(tagebuch.find((z) => z.typ === "NachrichtGesichtet")).toMatchObject({ grund: projektion.GRUND_ERSATZSICHTER, stelle: "LDF" });
  });

  it("Szenario: Weitergabe ohne Laufzettel und ohne Sichter sagt, dass der Eingang wartet", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["LDF", "FMZ"], "Lf");
    await ldfStation(platz);
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Lf" } }));
    const weiter = await platz.dienst.bediene(nachrichtWeitergeben("E-1", null, { zeitpunkt: jetzt(), handzeichen: "Lf" }));
    expect(warnungen(weiter)).toContain(HINWEIS_WEITERGABE_OHNE_SICHTER);
    expect(zeile(platz, "E-1")?.laufzustand).toBe("VOR_SICHTER");
  });
});

describe("Zwei Sichtungen (R2-Si P1-2)", () => {
  it("Szenario: beide Vermerke gelten mit Handzeichen, und der zweite Sichter erfährt den ersten", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["SICHTER"], "Si");
    b.dienst.stellenSetzen(["SICHTER"], "Zw");
    await a.dienst.bediene(nachrichtVerfassen(eingang({ aufnahme: undefined })));
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtSichten("E-1", null, laufzettel("Si", "S3 bearbeitet Sandsäcke.")));
    await takteBis([a, b]);
    // Zw hatte den Laufzettel ohne Kenntnis der ersten Sichtung offen (Vorher-Wert leer).
    const zweite = await b.dienst.bediene(nachrichtSichten("E-1", null, laufzettel("Zw", "S4 Sandsäcke liefern.", "S4")));
    expect(warnungen(zweite).join(" ")).toContain("Vermerk von Si: „S3 bearbeitet Sandsäcke.“");
    await takteBis([a, b]);
    expect(zeile(a, "E-1")?.vermerke).toBe("Si: S3 bearbeitet Sandsäcke. / Zw: S4 Sandsäcke liefern.");
  });
});

describe("Nummernlücken am Bildschirm (R2-LdF P2-7, R2-ETB P2-2)", () => {
  it("Szenario: die Sicht Nachweisung bekommt die fehlenden Nummern", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    await platz.dienst.bediene(nachrichtVerfassen(eingang({ nachrichtId: "E-2" })));
    await platz.dienst.bediene(nachrichtNachweisen("E-2", null, { nummer: 4, zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const nachweisung = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" });
    expect(nachweisung.nummernluecken).toEqual([2, 3]);
    expect(nachweisung.zeilen.map((z) => z.nummer)).toEqual([1, 4]);
  });
});
