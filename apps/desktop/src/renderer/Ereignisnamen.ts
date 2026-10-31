/**
 * Die Namen der Vorgänge in Worten, die ein Helfer sagt.
 *
 * Es gibt diese Datei, damit „EinheitEntfernt“ nirgends als Knopftext oder in
 * einer Rückfrage steht. Die Tagebuch-Texte (`ART_TEXT`) sind Sätze für die
 * Liste („Einheit entfernt“); hier steht dasselbe in der Form, die die
 * Rücknahme braucht: Gegenstandsart und Tätigkeit getrennt, damit der Name des
 * Gegenstands dazwischen passt — „Einheit ‚TZ‘ entfernt“.
 */

import { projektion } from "@s1/domaene";

interface Benennung {
  /** Was betroffen ist: „Einheit“, „Abschnitt“. */
  readonly gegenstand: string;
  /** Was geschah, als Partizip: „entfernt“, „verschoben“. */
  readonly tat: string;
}

const BENENNUNGEN: Readonly<Record<string, Benennung>> = {
  EinheitGemeldet: { gegenstand: "Einheit", tat: "gemeldet" },
  EinheitEntfernt: { gegenstand: "Einheit", tat: "entfernt" },
  EinheitWiederhergestellt: { gegenstand: "Einheit", tat: "wiederhergestellt" },
  EinheitVerschoben: { gegenstand: "Einheit", tat: "verschoben" },
  EinheitAufgeteilt: { gegenstand: "Einheit", tat: "aufgeteilt" },
  EinheitZusammengefuehrt: { gegenstand: "Einheit", tat: "zusammengeführt" },
  EinheitStammdatenGeaendert: { gegenstand: "Einheit", tat: "geändert" },
  StaerkeGeaendert: { gegenstand: "Stärke der Einheit", tat: "geändert" },
  StatusGesetzt: { gegenstand: "Status der Einheit", tat: "geändert" },
  AbschnittAngelegt: { gegenstand: "Abschnitt", tat: "angelegt" },
  AbschnittUmbenannt: { gegenstand: "Abschnitt", tat: "umbenannt" },
  AbschnittAufgeloest: { gegenstand: "Abschnitt", tat: "aufgelöst" },
  AbschnittWiederhergestellt: { gegenstand: "Abschnitt", tat: "wiederhergestellt" },
  AbschnittUmgehaengt: { gegenstand: "Abschnitt", tat: "umgehängt" },
  AnforderungAngelegt: { gegenstand: "Anforderung", tat: "angelegt" },
  AnforderungStorniert: { gegenstand: "Anforderung", tat: "storniert" },
  AnforderungErledigt: { gegenstand: "Anforderung", tat: "erledigt" },
  AbloesungZugesagt: { gegenstand: "Ablösung", tat: "zugesagt" },
  EinsatzBeendet: { gegenstand: "Einsatz", tat: "beendet" },
  EinsatzWiedereroeffnet: { gegenstand: "Einsatz", tat: "wiedereröffnet" },
};

/** Der Vorgang in Worten ohne Gegenstandsname: „Einheit entfernt“. */
export function ereignisname(typ: string): string {
  const benennung = BENENNUNGEN[typ];
  if (benennung !== undefined) return `${benennung.gegenstand} ${benennung.tat}`;
  return projektion.ART_TEXT[typ] ?? typ;
}

/** Der Vorgang mit Gegenstand: „Einheit ‚TZ‘ entfernt“; ohne Namen wie {@link ereignisname}. */
export function ereignisMitObjekt(typ: string, objekt: string | undefined): string {
  const benennung = BENENNUNGEN[typ];
  const name = objekt === undefined || objekt === "" ? undefined : objekt;
  if (benennung === undefined) {
    const text = ereignisname(typ);
    return name === undefined ? text : `${text} (‚${name}‘)`;
  }
  return name === undefined
    ? `${benennung.gegenstand} ${benennung.tat}`
    : `${benennung.gegenstand} ‚${name}‘ ${benennung.tat}`;
}
