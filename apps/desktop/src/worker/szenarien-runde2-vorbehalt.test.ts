/**
 * Funktionalität: Nachrichten, Audits Runde 2 — Besetzung, Stellenvorbehalt,
 * Stelle im Tagebuch und der Konflikthinweis im frischen Einsatz.
 *
 * - R2-FaBe P0-3: Hinweis beim Aufgeben, wenn die FmZ nicht besetzt ist;
 *   `Lagebild.besetzteStellen`; Gesprächsnotiz ohne Sichter.
 * - R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2: Sichten, Aufnehmen und
 *   Papier-Nachtrag ohne die Stelle verlangen einen `grund` (`brauchtGrund`);
 *   die Ersatzregel trägt `GRUND_ERSATZSICHTER`.
 * - R2-ETB P1-1, R2-LdF P3-2: Stelle der Sitzung in der Nutzlast, Kopien nach
 *   Beförderung als FmZ, Nachtrag „vom Papier nachgetragen durch …“.
 * - R2-ETB P1-2: laufende Nummer und Nachrichtennummer an der Tagebuchzeile.
 * - Konflikthinweis im frischen Einsatz (R2-Si P3-6, R2-FM P3-6).
 *
 * Durch den echten Aktendienst auf echtem Dateisystem.
 */

import { afterEach, describe, expect, it } from "vitest";

import { KOSTEN_VORBELEGUNG, projektion } from "@s1/domaene";

import type { Bedienergebnis, Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtAufnehmen, nachrichtBefoerdern } from "../kontrakt/fmzschritte.js";
import { nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { TEXT_VORBEHALT_SICHTER, vorbehaltsgrund } from "../kontrakt/stellenvorbehalt.js";
import { HINWEIS_EINGANG_OHNE_NUMMER, HINWEIS_FMZ_NICHT_BESETZT, HINWEIS_NOTIZ_OHNE_SICHTER } from "./nachrichtenfolgen.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return { nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück.", absender: "S3", funktion: "S3", abfassungszeit: jetzt(), ...teile };
}

function eingang(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "THW OV Brake", anschrift: "FüSt", funktion: "EL", aufnahme: { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }, ...teile });
}

const sichtung = (hz = "Si", vermerke?: string) => ({ zeitpunkt: jetzt(), handzeichen: hz, verteiler: [{ stelle: "S3", kopie: "GRUEN" }], ...(vermerke === undefined ? {} : { vermerke }) });

function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

const warnungen = (e: Bedienergebnis): readonly string[] => (e.art === "geschrieben" ? (e.warnungen ?? []) : []);

function tagebuch(platz: Platz, nachrichtId: string) {
  return platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nachrichtId }).zeilen;
}

describe("Besetzung und Hinweis beim Aufgeben (R2-FaBe P0-3)", () => {
  it("Szenario: ohne FmZ in der Präsenz sagt das Aufgeben, dass die Nachricht wartet; das Lagebild nennt die besetzten Stellen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S3"], "Mü");
    const ergebnis = await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    expect(warnungen(ergebnis)).toContain(HINWEIS_FMZ_NICHT_BESETZT);
    expect(lagebild(platz).besetzteStellen).toEqual(["S3"]);
  });

  it("Szenario: mit FmZ an einem anderen Platz kein Hinweis; die Stellen beider stehen im Lagebild", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["S3"], "Mü");
    b.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    await takteBis([a, b]);
    expect(warnungen(await a.dienst.bediene(nachrichtVerfassen(anlage())))).not.toContain(HINWEIS_FMZ_NICHT_BESETZT);
    expect(lagebild(a).besetzteStellen).toEqual(["FMZ", "S3", "SICHTER"]);
  });

  it("Szenario: eine Gesprächsnotiz „An den Sichter“ ohne Sichter sagt, dass sie wartet", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S3"], "Mü");
    const notiz = await platz.dienst.bediene(nachrichtVerfassen(anlage({ richtung: "EINGANG", gespraechsnotiz: true })));
    expect(warnungen(notiz)).toEqual([HINWEIS_NOTIZ_OHNE_SICHTER]);
  });
});

