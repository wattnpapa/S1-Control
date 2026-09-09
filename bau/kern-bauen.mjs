// Baut das Submodul `vendor/eeb-format` nach `vendor/eeb-format/dist/`.
//
// Warum ein eigenes Skript statt sich auf das `prepare`-Skript des Kerns zu
// verlassen: Neuere npm-Versionen fuehren Install-Skripte von Abhaengigkeiten
// nicht mehr ungefragt aus (siehe README des Kerns). Bleibt `dist/` leer,
// finden `tsc -b`, Vitest und Electron die Typen und das JavaScript des Kerns
// nicht. Dieses Skript laeuft als `postinstall` der Wurzel und ist damit
// unabhaengig von der Freigabe fremder Install-Skripte.
//
// Ist das Submodul nicht ausgecheckt (frischer Klon ohne
// `git submodule update --init`), bricht das Skript mit einem klaren Hinweis
// ab, statt eine unverstaendliche Compilerfehlermeldung zu erzeugen.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kern = path.join(wurzel, "vendor", "eeb-format");
const bauKonfiguration = path.join(kern, "tsconfig.build.json");

if (!existsSync(bauKonfiguration)) {
  console.error(
    [
      "Das Submodul vendor/eeb-format ist nicht ausgecheckt.",
      "Bitte einmalig ausfuehren:",
      "",
      "    git submodule update --init --recursive",
      "",
    ].join("\n"),
  );
  process.exit(1);
}

// Aufgerufen wird die JavaScript-Datei des Compilers, nicht der Shim aus
// `node_modules/.bin`. Grund: Auf Windows ist der Shim eine `.cmd`-Datei, und
// Node verweigert seit 20.12.2 das Starten von `.cmd` und `.bat` ohne
// `shell: true` (Absicherung gegen CVE-2024-27980). `spawnSync` schlaegt dann
// mit `EINVAL` fehl, `status` bleibt `null`, und ohne die Fehlerpruefung
// weiter unten endete dieses Skript stumm mit Code 1 — genau der stille
// Fehlschlag, den es zu vermeiden gilt.
//
// Der Umweg ueber `process.execPath` braucht keine Shell und verhaelt sich auf
// allen drei Betriebssystemen gleich (Entscheidung 13: Windows ist das
// Produkt, macOS die Entwicklungsplattform, Linux der CI-Lauf).
const tscSkript = path.join(wurzel, "node_modules", "@typescript", "native", "bin", "tsc");

if (!existsSync(tscSkript)) {
  console.error(
    [
      `Der TypeScript-Compiler wurde nicht gefunden: ${tscSkript}`,
      "Bitte zuerst `npm install` in der Wurzel ausfuehren.",
      "Aendert sich der Paketname in package.json, ist dieser Pfad mitzuziehen.",
    ].join("\n"),
  );
  process.exit(1);
}

const lauf = spawnSync(process.execPath, [tscSkript, "-p", bauKonfiguration], {
  stdio: "inherit",
  cwd: wurzel,
});

// `spawnSync` meldet einen gescheiterten Start nicht ueber `status`, sondern
// ueber `error`. Ohne diese Pruefung waere jeder Startfehler ein wortloses
// Beenden mit Code 1.
if (lauf.error) {
  console.error(`Der TypeScript-Compiler liess sich nicht starten: ${lauf.error.message}`);
  process.exit(1);
}

process.exit(lauf.status ?? 1);
