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

import { projektion, uhrzeitText } from "@s1/domaene";

import { druckseiteAlsHtml, tabellenrahmen, zeitText } from "./druckseite.js";
import { htmlMaskieren, type Ausgabekopf } from "./index.js";

function zelle(text: string | undefined, klasse = ""): string {
  const inhalt = text === undefined || text === "" ? "—" : htmlMaskieren(text);
  return `<td${klasse === "" ? "" : ` class="${klasse}"`}>${inhalt}</td>`;
}

function anforderungsZeile(zeile: projektion.Anforderungszeile): string {
  // Die Zusage ist ein Zeitpunkt (ISO, UTC): als Ortszeit, nicht als „…T18:30:00.000Z“ (Stab-Review S1, B-S1-1).
  const zugesagtFuer = zeile.zugesagtFuer === undefined || zeile.zugesagtFuer === "" ? undefined : zeitText(zeile.zugesagtFuer);
  const zusage = [zugesagtFuer, zeile.zugesagtVon].filter((t) => t !== undefined && t !== "").join(" / ");
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

/**
 * Wie das Tagebuch endet (ETB P0-3): „Einsatztagebuch abgeschlossen <Zeit>,
 * <Akteur>", wenn der Einsatz beendet ist; sonst gilt der Stand des Kopfes.
 */
export interface Tagebuchabschluss {
  /** Zeit und Akteur der Zeile „Einsatz beendet"; fehlt, solange der Einsatz läuft. */
  readonly beendet?: { readonly zeit: string; readonly akteur: string };
}

/** Der Grund steht schon im Satz, wenn die Zeile ihn selbst nennt (Zurückziehen, ETB P0-2). */
function satzMitGrund(zeile: projektion.Tagebuchzeile): string {
  const grund = zeile.grund ?? "";
  if (grund === "" || zeile.satz.includes(grund)) return zeile.satz;
  return `${zeile.satz} (Grund: ${grund})`;
}

/** „17.11.2026 20:39:12“ — Datum wie `zeitText`, Uhrzeit mit Sekunden; „—“ ohne Zeit. */
function erfasstText(iso: string): string {
  const text = zeitText(iso);
  const uhr = uhrzeitText(iso, true);
  return text === "—" || uhr === "" ? text : `${text.slice(0, -5)}${uhr}`;
}

/**
 * Eine Zeile des gedruckten Tagebuchs (ETB P0-3): laufende Nummer, beide
 * Zeiten getrennt — die Wanduhr des schreibenden Rechners („Erfasst") und
 * die fachliche Zeit („Fachzeit“, wie am Bildschirm, R2-ETB P3-2) —, Nachrichtennummer, Eintrag,
 * Akteur, Handzeichen, Rechner und die Notizspalte.
 */
function tagebuchZeile(zeile: projektion.Tagebuchzeile, laufendeNummer: number): string {
  const marke = zeile.undoOf !== undefined ? " [Rücknahme]" : zeile.korrekturVon !== undefined || zeile.berichtigung === true ? " [Berichtigung]" : "";
  return [
    "      <tr>",
    `        ${zelle(String(laufendeNummer))}`,
    // R2-ETB P3-2: „Erfasst“ mit Sekunden wie am Bildschirm — die Zeit des Rechners, auf die Sekunde.
    `        ${zelle(erfasstText(zeile.wanduhr))}`,
    // Stab-Review ETB E2: ein Nachtrag trägt auch auf Papier seine Marke.
    `        ${zelle(zeile.zeitpunkt === undefined ? undefined : `${zeitText(zeile.zeitpunkt)}${zeile.nachtrag === true ? " (Nachtrag)" : ""}`)}`,
    `        ${zelle(zeile.nachrichtNummer)}`,
    `        ${zelle(`${satzMitGrund(zeile)}${marke}`)}`,
    // ETB P1-7: die Stelle, die das Ereignis nennt, statt des Anzeigenamens „Arbeitsplatz“; das Handzeichen hat seine Spalte.
    `        ${zelle(zeile.stelle === undefined ? zeile.akteur : projektion.stellenWort(zeile.stelle))}`,
    `        ${zelle(zeile.handzeichen)}`,
    `        ${zelle(zeile.rechner)}`,
    '        <td class="notiz"></td>',
    "      </tr>",
  ].join("\n");
}

/** Die Schlusszeile unter der Tabelle (ETB P0-3). */
function schlusszeile(anzahl: number, kopf: Ausgabekopf, abschluss: Tagebuchabschluss): string {
  const beendet = abschluss.beendet;
  const text =
    beendet === undefined
      ? `${kopf.stand.startsWith("Stand") ? kopf.stand : `Stand ${kopf.stand}`} · ${String(anzahl)} Einträge`
      : `Einsatztagebuch abgeschlossen ${zeitText(beendet.zeit)}, ${beendet.akteur} · ${String(anzahl)} Einträge`;
  return `  <p class="hinweis"><strong>${htmlMaskieren(text)}</strong></p>`;
}

const TAGEBUCHSPALTEN = [
  ["Nr.", "laufende Nummer der Zeile"],
  ["Erfasst", "Wanduhr des schreibenden Rechners"],
  // R2-ETB P3-2: dieselbe Beschriftung wie am Bildschirm.
  ["Fachzeit", "fachliche Zeit: Vermerk, Funkzeit, Abfassung"],
  ["Nachricht", "Nummer der Nachweisung zur Zeit des Eintrags"],
  ["Eintrag", ""],
  ["Akteur", "Stelle, wo der Schritt eine nennt, sonst der Arbeitsplatz"],
  ["Hz.", "Handzeichen, wo der Schritt eines trägt"],
  ["Rechner", ""],
  ["Notiz", ""],
] as const;

/**
 * Das Einsatztagebuch als druckbare HTML-Seite.
 *
 * `zeilen` kommen in der Reihenfolge der Ansicht (neueste zuerst) und werden
 * hier umgedreht; die Ordnung bleibt die HLC-Ordnung der Ansicht (§2.6) —
 * die fachliche Zeit darf deshalb springen (Nacherfassung vom Papier), und
 * die Spalte „Erfasst" daneben zeigt, warum (ETB P0-3).
 */
export function tagebuchAlsHtml(
  zeilen: readonly projektion.Tagebuchzeile[],
  kopf: Ausgabekopf,
  abschluss: Tagebuchabschluss = {},
): string {
  const aufsteigend = [...zeilen].reverse();
  const tabelle = [
    '  <table class="liste">',
    "    <thead>",
    "      <tr>",
    `        ${TAGEBUCHSPALTEN.map(([name, titel]) => `<th scope="col"${titel === "" ? "" : ` title="${htmlMaskieren(titel)}"`}>${htmlMaskieren(name)}</th>`).join("")}`,
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    // R2-ETB P1-2: die Nummer, die auch der Bildschirm zeigt; eine Zeile ohne sie zählt wie bisher.
    ...aufsteigend.map((zeile, index) => tagebuchZeile(zeile, zeile.laufendeNummer ?? index + 1)),
    ...(aufsteigend.length === 0 ? [`      <tr><td colspan="${String(TAGEBUCHSPALTEN.length)}">Noch keine Einträge.</td></tr>`] : []),
    "    </tbody>",
    "  </table>",
  ].join("\n");
  return druckseiteAlsHtml({
    titel: "Einsatztagebuch",
    kopf,
    querformat: true,
    inhalt: [
      "  <h2>Einsatztagebuch</h2>",
      `  <p class="hinweis">${String(aufsteigend.length)} Einträge, älteste zuerst (Ordnung des Schreibens). „Erfasst“ ist die Uhr des schreibenden Rechners, „Fachzeit“ die fachliche Zeit des Vorgangs.</p>`,
      tabellenrahmen(tabelle),
      schlusszeile(aufsteigend.length, kopf, abschluss),
    ],
  });
}
