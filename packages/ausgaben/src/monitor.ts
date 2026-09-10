/**
 * Der HTML-Monitor (M4.3).
 *
 * Vorbild ist der HTML-Export des Blatts „Druck" (`excel-domaenenmodell.md`
 * §4.1): eine Datei im Ordner `ausgaben\`, die sich alle 60 Sekunden selbst
 * neu lädt und die ein zweites Gerät über das Netz öffnet — ein Tablet in der
 * Einsatzstelle, ein Rechner im Nebenraum, ein Bildschirm im Meldekopf.
 *
 * **Es ist derselbe Druck in einer anderen Hülle**, und das ist die
 * Festlegung, auf die es ankommt: Die Zahlen kommen aus {@link druckdaten},
 * nicht aus einer zweiten Rechnung. Ein Monitor, der eigene Summen bildete,
 * wäre eine zweite Wahrheit über die Lage — und die fiele erst auf, wenn
 * jemand die beiden nebeneinanderlegt.
 *
 * Vier Unterschiede zum Druck, und jeder hat einen Grund:
 *
 *  1. **Ein `<meta http-equiv="refresh">`** statt eines Skripts. Die Datei
 *     liegt auf einem SMB-Share und wird über `file://` geöffnet; ein Skript
 *     wäre dort je nach Browser gesperrt, ein Meta-Element nie.
 *  2. **Dunkel und groß.** Der Monitor hängt an der Wand und wird aus
 *     mehreren Metern gelesen, nicht auf Papier aus vierzig Zentimetern.
 *  3. **Die Status-Matrix ist zuschaltbar.** Die Vorlage exportiert wahlweise
 *     „Druck (optional Status)"; wer die Wand für die Lagekarte braucht, will
 *     die Bilanz nicht daneben.
 *  4. **Der Stand steht groß dabei.** Eine Datei, die sich selbst neu lädt,
 *     sieht immer gleich aus — auch dann, wenn seit zwanzig Minuten nichts
 *     mehr ankommt. Ohne sichtbaren Stand ist ein stehengebliebener Monitor
 *     von einem aktuellen nicht zu unterscheiden.
 */

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";
import { druckdaten, type Druckdaten } from "./druck.js";
import { statusdaten, type Statusdaten } from "./status.js";
import type { Zustand } from "@s1/domaene";

/**
 * Wie oft sich die Seite neu lädt, in Sekunden.
 *
 * Sechzig, wie der HTML-Export der Vorlage (`m_htmlExport`). Häufiger wäre
 * für ein Wandbild ohne Nutzen und läse auf einem SMB-Laufwerk öfter, als der
 * Worker schreibt; seltener liefe der Monitor der Lage hinterher.
 */
export const RELOAD_SEKUNDEN = 60;

export interface Monitoroptionen {
  /** Die Status-Matrix mit ausgeben — „Druck (optional Status)“ der Vorlage. */
  readonly mitStatus?: boolean;
  /** Der Organisationsfilter des Druckblatts (`Druck!S4`). */
  readonly organisation?: string;
  /**
   * Wann diese Datei geschrieben wurde — das **Lebenszeichen**.
   *
   * Zu unterscheiden vom fachlichen Stand in `kopf.stand`: Der sagt, wie alt
   * die **Lage** ist, dieser hier, wie alt das **Bild** ist. Beides gehört
   * auf die Seite, und zwar aus demselben Grund, aus dem das Lagebild aus M2
   * zwei Werte je Takt mitschickt: Eine Anzeige, die „Share erreichbar“ zeigt,
   * ohne zu sagen, wann das zuletzt zutraf, ist keine Auskunft, sondern ein
   * Standbild. Ein Monitor an der Wand, dessen Schreiber vor zwanzig Minuten
   * stehengeblieben ist, sieht sonst aus wie einer, an dem sich nichts tut.
   */
  readonly geschriebenUm?: string;
}

/** Der Dateiname im Ordner `ausgaben\` — fest, weil ein Gerät ihn als Adresse behält. */
export const MONITOR_DATEINAME = "monitor.html";

function staerkeText(staerke: { fuehrer: number; unterfuehrer: number; mannschaft: number }): string {
  return `${String(staerke.fuehrer)}/${String(staerke.unterfuehrer)}/${String(staerke.mannschaft)}`;
}

function druckzeilen(daten: Druckdaten): string {
  return daten.zeilen
    .map((zeile) =>
      [
        "        <tr>",
        `          <td class="bereich tiefe-${String(zeile.tiefe)}">${htmlMaskieren(zeile.name)}</td>`,
        `          <td class="zahl">${staerkeText(zeile.staerke)}</td>`,
        `          <td class="zahl gesamt">${String(zeile.gesamt)}</td>`,
        `          <td class="zahl davon">${String(zeile.davonGesamt)}</td>`,
        "        </tr>",
      ].join("\n"),
    )
    .join("\n");
}

