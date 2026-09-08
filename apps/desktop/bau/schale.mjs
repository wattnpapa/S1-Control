// Baut Main-Prozess und Preload der Electron-Schale.
//
// Warum esbuild und nicht tsup: 02-ZIELBILD.md nennt tsup, aber tsup bringt
// fuer Typdeklarationen eine eigene TypeScript-Schiene mit und wuerde damit
// eine dritte TypeScript-Fassung neben TS 7 (Bau und Typpruefung) und der
// TS-6-Kompatibilitaetsschiene fuer ESLint in den Baum holen. Die Schale
// braucht ueberhaupt keine Deklarationsdateien — sie wird nie importiert,
// sondern nur gestartet. Uebrig bleibt genau das, was esbuild ohnehin
// erledigt: buendeln. Die Typpruefung macht `tsc -b`, nicht der Buendler.
//
// Zwei Ausgabeformate, mit Absicht:
//   out/main.mjs    ESM — Electron 43 laedt ESM-Main.
//   out/preload.cjs CommonJS — Preload-Skripte werden in der Sandbox
//                   ausschliesslich als CommonJS geladen.

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hierher = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(hierher, "..");

const gemeinsam = {
  bundle: true,
  platform: "node",
  target: "node22",
  sourcemap: true,
  // Electron liefert sich selbst; alles andere wird eingebuendelt, damit die
  // spaetere Paketierung keine Workspace-Symlinks aufloesen muss.
  external: ["electron"],
  logLevel: "info",
};

await build({
  ...gemeinsam,
  entryPoints: [path.join(app, "src/main/main.ts")],
  outfile: path.join(app, "out/main.mjs"),
  format: "esm",
});

await build({
  ...gemeinsam,
  entryPoints: [path.join(app, "src/main/preload.ts")],
  outfile: path.join(app, "out/preload.cjs"),
  format: "cjs",
});
