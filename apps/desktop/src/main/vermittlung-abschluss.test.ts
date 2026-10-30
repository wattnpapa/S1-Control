/**
 * Abschluss und Dateiwege über die Vermittlung — Ruf, Kontrakt, Worker, Ablage.
 *
 * Die Regeln selbst prüfen die Szenarien im Worker und `ausgabezeiger.test.ts`.
 * Hier steht der Weg: dass die neuen Rufe über die Prozessgrenze ankommen,
 * dass die Akte im Ordner des Einsatzes liegt und dass „Öffnen“ nur eine
 * Datei dieses Einsatzes erreicht.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof } from "./arbeiterhof.js";
import type { Schreibtisch } from "./ausgabezeiger.js";
import { baueDirektenArbeiter } from "./pruefhilfen/direkterArbeiter.js";
import { Vermittlung } from "./vermittlung.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import { einsatzBeendet } from "../kontrakt/bedienschritte.js";
import type { Akteergebnis, Ausgabeergebnis, Bedienergebnis, Ruf, Umgebung } from "../kontrakt/index.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function merkenderSchreibtisch(): Schreibtisch & { readonly rufe: string[] } {
  const rufe: string[] = [];
  return {
    rufe,
    oeffne: (pfad) => {
      rufe.push(`oeffne ${pfad}`);
      return Promise.resolve();
    },
    zeigeImOrdner: (pfad) => {
      rufe.push(`ordner ${pfad}`);
    },
    drucke: (pfad) => {
      rufe.push(`drucke ${pfad}`);
      return Promise.resolve();
    },
  };
}

async function ruf<T>(vermittlung: Vermittlung, anfrage: Ruf): Promise<T> {
  const antwort = await vermittlung.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

async function vermittlungMitEinsatz(schreibtisch?: Schreibtisch) {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-abschluss-vermittlung-"));
  wegwerf.push(wurzel);
  const dienste = new Map<string, Aktendienst>();
  const vermittlung = new Vermittlung({
    hof: new Arbeiterhof({ fabrik: (start) => baueDirektenArbeiter(start, dienste), sende: () => undefined }),
    ...(schreibtisch === undefined ? {} : { schreibtisch }),
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(wurzel, "profil", "einstellungen.json"),
    spiegelwurzel: path.join(wurzel, "profil", "spiegel"),
    plattform: "linux",
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "pruefrechner",
    benutzer: "pruefer",
    protokolliere: () => undefined,
  });
  await ruf(vermittlung, {
    art: "einstellungenSetzen",
    einstellungen: { sharePfad: path.join(wurzel, "share"), anzeigename: "Führungsstelle 1" },
  });
  const { akteId, einsatzId } = await ruf<{ akteId: string; einsatzId: string }>(vermittlung, {
    art: "einsatzAnlegen",
    name: "Hochwasser Weser-Ems",
    datum: "2026-09-10",
    einsatzArt: "EINSATZ",
    fuestName: "FüSt Oldenburg",
    beginn: new Date(Date.now() - 3_600_000).toISOString(),
    schichtmodell: "ZWEI_SCHICHT",
  });
  return { vermittlung, akteId, einsatzId, wurzel, einsatzordner: path.join(wurzel, "share", "einsaetze", einsatzId) };
}

describe("Der Abschluss über die Vermittlung", () => {
  it("beendet, archiviert und legt die Einsatzakte in den Ordner des Einsatzes", async () => {
    const { vermittlung, akteId, einsatzId, einsatzordner } = await vermittlungMitEinsatz();
    const ende = new Date(Date.now() - 60_000).toISOString();
    const beendet = await ruf<Bedienergebnis>(vermittlung, {
      art: "bedienen",
      akteId,
      entwurf: einsatzBeendet(einsatzId, null, ende),
    });
    expect(beendet.art).toBe("geschrieben");
    const archiviert = await ruf<Bedienergebnis>(vermittlung, {
      art: "einsatzArchivieren",
      akteId,
      zeitpunkt: new Date().toISOString(),
    });
    expect(archiviert.art).toBe("geschrieben");
    const akte = await ruf<Akteergebnis>(vermittlung, { art: "akteErzeugen", akteId });
    expect(path.dirname(akte.pfad)).toBe(einsatzordner);
    expect(akte.befunde).toBe(0);
  });
});

describe("Öffnen, Ordner zeigen und Drucken", () => {
  it("meldet in der Umgebung, ob die Schale Dateien öffnen kann", async () => {
    const ohne = await vermittlungMitEinsatz();
    expect((await ruf<Umgebung>(ohne.vermittlung, { art: "umgebung" })).dateienZeigen).toBe(false);
    const mit = await vermittlungMitEinsatz(merkenderSchreibtisch());
    expect((await ruf<Umgebung>(mit.vermittlung, { art: "umgebung" })).dateienZeigen).toBe(true);
  });

  it("reicht eine Ausgabe des Einsatzes an den Schreibtisch weiter", async () => {
    const schreibtisch = merkenderSchreibtisch();
    const { vermittlung, akteId } = await vermittlungMitEinsatz(schreibtisch);
    const { pfad } = await ruf<Ausgabeergebnis>(vermittlung, {
      art: "ausgabeErzeugen",
      akteId,
      ausgabe: "einheitenliste",
      format: "html",
    });
    for (const wie of ["oeffnen", "ordner", "drucken"] as const) {
      await ruf(vermittlung, { art: "ausgabeZeigen", akteId, pfad, wie });
    }
    expect(schreibtisch.rufe).toEqual([`oeffne ${pfad}`, `ordner ${pfad}`, `drucke ${pfad}`]);
  });

  it("weist eine Datei außerhalb des Einsatzes ab, bevor Electron sie sieht", async () => {
    const schreibtisch = merkenderSchreibtisch();
    const { vermittlung, akteId, wurzel } = await vermittlungMitEinsatz(schreibtisch);
    const fremd = path.join(wurzel, "fremd.html");
    writeFileSync(fremd, "<p>fremd</p>");
    const antwort = await vermittlung.beantworte({ art: "ausgabeZeigen", akteId, pfad: fremd, wie: "oeffnen" });
    expect(antwort).toMatchObject({ ok: false, meldung: expect.stringMatching(/nicht zum geöffneten Einsatz/u) });
    expect(schreibtisch.rufe).toEqual([]);
  });

  it("meldet ohne Schreibtisch einen lesbaren Grund", async () => {
    const { vermittlung, akteId, einsatzordner } = await vermittlungMitEinsatz();
    const antwort = await vermittlung.beantworte({
      art: "ausgabeZeigen",
      akteId,
      pfad: path.join(einsatzordner, "ausgaben", "druck.html"),
      wie: "oeffnen",
    });
    expect(antwort).toMatchObject({ ok: false, meldung: "Auf diesem Arbeitsplatz lassen sich Dateien nicht öffnen." });
  });
});
