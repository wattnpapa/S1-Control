/**
 * Die Wörter der Szenarien und ihre Übersetzung in die Werte des Kontrakts —
 * Stellen, Kopiefarben, Mittel, Vorrang — und die Hülle, die jeden Schritt
 * so laufen lässt, wie Cucumber es tut.
 *
 * Warum eigene Parameterausdrücke `{stelle}` und `{kopie}`: Die Szenarien
 * sollen sich lesen wie die Lehrunterlage („Wenn der Fernmelder die Nachricht
 * befördert"), nicht wie ein Aufruf mit Anführungszeichen um jede Stelle.
 * Der Ausdruck nimmt nur die bekannten Rollen an; ein Tippfehler im Feature
 * fällt deshalb als „Schritt nicht gefunden" auf und nicht erst als
 * „Arbeitsplatz fehlt".
 */

import process from "node:process";

import { defineParameterExpression } from "@amiceli/vitest-cucumber";
import type { TestContext } from "vitest";

import { abgebrochenBei, merkeAbbruch, type Rolle } from "./welt.js";

/** Rollenwort im Schritt → Stelle im Kontrakt und, bei zwei gleichen Stellen, welche. */
const ROLLEN: Readonly<Record<string, readonly [string, number]>> = {
  "die FmZ": ["FMZ", 1],
  "der Fernmelder": ["FMZ", 1],
  FmZ: ["FMZ", 1],
  "der LdF": ["LDF", 1],
  LdF: ["LDF", 1],
  "der Sichter": ["SICHTER", 1],
  "der erste Sichter": ["SICHTER", 1],
  "der zweite Sichter": ["SICHTER", 2],
  Sichter: ["SICHTER", 1],
  "der Leiter": ["LEITER", 1],
  Leiter: ["LEITER", 1],
};

function rolleAus(wort: string): Rolle {
  const bekannt = ROLLEN[wort];
  if (bekannt !== undefined) return { stelle: bekannt[0], nr: bekannt[1], wort };
  return { stelle: wort, nr: 1, wort };
}

// Längere Wörter zuerst, damit „der zweite Sichter" nicht als „der Sichter" … endet.
const ROLLEN_MUSTER = ["S[1-6]", ...Object.keys(ROLLEN).sort((a, b) => b.length - a.length)].join("|");

defineParameterExpression({ name: "stelle", regexp: new RegExp(ROLLEN_MUSTER), transformer: rolleAus });

const KOPIEN: Readonly<Record<string, string>> = { rote: "ROT", grüne: "GRUEN", blaue: "BLAU", rot: "ROT", grün: "GRUEN", blau: "BLAU" };

defineParameterExpression({ name: "kopie", regexp: /rote|grüne|blaue/, transformer: (wort: string) => KOPIEN[wort] ?? wort });

const MITTEL: Readonly<Record<string, string>> = { Funk: "FUNK", Telefon: "TELEFON", Telefax: "TELEFAX", DFÜ: "DFUE", Kurier: "KURIER" };

export function mittelAus(wort: string): string {
  const mittel = MITTEL[wort];
  if (mittel === undefined) throw new Error(`Unbekanntes Übermittlungsmittel „${wort}“ (bekannt: ${Object.keys(MITTEL).join(", ")}).`);
  return mittel;
}

/** „Sofort" und „Blitz"; „einfach" oder leer heißt ohne Vorrang. */
export function vorrangAus(wort: string | undefined): string | undefined {
  if (wort === undefined || wort === "" || wort === "einfach") return undefined;
  if (wort === "Sofort") return "SOFORT";
  if (wort === "Blitz") return "BLITZ";
  throw new Error(`Unbekannter Vorrang „${wort}“ (bekannt: einfach, Sofort, Blitz).`);
}

/** Die Stelle eines Verteilereintrags: „S2", „Leiter", „Sichter". */
export function stelleAus(wort: string): string {
  return rolleAus(wort).stelle;
}

/** „S2 rot, S3 grün, Leiter blau" → Verteilereinträge des Laufzettels. */
export function verteilerAus(text: string): { stelle: string; kopie: string }[] {
  return text.split(",").map((teil) => {
    const worte = teil.trim().split(/\s+/u);
    const farbe = worte.pop() ?? "";
    const kopie = KOPIEN[farbe];
    if (kopie === undefined || worte.length === 0) throw new Error(`Verteilereintrag „${teil.trim()}“ ist nicht „Stelle Farbe“ (z. B. „S2 rot“).`);
    return { stelle: stelleAus(worte.join(" ")), kopie };
  });
}

/** Eine Tabelle „| Feld | Wert |" als Nachschlagewerk. */
export type Tabelle = readonly Readonly<Record<string, string>>[];

export function felder(tabelle: Tabelle): Map<string, string> {
  return new Map(tabelle.map((zeile) => [zeile["Feld"] ?? "", zeile["Wert"] ?? ""]));
}

export function pflicht(f: Map<string, string>, name: string): string {
  const wert = f.get(name);
  if (wert === undefined || wert === "") throw new Error(`Die Tabelle nennt kein Feld „${name}“.`);
  return wert;
}

/**
 * Mit `S1_BDD_ALLE_SCHRITTE=1` laufen auch die Schritte nach einem Fehlschlag.
 * Für die Fehlersuche: So zeigt ein Lauf jeden roten Schritt eines Szenarios,
 * nicht nur den ersten — wissend, dass Folgefehler darunter sein können.
 */
const ALLE_SCHRITTE = process.env["S1_BDD_ALLE_SCHRITTE"] === "1";

type Schrittkoerper = (...parameter: never[]) => unknown;
export type Definiere = (name: string, fn: (ctx: TestContext, ...parameter: unknown[]) => Promise<void>) => void;

/**
 * Jeder Schritt ist in Vitest ein eigener Test. Schlägt einer fehl, liefen
 * die folgenden sonst gegen einen halben Zustand weiter und meldeten
 * Folgefehler; Cucumber überspringt sie. Diese Hülle tut dasselbe und nennt
 * den Schritt, an dem es hing. `neuerAnfang` hebt die Sperre auf: der erste
 * Schritt jedes Hintergrunds baut die Welt neu.
 */
export function schritt(definiere: Definiere, text: string, koerper: Schrittkoerper, neuerAnfang = false): void {
  definiere(text, async (ctx, ...parameter) => {
    const vorher = abgebrochenBei();
    if (!neuerAnfang && vorher !== undefined && !ALLE_SCHRITTE) {
      ctx.skip(`übersprungen, weil „${vorher}“ fehlschlug`);
      return;
    }
    try {
      await (koerper as (...p: unknown[]) => unknown)(...parameter);
    } catch (fehler) {
      merkeAbbruch(ctx.task.name);
      throw fehler;
    }
  });
}
