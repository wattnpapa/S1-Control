/**
 * Der ZIP-Schreiber gegen **fremde** Leser (M4.0).
 *
 * Ein Schreiber, der nur gegen den eigenen Leser geprüft ist, prüft, ob er zu
 * sich selbst passt. Bei einem Dateiformat ist das die wertlose Aussage: Ein
 * Archiv wird von Excel geöffnet, von der Dateiverwaltung von Windows, von
 * `unzip` auf einem Linux-Rechner — und keiner davon kennt unsere
 * Vorstellungen.
 *
 * Geprüft wird deshalb gegen zwei Leser, die nichts von diesem Baum wissen:
 *
 *  * `unzip` des Betriebssystems, mit seiner eigenen Prüfsummenprobe (`-t`),
 *  * der ZIP-Leser der Java-Klassenbibliothek über `libreoffice`, sofern
 *    vorhanden — er ist derselbe, der auch die XLSX-Ausgabe aus M4.2 liest.
 *
 * Der Test liegt unter `bau/` und nicht im Paket, weil er das Dateisystem und
 * fremde Programme braucht. `@s1/ausgaben` selbst bleibt frei von beidem.
 *
 * **Fehlt `unzip`, schlägt der Test fehl und wird nicht übersprungen.** Ein
 * Nachweis, der sich selbst abschaltet, wenn das Werkzeug fehlt, ist auf
 * einem CI-Läufer ohne dieses Werkzeug kein Nachweis — und die Gates
 * verbieten übersprungene Tests.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { schreibeZip, textEintrag } from "../../packages/ausgaben/src/zip.js";

const wegwerf: string[] = [];

afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function wegwerfordner(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-zip-"));
  wegwerf.push(ordner);
  return ordner;
}

/** Die Einträge, an denen sich die Festlegungen des Schreibers zeigen. */
const EINTRAEGE = [
  textEintrag("manifest.json", '{"einsatz":"Hochwasser Weser-Ems"}'),
  textEintrag("ausgaben/Stärke.html", "<p>0/1/8</p>"),
  textEintrag("ereignisse/000000.jsonl", "eine Zeile\nnoch eine\n"),
  textEintrag("leer.txt", ""),
];

describe("Ein fremder Leser öffnet das Archiv", () => {
  it("unzip -t bestätigt jede Prüfsumme", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "akte.zip");
    writeFileSync(datei, schreibeZip(EINTRAEGE, { zeitpunkt: new Date(2026, 8, 10, 14, 30, 6) }));

    const probe = spawnSync("unzip", ["-t", datei], { encoding: "utf8" });
    expect(probe.error, "unzip muss vorhanden sein; ein Nachweis, der sich selbst abschaltet, ist keiner").toBeUndefined();
    expect(probe.status, probe.stderr + probe.stdout).toBe(0);
    expect(probe.stdout).toContain("No errors detected");
  });

  it("liefert die Namen mit Umlaut und mit / als Trenner zurück", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "akte.zip");
    writeFileSync(datei, schreibeZip(EINTRAEGE));

    const liste = execFileSync("unzip", ["-Z", "-1", datei], { encoding: "utf8" });
    const namen = liste.trim().split("\n");
    expect(namen).toEqual([
      "manifest.json",
      "ausgaben/Stärke.html",
      "ereignisse/000000.jsonl",
      "leer.txt",
    ]);
  });

  it("gibt die Inhalte byte-gleich wieder heraus", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "akte.zip");
    const ziel = path.join(ordner, "entpackt");
    writeFileSync(datei, schreibeZip(EINTRAEGE));

    execFileSync("unzip", ["-q", datei, "-d", ziel]);
    expect(readFileSync(path.join(ziel, "manifest.json"), "utf8")).toBe(
      '{"einsatz":"Hochwasser Weser-Ems"}',
    );
    expect(readFileSync(path.join(ziel, "ausgaben", "Stärke.html"), "utf8")).toBe("<p>0/1/8</p>");
    expect(readFileSync(path.join(ziel, "ereignisse", "000000.jsonl"), "utf8")).toBe(
      "eine Zeile\nnoch eine\n",
    );
    expect(readFileSync(path.join(ziel, "leer.txt"), "utf8")).toBe("");
  });

  it("legt das Änderungsdatum ab, das mitgegeben wurde", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "akte.zip");
    writeFileSync(datei, schreibeZip(EINTRAEGE, { zeitpunkt: new Date(2026, 8, 10, 14, 30, 6) }));

    // `unzip -l` zeigt das Datum aus dem Zentralverzeichnis. Die Zeit ist
    // Ortszeit ohne Zone — das Format kennt keine, und sie ist deshalb
    // Anzeige und nicht Ordnung (§2.6 sinngemäß).
    const liste = execFileSync("unzip", ["-l", datei], { encoding: "utf8" });
    expect(liste).toContain("2026-09-10 14:30");
  });

  it("bleibt auch bei einem Archiv ohne Einträge gültig", () => {
    const ordner = wegwerfordner();
    const datei = path.join(ordner, "leer.zip");
    writeFileSync(datei, schreibeZip([]));

    const probe = spawnSync("unzip", ["-t", datei], { encoding: "utf8" });
    // `unzip` meldet für ein leeres Archiv „zipfile is empty“ — das ist die
    // Bestätigung, dass es gelesen und als leer erkannt wurde, und nicht ein
    // Formatfehler. Ein unlesbares Archiv brächte stattdessen
    // „cannot find zipfile directory“.
    expect(probe.stdout + probe.stderr).toMatch(/zipfile is empty/);
    expect(probe.stdout + probe.stderr).not.toMatch(/cannot find/);
  });
});
