/**
 * Die Auswertung gegen einen **fremden** OOXML-Leser (M4.2).
 *
 * Die DoD lautet: „öffnet in Excel ohne Nacharbeit“. Excel steht auf einem
 * Linux-Läufer nicht zur Verfügung — LibreOffice schon, und das ist keine
 * Notlösung: Es ist eine vollständige, unabhängige Umsetzung desselben
 * Formats, die dieselbe Datei liest und dabei nichts von diesem Baum weiß.
 * Was sie öffnet und richtig wiedergibt, öffnet Excel mit hoher
 * Wahrscheinlichkeit auch.
 *
 * **Der Läufer braucht dafür `libreoffice-calc`.** Das Grundpaket allein
 * genügt nicht: Ohne den Calc-Filter meldet `soffice` für **jede** Tabelle
 * „source file could not be loaded“ — auch für eine, die es selbst
 * geschrieben hat. Das ist im Bericht zu M4 als Befund festgehalten, damit
 * ein roter Lauf nicht für einen Fehler in der Datei gehalten wird.
 *
 * **Das ersetzt den Versuch in Excel nicht** und behauptet es nicht: Ob eine
 * Führungsstelle die Datei ohne Nacharbeit weiterverwenden kann, sagt erst
 * der Versuch auf dem Zielrechner. Er steht als offener Punkt im
 * Abschlussbericht.
 *
 * Geprüft wird über `--convert-to csv`: LibreOffice liest die XLSX, wertet
 * sie aus und schreibt das Ergebnis in ein Format, das dieser Test wieder
 * lesen kann. Ein Rundgang durch eine fremde Umsetzung — mehr kann ein
 * automatischer Nachweis nicht leisten.
 *
 * **Fehlt LibreOffice, schlägt der Test fehl und wird nicht übersprungen.**
 * Ein Nachweis, der sich selbst abschaltet, ist auf einem Läufer ohne dieses
 * Werkzeug kein Nachweis — und die Gates verbieten übersprungene Tests.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  auswertungAlsXlsx,
  logFreiAlsXlsx,
  oldenburgAlsXlsx,
} from "../../packages/ausgaben/src/index.js";
import { falteHinzu, leereFaltung, materialisiere } from "../../packages/domaene/src/fold.js";
import { prueflageEreignisse } from "../../packages/domaene/src/pruefhilfen/pruefage.js";
import type { Zustand } from "../../packages/domaene/src/zustand.js";

const wegwerf: string[] = [];

afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function wegwerfordner(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-xlsx-"));
  wegwerf.push(ordner);
  return ordner;
}

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

/** Schreibt die Auswertung und lässt sie von LibreOffice nach CSV wandeln. */
function ueberFremdenLeser(bytes: Uint8Array): string[][] {
  const ordner = wegwerfordner();
  const datei = path.join(ordner, "auswertung.xlsx");
  writeFileSync(datei, bytes);

  const lauf = spawnSync(
    "soffice",
    [
      "--headless",
      "--norestore",
      `-env:UserInstallation=file://${path.join(ordner, "profil")}`,
      "--convert-to",
      "csv:Text - txt - csv (StarCalc):44,34,76,1",
      "--outdir",
      ordner,
      datei,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  expect(lauf.error, "LibreOffice muss vorhanden sein; ein Nachweis, der sich selbst abschaltet, ist keiner").toBeUndefined();

  const csv = readdirSync(ordner).find((name) => name.endsWith(".csv"));
  expect(csv, `LibreOffice hat keine CSV erzeugt: ${lauf.stdout}${lauf.stderr}`).toBeDefined();
  const inhalt = readFileSync(path.join(ordner, csv as string), "utf8");
  return inhalt
    .split("\n")
    .filter((zeile) => zeile.trim() !== "")
    .map(zerlegeCsvZeile);
}

/** Zerlegt eine CSV-Zeile mit Anführungszeichen — genug für das, was hier entsteht. */
function zerlegeCsvZeile(zeile: string): string[] {
  const felder: string[] = [];
  let feld = "";
  let inAnfuehrung = false;
  for (let stelle = 0; stelle < zeile.length; stelle += 1) {
    const zeichen = zeile[stelle];
    if (zeichen === '"') {
      if (inAnfuehrung && zeile[stelle + 1] === '"') {
        feld += '"';
        stelle += 1;
      } else {
        inAnfuehrung = !inAnfuehrung;
      }
      continue;
    }
    if (zeichen === "," && !inAnfuehrung) {
      felder.push(feld);
      feld = "";
      continue;
    }
    feld += zeichen ?? "";
  }
  felder.push(feld);
  return felder;
}

describe("Die Auswertung in einem fremden OOXML-Leser", () => {
  it("wird geöffnet und gibt Kopfzeile und Zeilenzahl wieder", () => {
    const zeilen = ueberFremdenLeser(auswertungAlsXlsx(lage(), { stand: "Stand: 08.09.2026, 08:15" }));

    // Zeile 1 Stand, Zeile 2 Summen, Zeile 3 Kopfzeile, danach die Einheiten.
    expect(zeilen[0]?.[0]).toContain("Übung Weser-Ems");
    expect(zeilen[1]?.[0]).toBe("Summe über alle Zeilen");
    expect(zeilen[2]?.[0]).toBe("Bereich");
    expect(zeilen[2]).toContain("Bezeichnung");
    expect(zeilen[2]).toContain("Status");
    // 41 Einheiten der Prüflage, die stillgelegten mitgezählt.
    expect(zeilen.length - 3).toBe(41);
  });

  it("gibt Umlaute unverfälscht wieder", () => {
    // Der Bereichsname „EA Deich Nord“ und die Bezeichnungen tragen Umlaute
    // und ein ß. Eine Datei, die sie zerlegt, ist für eine deutschsprachige
    // Führungsstelle unbrauchbar.
    const zeilen = ueberFremdenLeser(auswertungAlsXlsx(lage()));
    const alles = zeilen.map((zeile) => zeile.join("|")).join("\n");
    expect(alles).toContain("UA Deichfuß");
    expect(alles).toContain("FüSt Oldenburg");
    expect(alles).toContain("EA Pumpwerk Süd");
  });

  it("liefert die Stärkespalten als Zahlen, nicht als Text", () => {
    // Der Prüfstein: Eine Spalte mit Textzahlen lässt sich in Excel nicht
    // summieren, und genau dafür ist dieses Blatt da. Die Summenzeile ist der
    // sichtbare Beleg — LibreOffice hat sie als Zahl gelesen und wieder
    // ausgegeben.
    const zeilen = ueberFremdenLeser(auswertungAlsXlsx(lage()));
    const kopf = zeilen[2] as string[];
    const summen = zeilen[1] as string[];
    const stelle = kopf.indexOf("Gesamt");
    expect(stelle).toBeGreaterThan(0);
    const summe = Number.parseInt(summen[stelle] ?? "", 10);
    expect(Number.isNaN(summe)).toBe(false);
    // 293 in der Lage plus 37 angeforderte = 330; die entfernte Einheit
    // steht mit 0 darin, die aufgeteilte ist zweimal vertreten und teilt sich
    // ihre Stärke.
    expect(summe).toBeGreaterThan(300);
  });

  it("nimmt auch eine Auswertung ohne die zuschaltbaren Gruppen an", () => {
    const zeilen = ueberFremdenLeser(
      auswertungAlsXlsx(lage(), { gruppen: ["GRUNDDATEN", "STAERKE"] }),
    );
    const kopf = zeilen[2] as string[];
    expect(kopf).toContain("Bezeichnung");
    // Die Logistikspalten der Excel (AC..AI) sind nicht dabei.
    expect(kopf).not.toContain("Weibl.");
  });

  it("bleibt lesbar, wenn die Lage leer ist", () => {
    // Eine Auswertung vor dem ersten Ereignis: Sie hat drei Kopfzeilen und
    // keine Datenzeile. `unzip` allein bestätigte das nicht — hier liest sie
    // ein Tabellenprogramm.
    const leer = materialisiere(leereFaltung());
    const zeilen = ueberFremdenLeser(auswertungAlsXlsx(leer));
    expect(zeilen.length).toBeLessThanOrEqual(3);
    expect(zeilen[2]?.[0]).toBe("Bereich");
  });
});

describe("Der Aufbau der Datei", () => {
  it("enthält genau die fünf Teile, die das Format verlangt", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "auswertung.xlsx");
    writeFileSync(datei, auswertungAlsXlsx(lage()));
    const liste = execFileSync("unzip", ["-Z", "-1", datei], { encoding: "utf8" }).trim().split("\n");
    expect(liste).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ]);
  });
});

