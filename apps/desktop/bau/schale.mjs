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
//   out/main.mjs        ESM — Electron 43 laedt ESM-Main.
//   out/akte-worker.mjs ESM — ein `worker_thread` je offener Akte (M2.1).
//                       Eigenes Buendel, weil `new Worker(datei)` eine Datei
//                       braucht und keinen Modulverweis; es liegt neben
//                       main.mjs, damit der Main den Pfad ohne Suche kennt.
//   out/preload.cjs     CommonJS — Preload-Skripte werden in der Sandbox
//                       ausschliesslich als CommonJS geladen.
//   out/web.mjs         ESM — die Web-Schale (ADR-005): derselbe Kern hinter
//                       einem HTTP-Dienst statt hinter Fenstern. Ohne
//                       Electron, damit `node out/web.mjs` in einem Container
//                       laeuft, in dem es keines gibt; sie findet
//                       akte-worker.mjs und renderer/ neben sich.

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
  entryPoints: [path.join(app, "src/worker/akte-worker.ts")],
  outfile: path.join(app, "out/akte-worker.mjs"),
  format: "esm",
});

await build({
  ...gemeinsam,
  entryPoints: [path.join(app, "src/main/preload.ts")],
  outfile: path.join(app, "out/preload.cjs"),
  format: "cjs",
});

await build({
  ...gemeinsam,
  entryPoints: [path.join(app, "src/web/web.ts")],
  outfile: path.join(app, "out/web.mjs"),
  format: "esm",
});
