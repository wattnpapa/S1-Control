/**
 * Der PDF-Weg der Web-Schale: Chromium ohne Fenster auf dem Server.
 *
 * Bisher gab es Listen-PDFs nur in der Desktop-App (`main/drucker.ts`,
 * `printToPDF`); im Browser hieß es „als HTML erzeugen und drucken“. Das
 * reicht im Einsatz nicht: Wer im Browser arbeitet, braucht die Datei zum
 * Weiterschicken und Ablegen (Rückmeldung 2026-11-22, ADR-008 Nachtrag).
 *
 * **Dieselbe Seite, kein zweites Layout.** Gerendert wird genau das HTML,
 * das auch die Desktop-App druckt; Chromium beachtet wie dort die
 * `@page`-Regel der Vorlage. Es gibt keine npm-Abhängigkeit: Aufgerufen wird
 * das Programm `chromium` des Servers (im Container per `apt`, Pfad über
 * `S1_CHROMIUM` oder die Suche im `PATH`). Fehlt es, bleibt alles wie bisher:
 * Die Vermittlung meldet je Ruf, dass PDF hier nicht geht.
 *
 * Je Ausdruck ein eigenes Arbeitsverzeichnis mit Eingabe, Ausgabe und Profil;
 * es wird danach gelöscht, auch wenn Chromium scheitert.
 */

import { execFile } from "node:child_process";
import { constants as fsKonstanten } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { Drucker } from "../main/vermittlung.js";

/** So lange darf ein Ausdruck dauern; große Listen brauchen einige Sekunden. */
export const DRUCKFRIST_MS = 60_000;

/** Die Programmnamen, nach denen im `PATH` gesucht wird, in dieser Reihenfolge. */
export const CHROMIUM_NAMEN = ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"] as const;

/** Die Aufrufparameter; `profil` hält Chromium von `~/.config` fern. */
export function chromiumArgumente(eingabe: string, ausgabe: string, profil: string): readonly string[] {
  return [
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    "--no-pdf-header-footer",
    `--user-data-dir=${profil}`,
    `--print-to-pdf=${ausgabe}`,
    pathToFileURL(eingabe).href,
  ];
}

/**
 * Querformat für Vorlagen ohne eigene Seitengröße. Die Regel steht vor dem
 * Inhalt der Seite: Bringt die Vorlage eine eigene `@page`-Größe mit, kommt
 * sie später und gilt.
 */
export function mitAusrichtung(html: string, quer: boolean): string {
  if (!quer) return html;
  const regel = "<style>@page { size: A4 landscape; }</style>";
  const kopf = /<head[^>]*>/iu.exec(html);
  return kopf === null ? `${regel}${html}` : html.replace(kopf[0], `${kopf[0]}${regel}`);
}

function fuehreAus(programm: string, argumente: readonly string[]): Promise<void> {
  return new Promise((erfuellt, abgelehnt) => {
    execFile(programm, [...argumente], { timeout: DRUCKFRIST_MS, windowsHide: true }, (fehler) => {
      if (fehler === null) erfuellt();
      else abgelehnt(new Error(`Chromium hat kein PDF erzeugt: ${fehler.message.split("\n")[0] ?? ""}`));
    });
  });
}

export function chromDrucker(programm: string): Drucker {
  return {
    async alsPdf(html: string, quer: boolean): Promise<Uint8Array> {
      const ordner = await fs.mkdtemp(path.join(os.tmpdir(), "s1-pdf-"));
      try {
        const eingabe = path.join(ordner, "seite.html");
        const ausgabe = path.join(ordner, "seite.pdf");
        await fs.writeFile(eingabe, mitAusrichtung(html, quer), "utf8");
        await fuehreAus(programm, chromiumArgumente(eingabe, ausgabe, path.join(ordner, "profil")));
        return new Uint8Array(await fs.readFile(ausgabe));
      } finally {
        await fs.rm(ordner, { recursive: true, force: true });
      }
    },
  };
}

async function ausfuehrbar(datei: string): Promise<boolean> {
  try {
    await fs.access(datei, fsKonstanten.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Das Chromium des Servers: `S1_CHROMIUM`, sonst der erste Treffer im `PATH`;
 * `undefined`, wenn keins da ist. Ein gesetztes, aber nicht ausführbares
 * `S1_CHROMIUM` zählt als „keins“ — die Vermittlung meldet dann wie bisher.
 */
export async function findeChromium(umgebung: NodeJS.ProcessEnv): Promise<string | undefined> {
  const vorgabe = umgebung["S1_CHROMIUM"]?.trim();
  if (vorgabe !== undefined && vorgabe !== "") return (await ausfuehrbar(vorgabe)) ? vorgabe : undefined;
  for (const verzeichnis of (umgebung["PATH"] ?? "").split(path.delimiter)) {
    if (verzeichnis === "") continue;
    for (const name of CHROMIUM_NAMEN) {
      const datei = path.join(verzeichnis, name);
      if (await ausfuehrbar(datei)) return datei;
    }
  }
  return undefined;
}
