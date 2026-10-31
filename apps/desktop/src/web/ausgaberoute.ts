/**
 * Die Ausgaberoute der Web-Schale: `GET /ausgabe?pfad=…[&laden=1]`.
 *
 * **Warum.** In der Web-Schale liegt die erzeugte Datei auf dem Server, und
 * ein „Öffnen“ dort hilft dem Browser nicht. Ohne diese Route bleibt die
 * Einheitenliste als HTML ein Pfadname — die Papier-Rückfallebene wäre vom
 * Handy aus unerreichbar. Die Route liefert die Datei an den Browser, der sie
 * anzeigt, druckt (`window.print()`) oder speichert.
 *
 * **Was ausgeliefert wird.** Genau eine Datei im Ausgabeordner eines
 * Einsatzes: `<share>/einsaetze/<einsatz>/ausgaben/<datei>` mit der Endung
 * `.html`, `.pdf` oder `.xlsx`. Der Pfad kommt aus der Anfrage und wird
 * aufgelöst (`..`, Schrägstriche, Symlinks) und erst danach gegen diese Form
 * geprüft; alles andere ist 404, ohne zu verraten, was es sonst gäbe.
 */

import * as fsp from "node:fs/promises";
import type http from "node:http";
import path from "node:path";

const ORDNER_EINSAETZE = "einsaetze";
const ORDNER_AUSGABEN = "ausgaben";

const TYPEN: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".pdf": "application/pdf",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/**
 * Löst den gewünschten Pfad auf — oder `undefined`, wenn er keine Ausgabe
 * eines Einsatzes unter `sharePfad` ist.
 */
export async function loeseAusgabePfad(sharePfad: string, gewuenscht: string): Promise<string | undefined> {
  if (gewuenscht.length === 0 || gewuenscht.includes("\0")) return undefined;
  const wurzel = path.resolve(sharePfad, ORDNER_EINSAETZE);
  const datei = path.resolve(gewuenscht);
  if (!(path.extname(datei).toLowerCase() in TYPEN)) return undefined;
  const teile = path.relative(wurzel, datei).split(path.sep);
  // <einsatz>/ausgaben/<datei> — genau drei Teile, keiner zeigt nach oben.
  if (teile.length !== 3 || teile[1] !== ORDNER_AUSGABEN || teile.some((t) => t === ".." || t === "")) {
    return undefined;
  }
  try {
    // Ein Symlink im Ausgabeordner darf nicht aus dem Share hinausführen.
    const echt = await fsp.realpath(datei);
    const echteWurzel = await fsp.realpath(wurzel);
    if (!echt.startsWith(echteWurzel + path.sep)) return undefined;
    if (!(await fsp.stat(echt)).isFile()) return undefined;
  } catch {
    return undefined;
  }
  return datei;
}

/** Macht aus der gerenderten Ausgabe eine Bildschirmseite mit „Drucken“-Knopf. */
export function mitDruckknopf(html: string): string {
  const kopf =
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    "<style>@media screen{body{font-size:12pt!important;margin:8px!important}" +
    ".druckleiste{position:sticky;top:0;background:#fff;padding:8px 0;z-index:1}" +
    ".druckleiste button{font-size:16px;min-height:44px;padding:0 20px}}" +
    "@media print{.druckleiste{display:none}}</style>";
  const leiste =
    '<div class="druckleiste"><button type="button" onclick="window.print()">Drucken</button></div>';
  return html
    .replace("</head>", `${kopf}</head>`)
    .replace(/<body([^>]*)>/u, `<body$1>${leiste}`);
}

function nichtGefunden(antwort: http.ServerResponse): void {
  antwort.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  antwort.end("Nicht gefunden.");
}

/** Beantwortet `GET /ausgabe`; `sharePfad` ist der eingehängte Share des Dienstes. */
export async function liefereAusgabe(
  sharePfad: string,
  url: URL,
  antwort: http.ServerResponse,
  nurKopf: boolean,
): Promise<void> {
  const datei = await loeseAusgabePfad(sharePfad, url.searchParams.get("pfad") ?? "");
  if (datei === undefined) return nichtGefunden(antwort);
  const endung = path.extname(datei).toLowerCase();
  let inhalt: Buffer;
  try {
    inhalt = await fsp.readFile(datei);
  } catch {
    return nichtGefunden(antwort);
  }
  const laden = url.searchParams.get("laden") === "1";
  if (endung === ".html" && !laden) inhalt = Buffer.from(mitDruckknopf(inhalt.toString("utf8")), "utf8");
  const name = encodeURIComponent(path.basename(datei));
  antwort.writeHead(200, {
    "content-type": TYPEN[endung] ?? "application/octet-stream",
    "content-length": inhalt.length,
    "content-disposition": `${laden || endung === ".xlsx" ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    // Die Seite ist unsere eigene, aber ihr Inhalt stammt aus Freitext: kein
    // fremdes Skript, nur der eigene Knopf.
    ...(endung === ".html" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:" } : {}),
  });
  antwort.end(nurKopf ? undefined : inhalt);
}
