/**
 * Aufbauhilfen für die Tests von `@s1/speicher` — ausschließlich Prüfhilfe.
 *
 * Wie `pruefhilfen/ereignisbau.ts` in `@s1/domaene` bewusst nicht aus
 * `index.ts` exportiert, aber unter `src/` gelegen, damit `tsc -b` und ESLint
 * sie mit denselben Ringgrenzen prüfen wie den Produktionscode.
 */

import { HlcUhr, type Akteur } from "@s1/domaene";

import type { Dateisystem } from "../dateisystem.js";
import { knotenDateisystem } from "../knotenDateisystem.js";
import { Einsatzablage } from "../pfade.js";
import { oeffneSchreiber, type Schreiber } from "../schreiber.js";
import type { Zeitquelle } from "../zeit.js";
import { spielwiese, type Spielwiese } from "./spielwiese.js";

/** Eine stellbare Uhr — die injizierte Zeitquelle aus §8, Vorbemerkung. */
export class Standuhr {
  #jetzt: number;

  constructor(start = 1_757_340_000_000) {
    this.#jetzt = start;
  }

  /** Als {@link Zeitquelle} verwendbar. */
  readonly lies: Zeitquelle = () => this.#jetzt;

  /** Stellt die Uhr um `ms` vor. */
  weiter(ms: number): void {
    this.#jetzt += ms;
  }

  /** Stellt die Uhr auf einen festen Wert. */
  stelle(ms: number): void {
    this.#jetzt = ms;
  }
}

export function akteur(clientId: string): Akteur {
  return { benutzer: `Bediener ${clientId}`, host: `rechner-${clientId}`, clientId };
}

/** Eine Einsatzablage mit Share- und Spiegelordner innerhalb einer Spielwiese. */
export function ablageIn(wiese: Spielwiese): Einsatzablage {
  return new Einsatzablage(wiese.bei("share", "einsatz"), wiese.bei("lokal", "einsatz"));
}

export interface Arbeitsplatz extends AsyncDisposable {
  readonly wiese: Spielwiese;
  readonly ablage: Einsatzablage;
  readonly uhr: Standuhr;
  readonly dateisystem: Dateisystem;
  /** Öffnet einen Schreiber auf dieser Ablage — beliebig oft, für „Neustart". */
  oeffne(clientId: string, segmentgroesse?: number): Promise<Schreiber>;
}

/** Baut eine Spielwiese mit Ablage, Standuhr und einem echten Dateisystem. */
export async function arbeitsplatz(dateisystem?: Dateisystem): Promise<Arbeitsplatz> {
  const wiese = await spielwiese();
  const fs = dateisystem ?? knotenDateisystem();
  const ablage = ablageIn(wiese);
  const uhr = new Standuhr();
  return {
    wiese,
    ablage,
    uhr,
    dateisystem: fs,
    oeffne: (clientId, segmentgroesse) =>
      oeffneSchreiber({
        dateisystem: fs,
        zeit: uhr.lies,
        ablage,
        clientId,
        akteur: akteur(clientId),
        uhr: new HlcUhr({ clientId, wanduhr: uhr.lies }),
        ...(segmentgroesse === undefined ? {} : { segmentgroesse }),
        warte: async () => undefined,
      }),
    async [Symbol.asyncDispose]() {
      await wiese[Symbol.asyncDispose]();
    },
  };
}
