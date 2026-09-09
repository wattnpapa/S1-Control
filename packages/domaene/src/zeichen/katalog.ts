/**
 * Der Katalog der taktischen Grundzeichen (M1.4, aus v1
 * `tactical-sign/catalog.ts`).
 *
 * Quelle der Eintraege ist `taktische-zeichen-core` — dieselbe Bibliothek, die
 * v1 verwendet, und die Umsetzung der DV 102. Sie ist plattformneutral: Der
 * ESM-Bau enthaelt weder DOM- noch Node-Zugriffe, geprueft beim Aufnehmen der
 * Abhaengigkeit. Damit darf sie in Ring 2 stehen (02-ZIELBILD.md).
 *
 * Die acht Einheiten-Kennungen der Bibliothek decken sich mit acht der zehn
 * taktischen Ebenen aus Zieldatenmodell §2.8; `PERSON` und `UNBESTIMMT`
 * kommen dort nicht vor, weil sie keine Groessenpunkte tragen.
 */

import { einheiten } from "taktische-zeichen-core";
import type { Organisation, TaktischeEbene } from "../ereignis.js";
import { ebeneAusV1Typ } from "./ebene.js";
import { normalisiereText } from "./text.js";

export interface KatalogEintrag {
  readonly schluessel: string;
  readonly bezeichnung: string;
  readonly einheit: string;
  readonly ebene: TaktischeEbene;
}

const KATALOG: readonly KatalogEintrag[] = einheiten
  .map((eintrag) => ({
    schluessel: eintrag.id,
    bezeichnung: eintrag.label,
    einheit: eintrag.id,
    ebene: ebeneAusV1Typ(eintrag.id),
  }))
  .sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de"));

/**
 * Der Katalog fuer eine Organisation.
 *
 * Die Grundzeichen der DV 102 sind organisationsunabhaengig — die
 * Organisation faerbt das Zeichen, sie aendert die Einheitenpunkte nicht.
 * Der Parameter steht trotzdem hier, weil er in v1 stand und weil eine
 * organisationsabhaengige Ergaenzung (Feuerwehr-Pfeilspitze, FueOrg-Palette)
 * absehbar ist; wo sie herkommt, ist mit den unbeschrifteten Zeichen der
 * FueOrg-Palette noch offen (04-OFFENE-ENTSCHEIDUNGEN.md Nr. 20).
 */
export function katalogFuer(organisation: Organisation): readonly KatalogEintrag[] {
  void organisation;
  return KATALOG;
}

/** Filtert den Katalog nach einer Sucheingabe; leere Eingabe liefert alles. */
export function filtereKatalog(
  eintraege: readonly KatalogEintrag[],
  suche?: string,
): readonly KatalogEintrag[] {
  const gesucht = normalisiereText(suche ?? "");
  if (gesucht.length === 0) return eintraege;
  return eintraege.filter((eintrag) => normalisiereText(eintrag.bezeichnung).includes(gesucht));
}
