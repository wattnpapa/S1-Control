/**
 * Der HTML-Monitor über den echten Weg (M4.3).
 *
 * Die DoD lautet: „zweites Gerät zeigt Aktualisierung". Ein zweites Gerät gibt
 * es hier nicht — was ein zweites Gerät sieht, ist aber vollständig durch die
 * **Datei** bestimmt: ihren Ort, ihren Inhalt und die Tatsache, dass sie sich
 * fortschreibt. Genau das steht hier.
 *
 * Was offen bleibt: ob ein Tablet in der Einsatzstelle den Share über das
 * Netz erreicht und die Seite darstellt. Das ist eine Frage der Freigaben und
 * des Geräts, nicht des Programms — sie steht im Abschlussbericht.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MONITOR_DATEINAME, RELOAD_SEKUNDEN } from "@s1/ausgaben";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/**
 * Der erwartete Ort der Monitordatei.
 *
 * Abgeleitet aus dem Pfad, den das Einschalten liefert — die Ablage selbst
 * gehört dem Dienst und wird von außen nicht angefasst. So prüft der Test den
 * **Ort**, ohne ihn ein zweites Mal zusammenzusetzen.
 */
function monitordatei(pfad: string): string {
  expect(path.basename(pfad)).toBe(MONITOR_DATEINAME);
  expect(path.basename(path.dirname(pfad))).toBe("ausgaben");
  return pfad;
}

/** Schaltet den Monitor ein und liefert den Pfad seiner Datei. */
async function schalteEin(platz: Platz, optionen: { mitStatus?: boolean } = {}): Promise<string> {
  const pfad = await platz.dienst.monitorSchalten(true, optionen);
  return monitordatei(pfad as string);
}

describe("Der HTML-Monitor", () => {
  it("ist aus, bis ihn jemand einschaltet", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    // Eine Datei, die immer geschrieben wird, liegt auf jedem Share jedes
    // Einsatzes — auch dort, wo niemand ein zweites Gerät hat.
    expect(platz.dienst.monitorLaeuft).toBe(false);
    await platz.dienst.takt();
    // Der Ort steht fest; er ist hier nur deshalb von Hand gebildet, weil es
    // gerade keinen Pfad gibt, den das Einschalten geliefert hätte.
    const erwartet = path.join(platz.share, "ausgaben", MONITOR_DATEINAME);
    expect(existsSync(erwartet)).toBe(false);
  });

  it("schreibt die Datei sofort beim Einschalten", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const pfad = await schalteEin(platz);

    // Wer den Monitor einschaltet, geht danach zum zweiten Gerät. Eine halbe
    // Minute vor einer leeren Seite zu stehen wäre die unfreundlichste Art,
    // den Schalter zu bestätigen.
    const html = readFileSync(pfad, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Hochwasser Weser-Ems");
    expect(html).toContain("Deich Nord");
  });

  it("trägt den Selbstnachladebefehl der Vorlage", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const html = readFileSync(await schalteEin(platz), "utf8");
    // Ein `<meta http-equiv="refresh">` und kein Skript: Die Datei wird über
    // `file://` von einem SMB-Share geöffnet, und ein Skript wäre dort je
    // nach Browser gesperrt.
    expect(html).toContain(`<meta http-equiv="refresh" content="${String(RELOAD_SEKUNDEN)}" />`);
    expect(html).not.toContain("<script");
    expect(RELOAD_SEKUNDEN).toBe(60);
  });

  it("zeigt den fachlichen Stand und das Lebenszeichen getrennt (§2.6)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const html = readFileSync(await schalteEin(platz), "utf8");
    // Der eine sagt, wie alt die Lage ist, der andere, wie alt das Bild ist.
    expect(html).toContain("Stand der Lage:");
    expect(html).toContain("Bild geschrieben:");
  });

  it("schreibt die Datei auch dann fort, wenn sich fachlich nichts ändert", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const pfad = await schalteEin(platz);
    const erstes = readFileSync(pfad, "utf8");

    // Die Werkstatt taktet mit `monitorMs: 0`; jeder Takt schreibt.
    await platz.dienst.takt();
    const zweites = readFileSync(pfad, "utf8");

    // Der Inhalt ist derselbe **bis auf** das Lebenszeichen — und genau darum
    // geht es: Ein toter Schreiber wäre sonst von einer ruhigen Lage nicht zu
    // unterscheiden.
    expect(zweites).toContain("Deich Nord");
    expect(erstes.includes("Bild geschrieben:")).toBe(true);
    expect(zweites.includes("Bild geschrieben:")).toBe(true);
  });

  it("nimmt die Statusmatrix auf Wunsch mit", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const ohne = readFileSync(await schalteEin(platz), "utf8");
    expect(ohne).not.toContain("<h2>Status</h2>");

    const mit = readFileSync(await schalteEin(platz, { mitStatus: true }), "utf8");
    // „Druck (optional Status)" der Vorlage: Wer die Wand für die Lagekarte
    // braucht, will die Bilanz nicht daneben.
    expect(mit).toContain("<h2>Status</h2>");
  });

  it("hört auf zu schreiben, sobald er ausgeschaltet ist", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const pfad = await schalteEin(platz);
    const vorher = readFileSync(pfad, "utf8");

    expect(await platz.dienst.monitorSchalten(false)).toBeNull();
    expect(platz.dienst.monitorLaeuft).toBe(false);
    await platz.dienst.takt();

    // Die Datei bleibt liegen — sie ist ein abgeleiteter Anzeiger (§1.3), und
    // sie zu löschen hieße, dem zweiten Gerät die Seite unter den Fingern
    // wegzuziehen. Sie altert stattdessen sichtbar.
    expect(readFileSync(pfad, "utf8")).toBe(vorher);
  });
});
