/**
 * Erneuert die Störfallmatrix in der Kurzanleitung (M7.3).
 *
 * Der Weg über `dist/` und nicht über die Quellen: Der Baum wird ohnehin mit
 * `tsc -b` gebaut, und ein Skript mit eigenem Auflöser wäre ein zweiter
 * Auflösungsweg neben Vitest und dem Bündler — genau das, was 02-ZIELBILD.md
 * für die Aliase vermeidet.
 *
 * Ob die Datei im Baum zum Stand der Matrix passt, prüft `bau/kurzanleitung.test.ts`.
 * Dieses Skript ist der Weg, sie in Übereinstimmung zu bringen.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { mitStoerfallmatrix } = await import(
  path.join(wurzel, "packages", "ausgaben", "dist", "index.js")
);

const ziel = path.join(wurzel, "docs", "v2", "KURZANLEITUNG.md");
const vorher = readFileSync(ziel, "utf8");
const nachher = mitStoerfallmatrix(vorher);
if (vorher === nachher) {
  console.log("Kurzanleitung ist bereits auf dem Stand der Matrix.");
} else {
  writeFileSync(ziel, nachher, "utf8");
  console.log(`Kurzanleitung erneuert: ${ziel}`);
}
