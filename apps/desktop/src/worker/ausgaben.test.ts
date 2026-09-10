/**
 * Die Kernausgaben über den echten Weg (M4.1).
 *
 * Die **Zahlen** der Ausgaben prüfen die Goldfiles unter `bau/ausgaben/`
 * gegen die Prüflage. Hier steht der Weg dorthin: dass der Aktendienst aus
 * seinem Zustand rendert, dass er die Datei in `ausgaben\` des Einsatzes
 * ablegt und dass sie danach dort liegt und lesbar ist.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const KODIERER = new TextEncoder();

describe("Der Aktendienst als Ausgabestelle", () => {
  it("rendert den Druck aus dem eigenen Zustand", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { dateiname, html } = platz.dienst.ausgabeHtml("druck");

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Hochwasser Weser-Ems");
    // Die eine Einheit aus `grundlage` steht mit 0/1/8 im Einsatzort.
    expect(html).toContain("Deich Nord");
    expect(html).toContain(">8<");
    // §4.1: Die Fußnote gehört zum Ausdruck und nicht zum Kommentar.
    expect(html).toContain("Angefordert / Anmarsch");
    // Der Dateiname trägt den Stand: Eine Führungsstelle druckt mehrmals.
    expect(dateiname).toMatch(/^druck_\d{4}-\d{2}-\d{2}_\d{4}$/);
  });

  it("rendert die Status-Matrix mit ihren Kontrollsummen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { dateiname, html } = platz.dienst.ausgabeHtml("status");

    expect(html).toContain("Stärke nach Organisationen");
    expect(html).toContain("Status der Einsatzkräfte");
    expect(html).toContain("Schichten");
    // Die Proben aus `Status!G36` und `G43`, im Wortlaut der Vorlage.
    expect(html).toContain("Kontrollsummen");
    expect(html).toContain("o.k.");
    expect(dateiname).toMatch(/^status_/);
  });

  it("nimmt den Organisationsfilter des Druckblatts entgegen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    // `Druck!S4`: Vorbelegung THW. Ein anderer Wert ändert die Überschrift
    // **und** die Zahlen darunter.
    expect(platz.dienst.ausgabeHtml("druck").html).toContain("Davon Stärke: THW");
    expect(platz.dienst.ausgabeHtml("druck", "FEUERWEHR").html).toContain("Davon Stärke: FEUERWEHR");
  });

  it("legt die Ausgabe im Ordner „ausgaben“ des Einsatzes ab (§1.4)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { dateiname, html } = platz.dienst.ausgabeHtml("druck");

    const pfad = await platz.dienst.ausgabeSchreiben(`${dateiname}.html`, KODIERER.encode(html));
    expect(path.basename(path.dirname(pfad))).toBe("ausgaben");
    expect(readFileSync(pfad, "utf8")).toBe(html);
  });

  it("liefert Auswertung und Oldenburger Block als je eigene Datei", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);

    const auswertung = platz.dienst.auswertungXlsx();
    const block = platz.dienst.oldenburgXlsx();

    // Zwei Ausgaben mit zwei Zwecken: Die eine ist unsere filterbare
    // Auswertung (§4.4), der andere der Block zum Einfügen in die Vorlage
    // (§2). Sie tragen deshalb verschiedene Namen und verschiedene Bytes.
    expect(auswertung.dateiname).toMatch(/^auswertung_\d{4}-\d{2}-\d{2}_\d{4}$/);
    expect(block.dateiname).toMatch(/^oldenburg_\d{4}-\d{2}-\d{2}_\d{4}$/);
    expect(Array.from(block.bytes)).not.toEqual(Array.from(auswertung.bytes));

    // Beides sind ZIP-Dateien: „PK\x03\x04" ist die Signatur des lokalen
    // Kopfs, mit der jeder Leser die Datei erkennt.
    for (const bytes of [auswertung.bytes, block.bytes]) {
      expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    }

    const pfad = await platz.dienst.ausgabeSchreiben(`${block.dateiname}.xlsx`, block.bytes);
    expect(path.basename(pfad)).toBe(`${block.dateiname}.xlsx`);
  });

  it("überschreibt eine Ausgabe desselben Namens, ohne zu klagen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    // Eine Ausgabe ist ein abgeleiteter Anzeiger (§1.3): Sie trägt keinen
    // Zustand, den die Ereignisse nicht auch tragen, und ist jederzeit neu
    // erzeugbar. Ein zweiter Lauf in derselben Minute darf deshalb nicht
    // scheitern.
    const pfad = await platz.dienst.ausgabeSchreiben("probe.html", KODIERER.encode("<p>eins</p>"));
    const zweiter = await platz.dienst.ausgabeSchreiben("probe.html", KODIERER.encode("<p>zwei</p>"));
    expect(zweiter).toBe(pfad);
    expect(readFileSync(pfad, "utf8")).toBe("<p>zwei</p>");
  });
});
