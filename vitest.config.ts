import { defineConfig } from "vitest/config";

// Ein Lauf aus der Wurzel deckt alle Pakete ab. Die Aufteilung in Projekte
// folgt der Ringordnung aus 02-ZIELBILD.md und ist selbst schon ein Nachweis:
//
//   domaene-node / domaene-jsdom  dieselben Tests in beiden Umgebungen.
//                                 Genau daran zeigt sich, dass der Fachkern
//                                 weder Node-Globals noch ein DOM braucht.
//   pakete                        speicher, netz, ausgaben, cli — Node.
//   bau                           was ueber den Paketen liegt: die
//                                 Aufnahmeregeln der Kernpakete unter vendor/
//                                 (ADR-003) und der Roundtrip des
//                                 eeb-Adapters ueber die 443 Beispielboegen.
//                                 Node, weil beides Dateien liest — genau
//                                 deshalb steht es nicht in Ring 2.
//   desktop-schale                Kontrakt, Worker und Main der Schale — Node.
//                                 Hier laeuft der Mehrclient-Nachweis aus
//                                 M2.3 ueber das echte Dateisystem.
//   desktop-renderer              der Renderer-Anteil der Schale — jsdom.
//
// Die Aliase zeigen bewusst auf die Quellen statt auf die gebauten dist/-
// Ordner: `npm test` soll ohne vorherigen `tsc -b` laufen. Die Auflösung über
// `exports` und `dist/` prüft im Gegenzug `npm run typecheck`.
const quelle = (pfad: string) => new URL(pfad, import.meta.url).pathname;

const alias = {
  "@bos/eeb-format": quelle("./vendor/eeb-format/src/index.ts"),
  "@bos/vokabulare": quelle("./vendor/bos-vokabulare/src/index.ts"),
  "@bos/meldekopf": quelle("./vendor/bos-meldekopf/src/index.ts"),
  "@s1/domaene": quelle("./packages/domaene/src/index.ts"),
  "@s1/speicher": quelle("./packages/speicher/src/index.ts"),
  "@s1/netz": quelle("./packages/netz/src/index.ts"),
  "@s1/ausgaben": quelle("./packages/ausgaben/src/index.ts"),
  "@s1/cli": quelle("./packages/cli/src/index.ts"),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "domaene-node",
          environment: "node",
          include: ["packages/domaene/src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "domaene-jsdom",
          environment: "jsdom",
          include: ["packages/domaene/src/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "pakete",
          environment: "node",
          include: [
            "packages/speicher/src/**/*.test.ts",
            "packages/netz/src/**/*.test.ts",
            "packages/ausgaben/src/**/*.test.ts",
            "packages/cli/src/**/*.test.ts",
          ],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "bau",
          environment: "node",
          include: ["bau/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "desktop-schale",
          environment: "node",
          include: [
            "apps/desktop/src/kontrakt/**/*.test.ts",
            "apps/desktop/src/worker/**/*.test.ts",
            "apps/desktop/src/main/**/*.test.ts",
          ],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "desktop-renderer",
          environment: "jsdom",
          include: ["apps/desktop/src/renderer/**/*.test.ts", "apps/desktop/src/renderer/**/*.test.tsx"],
        },
      },
    ],
  },
});
