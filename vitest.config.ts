import process from "node:process";

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
//                                 (ADR-003), der Roundtrip des eeb-Adapters
//                                 ueber die 443 Beispielboegen und die
//                                 Goldfiles der Ausgaben (M4.1). Node, weil
//                                 alles davon Dateien liest — genau deshalb
//                                 steht es nicht in Ring 2.
//   fremdleser                    die Nachweise gegen **fremde** Leser (M4.0,
//                                 M4.2): `unzip` fuer das ZIP-Format,
//                                 LibreOffice fuer die XLSX-Auswertung. Ein
//                                 Schreiber, der nur gegen den eigenen Leser
//                                 geprueft ist, prueft, ob er zu sich selbst
//                                 passt — bei einem Dateiformat die wertlose
//                                 Aussage.
//
//                                 **Nur auf Linux.** Die beiden Werkzeuge
//                                 stehen auf den Windows- und macOS-Laeufern
//                                 der CI-Matrix nicht zuverlaessig zur
//                                 Verfuegung. Das ist kein uebersprungener
//                                 Test, sondern ein Projekt, das dort nicht
//                                 existiert: Was geprueft wird, ist eine
//                                 Eigenschaft der **Datei** und nicht der
//                                 Plattform, die sie erzeugt hat — und die
//                                 Datei ist auf allen drei Plattformen
//                                 dieselbe (der Schreiber kennt kein `node:`).
//                                 Der Linux-Lauf genuegt deshalb.
//   desktop-schale                Kontrakt, Worker und Main der Schale — Node.
//                                 Hier laeuft der Mehrclient-Nachweis aus
//                                 M2.3 ueber das echte Dateisystem.
//   desktop-renderer              der Renderer-Anteil der Schale — jsdom.
//
// Die Aliase zeigen bewusst auf die Quellen statt auf die gebauten dist/-
// Ordner: `npm test` soll ohne vorherigen `tsc -b` laufen. Die Auflösung über
// `exports` und `dist/` prüft im Gegenzug `npm run typecheck`.
const quelle = (pfad: string) => new URL(pfad, import.meta.url).pathname;

/** Die Nachweise, die fremde Programme brauchen (siehe Kopfkommentar). */
const FREMDLESER = ["bau/**/*-fremdleser.test.ts"] as const;

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
          exclude: [...FREMDLESER],
        },
      },
      ...(process.platform === "linux"
        ? [
            {
              resolve: { alias },
              test: {
                name: "fremdleser",
                environment: "node",
                include: [...FREMDLESER],
                // LibreOffice startet beim ersten Lauf sein Profil neu auf;
                // das dauert laenger als die Vorgabe von fuenf Sekunden.
                testTimeout: 120_000,
              },
            },
          ]
        : []),
      {
        resolve: { alias },
        test: {
          name: "desktop-schale",
          environment: "node",
          include: [
            "apps/desktop/src/kontrakt/**/*.test.ts",
            "apps/desktop/src/worker/**/*.test.ts",
            "apps/desktop/src/main/**/*.test.ts",
            "apps/desktop/src/web/**/*.test.ts",
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