describe("Der Oldenburger Block in einem fremden OOXML-Leser", () => {
  it("wird geöffnet und liefert die 38 Spalten der Vorlage in ihrer Ordnung", () => {
    const zeilen = ueberFremdenLeser(oldenburgAlsXlsx(lage()));
    const kopf = zeilen[0] as string[];
    expect(kopf).toHaveLength(38);
    expect(kopf[0]).toBe("FüSt.");
    expect(kopf[4]).toBe("Zug");
    expect(kopf[24]).toBe("Status");
    expect(kopf[37]).toBe("Gesamt");
  });

  it("liefert Stärke und Gesamt als Zahlen — sonst rechnet die Vorlage nicht mit", () => {
    const zeilen = ueberFremdenLeser(oldenburgAlsXlsx(lage()));
    // Die erste Datenzeile steht unter der Kopfzeile und unter der
    // Überschriftenzeile des ersten Abschnitts.
    const erste = zeilen[2] as string[];
    const fuehrer = Number(erste[34]);
    const gesamt = Number(erste[37]);
    expect(Number.isNaN(fuehrer)).toBe(false);
    expect(Number.isNaN(gesamt)).toBe(false);
    expect(gesamt).toBe(fuehrer + Number(erste[35]) + Number(erste[36]));
  });
});

describe("LogFrei in einem fremden OOXML-Leser", () => {
  it("wird geöffnet und zeigt die vierzehn Spalten des Logistikblatts", () => {
    const zeilen = ueberFremdenLeser(logFreiAlsXlsx(lage()));
    const kopf = zeilen[1] as string[];
    expect(kopf[0]).toBe("Bereich");
    expect(kopf[1]).toBe("Früh");
    expect(kopf[5]).toBe("Summe");
    expect(kopf[13]).toBe("ÜN (d)");
    expect(kopf).toHaveLength(14);
  });

  it("liefert die Summenzeile als Zahlen und die getrennte Zeile darunter", () => {
    const zeilen = ueberFremdenLeser(logFreiAlsXlsx(lage()));
    const getrennt = zeilen.findIndex((zeile) => (zeile[0] ?? "").startsWith("Kräfte aus dem Bereich"));
    expect(getrennt).toBeGreaterThan(2);
    // Die Zeile unmittelbar über der Leerzeile vor der Überschrift ist die
    // Summe; ihre Spalte „Summe“ muss eine Zahl sein, sonst rechnet niemand
    // damit weiter.
    const summenzeile = zeilen[getrennt - 2] as string[];
    expect(Number.isNaN(Number(summenzeile[5]))).toBe(false);
    expect(Number(summenzeile[5])).toBeGreaterThan(0);
  });
});
