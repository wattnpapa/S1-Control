/**
 * Anforderungsliste und Einsatztagebuch als druckbare Listen.
 *
 * Beide gab es bisher nur am Bildschirm. Auf Papier sind sie die
 * Rückfallebene und die Übergabe an die nächste Schicht: eine Zeile je
 * Anforderung beziehungsweise je Tagebucheintrag, hinten eine freie Spalte
 * für handschriftliche Vermerke, unten Seitenzahl und Stand.
 *
 * Das Tagebuch läuft **chronologisch aufsteigend** — auf Papier liest man es
 * wie ein Logbuch von oben nach unten, nicht wie den Bildschirm mit dem
 * Neuesten oben.
 */

import type { projektion } from "@s1/domaene";

import { druckseiteAlsHtml, tabellenrahmen, zeitText } from "./druckseite.js";
import { htmlMaskieren, type Ausgabekopf } from "./index.js";

function zelle(text: string | undefined, klasse = ""): string {
  const inhalt = text === undefined || text === "" ? "—" : htmlMaskieren(text);
  return `<td${klasse === "" ? "" : ` class="${klasse}"`}>${inhalt}</td>`;
}

function anforderungsZeile(zeile: projektion.Anforderungszeile): string {
  const zusage = [zeile.zugesagtFuer, zeile.zugesagtVon].filter((t) => t !== undefined && t !== "").join(" / ");
  return [
    "      <tr>",
    `        ${zelle(zeile.kennung)}`,
    `        ${zelle(zeile.storniert ? `${zeile.zustand} (storniert)` : zeile.zustand)}`,
    `        ${zelle(zeitText(zeile.angefordertAm))}`,
    `        ${zelle(zeile.abzuloesendeEinheit)}`,
    `        ${zelle(zeile.vorgeseheneEinheitText)}`,
    `        ${zelle(zeile.vorgesehenerAuftrag)}`,
    `        ${zelle(zusage)}`,
    `        ${zelle(zeile.erledigtAm === undefined ? undefined : zeitText(zeile.erledigtAm))}`,
    `        ${zelle(zeile.bemerkung)}`,
    '        <td class="notiz"></td>',
    "      </tr>",
  ].join("\n");
}

/** Die Anforderungsliste als druckbare HTML-Seite (Querformat). */
export function anforderungenAlsHtml(
  zeilen: readonly projektion.Anforderungszeile[],
  jeZustand: Readonly<Record<string, number>>,
  kopf: Ausgabekopf,
): string {
  const summe = Object.entries(jeZustand)
    .filter(([, n]) => n > 0)
    .map(([zustand, n]) => `${zustand}: ${String(n)}`)
    .join(" · ");
  const tabelle = [
    '  <table class="liste">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Nr.</th><th scope="col">Zustand</th><th scope="col">Angefordert</th>',
    '        <th scope="col">Ablösung für</th><th scope="col">Vorgesehene Einheit</th>',
    '        <th scope="col">Auftrag</th><th scope="col">Zusage</th><th scope="col">Erledigt</th>',
    '        <th scope="col">Bemerkung</th><th scope="col">Notiz</th>',
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    ...zeilen.map(anforderungsZeile),
    ...(zeilen.length === 0 ? ['      <tr><td colspan="10">Keine Anforderungen erfasst.</td></tr>'] : []),
    "    </tbody>",
    "  </table>",
  ].join("\n");
  return druckseiteAlsHtml({
    titel: "Anforderungen",
    kopf,
    inhalt: [
      "  <h2>Anforderungen</h2>",
      `  <p class="hinweis">${htmlMaskieren(`${String(zeilen.length)} Anforderung(en)${summe === "" ? "" : ` — ${summe}`}`)}</p>`,
      tabellenrahmen(tabelle),
    ],
  });
}

function tagebuchZeile(zeile: projektion.Tagebuchzeile): string {
  return [
    "      <tr>",
    `        ${zelle(zeitText(zeile.zeitpunkt ?? zeile.wanduhr))}`,
    `        ${zelle(zeile.akteur)}`,
    `        ${zelle(zeile.grund === undefined || zeile.grund === "" ? zeile.satz : `${zeile.satz} (Grund: ${zeile.grund})`)}`,
    '        <td class="notiz"></td>',
    "      </tr>",
  ].join("\n");
}

/**
 * Das Einsatztagebuch als druckbare HTML-Seite.
 *
 * `zeilen` kommen in der Reihenfolge der Ansicht (neueste zuerst) und werden
 * hier umgedreht.
 */
export function tagebuchAlsHtml(zeilen: readonly projektion.Tagebuchzeile[], kopf: Ausgabekopf): string {
  const aufsteigend = [...zeilen].reverse();
  const tabelle = [
    '  <table class="liste">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Zeit</th><th scope="col">Wer</th><th scope="col">Eintrag</th><th scope="col">Notiz</th>',
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    ...aufsteigend.map(tagebuchZeile),
    ...(aufsteigend.length === 0 ? ['      <tr><td colspan="4">Noch keine Einträge.</td></tr>'] : []),
    "    </tbody>",
    "  </table>",
  ].join("\n");
  return druckseiteAlsHtml({
    titel: "Einsatztagebuch",
    kopf,
    querformat: false,
    inhalt: [
      "  <h2>Einsatztagebuch</h2>",
      `  <p class="hinweis">${String(aufsteigend.length)} Einträge, älteste zuerst.</p>`,
      tabellenrahmen(tabelle),
    ],
  });
}