describe("Stellenvorbehalt als grund-Pflicht (R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2)", () => {
  it("Szenario: der Fachberater sichtet — erst mit Grund, und das Tagebuch nennt ihn", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FACHBERATER"], "Mka");
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b]);
    await b.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "RTW 12" })));
    await takteBis([a, b]);
    const ohne = await a.dienst.bediene(nachrichtSichten("E-1", null, sichtung("Mka")));
    expect(ohne).toEqual({ art: "brauchtGrund", zielArt: "NachrichtGesichtet", stelle: "SICHTER", hinweis: TEXT_VORBEHALT_SICHTER });
    const grund = vorbehaltsgrund({ stelle: "SICHTER" }, ["FACHBERATER"]);
    expect(grund).toBe("Eintrag durch Fachberater, nicht Sichter");
    expect((await a.dienst.bediene({ ...nachrichtSichten("E-1", null, sichtung("Mka")), grund })).art).toBe("geschrieben");
    const zeile = tagebuch(a, "E-1").find((z) => z.typ === "NachrichtGesichtet");
    expect(zeile).toMatchObject({ grund, stelle: "FACHBERATER" });
  });

  it("Szenario: Eingang aufnehmen und Papier-Nachtrag ohne FmZ verlangen einen Grund", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S4"], "Ru");
    expect(await platz.dienst.bediene(nachrichtVerfassen(eingang()))).toMatchObject({ art: "brauchtGrund", zielArt: "NachrichtVerfasst", stelle: "FMZ" });
    const nachtrag = nachrichtAufnehmen(anlage({ funktion: "S4" }), { annahme: { zeitpunkt: jetzt(), handzeichen: "Fm" }, nachtrag: true });
    expect(await platz.dienst.bediene(nachtrag)).toMatchObject({ art: "brauchtGrund", stelle: "FMZ" });
    // Ein Ausgang ohne Werte der FmZ ist frei: Aufgeben ist Sache jeder Stelle.
    expect((await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "A-2" })))).art).toBe("geschrieben");
  });

  it("Szenario: die FmZ sichtet ohne Sichter selbst — ohne Rückfrage, als Ersatzsichter im Tagebuch", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    // „Ich sichte jetzt selbst“: ein eigener Schritt nach dem Aufnehmen.
    expect((await platz.dienst.bediene(nachrichtSichten("E-1", null, sichtung("Fm")))).art).toBe("geschrieben");
    const zeile = tagebuch(platz, "E-1").find((z) => z.typ === "NachrichtGesichtet");
    expect(zeile).toMatchObject({ grund: projektion.GRUND_ERSATZSICHTER, stelle: "FMZ" });
    expect(zeile?.satz).toContain("als Ersatzsichter gesichtet");
  });
});

