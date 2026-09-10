/**
 * Der erste Mehrclient-Nachweis (M2.3).
 *
 * Die DoD lautet: „zwei Instanzen auf einem Temp-Verzeichnis sehen sich;
 * erster Mehrclient-E2E grün". Genau das steht hier — **zwei Aktendienste**,
 * jeder mit eigenem lokalem Spiegel und eigener Kennung, auf demselben
 * Share-Verzeichnis, über das echte Dateisystem.
 *
 * Was er nicht ist: der Prüfpunkt aus M2.4. Der verlangt zwei physische
 * Rechner, den echten Share und eine Stunde mit Störungen. Dieser Test läuft
 * in einem Prozess auf einer Platte und beweist genau so viel, wie das hergibt
 * — dass die Verdrahtung trägt und die Faltung konvergiert. Die Störungen sind
 * bereits gemessen, an anderer Stelle: `s1 simuliere` aus M0.4 fährt die
 * feindliche Dateisystem-Schicht.
 *
 * Die Takte stehen auf 0: Jeder Aufruf von `takt()` führt alle vier Schritte
 * aus. Der Test steuert damit den Ablauf, statt auf Wanduhrzeit zu warten —
 * ein Test, der auf `setTimeout` wartet, misst die Auslastung des CI-Läufers
 * und nicht das Verfahren.
 */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { zustandsHash, type KanonischerWert } from "@s1/domaene";
import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  knotenDateisystem,
  legeEinsatzAn,
  sha256Hex,
  systemZeit,
} from "@s1/speicher";

import { Aktendienst } from "./aktendienst.js";
import { lagebildMit, type Lagebild, type Mitteilung } from "../kontrakt/index.js";

const EINSATZ_ID = "2026-09-10-hochwasser-weser-ems";

const wegwerf: string[] = [];

afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

interface Platz {
  readonly dienst: Aktendienst;
  readonly mitteilungen: Mitteilung[];
}

function baueWerkstatt(): { readonly share: string; readonly wurzel: string } {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-m2-"));
  wegwerf.push(wurzel);
  return { wurzel, share: path.join(wurzel, "share", "einsaetze", EINSATZ_ID) };
}

function baueDienst(wurzel: string, share: string, nummer: number): Platz {
  const mitteilungen: Mitteilung[] = [];
  // Die Kennungen muessen sich in den **ersten** Stellen unterscheiden: §4.1
  // bildet den Dateinamen aus einem Praefix der clientId, und zwei Plaetze mit
  // gleichem Praefix hielten die Dateien des jeweils anderen fuer die eigenen.
  const clientId = `${String(nummer)}${"0".repeat(31)}`;
  const dienst = new Aktendienst({
    akteId: `akte-${String(nummer)}`,
    dateisystem: knotenDateisystem(),
    zeit: systemZeit,
    ablage: new Einsatzablage(share, path.join(wurzel, `lokal-${String(nummer)}`, EINSATZ_ID)),
    clientId,
    einsatzId: EINSATZ_ID,
    akteur: { benutzer: `Bediener ${String(nummer)}`, host: `rechner-${String(nummer)}`, clientId },
    anzeigename: `Arbeitsplatz ${String(nummer)}`,
    rechnername: `rechner-${String(nummer)}`,
    programmversion: "0.0.0-test",
    neueKennung: () => `${String(nummer + 8)}${"f".repeat(31)}`,
    sende: (m) => mitteilungen.push(m),
    // Alles sofort fällig: der Test taktet, nicht die Uhr.
    takte: { spiegelungMs: 0, taktAMs: 0, taktBMs: 0, praesenzMs: 0 },
  });
  return { dienst, mitteilungen };
}

/** Lässt beide Plätze so lange takten, bis nichts Neues mehr kommt. */
async function takteBis(plaetze: readonly Platz[], runden = 6): Promise<void> {
  for (let i = 0; i < runden; i += 1) {
    for (const platz of plaetze) await platz.dienst.takt();
  }
}

