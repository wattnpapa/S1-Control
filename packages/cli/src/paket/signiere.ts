/**
 * `s1 paket signiere` — das Manifest zu einem Paket erzeugen (M9.2).
 *
 * **Warum das ein Kommando ist.** Ein Manifest von Hand zu schreiben hieße:
 * die Größe abzählen, SHA-256 bilden, die kanonische Serialisierung nach §7.6
 * herstellen und darüber mit Ed25519 signieren. Das macht niemand zweimal
 * richtig, und ein falsch signiertes Manifest fällt erst auf, wenn die
 * Führungsstelle vor einem abgelehnten Paket steht.
 *
 * **Die Plattform wird aus der Dateiendung geraten und ist überschreibbar.**
 * Raten ist hier vertretbar, weil ein Fehlgriff folgenlos ist: Ein Paket mit
 * falscher Plattform wird auf jedem Rechner als `andereplattform` abgelehnt,
 * also gar nicht erst angeboten. Ein Fehlgriff kostet einen zweiten Aufruf und
 * nicht mehr.
 *
 * **Die Fassung wird nicht geraten.** Sie ist die Angabe, an der der Vergleich
 * hängt (§ M7.2, `vergleicheVersionen`); aus einem Dateinamen gelesen wäre sie
 * eine Vermutung über etwas, das entscheidet, ob ein Update angeboten wird.
 * Sie muss angegeben werden.
 */

import * as fsp from "node:fs/promises";
import path from "node:path";

import { signiereStand, type Programmstand } from "@s1/domaene";
import { sha256HexBytes } from "@s1/speicher";
import { ausHex } from "@bos/eeb-format";

import type { Ergebnis } from "../index.js";

/** Endung → Plattform. Was nicht darin steht, verlangt `--plattform`. */
export const PLATTFORM_JE_ENDUNG: Readonly<Record<string, string>> = {
  ".exe": "win32",
  ".msi": "win32",
  ".dmg": "darwin",
  ".pkg": "darwin",
  ".deb": "linux",
  ".appimage": "linux",
  ".rpm": "linux",
};

/** Die erlaubten Plattformwerte — dieselben, die `process.platform` liefert. */
export const PLATTFORMEN = new Set(["win32", "darwin", "linux"]);

const ERLAUBTE_OPTIONEN = new Set(["schluessel", "version", "plattform", "hinweis", "ziel"]);

export interface Signierauftrag {
  readonly paket: string;
  readonly schluessel: string;
  readonly version: string;
  readonly plattform?: string;
  readonly hinweis?: string;
  readonly ziel?: string;
}

/** Liest Stellen und Optionen; Unbekanntes wird gemeldet, nicht verschluckt. */
export function deute(argv: readonly string[]): Signierauftrag {
  const stellen: string[] = [];
  const werte = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) {
      stellen.push(wort);
      continue;
    }
    const name = wort.slice(2);
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith("--")) throw new SyntaxError(`--${name} braucht einen Wert`);
    werte.set(name, wert);
    i += 1;
  }

  const paket = stellen[0];
  if (paket === undefined) throw new SyntaxError("Es fehlt der Pfad der Paketdatei");
  if (stellen.length > 1) throw new SyntaxError(`Unerwartetes Wort: ${stellen[1] as string}`);

  const schluessel = werte.get("schluessel");
  if (schluessel === undefined) throw new SyntaxError("Es fehlt --schluessel <datei>");
  const version = werte.get("version");
  if (version === undefined) throw new SyntaxError("Es fehlt --version <fassung>");

  const plattform = werte.get("plattform");
  const hinweis = werte.get("hinweis");
  const ziel = werte.get("ziel");
  return {
    paket,
    schluessel,
    version,
    ...(plattform === undefined ? {} : { plattform }),
    ...(hinweis === undefined ? {} : { hinweis }),
    ...(ziel === undefined ? {} : { ziel }),
  };
}

