/**
 * Der Entwurf, den „Aufgeben“, „Aufnehmen“ oder „Nachtragen“ der
 * Nachrichtenmaske schreibt — herausgelöst aus `Nachrichtenmaske.tsx`, damit
 * die Maske zeichnet und dieses Modul baut (AGENTS.md §6).
 *
 * Zusammengesetzt aus der Anlage (Feld 7 bis 17), bei der FmZ dem
 * Aufnahmevermerk mit Gegenstelle, den Folgen (Nummer, Sichtung, beim Nachtrag
 * Annahme und Beförderung, Kennzeichen `nachtrag`) und dem `grund` nach
 * „Trotzdem“ (Entscheidung 13).
 *
 * Neu (R2-ETB P2-6): Anschrift und Absender, die genau einer Einheit oder
 * einem Abschnitt der Lage gleichen, tragen den Bezug (`anschriftBezug`,
 * `absenderBezug`) — das Schema kennt die Felder, der Kontrakt der Anlage
 * (`Nachrichtenanlage`) noch nicht. Sie gehen deshalb als zusätzliche
 * Schlüssel mit; `nachrichtVerfassen` reicht Objekte unverändert durch.
 */

import type { Sichtungsvermerk } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import { nachrichtAufnehmen, type Funkkontakt } from "../kontrakt/fmzschritte.js";
import type { Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { aufnahmeAus, folgeAus, nachweisAus, type Aufnahmewerte } from "./fmzformate.js";
import { bezuegeAus, type Bezugsziel } from "./nachrichtenbezug.js";
import { anlageAus, type Maskenwerte } from "./nachrichtenformate.js";
import { mitGrund, nachtragFolge, type Nachtragswerte } from "./Papiernachtrag.js";

export interface Aufgabeteile {
  readonly nachrichtId: string;
  readonly werte: Maskenwerte;
  readonly aufnahmewerte: Aufnahmewerte;
  readonly nachtragswerte: Nachtragswerte;
  readonly nachtrag: boolean;
  /** Die FmZ nimmt einen Eingang auf (oberer Teil frei). */
  readonly fmz: boolean;
  /** Ein Ausgang vom Blatt trägt Annahme, Beförderung und Nummer mit (Fernmelder P2-9). */
  readonly ausgangVomBlatt: boolean;
  readonly sichtung: Sichtungsvermerk | undefined;
  readonly grund: string | undefined;
  readonly ziele: readonly Bezugsziel[];
  /** Additiv: der Kontakt im Funkplan beim Aufnehmen per Funk (Einheit und Rufgruppe). */
  readonly kontakt?: Funkkontakt | undefined;
}

/** Die Anlage mit Aufnahmevermerk, Gegenstelle und den Bezügen zur Lage. */
export function anlageMitAufnahme(t: Aufgabeteile): Nachrichtenanlage {
  const anlage = anlageAus(t.werte, t.nachrichtId);
  // R2-ETB P2-6: Bezug zur Lage, wenn Anschrift oder Absender genau eine Einheit oder einen Abschnitt nennen.
  const mitBezug: Nachrichtenanlage = { ...anlage, ...bezuegeAus(t.werte.anschrift, t.werte.absender, t.ziele) };
  const vermerk = t.fmz ? aufnahmeAus(t.aufnahmewerte) : undefined;
  if (vermerk === undefined) return mitBezug;
  const gegenstelle = t.aufnahmewerte.gegenstelle.trim();
  return { ...mitBezug, aufnahme: vermerk, ...(gegenstelle === "" ? {} : { gegenstelle }) };
}

/** Der ganze Entwurf: Anlage und Folgen in einem Schritt (Fernmelder P2-9), mit `grund` (R2-SGL P1-2). */
export function aufgabeAus(t: Aufgabeteile): Entwurf {
  const nachweis = t.fmz ? nachweisAus(t.aufnahmewerte) : undefined;
  const folge = {
    ...folgeAus(nachweis, t.sichtung),
    ...(t.ausgangVomBlatt ? nachtragFolge(t.nachtragswerte) : {}),
    // R2-SGL P1-2: `nachtrag: true` kennzeichnet den Papier-Nachtrag für Tagebuch und Akte.
    ...(t.nachtrag ? { nachtrag: true } : {}),
    ...(t.fmz && t.kontakt !== undefined ? { kontakt: t.kontakt } : {}),
  };
  return mitGrund(nachrichtAufnehmen(anlageMitAufnahme(t), folge), t.grund);
}
