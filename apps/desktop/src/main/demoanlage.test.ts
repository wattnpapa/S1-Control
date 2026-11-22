/**
 * Funktionalität: den Demo-Einsatz anlegen — Ruf, Vermittlung, Demo-Arbeiter,
 * Aktendienst, Dateien. Der Weg, den der Knopf „Demo-Einsatz" der
 * Einsatzauswahl nimmt, ohne Fenster und ohne Thread-Grenze.
 */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof } from "./arbeiterhof.js";
import { baueDirektenArbeiter } from "./pruefhilfen/direkterArbeiter.js";
import { Vermittlung } from "./vermittlung.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import { DEMO_NAME } from "../worker/demo/demostruktur.js";
import type { EinsatzEintrag, Protokollzeile, Ruf } from "../kontrakt/index.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

interface Werkstatt {
  readonly vermittlung: Vermittlung;
  readonly dienste: Map<string, Aktendienst>;
  readonly gemeldet: Protokollzeile[];
}

function baueWerkstatt(): Werkstatt {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-demoanlage-"));
  wegwerf.push(wurzel);
  const dienste = new Map<string, Aktendienst>();
  const gemeldet: Protokollzeile[] = [];
  const vermittlung = new Vermittlung({
    hof: new Arbeiterhof({ fabrik: (start) => baueDirektenArbeiter(start, dienste), sende: () => undefined }),
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(wurzel, "profil", "einstellungen.json"),
    spiegelwurzel: path.join(wurzel, "profil", "spiegel"),
    vorbelegterShare: path.join(wurzel, "share"),
    plattform: "linux",
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "pruefrechner",
    benutzer: "pruefer",
    protokolliere: (stufe, text) => gemeldet.push({ wanduhr: new Date().toISOString(), stufe, text }),
    protokolldatei: path.join(wurzel, "profil", "s1-control.log"),
    letzteMeldungen: () => [...gemeldet].reverse(),
  });
  return { vermittlung, dienste, gemeldet };
}

async function ruf<T>(werkstatt: Werkstatt, anfrage: Ruf): Promise<T> {
  const antwort = await werkstatt.vermittlung.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

interface Angelegt {
  readonly akteId: string;
  readonly einsatzId: string;
  readonly ordner: string;
}

describe("Funktionalität: Demo-Einsatz anlegen", () => {
  it("Szenario: der Ruf legt den Einsatz an, spielt das Drehbuch ein und öffnet ihn", async () => {
    const werkstatt = baueWerkstatt();
    const vorher = Date.now();
    const angelegt = await ruf<Angelegt>(werkstatt, { art: "demoEinsatzAnlegen" });

    // Der Demo-Arbeiter ist geschlossen; offen ist genau der gewöhnliche, mit der Uhr des Rechners.
    expect([...werkstatt.dienste.keys()]).toEqual([angelegt.akteId]);
    const zustand = werkstatt.dienste.get(angelegt.akteId)?.zustand;
    expect(zustand?.einsatz?.name.wert).toBe(DEMO_NAME);
    expect(zustand?.einsatz?.art.wert).toBe("UEBUNG");
    const beginn = new Date(zustand?.einsatz?.beginn.wert ?? "").getTime();
    // Zwölf Stunden vor dem Augenblick des Rufs — der liegt zwischen `vorher` und jetzt.
    expect(beginn).toBeGreaterThanOrEqual(vorher - 12 * 3_600_000);
    expect(beginn).toBeLessThanOrEqual(Date.now() - 12 * 3_600_000);
    expect(Object.keys(zustand?.einheiten ?? {}).length).toBeGreaterThan(15);
    expect(zustand?.hinweise).toEqual([]);

    // Nichts abgewiesen: Das Protokoll trägt den Abschluss und keine Warnung zum Drehbuch.
    expect(werkstatt.gemeldet.some((z) => z.text.startsWith("Demo-Einsatz eingespielt:"))).toBe(true);
    expect(werkstatt.gemeldet.filter((z) => z.text.startsWith("Demo-Einsatz: Schritt"))).toEqual([]);

    const liste = await ruf<readonly EinsatzEintrag[]>(werkstatt, { art: "einsaetzeAuflisten" });
    expect(liste.map((e) => e.name)).toEqual([DEMO_NAME]);
    expect(liste[0]?.ordner).toBe(angelegt.ordner);
  }, 60_000);

  it("Szenario: ein zweiter Demo-Einsatz am selben Tag bekommt eine laufende Nummer", async () => {
    const werkstatt = baueWerkstatt();
    const erster = await ruf<Angelegt>(werkstatt, { art: "demoEinsatzAnlegen" });
    const zweiter = await ruf<Angelegt>(werkstatt, { art: "demoEinsatzAnlegen" });
    expect(zweiter.ordner).not.toBe(erster.ordner);
    const liste = await ruf<readonly EinsatzEintrag[]>(werkstatt, { art: "einsaetzeAuflisten" });
    expect(liste.map((e) => e.name).sort()).toEqual([DEMO_NAME, `${DEMO_NAME} 2`]);
  }, 60_000);

  it("Szenario: nach dem Einspielen schreibt der Arbeitsplatz mit der Uhr des Rechners weiter", async () => {
    const werkstatt = baueWerkstatt();
    const angelegt = await ruf<Angelegt>(werkstatt, { art: "demoEinsatzAnlegen" });
    const ergebnis = await ruf<{ art: string }>(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: { typ: "EtbEintragErfasst", nutzlast: { etbId: "nach-demo", zeitpunkt: new Date().toISOString(), text: "Eintrag nach dem Demo-Drehbuch" } },
    });
    expect(ergebnis.art).toBe("geschrieben");
    const dienst = werkstatt.dienste.get(angelegt.akteId);
    const juengste = dienst?.tagebuch({ art: "tagebuchAnfordern", akteId: angelegt.akteId, anzahl: 1 }).zeilen[0];
    expect(juengste?.typ).toBe("EtbEintragErfasst");
    expect(Math.abs(Date.now() - new Date(juengste?.wanduhr ?? "").getTime())).toBeLessThan(60_000);
    expect(dienst?.zustand.hinweise).toEqual([]);
  }, 60_000);

  it("Szenario: ohne Share-Pfad sagt die Antwort, was fehlt", async () => {
    const werkstatt = baueWerkstatt();
    await ruf(werkstatt, { art: "einstellungenSetzen", einstellungen: { sharePfad: "", anzeigename: "Führungsstelle 1" } });
    const antwort = await werkstatt.vermittlung.beantworte({ art: "demoEinsatzAnlegen" });
    expect(antwort).toMatchObject({ ok: false, meldung: "Es ist kein Share-Pfad eingestellt." });
  });
});
