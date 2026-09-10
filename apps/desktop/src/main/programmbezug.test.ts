/**
 * Prüfungen des Bezugswegs (M9.1).
 *
 * **Die Aussage, auf die es ankommt, ist eine Nichtaussage:** Kommt irgendeine
 * Prüfung nicht durch, liegt danach **nichts** im Share. Jeder Ablehnungsfall
 * wird deshalb einzeln gefahren, und jeder prüft dasselbe zweimal — den
 * gemeldeten Grund und den leeren Ordner. Ein Sicherheitsmechanismus, dessen
 * Tests nur den guten Fall fahren, prüft die Stelle nicht, auf die es ankommt
 * (so schon M7.2).
 *
 * Das Netz ist eine Attrappe: eine Tabelle von Adresse auf Antwort. Damit ist
 * jeder Fall in Millisekunden prüfbar, und keiner davon braucht eine Leitung.
 */

import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { schluesselpaarErzeugen, zuHex } from "@bos/eeb-format";
import { signiereStand, type Programmstand } from "@s1/domaene";
import { knotenDateisystem, sha256HexBytes } from "@s1/speicher";

import { holePaket, type Bezugsoptionen, type Netzholer } from "./programmbezug.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

const AUSKUNFT = "https://api.github.com/repos/wattnpapa/s1-control/releases/latest";
const MANIFEST_URL = "https://github.com/wattnpapa/s1-control/releases/download/v2.1.0/manifest.json";
const PAKET_URL = "https://objects.githubusercontent.com/s1-control/S1-Control-2.1.0-win-x64.exe";

/** Das Paket, das die Attrappe ausliefert — klein, aber echt gehasht. */
const PAKETBYTES = new TextEncoder().encode("Das waere der Installer.");

/** Ein Netz, das genau die eingetragenen Adressen kennt und sonst wirft. */
function netzMit(tabelle: Readonly<Record<string, string | Uint8Array>>): Netzholer {
  const hole = (url: string): string | Uint8Array => {
    const antwort = tabelle[url];
    if (antwort === undefined) throw new Error(`Unerwarteter Ruf nach ${url}`);
    return antwort;
  };
  return {
    text(url, grenze) {
      const antwort = hole(url);
      const text = typeof antwort === "string" ? antwort : new TextDecoder().decode(antwort);
      if (text.length > grenze) throw new Error("Zu groß.");
      return Promise.resolve(text);
    },
    bytes(url, grenze) {
      const antwort = hole(url);
      const bytes = typeof antwort === "string" ? new TextEncoder().encode(antwort) : antwort;
      // Wie im echten Holer: Wer mehr schickt, als er angesagt hat, wird
      // abgelehnt und nicht stillschweigend beschnitten.
      if (bytes.byteLength > grenze) throw new Error("Zu groß.");
      return Promise.resolve(bytes);
    },
  };
}

function releaseAntwort(teile: Record<string, unknown> = {}): string {
  return JSON.stringify({
    tag_name: "v2.1.0",
    draft: false,
    prerelease: false,
    assets: [
      { name: "manifest.json", browser_download_url: MANIFEST_URL, size: 512 },
      { name: "S1-Control-2.1.0-win-x64.exe", browser_download_url: PAKET_URL, size: PAKETBYTES.byteLength },
    ],
    ...teile,
  });
}

function standMit(teile: Partial<Programmstand> = {}): Programmstand {
  return {
    version: "2.1.0",
    datei: "S1-Control-2.1.0-win-x64.exe",
    groesse: PAKETBYTES.byteLength,
    sha256: sha256HexBytes(PAKETBYTES),
    plattform: "win32",
    veroeffentlicht: "2026-09-10T12:00:00+02:00",
    hinweis: "Eingangskorb und Bündeldatei",
    ...teile,
  };
}

interface Aufbau {
  readonly optionen: Bezugsoptionen;
  readonly ordner: string;
  readonly pubkey: string;
}

