/**
 * Die Projektionen des Lagebilds (M3.0).
 *
 * Die Ableitungen, die sich alle Ansichten teilen: aus M3 der Abschnittsbaum,
 * die Einheitentabelle und das Einsatztagebuch, aus M5 die Anforderungsliste,
 * das Blatt der Führungsstelle, die Logistikzeilen und die Kostenübersicht. Sie stehen in Ring 2 und nicht im
 * Renderer, weil an jeder von ihnen festgeschriebene Regeln hängen —
 * Sekundärsortierung (§5.3), Zyklusregel (§5.3.1), Auflösungskette (§5.3.2),
 * die Zuordnung Spalte → Ereignisart (§5.4), die Ordnung des Tagebuchs
 * (§2.6, §5.9.1) und die Zustandsmaschine der Anforderung (§5.6.2). Eine Regel in einer `.tsx` ist gegen das Konzept nicht
 * prüfbar; hier läuft sie im Test in beiden Umgebungen.
 */

export {
  abschnittsbaum,
  aufloesungsziele,
  baumZeilen,
  schluesseZyklus,
  type Baumknoten,
  type Baumoptionen,
} from "./baum.js";

export {
  SICHTBARE_GRUPPEN_VORBELEGUNG,
  SPALTEN,
  SPALTENGRUPPEN,
  einheitentabelle,
  einheitspfad,
  spalte,
  spaltenDerGruppen,
  tabellenzeile,
  untertabelle,
  type Schreibweg,
  type Spalte,
  type Spaltengruppe,
  type Tabellenausschnitt,
  type Tabellenoptionen,
  type Tabellenzeile,
  type Untertabelle,
  type Zelle,
} from "./tabelle.js";

export {
  ART_TEXT,
  FELD_TEXT,
  tagebuchausschnitt,
  tagebuchsatz,
  tagebuchzeile,
  trifftFilter,
  vergleicheZeilen,
  type Tagebuchfilter,
  type Tagebuchzeile,
} from "./tagebuch.js";

export {
  ANFORDERUNG_ZUSTAENDE,
  anforderungZurEinheit,
  anforderungsliste,
  anforderungspfad,
  anforderungszeile,
  vergleicheAnforderungen,
  type Anforderungsausschnitt,
  type Anforderungsoptionen,
  type Anforderungszeile,
  type Anforderungszustand,
} from "./anforderung.js";

export {
  TEILBEREICHE,
  dienstpostenblatt,
  dienstpostenzeile,
  fuestStaerke,
  rolleDerFunktion,
  schichtplanblatt,
  vergleicheDienstposten,
  type Dienstpostenoptionen,
  type Dienstpostenzeile,
  type Schichtplanblatt,
  type Schichtplanoptionen,
  type Schichtplanzeile,
  type Teilbereichsblock,
} from "./fuest.js";

export {
  LOG_MAENNLICH,
  LOG_SCHICHTEN,
  logistikblatt,
  logistikzeile,
  type Logistikblatt,
  type Logistikoptionen,
  type Logistikzeile,
} from "./logistik.js";

export {
  kostenblatt,
  kostenparameter,
  type Kostenblatt,
  type Kostenparameter,
  type Kostenzeile,
} from "./kosten.js";

export {
  MELDE_ZUSTAENDE,
  eingangskorb,
  fassungsvergleich,
  letzteAenderung,
  meldungszeile,
  revisionen,
  vergleicheMeldungen,
  type Meldezustand,
  type Meldungsausschnitt,
  type Meldungsoptionen,
  type Meldungszeile,
  type Fassungsvergleich,
} from "./meldung.js";
