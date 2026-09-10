/**
 * Die gemeinsamen zod-Bausteine des Ereigniskatalogs
 * (KONZEPT-EREIGNISSE.md §5.1).
 *
 * Sie beschreiben **nur `nutzlast`**; der gesetzte Wert steht bei Form (a) im
 * Rahmen (§2.2). **Kein Schema ist `strict`** — §3.7 Punkt 3 verlangt, dass
 * ein Client ein Ereignis hoeherer Nutzlastversion mit zusaetzlichen Feldern
 * annimmt und unveraendert weiterspiegelt.
 */

import { z } from "zod";

/**
 * Obergrenze der Id-Laenge (Startwert S7, §5.1).
 *
 * Eine Entitaets-Id ist Nutzlast aus einer fremden Datei und wird Schluessel
 * einer Datensammlung. Ohne Schranke fuellte eine erfundene Id den Speicher
 * jedes Clients.
 */
export const ID_MAX_LAENGE = 200;

export const zId = z.string().min(1).max(ID_MAX_LAENGE);
export const zZeitpunkt = z.iso.datetime({ offset: true });
export const zDatum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const zAnzahl = z.number().int().nonnegative();
export const zText = z.string();
export const zPflichttext = z.string().min(1);
export const zStaerke = z.object({
  fuehrer: zAnzahl,
  unterfuehrer: zAnzahl,
  mannschaft: zAnzahl,
});

/**
 * Offene Wertebereiche (§3.7 Punkt 5): Zeichenkette, bekannte Werte als Liste.
 *
 * Ein `z.enum` waere hier falsch. Trifft ein Wert ein, den dieser Client nicht
 * kennt, ist das Ereignis **gueltig**; es entsteht `unbekannterWert`, und der
 * Wert wird unveraendert weitergespiegelt (§8.7). Ein Fold, der ihn abwiese,
 * loeschte die Meldung einer neueren Fassung aus der Lage.
 */
export const zStatus = zPflichttext;
export const zSchicht = zPflichttext;
export const zOrganisation = zPflichttext;
export const zEbene = zPflichttext;
export const zAbschnittstyp = zPflichttext;

/**
 * Geschlossene Wertebereiche: an ihnen haengt eine Regel ohne sinnvollen
 * Rueckfall (§3.7 Punkt 5).
 */
export const zEinsatzArt = z.enum(["EINSATZ", "UEBUNG", "VERANSTALTUNG"]);
export const zSchichtmodell = z.enum(["ZWEI_SCHICHT", "DREI_SCHICHT"]);
export const zRolle = z.enum(["FUEHRER", "UNTERFUEHRER", "MANNSCHAFT"]);
export const zGeschlecht = z.enum(["MAENNLICH", "WEIBLICH", "DIVERS"]);
export const zErnaehrung = z.enum(["FLEISCH", "VEGETARISCH", "VEGAN"]);
export const zPersonalErf = z.enum(["VOLLSTAENDIG", "NUR_STAERKE"]);
export const zMeldeStatus = z.enum(["ANWESEND", "ABGERUECKT", "AUFGEGANGEN"]);
export const zMeldeQuelle = z.enum([
  "SCAN",
  "MANUELL",
  "PDF_IMPORT",
  "AUFTEILUNG",
  "ZUSAMMENFUEHRUNG",
]);
export const zAuftragQuelle = z.enum(["MANUELL", "BEWEGUNG", "EEB"]);
export const zFahrzeugStatus = z.enum(["EINSATZBEREIT", "NICHT_EINSATZBEREIT"]);

export const zKontakt = z.object({
  art: z.enum(["MOBIL", "FESTNETZ", "EMAIL"]),
  dienstlich: z.boolean(),
  wert: zPflichttext,
});

export const zHierarchieEbene = z.object({
  art: zPflichttext,
  name: zPflichttext,
  kurz: zText.optional(),
  telefon: zText.optional(),
  email: zText.optional(),
});

/** Zieldatenmodell §3.2, aus dem Einheitenerfassungsbogen. */
export const zSofortbedarf = z.object({
  verpflegungPersonen: zAnzahl,
  dieselLiter: zAnzahl,
  benzinLiter: zAnzahl,
  gemischLiter: zAnzahl,
  unterbringung: z.boolean(),
  ruhezeitErforderlich: z.boolean(),
});

export const zZusage = z.object({
  zugesagtFuer: zZeitpunkt,
  zugesagtVon: zPflichttext,
  abloesendeEinheitId: zId.optional(),
});

export const zErledigung = z.object({
  erledigtAm: zZeitpunkt,
  abloesendeEinheitId: zId,
});

/** Prueft eine Liste auf Wiederholungen — §2.2 Form (c) verlangt jede Entitaet hoechstens einmal. */
export function eindeutig(werte: readonly string[]): boolean {
  return new Set(werte).size === werte.length;
}

/** Wertgleichheit zweier Staerke-Tripel; hier lokal, damit das Modul ohne Fold auskommt. */
export function gleichesTripel(
  a: { fuehrer: number; unterfuehrer: number; mannschaft: number },
  b: { fuehrer: number; unterfuehrer: number; mannschaft: number },
): boolean {
  return (
    a.fuehrer === b.fuehrer && a.unterfuehrer === b.unterfuehrer && a.mannschaft === b.mannschaft
  );
}