function statusblock(daten: Statusdaten): string {
  return [
    "  <h2>Status</h2>",
    '  <table class="monitor">',
    "    <tbody>",
    ...daten.status.map(
      (zeile) =>
        `      <tr><td>${htmlMaskieren(zeile.wert)}</td><td class="zahl gesamt">${String(zeile.gesamt)}</td></tr>`,
    ),
    "    </tbody>",
    "  </table>",
  ].join("\n");
}

/**
 * Baut die Monitorseite.
 *
 * `kopf.stand` ist die Zeile, die der Bediener am Ende ansieht, wenn er
 * wissen will, ob das Bild noch gilt — sie steht deshalb groß und nicht im
 * Kleingedruckten.
 */
export function monitorAlsHtml(
  zustand: Zustand,
  kopf: Ausgabekopf,
  optionen: Monitoroptionen = {},
): string {
  const daten = druckdaten(
    zustand,
    optionen.organisation === undefined ? {} : { organisation: optionen.organisation },
  );
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    // Ohne Skript: Die Datei wird über `file://` von einem SMB-Share
    // geöffnet, und ein Skript wäre dort je nach Browser gesperrt.
    `  <meta http-equiv="refresh" content="${String(RELOAD_SEKUNDEN)}" />`,
    `  <title>Lage — ${htmlMaskieren(daten.einsatzName)}</title>`,
    "  <style>",
    MONITOR_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="stand">${htmlMaskieren(kopf.stand)}</p>`,
    optionen.geschriebenUm === undefined
      ? ""
      : `  <p class="geschrieben">Bild geschrieben: ${htmlMaskieren(optionen.geschriebenUm)}</p>`,
    '  <p class="gesamt-gross">',
    `    ${staerkeText(daten.gesamt)} = ${String(daten.gesamtSumme)}`,
    "  </p>",
    '  <table class="monitor">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Einsatzstelle</th>',
    '        <th scope="col">Fü/UFü/He</th>',
    '        <th scope="col">Gesamt</th>',
    `        <th scope="col">${htmlMaskieren(daten.organisation)}</th>`,
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    druckzeilen(daten),
    "    </tbody>",
    "  </table>",
    `  <p class="fussnote">Angefordert / Anmarsch: ${staerkeText(daten.angefordert)} = ${String(daten.angefordertSumme)} (nicht mitgezählt)</p>`,
    optionen.mitStatus === true ? statusblock(statusdaten(zustand)) : "",
    `  <p class="fussnote">Diese Seite lädt sich alle ${String(RELOAD_SEKUNDEN)} Sekunden neu.</p>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/**
 * Der Stil des Monitors.
 *
 * Heller Text auf dunklem Grund, Zahlen in Tabellenziffern, alles groß: Er
 * hängt an der Wand und wird aus mehreren Metern gelesen. Die Maße sind in
 * `vw` und nicht in Punkt — die Auflösung des Geräts, das ihn zeigt, kennt
 * niemand vorher, und ein Tablet in der Einsatzstelle ist nicht der
 * Bildschirm im Meldekopf.
 */
export const MONITOR_STIL = [
  "    :root { color-scheme: dark; }",
  "    body { background: #101216; color: #f2f4f8; font-family: system-ui, sans-serif;",
  "           margin: 0; padding: 2vh 3vw; font-size: 2.2vh; }",
  "    h1 { font-size: 3.4vh; margin: 0 0 0.5vh; }",
  "    h2 { font-size: 2.8vh; margin: 3vh 0 1vh; }",
  "    .ausgabe-kopf p { margin: 0; opacity: 0.6; font-size: 1.8vh; }",
  "    .stand { margin: 0; font-size: 2.4vh; color: #ffd479; }",
  // Das Lebenszeichen steht kleiner als der fachliche Stand: Es beantwortet
  // eine seltenere Frage („lebt der Schreiber noch?“), aber es muss sie
  // beantworten koennen.
  "    .geschrieben { margin: 0 0 2vh; font-size: 1.8vh; opacity: 0.6; }",
  // Die Gesamtstaerke ist die eine Zahl, die aus fuenf Metern lesbar sein
  // muss. Alles andere darf man naeherkommen.
  "    .gesamt-gross { font-size: 9vh; font-weight: 700; margin: 0 0 2vh;",
  "                    font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }",
  "    table.monitor { border-collapse: collapse; width: 100%; }",
  "    table.monitor th, table.monitor td { padding: 0.6vh 1vw; text-align: left;",
  "                                         border-bottom: 1px solid #2a2f38; }",
  "    table.monitor th { opacity: 0.6; font-weight: 400; font-size: 1.9vh; }",
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; }",
  "    td.gesamt { font-weight: 700; }",
  "    td.davon { opacity: 0.7; }",
  "    td.tiefe-1 { padding-left: 3vw; }",
  "    td.tiefe-2 { padding-left: 5vw; }",
  "    td.tiefe-3 { padding-left: 7vw; }",
  "    .fussnote { opacity: 0.6; font-size: 1.8vh; margin: 1.5vh 0 0; }",
].join("\n");
