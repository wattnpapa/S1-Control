/**
 * Die Führungsharke — das Blatt „FüOrg“ (M8.3).
 *
 * **Was die Vorlage ist.** In der Excel ist `FüOrg` ein reines Zeichenblatt
 * (`excel-domaenenmodell.md` §4.5): Organigramm-Formen mit Textfeldern, dazu
 * vier verknüpfte Stärkefelder der Führungsstelle (Fü / UFü / He / Gesamt).
 * Die Hinweise des Blatts sagen, wie es angepasst wird — „durch Umbenennen
 * freier Bereiche (EA/UEA) und Verschieben der Einheiten". Bearbeitet wird
 * also die Führungsorganisation, gezeichnet wird sie nur.
 *
 * **Warum daraus kein Editor wird.** Genau dieses Umbenennen und Verschieben
 * ist in v2 der Abschnittsbaum, und der ist seit M3 bedienbar. Ein zweiter
 * Editor daneben hieße, dieselbe Struktur an zwei Stellen zu pflegen — und die
 * Ereignisse (§5.3, §5.4) kennen nur eine. Was gefehlt hat, ist die
 * **Darstellung**: ein Blatt, das man ausdruckt und an die Wand hängt.
 *
 * **Warum verschachtelte Listen und keine Kästchen mit Linien.** Eine Harke
 * mit gezeichneten Verbindungslinien braucht entweder SVG mit gerechneten
 * Koordinaten oder eine Bibliothek. Beides für ein Blatt, das gedruckt wird,
 * und beides mit dem Ergebnis, dass ein tiefer Baum über den Rand läuft. Die
 * Einrückung trägt dieselbe Aussage, überlebt jeden Seitenumbruch und ist mit
 * den Mitteln lesbar, die schon da sind.
 *
 * **Die Führungsstelle steht oben und nicht im Baum.** Sie ist kein Abschnitt:
 * Sie entsteht aus den Dienstposten (§5.7) und erscheint ausdrücklich nicht als
 * gemeldete Einheit (K17). Sie im Baum zu führen hieße, sie zweimal zu zählen.
 */

import { kennzahlen, projektion, staerkeSumme, type Staerke, type Zustand } from "@s1/domaene";
import type { Baumknoten } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

/** Ein Kasten der Harke — ein Abschnitt mit dem, was an ihm hängt. */
export interface Harkenknoten {
  readonly name: string;
  readonly typ: string;
  readonly staerke: Staerke;
  readonly einheiten: number;
  /** §5.3.2: aufgelöst — im Blatt durchgestrichen und nicht weggelassen. */
  readonly aufgeloest: boolean;
  readonly kinder: readonly Harkenknoten[];
}

export interface Harke {
  /** Die Stärke der Führungsstelle je Teileinheit und Schicht (K17). */
  readonly fuest: readonly { readonly bezeichnung: string; readonly staerke: Staerke }[];
  readonly fuestGesamt: Staerke;
  readonly knoten: readonly Harkenknoten[];
  readonly gesamt: Staerke;
}

