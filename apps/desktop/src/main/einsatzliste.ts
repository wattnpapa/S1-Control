/**
 * Hilfen für die Einsatzliste: letzte Änderung und Doppelnamen.
 *
 * Aus `vermittlung.ts` herausgehalten (Datei und Funktionen bleiben klein).
 * Gelesen wird nur, was die Auswahl braucht — kein Fold, kein Blick in die
 * Ereignisse (§2.6): die Änderungszeit der Segmentdateien genügt, um die
 * Liste nach „zuletzt genutzt“ zu ordnen.
 */

import { stat } from "node:fs/promises";
import path from "node:path";

import { slugFuerEinsatz } from "@s1/domaene";
import { liesEinsatzanker, type Dateisystem } from "@s1/speicher";

import type { EinsatzEintrag } from "../kontrakt/index.js";

/** Liefert die Änderungszeit einer Datei in Millisekunden — oder `undefined`. */
export type Zeitleser = (pfad: string) => Promise<number | undefined>;

const echteZeit: Zeitleser = async (pfad) => {
  try {
    return (await stat(pfad)).mtimeMs;
  } catch {
    return undefined;
  }
};

/**
 * Die jüngste Änderungszeit von `einsatz.json` und `ereignisse/*` als ISO-Zeichenkette.
 *
 * Fehlertolerant gegen SMB-Latenzen und fehlende Dateien: Jeder Fehler heißt
 * „unbekannt“, nie „Liste kaputt“.
 */
export async function letzteAenderung(
  dateisystem: Dateisystem,
  einsatzordner: string,
  lies: Zeitleser = echteZeit,
): Promise<string | undefined> {
  const ereignisordner = path.join(einsatzordner, "ereignisse");
  let namen: readonly string[] = [];
  try {
    namen = await dateisystem.listeVerzeichnis(ereignisordner);
  } catch {
    // Kein Ereignisordner lesbar: dann zählt nur die Anlage.
  }
  // `einsatz.json` mit: Ein frisch angelegter Einsatz, dessen Ereignisse noch
  // nicht auf dem Share liegen, hat trotzdem eine Zeit.
  const pfade = [path.join(einsatzordner, "einsatz.json"), ...namen.map((name) => path.join(ereignisordner, name))];
  const zeiten = await Promise.all(pfade.map((pfad) => lies(pfad)));
  const juengste = zeiten.reduce<number>((m, z) => (z !== undefined && z > m ? z : m), 0);
  return juengste === 0 ? undefined : new Date(juengste).toISOString();
}

/** Ein Eintrag der Liste samt letzter Änderung; fehlende Änderung bleibt fort. */
export async function listeneintrag(
  dateisystem: Dateisystem,
  wurzel: string,
  ordner: string,
  lies?: Zeitleser,
): Promise<EinsatzEintrag | undefined> {
  const anker = await liesEinsatzanker(dateisystem, path.join(wurzel, ordner, "einsatz.json"));
  if (anker === undefined) return undefined;
  const geaendert = await letzteAenderung(dateisystem, path.join(wurzel, ordner), lies);
  return {
    ordner,
    name: anker.name,
    datum: anker.datum,
    ...(geaendert === undefined ? {} : { geaendert }),
  };
}

/** Die Ordnung der Liste: zuletzt geändert zuerst, dann nach Datum absteigend. */
export function ordneEinsaetze(eintraege: EinsatzEintrag[]): EinsatzEintrag[] {
  const schluessel = (e: EinsatzEintrag): string => e.geaendert ?? e.datum;
  return eintraege.sort((a, b) => (schluessel(a) < schluessel(b) ? 1 : schluessel(a) > schluessel(b) ? -1 : 0));
}

/** Gibt es schon einen Einsatz desselben Tages, dessen Name dieselbe Kennung ergibt? */
export function gibtEsDenEinsatz(eintraege: readonly EinsatzEintrag[], datum: string, name: string): boolean {
  const slug = slugFuerEinsatz(name);
  return eintraege.some((e) => e.datum === datum && slugFuerEinsatz(e.name) === slug);
}

/** Die Meldung bei einem doppelten Namen — ohne Pfade. */
export const EINSATZ_DOPPELT = "Ein Einsatz mit diesem Namen existiert bereits.";
