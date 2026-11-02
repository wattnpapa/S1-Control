/**
 * Die Nutzlasten der Versorgung (S4, KONZEPT-S4.md §6) — additiv zum Katalog.
 *
 * Eigene Datei, damit `schemata.ts` nicht weiter wächst; `schemata.ts` reicht
 * sie unverändert weiter, der Katalog findet sie unter demselben Namensraum.
 */

import { z } from "zod";

import { zAnzahl, zId, zPflichttext, zText, zZeitpunkt } from "./bausteine.js";

// --- Unterkunft (S4.2) ------------------------------------------------------

/**
 * Eine Unterkunft mit **einer** Kapazität (Entscheidung 2): Eine Turnhalle
 * trennt nicht nach m/w/d; die Belegung zeigt die Aufteilung trotzdem.
 */
export const UnterkunftAngelegt = z.object({
  unterkunftId: zId,
  name: zPflichttext,
  ort: zText.optional(),
  kapazitaet: zAnzahl,
  bemerkung: zText.optional(),
});

export const UnterkunftGeaendert = z.object({
  unterkunftId: zId,
  feld: z.enum(["name", "ort", "kapazitaet", "bemerkung"]),
});

/** `grund` ist Pflicht: Wer eine Unterkunft auflöst, nimmt Leuten ihr Bett. */
export const UnterkunftAufgeloest = z.object({ unterkunftId: zId });
export const UnterkunftWiederhergestellt = z.object({ unterkunftId: zId });

/**
 * Die Zuweisung hängt als Feld `unterkunftId` an der Einheit (Form a, Wert in
 * `neu`): Verschieben und Entfernen der Einheit nehmen sie mit, und der Fold
 * braucht keine zweite Karte.
 */
export const EinheitUntergebracht = z.object({ einheitId: zId, ab: zZeitpunkt.optional() });
export const UnterbringungAufgehoben = z.object({ einheitId: zId });

// --- Mahlzeitenregel, Ausgabestellen, Bestellung (S4.3) --------------------

export const zMahlzeit = z.enum(["FRUEHSTUECK", "MITTAG", "ABEND", "NACHT"]);

/** Die Regel steht als Ganzes in `neu` (LWW über die ganze Regel); die Nutzlast nennt den Einsatz. */
export const MahlzeitenregelGesetzt = z.object({ einsatzId: zId });

/** Eine Zeile der Regel, wie sie in `neu` steht — vom Worker vor dem Schreiben geprüft. */
export const zMahlzeitregelzeile = z.object({
  mahlzeit: zMahlzeit,
  uhrzeit: z.string().regex(/^([01]\d|2[0-3])[0-5]\d$/),
  schichten: z.array(zPflichttext),
});

export const AusgabestelleAngelegt = z.object({
  ausgabestelleId: zId,
  name: zPflichttext,
  ort: zText.optional(),
  traeger: zText.optional(),
  mahlzeiten: z.array(zMahlzeit).optional(),
});

export const AusgabestelleEntfernt = z.object({ ausgabestelleId: zId });
export const AusgabestelleWiederhergestellt = z.object({ ausgabestelleId: zId });

/** Der Bereich bekommt seine Ausgabestelle als Feld (Form a, Wert in `neu`). */
export const AbschnittAusgabestelleGesetzt = z.object({ abschnittId: zId });

export const MahlzeitBestellt = z.object({
  bestellungId: zId,
  /** Der Kalendertag der Mahlzeit in Ortszeit, `JJJJ-MM-TT`. */
  datum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mahlzeit: zMahlzeit,
  ausgabestelleId: zId.optional(),
  portionen: zAnzahl,
  vegetarisch: zAnzahl,
  vegan: zAnzahl,
  bestelltBei: zText.optional(),
  bestelltVon: zText.optional(),
});

/** Die gelieferte Menge steht in `neu`. */
export const MahlzeitGeliefert = z.object({ bestellungId: zId });
/** `grund` ist Pflicht: Eine Stornierung lässt eine Küche umsonst kochen. */
export const MahlzeitStorniert = z.object({ bestellungId: zId });
export const MahlzeitStornoZurueckgenommen = z.object({ bestellungId: zId });

// --- Sofortbedarf-Abarbeitung (S4.4) ----------------------------------------

/** Die Felder des Sofortbedarfs aus dem Bogen, je einzeln erledigbar. */
export const SOFORTBEDARF_FELDER = ["VERPFLEGUNG", "DIESEL", "BENZIN", "GEMISCH", "UNTERBRINGUNG", "RUHEZEIT"] as const;
export const zSofortbedarfFeld = z.enum(SOFORTBEDARF_FELDER);

/** Je Feld ein Ereignis: Diesel kann erledigt sein und Unterbringung noch nicht. */
export const SofortbedarfErledigt = z.object({ einheitId: zId, feld: zSofortbedarfFeld });
export const SofortbedarfWiederOffen = z.object({ einheitId: zId, feld: zSofortbedarfFeld });
