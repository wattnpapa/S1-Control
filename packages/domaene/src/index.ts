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
 * Verbindliche Grenze (02-ZIELBILD.md, „Vier Ringe“): kein `node:`, kein DOM,
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
  naechsteLaufnummer,
  zerlegeEreignisId,
  type Abschnittstyp,
  type Akteur,
  type EinheitStatus,
  type EinsatzArt,
  type EreignisId,
  type Organisation,
  type PersonalErfassung,
  type Rahmen,
  type Schicht,
  type Schichtmodell,
  type Staerke,
  type TaktischeEbene,
} from "./ereignis.js";

// CRC-32 (§2.1) — geteilt zwischen Speicherschicht und Ausgaben (M4.0).
export { crc32, crc32Hex } from "./pruefsumme.js";

// Kanonische Serialisierung und zustandsHash (§7.6).
export {
  kanonischeSerialisierung,
  vergleicheNachCodepunkt,
  zustandsHash,
  type KanonischerWert,
  type Sha256Hex,
} from "./kanonisch.js";

// Der Adapter `eeb → EinheitGemeldet` (M1.5).
export {
  bemerkungAus,
  bezeichnungAus,
  ebeneAusEinheitstyp,
  uebersetzeBogen,
  type NameJeCode,
  type UebersetzterBogen,
  type UebersetzungsAuftrag,
  type Vokabeltabellen,
} from "./eeb/adapter.js";

// Die Abkuerzungsliste — das Blatt „AküLi“ der Excel (M3.6).
export { AKUELI, sucheAkueli, type Akueeintrag, type Akuegruppe } from "./akueli.js";

// Der Handscanner-Weg (M3.4): Segmente sammeln, Signatur pruefen, uebernehmen.
export {
  einheitIdAus,
  LEERER_STAND,
  TEILE_MAX,
  liesBogen,
  nimmScan,
  uebernahmeEntwuerfe,
  type Bogenbefund,
  type Sammelstand,
  type Scanbefund,
  type UebernahmeAuftrag,
  type Uebernahmeentwurf,
} from "./eeb/scanner.js";

// Die Buendeldatei (M6.3) — der Meldeweg ohne Netz.
export {
  buendelAusMeldungen,
  liesBuendel,
  type Buendelbefund,
  type Buendeleintrag,
} from "./eeb/buendel.js";

// Die Projektionen: aus M3.0 Baum, Tabelle und Tagebuch, aus M5.0 die
// Anforderungsliste, das Blatt der Fuehrungsstelle, die Logistikzeilen und die
// Kostenuebersicht.
export * as projektion from "./projektion/index.js";
export type {
  Anforderungsausschnitt,
  Anforderungszeile,
  Anforderungszustand,
  Baumknoten,
  Dienstpostenzeile,
  Kostenblatt,
  Kostenparameter,
  Kostenzeile,
  Logistikblatt,
  Fassungsvergleich,
  Meldezustand,
  Meldungsausschnitt,
  Meldungszeile,
  Logistikzeile,
  Schichtplanblatt,
  Schichtplanzeile,
  Spalte,
  Spaltengruppe,
  Tabellenausschnitt,
  Tabellenzeile,
  Tagebuchfilter,
  Tagebuchzeile,
  Teilbereichsblock,
  Untertabelle,
  Zelle,
} from "./projektion/index.js";

// Die abgeleiteten Kennzahlen K1 bis K30 (Zieldatenmodell §3.3).
export * as kennzahlen from "./kennzahlen.js";
export type {
  FuestZeile,
  Kostenzahlen,
  Logistikzahlen,
  Matrixzeile,
} from "./kennzahlen.js";