/** Baut einen Bezug mit echtem Dateisystem und der Netz-Attrappe. */
async function baue(
  teile: {
    readonly stand?: Programmstand;
    readonly release?: string;
    readonly paket?: Uint8Array;
    readonly signiertMitFremdem?: boolean;
    /** Verbiegt die Signatur **nach** dem Signieren — derselbe Schlüssel, andere Bytes. */
    readonly verbogeneSignatur?: boolean;
    readonly manifestText?: string;
    readonly optionen?: Partial<Bezugsoptionen>;
  } = {},
): Promise<Aufbau> {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-bezug-"));
  wegwerf.push(wurzel);
  const ordner = path.join(wurzel, "programm");

  const paar = await schluesselpaarErzeugen();
  const signierer = teile.signiertMitFremdem === true ? await schluesselpaarErzeugen() : paar;
  const echt = await signiereStand(teile.stand ?? standMit(), signierer.privat);
  const manifest =
    teile.verbogeneSignatur === true
      ? { ...echt, signatur: `${echt.signatur.slice(0, -2)}${echt.signatur.endsWith("ff") ? "00" : "ff"}` }
      : echt;
  const manifestText = teile.manifestText ?? JSON.stringify(manifest);

  const optionen: Bezugsoptionen = {
    netz: netzMit({
      [AUSKUNFT]: teile.release ?? releaseAntwort(),
      [MANIFEST_URL]: manifestText,
      [PAKET_URL]: teile.paket ?? PAKETBYTES,
    }),
    dateisystem: knotenDateisystem(),
    auskunft: AUSKUNFT,
    programmordner: ordner,
    verbinde: (a, b) => path.join(a, b),
    vertrauterSchluessel: zuHex(paar.oeffentlich),
    laufendeVersion: "2.0.0",
    plattform: "win32",
    manifestGrenze: 64 * 1024,
    paketGrenze: 300 * 1024 * 1024,
    protokolliere: () => undefined,
    ...teile.optionen,
  };
  return { optionen, ordner, pubkey: zuHex(paar.oeffentlich) };
}

/** Nichts im Ordner — die Aussage, die jeder Ablehnungsfall zusätzlich prüft. */
function ordnerIstLeer(ordner: string): boolean {
  return !existsSync(path.join(ordner, "manifest.json")) && !existsSync(path.join(ordner, "S1-Control-2.1.0-win-x64.exe"));
}

describe("Der gute Fall", () => {
  it("legt Paket und Manifest in den Share und meldet die Fassung", async () => {
    const { optionen, ordner } = await baue();
    const befund = await holePaket(optionen);

    expect(befund.art).toBe("geholt");
    if (befund.art !== "geholt") return;
    expect(befund.version).toBe("2.1.0");
    expect(befund.datei).toBe("S1-Control-2.1.0-win-x64.exe");
    expect(befund.pfad).toBe(path.join(ordner, "S1-Control-2.1.0-win-x64.exe"));

    // Beide Dateien liegen da, und die Nutzdatei ist Byte für Byte die
    // geladene — nicht die angesagte Größe, sondern der Inhalt.
    expect(readFileSync(befund.pfad)).toEqual(Buffer.from(PAKETBYTES));
    expect(existsSync(path.join(ordner, "manifest.json"))).toBe(true);
  });

  it("lässt keine Bruchstückdatei liegen", async () => {
    // Geschrieben wird über einen Zwischennamen. Bleibt er liegen, sieht ein
    // Aufräumender eine Datei, die nach halbem Download aussieht.
    const { optionen, ordner } = await baue();
    await holePaket(optionen);
    expect(existsSync(path.join(ordner, "S1-Control-2.1.0-win-x64.exe.teil"))).toBe(false);
  });

  it("schreibt das Manifest zuletzt", async () => {
    // Ein Leser nimmt zuerst das Manifest und sucht dann die Datei daneben.
    // Läge das Manifest zuerst da, zeigte ein anderer Arbeitsplatz in genau
    // dem Augenblick auf eine Datei, die es noch nicht gibt.
    const geschrieben: string[] = [];
    const { optionen } = await baue();
    const echt = optionen.dateisystem;
    const befund = await holePaket({
      ...optionen,
      dateisystem: {
        ...echt,
        async schreibeNeuAnlegen(pfad, bytes) {
          geschrieben.push(path.basename(pfad));
          return echt.schreibeNeuAnlegen(pfad, bytes);
        },
        async schreibeUeberOhneSync(pfad, bytes) {
          geschrieben.push(path.basename(pfad));
          return echt.schreibeUeberOhneSync(pfad, bytes);
        },
      },
    });

    expect(befund.art).toBe("geholt");
    expect(geschrieben.at(-1)).toBe("manifest.json");
  });
});

