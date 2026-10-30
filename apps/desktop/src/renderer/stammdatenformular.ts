/**
 * Das Formular der Stammdatenmaske ohne JSX: Eingabe herauslesen, Änderungen
 * erkennen, Entwürfe bauen.
 *
 * Getrennt von der Maske, damit die Regel „nur was sich geändert hat, und
 * mit dem Wert, den dieses Fenster gezeigt hat“ (§2.2a) nicht zwischen
 * Eingabefeldern steht. Ein Feld, das unverändert bestätigt wird, schreibt
 * nichts: Eine Tagebuchzeile „Ort: Oldenburg → Oldenburg“ sagte nichts.
 */

import {
  projektion,
  zeitpunktText,
  type Einsatzstammdaten,
  type Stammdatenfeld,
} from "@s1/domaene";

import { stammdatenAenderung, zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import type { Entwurf } from "../kontrakt/index.js";

/** Was in den Feldern der Maske steht — alles als Text, so wie getippt. */
export type Stammdateneingabe = Readonly<Record<Stammdatenfeld, string>>;

/** Der Wert, den dieses Fenster zeigt: ein nie gesetztes freies Feld ist `null`. */
function gezeigt(daten: Einsatzstammdaten, feld: Stammdatenfeld): string | null {
  return daten[feld] ?? null;
}

/** Füllt die Felder mit dem, was gilt; der Beginn steht als „TT.MM.JJJJ HH:MM“. */
export function eingabeAus(daten: Einsatzstammdaten): Stammdateneingabe {
  const eingabe = {} as Record<Stammdatenfeld, string>;
  for (const feld of projektion.STAMMDATENFELDER) {
    const wert = gezeigt(daten, feld) ?? "";
    eingabe[feld] = feld === "beginn" ? zeitpunktText(wert) : wert;
  }
  return eingabe;
}

/** Was eine Eingabe als Wert `neu` bedeutet; `undefined` heißt: nicht lesbar. */
function neuerWert(feld: Stammdatenfeld, eingabe: string): string | null | undefined {
  const text = eingabe.trim();
  if (feld === "beginn") return zeitpunktAusEingabe(text);
  if (text === "") return projektion.FREIE_STAMMDATENFELDER.includes(feld) ? null : undefined;
  return text;
}

/** Die erste Meldung, die gegen ein Übernehmen spricht — sonst `undefined`. */
export function eingabeFehler(eingabe: Stammdateneingabe): string | undefined {
  for (const feld of projektion.STAMMDATENFELDER) {
    const neu = neuerWert(feld, eingabe[feld]);
    if (neu === undefined && feld === "beginn") return "Der Einsatzbeginn ist nicht lesbar (TT.MM.JJJJ HH:MM).";
    // Dieselbe Prüfung, die der Worker vor dem Schreiben anwendet — hier nur
    // früher, damit der Knopf gesperrt ist, bevor ein Ruf abgewiesen wird.
    const fehler = projektion.stammdatenwertFehler(feld, neu ?? "");
    if (fehler !== undefined) return fehler;
  }
  return undefined;
}

/**
 * Je geändertem Feld ein Entwurf, in der Reihenfolge der Maske.
 *
 * Der Beginn gilt als unverändert, solange die Eingabe dieselbe Anzeige
 * ergibt: Die Anzeige rundet auf Minuten, und ein bloßes Bestätigen darf aus
 * `08:00:00+02:00` kein `06:00:00.000Z` machen, das im Tagebuch als
 * Änderung erschiene.
 */
export function stammdatenEntwuerfe(
  einsatzId: string,
  daten: Einsatzstammdaten,
  eingabe: Stammdateneingabe,
): readonly Entwurf[] {
  const anzeige = eingabeAus(daten);
  const entwuerfe: Entwurf[] = [];
  for (const feld of projektion.STAMMDATENFELDER) {
    if (eingabe[feld].trim() === anzeige[feld]) continue;
    const neu = neuerWert(feld, eingabe[feld]);
    const vorher = gezeigt(daten, feld);
    if (neu === undefined || neu === vorher) continue;
    entwuerfe.push(stammdatenAenderung(einsatzId, feld, vorher, neu));
  }
  return entwuerfe;
}
