/**
 * Die Aufnahmeregeln der geteilten Kernpakete, hier nachgewiesen (M1.1).
 *
 * ADR-003 stellt sechs Aufnahmeregeln auf; die zweite ist die harte:
 * **keine `node:`-, DOM- oder React-Importe**, und fuer S1-Control kommt die
 * DoD von M1.1 hinzu: **kein Capacitor und kein `localStorage`**. Die Pakete
 * pruefen das in ihren eigenen Repositorien; hier steht der Nachweis auf
 * **dieser** Seite, weil hier die Ringgrenze verlaeuft und weil ein Pin auf
 * einen Commit gezogen werden kann, der die Regel bricht.
 *
 * Geprueft wird der **Quelltext der gepinnten Staende**, nicht `dist/`: Ein
 * Bau kann Importe verschlucken, ein Quelltext nicht. Testdateien der Pakete
 * bleiben aussen vor — sie laufen nie im Produkt.
 *
 * Ein Fehlschlag hier heisst nicht „der Kern ist kaputt", sondern „dieser Pin
 * gehoert nicht in S1-Control".
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const WURZEL = path.resolve(import.meta.dirname, "..", "..");

/** Die drei Pakete, die S1-Control aufnimmt (ADR-003, Nachtrag vom 2026-09-10). */
const KERNPAKETE = ["eeb-format", "bos-vokabulare", "bos-meldekopf"] as const;

/**
 * `bos-taktische-zeichen` steht bewusst **nicht** in der Liste: M1.4 hat die
 * Zeichen-Inferenz aus v1 nach `@s1/domaene` geholt, und zwei Zeichenquellen
 * nebeneinander waeren zwei Wahrheiten ueber dieselbe Sache.
 */
const NICHT_AUFGENOMMEN = "bos-taktische-zeichen";

/**
 * Die **eine benannte Ausnahme** von Aufnahmeregel 2 (ADR-003).
 *
 * `qr-node.ts` importiert `node:zlib` und `qrcode`. In einem Format-Repo mit
 * mehreren Sprachimplementierungen ist das keine Ausnahme mehr: Aufnahmeregel
 * 2 gilt dort **je Implementierung**, nicht ueber das Repo hinweg. Fuer
 * S1-Control heisst das nur: Der Ring 2 fasst diese Datei nicht an — und
 * genau das prueft der Test unten.
 */
const NODE_AUSNAHMEN: ReadonlySet<string> = new Set(["vendor/eeb-format/src/qr-node.ts"]);

function quelldateien(verzeichnis: string): string[] {
  const gefunden: string[] = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const voll = path.join(verzeichnis, eintrag);
    if (statSync(voll).isDirectory()) {
      gefunden.push(...quelldateien(voll));
      continue;
    }
    if (!eintrag.endsWith(".ts") || eintrag.endsWith(".test.ts")) continue;
    gefunden.push(voll);
  }
  return gefunden;
}

/**
 * Entfernt Block- und Zeilenkommentare, laesst die Zeilenzahl aber stehen.
 *
 * Der Nachweis unten sucht nach Bezeichnern im **Code**; stuende ein
 * Kommentar mit im Text, waere die Erlaeuterung der Regel ihr eigener
 * Verstoss.
 */
function ohneKommentare(inhalt: string): string {
  return inhalt
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, "");
}

/** Alle `import`- und `export … from`-Ziele einer Datei. */
function importziele(datei: string): string[] {
  const inhalt = readFileSync(datei, "utf8");
  const ziele: string[] = [];
  const muster = /(?:^|\n)\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']/g;
  for (const treffer of inhalt.matchAll(muster)) ziele.push(treffer[1] as string);
  // `import "modul"` ohne Bindung faellt durch das Muster oben.
  for (const treffer of inhalt.matchAll(/(?:^|\n)\s*import\s+["']([^"']+)["']/g)) {
    ziele.push(treffer[1] as string);
  }
  return ziele;
}

const dateienJePaket = new Map<string, string[]>(
  KERNPAKETE.map((paket) => [paket, quelldateien(path.join(WURZEL, "vendor", paket, "src"))]),
);

