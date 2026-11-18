/**
 * Die Marken, die die Zeile einer Nachricht seit der dritten Behebung der
 * Audits Runde 2 (2026-11-18) trägt — eigene Datei, damit
 * `nachrichtenzeile.ts` nicht über die Größengrenze wächst. Alle Felder sind
 * optional: Handgebaute Zeilen älterer Prüfhilfen bleiben gültig.
 */

import type { Nachrichtenbezug } from "../zustand-nachricht.js";

export interface Nachrichtenzeilenmarken {
  /** Additiv (R2-ETB P2-6): Bezug der Anschrift auf Einheit, Abschnitt, … — der Wert, nicht das Feld. */
  readonly anschriftBezug?: Nachrichtenbezug;
  readonly absenderBezug?: Nachrichtenbezug;
  /**
   * Additiv (R2-Si P2-1): Die geltende Sichtung war eine Ersatzsichtung
   * (`GRUND_ERSATZSICHTER` oder `GRUND_SICHTER_SAEUMIG`). Der Grund steht im
   * Rahmen des Ereignisses, nicht im Zustand; der Worker setzt das Feld aus
   * den Ereignissen nach (`mitTagebuchbezug`).
   */
  readonly ersatzsichtung?: boolean;
  /**
   * Additiv (R2-FM P2-5, R2-Si P2-2): Der Eingang liegt mindestens die Schwelle
   * seines Vorrangs vor dem Sichter (Blitz 5, Sofort 10, einfach die der FmZ);
   * nur mit `jetzt`. Der Renderer zeigt dann „Ich sichte jetzt selbst“ auch
   * bei besetztem Sichter, und der Worker lässt die FmZ ohne Rückfrage sichten.
   */
  readonly sichterSchwelleUeberschritten?: boolean;
  /** Additiv (R2-LdF P2-2): „Funk → Telefon“ — die Beförderung nahm ein anderes Mittel als der Vorschlag des LdF. */
  readonly abweichungVomVorschlag?: string;
  /**
   * Additiv (R2-LdF P2-1): befördert, bevor der LdF (Station, besetzt) einen
   * Weg vorgeschlagen hatte. Setzt der Worker aus der Nutzlast der Beförderung
   * (`mitTagebuchbezug`); Ring 2 allein kennt die Präsenz von damals nicht.
   */
  readonly ohneVorschlag?: boolean;
  /** Additiv (LdF P2-3, Runde 1): Ausgang, dessen Zeichen des Verfassers gleich dem Handzeichen des Nachweises ist. */
  readonly verfasserGleichNachweiser?: boolean;
  /**
   * Additiv (R2-ETB P3-3): der Satz für den Kopf der Lese-Ansicht —
   * „Zurückgezogen 17.11.2026 20:41 von S3 · Mü, Grund: „Fehlanlage““. Grund
   * und Stelle setzt der Worker aus den Ereignissen nach (`mitTagebuchbezug`).
   */
  readonly zurueckgezogenText?: string;
  /** Additiv (R2-LdF P3-3): beim LdF, aber kein LdF besetzt — setzt der Worker aus der Präsenz. */
  readonly ldfNichtBesetzt?: boolean;
}