async function werkstattMitZweiPlaetzen(): Promise<{ a: Platz; b: Platz }> {
  const { wurzel, share } = baueWerkstatt();
  await legeEinsatzAn(
    knotenDateisystem(),
    new Einsatzablage(share, path.join(wurzel, "lokal-anlage", EINSATZ_ID)),
    {
      einsatzId: EINSATZ_ID,
      name: "Hochwasser Weser-Ems",
      datum: "2026-09-10",
      angelegtAm: new Date().toISOString(),
      angelegtVon: "Test",
    },
    EINSATZ_UNTERORDNER,
  );
  const a = baueDienst(wurzel, share, 1);
  const b = baueDienst(wurzel, share, 2);
  await a.dienst.oeffne();
  await b.dienst.oeffne();
  return { a, b };
}

/** Die drei Ereignisse, mit denen jeder Test hier beginnt. */
async function grundlage(a: Platz): Promise<void> {
  await a.dienst.bediene({
    typ: "EinsatzAngelegt",
    nutzlast: {
      einsatzId: EINSATZ_ID,
      name: "Hochwasser Weser-Ems",
      art: "EINSATZ",
      fuestName: "FueSt Oldenburg",
      beginn: "2026-09-10T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
      kosten: { psaKostenProSatz: 180, vdaProTag: 150, ukVerpflegungProTag: 20, geplanteEinsatztage: 5 },
    },
  });
  await a.dienst.bediene({
    typ: "AbschnittAngelegt",
    nutzlast: {
      abschnittId: "EO",
      name: "Deich Nord",
      typ: "EINSATZORT",
      reihenfolge: 1,
    },
  });
  await a.dienst.bediene({
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: "U1",
      abschnittId: "EO",
      bezeichnung: "Bergungsgruppe Oldenburg",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
      personalErfassung: "VOLLSTAENDIG",
      status: "IM_EINSATZ",
      hierarchie: [],
      reihenfolge: 0,
      istFuehrungDesAbschnitts: false,
    },
  });
}

describe("Zwei Arbeitsplätze auf demselben Verzeichnis", () => {
  it("sehen dieselben Ereignisse und falten denselben Zustand", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);

    expect(Object.keys(b.dienst.zustand.einheiten)).toEqual(["U1"]);
    expect(b.dienst.zustand.einheiten["U1"]?.bezeichnung.wert).toBe("Bergungsgruppe Oldenburg");
    expect(zustandDavon(a)).toBe(zustandDavon(b));
  });

  it("sehen sich gegenseitig in der Präsenz (§6.4)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await takteBis([a, b]);

    const lageA = letztesLagebild(a);
    const lageB = letztesLagebild(b);
    expect(lageA?.peers.map((p) => p.clientId)).toEqual([b.dienst.clientId]);
    expect(lageB?.peers.map((p) => p.clientId)).toEqual([a.dienst.clientId]);
    // §6.4: frisch geschrieben heißt nicht veraltet.
    expect(lageA?.peers[0]?.veraltet).toBe(false);
    expect(lageA?.peers[0]?.anzeigename).toBe("Arbeitsplatz 2");
  });

  it("konvergieren, wenn beide zugleich schreiben", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);

    // Beide setzen denselben Status verschieden — LWW entscheidet, aber beide
    // müssen danach dasselbe sehen (Eigenschaft P3).
    await a.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "RUHE",
    });
    await b.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "ANGEFORDERT",
    });
    await takteBis([a, b]);

    expect(zustandDavon(a)).toBe(zustandDavon(b));
    expect(a.dienst.zustand.einheiten["U1"]?.status.wert).toBe(
      b.dienst.zustand.einheiten["U1"]?.status.wert,
    );
  });
});

