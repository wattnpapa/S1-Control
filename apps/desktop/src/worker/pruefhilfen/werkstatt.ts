/**
 * Die Werkstatt der Schalen-Tests — ausschliesslich fuer Tests.
 *
 * Sie baut, was jeder Nachweis am Aktendienst braucht: ein Wegwerf-Verzeichnis
 * mit einem angelegten Einsatz und einen oder zwei Aktendienste darauf, ueber
 * das **echte** Dateisystem. Bewusst nicht ueber eine Attrappe: Was hier
 * gemessen wird, ist die Verdrahtung bis in die Speicherschicht.
 *
 * Sie liegt in einer eigenen Datei, weil inzwischen zwei Nachweise sie
 * brauchen — der Mehrclient-Nachweis aus M2.3 und die Ansichtsrufe aus M3.7.
 * Zwei Werkstaetten waeren zwei Stellen, an denen eine Aenderung an den
 * Startdaten nachzuziehen ist.
 *
 * Die Takte stehen auf 0: Jeder Aufruf von `takt()` fuehrt alle vier Schritte
 * aus. Der Test steuert damit den Ablauf, statt auf Wanduhrzeit zu warten —
 * ein Test, der auf `setTimeout` wartet, misst die Auslastung des Laeufers
 * und nicht das Verfahren.
 */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  knotenDateisystem,
  legeEinsatzAn,
  systemZeit,
} from "@s1/speicher";

import { Aktendienst } from "../aktendienst.js";
import type { Mitteilung } from "../../kontrakt/index.js";

export const EINSATZ_ID = "2026-09-10-hochwasser-weser-ems";

export interface Platz {
  readonly dienst: Aktendienst;
  readonly mitteilungen: Mitteilung[];
}

const wegwerf: string[] = [];

/** Raeumt alle Wegwerf-Verzeichnisse ab; gehoert in ein `afterEach`. */
export function raeumeAuf(): void {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
}

export function baueWerkstatt(): { readonly share: string; readonly wurzel: string } {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-schale-"));
  wegwerf.push(wurzel);
  return { wurzel, share: path.join(wurzel, "share", "einsaetze", EINSATZ_ID) };
}

export function baueDienst(wurzel: string, share: string, nummer: number): Platz {
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
    // Derselbe Entpacker wie im Betrieb (`akte-worker.ts`): Der
    // Handscanner-Weg soll im Nachweis nicht an einer Attrappe haengen.
    kompressor: {
      deflateRaw: (daten) => new Uint8Array(deflateRawSync(daten)),
      inflateRaw: (daten) => new Uint8Array(inflateRawSync(daten)),
    },
    sende: (m) => mitteilungen.push(m),
    takte: { spiegelungMs: 0, taktAMs: 0, taktBMs: 0, praesenzMs: 0 },
  });
  return { dienst, mitteilungen };
}

/** Legt den Einsatzordner auf dem Share an — ohne fachliches Ereignis. */
export async function legeEinsatzordnerAn(wurzel: string, share: string): Promise<void> {
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
}

/** Ein einzelner Arbeitsplatz auf einem frischen Einsatz. */
export async function werkstattMitEinemPlatz(): Promise<Platz> {
  const { wurzel, share } = baueWerkstatt();
  await legeEinsatzordnerAn(wurzel, share);
  const a = baueDienst(wurzel, share, 1);
  await a.dienst.oeffne();
  return a;
}

export async function werkstattMitZweiPlaetzen(): Promise<{ a: Platz; b: Platz }> {
  const { wurzel, share } = baueWerkstatt();
  await legeEinsatzordnerAn(wurzel, share);
  const a = baueDienst(wurzel, share, 1);
  const b = baueDienst(wurzel, share, 2);
  await a.dienst.oeffne();
  await b.dienst.oeffne();
  return { a, b };
}

/** Laesst alle Plaetze so lange takten, bis nichts Neues mehr kommt. */
export async function takteBis(plaetze: readonly Platz[], runden = 6): Promise<void> {
  for (let i = 0; i < runden; i += 1) {
    for (const platz of plaetze) await platz.dienst.takt();
  }
}

/** Die drei Ereignisse, mit denen die Nachweise beginnen. */
export async function grundlage(a: Platz): Promise<void> {
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
    nutzlast: { abschnittId: "EO", name: "Deich Nord", typ: "EINSATZORT", reihenfolge: 1 },
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
