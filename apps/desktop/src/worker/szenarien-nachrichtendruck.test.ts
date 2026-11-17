/**
 * Funktionalität: Vordruck je Nachricht und Automatikdruck — die Szenarien
 * zu Schnitt N3 (KONZEPT-NACHRICHTEN.md §7, Entscheidung 7).
 *
 * Durch den echten Aktendienst auf echtem Dateisystem: Der Vordruck liegt in
 * `ausgaben\nachrichten` mit dem Namen aus §7; der Automatikdruck schreibt
 * jede Nachricht, die für eine Stelle der Sitzung eintrifft, ins Verzeichnis
 * — nichts ohne Ziel, nichts, was beim Einschalten schon da war, und ein
 * Fehler meldet sich einmal je Sitzung.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { Mitteilung } from "../kontrakt/index.js";
import { nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

const wegwerf: string[] = [];
afterEach(() => {
  raeumeAuf();
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function zielordner(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-automatikdruck-"));
  wegwerf.push(ordner);
  // Ein Druckziel ist ein vorhandener Ordner (FM P2-11: nichts wird still angelegt).
  mkdirSync(path.join(ordner, "drucke"));
  return path.join(ordner, "drucke");
}

const ABFASSUNG = "2026-11-17T09:45:00Z";

function anlage(nachrichtId: string, betreff: string): Nachrichtenanlage {
  return { nachrichtId, richtung: "EINGANG", anschrift: "FüSt", betreff, inhalt: "Zwei Pumpen am Deich Nord.", absender: "OV Wildeshausen", abfassungszeit: ABFASSUNG };
}

/** Verfasst und sichtet eine Nachricht für die genannten Stellen. */
async function verteile(platz: Platz, nachrichtId: string, stellen: readonly string[], betreff = "Pumpen eingetroffen"): Promise<void> {
  await platz.dienst.bediene(nachrichtVerfassen(anlage(nachrichtId, betreff)));
  const verteiler = stellen.map((stelle) => ({ stelle, kopie: "GRUEN" }));
  // Der Platz ist nicht Sichter: Er sichtet mit „Trotzdem“ (R2-FaBe P0-1, Stellenvorbehalt als grund-Pflicht).
  const entwurf = nachrichtSichten(nachrichtId, null, { zeitpunkt: new Date().toISOString(), handzeichen: "Si", verteiler });
  await platz.dienst.bediene({ ...entwurf, grund: "Eintrag durch S4, nicht Sichter" });
}

function druckhinweise(platz: Platz): Extract<Mitteilung, { art: "hinweis" }>[] {
  return platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "hinweis" }> => m.art === "hinweis" && m.text.startsWith("Automatikdruck"));
}

describe("Funktionalität: Vordruck je Nachricht (N3, §7)", () => {
  it("Szenario: „Als Vordruck drucken“ legt das PDF in ausgaben\\nachrichten mit E, ohne Nummer und Datum-Zeit-Gruppe ab", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage("N-1", "Pumpen eingetroffen")));
    const ergebnis = await platz.dienst.nachrichtVordruck("N-1", "a5");
    expect(path.dirname(ergebnis.pfad)).toBe(path.join(platz.share, "ausgaben", "nachrichten"));
    expect(path.basename(ergebnis.pfad)).toBe("nachricht-Eohne-171045nov26-N1.pdf");
    const bytes = readFileSync(ergebnis.pfad);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(ergebnis.bytes).toBe(bytes.length);
    // A4 quer ist ein anderes Blatt, derselbe Name: Der zweite Druck ersetzt den ersten.
    const quer = await platz.dienst.nachrichtVordruck("N-1", "a4quer");
    expect(quer.pfad).toBe(ergebnis.pfad);
    expect(readFileSync(quer.pfad).toString("latin1")).toMatch(/\/MediaBox \[0 0 841\.8\d* 595\.2\d*\]/);
  });

  it("Szenario: eine unbekannte Nachricht wird mit einem Satz abgewiesen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await expect(platz.dienst.nachrichtVordruck("N-gibtsnicht", "a5")).rejects.toThrow("Diese Nachricht gibt es in diesem Einsatz nicht.");
  });
});