describe.each(KERNPAKETE)("vendor/%s haelt die Aufnahmeregeln", (paket) => {
  const dateien = dateienJePaket.get(paket) as string[];

  it("hat ueberhaupt Quelltext — sonst pruefte dieser Test nichts", () => {
    expect(dateien.length).toBeGreaterThan(3);
  });

  it("importiert kein Node-Kernmodul ausser in der benannten Ausnahme (Aufnahmeregel 2)", () => {
    const treffer = dateien
      .filter((datei) => importziele(datei).some((ziel) => ziel.startsWith("node:")))
      .map((d) => path.relative(WURZEL, d))
      .filter((d) => !NODE_AUSNAHMEN.has(d));
    expect(treffer).toEqual([]);
  });

  it("importiert kein Capacitor-Paket (DoD M1.1)", () => {
    const treffer = dateien.filter((datei) =>
      importziele(datei).some((ziel) => ziel.startsWith("@capacitor")),
    );
    expect(treffer.map((d) => path.relative(WURZEL, d))).toEqual([]);
  });

  it("importiert kein React und keine Renderer-Bibliothek", () => {
    const verboten = ["react", "react-dom", "@testing-library", "zustand"];
    const treffer = dateien.filter((datei) =>
      importziele(datei).some((ziel) => verboten.some((v) => ziel === v || ziel.startsWith(`${v}/`))),
    );
    expect(treffer.map((d) => path.relative(WURZEL, d))).toEqual([]);
  });

  it("greift auf kein DOM-Global und auf kein `localStorage` (DoD M1.1)", () => {
    // Die Speicherhuelle wird injiziert (ADR-003, Erstschnitt: „`einsaetze`
    // mit injizierter Speicherhuelle statt direktem `localStorage`"); ein
    // direkter Griff waere der Rueckfall in den Zustand davor.
    const verbotene = [/\blocalStorage\b/, /\bsessionStorage\b/, /\bdocument\b/, /\bwindow\b/];
    const treffer: string[] = [];
    for (const datei of dateien) {
      // **Kommentare zaehlen nicht.** Beide Pakete erklaeren die injizierte
      // Speicherhuelle im Fliesstext („im Erfassungsbogen `localStorage`, in
      // S1-Control dessen Ereignis-Speicher") — ein Test, der das als Verstoss
      // laese, verbote gerade die Begruendung der Regel.
      const zeilen = ohneKommentare(readFileSync(datei, "utf8"))
        .split("\n")
        // `declare` beschreibt die Huelle, statt sie zu benutzen:
        // `plattform.d.ts` deklariert von Hand das eine Web-Global, das die
        // Sammlung braucht, und begruendet das mit Aufnahmeregel 2.
        .filter((zeile) => !zeile.includes("declare "));
      if (verbotene.some((muster) => zeilen.some((zeile) => muster.test(zeile)))) {
        treffer.push(path.relative(WURZEL, datei));
      }
    }
    expect(treffer).toEqual([]);
  });
});

describe("Der Zuschnitt der Aufnahme (ADR-003, Nachtrag)", () => {
  it("nimmt genau drei Pakete auf", () => {
    const gemodult = readFileSync(path.join(WURZEL, ".gitmodules"), "utf8");
    for (const paket of KERNPAKETE) {
      expect(gemodult, `vendor/${paket} fehlt in .gitmodules`).toContain(`vendor/${paket}`);
    }
  });

  it("nimmt `bos-taktische-zeichen` ausdruecklich nicht auf", () => {
    // Faellt dieser Test, ist das keine Panne, sondern eine Entscheidung, die
    // in ADR-003 nachzutragen ist — zusammen mit der Frage, was dann aus der
    // v1-Inferenz in `@s1/domaene` wird.
    const gemodult = readFileSync(path.join(WURZEL, ".gitmodules"), "utf8");
    expect(gemodult).not.toContain(NICHT_AUFGENOMMEN);
  });

  it("laesst `@s1/domaene` die Node-Ausnahme nicht anfassen", () => {
    // Die Ausnahme gilt **im Format-Repo**, nicht in Ring 2. Ein Import von
    // `@bos/eeb-format/qr-node` zoege `node:zlib` in ein Paket, dessen
    // tsconfig ausdruecklich `"types": []` fuehrt.
    const ringZwei = quelldateien(path.join(WURZEL, "packages", "domaene", "src"));
    const treffer = ringZwei.filter((datei) =>
      importziele(datei).some((ziel) => ziel.includes("qr-node")),
    );
    expect(treffer.map((d) => path.relative(WURZEL, d))).toEqual([]);
  });

  it("fuehrt jedes aufgenommene Paket als Workspace der Wurzel", () => {
    const wurzelPaket = JSON.parse(
      readFileSync(path.join(WURZEL, "package.json"), "utf8"),
    ) as { workspaces: string[] };
    for (const paket of KERNPAKETE) {
      expect(wurzelPaket.workspaces).toContain(`vendor/${paket}`);
    }
  });
});
