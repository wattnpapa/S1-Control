/**
 * Prüfungen der beiden Paketkommandos (M9.2).
 *
 * **Die Aussage, auf die alles zuläuft, steht im letzten Prüffall:** Was
 * `s1 paket signiere` erzeugt, nimmt `pruefeManifest` an — dieselbe Funktion,
 * die im Betrieb entscheidet, ob ein Update angeboten wird. Ohne diesen
 * Nachweis wäre das Werkzeug eine Behauptung: Es schriebe eine Datei, und ob
 * die Führungsstelle damit etwas anfangen kann, zeigte sich am Tag der
 * Verteilung.
 *
 * Der zweite wichtige Fall ist der Schutz vor dem zweiten Schlüsselpaar. Ein
 * neues Paar erklärt jedes veröffentlichte Manifest für ungültig; das darf
 * kein Versehen sein, das ein wiederholter Aufruf erledigt.
 */

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { pruefeManifest } from "@s1/domaene";
import { sha256HexBytes } from "@s1/speicher";

import { fuehreAus } from "../index.js";
import { plattformAus } from "./signiere.js";

const PAKETBYTES = new TextEncoder().encode("So sähe der Installer aus.");

/** Ein Wegwerf-Ordner mit einer Paketdatei darin. */
async function werkstatt(dateiname = "S1-Control-2.1.0-win-x64.exe"): Promise<{
  readonly ordner: string;
  readonly paket: string;
  readonly schluessel: string;
}> {
  const ordner = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-paket-"));
  const paket = path.join(ordner, dateiname);
  await fsp.writeFile(paket, PAKETBYTES);
  return { ordner, paket, schluessel: path.join(ordner, "verteilschluessel.privat") };
}

/** Erzeugt ein Schlüsselpaar und liefert den öffentlichen Teil aus der Ausgabe. */
async function erzeugeSchluessel(ziel: string): Promise<string> {
  const ergebnis = await fuehreAus(["paket", "schluessel", "--ziel", ziel]);
  expect(ergebnis.code).toBe(0);
  const treffer = /VERTRAUTER_SCHLUESSEL = "([0-9a-f]{64})"/u.exec(ergebnis.text);
  expect(treffer, "Die Ausgabe nennt die Zeile für den Quelltext").not.toBeNull();
  return (treffer as RegExpExecArray)[1] as string;
}

describe("s1 paket schluessel", () => {
  it("schreibt den privaten Teil in eine Datei und nennt nur den öffentlichen", async () => {
    const { schluessel } = await werkstatt();
    const ergebnis = await fuehreAus(["paket", "schluessel", "--ziel", schluessel]);

    expect(ergebnis.code).toBe(0);
    const privat = (await fsp.readFile(schluessel, "utf8")).trim();
    expect(privat).toMatch(/^[0-9a-f]{64}$/u);
    // **Der private Teil steht nicht in der Ausgabe.** Sie landet im Verlauf
    // der Sitzung, in der Zwischenablage und womöglich in einem Protokoll.
    expect(ergebnis.text).not.toContain(privat);
  });

  it("gibt der Schlüsseldatei Rechte für den Eigentümer allein", async () => {
    // Unter Windows tut `chmod` nichts; dort ist der Prüffall gegenstandslos,
    // und die Ausgabe des Kommandos sagt das dem Benutzer auch.
    if (process.platform === "win32") return;
    const { schluessel } = await werkstatt();
    await fuehreAus(["paket", "schluessel", "--ziel", schluessel]);

    const stand = await fsp.stat(schluessel);
    expect(stand.mode & 0o777).toBe(0o600);
  });

  it("überschreibt ein vorhandenes Paar nicht", async () => {
    const { schluessel } = await werkstatt();
    await fuehreAus(["paket", "schluessel", "--ziel", schluessel]);
    const vorher = await fsp.readFile(schluessel, "utf8");

    const zweiter = await fuehreAus(["paket", "schluessel", "--ziel", schluessel]);

    expect(zweiter.code).toBe(2);
    expect(zweiter.text).toContain("bereits eine Datei");
    expect(await fsp.readFile(schluessel, "utf8")).toBe(vorher);
  });
});

