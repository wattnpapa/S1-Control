/**
 * `@s1/domaene` — Ring 2: plattformneutraler Fachkern von S1-Control.
 *
 * Stand M0.2: HLC (§3.2), Ereignisrahmen (§2.4) und der Minimalfold als
 * Mengenfunktion mit Rebase. Zielmodell in voller Breite, vollstaendiger
 * Ereigniskatalog und Kennzahlen folgen in M1.2 und M1.3.
 *
 * Die Paragraphenverweise in diesem Paket zeigen auf
 * `docs/v2/konzepte/KONZEPT-SPEICHER.md`, wie 05-UMSETZUNGSPLAN.md §3 es
 * verlangt.
 *
 * Verbindliche Grenze (02-ZIELBILD.md, „Vier Ringe"): kein `node:`, kein DOM,
 * kein React, kein Electron. Erlaubt ist ausschliesslich der Griff nach innen,
 * also nach `@bos/eeb-format`.
 */

import { inhaltsHash } from "@bos/eeb-format";

// Hybrid Logical Clock — KONZEPT-SPEICHER.md §3.1 und §3.2, Auflage 5.
export {
  HlcUhr,
  MILLISEKUNDEN_MAX,
  MILLISEKUNDEN_STELLEN,
  UHR_SCHWELLE_MS,
  ZAEHLER_MAX,
  ZAEHLER_STELLEN,
  groessereHlc,
  hlcAlsText,
  hlcAusText,
  hlcGleich,
  vergleicheHlc,
  type Empfang,
  type Erzeugung,
  type Hlc,
  type HlcUhrOptionen,
  type Uhrmeldung,
  type Wanduhr,
} from "./hlc.js";

// Ereignisrahmen (§2.4, §2.5, §3.3) und die fuenf Ereignisarten des Minimalfolds.
export {
  ABSCHNITTSTYPEN,
  EINHEIT_STATUS,
  EINSATZ_ARTEN,
  ERSTE_LAUFNUMMER,
  ORGANISATIONEN,
  PERSONAL_ERFASSUNGEN,
  SCHEMA_VERSION,
  SCHICHTEN,
  SCHICHTMODELLE,
  TAKTISCHE_EBENEN,
  ereignisId,
  istBekannteArt,
  naechsteLaufnummer,
  staerkeGleich,
  staerkeSumme,
  zerlegeEreignisId,
  type AbschnittAngelegt,
  type Abschnittstyp,
  type Akteur,
  type EingehendesEreignis,
  type EinheitGemeldet,
  type EinheitStatus,
  type EinheitVerschoben,
  type EinsatzAngelegt,
  type EinsatzArt,
  type Ereignis,
  type EreignisId,
  type FremdesEreignis,
  type Organisation,
  type PersonalErfassung,
  type Rahmen,
  type Schicht,
  type Schichtmodell,
  type Staerke,
  type StaerkeGeaendert,
  type TaktischeEbene,
} from "./ereignis.js";

// Kanonische Serialisierung und zustandsHash (§7.6).
export {
  kanonischeSerialisierung,
  vergleicheNachCodepunkt,
  zustandsHash,
  type KanonischerWert,
  type Sha256Hex,
} from "./kanonisch.js";

// Der materialisierte Zustand mit Feld-HLC (§7.4).
export {
  AUFFANG_ABSCHNITT_ID,
  FOLD_VERSION,
  type AbschnittZustand,
  type EinheitZustand,
  type EinsatzZustand,
  type Feld,
  type Konflikthinweis,
  type UnbekanntesEreignis,
  type Zustand,
} from "./zustand.js";

// Der Minimalfold als Mengenfunktion mit Rebase (Auflage 4).
export {
  falte,
  falteAuf,
  falteHinzu,
  leereFaltung,
  materialisiere,
  type Faltung,
} from "./fold.js";

