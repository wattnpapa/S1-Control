/**
 * Der Zugang zu den importierten taktischen Zeichen.
 *
 * Die Dateien unter `apps/desktop/assets/tz/` kommen aus
 * jonas-koeritz/Taktische-Zeichen und werden von
 * `bau/zeichen-importieren.mjs` erzeugt (siehe dort und `HERKUNFT.md`). Sie
 * sind genormt; die Anwendung zeichnet sie nicht nach, sie zeigt sie.
 *
 * **Inline und nicht als `<img src>`.** Die Zeichen tragen ihre Beschriftung
 * als `<text>` in Roboto Slab. In einem `<img>` ist das SVG ein eigenes
 * Dokument ohne Zugriff auf die Schriften der Seite — die Beschriftung fiele
 * auf eine Systemschrift zurück, und ein Zeichen mit fremder Schrift ist im
 * Ausdruck ein anderes Zeichen.
 *
 * **Nur die Kategorien, die gebraucht werden.** Der Satz hat knapp tausend
 * Zeichen; `import.meta.glob` mit `eager` legte jedes davon ins Bündel. Hier
 * stehen die zwei Kategorien der Führungsorganisation. Wer Einheitenzeichen
 * braucht (M3.2, Inferenz), nimmt seine Kategorie dazu — bewusst und
 * sichtbar.
 */

const DATEIEN = import.meta.glob("../../assets/tz/{Führungsstellen,Einrichtungen}/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

/**
 * Macht aus der Datei ein Stück Dokument.
 *
 * Zwei Dinge stören inline: die `<!DOCTYPE svg …>`-Zeile, die nur am Anfang
 * eines eigenen Dokuments etwas zu suchen hat, und die festen Maße
 * `width="256" height="256"` — mit ihnen ignoriert der Browser die Breite, die
 * der Aufrufer setzt. Das Seitenverhältnis kommt danach aus der `viewBox`,
 * und die bleibt unangetastet: Sie ist die Norm.
 */
function aufbereitet(inhalt: string): string {
  return inhalt
    .replace(/<!DOCTYPE[^>]*>\s*/i, "")
    .replace(/(<svg\b[^>]*?)\s+width="\d+"\s+height="\d+"/i, "$1");
}

/** `Führungsstellen/EAL` → der Inhalt der Datei. */
const JE_KENNUNG: ReadonlyMap<string, string> = new Map(
  Object.entries(DATEIEN).map(([pfad, inhalt]) => {
    const teile = pfad.split("/");
    const name = teile[teile.length - 1]?.replace(/\.svg$/, "") ?? "";
    const kategorie = teile[teile.length - 2] ?? "";
    return [`${kategorie}/${name}`, aufbereitet(inhalt)];
  }),
);

/**
 * Der Inhalt eines Zeichens, oder `undefined`.
 *
 * `undefined` ist kein Fehlerfall, sondern der Normalfall nach einem Import:
 * Oben kann ein Zeichen umbenannt werden, und dann soll die Oberfläche einen
 * Rückfall zeichnen statt zu scheitern (§1.3 — der fehlende Gegenstand ist
 * der Normalpfad).
 */
export function zeichenSvg(kennung: string): string | undefined {
  return JE_KENNUNG.get(kennung);
}

/** Welche Zeichen im Bündel liegen — für Tests und die Diagnose. */
export function bekannteZeichen(): readonly string[] {
  return [...JE_KENNUNG.keys()].sort();
}
