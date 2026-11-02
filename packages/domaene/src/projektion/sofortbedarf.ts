/**
 * Der Sofortbedarf aus dem Bogen und seine Abarbeitung (S4.1/S4.4, 4f).
 *
 * Der Sofortbedarf ist die Erstmeldung beim Eintreffen: Verpflegung für n
 * Personen, Diesel, Benzin, Gemisch in Litern, Unterbringung, Ruhezeit.
 * „Als erledigt melden" ist ein Ereignis **je Feld**
 * (`SofortbedarfErledigt`), damit Diesel erledigt sein kann und
 * Unterbringung noch nicht. Die Liste verschwindet nicht, wenn alles erledigt
 * ist; die Zeile wird blass.
 */

import { geraeteText } from "../kennzahlen.js";
import { SOFORTBEDARF_FELDER } from "../katalog/schemata-versorgung.js";
import type { Zustand } from "../zustand.js";

import { bezeichnung, bogenbedarf, zahl, type Bogenbedarf, type Versorgungseinheit } from "./versorgung.js";

export type Sofortbedarfsfeld = (typeof SOFORTBEDARF_FELDER)[number];

export interface Sofortbedarfszeile {
  readonly einheitId: string;
  readonly einheit: string;
  readonly bereich: string;
  readonly eingetroffenAm?: string;
  readonly verpflegungPersonen: number;
  readonly dieselLiter: number;
  readonly benzinLiter: number;
  readonly gemischLiter: number;
  readonly unterbringung: boolean;
  readonly ruhezeit: boolean;
  /** Der Stand des Bogens, aus dem der Bedarf stammt. */
  readonly stand?: string;
  /** Die Felder, die einen Bedarf tragen (Zahl > 0 oder „ja"). */
  readonly felder: readonly Sofortbedarfsfeld[];
  /** Je erledigtem Feld der Zeitpunkt der Meldung (Wanduhr, nur Anzeige). */
  readonly erledigt: { readonly [feld in Sofortbedarfsfeld]?: string };
  /** Alle Felder mit Bedarf sind erledigt — die Zeile wird blass. */
  readonly vollstaendig: boolean;
  /** Fahrzeuge der Einheit nach Typ (K10) — für die Kraftstoffliste. */
  readonly fahrzeuge: string;
}

export interface Sofortbedarfssumme {
  readonly verpflegungPersonen: number;
  readonly dieselLiter: number;
  readonly benzinLiter: number;
  readonly gemischLiter: number;
  readonly unterbringung: number;
  readonly ruhezeit: number;
}

export interface Sofortbedarfsliste {
  readonly zeilen: readonly Sofortbedarfszeile[];
  readonly summe: Sofortbedarfssumme;
  /** Was davon noch nicht erledigt ist — die offenen Liter und Personen. */
  readonly offen: Sofortbedarfssumme & { readonly zeilen: number };
}

function felderMitBedarf(b: Bogenbedarf): Sofortbedarfsfeld[] {
  const felder: Sofortbedarfsfeld[] = [];
  if (zahl(b.verpflegungPersonen) > 0) felder.push("VERPFLEGUNG");
  if (zahl(b.dieselLiter) > 0) felder.push("DIESEL");
  if (zahl(b.benzinLiter) > 0) felder.push("BENZIN");
  if (zahl(b.gemischLiter) > 0) felder.push("GEMISCH");
  if (b.unterbringung === true) felder.push("UNTERBRINGUNG");
  if (b.ruhezeitErforderlich === true) felder.push("RUHEZEIT");
  return felder;
}

function erledigtVon(eintrag: Versorgungseinheit): Sofortbedarfszeile["erledigt"] {
  const erledigt: { [feld in Sofortbedarfsfeld]?: string } = {};
  for (const feld of SOFORTBEDARF_FELDER) {
    const stand = eintrag.einheit.sofortbedarfErledigt?.[feld];
    if (stand?.wert === true) erledigt[feld] = stand.wanduhr ?? "";
  }
  return erledigt;
}

function zeileAus(zustand: Zustand, eintrag: Versorgungseinheit, b: Bogenbedarf): Sofortbedarfszeile {
  const eingetroffen = eintrag.einheit.eingetroffenAm?.wert;
  const meldungId = eintrag.einheit.meldungId?.wert;
  const stand = typeof meldungId === "string" ? zustand.meldungen[meldungId]?.stand.wert : undefined;
  const felder = felderMitBedarf(b);
  const erledigt = erledigtVon(eintrag);
  return {
    einheitId: eintrag.einheit.id,
    einheit: bezeichnung(eintrag),
    bereich: eintrag.bereich,
    ...(typeof eingetroffen === "string" ? { eingetroffenAm: eingetroffen } : {}),
    verpflegungPersonen: zahl(b.verpflegungPersonen),
    dieselLiter: zahl(b.dieselLiter),
    benzinLiter: zahl(b.benzinLiter),
    gemischLiter: zahl(b.gemischLiter),
    unterbringung: b.unterbringung === true,
    ruhezeit: b.ruhezeitErforderlich === true,
    ...(typeof stand === "string" ? { stand } : {}),
    felder,
    erledigt,
    vollstaendig: felder.every((f) => erledigt[f] !== undefined),
    fahrzeuge: geraeteText(zustand, eintrag.einheit.id).replaceAll(",\n", ", "),
  };
}

const NULL: Sofortbedarfssumme = { verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: 0, ruhezeit: 0 };

/** Addiert eine Zeile; mit `nurOffen` nur die Felder, die noch nicht erledigt sind. */
function plus(s: Sofortbedarfssumme, z: Sofortbedarfszeile, nurOffen: boolean): Sofortbedarfssumme {
  const zaehlt = (feld: Sofortbedarfsfeld): boolean => !nurOffen || z.erledigt[feld] === undefined;
  return {
    verpflegungPersonen: s.verpflegungPersonen + (zaehlt("VERPFLEGUNG") ? z.verpflegungPersonen : 0),
    dieselLiter: s.dieselLiter + (zaehlt("DIESEL") ? z.dieselLiter : 0),
    benzinLiter: s.benzinLiter + (zaehlt("BENZIN") ? z.benzinLiter : 0),
    gemischLiter: s.gemischLiter + (zaehlt("GEMISCH") ? z.gemischLiter : 0),
    unterbringung: s.unterbringung + (z.unterbringung && zaehlt("UNTERBRINGUNG") ? 1 : 0),
    ruhezeit: s.ruhezeit + (z.ruhezeit && zaehlt("RUHEZEIT") ? 1 : 0),
  };
}

/** Die Abarbeitungsliste der Erstmeldungen aus dem Bogen (4f): offene Zeilen zuerst. */
export function sofortbedarfsliste(zustand: Zustand, einheiten: readonly Versorgungseinheit[]): Sofortbedarfsliste {
  const zeilen: Sofortbedarfszeile[] = [];
  for (const eintrag of einheiten) {
    const b = bogenbedarf(eintrag);
    if (b !== undefined) zeilen.push(zeileAus(zustand, eintrag, b));
  }
  zeilen.sort((a, b) => Number(a.vollstaendig) - Number(b.vollstaendig));
  return {
    zeilen,
    summe: zeilen.reduce((s, z) => plus(s, z, false), NULL),
    offen: { ...zeilen.reduce((s, z) => plus(s, z, true), NULL), zeilen: zeilen.filter((z) => !z.vollstaendig).length },
  };
}
