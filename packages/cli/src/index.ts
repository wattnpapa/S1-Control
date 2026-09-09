/**
 * `@s1/cli` — Ring 3: die Kommandozeile `s1`.
 *
 * Geplant sind `akte pruefe | falte | exportiere`, `simuliere` und `diagnose`
 * (02-ZIELBILD.md, Abschnitt „Diagnose im Einsatz"). Dieser Stand kennt
 * `diagnose` und `simuliere`; `simuliere` ist das Arbeitspaket M0.4
 * (05-UMSETZUNGSPLAN.md).
 *
 * Verbindliche Grenze: alle `@s1/*` und `node:` sind erlaubt, Electron und
 * React nicht (02-ZIELBILD.md, „Vier Ringe"; erzwungen in `eslint.config.mjs`).
 */

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { einsatzKennung } from "@s1/domaene";
import { kopfAlsHtml } from "@s1/ausgaben";
import { HINWEIS_PORT } from "@s1/netz";
import { EINSATZ_UNTERORDNER, einsatzOrdner, knotenDateisystem } from "@s1/speicher";

import { berichte } from "./simulation/bericht.js";
import { fuehreSimulationAus } from "./simulation/lauf.js";
import { abnahmePlan, deutePlan, pruefePlan, type Plan } from "./simulation/plan.js";

/** Ergebnis eines Kommandos: Ausgabetext und Exitcode. */
export interface Ergebnis {
  readonly text: string;
  readonly code: number;
}

const HILFE = [
  "s1 — Kommandozeile zu S1-Control",
  "",
  "  s1 diagnose <share-wurzel>   Verdrahtung und Ablagepfade anzeigen",
  "",
  "  s1 simuliere [Optionen]      Konvergenz unter Störung prüfen (M0.4)",
  "    --plan <datei>             Plandatei (JSON); fehlende Felder aus dem Abnahmeplan",
  "    --startwert <zahl>         Startwert des Zufalls; derselbe Wert ergibt denselben Lauf",
  "    --clients <zahl>           Zahl der Arbeitsplätze (Abnahme: 4)",
  "    --kommandos <zahl>         Zahl der Bedienschritte (Abnahme: 2.000)",
  "    --phasen <zahl>            Zahl der Ruhephasen (Abnahme: 5)",
  "    --verzeichnis <pfad>       Arbeitsverzeichnis; ohne Angabe ein Wegwerf-Ordner",
  "    --behalten                 Arbeitsverzeichnis nicht löschen",
  "    --still                    keine Fortschrittszeilen",
  "",
].join("\n");

/** Liest die benannten Optionen aus `argv`; alles Unbekannte wird gemeldet, nicht verschluckt. */
function deuteOptionen(argv: readonly string[]): Map<string, string | true> {
  const optionen = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) throw new SyntaxError(`Unerwartetes Wort: ${wort}`);
    const name = wort.slice(2);
    const naechstes = argv[i + 1];
    if (naechstes === undefined || naechstes.startsWith("--")) {
      optionen.set(name, true);
    } else {
      optionen.set(name, naechstes);
      i += 1;
    }
  }
  return optionen;
}

function zahlAus(optionen: Map<string, string | true>, name: string): number | undefined {
  const wert = optionen.get(name);
  if (wert === undefined) return undefined;
  if (wert === true) throw new SyntaxError(`--${name} braucht einen Wert`);
  const zahl = Number(wert);
  if (!Number.isFinite(zahl)) throw new SyntaxError(`--${name} muss eine Zahl sein, ist ${wert}`);
  return zahl;
}

const ERLAUBTE_OPTIONEN = new Set([
  "plan",
  "startwert",
  "clients",
  "kommandos",
  "phasen",
  "verzeichnis",
  "behalten",
  "still",
]);

