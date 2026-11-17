/**
 * Druck und Automatikdruck über die Vermittlung (KONZEPT-NACHRICHTEN.md §7,
 * Entscheidungen 7 und 9; Schnitt N3).
 *
 * Electron fehlt hier; an seiner Stelle steht eine Attrappe des
 * Druckausgangs. Geprüft wird der Weg: Druckerliste und Ordnerwahl nur mit
 * Druckausgang, Probedruck an beide Ziele, der Vordruck je Nachricht in
 * `ausgaben\nachrichten`, der leere Vordruck neben dem Papier-Vordruck und
 * das Ziel des Automatikdrucks aus den Einstellungen bis in den Worker — mit
 * dem Druckauftrag, der vom Worker über den Hof zum Drucker kommt.
 */

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";

import { Arbeiterhof } from "./arbeiterhof.js";
import { automatikdruckAus, druckauftraegeAnnehmen, type Druckausgang } from "./druckausgang.js";
import { baueDirektenArbeiter } from "./pruefhilfen/direkterArbeiter.js";
import { Vermittlung } from "./vermittlung.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import { zEinstellungen, zRuf, type Einstellungen, type Mitteilung, type Ruf, type Umgebung } from "../kontrakt/index.js";
import { nachrichtSichten, nachrichtVerfassen } from "../kontrakt/nachrichtenschritte.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function neuerOrdner(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-druck-vermittlung-"));
  wegwerf.push(ordner);
  return ordner;
}

/** Ein Druckausgang, der sich merkt, was er drucken sollte. */
function attrappe(scheitert = false): Druckausgang & { readonly gedruckt: { drucker: string; kopf: string }[] } {
  const gedruckt: { drucker: string; kopf: string }[] = [];
  return {
    gedruckt,
    drucker: () => Promise.resolve([{ name: "Lager_S4", anzeigename: "Lager S4" }]),
    druckePdf(bytes, drucker) {
      if (scheitert) return Promise.reject(new Error("Kein Papier"));
      gedruckt.push({ drucker, kopf: new TextDecoder().decode(bytes.subarray(0, 5)) });
      return Promise.resolve();
    },
    ordnerWaehlen: () => Promise.resolve("/mnt/drucke"),
  };
}

interface Aufbau {
  readonly vermittlung: Vermittlung;
  readonly dienste: Map<string, Aktendienst>;
  readonly wurzel: string;
}

function baue(druckausgang: Druckausgang | undefined): Aufbau {
  const wurzel = neuerOrdner();
  const dienste = new Map<string, Aktendienst>();
  const annehmen = druckausgang === undefined ? undefined : druckauftraegeAnnehmen(druckausgang, () => undefined, () => undefined);
  const hof = new Arbeiterhof({
    fabrik: (start) => baueDirektenArbeiter(start, dienste),
    sende: () => undefined,
    ...(annehmen === undefined ? {} : { drucke: (auftrag) => void annehmen(auftrag) }),
  });
  const vermittlung = new Vermittlung({
    hof,
    ...(druckausgang === undefined ? {} : { druckausgang }),
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(wurzel, "profil", "einstellungen.json"),
    spiegelwurzel: path.join(wurzel, "profil", "spiegel"),
    plattform: druckausgang === undefined ? "web" : "linux",
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "pruefrechner",
    benutzer: "pruefer",
    protokolliere: () => undefined,
  });
  return { vermittlung, dienste, wurzel };
}