/** Die Plattform aus der Endung, oder `undefined`, wenn sie unbekannt ist. */
export function plattformAus(dateiname: string): string | undefined {
  return PLATTFORM_JE_ENDUNG[path.extname(dateiname).toLowerCase()];
}

/**
 * `s1 paket signiere <paketdatei> --schluessel <datei> --version <fassung>`
 * `                  [--plattform win32|darwin|linux] [--hinweis "…"] [--ziel <datei>]`
 *
 * Geschrieben wird `manifest.json` **neben das Paket**, weil beide zusammen
 * abgelegt werden und die Prüfung sie dort nebeneinander erwartet (§ M7.2).
 */
export async function signiere(argv: readonly string[]): Promise<Ergebnis> {
  const auftrag = deute(argv);

  const plattform = auftrag.plattform ?? plattformAus(auftrag.paket);
  if (plattform === undefined) {
    return {
      text: [
        `Aus der Endung von ${path.basename(auftrag.paket)} lässt sich die Plattform nicht ablesen.`,
        "Geben Sie sie an: --plattform win32 | darwin | linux",
      ].join("\n"),
      code: 2,
    };
  }
  if (!PLATTFORMEN.has(plattform)) {
    return {
      text: `Unbekannte Plattform: ${plattform}. Erlaubt sind win32, darwin, linux.`,
      code: 2,
    };
  }

  const rohSchluessel = (await fsp.readFile(auftrag.schluessel, "utf8")).trim();
  let privat: Uint8Array;
  try {
    privat = ausHex(rohSchluessel);
  } catch {
    return {
      text: `${auftrag.schluessel} enthält keinen Schlüssel in Hexform.`,
      code: 2,
    };
  }
  // Ed25519: 32 Byte. Ein längerer oder kürzerer Wert ist ein anderer
  // Dateiinhalt und keine Schluesseldatei — das hier zu prüfen erspart eine
  // Ausnahme aus der Tiefe der Kryptobibliothek.
  if (privat.byteLength !== 32) {
    return {
      text: `${auftrag.schluessel} ist kein Ed25519-Schlüssel (${String(privat.byteLength)} statt 32 Byte).`,
      code: 2,
    };
  }

  const bytes = new Uint8Array(await fsp.readFile(auftrag.paket));
  const stand: Programmstand = {
    version: auftrag.version,
    // **Nur der Name, nie der Pfad.** Die Prüfung lehnt einen Dateinamen mit
    // Pfadanteil ab (§ M7.2), und richtig so: Er zeigte sonst aus dem Ordner
    // heraus.
    datei: path.basename(auftrag.paket),
    groesse: bytes.byteLength,
    sha256: sha256HexBytes(bytes),
    plattform,
    veroeffentlicht: new Date().toISOString(),
    ...(auftrag.hinweis === undefined ? {} : { hinweis: auftrag.hinweis }),
  };

  const manifest = await signiereStand(stand, privat);
  const ziel = auftrag.ziel ?? path.join(path.dirname(path.resolve(auftrag.paket)), "manifest.json");
  await fsp.writeFile(ziel, `${JSON.stringify(manifest, undefined, 2)}\n`, "utf8");

  return {
    text: [
      `Manifest geschrieben: ${path.resolve(ziel)}`,
      `  Fassung:     ${stand.version}`,
      `  Datei:       ${stand.datei} (${String(stand.groesse)} Byte)`,
      `  SHA-256:     ${stand.sha256}`,
      `  Plattform:   ${stand.plattform}${auftrag.plattform === undefined ? " (aus der Endung)" : ""}`,
      `  Schlüssel:   ${manifest.pubkey}`,
      "",
      "Beide Dateien gehören zusammen: Legen Sie Paket **und** Manifest",
      "gemeinsam ab — auf den Share unter S1-Control\\programm\\ oder als die",
      "beiden Anhänge einer Veröffentlichung. Die Datei allein wird abgelehnt.",
    ].join("\n"),
    code: 0,
  };
}
