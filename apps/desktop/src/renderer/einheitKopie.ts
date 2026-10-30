/**
 * „Zeile kopieren“ — die Vorbelegung der Anlegemaske aus einer bestehenden Zeile.
 *
 * In der Excel kopiert Strg+K die markierte Zeile (m_zlKopieren): Bei
 * Teileinheiten gleicher Bauart — die zweite Bergungsgruppe, der zweite
 * Betreuungstrupp — spart das Tippen. Die Excel kopiert dabei **alles**, auch
 * Status, Schicht und die ID des Erfassungsbogens, und zählt so doppelt, bis
 * jemand korrigiert (Bestandsaufnahme `excel-vba-workflows.md` §3.4).
 *
 * Hier wird deshalb nur übernommen, was die Bauart beschreibt: Bezeichnung,
 * Organisation, Ebene, Herkunft, Stärke, Abschnitt und die Vorlage. Aufträge,
 * Fahrzeuge, Personen, Status und Zeiten gehören zu der Einheit, die da ist —
 * die Kopie ist eine neue, angeforderte Einheit und wird über dieselbe Anlage
 * geschrieben wie jede andere (`einheitsanlage.ts`).
 *
 * Eine reine Funktion ohne DOM, damit die Regel ohne Maske prüfbar ist.
 */

import { ORGANISATIONEN, TAKTISCHE_EBENEN, type Organisation, type TaktischeEbene, type Tabellenzeile } from "@s1/domaene";

import type { Staerkeeingabe } from "./Maskenfelder.js";

/** Was die Anlegemaske auf dem Weg „Ohne Vorlage“ vorbelegt. */
export interface Anlagevorbelegung {
  /** Die Anzeige der Quellzeile — für Titel und Hinweis der Maske. */
  readonly quelle: string;
  readonly bezeichnung: string;
  readonly organisation: Organisation | "";
  readonly ebene: TaktischeEbene | "";
  readonly staerke: Staerkeeingabe;
  readonly herkunft: string;
  readonly abschnittId: string;
  /** Nur, wenn die Quelle aus einer Vorlage stammt. */
  readonly vorlageId?: string;
}

/** „Bergungsgruppe (2)“ → Stamm „Bergungsgruppe“, Zähler 2. */
const ZAEHLER = /^(.*\S)\s*\((\d+)\)$/u;

function zerlege(name: string): { readonly stamm: string; readonly zahl: number } {
  const treffer = ZAEHLER.exec(name.trim());
  if (treffer === null) return { stamm: name.trim(), zahl: 1 };
  return { stamm: treffer[1] ?? "", zahl: Number.parseInt(treffer[2] ?? "1", 10) };
}

/**
 * Die Bezeichnung der Kopie: der Stamm der Quelle mit dem nächsten freien Zähler.
 *
 * Gezählt wird über die Bezeichnungen, die die Tabelle gerade zeigt — die
 * Quelle zählt als (1). Die Kopie einer Kopie zählt weiter und hängt keinen
 * zweiten Zähler an: Aus „Bergungsgruppe (2)“ wird „Bergungsgruppe (3)“ und
 * nicht „Bergungsgruppe (2) (2)“. Eindeutig muss die Bezeichnung nicht sein;
 * der Zähler ist eine Vorbelegung, die man in der Maske überschreibt.
 */
export function kopierteBezeichnung(quelle: string, vorhandene: readonly string[]): string {
  const { stamm, zahl } = zerlege(quelle);
  let hoechste = zahl;
  for (const name of vorhandene) {
    const teil = zerlege(name);
    if (teil.stamm === stamm) hoechste = Math.max(hoechste, teil.zahl);
  }
  return `${stamm} (${String(hoechste + 1)})`;
}

function zellwert(zeile: Tabellenzeile, schluessel: string): string {
  const wert = zeile.zellen[schluessel]?.wert;
  return typeof wert === "string" ? wert : "";
}

function alsOrganisation(wert: string): Organisation | "" {
  return (ORGANISATIONEN as readonly string[]).includes(wert) ? (wert as Organisation) : "";
}

function alsEbene(wert: string): TaktischeEbene | "" {
  return (TAKTISCHE_EBENEN as readonly string[]).includes(wert) ? (wert as TaktischeEbene) : "";
}

/**
 * Die Vorbelegung aus einer Tabellenzeile.
 *
 * Die Stärke ist die angezeigte (wirksame) — das ist die Zahl, die der
 * Bediener in der Zeile sieht und kopieren will. Ein unbekannter Wert in
 * Organisation oder Ebene bleibt leer und muss gewählt werden, statt still
 * auf etwas Falsches zu fallen.
 */
export function kopieVorbelegung(zeile: Tabellenzeile, vorhandene: readonly string[]): Anlagevorbelegung {
  const bezeichnung = zellwert(zeile, "bezeichnung") || zeile.anzeige;
  return {
    quelle: zeile.anzeige,
    bezeichnung: kopierteBezeichnung(bezeichnung, vorhandene),
    organisation: alsOrganisation(zellwert(zeile, "organisation")),
    ebene: alsEbene(zellwert(zeile, "ebene")),
    staerke: {
      fuehrer: String(zeile.staerke.fuehrer),
      unterfuehrer: String(zeile.staerke.unterfuehrer),
      mannschaft: String(zeile.staerke.mannschaft),
    },
    herkunft: zeile.herkunftName ?? "",
    abschnittId: zeile.abschnittId,
    ...(zeile.vorlageId === undefined ? {} : { vorlageId: zeile.vorlageId }),
  };
}