describe("Der Delta-Weg an den Renderer (M2.1)", () => {
  it("schickt zuerst das volle Bild und danach nur Änderungen", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);

    const staende = a.mitteilungen.filter((m) => m.art === "stand");
    expect(staende[0]).toMatchObject({ folge: 0 });
    expect(staende[0]?.art === "stand" && staende[0].voll).toBeDefined();
    for (const stand of staende.slice(1)) {
      expect(stand.art === "stand" && stand.geaendert).toBeDefined();
    }
  });

  it("zählt die Folge lückenlos hoch", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const folgen = a.mitteilungen.filter((m) => m.art === "stand").map((m) => m.folge);
    expect(folgen).toEqual(folgen.map((_, i) => i));
  });

  it("meldet in Ruhe nur noch die Lebenszeichen", async () => {
    // Zwei Werte ändern sich in jedem Takt, und beide sind genau dafür da:
    // der eigene Share-Kontakt und die Wanduhr der fremden Präsenzdateien
    // (§6.4). Sie **sind** die Auskunft „wir sehen uns noch". Alles Fachliche
    // schweigt — daran hängt, dass die Statuszeile nicht zum Datenstrom wird.
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b], 8);
    a.mitteilungen.length = 0;
    await takteBis([a, b], 4);
    for (const mitteilung of a.mitteilungen) {
      expect(mitteilung.art).toBe("stand");
      if (mitteilung.art !== "stand") continue;
      const geaendert = Object.keys(mitteilung.geaendert ?? {}).sort();
      expect(geaendert.every((k) => k === "letzterShareKontakt" || k === "peers")).toBe(true);
    }
  });

  it("liefert auf Anforderung wieder ein volles Bild", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    a.mitteilungen.length = 0;
    a.dienst.sendeVollenStand();
    const letzte = a.mitteilungen[0];
    expect(letzte?.art === "stand" && letzte.voll?.einheiten).toBe(1);
  });
});

describe("Undo über zwei Arbeitsplätze (§6 U1 bis U6)", () => {
  it("nimmt die letzte eigene Änderung zurück, und der andere sieht es", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    await a.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "RUHE",
    });
    await takteBis([a, b]);
    expect(b.dienst.zustand.einheiten["U1"]?.status.wert).toBe("RUHE");

    const ergebnis = await a.dienst.zurueck();
    expect(ergebnis.art).toBe("geschrieben");
    await takteBis([a, b]);
    expect(b.dienst.zustand.einheiten["U1"]?.status.wert).toBe("IM_EINSATZ");
    expect(zustandDavon(a)).toBe(zustandDavon(b));
  });

  it("nimmt keine fremde Änderung zurück (U3)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    await a.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "RUHE",
    });
    await takteBis([a, b]);
    // B hat selbst nichts geschrieben — sein Stapel ist leer, obwohl er die
    // Änderung von A kennt.
    expect(b.dienst.undoStapel()).toHaveLength(0);
    expect(await b.dienst.zurueck()).toEqual({
      art: "nichtMoeglich",
      meldung: "Es ist nichts zurückzunehmen.",
    });
  });

  it("verlangt für die Rücknahme einer Anlage einen Grund (§2.4)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    expect(await a.dienst.zurueck()).toEqual({ art: "brauchtGrund", zielArt: "EinheitEntfernt" });
    expect((await a.dienst.zurueck("Doppelmeldung")).art).toBe("geschrieben");
    await takteBis([a, b]);
    expect(b.dienst.zustand.einheiten["U1"]?.entfernt?.wert).toBe(true);
  });

  it("meldet den Stapel in der Statuszeile mit", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const lage = letztesLagebild(a);
    // Drei geschriebene Ereignisse; `EinsatzAngelegt` ist nach U2 nicht
    // rücknehmbar und steht deshalb nicht darauf.
    expect(lage?.undoTiefe).toBe(2);
    expect(lage?.undoObersteArt).toBe("EinheitGemeldet");
  });
});

describe("Die Statuszeile (M2.2)", () => {
  it("meldet den Share als erreichbar und führt den Stand mit", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const lage = letztesLagebild(a);
    expect(lage?.shareErreichbar).toBe(true);
    expect(lage?.standHlc).toMatch(/^\d/);
    expect(lage?.einheiten).toBe(1);
    expect(lage?.abschnitte).toBeGreaterThanOrEqual(1);
    expect(lage?.gesamtstaerke).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 });
  });

  it("meldet null unübertragene Bytes, nachdem gespiegelt wurde (§5.3)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    expect(letztesLagebild(a)?.unuebertrageneBytes).toBe(0);
  });
});

// ---------------------------------------------------------------------------

/** Der Zustandshash nach §7.6 — der Maßstab der Konvergenz. */
function zustandDavon(platz: Platz): string {
  return zustandsHash(platz.dienst.zustand as unknown as KanonischerWert, sha256Hex);
}

/**
 * Das zuletzt gesehene Lagebild eines Platzes, aus den Mitteilungen
 * zusammengesetzt — genau so, wie der Renderer es täte.
 *
 * Damit prüft dieser Test nicht die Projektionsfunktion für sich, sondern den
 * Weg: volles Bild, dann Deltas darauf.
 */
function letztesLagebild(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}
