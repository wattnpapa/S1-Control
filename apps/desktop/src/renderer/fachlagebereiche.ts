/**
 * Was das Blatt „Fachlage“ je Bereich zeigt und erfasst (Stab-Review
 * 2026-11-22). Die Ereignisarten sind je Bereich eigene (`schemata-fachlage.ts`);
 * hier steht nur, welche Felder die Maske anbietet, welche Spalten die Tabelle
 * zeigt und welche Felder sich nachträglich ändern lassen. Die Feldnamen sind
 * die der Schemata.
 */

import {
  AMTSHILFE_STAENDE,
  DEICHSCHADEN_ARTEN,
  DEICHSCHADEN_STAENDE,
  MATERIAL_STAENDE,
  PATIENT_VERBLEIBE,
  PRESSE_STAENDE,
  SICHTUNGSKATEGORIEN,
  STOERUNG_BEREICHE,
  STOERUNG_STAENDE,
  type Fachlagebereich,
} from "@s1/domaene";

export type Feldart = "text" | "langtext" | "zahl" | "zeit" | "abschnitt" | "janein" | "auswahl";

export interface Fachlagefeld {
  readonly feld: string;
  readonly titel: string;
  readonly art: Feldart;
  readonly pflicht?: boolean;
  readonly werte?: readonly string[];
  /** Vorbelegung in der Anlagemaske. */
  readonly vorgabe?: string;
}

export interface Fachlagebeschreibung {
  readonly titel: string;
  /** Wofür der Bereich da ist, ein Satz. */
  readonly zweck: string;
  /** Präfix der Kennung neuer Einträge. */
  readonly praefix: string;
  /** Text des Knopfs „Neu“. */
  readonly neu: string;
  readonly anlage: readonly Fachlagefeld[];
  /** Spalten der Tabelle: Feldnamen; „abschnitt“ und „stand“ sind abgeleitet. */
  readonly spalten: readonly { readonly feld: string; readonly titel: string }[];
  readonly aenderbar: readonly Fachlagefeld[];
}

const ZEIT: Fachlagefeld = { feld: "zeitpunkt", titel: "Zeit (leer = jetzt)", art: "zeit" };
const ABSCHNITT: Fachlagefeld = { feld: "abschnittId", titel: "Abschnitt", art: "abschnitt" };
const ZURUECK: Fachlagefeld = { feld: "zurueckgezogen", titel: "Zurückgezogen", art: "janein" };
const stand = (werte: readonly string[]): Fachlagefeld => ({ feld: "stand", titel: "Stand", art: "auswahl", werte });

