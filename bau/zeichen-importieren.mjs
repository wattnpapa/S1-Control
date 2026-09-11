/**
 * Importiert die taktischen Zeichen aus jonas-koeritz/Taktische-Zeichen.
 *
 * **Warum ein Import und keine eigene Zeichnung.** Die Zeichen sind genormt;
 * sie selbst zu zeichnen hiesse, eine Norm nachzubauen und bei jeder Ergaenzung
 * hinterherzuziehen. Der Zeichensatz oben wird gepflegt, steht unter CC BY 4.0
 * (Quellen) beziehungsweise CC0 (fertige Zeichen) und liefert genau die
 * Geometrie, auf die der Entwurf der Oberflaeche sich beruft: Zeichenflaeche
 * 256x256, Fuehrungsstellen-Flagge, Roboto Slab Bold.
 *
 * **Warum die Schrift herausgeloest wird.** Jedes gerenderte SVG traegt die
 * Schrift als base64 mit — rund 25 kB je Datei, bei knapp tausend Zeichen
 * ueber zwanzig Megabyte. Die Schrift ist in allen Dateien dieselbe. Sie wird
 * deshalb **einmal** abgelegt (`schrift/RobotoSlab-Bold.woff`, Apache-2.0) und
 * aus den Zeichen entfernt; die Oberflaeche bindet sie mit einem `@font-face`
 * ein. Das ist zugleich die Antwort auf den Offline-Betrieb: Die Anwendung
 * laedt keine Schrift aus dem Netz (02-ZIELBILD.md).
 *
 * Aufruf (siehe `.github/workflows/taktische-zeichen.yml`):
 *
 *     node bau/zeichen-importieren.mjs --quelle <build/svg> --commit <sha> [--datum <iso>]
 */

import { Buffer } from "node:buffer";
import * as fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL_VORGABE = path.join(WURZEL, "apps/desktop/assets/tz");
const QUELLE_REPO = "https://github.com/jonas-koeritz/Taktische-Zeichen";

/** Liest `--name wert` aus der Befehlszeile. */
function argument(name, vorgabe) {
  const stelle = process.argv.indexOf(`--${name}`);
  if (stelle === -1 || stelle + 1 >= process.argv.length) {
    if (vorgabe !== undefined) return vorgabe;
    throw new Error(`Es fehlt --${name}.`);
  }
  return process.argv[stelle + 1];
}

/** Alle .svg unterhalb eines Ordners, relativ und sortiert. */
async function svgDateien(wurzel, praefix = "") {
  const eintraege = await fsp.readdir(path.join(wurzel, praefix), { withFileTypes: true });
  const gefunden = [];
  for (const eintrag of eintraege) {
    const relativ = path.join(praefix, eintrag.name);
    if (eintrag.isDirectory()) gefunden.push(...(await svgDateien(wurzel, relativ)));
    else if (eintrag.name.endsWith(".svg")) gefunden.push(relativ);
  }
  return gefunden.sort();
}

/**
 * Loest die eingebettete Schrift heraus.
 *
 * Gesucht wird die base64-Nutzlast der `@font-face`-Regel. Findet sich keine,
 * ist das kein Fehler: Nicht jedes Zeichen traegt Text.
 */
function schriftAus(inhalt) {
  const treffer = /url\("data:application\/font-woff;charset=utf-8;base64,([A-Za-z0-9+/=]+)"\)/.exec(inhalt);
  return treffer === null ? undefined : treffer[1];
}

/**
 * Nimmt den `<defs><style>`-Block mit der Schrift heraus und laesst alles
 * andere stehen — auch `<defs>` mit `clipPath`, den mehrere Zeichen brauchen.
 */
function ohneSchrift(inhalt) {
  return inhalt
    .replace(/<style type="text\/css">[\s\S]*?<\/style>\s*/g, "")
    .replace(/<defs>\s*<\/defs>/g, "<defs></defs>")
    .replace(/\n\s*\n/g, "\n");
}

