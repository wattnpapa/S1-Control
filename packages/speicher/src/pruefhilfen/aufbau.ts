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
import { Spiegelung } from "../spiegelung.js";
import { leererUploadZustand } from "../uploadZustand.js";
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

/**
 * Eine Einsatzablage mit Share- und Spiegelordner innerhalb einer Spielwiese.
 *
 * `rechner` trennt die lokalen Spiegel: Jeder Client hält nach §5.1 seine
 * **eigene** vollständige Kopie unter seinem Anwendungsdatenverzeichnis. Ein
 * gemeinsamer Spiegel wäre kein Testaufbau, sondern ein anderes Verfahren.
 */
export function ablageIn(wiese: Spielwiese, rechner = "rechner-1"): Einsatzablage {
  return new Einsatzablage(wiese.bei("share", "einsatz"), wiese.bei(rechner, "einsatz"));
}

export interface Arbeitsplatz extends AsyncDisposable {
  readonly wiese: Spielwiese;
  readonly ablage: Einsatzablage;
  readonly uhr: Standuhr;
  readonly dateisystem: Dateisystem;
  /** Öffnet einen Schreiber auf dieser Ablage — beliebig oft, für „Neustart". */
  oeffne(clientId: string, segmentgroesse?: number): Promise<Schreiber>;
  /**
   * Ein zweiter Rechner am **selben Share** mit **eigenem** lokalem Spiegel
   * (§5.1) und derselben Uhr, damit die Reihenfolge der Ereignisse im Test
   * bestimmt bleibt.
   */
  andererRechner(name: string): Arbeitsplatz;
}

/** Baut eine Spielwiese mit Ablage, Standuhr und einem echten Dateisystem. */
export async function arbeitsplatz(dateisystem?: Dateisystem): Promise<Arbeitsplatz> {
  const wiese = await spielwiese();
  const fs = dateisystem ?? knotenDateisystem();
  const uhr = new Standuhr();
  return baueArbeitsplatz(wiese, fs, uhr, "rechner-1");
}

function baueArbeitsplatz(
  wiese: Spielwiese,
  fs: Dateisystem,
  uhr: Standuhr,
  rechner: string,
): Arbeitsplatz {
  const ablage = ablageIn(wiese, rechner);
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
    andererRechner: (name) => baueArbeitsplatz(wiese, fs, uhr, name),
    async [Symbol.asyncDispose]() {
      await wiese[Symbol.asyncDispose]();
    },
  };
}

/**
 * Legt den Einsatzordner auf dem Share an und schreibt `einsatz.json` (§5.6).
 *
 * `einsatz.json` „wird beim Anlegen des Einsatzes einmal geschrieben und danach
 * nie wieder verändert" und trägt nur, was zur Identifikation des Ordners nötig
 * ist. §5.7 prüft vor jedem Spiegelungsversuch gegen genau diese Kennung.
 */
export async function legeEinsatzAn(
  platz: Arbeitsplatz,
  einsatzId: string,
  anlegenderClient = "9f3c1a20",
): Promise<void> {
  await platz.dateisystem.legeVerzeichnisAn(platz.ablage.share);
  await platz.dateisystem.legeVerzeichnisAn(platz.ablage.shareEreignisse);
  await platz.dateisystem.schreibeNeuAnlegen(
    platz.ablage.shareEinsatzDatei,
    new TextEncoder().encode(
      JSON.stringify({
        einsatzId,
        angelegtAm: new Date(platz.uhr.lies()).toISOString(),
        anlegenderClient,
        formatVersion: 1,
      }),
    ),
  );
}

/** Baut eine Spiegelung, die den Offset des laufenden Segments beim Schreiber erfragt. */
export function spiegelungFuer(
  platz: Arbeitsplatz,
  schreiber: Schreiber,
  einsatzId: string,
  zustand = leererUploadZustand(),
): Spiegelung {
  return new Spiegelung(
    {
      dateisystem: platz.dateisystem,
      zeit: platz.uhr.lies,
      ablage: platz.ablage,
      clientId: schreiber.clientId,
      einsatzId,
      vollstaendigerOffset: () => ({
        segment: schreiber.segment,
        offset: schreiber.lokalerVollstaendigerOffset,
      }),
      identitaeten: schreiber.identitaeten,
    },
    zustand,
  );
}