describe("s1 paket signiere", () => {
  it("liest die Plattform aus der Endung", () => {
    expect(plattformAus("S1-Control-2.1.0-win-x64.exe")).toBe("win32");
    expect(plattformAus("S1-Control.DMG")).toBe("darwin");
    expect(plattformAus("s1-control_2.1.0_amd64.deb")).toBe("linux");
    expect(plattformAus("paket.tar.gz")).toBeUndefined();
  });

  it("verlangt die Fassung, statt sie aus dem Dateinamen zu raten", async () => {
    // Sie entscheidet, ob ein Update angeboten wird; aus einem Dateinamen
    // gelesen wäre sie eine Vermutung über genau diese Entscheidung.
    const { paket, schluessel } = await werkstatt();
    await erzeugeSchluessel(schluessel);

    const ergebnis = await fuehreAus(["paket", "signiere", paket, "--schluessel", schluessel]);

    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("--version");
  });

  it("verlangt die Plattform, wenn die Endung sie nicht hergibt", async () => {
    const { paket, schluessel } = await werkstatt("paket.tar.gz");
    await erzeugeSchluessel(schluessel);

    const ergebnis = await fuehreAus([
      "paket", "signiere", paket, "--schluessel", schluessel, "--version", "2.1.0",
    ]);

    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("--plattform");
  });

  it("weist eine Schlüsseldatei zurück, die keinen Ed25519-Schlüssel enthält", async () => {
    const { paket, schluessel } = await werkstatt();
    await fsp.writeFile(schluessel, "kein schluessel", "utf8");

    const ergebnis = await fuehreAus([
      "paket", "signiere", paket, "--schluessel", schluessel, "--version", "2.1.0",
    ]);

    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("Hexform");
  });

  it("trägt nur den Dateinamen ins Manifest, nie den Pfad", async () => {
    // Ein Pfadanteil wird von der Prüfung abgelehnt (§ M7.2) — richtig so,
    // denn er zeigte aus dem Ordner heraus. Das Werkzeug darf ihn deshalb gar
    // nicht erst erzeugen.
    const { ordner, paket, schluessel } = await werkstatt();
    await erzeugeSchluessel(schluessel);
    await fuehreAus([
      "paket", "signiere", paket, "--schluessel", schluessel, "--version", "2.1.0",
    ]);

    const manifest = JSON.parse(await fsp.readFile(path.join(ordner, "manifest.json"), "utf8")) as {
      stand: { datei: string };
    };
    expect(manifest.stand.datei).toBe("S1-Control-2.1.0-win-x64.exe");
  });

  it("erzeugt ein Manifest, das die Prüfung der Anwendung annimmt", async () => {
    // Der Prüffall, auf den es ankommt: dasselbe `pruefeManifest`, das im
    // Betrieb entscheidet, ob ein Update angeboten wird.
    const { ordner, paket, schluessel } = await werkstatt();
    const pubkey = await erzeugeSchluessel(schluessel);

    const ergebnis = await fuehreAus([
      "paket", "signiere", paket,
      "--schluessel", schluessel,
      "--version", "2.1.0",
      "--hinweis", "Eingangskorb und Bündeldatei",
    ]);
    expect(ergebnis.code).toBe(0);

    const text = await fsp.readFile(path.join(ordner, "manifest.json"), "utf8");
    const befund = await pruefeManifest({
      text,
      vertrauterSchluessel: pubkey,
      laufendeVersion: "2.0.0",
      plattform: "win32",
      dateiHash: sha256HexBytes(PAKETBYTES),
    });

    expect(befund.art).toBe("angeboten");
    if (befund.art !== "angeboten") return;
    expect(befund.stand.version).toBe("2.1.0");
    expect(befund.stand.hinweis).toBe("Eingangskorb und Bündeldatei");
  });

  it("erzeugt ein Manifest, das eine ausgetauschte Datei nicht deckt", async () => {
    const { ordner, paket, schluessel } = await werkstatt();
    const pubkey = await erzeugeSchluessel(schluessel);
    await fuehreAus([
      "paket", "signiere", paket, "--schluessel", schluessel, "--version", "2.1.0",
    ]);

    const befund = await pruefeManifest({
      text: await fsp.readFile(path.join(ordner, "manifest.json"), "utf8"),
      vertrauterSchluessel: pubkey,
      laufendeVersion: "2.0.0",
      plattform: "win32",
      dateiHash: sha256HexBytes(new TextEncoder().encode("etwas ganz anderes")),
    });

    expect(befund.art === "abgelehnt" && befund.grund).toBe("dateiPasstNicht");
  });
});
