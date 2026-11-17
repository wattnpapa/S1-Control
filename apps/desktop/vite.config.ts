import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

// Vite 8 baut ausschliesslich den Renderer. Main und Preload gehen einen
// eigenen Weg (siehe bau/schale.mjs), weil sie kein Browser-Bundle sind.
//
// Pfade ueber `fileURLToPath`, nicht ueber `URL.pathname`: Letzteres liefert
// unter Windows `/D:/…`, und Vite fand den Einstieg `index.html` dort nicht
// (CI, windows-latest).
//
// `base: "./"` ist Pflicht: Electron laedt die Seite ueber `loadFile`, also
// ueber das file:-Schema. Absolute Pfade wuerden dort ins Leere zeigen.
export default defineConfig({
  root: fileURLToPath(new URL("./src/renderer", import.meta.url)),
  base: "./",
  build: {
    outDir: fileURLToPath(new URL("./out/renderer", import.meta.url)),
    emptyOutDir: true,
    target: "chrome138",
  },
});