// Zeichen-Inferenz und Zeichenkatalog aus v1 (M1.4). Vorschlaege fuer die
// Maske, kein Bestandteil des Folds.
export {
  normalisiereText,
  trifftMuster,
  wortmenge,
  zerlegeInWorte,
} from "./zeichen/text.js";
export { ebeneAusV1Typ, type V1Zeichentyp } from "./zeichen/ebene.js";
export {
  THW_KUERZEL,
  ZEICHEN_ALIASE,
  findeThwKuerzel,
  findeThwZug,
  type KuerzelRegel,
  type KuerzelTreffer,
} from "./zeichen/thw-kuerzel.js";
export { filtereKatalog, katalogFuer, type KatalogEintrag } from "./zeichen/katalog.js";
export { bewerteKandidaten, type BewerteterEintrag } from "./zeichen/bewertung.js";
export {
  REGEL_FASSUNG,
  UEBERNAHME_SCHWELLE,
  alsBedienungUebernommen,
  listeZeichenkatalog,
  schlageZeichenVor,
  type TaktischesZeichen,
  type ZeichenHerkunft,
  type ZeichenVorschlag,
} from "./zeichen/inferenz.js";
export {
  organisationsKurzform,
  rueckfallEinheitSvg,
  rueckfallFahrzeugSvg,
} from "./zeichen/rueckfall.js";

// STAN-Datensatz und Vorschlag (M1.4). Stammdatum, kein Ereignis (§1.2).
export { THW_STAN, type StanEintrag } from "./stan/daten.js";
export {
  STAN_SCHWELLE,
  schlageStanVor,
  stanEintraege,
  type StanVorschlag,
} from "./stan/inferenz.js";

/** Ordnername eines Einsatzes auf dem Share: `<datum>_<slug>_<kurzid>`. */
export interface Einsatzkennung {
  /** Sprechender, dateisystemtauglicher Namensteil. */
  readonly slug: string;
  /** Sechs Hex-Zeichen aus dem Inhalts-Hash des Namens; macht den Ordner eindeutig. */
  readonly kurzId: string;
  /** Vollstaendiger Ordnername. */
  readonly ordner: string;
}

/** Umlaute und ß werden ausgeschrieben, damit der Ordnername auf jedem Dateisystem gleich heisst. */
const UMSCHRIFT: ReadonlyArray<readonly [RegExp, string]> = [
  [/ä/g, "ae"],
  [/ö/g, "oe"],
  [/ü/g, "ue"],
  [/ß/g, "ss"],
];

/**
 * Bildet aus einem Einsatznamen den sprechenden Namensteil des Ordners.
 *
 * Rein und ohne Plattform-API: Gross-/Kleinschreibung wird vereinheitlicht,
 * Umlaute werden ausgeschrieben, alles Uebrige ausser Buchstaben und Ziffern
 * wird zu einem Bindestrich zusammengezogen.
 */
export function slugFuerEinsatz(name: string): string {
  let text = name.normalize("NFC").toLowerCase();
  for (const [muster, ersatz] of UMSCHRIFT) {
    text = text.replace(muster, ersatz);
  }
  return text
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/**
 * Bildet die vollstaendige Einsatzkennung.
 *
 * Der Kurz-Id stammt aus `inhaltsHash` des geteilten Kerns. Das ist der
 * Verdrahtungsnachweis fuer das Submodul `vendor/eeb-format`: faellt der Kern
 * aus, baut dieses Paket nicht mehr.
 *
 * @param datum Einsatzdatum in der Form `JJJJ-MM-TT`.
 * @param name  Frei gewaehlter Einsatzname.
 */
export function einsatzKennung(datum: string, name: string): Einsatzkennung {
  const slug = slugFuerEinsatz(name);
  const kurzId = inhaltsHash(`${datum}|${name}`).slice(0, 6);
  return { slug, kurzId, ordner: `${datum}_${slug}_${kurzId}` };
}
