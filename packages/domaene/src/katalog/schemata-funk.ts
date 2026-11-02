/**
 * Die Nutzlasten des Funkplans (KONZEPT-FUNKPLAN.md §8) — additiv zum Katalog.
 *
 * Eigene Datei wie `schemata-versorgung.ts`, damit `schemata.ts` nicht weiter
 * wächst; `schemata.ts` reicht sie unverändert weiter.
 */

import { z } from "zod";

import { zBetriebsart, zId, zPflichttext, zText } from "./bausteine.js";

/**
 * Eine Rufgruppe, ein Kanal oder eine DMO-Gruppe. Der Name ist Freitext und
 * nicht eindeutig erzwungen: Die Fleetmap heißt in jedem Land anders, und zwei
 * Arbeitsplätze, die ohne Verbindung dieselbe Gruppe anlegen, erzeugen zwei
 * Einträge, die das Blatt beide zeigt (Entscheidung 9).
 */
export const RufgruppeAngelegt = z.object({
  rufgruppeId: zId,
  betriebsart: zBetriebsart,
  name: zPflichttext,
  zweck: zText.optional(),
  /** Welcher Platz oder welche Stelle abhört. */
  hoert: zText.optional(),
  /** Freitext oder Fahrzeugkennung des Gateways (DMO in das Netz). */
  gateway: zText.optional(),
  bemerkung: zText.optional(),
  reihenfolge: z.number().int().optional(),
  /** Bereichsbezug ohne Automatik (Entscheidung 3): Grundlage für „Bereich ≠ Gruppe". */
  abschnittId: zId.optional(),
});

/** Ein Feld je Ereignis, der Wert steht in `neu` (LWW je Feld). */
export const RufgruppeGeaendert = z.object({
  rufgruppeId: zId,
  feld: z.enum(["betriebsart", "name", "zweck", "hoert", "gateway", "bemerkung", "reihenfolge", "abschnittId"]),
});

/**
 * `grund` ist Pflicht: Wer eine Gruppe auflöst, nimmt Einheiten ihren Weg zur
 * Führungsstelle. Die Teilnehmer setzt das Auflösen nicht um (Entscheidung 9).
 */
export const RufgruppeAufgeloest = z.object({ rufgruppeId: zId });
export const RufgruppeWiederhergestellt = z.object({ rufgruppeId: zId });

/**
 * Die Hauptrufgruppe hängt als Feld `rufgruppeId` an der Einheit (Form a,
 * Wert in `neu`, `null` für „keine"). Verschieben der Einheit lässt sie
 * stehen: Ob ein Bereichswechsel ein Gruppenwechsel ist, weiß nur die
 * Führungsstelle.
 */
export const EinheitRufgruppeGesetzt = z.object({ einheitId: zId });

/** Für Prüfungen außerhalb des Katalogs: welche Felder `RufgruppeGeaendert` kennt. */
export const RUFGRUPPE_FELDER = RufgruppeGeaendert.shape.feld.options;
export type Rufgruppenfeld = (typeof RUFGRUPPE_FELDER)[number];