describe("Funktionalität: Automatikdruck ins Verzeichnis (N3, Entscheidung 7)", () => {
  it("Szenario: eine Nachricht, die beim Peer für seine Stelle eintrifft, fällt als PDF ins Verzeichnis — einmal", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    const ziel = zielordner();
    b.dienst.stellenSetzen(["S4"], "Mü");
    b.dienst.automatikdruckSetzen({ ziel: { ziel: "verzeichnis", pfad: ziel }, blatt: "a5" });
    await verteile(a, "N-1", ["S4"]);
    await verteile(a, "N-2", ["S3"], "Nicht für S4");
    await takteBis([a, b]);
    await b.dienst.automatikdruckFertig();
    expect(readdirSync(ziel)).toEqual(["nachricht-Eohne-171045nov26-N1.pdf"]);
    await takteBis([a, b]);
    await b.dienst.automatikdruckFertig();
    expect(readdirSync(ziel)).toHaveLength(1);
    expect(druckhinweise(b)).toEqual([]);
  });

  it("Szenario: was beim Einschalten schon verteilt war, wird nicht gedruckt; eine eigene Sichtung für die eigene Stelle schon", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S2"], "Si");
    await verteile(platz, "N-alt", ["S2"], "Vorher da");
    const ziel = zielordner();
    platz.dienst.automatikdruckSetzen({ ziel: { ziel: "verzeichnis", pfad: ziel }, blatt: "a4quer" });
    await verteile(platz, "N-neu", ["S2"], "Danach");
    await platz.dienst.automatikdruckFertig();
    expect(readdirSync(ziel)).toEqual(["nachricht-Eohne-171045nov26-Nneu.pdf"]);
  });

  it("Szenario: ohne Ziel entsteht keine Datei, auch nach dem Ausschalten nicht", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S4"], "Mü");
    const ziel = zielordner();
    await verteile(platz, "N-1", ["S4"]);
    platz.dienst.automatikdruckSetzen({ ziel: { ziel: "verzeichnis", pfad: ziel }, blatt: "a5" });
    platz.dienst.automatikdruckSetzen(undefined);
    await verteile(platz, "N-2", ["S4"]);
    await platz.dienst.automatikdruckFertig();
    expect(readdirSync(ziel)).toEqual([]);
    expect(existsSync(path.join(platz.share, "ausgaben", "nachrichten"))).toBe(false);
  });

  it("Szenario: ein fehlendes Verzeichnis wird nicht angelegt; der Vordruck liegt unter ausgaben/nachrichten, der Hinweis kommt einmal (FM P2-11)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S4"], "Mü");
    // Eine Datei, wo das Verzeichnis sein soll: Anlegen und Schreiben scheitern.
    const ziel = zielordner();
    writeFileSync(path.join(path.dirname(ziel), "sperre"), "x");
    const kaputt = path.join(path.dirname(ziel), "sperre", "unter");
    platz.dienst.automatikdruckSetzen({ ziel: { ziel: "verzeichnis", pfad: kaputt }, blatt: "a5" });
    await verteile(platz, "N-1", ["S4"]);
    await verteile(platz, "N-2", ["S4"], "Zweite");
    await platz.dienst.automatikdruckFertig();
    const hinweise = druckhinweise(platz);
    expect(hinweise).toHaveLength(1);
    expect(hinweise[0]).toMatchObject({ stufe: "warnung", akteId: "akte-1" });
    expect(hinweise[0]?.text).toContain(kaputt);
    expect(hinweise[0]?.text).toContain("nicht vorhanden, Vordruck liegt unter ausgaben/nachrichten");
    expect(hinweise[0]?.text).toContain("einmal je Sitzung");
    expect(existsSync(kaputt)).toBe(false);
    expect(readdirSync(path.join(platz.share, "ausgaben", "nachrichten")).sort()).toEqual(["nachricht-Eohne-171045nov26-N1.pdf", "nachricht-Eohne-171045nov26-N2.pdf"]);
  });

  it("Szenario: das Ziel Drucker ohne Druckausgang (Web-Schale, Werkstatt) meldet sich als Warnung statt still", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S4"], "Mü");
    platz.dienst.automatikdruckSetzen({ ziel: { ziel: "drucker", name: "Lager_S4" }, blatt: "a5" });
    await verteile(platz, "N-1", ["S4"]);
    await platz.dienst.automatikdruckFertig();
    expect(druckhinweise(platz)[0]?.text).toContain("Drucker „Lager_S4“");
  });
});
