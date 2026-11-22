/**
 * Die Wertelisten der Fachlage (Stab-Review vom 22.11.2026): Lage je
 * Abschnitt, Pegel, Deich, Patienten, Amtshilfe, Material, Presse, Störungen.
 *
 * Offene Listen wie Status und Organisation: Das Schema der Anlage prüft
 * Arten und Kategorien; ein Stand, den eine neuere Fassung kennt, hält die
 * Faltung dieses Clients nicht an (§3.7), die Anzeige nennt ihn, wie er kam.
 * Begriffe sind Annahmen nach üblicher Stabspraxis und am Standort zu prüfen.
 */

/** Schadensarten am Deich. */
export const DEICHSCHADEN_ARTEN = ["SICKERSTELLE", "QUALMWASSER", "RUTSCHUNG", "UEBERSTROEMUNG", "BRUCH", "SONSTIGES"] as const;
/** Bearbeitungsstand einer Deichschadstelle. */
export const DEICHSCHADEN_STAENDE = ["GEMELDET", "IN_ARBEIT", "GESICHERT", "UNTER_BEOBACHTUNG", "ZURUECKGEZOGEN"] as const;

/** Sichtungskategorien (SK1 rot bis SK4 blau). */
export const SICHTUNGSKATEGORIEN = ["SK1", "SK2", "SK3", "SK4"] as const;
/** Verbleib eines Patienten. */
export const PATIENT_VERBLEIBE = ["VOR_ORT", "TRANSPORT", "UEBERGEBEN", "ENTLASSEN", "ZURUECKGEZOGEN"] as const;

/** Bearbeitungsstand eines Unterstützungsantrags (Amtshilfe). */
export const AMTSHILFE_STAENDE = ["BEANTRAGT", "IN_PRUEFUNG", "RUECKFRAGE", "GENEHMIGT", "ABGELEHNT", "IM_EINSATZ", "BEENDET", "ZURUECKGEZOGEN"] as const;

/** Stand einer Materialanforderung. */
export const MATERIAL_STAENDE = ["ANGEFORDERT", "BESTELLT", "UNTERWEGS", "GELIEFERT", "STORNIERT"] as const;

/** Stand einer Pressemitteilung; freigeben darf die Leitung (Annahme). */
export const PRESSE_STAENDE = ["ENTWURF", "ZUR_FREIGABE", "FREIGEGEBEN", "VEROEFFENTLICHT", "ZURUECKGEZOGEN"] as const;

/** Bereiche einer IuK-Störung. */
export const STOERUNG_BEREICHE = ["FUNK", "TELEFON", "DATENNETZ", "IT", "DRUCKER", "STROM", "SONSTIGES"] as const;
export const STOERUNG_STAENDE = ["OFFEN", "IN_ARBEIT", "BEHOBEN"] as const;

/** Zurückgezogen gilt auch für Lagemeldung und Pegelstand (Feld `zurueckgezogen`). */
const WORT: Readonly<Record<string, string>> = {
  SICKERSTELLE: "Sickerstelle",
  QUALMWASSER: "Qualmwasser",
  RUTSCHUNG: "Rutschung",
  UEBERSTROEMUNG: "Überströmung",
  BRUCH: "Bruch",
  SONSTIGES: "Sonstiges",
  GEMELDET: "gemeldet",
  IN_ARBEIT: "in Arbeit",
  GESICHERT: "gesichert",
  UNTER_BEOBACHTUNG: "unter Beobachtung",
  ZURUECKGEZOGEN: "zurückgezogen",
  SK1: "SK 1 (rot)",
  SK2: "SK 2 (gelb)",
  SK3: "SK 3 (grün)",
  SK4: "SK 4 (blau)",
  VOR_ORT: "vor Ort",
  TRANSPORT: "im Transport",
  UEBERGEBEN: "übergeben",
  ENTLASSEN: "entlassen",
  BEANTRAGT: "beantragt",
  IN_PRUEFUNG: "in Prüfung",
  RUECKFRAGE: "Rückfrage",
  GENEHMIGT: "genehmigt",
  ABGELEHNT: "abgelehnt",
  IM_EINSATZ: "im Einsatz",
  BEENDET: "beendet",
  ANGEFORDERT: "angefordert",
  BESTELLT: "bestellt",
  UNTERWEGS: "unterwegs",
  GELIEFERT: "geliefert",
  STORNIERT: "storniert",
  ENTWURF: "Entwurf",
  ZUR_FREIGABE: "zur Freigabe",
  FREIGEGEBEN: "freigegeben",
  VEROEFFENTLICHT: "veröffentlicht",
  FUNK: "Funk",
  TELEFON: "Telefon",
  DATENNETZ: "Datennetz",
  IT: "IT",
  DRUCKER: "Drucker",
  STROM: "Strom",
  OFFEN: "offen",
  BEHOBEN: "behoben",
};

/** Das Wort zu einem Wert der Fachlage; unbekannte Werte, wie sie kamen. */
export function fachlagewort(wert: string): string {
  return WORT[wert] ?? wert;
}
