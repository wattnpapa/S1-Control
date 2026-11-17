/**
 * Funktionalität: der Leiter des Fernmeldebetriebes als Station und die
 * Kopien nach der Beförderung (bestätigt am 2026-11-17,
 * KONZEPT-NACHRICHTEN.md §5, §9).
 *
 * Ausgang über den LdF bis zur Beförderung, Eingang über den LdF bis zur
 * Sichtung, die Ersatzregel ohne LdF in der Präsenz und die rote und grüne
 * Kopie nach der Beförderung mit und ohne `sichtungAuchAusgang` — durch den
 * echten Aktendienst auf echtem Dateisystem, gemessen an Ruf, Lagebild und
 * Bedienergebnis.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Bedienergebnis, Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtAnnehmen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtenParameterSetzen, nachrichtVorschlagen, type Nachrichtenparameter } from "../kontrakt/fmzschritte.js";
import { nachrichtWeitergeben } from "../kontrakt/ldfschritte.js";
import { nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { HINWEIS_ERSATZ_LDF_AUSGANG, HINWEIS_ERSATZ_LDF_EINGANG, HINWEIS_OHNE_VORSCHLAG } from "./laufwegfolgen.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "A-1",
    richtung: "AUSGANG",
    anschrift: "OV Wildeshausen",
    betreff: "Sandsäcke anfordern",
    inhalt: "500 Sandsäcke an Deich Nord.",
    absender: "S4",
    funktion: "S4",
    abfassungszeit: jetzt(),
    ...teile,
  };
}

function eingang(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return anlage({
    nachrichtId: "E-1",
    richtung: "EINGANG",
    absender: "OV Wildeshausen",
    anschrift: "FüSt Weser",
    funktion: "",
    aufnahme: { mittel: "TELEFON", zeitpunkt: jetzt(), handzeichen: "Fm" },
    ...teile,
  });
}

type Sicht = "posteingang" | "ausgang" | "sichter" | "fmz" | "nachweisung" | "ldf";

function sicht(platz: Platz, art: Sicht, stellen?: readonly string[]) {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: art, ...(stellen === undefined ? {} : { stellen: [...stellen] }) });
}

function zeile(platz: Platz, id: string) {
  return sicht(platz, "nachweisung").zeilen.find((z) => z.id === id);
}

function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

function warnungen(ergebnis: Bedienergebnis): readonly string[] {
  return ergebnis.art === "geschrieben" ? (ergebnis.warnungen ?? []) : [];
}

async function parameter(platz: Platz, feld: Nachrichtenparameter, wert: boolean): Promise<void> {
  const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, feld, null, wert);
  if (entwurf === undefined) throw new Error("kein Entwurf");
  expect((await platz.dienst.bediene(entwurf)).art).toBe("geschrieben");
}

const befoerderung = { mittel: "KURIER", zeitpunkt: "2026-11-17T10:05:00.000Z", handzeichen: "Fm", gegenstelle: "OV Wildeshausen" };

describe("Funktionalität: LdF als Station", () => {
  it("Szenario: Ausgang über den LdF bis zur Beförderung — der Vorschlag steht in der Zeile", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["LDF"], "Lf");
    await parameter(a, "ldfStation", true);
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(anlage()));
    await a.dienst.bediene(nachrichtAnnehmen("A-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm" }));
    await takteBis([a, b]);
    expect(zeile(a, "A-1")?.laufzustand).toBe("VOR_LDF");
    expect(lagebild(a).nachrichten).toMatchObject({ vorLdf: 1, vorFmz: 0 });
    // Die Warteschlange zeigt den Ausgang weiter: Er wartet auf den Vorschlag.
    expect(sicht(a, "fmz").zeilen.map((z) => z.id)).toEqual(["A-1"]);

    await takteBis([a, b]);
    const vorschlag = { mittel: "KURIER", fernmelder: "Fm2", zeitpunkt: jetzt(), handzeichen: "Lf" };
    expect((await b.dienst.bediene(nachrichtVorschlagen("A-1", null, vorschlag))).art).toBe("geschrieben");
    expect(sicht(b, "ldf").zeilen).toHaveLength(0);
    expect(zeile(b, "A-1")).toMatchObject({ laufzustand: "VOR_FMZ", vorschlag });

    await takteBis([a, b]);
    const ergebnis = await a.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    // Mit LdF in der Präsenz und Vorschlag wird nichts nachgetragen; nur die Kopien folgen.
    expect(warnungen(ergebnis)).not.toContain(HINWEIS_ERSATZ_LDF_AUSGANG);
    expect(zeile(a, "A-1")).toMatchObject({ laufzustand: "VERTEILT", vorschlag: { handzeichen: "Lf", fernmelder: "Fm2" } });
  });

  it("Szenario: Eingang über den LdF bis zur Sichtung", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["LDF", "SICHTER"], "Lf");
    await parameter(a, "ldfStation", true);
    await takteBis([a, b]);
    const ergebnis = await a.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    expect(warnungen(ergebnis)).not.toContain(HINWEIS_ERSATZ_LDF_EINGANG);
    await takteBis([a, b]);
    expect(sicht(b, "ldf").zeilen.map((z) => [z.id, z.laufzustand])).toEqual([["E-1", "VOR_LDF"]]);
    expect(sicht(b, "sichter").zeilen).toHaveLength(0);

    const weiter = { zeitpunkt: jetzt(), handzeichen: "Lf" };
    expect((await b.dienst.bediene(nachrichtWeitergeben("E-1", null, weiter))).art).toBe("geschrieben");
    expect(sicht(b, "sichter").zeilen.map((z) => z.id)).toEqual(["E-1"]);
    const verteilung = { zeitpunkt: jetzt(), handzeichen: "Si", verteiler: [{ stelle: "S3", kopie: "GRUEN" }] };
    await b.dienst.bediene(nachrichtSichten("E-1", null, verteilung));
    expect(zeile(b, "E-1")).toMatchObject({ laufzustand: "VERTEILT", weitergabe: weiter });
  });

  it("Szenario: ohne LdF in der Präsenz übernimmt der Fernmelder — Weitergabe beim Aufnehmen, Vorschlag beim Befördern", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await parameter(platz, "ldfStation", true);

    const aufgenommen = await platz.dienst.bediene(nachrichtVerfassen(eingang()));
    expect(warnungen(aufgenommen)).toContain(HINWEIS_ERSATZ_LDF_EINGANG);
    expect(zeile(platz, "E-1")).toMatchObject({ laufzustand: "VOR_SICHTER", weitergabe: { handzeichen: "Fm" } });

    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtAnnehmen("A-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(zeile(platz, "A-1")?.laufzustand).toBe("VOR_LDF");
    const befoerdert = await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    expect(warnungen(befoerdert)).toContain(HINWEIS_ERSATZ_LDF_AUSGANG);
    expect(zeile(platz, "A-1")?.vorschlag).toEqual({ mittel: "KURIER", fernmelder: "Fm", gegenstelle: "OV Wildeshausen", zeitpunkt: befoerderung.zeitpunkt, handzeichen: "Fm" });
  });

  it("Szenario: mit LdF in der Präsenz, aber ohne Vorschlag befördert — nichts nachgetragen, ein Hinweis", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["LDF"], "Lf");
    await parameter(a, "ldfStation", true);
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(anlage()));
    const befoerdert = await a.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    expect(warnungen(befoerdert)).toContain(HINWEIS_OHNE_VORSCHLAG);
    expect(zeile(a, "A-1")?.vorschlag).toBeUndefined();
  });

  it("Szenario: ohne den Parameter gibt es weder VOR_LDF noch eine Weitergabe", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(eingang()));
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtAnnehmen("A-1", null, { zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(zeile(platz, "E-1")).toMatchObject({ laufzustand: "VOR_SICHTER" });
    expect(zeile(platz, "E-1")?.weitergabe).toBeUndefined();
    expect(zeile(platz, "A-1")?.laufzustand).toBe("VOR_FMZ");
    expect(lagebild(platz).nachrichten).not.toHaveProperty("vorLdf");
    expect(lagebild(platz).stammdaten).not.toHaveProperty("ldfStation");
  });
});

describe("Funktionalität: Kopien nach der Beförderung", () => {
  it("Szenario: rot an S2, grün an die Stelle des Verfassers — im Posteingang beider, verteilt bis erledigt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ funktion: "S4" })));
    const ergebnis = await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    expect(warnungen(ergebnis)).toContain("Kopien nach Beförderung: rot S2, grün S4. S2 ist nicht besetzt; die rote Kopie wartet im Fach.");
    const z = zeile(platz, "A-1");
    expect(z?.sichtung).toEqual({
      zeitpunkt: befoerderung.zeitpunkt,
      handzeichen: "Fm",
      verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }],
      vermerke: "Kopien nach Beförderung: rot S2, grün S4",
    });
    expect(z?.laufzustand).toBe("VERTEILT");
    expect(sicht(platz, "posteingang", ["S2"]).zeilen.map((x) => x.id)).toEqual(["A-1"]);
    expect(sicht(platz, "posteingang", ["S4"]).zeilen.map((x) => x.id)).toEqual(["A-1"]);
  });

  it("Szenario: Funktion keine Stelle — der Absender ist die grüne Kopie, ohne Schrägstrich", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ funktion: "Zugführer", absender: "TZ/FGr N" })));
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    expect(zeile(platz, "A-1")?.sichtung?.verteiler).toEqual([{ stelle: "S2", kopie: "ROT" }, { stelle: "TZ-FGr N", kopie: "GRUEN" }]);
  });

  it("Szenario: mit sichtungAuchAusgang entfällt der Folgeschritt — der Sichter verteilt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await parameter(platz, "sichtungAuchAusgang", true);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    const ergebnis = await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, befoerderung));
    expect(warnungen(ergebnis).join(" ")).not.toContain("Kopien nach Beförderung");
    expect(zeile(platz, "A-1")?.sichtung).toBeUndefined();
    expect(sicht(platz, "sichter").zeilen.map((z) => z.id)).toEqual(["A-1"]);
  });
});