describe("Was nicht geholt wird", () => {
  it("ohne Vertrauensanker: gar nichts", async () => {
    const { optionen, ordner } = await baue({ optionen: { vertrauterSchluessel: "" } });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("keinSchluessel");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("ohne Share: gar nichts", async () => {
    const { optionen } = await baue({ optionen: { programmordner: "" } });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("keinShare");
  });

  it("bei fremdem Schlüssel: nichts, und der Ordner bleibt leer", async () => {
    const { optionen, ordner } = await baue({ signiertMitFremdem: true });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("fremderSchluessel");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("bei verbogener Signatur: nichts", async () => {
    // Derselbe Schlüssel, veränderte Signaturbytes — sonst prüfte dieser Fall
    // in Wahrheit wieder den fremden Schlüssel eine Zeile darüber.
    const { optionen, ordner } = await baue({ verbogeneSignatur: true });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("signaturFalsch");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("bei ausgetauschtem Paket: nichts", async () => {
    // Der Fall, für den der ganze Weg gebaut ist: Das Manifest ist echt, die
    // Datei daneben ist es nicht. Die Prüfung geschieht **vor** dem
    // Schreiben — ein Paket, das erst im Share auffällt, hätte man den
    // anderen Arbeitsplätzen bereits hingelegt.
    const { optionen, ordner } = await baue({
      paket: new TextEncoder().encode("Etwas ganz anderes."),
    });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("dateiPasstNicht");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("bei einem Paket für eine andere Plattform: nichts", async () => {
    const { optionen, ordner } = await baue({ stand: standMit({ plattform: "darwin" }) });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("andereplattform");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("wenn die Veröffentlichung kein Manifest führt: nichts", async () => {
    const ohneManifest = releaseAntwort({
      assets: [{ name: "liesmich.txt", browser_download_url: PAKET_URL, size: 5 }],
    });
    const { optionen, ordner } = await baue({ release: ohneManifest });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("unvollstaendig");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("wenn das Manifest eine Datei nennt, die die Veröffentlichung nicht führt: nichts", async () => {
    const { optionen, ordner } = await baue({ stand: standMit({ datei: "gibtesnicht.exe" }) });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("unvollstaendig");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("wenn das Netz nicht antwortet: nichts, mit Grund", async () => {
    const { optionen, ordner } = await baue({
      optionen: {
        netz: {
          text: () => Promise.reject(new Error("ENOTFOUND api.github.com")),
          bytes: () => Promise.reject(new Error("ENOTFOUND")),
        },
      },
    });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("netzfehler");
    expect(befund.art === "abgelehnt" && befund.meldung).toContain("ENOTFOUND");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("bei einer Vorabfassung: nichts", async () => {
    const { optionen, ordner } = await baue({ release: releaseAntwort({ prerelease: true }) });
    const befund = await holePaket(optionen);
    expect(befund.art === "abgelehnt" && befund.grund).toBe("unlesbar");
    expect(ordnerIstLeer(ordner)).toBe(true);
  });
});

describe("Wenn nichts Neueres da ist", () => {
  it("meldet „aktuell“, wenn die laufende Fassung schon die neuere ist", async () => {
    const { optionen, ordner } = await baue({ optionen: { laufendeVersion: "2.1.0" } });
    const befund = await holePaket(optionen);
    expect(befund.art).toBe("aktuell");
    // Und es wird nichts geladen: Der frühe Vergleich über die Marke erspart
    // zwei Rufe, von denen einer neunzig Megabyte groß wäre.
    expect(ordnerIstLeer(ordner)).toBe(true);
  });

  it("nimmt auch die im Share liegende Fassung als Maßstab", async () => {
    // Wer an einem alten Arbeitsplatz sitzt, soll kein Paket herunterladen,
    // das drüben längst liegt.
    const { optionen } = await baue({
      optionen: { laufendeVersion: "2.0.0", vorhandeneVersion: "2.2.0" },
    });
    const befund = await holePaket(optionen);
    expect(befund.art).toBe("aktuell");
    if (befund.art === "aktuell") expect(befund.vorhanden).toBe("2.2.0");
  });

  it("ersetzt ein älteres Paket, das schon im Share liegt", async () => {
    const { optionen, ordner } = await baue({ optionen: { vorhandeneVersion: "2.0.5" } });
    mkdirSync(ordner, { recursive: true });
    writeFileSync(path.join(ordner, "manifest.json"), "altes Manifest", "utf8");

    const befund = await holePaket(optionen);

    expect(befund.art).toBe("geholt");
    expect(readFileSync(path.join(ordner, "manifest.json"), "utf8")).not.toBe("altes Manifest");
  });
});
