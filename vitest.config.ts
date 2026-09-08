import { defineConfig } from "vitest/config";

// Ein Lauf aus der Wurzel deckt alle Pakete ab. Die Aufteilung in Projekte
// folgt der Ringordnung aus 02-ZIELBILD.md und ist selbst schon ein Nachweis:
//
//   domaene-node / domaene-jsdom  dieselben Tests in beiden Umgebungen.
//                                 Genau daran zeigt sich, dass der Fachkern
//                                 weder Node-Globals noch ein DOM braucht.
//   pakete                        speicher, netz, ausgaben, cli — Node.
//   desktop-renderer              der Renderer-Anteil der Schale — jsdom.
//
// Die Aliase zeigen bewusst auf die Quellen statt auf die gebauten dist/-
// Ordner: `npm test` soll ohne vorherigen `tsc -b` laufen. Die Auflösung über
// `exports` und `dist/` prüft im Gegenzug `npm run typecheck`.
const quelle = (pfad: string) => new URL(pfad, import.meta.url).pathname;

const alias = {
  "@bos/kern": quelle("./vendor/bos-kern/src/index.ts"),
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
          name: "desktop-renderer",
          environment: "jsdom",
          include: ["apps/desktop/src/renderer/**/*.test.ts"],
        },
      },
    ],
  },
});
