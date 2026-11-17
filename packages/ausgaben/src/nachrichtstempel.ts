/**
 * Was der Vordruck einer Nachricht aus dem Tagebuch und dem Zurückziehen
 * zusätzlich trägt (Audits Nachrichten, ETB P1-2, P1-3, P2-7):
 *
 *  * die laufende Nummer der Tagebuchzeile „aufgegeben/aufgenommen“ als
 *    „ETB-Nr. 17“ in Feld 20 (Vermerke) — der Querverweis Papier ↔ Tagebuch,
 *    den der ETB-Führer sonst von Hand auf die rote Kopie schreibt;
 *  * bei einer zurückgezogenen Nachricht den Stempel „ZURÜCKGEZOGEN
 *    <Datum-Zeit-Gruppe>: <Grund>“. Die Bibliothek kennt kein eigenes Feld
 *    dafür: Der Prüfvermerk (fett in der Zeile „Inhalt“) trägt das Wort, die
 *    Hinweiszeile am Blattrand den ganzen Satz, und quer über das Formular
 *    kommt ein Schriftzug wie das Übungswasserzeichen der Bibliothek — ein
 *    früher gedrucktes Blatt ohne Stempel bleibt so von einem neueren
 *    unterscheidbar;
 *  * bei einem Ausgang eine Hinweiszeile am Fuß, die das Feld „Ausgang“
 *    benennt (R2-FaBe P0-2): Die Bibliothek beschriftet es nur mit „Ausgang“
 *    und nimmt ohne Beförderung die Annahme der FmZ dafür; wer das Blatt las,
 *    hielt die Zeit für die Quittung des Empfängers. Die Zeile sagt „Quittung
 *    der Gegenstelle“ oder „noch nicht übermittelt“. Die Geometrie der
 *    Bibliothek bleibt unberührt, es gibt dort kein Beschriftungsfeld.
 *
 * Eigene Datei, damit `nachricht.ts` (Abbildung auf die Felder) nicht weiter
 * wächst. Ring 3 ohne `node:` und ohne DOM.
 */

import { datumZeitGruppe, projektion } from "@s1/domaene";
import type { jsPDF } from "jspdf";
import { VORDRUCK_BREITE, VORDRUCK_HOEHE, type VordruckDaten } from "bos-nachrichtenvordruck";

/** Zeit und Grund des Zurückziehens, wie der Vordruck sie nimmt. */
export interface Nachrichtenrueckzug {
  /** ISO-8601. */
  readonly zeitpunkt: string;
  readonly grund: string;
}

/** Das Wort des Stempels und des Prüfvermerks. */
export const RUECKZUG_WORT = "ZURÜCKGEZOGEN";

/** „ZURÜCKGEZOGEN 171045nov26: Doppelt aufgegeben“ — ohne Grund ohne Doppelpunkt. */
export function rueckzugText(rueckzug: Nachrichtenrueckzug): string {
  const zeit = datumZeitGruppe(rueckzug.zeitpunkt);
  const kopf = zeit === "" ? RUECKZUG_WORT : `${RUECKZUG_WORT} ${zeit}`;
  const grund = rueckzug.grund.trim();
  return grund === "" ? kopf : `${kopf}: ${grund}`;
}

/** „ETB-Nr. 17“ — leer ohne Nummer. */
export function etbVermerk(etbNummer: string | undefined): string {
  const nummer = etbNummer?.trim() ?? "";
  return nummer === "" ? "" : `ETB-Nr. ${nummer}`;
}

/** Die Vermerke eines Ausgangs, soweit die Hinweiszeile sie braucht. */
export interface Quittungsgrundlage {
  readonly richtung: "EINGANG" | "AUSGANG";
  readonly annahme?: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined;
  readonly befoerderung?: { readonly mittel?: string | undefined; readonly zeitpunkt: string; readonly handzeichen: string } | undefined;
}

/**
 * „angenommen (FmZ) 1710 Fm · Quittung der Gegenstelle 1720 Ha (Telefon)“ —
 * derselbe Satz wie in Liste, Lese-Ansicht und Vorschau (`fmzVermerkTextAus`
 * in Ring 2), damit Bildschirm und Papier nicht zwei Wortlaute führen. Leer
 * bei einem Eingang und bei einem Ausgang, den die FmZ noch nicht angefasst hat.
 */
export function quittungshinweis(nachricht: Quittungsgrundlage): string {
  if (nachricht.richtung !== "AUSGANG" || (nachricht.annahme === undefined && nachricht.befoerderung === undefined)) return "";
  const befoerderung = nachricht.befoerderung === undefined ? undefined : { ...nachricht.befoerderung, mittel: nachricht.befoerderung.mittel ?? "" };
  return projektion.fmzVermerkTextAus(undefined, nachricht.annahme, befoerderung, true) ?? "";
}

/**
 * Setzt ETB-Nummer und Stempeltexte in die Felder. `druckbar` kommt vom
 * Aufrufer, weil der Zeichenfilter in `nachricht.ts` steht.
 */
export function zusatzUebernehmen(
  daten: VordruckDaten,
  zusatz: { readonly etbNummer?: string | undefined; readonly zurueckgezogen?: Nachrichtenrueckzug | undefined } & Quittungsgrundlage,
  druckbar: (text: string) => string,
): void {
  const etb = etbVermerk(zusatz.etbNummer);
  if (etb !== "") daten.vermerke = druckbar([etb, daten.vermerke].filter(Boolean).join(" "));
  // Der Rückzugshinweis geht vor: Er steht in derselben Zeile und ist die wichtigere Auskunft.
  const quittung = quittungshinweis(zusatz);
  if (quittung !== "") daten.hinweis = druckbar(quittung);
  if (zusatz.zurueckgezogen === undefined) return;
  daten.pruefvermerk = druckbar(RUECKZUG_WORT);
  daten.hinweis = druckbar(rueckzugText(zusatz.zurueckgezogen));
}

/** Kräftiger als das Übungsrot der Bibliothek, aber blass genug, dass die Eintragungen lesbar bleiben. */
const STEMPEL = { schriftgroesse: 44, winkel: 35, farbe: "#e89a9a" } as const;

/**
 * „ZURÜCKGEZOGEN“ diagonal über die Mitte des Vordrucks. Vor dem Formular
 * gezeichnet (wie das Übungswasserzeichen), damit Linien und Eintragungen
 * darüber liegen.
 */
export function zeichneRueckzugsstempel(pdf: jsPDF, versatz: number): void {
  const { schriftgroesse, winkel, farbe } = STEMPEL;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(schriftgroesse);
  pdf.setTextColor(farbe);
  const breite = pdf.getTextWidth(RUECKZUG_WORT);
  const hoehe = schriftgroesse * (25.4 / 72) * 0.72;
  const bogen = (winkel * Math.PI) / 180;
  const x = versatz + VORDRUCK_BREITE / 2 - (breite / 2) * Math.cos(bogen) + (hoehe / 2) * Math.sin(bogen);
  const y = VORDRUCK_HOEHE / 2 + (breite / 2) * Math.sin(bogen) + (hoehe / 2) * Math.cos(bogen);
  pdf.text(RUECKZUG_WORT, x, y, { angle: winkel });
  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
}