// Der Ereigniskatalog (M1.3): Nutzlastschemata und die Tabelle aus §5.1.
export {
  ANLAGEARTEN,
  GRUND_PFLICHT,
  ID_MAX_LAENGE,
  KATALOG,
  grundPasst,
  KATALOG_EINTRAEGE,
  KORREKTUR_VON,
  istBekannterTyp,
  schemata,
  type Entitaetsart,
  type Feldwahl,
  type Form,
  type Katalogeintrag,
  type Konfliktklasse,
} from "./katalog/index.js";

// Fachliche Werttypen, die Katalog und Zustand teilen.
export {
  KOSTEN_VORBELEGUNG,
  STAERKE_NULL,
  staerkeGleich,
  staerkeSumme,
  staerkeGeklemmt,
  staerkeIstNegativ,
  staerkeMinus,
  staerkePlus,
  type HierarchieEbene,
  type Id,
  type Kontakt,
  type Sofortbedarf,
  type StaerkeRechnerisch,
  type Zeitpunkt,
} from "./werte.js";

// Der materialisierte Zustand — Zielmodell nach KONZEPT-EREIGNISSE.md §3.2.
export {
  ARCHIV_ABSCHNITT_ID,
  AUFFANG_ABSCHNITT_ID,
  FOLD_VERSION,
  KAPPUNG_MAX,
  WIRKUNGSLOSGRUENDE,
  type AbschnittZustand,
  type AnforderungZustand,
  type Anlage,
  type AnhangZustand,
  type ArchivierungZustand,
  type AuftragZustand,
  type Beobachtung,
  type DienstpostenZustand,
  type EinheitZustand,
  type EinsatzZustand,
  type Erstwert,
  type EtbEintragZustand,
  type FahrzeugZustand,
  type Feld,
  type Hinweisart,
  type Konflikthinweis,
  type MeldungZustand,
  type PersonZustand,
  type UnbekanntesEreignis,
  type VerworfeneAnlage,
  type VerworfenerSchluessel,
  type WartendeBeobachtung,
  type Wirkungslosgrund,
  type Zustand,
} from "./zustand.js";

// Der Minimalfold als Mengenfunktion mit Rebase (Auflage 4).
export {
  falte,
  type EingehendesEreignis,
  falteAuf,
  falteHinzu,
  leereFaltung,
  materialisiere,
  type Faltung,
} from "./fold.js";

// Der Undo-Stapel je Client (M2.3) — KONZEPT-EREIGNISSE.md §6, U1 bis U6.
export {
  UNDO_TIEFE,
  Undostapel,
  geltenderFeldwert,
  kompensationFuer,
  type Kompensation,
  type Kompensationsentwurf,
  type StapelEintrag,
} from "./undo.js";

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

// Vorlagenkatalog (M1.4). Stammdatum, kein Ereignis (KONZEPT-EREIGNISSE §1.2).
export { VORLAGENKATALOGE, type EinheitVorlage, type Vorlagenkatalog } from "./vorlagen/katalog.js";
export { gefuellteKataloge, vorlage, vorlagen, vorlagenAus } from "./vorlagen/index.js";

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

// Das Programmmanifest und seine Pruefung (M7.2) — der Verteilweg ueber den
// Share. Rein und ohne Dateisystem: Wer die Bytes holt, ist die Schale.
export {
  DATEI_MANIFEST,
  ORDNER_PROGRAMM,
  kurzform,
  pruefeManifest,
  signiereStand,
  signierteBytes,
  vergleicheVersionen,
  type Ablehnungsgrund,
  type Programmmanifest,
  type Programmstand,
  type Pruefauftrag,
  type Pruefergebnis,
} from "./verteilung.js";

// Die Störfallmatrix (M7.3) — sechs Fälle als Daten, gelesen von der
// Diagnoseansicht und von der Kurzanleitung.
export {
  STOERFAELLE,
  UHR_GRENZE_MS,
  erkannteStoerfaelle,
  stoerfall,
  type Dringlichkeit,
  type Stoerfall,
  type Stoerfallbefund,
  type Stoerfallkennung,
} from "./stoerfaelle.js";
