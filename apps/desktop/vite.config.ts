import { defineConfig } from "vite";

// Vite 8 baut ausschliesslich den Renderer. Main und Preload gehen einen
// eigenen Weg (siehe bau/schale.mjs), weil sie kein Browser-Bundle sind.
//
// `base: "./"` ist Pflicht: Electron laedt die Seite ueber `loadFile`, also
// ueber das file:-Schema. Absolute Pfade wuerden dort ins Leere zeigen.
export default defineConfig({
  root: new URL("./src/renderer", import.meta.url).pathname,
  base: "./",
  build: {
    outDir: new URL("./out/renderer", import.meta.url).pathname,
    emptyOutDir: true,
    target: "chrome138",
  },
});
