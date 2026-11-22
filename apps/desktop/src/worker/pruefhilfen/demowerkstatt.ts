/**
 * Die Werkstatt der Demo-Nachweise — ausschließlich für Tests.
 *
 * Ein Wegwerf-Einsatz mit einem Aktendienst, dessen Uhr gestellt ist, wie im
 * Demo-Arbeiter des Betriebs (`akte-worker.ts`); die Uhr steht in `demo/stelluhr.ts`.
 */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { EINSATZ_UNTERORDNER, Einsatzablage, knotenDateisystem, legeEinsatzAn } from "@s1/speicher";

import { Aktendienst } from "../aktendienst.js";
import { Stelluhr } from "../demo/stelluhr.js";

export const DEMO_EINSATZ_ID = "2026-11-22-demo-einsatz-hochwasser-hunte";

const wegwerf: string[] = [];

export function raeumeDemoAuf(): void {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
}

export interface Demoplatz {
  readonly dienst: Aktendienst;
  readonly uhr: Stelluhr;
  readonly beginnMs: number;
}

export async function demoplatz(beginnMs: number): Promise<Demoplatz> {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-demo-"));
  wegwerf.push(wurzel);
  const ablage = new Einsatzablage(path.join(wurzel, "share", "einsaetze", DEMO_EINSATZ_ID), path.join(wurzel, "lokal", DEMO_EINSATZ_ID));
  await legeEinsatzAn(
    knotenDateisystem(),
    ablage,
    { einsatzId: DEMO_EINSATZ_ID, name: "Demo", datum: "2026-11-22", angelegtAm: new Date(beginnMs).toISOString(), angelegtVon: "Test" },
    EINSATZ_UNTERORDNER,
  );
  const uhr = new Stelluhr(beginnMs);
  const clientId = `1${"0".repeat(31)}`;
  const dienst = new Aktendienst({
    akteId: "akte-demo",
    dateisystem: knotenDateisystem(),
    zeit: uhr.zeit,
    ablage,
    clientId,
    einsatzId: DEMO_EINSATZ_ID,
    akteur: { benutzer: "Demo", host: "pruefrechner", clientId },
    anzeigename: "Demo-Arbeitsplatz",
    rechnername: "pruefrechner",
    programmversion: "0.0.0-test",
    neueKennung: () => `9${"f".repeat(31)}`,
    kompressor: {
      deflateRaw: (daten) => new Uint8Array(deflateRawSync(daten)),
      inflateRaw: (daten) => new Uint8Array(inflateRawSync(daten)),
    },
    sende: () => undefined,
    takte: { spiegelungMs: 0, taktAMs: 0, taktBMs: 0, praesenzMs: 0, monitorMs: 0 },
  });
  await dienst.oeffne();
  return { dienst, uhr, beginnMs };
}
