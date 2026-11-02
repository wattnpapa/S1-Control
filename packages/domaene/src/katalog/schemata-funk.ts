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

// --- Funkplan F3: Funkprobe und Schwelle „kein Kontakt" ----------------------

/**
 * Die Ergebnisse einer Funkprobe. Ein geschlossener Bereich: An ihm hängt der
 * Feldpfad (`letzteFunkprobe/<ergebnis>`), und ein Ergebnis, das dieser Client
 * nicht kennt, wüsste er keinem Pfad zuzuordnen.
 */
export const FUNKPROBE_ERGEBNISSE = ["KONTAKT", "KEIN_KONTAKT"] as const;
export type Funkprobenergebnis = (typeof FUNKPROBE_ERGEBNISSE)[number];

/**
 * Eine Funkprobe an der Einheit (Form a). Das Ergebnis wählt den Feldpfad:
 * `letzteFunkprobe/KONTAKT` hält die letzte gelungene, `…/KEIN_KONTAKT` die
 * letzte gescheiterte Probe. Zwei Pfade und nicht einer, weil ein „kein
 * Kontakt" den letzten Kontakt nicht zurücksetzen darf (§3): Auf einem
 * gemeinsamen Feld verdrängte er ihn.
 *
 * Der Wert in `neu` ist `{ zeitpunkt, rufgruppeId?, grund? }`. `zeitpunkt` ist
 * die Funkzeit — die fachliche Zeit wie `ereignisZeit` bei `StatusGesetzt` —
 * und steht im Wert, damit eine Rücknahme mit dem Vorher-Wert auch die Zeit
 * der vorigen Probe zurückbringt. `grund` ist bei KEIN_KONTAKT Pflicht; die
 * Pflicht hängt am Ergebnis und nicht an der Art, deshalb prüft sie der
 * Worker und nicht der Katalog.
 */
export const FunkprobeDurchgefuehrt = z.object({ einheitId: zId, ergebnis: z.enum(FUNKPROBE_ERGEBNISSE) });

/**
 * Die Schwelle „kein Kontakt" des Einsatzes in Minuten (Entscheidung 4), Wert
 * in `neu`. Ein eigenes Ereignis und kein weiteres Feld von
 * `KostenParameterGeaendert`: Die Schwelle ist kein Kostenparameter, und ihr
 * Pfad läge sonst unter `einsatz/kosten`.
 */
export const FunkParameterGesetzt = z.object({ einsatzId: zId });
