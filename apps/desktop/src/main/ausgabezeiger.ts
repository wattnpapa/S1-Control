/**
 * „Öffnen", „Ordner zeigen" und „Drucken" an einer erzeugten Ausgabe.
 *
 * **Eine Naht wie {@link Drucker} und `Fenstersteuerung`.** Die drei Wege
 * gehen über Electron (`shell.openPath`, `shell.showItemInFolder`,
 * `webContents.print`), und die Vermittlung kennt kein Electron. Hier steht
 * deshalb nur die Schnittstelle und die eine Regel, die nicht in Electron
 * gehört: **welche** Datei geöffnet werden darf.
 *
 * **Warum es diese Regel braucht.** `shell.openPath` öffnet eine Datei mit
 * ihrem Standardprogramm — bei einer `.exe` oder `.bat` heißt das: Sie läuft.
 * Der Renderer schickt einen Pfad; ein Renderer, den ein fremdes Skript
 * erreicht, könnte sonst jede Datei des Rechners starten. Zugelassen ist
 * deshalb nur, was eine Ausgabe sein kann: eine Datei mit bekannter Endung
 * im Ordner **des offenen Einsatzes** auf dem Share. Alles andere wird
 * abgewiesen, bevor Electron es sieht.
 */

import path from "node:path";

/** Was der Main mit einer Datei tun kann — im Betrieb Electron, im Test eine Attrappe. */
export interface Schreibtisch {
  /** Öffnet die Datei mit dem Standardprogramm des Rechners. */
  oeffne(pfad: string): Promise<void>;
  /** Zeigt die Datei markiert in ihrem Ordner. */
  zeigeImOrdner(pfad: string): void;
  /** Lädt eine HTML-Seite in ein eigenes Fenster und ruft den Druckdialog. */
  drucke(pfad: string): Promise<void>;
}

export type Zeigeart = "oeffnen" | "ordner" | "drucken";

/** Die Endungen der Ausgaben (M4.1 bis M5.1), des Bündels und der Einsatzakte. */
const ENDUNGEN: ReadonlySet<string> = new Set([".html", ".pdf", ".xlsx", ".json", ".zip"]);

/**
 * Prüft, ob `pfad` eine Ausgabe im Einsatzordner ist — und liefert ihn
 * aufgelöst zurück, sonst wirft es mit einer Meldung für den Bediener.
 *
 * Aufgelöst und nicht wörtlich verglichen: `ausgaben/../../fremd.exe` beginnt
 * mit dem Einsatzordner und liegt doch außerhalb.
 */
export function ausgabePfad(einsatzordner: string, pfad: string, wie: Zeigeart): string {
  const wurzel = path.resolve(einsatzordner);
  const datei = path.resolve(pfad);
  if (!datei.startsWith(wurzel + path.sep)) {
    throw new Error("Diese Datei gehört nicht zum geöffneten Einsatz und wird nicht geöffnet.");
  }
  const endung = path.extname(datei).toLowerCase();
  if (!ENDUNGEN.has(endung)) throw new Error(`Dateien mit der Endung „${endung}“ werden nicht geöffnet.`);
  if (wie === "drucken" && endung !== ".html") {
    throw new Error("Drucken geht hier nur für HTML-Ausgaben; ein PDF druckt das Programm, das es öffnet.");
  }
  return datei;
}

/** Führt die gewählte Handlung aus, nachdem {@link ausgabePfad} den Pfad zugelassen hat. */
export async function zeigeAusgabe(
  schreibtisch: Schreibtisch,
  einsatzordner: string,
  auftrag: { readonly pfad: string; readonly wie: Zeigeart },
): Promise<null> {
  const datei = ausgabePfad(einsatzordner, auftrag.pfad, auftrag.wie);
  if (auftrag.wie === "ordner") schreibtisch.zeigeImOrdner(datei);
  else if (auftrag.wie === "drucken") await schreibtisch.drucke(datei);
  else await schreibtisch.oeffne(datei);
  return null;
}
