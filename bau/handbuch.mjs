/**
 * Erneuert die erzeugten Abschnitte des Handbuchs (M8.2).
 *
 * Vier Abschnitte, ein Aufruf: Tastenkarte, Ansichten, Abkürzungen,
 * Störfälle. Derselbe Weg über `dist/` wie bei der Kurzanleitung und aus
 * demselben Grund — ein Skript mit eigenem Auflöser wäre ein zweiter
 * Auflösungsweg neben Vitest und dem Bündler.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { mitHandbuchabschnitten } = await import(
  path.join(wurzel, "packages", "ausgaben", "dist", "index.js")
);

const ziel = path.join(wurzel, "docs", "v2", "HANDBUCH.md");
const vorher = readFileSync(ziel, "utf8");
const nachher = mitHandbuchabschnitten(vorher);
if (vorher === nachher) {
  console.log("Handbuch ist bereits auf dem Stand der Listen.");
} else {
  writeFileSync(ziel, nachher, "utf8");
  console.log(`Handbuch erneuert: ${ziel}`);
}
