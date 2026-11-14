/**
 * Die JSON-Anhänge einer PDF — ohne PDF-Parser.
 *
 * Die Erfassungsbogen-App bettet den Bogen als `erfassungsbogen.json` in jede
 * PDF ein, die sie erzeugt. Der Anhang liegt wie alles andere in einem
 * gewöhnlichen `stream … endstream`-Block; ihn zu finden braucht keine
 * Kenntnis des Dokumentaufbaus, nur die Blöcke und einen Entpacker. Dasselbe
 * Verfahren benutzt die App selbst beim Einlesen ihrer PDFs.
 *
 * **Warum das im Renderer steht.** Die Datei kommt über das Dateifeld oder
 * per Ziehen hierher, und eine PDF mit Schriften und Bildern hat schnell
 * einige Megabyte. An den Worker gehen nur die paar Kilobyte Text, die ein
 * Bogen sein könnten — ob sie einer sind, entscheidet er (`eebDatei`).
 * Entpackt wird mit der `DecompressionStream` des Browsers, also ohne Node.
 */

/** Größere Dateien werden nicht angefasst — eine Sammel-PDF mit hundert Bögen bleibt weit darunter. */
export const PDF_MAX_BYTES = 64 * 1024 * 1024;

/** Beginnt die Datei wie eine PDF? Die Endung allein sagt es nicht. */
export function istPdf(bytes: Uint8Array): boolean {
  const kopf = String.fromCharCode(...bytes.subarray(0, 1024));
  return kopf.includes("%PDF-");
}

/**
 * Die Texte aller Datenströme, die ein Bogen-JSON sein könnten.
 *
 * Jeder Strom wird entpackt **und** roh betrachtet: Der Anhang ist in der
 * Regel Flate-komprimiert, ein Fremdwerkzeug darf ihn aber auch unkomprimiert
 * zurückschreiben.
 */
export async function bogentexteAusPdf(bytes: Uint8Array): Promise<string[]> {
  const texte: string[] = [];
  for (const strom of stroeme(bytes)) {
    const entpackt = await entpacke(strom);
    for (const daten of entpackt === undefined ? [strom] : [entpackt, strom]) {
      const text = new TextDecoder().decode(daten).trim();
      if (koennteBogenSein(text) && !texte.includes(text)) texte.push(text);
    }
  }
  return texte;
}

function koennteBogenSein(text: string): boolean {
  return (text.startsWith("{") || text.startsWith("[")) && text.includes('"einheit"');
}

/** Die rohen Bytes aller Ströme, Bilder ausgenommen — die sind groß und nie ein Anhang. */
function stroeme(bytes: Uint8Array): Uint8Array[] {
  // Ein Zeichen je Byte, damit die Fundstellen im Text Positionen in den Bytes sind.
  const text = new TextDecoder("latin1").decode(bytes);
  const gefunden: Uint8Array[] = [];
  const marke = /stream\r?\n/g;
  for (let treffer = marke.exec(text); treffer !== null; treffer = marke.exec(text)) {
    const start = treffer.index + treffer[0].length;
    const ende = text.indexOf("endstream", start);
    if (ende < 0) break;
    // Hinter `endstream` weitersuchen — das Wort endet selbst auf „stream“.
    marke.lastIndex = ende + "endstream".length;
    const woerterbuch = text.slice(Math.max(0, treffer.index - 400), treffer.index);
    if (/\/Subtype\s*\/Image/.test(woerterbuch.slice(woerterbuch.lastIndexOf(" obj")))) continue;
    // Der Zeilenumbruch vor `endstream` gehört nicht zum Strom.
    let bis = ende;
    if (text[bis - 1] === "\n") bis -= 1;
    if (text[bis - 1] === "\r") bis -= 1;
    gefunden.push(bytes.subarray(start, bis));
  }
  return gefunden;
}

/** FlateDecode; `undefined`, wenn der Strom nicht so gepackt ist. */
async function entpacke(daten: Uint8Array): Promise<Uint8Array | undefined> {
  try {
    const entpacker = new DecompressionStream("deflate");
    const schreiber = entpacker.writable.getWriter();
    // Die Fehler des Schreibers kommen am Leser noch einmal an; dort werden sie gefangen.
    schreiber.write(daten as Uint8Array<ArrayBuffer>).catch(() => undefined);
    schreiber.close().catch(() => undefined);
    const leser = entpacker.readable.getReader();
    const teile: Uint8Array[] = [];
    let laenge = 0;
    for (let teil = await leser.read(); !teil.done; teil = await leser.read()) {
      teile.push(teil.value);
      laenge += teil.value.length;
    }
    const ganz = new Uint8Array(laenge);
    let stelle = 0;
    for (const teil of teile) {
      ganz.set(teil, stelle);
      stelle += teil.length;
    }
    return ganz;
  } catch {
    return undefined;
  }
}
