/**
 * Der Ereignisrahmen nach KONZEPT-SPEICHER.md §2.4 und §2.5.
 *
 * Die Speicherschicht kennt genau die Felder aus §2.4; alles Weitere ist für
 * sie undurchsichtige Nutzlast. §2.5 fügt eine Zusicherung hinzu, die hier
 * eingelöst wird: „`vorher` wird unverändert mitgeschrieben und beim Lesen
 * unverändert herausgegeben." Ausgewertet wird es allein im Fold — ohne diesen
 * Wert wäre Last-Writer-Wins ein stilles Verwerfen.
 *
 * Felder ohne Wert werden **weggelassen**, nicht als `null` gesetzt: Die
 * kanonische Serialisierung nach §7.6 unterscheidet beides, und ein `null`, das
 * nie gesetzt wurde, änderte den `zustandsHash`.
 */

import { SCHEMA_VERSION, type Akteur, type Hlc } from "@s1/domaene";

import type { Ereignisentwurf } from "./schreibergebnis.js";
import type { Rahmenblick } from "./zeile.js";

/** Was der Schreiber zu einem Entwurf beisteuert. */
export interface Rahmenkopf {
  readonly clientId: string;
  /** §3.3: vor dem Schreiben der Zeile erhöht und dauerhaft gemacht. */
  readonly laufnummer: number;
  readonly hlc: Hlc;
  /** Kettenprüfsumme der vorhergehenden Zeile derselben Schreiberkette (§2.3). */
  readonly vorgaenger: string;
  readonly akteur: Akteur;
  /** ISO-8601 mit Zeitzone. Nur Anzeige und Plausibilisierung, nie Ordnung (§3.1). */
  readonly wanduhr: string;
}

/** Baut den Rahmen nach §2.4. */
export function baueRahmen(entwurf: Ereignisentwurf, kopf: Rahmenkopf): Rahmenblick {
  const rahmen: Record<string, unknown> = {
    id: `${kopf.clientId}:${kopf.laufnummer}`,
    hlc: kopf.hlc,
    vorgaenger: kopf.vorgaenger,
    schemaVersion: entwurf.schemaVersion ?? SCHEMA_VERSION,
    typ: entwurf.typ,
    akteur: kopf.akteur,
    wanduhr: kopf.wanduhr,
  };
  if (entwurf.nutzlast !== undefined) rahmen["nutzlast"] = entwurf.nutzlast;
  if (entwurf.vorher !== undefined) rahmen["vorher"] = entwurf.vorher;
  if (entwurf.neu !== undefined) rahmen["neu"] = entwurf.neu;
  if (entwurf.undoOf !== undefined) rahmen["undoOf"] = entwurf.undoOf;
  if (entwurf.korrekturVon !== undefined) rahmen["korrekturVon"] = entwurf.korrekturVon;
  if (entwurf.grund !== undefined) rahmen["grund"] = entwurf.grund;
  return rahmen as unknown as Rahmenblick;
}