async function ruf<T>(vermittlung: Vermittlung, anfrage: Ruf): Promise<T> {
  const antwort = await vermittlung.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

async function mitEinsatz(a: Aufbau, mehr: Partial<Einstellungen> = {}): Promise<string> {
  await ruf(a.vermittlung, { art: "einstellungenSetzen", einstellungen: { sharePfad: path.join(a.wurzel, "share"), anzeigename: "Führungsstelle 1", ...mehr } });
  const { akteId } = await ruf<{ akteId: string }>(a.vermittlung, {
    art: "einsatzAnlegen",
    name: "Hochwasser Weser-Ems",
    datum: "2026-09-10",
    einsatzArt: "UEBUNG",
    fuestName: "FüSt Oldenburg",
    beginn: new Date(Date.now() - 3_600_000).toISOString(),
    schichtmodell: "ZWEI_SCHICHT",
  });
  await ruf(a.vermittlung, { art: "stellenSetzen", akteId, stellen: ["S4"], handzeichen: "Mü" });
  return akteId;
}

async function verteileAnS4(a: Aufbau, akteId: string, nachrichtId: string): Promise<void> {
  const anlage = { nachrichtId, richtung: "EINGANG" as const, anschrift: "FüSt", betreff: "Pumpen", inhalt: "Zwei Pumpen.", absender: "OV", abfassungszeit: "2026-11-17T09:45:00Z" };
  await ruf(a.vermittlung, { art: "bedienen", akteId, entwurf: nachrichtVerfassen(anlage) });
  const sichtung = { zeitpunkt: new Date().toISOString(), handzeichen: "Si", verteiler: [{ stelle: "S4", kopie: "GRUEN" }] };
  // S4 sichtet mit „Trotzdem“ (R2-FaBe P0-1: Sichten ist dem Sichter vorbehalten).
  await ruf(a.vermittlung, { art: "bedienen", akteId, entwurf: { ...nachrichtSichten(nachrichtId, null, sichtung), grund: "Eintrag durch S4, nicht Sichter" } });
  await a.dienste.get(akteId)?.automatikdruckFertig();
}

describe("Kontrakt N3", () => {
  it("kennt die neuen Rufe und Einstellungen, additiv", () => {
    expect(zRuf.safeParse({ art: "nachrichtVordruckErzeugen", akteId: "akte-1", nachrichtId: "N-1", blatt: "a4quer" }).success).toBe(true);
    expect(zRuf.safeParse({ art: "nachrichtVordruckErzeugen", akteId: "akte-1", nachrichtId: "N-1", blatt: "a3" }).success).toBe(false);
    expect(zRuf.safeParse({ art: "druckerAuflisten" }).success).toBe(true);
    expect(zRuf.safeParse({ art: "probedruck", ziel: { ziel: "drucker", name: "X" } }).success).toBe(true);
    const e = { sharePfad: "/s", anzeigename: "A", vordruckBlatt: "a5", vorschau: { maske: true }, automatikdruck: { ziel: "verzeichnis", pfad: "/d" }, automatikdruckAn: true };
    expect(zEinstellungen.safeParse(e).success).toBe(true);
    expect(zEinstellungen.safeParse({ sharePfad: "/s", anzeigename: "A" }).success).toBe(true);
  });

  it("gibt dem Worker ein Ziel nur mit Schalter und benutzbarem Ziel", () => {
    const grund: Einstellungen = { sharePfad: "/s", anzeigename: "A" };
    expect(automatikdruckAus({ ...grund, automatikdruck: { ziel: "verzeichnis", pfad: "/d" } }, true)).toBeUndefined();
    expect(automatikdruckAus({ ...grund, automatikdruckAn: true, automatikdruck: { ziel: "verzeichnis", pfad: " " } }, true)).toBeUndefined();
    expect(automatikdruckAus({ ...grund, automatikdruckAn: true, automatikdruck: { ziel: "drucker", name: "P" } }, false)).toBeUndefined();
    expect(automatikdruckAus({ ...grund, automatikdruckAn: true, vordruckBlatt: "a4quer", automatikdruck: { ziel: "drucker", name: "P" } }, true)).toEqual({ ziel: { ziel: "drucker", name: "P" }, blatt: "a4quer" });
  });
});

describe("Druckerliste, Ordnerwahl und Probedruck", () => {
  it("listet die Drucker und wählt einen Ordner nur mit Druckausgang; die Umgebung sagt es", async () => {
    const mit = baue(attrappe());
    expect(await ruf(mit.vermittlung, { art: "druckerAuflisten" })).toEqual([{ name: "Lager_S4", anzeigename: "Lager S4" }]);
    expect(await ruf(mit.vermittlung, { art: "ordnerWaehlen" })).toBe("/mnt/drucke");
    expect(await ruf<Umgebung>(mit.vermittlung, { art: "umgebung" })).toMatchObject({ druckerDrucken: true, ordnerWaehlen: true });

    const ohne = baue(undefined);
    const antwort = await ohne.vermittlung.beantworte({ art: "druckerAuflisten" });
    expect(antwort).toEqual({ ok: false, meldung: "Drucker und Ordnerwahl gibt es nur in der Desktop-App." });
    expect(await ruf<Umgebung>(ohne.vermittlung, { art: "umgebung" })).toMatchObject({ druckerDrucken: false, ordnerWaehlen: false });
  });

  it("schreibt den Probedruck ins Verzeichnis und gibt ihn an den Drucker", async () => {
    const ausgang = attrappe();
    const a = baue(ausgang);
    const ordner = path.join(a.wurzel, "drucke");
    // FM P2-11: Fehlt das Verzeichnis, legt der Probedruck nichts an und bietet „anlegen“ an.
    expect(await ruf(a.vermittlung, { art: "probedruck", ziel: { ziel: "verzeichnis", pfad: ordner } })).toMatchObject({ art: "verzeichnisFehlt", pfad: ordner, anlegen: true });
    expect(existsSync(ordner)).toBe(false);
    expect(await ruf(a.vermittlung, { art: "verzeichnisPruefen", pfad: ordner })).toEqual({ vorhanden: false });
    const insVerzeichnis = await ruf<{ art: string; pfad: string }>(a.vermittlung, { art: "probedruck", ziel: { ziel: "verzeichnis", pfad: ordner }, anlegen: true });
    expect(insVerzeichnis.art).toBe("verzeichnis");
    expect(await ruf(a.vermittlung, { art: "verzeichnisPruefen", pfad: ordner })).toEqual({ vorhanden: true, beschreibbar: true });
    expect(readdirSync(ordner)).toHaveLength(1);
    // Die Rückfrage „anlegen?“ der Druckeinstellungen: erst nach Ja angelegt.
    const neu = path.join(a.wurzel, "neu");
    expect(await ruf(a.vermittlung, { art: "verzeichnisPruefen", pfad: neu, anlegen: true })).toEqual({ vorhanden: true, beschreibbar: true });
    expect(readdirSync(neu)).toEqual([]);
    expect(path.basename(insVerzeichnis.pfad)).toMatch(/^probedruck-vordruck_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
    expect(readFileSync(insVerzeichnis.pfad).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(await ruf(a.vermittlung, { art: "probedruck", ziel: { ziel: "drucker", name: "Lager_S4" } })).toEqual({ art: "drucker", name: "Lager_S4" });
    expect(ausgang.gedruckt).toEqual([{ drucker: "Lager_S4", kopf: "%PDF-" }]);
  });

  it("lehnt den Probedruck an einen Drucker in der Web-Schale mit Satz ab", async () => {
    const { vermittlung } = baue(undefined);
    const antwort = await vermittlung.beantworte({ art: "probedruck", ziel: { ziel: "drucker", name: "P" } });
    expect(antwort.ok).toBe(false);
    expect(antwort.ok ? "" : antwort.meldung).toMatch(/nur in der Desktop-App/u);
  });
});

describe("Vordruck je Nachricht und leerer Vordruck", () => {
  it("legt den Vordruck einer Nachricht in ausgaben\\nachrichten ab — auch ohne Electron (Web-Schale)", async () => {
    const a = baue(undefined);
    const akteId = await mitEinsatz(a);
    await verteileAnS4(a, akteId, "N-1");
    const { pfad, bytes } = await ruf<{ pfad: string; bytes: number }>(a.vermittlung, { art: "nachrichtVordruckErzeugen", akteId, nachrichtId: "N-1", blatt: "a5" });
    expect(path.basename(path.dirname(pfad))).toBe("nachrichten");
    expect(path.basename(path.dirname(path.dirname(pfad)))).toBe("ausgaben");
    expect(path.basename(pfad)).toBe("nachricht-Eohne-171045nov26-N1.pdf");
    expect(readFileSync(pfad).length).toBe(bytes);
  });

  it("legt neben den Papier-Vordruck den leeren Nachrichtenvordruck und nennt ihn", async () => {
    const a = baue(undefined);
    const akteId = await mitEinsatz(a);
    const ergebnis = await ruf<{ pfad: string; weitere?: { pfad: string; bytes: number }[] }>(a.vermittlung, { art: "ausgabeErzeugen", akteId, ausgabe: "papier", format: "html" });
    expect(path.basename(ergebnis.pfad)).toMatch(/^papier-vordruck_.*\.html$/);
    expect(ergebnis.weitere?.map((w) => path.basename(w.pfad))).toEqual(["vordruck-nachricht-leer.pdf"]);
    const leer = readFileSync(ergebnis.weitere?.[0]?.pfad ?? "");
    expect(leer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // FM P1-6: Papier-Vordruck als PDF ohne Rendering-Engine (Web-Schale) ist der leere Nachrichtenvordruck, das HTML liegt daneben.
    const alsPdf = await ruf<{ pfad: string; weitere?: { pfad: string }[] }>(a.vermittlung, { art: "ausgabeErzeugen", akteId, ausgabe: "papier", format: "pdf" });
    expect(path.basename(alsPdf.pfad)).toBe("vordruck-nachricht-leer.pdf");
    expect(readFileSync(alsPdf.pfad).subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(alsPdf.weitere?.map((w) => path.basename(w.pfad))).toEqual([expect.stringMatching(/^papier-vordruck_.*\.html$/u)]);
    // Andere Ausgaben bekommen nichts dazu.
    const druck = await ruf<{ weitere?: unknown }>(a.vermittlung, { art: "ausgabeErzeugen", akteId, ausgabe: "status", format: "html" });
    expect(druck.weitere).toBeUndefined();
  });
});

describe("Automatikdruck aus den Einstellungen", () => {
  it("bringt das Verzeichnis beim Öffnen in den Worker; was danach eintrifft, fällt hinein", async () => {
    const a = baue(undefined);
    const ziel = path.join(a.wurzel, "automatik");
    mkdirSync(ziel);
    const akteId = await mitEinsatz(a, { automatikdruckAn: true, automatikdruck: { ziel: "verzeichnis", pfad: ziel } });
    await verteileAnS4(a, akteId, "N-1");
    expect(readdirSync(ziel)).toEqual(["nachricht-Eohne-171045nov26-N1.pdf"]);
  });

  it("schaltet ein geändertes Ziel in den offenen Einsatz um und gibt Drucker-Aufträge über den Hof an den Drucker", async () => {
    const drucker = attrappe();
    const a = baue(drucker);
    const akteId = await mitEinsatz(a);
    await verteileAnS4(a, akteId, "N-1");
    expect(drucker.gedruckt).toEqual([]);
    const jetzt = await ruf<Einstellungen>(a.vermittlung, { art: "einstellungenLesen" });
    await ruf(a.vermittlung, { art: "einstellungenSetzen", einstellungen: { ...jetzt, automatikdruckAn: true, automatikdruck: { ziel: "drucker", name: "Lager_S4" } } });
    expect((await ruf<Einstellungen>(a.vermittlung, { art: "einstellungenLesen" })).automatikdruck).toEqual({ ziel: "drucker", name: "Lager_S4" });
    await verteileAnS4(a, akteId, "N-2");
    await new Promise((weiter) => setTimeout(weiter, 20));
    expect(drucker.gedruckt).toEqual([{ drucker: "Lager_S4", kopf: "%PDF-" }]);
    // Ausgeschaltet: nichts mehr.
    await ruf(a.vermittlung, { art: "einstellungenSetzen", einstellungen: { ...jetzt, automatikdruckAn: false, automatikdruck: { ziel: "drucker", name: "Lager_S4" } } });
    await verteileAnS4(a, akteId, "N-3");
    await new Promise((weiter) => setTimeout(weiter, 20));
    expect(drucker.gedruckt).toHaveLength(1);
  });

  it("meldet einen scheiternden Drucker einmal je Akte als Warnung", async () => {
    const mitteilungen: Mitteilung[] = [];
    const protokoll: string[] = [];
    const annehmen = druckauftraegeAnnehmen(attrappe(true), (m) => mitteilungen.push(m), (_stufe, text) => protokoll.push(text));
    const auftrag = { akteId: "akte-1", bytes: new Uint8Array([37]), drucker: "Lager_S4", dateiname: "n.pdf" };
    await annehmen(auftrag);
    await annehmen(auftrag);
    await annehmen({ ...auftrag, akteId: "akte-2" });
    expect(protokoll).toHaveLength(3);
    expect(mitteilungen.map((m) => (m.art === "hinweis" ? [m.akteId, m.stufe] : []))).toEqual([
      ["akte-1", "warnung"],
      ["akte-2", "warnung"],
    ]);
    expect(mitteilungen[0]?.art === "hinweis" ? mitteilungen[0].text : "").toContain("Kein Papier");
  });
});