/** Addiert Stärketripel — die Summenzeile des Kastens der Führungsstelle. */
function addiere(teile: readonly Staerke[]): Staerke {
  return teile.reduce(
    (summe, s) => ({
      fuehrer: summe.fuehrer + s.fuehrer,
      unterfuehrer: summe.unterfuehrer + s.unterfuehrer,
      mannschaft: summe.mannschaft + s.mannschaft,
    }),
    { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  );
}

function harkenknoten(knoten: Baumknoten): Harkenknoten {
  return {
    name: knoten.name,
    typ: knoten.typ,
    staerke: knoten.summenStaerke,
    einheiten: knoten.einheitenSumme,
    aufgeloest: knoten.aufgeloestNach !== undefined,
    kinder: knoten.kinder.map(harkenknoten),
  };
}

/**
 * Baut die Harke aus dem Zustand.
 *
 * Der Baum kommt **ohne Archiv**: Ein Organigramm, das den Archivabschnitt
 * zeichnet, zeigt eine Führungsstruktur, die es nicht gibt. Aufgelöste
 * Abschnitte bleiben dagegen stehen (§5.3.2) — sie waren Teil der
 * Organisation, und ein Blatt, das gedruckt und abgeheftet wird, soll das
 * zeigen.
 */
export function harke(zustand: Zustand): Harke {
  const baum = projektion.abschnittsbaum(zustand, { ohneArchiv: true });
  const fuestZeilen = projektion.fuestStaerke(zustand);
  const fuest = fuestZeilen.map((zeile) => ({
    bezeichnung: `${zeile.teileinheit} · ${zeile.schicht}`,
    staerke: zeile.staerke,
  }));
  return {
    fuest,
    fuestGesamt: addiere(fuest.map((z) => z.staerke)),
    knoten: baum.map(harkenknoten),
    gesamt: kennzahlen.einsatzGesamtstaerke(zustand).gesamt,
  };
}

/** „3 / 5 / 12 = 20" — die Schreibweise der Vorlage (Fü / UFü / He = Ges). */
export function staerkeText(staerke: Staerke): string {
  return `${String(staerke.fuehrer)} / ${String(staerke.unterfuehrer)} / ${String(staerke.mannschaft)} = ${String(staerkeSumme(staerke))}`;
}

function knotenAlsHtml(knoten: Harkenknoten): string {
  const klassen = ["harke-knoten"];
  if (knoten.aufgeloest) klassen.push("aufgeloest");
  const kinder =
    knoten.kinder.length === 0
      ? ""
      : `\n<ul>\n${knoten.kinder.map(knotenAlsHtml).join("\n")}\n</ul>`;
  return [
    `<li class="${klassen.join(" ")}">`,
    `  <span class="name">${htmlMaskieren(knoten.name)}</span>`,
    `  <span class="typ">${htmlMaskieren(knoten.typ)}</span>`,
    `  <span class="staerke">${staerkeText(knoten.staerke)}</span>`,
    `  <span class="einheiten">${String(knoten.einheiten)} Einh.</span>`,
    kinder,
    "</li>",
  ].join("\n");
}

/** Das Stilblatt der Harke — wie bei den übrigen Ausgaben eingebettet, nicht verlinkt. */
export const FUEORG_STIL = `
.harke ul { list-style: none; margin: 0; padding-left: 1.6em; }
.harke > ul { padding-left: 0; }
.harke-knoten { border-left: 2px solid #333; padding: 0.2em 0 0.2em 0.6em; margin: 0.15em 0; }
.harke-knoten > .name { font-weight: bold; }
.harke-knoten > .typ { color: #555; margin-left: 0.5em; }
.harke-knoten > .staerke { float: right; font-variant-numeric: tabular-nums; }
.harke-knoten > .einheiten { color: #555; margin-left: 0.5em; }
.harke-knoten.aufgeloest > .name { text-decoration: line-through; }
.fuest-kasten { border: 2px solid #333; padding: 0.4em 0.8em; margin-bottom: 1em; }
.fuest-kasten table { border-collapse: collapse; }
.fuest-kasten td { padding: 0.1em 0.8em 0.1em 0; }
`.trim();

/**
 * Die Harke als vollständige HTML-Seite — wie jede Ausgabe seit M4.1.
 *
 * Der Stil ist eingebettet und nicht verlinkt: Die Datei landet im Ordner
 * `ausgaben\` und wird von dort weitergegeben; eine Seite, die ihr Stilblatt
 * noch sucht, sieht auf dem Rechner des Empfängers anders aus.
 */
export function harkeAlsHtml(zustand: Zustand, kopf: Ausgabekopf): string {
  const blatt = harke(zustand);
  const fuestZeilen =
    blatt.fuest.length === 0
      ? "<p>Keine Dienstposten erfasst.</p>"
      : [
          "<table>",
          ...blatt.fuest.map(
            (zeile) =>
              `  <tr><td>${htmlMaskieren(zeile.bezeichnung)}</td><td>${staerkeText(zeile.staerke)}</td></tr>`,
          ),
          `  <tr class="summe"><td>Führungsstelle gesamt</td><td>${staerkeText(blatt.fuestGesamt)}</td></tr>`,
          "</table>",
        ].join("\n");

  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Führungsorganisation — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    FUEORG_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    '<section class="harke">',
    "  <h2>Führungsorganisation</h2>",
    '  <div class="fuest-kasten">',
    "    <h3>Führungsstelle</h3>",
    fuestZeilen,
    "  </div>",
    blatt.knoten.length === 0
      ? "  <p>Keine Abschnitte angelegt.</p>"
      : `  <ul>\n${blatt.knoten.map(knotenAlsHtml).join("\n")}\n  </ul>`,
    `  <p class="gesamt">Einsatz gesamt: ${staerkeText(blatt.gesamt)}</p>`,
    "  <p class=\"fussnote\">Fü / UFü / He = Gesamt. Aufgelöste Abschnitte sind durchgestrichen (§5.3.2); die Führungsstelle steht außerhalb des Baums, weil sie aus den Dienstposten entsteht (§5.7, K17).</p>",
    "</section>",
    "</body>",
    "</html>",
  ].join("\n");
}
