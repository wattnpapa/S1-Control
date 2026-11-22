/**
 * Die Ereignisse der Fachlage (Stab-Review vom 22.11.2026, docs/audits/stab).
 *
 * Je Bereich eine eigene Entität mit zwei Arten: die **Anlage** (Form b,
 * ohne Undo wie ein Tagebucheintrag: Eine Meldung wird nicht ungeschrieben,
 * sondern berichtigt oder zurückgezogen) und die **Feldänderung** (Form a,
 * LWW, rücknehmbar) für Stand, Nachträge und Zurückziehen. Die Felder, die
 * eine Änderung treffen darf, stehen je Art fest im Schema.
 *
 * Datenschutz: Ein Patient trägt die Kennung der Anhängekarte, keinen Namen.
 */

import { z } from "zod";

import { AMTSHILFE_STAENDE, DEICHSCHADEN_ARTEN, SICHTUNGSKATEGORIEN, STOERUNG_BEREICHE } from "../fachlage-werte.js";
import { zId, zPflichttext, zText, zZeitpunkt } from "./bausteine.js";

const zCm = z.number().int().min(-10_000).max(100_000);

// --- Lage je Abschnitt (S2 FA-S2-1, S3 FA-S3-2, FüGeh S2 FA-FG-2) ----------

export const AbschnittslageGemeldet = z.object({
  lageId: zId,
  abschnittId: zId,
  zeitpunkt: zZeitpunkt,
  lage: zPflichttext,
  ort: zText.optional(),
  bedarf: zText.optional(),
});
export const AbschnittslageGeaendert = z.object({ lageId: zId, feld: z.enum(["lage", "ort", "bedarf", "zurueckgezogen"]) });

// --- Pegel (Wasserbehörde WW-A1) --------------------------------------------

export const PegelstandGemessen = z.object({
  messungId: zId,
  pegel: zPflichttext,
  zeitpunkt: zZeitpunkt,
  wertCm: zCm,
  prognoseCm: zCm.optional(),
  prognoseFuer: zZeitpunkt.optional(),
  quelle: zText.optional(),
});
export const PegelstandGeaendert = z.object({ messungId: zId, feld: z.enum(["wertCm", "prognoseCm", "prognoseFuer", "quelle", "zurueckgezogen"]) });

// --- Deich (Wasserbehörde WW-A2) --------------------------------------------

export const DeichschadenGemeldet = z.object({
  schadenId: zId,
  deichKm: zPflichttext,
  art: z.enum(DEICHSCHADEN_ARTEN),
  beschreibung: zText,
  zeitpunkt: zZeitpunkt,
  abschnittId: zId.optional(),
});
export const DeichschadenGeaendert = z.object({ schadenId: zId, feld: z.enum(["stand", "massnahme", "beschreibung", "art"]) });

// --- Patienten (Fachberater San San-A1, S1 FA-S1-3) -------------------------

export const PatientErfasst = z.object({
  patientId: zId,
  kennung: zPflichttext,
  sichtung: z.enum(SICHTUNGSKATEGORIEN),
  einsatzkraft: z.boolean(),
  organisation: zText.optional(),
  verletzung: zText.optional(),
  zeitpunkt: zZeitpunkt,
  abschnittId: zId.optional(),
});
export const PatientGeaendert = z.object({ patientId: zId, feld: z.enum(["sichtung", "verbleib", "transportziel", "verletzung"]) });

// --- Amtshilfe (Bundeswehr Bw-A1) -------------------------------------------

export const AmtshilfeBeantragt = z.object({
  antragId: zId,
  kennung: zPflichttext,
  an: zPflichttext,
  leistung: zPflichttext,
  umfang: zText.optional(),
  benoetigtAb: zZeitpunkt.optional(),
  zeitpunkt: zZeitpunkt,
  stand: z.enum(AMTSHILFE_STAENDE).optional(),
});
export const AmtshilfeGeaendert = z.object({ antragId: zId, feld: z.enum(["stand", "bemerkung", "umfang", "benoetigtAb"]) });

// --- Material (S4 S4-A1, S4-A2) ---------------------------------------------

export const MaterialAngefordert = z.object({
  materialId: zId,
  bezeichnung: zPflichttext,
  menge: z.number().positive().max(10_000_000),
  mengeneinheit: zPflichttext,
  zeitpunkt: zZeitpunkt,
  abschnittId: zId.optional(),
  benoetigtBis: zZeitpunkt.optional(),
  lieferant: zText.optional(),
});
export const MaterialGeaendert = z.object({ materialId: zId, feld: z.enum(["stand", "lieferant", "menge", "bemerkung"]) });

// --- Presse (S5 S5-A1) ------------------------------------------------------

export const PressemitteilungVerfasst = z.object({
  mitteilungId: zId,
  titel: zPflichttext,
  text: zPflichttext,
  zeitpunkt: zZeitpunkt,
});
export const PressemitteilungGeaendert = z.object({ mitteilungId: zId, feld: z.enum(["stand", "titel", "text", "freigabe"]) });

// --- Störungen IuK (S6 S6-A1) -----------------------------------------------

export const StoerungGemeldet = z.object({
  stoerungId: zId,
  bereich: z.enum(STOERUNG_BEREICHE),
  beschreibung: zPflichttext,
  ersatzweg: zText.optional(),
  zeitpunkt: zZeitpunkt,
});
export const StoerungGeaendert = z.object({ stoerungId: zId, feld: z.enum(["stand", "ersatzweg", "beschreibung"]) });
