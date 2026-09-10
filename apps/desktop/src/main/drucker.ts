/**
 * Der PDF-Weg der Kernausgaben (M4.1).
 *
 * `webContents.printToPDF` ist die einzige Stelle im ganzen Baum, die eine
 * Rendering-Engine braucht — deshalb steht sie hier und nicht in
 * `@s1/ausgaben`. Jenes Paket liefert eine Zeichenkette; was daraus ein Blatt
 * Papier macht, ist Sache der Schale (02-ZIELBILD.md, „Vier Ringe“).
 *
 * **Ein eigenes, unsichtbares Fenster je Ausdruck.** Nicht das
 * Arbeitsplatzfenster: Es zeigt die Lage, und wer darin druckt, druckt die
 * Lage und nicht den Ausdruck. Nicht der Stärke-Monitor: Er hängt an der Wand
 * und soll nicht flackern. Ein Wegwerf-Fenster kostet einige zehn
 * Millisekunden und ist danach fort.
 *
 * **`loadURL` mit `data:`-Adresse und nicht `loadFile`.** Die Alternative wäre,
 * die HTML-Datei erst zu schreiben und dann zu laden — das schriebe eine
 * Datei, die niemand bestellt hat, und zwar an einen Ort, den die Schale
 * dafür erfinden müsste. Die Seite trägt ihren Stil ohnehin bei sich; sie
 * braucht kein Verzeichnis.
 */

import { BrowserWindow } from "electron";

import type { Drucker } from "./vermittlung.js";

/**
 * Die Seitenränder des Ausdrucks in Zoll.
 *
 * Sie stehen hier **zusätzlich** zu `@page { margin: 12mm }` in der Vorlage,
 * weil `printToPDF` die eigene Angabe der Seite nur dann übernimmt, wenn
 * `preferCSSPageSize` gesetzt ist — und das ist es unten. Der Wert hier ist
 * der Rückfall für den Fall, dass eine Vorlage einmal keine `@page`-Regel
 * mitbringt.
 */
const RAND_ZOLL = 0.47;

/**
 * Wie lange auf das Laden gewartet wird.
 *
 * Eine `data:`-Seite ohne äußere Verweise lädt in Millisekunden; die Schranke
 * fängt den Fall ab, dass sie es wider Erwarten **nicht** tut. Ohne sie hinge
 * ein Ausdruck still und der Bediener wartete auf eine Datei, die nie
 * entsteht — §8.8 Punkt 1 sinngemäß: Ein gescheiterter Vorgang wird sichtbar
 * abgewiesen, nicht verschwiegen.
 */
const LADEFRIST_MS = 10_000;

export function elektronDrucker(): Drucker {
  return {
    async alsPdf(html: string, quer: boolean): Promise<Uint8Array> {
      const fenster = new BrowserWindow({
        show: false,
        webPreferences: {
          // Kein Preload, keine Brücke: Diese Seite ist eine Ausgabe und kein
          // Fenster der Anwendung. Sie soll die Schale nicht erreichen können.
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
          offscreen: true,
        },
      });
      try {
        await mitFrist(
          fenster.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`),
          LADEFRIST_MS,
        );
        const puffer = await fenster.webContents.printToPDF({
          landscape: quer,
          printBackground: true,
          // Die Vorlage bringt ihre eigene `@page`-Regel mit; sie hat Vorrang.
          preferCSSPageSize: true,
          margins: { top: RAND_ZOLL, bottom: RAND_ZOLL, left: RAND_ZOLL, right: RAND_ZOLL },
        });
        return new Uint8Array(puffer);
      } finally {
        // Auch wenn das Drucken scheitert: Ein Wegwerf-Fenster, das stehen
        // bleibt, hält den Prozess am Leben und sammelt sich mit jedem
        // Versuch.
        if (!fenster.isDestroyed()) fenster.destroy();
      }
    },
  };
}

async function mitFrist<T>(versprechen: Promise<T>, ms: number): Promise<T> {
  let zeitgeber: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      versprechen,
      new Promise<never>((_, ablehnen) => {
        zeitgeber = setTimeout(() => {
          ablehnen(new Error(`Die Ausgabe konnte in ${String(ms)} ms nicht geladen werden.`));
        }, ms);
      }),
    ]);
  } finally {
    if (zeitgeber !== undefined) clearTimeout(zeitgeber);
  }
}