/** Baut den Plan aus Plandatei und Kommandozeile; die Kommandozeile hat Vorrang. */
export async function planAus(optionen: Map<string, string | true>): Promise<Plan> {
  for (const name of optionen.keys()) {
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
  }
  const datei = optionen.get("plan");
  let plan =
    datei === undefined || datei === true
      ? abnahmePlan()
      : deutePlan(await fsp.readFile(datei, "utf8"));
  const ueberschrieben: Partial<Plan> = {};
  const startwert = zahlAus(optionen, "startwert");
  if (startwert !== undefined) Object.assign(ueberschrieben, { startwert });
  const clients = zahlAus(optionen, "clients");
  if (clients !== undefined) Object.assign(ueberschrieben, { clients });
  const kommandos = zahlAus(optionen, "kommandos");
  if (kommandos !== undefined) Object.assign(ueberschrieben, { kommandos });
  const phasen = zahlAus(optionen, "phasen");
  if (phasen !== undefined) Object.assign(ueberschrieben, { phasen });
  plan = { ...plan, ...ueberschrieben };
  pruefePlan(plan);
  return plan;
}

async function simuliere(argv: readonly string[]): Promise<Ergebnis> {
  const optionen = deuteOptionen(argv);
  const plan = await planAus(optionen);
  const angegeben = optionen.get("verzeichnis");
  const wurzel =
    typeof angegeben === "string"
      ? angegeben
      : await fsp.mkdtemp(path.join(os.tmpdir(), "s1-simuliere-"));
  const behalten = optionen.has("behalten") || typeof angegeben === "string";
  const still = optionen.has("still");
  const fortschritt: string[] = [];

  try {
    const ergebnis = await fuehreSimulationAus({
      plan,
      dateisystem: knotenDateisystem(),
      wurzel,
      ...(still ? {} : { melde: (zeile: string) => fortschritt.push(zeile) }),
    });
    const text = [...fortschritt, ...(fortschritt.length > 0 ? [""] : []), berichte(ergebnis)].join("\n");
    // Exitcode 1 bei einem Mangel: `s1 simuliere` ist ein Abnahmeschritt und
    // muss in einem CI-Lauf ohne Textauswertung entscheidbar sein (Auflage 18).
    return { text, code: ergebnis.erfolg ? 0 : 1 };
  } finally {
    if (!behalten) await fsp.rm(wurzel, { recursive: true, force: true });
  }
}

/**
 * Führt ein Kommando aus.
 *
 * Bewusst als Funktion über `argv` statt mit direktem Zugriff auf `process`: so
 * ist jedes Kommando ohne Unterprozess testbar. Den Griff nach `process` macht
 * allein `bin.ts`.
 */
export async function fuehreAus(argv: readonly string[]): Promise<Ergebnis> {
  const [kommando, ...reste] = argv;

  if (kommando === undefined || kommando === "hilfe" || kommando === "--help") {
    return { text: HILFE, code: 0 };
  }

  if (kommando === "diagnose") {
    const wurzel = reste[0] ?? ".";
    const beispiel = einsatzKennung("2026-09-08", "Beispiel");
    const zeilen = [
      `Share-Wurzel:      ${wurzel}`,
      `Beispiel-Einsatz:  ${einsatzOrdner(wurzel, "2026-09-08", "Beispiel")}`,
      `Kennung:           ${beispiel.ordner}`,
      `Unterordner:       ${EINSATZ_UNTERORDNER.join(", ")}`,
      `UDP-Hinweis-Port:  ${HINWEIS_PORT}`,
      `Ausgabekopf:       ${kopfAlsHtml({ datum: "2026-09-08", einsatzName: "Beispiel", stand: "Probe" }).split("\n").length} Zeilen HTML`,
    ];
    return { text: zeilen.join("\n"), code: 0 };
  }

  if (kommando === "simuliere") {
    try {
      return await simuliere(reste);
    } catch (fehler) {
      return { text: `s1 simuliere: ${(fehler as Error).message}`, code: 2 };
    }
  }

  return { text: `Unbekanntes Kommando: ${kommando}\n\n${HILFE}`, code: 2 };
}
