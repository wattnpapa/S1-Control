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