export const FACHLAGEBESCHREIBUNG: Readonly<Record<Fachlagebereich, Fachlagebeschreibung>> = {
  lage: {
    titel: "Lage je Abschnitt",
    zweck: "Die gemeldete Lage je Einsatzabschnitt mit Ort und Bedarf; oben je Abschnitt die jüngste Meldung.",
    praefix: "LG",
    neu: "Lage melden …",
    anlage: [{ ...ABSCHNITT, pflicht: true }, { feld: "lage", titel: "Lage", art: "langtext", pflicht: true }, { feld: "ort", titel: "Ort (Straße, Deich-km, Koordinate)", art: "text" }, { feld: "bedarf", titel: "Bedarf", art: "text" }, ZEIT],
    spalten: [{ feld: "abschnitt", titel: "Abschnitt" }, { feld: "lage", titel: "Lage" }, { feld: "ort", titel: "Ort" }, { feld: "bedarf", titel: "Bedarf" }],
    aenderbar: [{ feld: "lage", titel: "Lage", art: "langtext" }, { feld: "ort", titel: "Ort", art: "text" }, { feld: "bedarf", titel: "Bedarf", art: "text" }, ZURUECK],
  },
  pegel: {
    titel: "Pegel",
    zweck: "Wasserstände mit Prognose; oben je Pegel der letzte Wert mit Tendenz.",
    praefix: "PG",
    neu: "Pegelstand eintragen …",
    anlage: [{ feld: "pegel", titel: "Pegel", art: "text", pflicht: true }, { feld: "wertCm", titel: "Wasserstand (cm)", art: "zahl", pflicht: true }, { feld: "prognoseCm", titel: "Prognose (cm)", art: "zahl" }, { feld: "prognoseFuer", titel: "Prognose für", art: "zeit" }, { feld: "quelle", titel: "Quelle", art: "text" }, ZEIT],
    spalten: [{ feld: "pegel", titel: "Pegel" }, { feld: "wertCm", titel: "cm" }, { feld: "prognoseCm", titel: "Prognose cm" }, { feld: "quelle", titel: "Quelle" }],
    aenderbar: [{ feld: "wertCm", titel: "Wasserstand (cm)", art: "zahl" }, { feld: "prognoseCm", titel: "Prognose (cm)", art: "zahl" }, { feld: "prognoseFuer", titel: "Prognose für", art: "zeit" }, { feld: "quelle", titel: "Quelle", art: "text" }, ZURUECK],
  },
  deich: {
    titel: "Deich",
    zweck: "Schadstellen nach Deichkilometer mit Art, Maßnahme und Stand.",
    praefix: "DS",
    neu: "Schadstelle melden …",
    anlage: [{ feld: "deichKm", titel: "Deich-km", art: "text", pflicht: true }, { feld: "art", titel: "Art", art: "auswahl", werte: DEICHSCHADEN_ARTEN, pflicht: true, vorgabe: "SICKERSTELLE" }, { feld: "beschreibung", titel: "Beschreibung", art: "langtext" }, ABSCHNITT, ZEIT],
    spalten: [{ feld: "deichKm", titel: "Deich-km" }, { feld: "art", titel: "Art" }, { feld: "beschreibung", titel: "Beschreibung" }, { feld: "massnahme", titel: "Maßnahme" }, { feld: "abschnitt", titel: "Abschnitt" }],
    aenderbar: [stand(DEICHSCHADEN_STAENDE), { feld: "massnahme", titel: "Maßnahme", art: "text" }, { feld: "beschreibung", titel: "Beschreibung", art: "langtext" }, { feld: "art", titel: "Art", art: "auswahl", werte: DEICHSCHADEN_ARTEN }],
  },
  patienten: {
    titel: "Patienten",
    zweck: "Verletzte und Erkrankte nach Kennung der Anhängekarte, ohne Namen; eigene Einsatzkräfte gekennzeichnet.",
    praefix: "PT",
    neu: "Patient erfassen …",
    anlage: [{ feld: "kennung", titel: "Kennung der Anhängekarte", art: "text", pflicht: true }, { feld: "sichtung", titel: "Sichtungskategorie", art: "auswahl", werte: SICHTUNGSKATEGORIEN, pflicht: true, vorgabe: "SK3" }, { feld: "einsatzkraft", titel: "Eigene Einsatzkraft", art: "janein" }, { feld: "organisation", titel: "Organisation", art: "text" }, { feld: "verletzung", titel: "Verletzung", art: "text" }, ABSCHNITT, ZEIT],
    spalten: [{ feld: "kennung", titel: "Kennung" }, { feld: "sichtung", titel: "SK" }, { feld: "einsatzkraft", titel: "Einsatzkraft" }, { feld: "verletzung", titel: "Verletzung" }, { feld: "transportziel", titel: "Transportziel" }],
    aenderbar: [{ feld: "sichtung", titel: "Sichtungskategorie", art: "auswahl", werte: SICHTUNGSKATEGORIEN }, { feld: "verbleib", titel: "Verbleib", art: "auswahl", werte: PATIENT_VERBLEIBE }, { feld: "transportziel", titel: "Transportziel", art: "text" }, { feld: "verletzung", titel: "Verletzung", art: "text" }],
  },
  amtshilfe: {
    titel: "Amtshilfe",
    zweck: "Unterstützungsanträge (etwa an die Bundeswehr) mit Bearbeitungsstand, auch über den Schichtwechsel.",
    praefix: "AH",
    neu: "Antrag erfassen …",
    anlage: [{ feld: "kennung", titel: "Antrags-Nr.", art: "text", pflicht: true }, { feld: "an", titel: "An", art: "text", pflicht: true, vorgabe: "Bundeswehr" }, { feld: "leistung", titel: "Leistung", art: "langtext", pflicht: true }, { feld: "umfang", titel: "Umfang", art: "text" }, { feld: "benoetigtAb", titel: "Benötigt ab", art: "zeit" }, ZEIT],
    spalten: [{ feld: "kennung", titel: "Nr." }, { feld: "an", titel: "An" }, { feld: "leistung", titel: "Leistung" }, { feld: "umfang", titel: "Umfang" }, { feld: "bemerkung", titel: "Bemerkung" }],
    aenderbar: [stand(AMTSHILFE_STAENDE), { feld: "bemerkung", titel: "Bemerkung", art: "text" }, { feld: "umfang", titel: "Umfang", art: "text" }, { feld: "benoetigtAb", titel: "Benötigt ab", art: "zeit" }],
  },
  material: {
    titel: "Material",
    zweck: "Material, Verbrauchsgüter und Betriebsstoff: Bedarf, Bestellung, Lieferung.",
    praefix: "MA",
    neu: "Material anfordern …",
    anlage: [{ feld: "bezeichnung", titel: "Bezeichnung", art: "text", pflicht: true }, { feld: "menge", titel: "Menge", art: "zahl", pflicht: true }, { feld: "mengeneinheit", titel: "Einheit", art: "text", pflicht: true, vorgabe: "Stück" }, ABSCHNITT, { feld: "benoetigtBis", titel: "Benötigt bis", art: "zeit" }, { feld: "lieferant", titel: "Lieferant", art: "text" }, ZEIT],
    spalten: [{ feld: "bezeichnung", titel: "Bezeichnung" }, { feld: "menge", titel: "Menge" }, { feld: "mengeneinheit", titel: "Einheit" }, { feld: "abschnitt", titel: "Abschnitt" }, { feld: "lieferant", titel: "Lieferant" }],
    aenderbar: [stand(MATERIAL_STAENDE), { feld: "lieferant", titel: "Lieferant", art: "text" }, { feld: "menge", titel: "Menge", art: "zahl" }, { feld: "bemerkung", titel: "Bemerkung", art: "text" }],
  },
  presse: {
    titel: "Presse",
    zweck: "Pressemitteilungen mit Freigabe durch die Leitung, ohne Umweg über die Fernmeldezentrale.",
    praefix: "PM",
    neu: "Mitteilung verfassen …",
    anlage: [{ feld: "titel", titel: "Titel", art: "text", pflicht: true }, { feld: "text", titel: "Text", art: "langtext", pflicht: true }, ZEIT],
    spalten: [{ feld: "titel", titel: "Titel" }, { feld: "text", titel: "Text" }, { feld: "freigabe", titel: "Freigabe" }],
    aenderbar: [stand(PRESSE_STAENDE), { feld: "freigabe", titel: "Freigegeben von", art: "text" }, { feld: "titel", titel: "Titel", art: "text" }, { feld: "text", titel: "Text", art: "langtext" }],
  },
  stoerungen: {
    titel: "Störungen",
    zweck: "Störungen von Funk, Telefon, Netz, IT, Drucker und Strom mit Ersatzweg, bis sie behoben sind.",
    praefix: "ST",
    neu: "Störung melden …",
    anlage: [{ feld: "bereich", titel: "Bereich", art: "auswahl", werte: STOERUNG_BEREICHE, pflicht: true, vorgabe: "FUNK" }, { feld: "beschreibung", titel: "Beschreibung", art: "langtext", pflicht: true }, { feld: "ersatzweg", titel: "Ersatzweg", art: "text" }, ZEIT],
    spalten: [{ feld: "bereich", titel: "Bereich" }, { feld: "beschreibung", titel: "Beschreibung" }, { feld: "ersatzweg", titel: "Ersatzweg" }],
    aenderbar: [stand(STOERUNG_STAENDE), { feld: "ersatzweg", titel: "Ersatzweg", art: "text" }, { feld: "beschreibung", titel: "Beschreibung", art: "langtext" }],
  },
};
