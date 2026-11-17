/**
 * Der Nachrichtenvordruck als eigener Einstieg `@s1/ausgaben/vordruck`
 * (KONZEPT-NACHRICHTEN.md Entscheidung 4, ADR-008).
 *
 * Warum ein zweiter Einstieg neben `index.ts`: Der Renderer lädt den
 * Vordruck für die Vorschau per `import()` erst, wenn die Vorschau
 * aufgeklappt wird. Über den Haupteinstieg käme mit dem Vordruck jede
 * HTML-Vorlage, die XLSX- und die ZIP-Ausgabe ins Teilbündel; hier steht nur,
 * was Vorschau und Druck teilen — die Abbildung auf die Felder und die
 * Folgeblätter. Gerechnet wird nichts Neues: dieselben Funktionen wie im
 * Haupteinstieg, damit Vorschau und Ausdruck nicht auseinanderlaufen.
 */

export {
  blattZeichnen,
  druckbar,
  nachrichtAlsVordruckPdf,
  vordruckBlaetterAus,
  type Nachrichtendruck,
  type Nachrichtensichtung,
  type Nachrichtenvermerk,
  type Vordruckoptionen,
} from "./nachricht.js";
export { entwurfsdruck, nachrichtendruckAus, type Nachrichtenentwurf } from "./nachrichtendruck.js";
// Additiv (ETB P2-7): der Stempel der zurückgezogenen Nachricht, damit die Vorschau ihn wie der Druck zeichnet.
export { RUECKZUG_WORT, rueckzugText, zeichneRueckzugsstempel } from "./nachrichtstempel.js";
