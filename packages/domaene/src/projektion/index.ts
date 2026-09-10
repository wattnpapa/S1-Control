/**
 * Die Projektionen des Lagebilds (M3.0).
 *
 * Drei Ableitungen, die alle Ansichten von M3 teilen: der Abschnittsbaum, die
 * Einheitentabelle und das Einsatztagebuch. Sie stehen in Ring 2 und nicht im
 * Renderer, weil an jeder von ihnen festgeschriebene Regeln hängen —
 * Sekundärsortierung (§5.3), Zyklusregel (§5.3.1), Auflösungskette (§5.3.2),
 * die Zuordnung Spalte → Ereignisart (§5.4) und die Ordnung des Tagebuchs
 * (§2.6, §5.9.1). Eine Regel in einer `.tsx` ist gegen das Konzept nicht
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
  type Schreibweg,
  type Spalte,
  type Spaltengruppe,
  type Tabellenausschnitt,
  type Tabellenoptionen,
  type Tabellenzeile,
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
