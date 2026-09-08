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

const tsc = path.join(
  wurzel,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);

if (!existsSync(tsc)) {
  console.error("tsc nicht gefunden — bitte zuerst `npm install` in der Wurzel ausfuehren.");
  process.exit(1);
}

const lauf = spawnSync(tsc, ["-p", bauKonfiguration], { stdio: "inherit", cwd: wurzel });
process.exit(lauf.status ?? 1);
