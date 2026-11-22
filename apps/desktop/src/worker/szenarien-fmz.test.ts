/**
 * Funktionalität: Fernmeldezentrale und Nachweisung — die Szenarien zu
 * Schnitt N2 (KONZEPT-NACHRICHTEN.md §5, §7, §9, Entscheidungen 1, 2, 8).
 *
 * Annahme, Beförderung, Nachweis, Eingang mit Folgeschritt, Ersatzsichter,
 * Gesprächsnotiz und Parameter laufen durch den echten Aktendienst auf
 * echtem Dateisystem; gemessen wird an Ruf, Lagebild und Bedienergebnis.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { Bedienergebnis, Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtAnnehmen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtNachweisen, nachrichtenParameterSetzen } from "../kontrakt/fmzschritte.js";
import { nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { HINWEIS_ERSATZSICHTER, HINWEIS_ERSATZSICHTER_NOTIZ } from "./nachrichtenfolgen.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz, ohneLdf } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "N-1",
    richtung: "AUSGANG",
    anschrift: "OV Wildeshausen",
    betreff: "Sandsäcke anfordern",
    inhalt: "500 Sandsäcke an Deich Nord.",
    absender: "S4",
    abfassungszeit: jetzt(),
    ...teile,
  };
}

const verteilung = { zeitpunkt: jetzt(), handzeichen: "Fm", verteiler: [{ stelle: "S2", kopie: "ROT" }, { stelle: "S4", kopie: "GRUEN" }] };

function sicht(platz: Platz, art: "posteingang" | "ausgang" | "sichter" | "fmz" | "nachweisung", stellen?: readonly string[]) {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: art, ...(stellen === undefined ? {} : { stellen: [...stellen] }) });
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

describe("Funktionalität: Fernmeldezentrale (N2)", () => {
  it("Szenario: Annahme und Beförderung führen den Ausgang aus der Warteschlange", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    expect(sicht(platz, "fmz").zeilen.map((z) => z.id)).toEqual(["N-1"]);

    const annahme = { zeitpunkt: "2026-11-16T10:00:00.000Z", handzeichen: "Fm" };
    expect((await platz.dienst.bediene(nachrichtAnnehmen("N-1", null, annahme))).art).toBe("geschrieben");
    const angenommen = sicht(platz, "fmz").zeilen[0];
    expect(angenommen?.annahme).toEqual(annahme);
    // Seit 10:00 angenommen, unbefördert: über der Schwelle von 20 Minuten.
    expect(angenommen?.fmzUeberSchwelle).toBe(true);
    expect(lagebild(platz).nachrichten?.ueberSchwelle).toBe(1);

    const befoerdert = await platz.dienst.bediene(
      nachrichtBefoerdern("N-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: " Fm ", gegenstelle: "Heros Wildeshausen" }),
    );
    expect(befoerdert.art).toBe("geschrieben");
    expect(sicht(platz, "fmz").zeilen).toHaveLength(0);
    const zeile = sicht(platz, "ausgang").zeilen[0];
    // Seit 2026-11-17 gehen nach der Beförderung die Kopien an S2 und den Verfasser (Folie 30): verteilt.
    expect(zeile).toMatchObject({ laufzustand: "VERTEILT", gegenstelle: "Heros Wildeshausen", befoerderung: { mittel: "FUNK", handzeichen: "Fm" } });
  });

  it("Szenario: Nachweis mit vergebener Nummer schreibt, warnt und markiert beide Zeilen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "N-2", betreff: "Lage ruhig" })));
    expect(sicht(platz, "fmz").naechsteNummer).toBe(1);

    const erster = await platz.dienst.bediene(nachrichtNachweisen("N-1", null, { nummer: 7, zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(warnungen(erster)).toEqual([]);
    // Papier-Nacherfassung: Eine höhere Nummer gilt, die Vorbelegung zieht nach.
    expect(sicht(platz, "fmz")).toMatchObject({ naechsteNummer: 8, vergebeneNummern: [7] });

    const zweiter = await platz.dienst.bediene(nachrichtNachweisen("N-2", null, { nummer: 7, zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(zweiter.art).toBe("geschrieben");
    expect(warnungen(zweiter).join(" ")).toContain("Die Nummer 7 ist bereits vergeben");
    const nachweisung = sicht(platz, "nachweisung").zeilen;
    expect(nachweisung.map((z) => [z.id, z.nummer, z.nummerDoppelt])).toEqual([
      ["N-1", 7, true],
      ["N-2", 7, true],
    ]);
  });

  it("Szenario: ein aufgenommener Eingang mit Nummer wird im selben Zug nachgewiesen", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await ohneLdf(a); // der Weg ohne LdF (seit FOLD_VERSION 17 ausdrücklich)
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    await takteBis([a, b]);
    const eingang = anlage({
      richtung: "EINGANG",
      absender: "OV Wildeshausen",
      anschrift: "FüSt Weser",
      gegenstelle: "Heros Wildeshausen",
      aufnahme: { mittel: "TELEFON", zeitpunkt: jetzt(), handzeichen: "Fm" },
    });
    const ergebnis = await a.dienst.bediene(nachrichtAufnehmen(eingang, { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    expect(warnungen(ergebnis)).toEqual(["In der Nachweisung unter Nummer 1 eingetragen."]);
    const zeile = sicht(a, "sichter").zeilen[0];
    expect(zeile).toMatchObject({ id: "N-1", nummer: 1, gegenstelle: "Heros Wildeshausen", aufnahme: { mittel: "TELEFON" }, laufzustand: "VOR_SICHTER" });
  });

  it("Szenario: ohne Sichter in der Präsenz verteilt die FmZ beim Aufnehmen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    const ergebnis = await platz.dienst.bediene(nachrichtAufnehmen(anlage({ richtung: "EINGANG" }), { sichtung: verteilung }));
    expect(warnungen(ergebnis)).toEqual([HINWEIS_ERSATZSICHTER]);
    expect(sicht(platz, "sichter").zeilen).toHaveLength(0);
    expect(sicht(platz, "posteingang", ["S4"]).zeilen[0]).toMatchObject({ laufzustand: "VERTEILT", sichtung: { handzeichen: "Fm" } });
  });

  it("Szenario: mit Sichter in der Präsenz sagt der Hinweis nicht „kein Sichter“", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b]);
    expect(lagebild(a).peers.some((p) => p.stellen?.includes("SICHTER") === true)).toBe(true);
    const ergebnis = await a.dienst.bediene(nachrichtAufnehmen(anlage({ richtung: "EINGANG" }), { sichtung: verteilung }));
    expect(warnungen(ergebnis)).toEqual(["Nachricht beim Aufnehmen verteilt."]);
  });

  it("Szenario: die Gesprächsnotiz verteilt ihr Verfasser selbst und läuft nicht über die FmZ", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S3"], "Mü");
    const notiz = anlage({ richtung: "EINGANG", gespraechsnotiz: true, absender: "Polizei", anschrift: "S3" });
    const ergebnis = await platz.dienst.bediene(nachrichtAufnehmen(notiz, { sichtung: verteilung }));
    expect(warnungen(ergebnis)).toEqual([HINWEIS_ERSATZSICHTER_NOTIZ]);
    expect(sicht(platz, "fmz").zeilen).toHaveLength(0);
    expect(sicht(platz, "posteingang", ["S2"]).zeilen[0]).toMatchObject({ gespraechsnotiz: true, laufzustand: "VERTEILT" });
    // Ohne eigene Verteilung läuft sie zum Sichter wie ein Eingang.
    await platz.dienst.bediene(nachrichtVerfassen({ ...notiz, nachrichtId: "N-2" }));
    expect(sicht(platz, "sichter").zeilen.map((z) => z.id)).toEqual(["N-2"]);
  });

  it("Szenario: die Parameter stehen im Lagebild und wirken auf Schwelle und Laufweg", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    expect(lagebild(platz).stammdaten).not.toHaveProperty("fmzSchwelleMinuten");
    const schwelle = nachrichtenParameterSetzen(EINSATZ_ID, "fmzSchwelleMinuten", null, 45);
    const sichtung = nachrichtenParameterSetzen(EINSATZ_ID, "sichtungAuchAusgang", null, true);
    if (schwelle === undefined || sichtung === undefined) throw new Error("kein Entwurf");
    expect((await platz.dienst.bediene(schwelle)).art).toBe("geschrieben");
    expect((await platz.dienst.bediene(sichtung)).art).toBe("geschrieben");
    expect(lagebild(platz).stammdaten).toMatchObject({ fmzSchwelleMinuten: 45, sichtungAuchAusgang: true });
    expect(nachrichtenParameterSetzen(EINSATZ_ID, "fmzSchwelleMinuten", 45, 45)).toBeUndefined();
    const falsch = await platz.dienst.bediene({ typ: "NachrichtenParameterGesetzt", nutzlast: { einsatzId: EINSATZ_ID, feld: "fmzSchwelleMinuten" }, vorher: 45, neu: 0 });
    expect(falsch.art).not.toBe("geschrieben");
    // Mit „auch Ausgang" läuft der beförderte Ausgang zum Sichter.
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtBefoerdern("N-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(sicht(platz, "sichter").zeilen.map((z) => z.id)).toEqual(["N-1"]);
  });

  it("Szenario: die Nachweisungsausgabe legt eine Datei mit den Zeilen nach Nummer ab", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ betreff: "Ohne Nummer" })));
    await platz.dienst.bediene(nachrichtAufnehmen(anlage({ nachrichtId: "N-2", richtung: "EINGANG", betreff: "Pumpen eingetroffen" }), { nachweis: { nummer: 3, zeitpunkt: jetzt(), handzeichen: "Fm" } }));
    const { dateiname, html } = platz.dienst.ausgabeHtml("nachweisung");
    expect(dateiname).toMatch(/^nachweisung_\d{4}-\d{2}-\d{2}_\d{4}$/);
    expect(html).toContain("Pumpen eingetroffen");
    expect(html.indexOf("Pumpen eingetroffen")).toBeLessThan(html.indexOf("Ohne Nummer"));
    const pfad = await platz.dienst.ausgabeSchreiben(`${dateiname}.html`, new TextEncoder().encode(html));
    expect(path.basename(path.dirname(pfad))).toBe("ausgaben");
    expect(readFileSync(pfad, "utf8")).toContain("Nachweisung");
  });

  it("Szenario: die Chips des Posteingangs zählen je Zustand", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtAufnehmen(anlage({ richtung: "EINGANG" }), { sichtung: verteilung }));
    // Additiv OFFEN: die Zahl der Sicht „offen" für dieselben Stellen (SGL P1-7).
    expect(sicht(platz, "posteingang", ["S4"]).zaehlung).toEqual({ NEU: 1, GELESEN: 0, ERLEDIGT: 0, OFFEN: 1 });
  });
});