describe("Stelle des Akteurs im Tagebuch (R2-ETB P1-1, R2-LdF P3-2, R2-SGL P3-4)", () => {
  it("Szenario: die Aufnahme steht unter FmZ, nicht unter der Funktion des Absenders; ohne Nummer warnt sie", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    const ergebnis = await platz.dienst.bediene(nachrichtVerfassen(eingang()));
    expect(warnungen(ergebnis)).toContain(HINWEIS_EINGANG_OHNE_NUMMER);
    const zeile = tagebuch(platz, "E-1").find((z) => z.typ === "NachrichtVerfasst");
    expect(zeile?.stelle).toBe("FMZ");
    expect(projektion.akteurText(zeile ?? { akteur: "" })).toBe("FmZ · Fm");
    // R2-LdF P1-2 alt: Die Karte „Ohne Nummer“ der FmZ führt auch den Eingang.
    const fmz = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "fmz" });
    expect(fmz.ohneNummer?.map((z) => z.id)).toEqual(["E-1"]);
  });

  it("Szenario: die Kopien nach der Beförderung heißen so und stehen unter FmZ · Fm", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const kopien = tagebuch(platz, "A-1").find((z) => z.typ === "NachrichtGesichtet");
    expect(kopien?.satz).toContain("Kopien nach Beförderung (Hz. Fm), verteilt an S2 (rot), S3 (grün)");
    expect(kopien?.satz).not.toContain("gesichtet");
    expect(projektion.akteurText(kopien ?? { akteur: "" })).toBe("FmZ · Fm");
  });

  it("Szenario: der Papier-Nachtrag sagt „vom Papier nachgetragen durch FmZ“ an jeder Zeile", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Ha");
    const blatt = "2026-11-17T08:05:00.000Z";
    const entwurf = nachrichtAufnehmen(anlage(), {
      annahme: { zeitpunkt: blatt, handzeichen: "Fm" },
      befoerderung: { mittel: "FUNK", zeitpunkt: blatt, handzeichen: "Fm" },
      nachweis: { nummer: 7, zeitpunkt: blatt, handzeichen: "Fm" },
      nachtrag: true,
    });
    expect(entwurf.nachrichtenfolge?.nachtrag).toBe(true);
    expect((await platz.dienst.bediene(entwurf)).art).toBe("geschrieben");
    const zeilen = tagebuch(platz, "A-1");
    for (const typ of ["NachrichtVerfasst", "NachrichtAngenommen", "NachrichtNachgewiesen", "NachrichtBefoerdert"]) {
      expect(zeilen.find((z) => z.typ === typ)?.satz).toContain("vom Papier nachgetragen durch FmZ");
    }
    expect(zeilen.find((z) => z.typ === "NachrichtGesichtet")?.satz).toContain("Kopien nach Beförderung");
  });

  it("Szenario: jede Zeile trägt die laufende Nummer wie im Druck und die Nummer der Nachricht (R2-ETB P1-2)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "SICHTER"], "Fm");
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 3, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    const alle = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen;
    expect(alle.map((z) => z.laufendeNummer)).toEqual(alle.map((_, i) => alle.length - i));
    const gefiltert = tagebuch(platz, "E-1");
    const anlageZeile = gefiltert.find((z) => z.typ === "NachrichtVerfasst");
    // Dieselbe Nummer auch im Filter — und dieselbe, die die Nachricht als ETB-Nr. trägt.
    expect(anlageZeile?.laufendeNummer).toBe(alle.find((z) => z.ereignisId === anlageZeile?.ereignisId)?.laufendeNummer);
    const nachricht = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen[0];
    expect(nachricht?.etbNummer).toBe(anlageZeile?.laufendeNummer);
    expect(gefiltert.find((z) => z.typ === "NachrichtNachgewiesen")?.nachrichtNummer).toBe("E 3");
  });
});

describe("Konflikthinweis im frischen Einsatz (R2-Si P3-6, R2-FM P3-6)", () => {
  it("Szenario: Einsatz abends anlegen mit Beginn am Morgen, Stellenabfrage, Blatt Nachrichten — kein Hinweis", async () => {
    const platz = await werkstattMitEinemPlatz();
    // Wie der Main beim Anlegen (`vermittlung.ts`): Beginn 08:00, angelegt 20:13 — dreizehn Stunden zurück.
    const beginn = new Date(Date.now() - 13 * 3_600_000).toISOString();
    const angelegt = await platz.dienst.bediene({
      typ: "EinsatzAngelegt",
      nutzlast: { einsatzId: EINSATZ_ID, name: "Runde 2", art: "EINSATZ", fuestName: "FüSt OV", beginn, schichtmodell: "ZWEI_SCHICHT", kosten: KOSTEN_VORBELEGUNG },
    });
    expect(angelegt.art).toBe("geschrieben");
    platz.dienst.stellenSetzen(["FMZ"], "Ha");
    await takteBis([platz]);
    platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "fmz" });
    const bild = lagebild(platz);
    expect(bild.hinweise).toBe(0);
    expect(bild.konflikthinweise).toBeUndefined();
  });
});
