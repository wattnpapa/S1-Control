/**
 * Zeichen-Inferenz: aus dem Namen einer Einheit einen Vorschlag fuer das
 * taktische Zeichen (M1.4, aus v1 `tactical-sign-inference.ts`).
 *
 * **Vorschlag, nicht Festlegung.** Dasselbe Prinzip, das der
 * Erfassungsbogen fuer `einheitSchluessel()` festhaelt: „von der App
 * VORGESCHLAGEN, vom Menschen bestaetigt". Der Fold kennt diese Datei nicht;
 * was sie liefert, wird von der Oberflaeche in ein `EinheitGemeldet` oder ein
 * `EinheitStammdatenGeaendert` geschrieben, wenn der Bediener es uebernimmt.
 *
 * **Rein.** Anders als in v1 traegt das Ergebnis **keinen Zeitstempel**: v1
 * setzte `updatedAt: new Date().toISOString()` in die Metadaten. In Ring 2
 * gibt es keine Uhr, und der Zeitpunkt steht ohnehin schon im Ereignisrahmen
 * (`wanduhr` und `hlc`, KONZEPT-SPEICHER.md §2.4). Ein zweiter Zeitstempel
 * waere eine zweite Wahrheit ueber denselben Vorgang.
 */

import type { Organisation, TaktischeEbene } from "../ereignis.js";
import { bewerteKandidaten } from "./bewertung.js";
import { filtereKatalog, katalogFuer, type KatalogEintrag } from "./katalog.js";
import { findeThwKuerzel, findeThwZug } from "./thw-kuerzel.js";

/**
 * Ab dieser Sicherheit wird ein Katalogtreffer uebernommen. Startwert aus v1
 * (`AUTO_THRESHOLD = 0.6`); nicht hergeleitet, sondern erprobt.
 */
export const UEBERNAHME_SCHWELLE = 0.6;

/** Fassung des Regelwerks; steigt, wenn sich Muster oder Gewichte aendern. */
export const REGEL_FASSUNG = 1;

export interface TaktischesZeichen {
  readonly grundzeichen: "taktische-formation";
  readonly organisation: Organisation;
  /** Der Einheitenteil, etwa „BrB" oder „TZ-R"; leer, wenn nichts passte. */
  readonly einheit: string;
  readonly ebene: TaktischeEbene;
  readonly verwaltungsstufe?: string;
  readonly text: string;
  readonly name: string;
}

export interface ZeichenHerkunft {
  readonly quelle: "vorschlag" | "bedienung";
  readonly rohname: string;
  readonly sicherheit?: number;
  readonly trefferSchluessel?: string;
  readonly trefferBezeichnung?: string;
  readonly regelFassung: number;
}

export interface ZeichenVorschlag {
  readonly zeichen: TaktischesZeichen;
  readonly herkunft: ZeichenHerkunft;
  readonly sicherheit: number;
}

interface Treffer {
  readonly sicherheit: number;
  readonly schluessel?: string;
  readonly bezeichnung?: string;
  readonly einheit?: string;
  readonly ebene?: TaktischeEbene;
}

function schluesselAus(praefix: string, einheit: string): string {
  return `${praefix}-${normalisierterSchluessel(einheit)}`;
}

function normalisierterSchluessel(wert: string): string {
  return wert
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function baueVorschlag(name: string, organisation: Organisation, treffer: Treffer): ZeichenVorschlag {
  return {
    sicherheit: treffer.sicherheit,
    zeichen: {
      grundzeichen: "taktische-formation",
      organisation,
      einheit: treffer.einheit ?? "",
      ebene: treffer.ebene ?? "UNBESTIMMT",
      text: "",
      name,
    },
    herkunft: {
      quelle: "vorschlag",
      rohname: name,
      sicherheit: treffer.sicherheit,
      trefferSchluessel: treffer.schluessel,
      trefferBezeichnung: treffer.bezeichnung,
      regelFassung: REGEL_FASSUNG,
    },
  };
}

/** Die THW-Sonderregeln: erst der zusammengesetzte Zug, dann das Kuerzel. */
function thwTreffer(name: string): Treffer | null {
  const zug = findeThwZug(name);
  if (zug !== null) {
    return {
      sicherheit: zug.sicherheit,
      schluessel: schluesselAus("thw-zug", zug.regel.einheit),
      bezeichnung: zug.regel.bezeichnung,
      einheit: zug.regel.einheit,
      ebene: zug.regel.ebene,
    };
  }
  const kuerzel = findeThwKuerzel(name);
  if (kuerzel === null) return null;
  return {
    sicherheit: kuerzel.sicherheit,
    schluessel: schluesselAus("thw-kuerzel", kuerzel.regel.einheit),
    bezeichnung: kuerzel.regel.bezeichnung,
    einheit: kuerzel.regel.einheit,
    ebene: kuerzel.regel.ebene,
  };
}

/** Der Katalogtreffer, sofern er die Uebernahmeschwelle erreicht. */
function katalogTreffer(name: string, organisation: Organisation): Treffer {
  const bewertet = bewerteKandidaten(name, katalogFuer(organisation));
  const bestes = bewertet[0];
  const sicherheit = bestes?.punkte ?? 0;
  if (bestes === undefined || sicherheit < UEBERNAHME_SCHWELLE) {
    return { sicherheit };
  }
  return {
    sicherheit,
    schluessel: bestes.schluessel,
    bezeichnung: bestes.bezeichnung,
    einheit: bestes.einheit,
    ebene: bestes.ebene,
  };
}

/**
 * Schlaegt ein taktisches Zeichen zu einem Einheitennamen vor.
 *
 * Liefert immer ein Ergebnis — bei zu geringer Sicherheit eines mit leerer
 * Einheit und Ebene `UNBESTIMMT`. Ein `null` waere fuer die Maske
 * unbequemer und wuerde die Sicherheit verschweigen, an der der Bediener
 * ablesen soll, wie ernst der Vorschlag zu nehmen ist.
 */
export function schlageZeichenVor(name: string, organisation: Organisation): ZeichenVorschlag {
  if (organisation === "THW") {
    const treffer = thwTreffer(name);
    if (treffer !== null) return baueVorschlag(name, organisation, treffer);
  }
  return baueVorschlag(name, organisation, katalogTreffer(name, organisation));
}

/** Der Katalog fuer die Auswahlliste der Maske. */
export function listeZeichenkatalog(
  organisation: Organisation,
  suche?: string,
): readonly KatalogEintrag[] {
  return filtereKatalog(katalogFuer(organisation), suche);
}

/**
 * Setzt die Herkunft auf „vom Bediener gewaehlt".
 *
 * v1 nannte das `ensureTacticalSignConfigSource`. Beim Wechsel auf
 * `bedienung` fallen Sicherheit und Trefferangaben weg: Sie beschreiben einen
 * Vorschlag, den der Bediener gerade ersetzt hat, und stehenzulassen hiesse,
 * eine Rechnung als Beleg fuer eine Entscheidung auszugeben.
 */
export function alsBedienungUebernommen(
  zeichen: TaktischesZeichen,
  rohname: string,
): { readonly zeichen: TaktischesZeichen; readonly herkunft: ZeichenHerkunft } {
  return {
    zeichen,
    herkunft: { quelle: "bedienung", rohname, regelFassung: REGEL_FASSUNG },
  };
}