/** Der Titel aus dem SVG — die ausgeschriebene Bedeutung des Zeichens. */
function titelAus(inhalt, rueckfall) {
  const treffer = /<title>([\s\S]*?)<\/title>/.exec(inhalt);
  return treffer === null ? rueckfall : treffer[1].trim();
}

async function hauptlauf() {
  const quelle = path.resolve(argument("quelle"));
  const commit = argument("commit");
  const datum = argument("datum", new Date().toISOString().slice(0, 10));
  // `--ziel` gibt es, damit der Test den Lauf in ein Wegwerfverzeichnis lenken
  // kann. Im Betrieb steht die Vorgabe.
  const ZIEL = path.resolve(argument("ziel", ZIEL_VORGABE));

  const dateien = await svgDateien(quelle);
  if (dateien.length === 0) throw new Error(`Unter ${quelle} liegt kein SVG.`);

  // Das Ziel wird geleert: Ein Zeichen, das oben entfaellt, soll auch hier
  // verschwinden — sonst waechst der Satz mit jeder Umbenennung.
  await fsp.rm(ZIEL, { recursive: true, force: true });
  await fsp.mkdir(ZIEL, { recursive: true });

  let schrift;
  const verzeichnis = [];

  for (const relativ of dateien) {
    const roh = await fsp.readFile(path.join(quelle, relativ), "utf8");
    schrift ??= schriftAus(roh);
    const inhalt = `${ohneSchrift(roh).trim()}\n`;
    const ziel = path.join(ZIEL, relativ);
    await fsp.mkdir(path.dirname(ziel), { recursive: true });
    await fsp.writeFile(ziel, inhalt, "utf8");
    verzeichnis.push({
      kennung: relativ.replace(/\.svg$/, "").replaceAll(path.sep, "/"),
      kategorie: path.dirname(relativ).replaceAll(path.sep, "/"),
      name: path.basename(relativ, ".svg"),
      titel: titelAus(roh, path.basename(relativ, ".svg")),
      datei: relativ.replaceAll(path.sep, "/"),
    });
  }

  if (schrift !== undefined) {
    await fsp.mkdir(path.join(ZIEL, "schrift"), { recursive: true });
    await fsp.writeFile(
      path.join(ZIEL, "schrift/RobotoSlab-Bold.woff"),
      Buffer.from(schrift, "base64"),
    );
  }

  await fsp.writeFile(
    path.join(ZIEL, "index.json"),
    `${JSON.stringify({ herkunft: QUELLE_REPO, commit, stand: datum, zeichen: verzeichnis }, undefined, 2)}\n`,
    "utf8",
  );

  await fsp.writeFile(
    path.join(ZIEL, "HERKUNFT.md"),
    [
      "# Taktische Zeichen — Herkunft",
      "",
      "Dieser Ordner wird **erzeugt**. Von Hand geänderte Dateien überschreibt der",
      "nächste Lauf von `bau/zeichen-importieren.mjs`; die wöchentliche Aktion",
      "`.github/workflows/taktische-zeichen.yml` ruft ihn auf.",
      "",
      `Quelle: ${QUELLE_REPO}`,
      `Stand: ${commit} (${datum})`,
      `Zeichen: ${String(verzeichnis.length)}`,
      "",
      "Die Quellen des Zeichensatzes stehen unter CC BY 4.0, die daraus erzeugten",
      "Zeichen unter CC0 1.0. Die Schrift `schrift/RobotoSlab-Bold.woff` ist",
      "RobotoSlab-Bold unter Apache-2.0; sie liegt einmal hier statt eingebettet in",
      "jedem Zeichen und wird von der Oberfläche per `@font-face` geladen — die",
      "Anwendung lädt keine Schrift aus dem Netz.",
      "",
      "`index.json` führt jedes Zeichen mit Kategorie, Dateiname und dem",
      "ausgeschriebenen Titel aus dem SVG.",
      "",
    ].join("\n"),
    "utf8",
  );

  process.stdout.write(`${String(verzeichnis.length)} Zeichen nach ${ZIEL} geschrieben.\n`);
}

await hauptlauf();
