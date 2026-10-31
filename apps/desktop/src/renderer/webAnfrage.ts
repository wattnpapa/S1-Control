/**
 * Bausteine der Web-Brücke für schreibende Rufe: welche Rufe schreiben, wie
 * eine Anfrage-ID entsteht und wie lange sie bei unbekanntem Ausgang gilt.
 *
 * **Warum die ID am Inhalt hängt.** Der Bediener wiederholt eine Eingabe, indem
 * er dasselbe Formular erneut absendet — die Brücke sieht dann einen Ruf mit
 * demselben Körper, aber keine „Benutzeraktion". Ein Ruf mit unbekanntem
 * Ausgang behält deshalb seine ID, solange er gilt ({@link ANFRAGE_GUELTIG_MS});
 * der identische Ruf in dieser Zeit ist die Wiederholung und trägt dieselbe ID.
 * Der Dienst liefert dann das erste Ergebnis, statt noch einmal zu schreiben.
 * Jeder Ruf mit eindeutigem Ausgang (Erfolg oder klare Ablehnung) gibt seine ID
 * frei; die nächste gleiche Eingabe ist wieder eine neue Aktion.
 */

import type { Ruf } from "../kontrakt/index.js";

/** Die Rufe, die etwas ändern: Sie bekommen eine ID und werden bei Unterbrechung gesperrt. */
const SCHREIBENDE_ARTEN: ReadonlySet<Ruf["art"]> = new Set<Ruf["art"]>([
  "einstellungenSetzen",
  "einsatzAnlegen",
  "einsatzOeffnen",
  "einsatzSchliessen",
  "bedienen",
  "zurueck",
  "buendelEinlesen",
  "buendelSchreiben",
  "programmpaketHolen",
  "eebScan",
  "eebZuruecksetzen",
  "eebUebernehmen",
  "ausgabeErzeugen",
  "htmlMonitorSchalten",
  "einsatzArchivieren",
  "akteErzeugen",
]);

export function istSchreibend(art: Ruf["art"]): boolean {
  return SCHREIBENDE_ARTEN.has(art);
}

/** So lange gilt die ID eines Rufs mit unbekanntem Ausgang für eine Wiederholung. */
export const ANFRAGE_GUELTIG_MS = 2 * 60_000;
const ANFRAGE_MAX = 50;

/** 32 Hexzeichen, auch ohne sicheren Kontext (`randomUUID` gibt es nur unter https). */
export function neueAnfrageId(): string {
  const bytes = new Uint8Array(16);
  const krypto = (globalThis as { crypto?: Crypto }).crypto;
  if (krypto?.getRandomValues !== undefined) {
    krypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

interface Offen {
  readonly id: string;
  readonly bis: number;
}

/** Merkt sich die IDs der Rufe, deren Ausgang unbekannt ist. */
export class OffeneAnfragen {
  readonly #offen = new Map<string, Offen>();
  readonly #uhr: () => number;
  readonly #neueId: () => string;

  constructor(uhr: () => number, neueId: () => string = neueAnfrageId) {
    this.#uhr = uhr;
    this.#neueId = neueId;
  }

  get anzahl(): number {
    return this.#offen.size;
  }

  /** Die ID für diesen Körper: die offene, falls es eine Wiederholung ist, sonst eine neue. */
  idFuer(koerper: string): string {
    const jetzt = this.#uhr();
    const vorhanden = this.#offen.get(koerper);
    if (vorhanden !== undefined && vorhanden.bis > jetzt) return vorhanden.id;
    return this.#neueId();
  }

  /** Der Ausgang ist unbekannt: Die ID bleibt für die Wiederholung stehen. */
  merke(koerper: string, id: string): void {
    this.#offen.delete(koerper);
    this.#offen.set(koerper, { id, bis: this.#uhr() + ANFRAGE_GUELTIG_MS });
    while (this.#offen.size > ANFRAGE_MAX) {
      const aelteste = this.#offen.keys().next();
      if (aelteste.done === true) break;
      this.#offen.delete(aelteste.value);
    }
  }

  /** Der Ausgang ist bekannt: Die nächste gleiche Eingabe ist eine neue Aktion. */
  gib(koerper: string): void {
    this.#offen.delete(koerper);
  }
}
