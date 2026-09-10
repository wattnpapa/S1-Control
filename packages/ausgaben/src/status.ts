/**
 * Die Status-Matrix — „Stärke nach Organisationen / Status / Schichten“ (M4.1).
 *
 * Vorbild ist das Blatt „Status“ der Excel (Bestandsaufnahme
 * `excel-domaenenmodell.md` §4.2). Es ist der zweite Ausdruck jeder
 * Lagebesprechung und beantwortet drei Fragen in drei Blöcken: **Wer ist da?
 * Was tun sie? Wann sind sie da?**
 *
 * Der wichtigste Unterschied zum Druck steht in der Bestandsaufnahme in einem
 * Satz: „Gesamtsumme J20 zählt **inkl.** Angefordert (im Gegensatz zu Druck).“
 * Das ist kein Versehen der Vorlage, sondern ihr Zweck: Der Druck zeigt die
 * Lagekarte, der Status die Kräftebilanz — und wer angefordert ist, gehört in
 * die Bilanz, nur nicht auf die Karte.
 *
 * **Die drei Kontrollsummen sind der eigentliche Wert dieses Blatts.** Sie
 * stehen in der Vorlage als `G36` und `G43` und sagen einer Führungsstelle
 * ohne Nachrechnen, ob ihre Erfassung vollständig ist:
 *
 *  * K21: `Σ_Status − Σ_Organisation = 0`, sonst „Einheiten ohne Statusangabe
 *    oder Organisation".
 *  * K23: `Σ_Schicht − Σ_Organisation + Σ_ANGEFORDERT = 0`, sonst „Einheiten
 *    ohne Schichtangabe oder Organisation" — angeforderte Kräfte dürfen ohne
 *    Schicht sein, und genau deshalb steht ihr Anteil in der Probe.
 *  * K25 nennt die Einheiten, an denen es liegt. Die Vorlage kann das nicht;
 *    sie sagt nur, **dass** etwas fehlt.
 */

import { kennzahlen, type Staerke, type Zustand } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

/** Eine Zeile der Organisationsmatrix — Block 1 der Vorlage (Z. 7–18). */
export interface Organisationszeile {
  readonly organisation: string;
  readonly staerke: Staerke;
  readonly gesamt: number;
  readonly maennlich: number;
  readonly weiblich: number;
  readonly divers: number;
  readonly vegetarisch: number;
  readonly vegan: number;
  readonly uebernachtungM: number;
  readonly uebernachtungW: number;
  readonly uebernachtungD: number;
}

/** Eine Zeile der Status- oder Schichtmatrix — Blöcke 2 und 3. */
export interface Verteilungszeile {
  readonly wert: string;
  readonly staerke: Staerke;
  readonly gesamt: number;
}

export interface Statusdaten {
  readonly einsatzName: string;
  readonly fuestName: string;
  readonly organisationen: readonly Organisationszeile[];
  readonly organisationenSumme: Organisationszeile;
  readonly status: readonly Verteilungszeile[];
  readonly statusSumme: number;
  readonly schichten: readonly Verteilungszeile[];
  readonly schichtenSumme: number;
  /** K21; 0 heißt „o.k.“. */
  readonly probeStatus: number;
  /** K23; 0 heißt „o.k.“. */
  readonly probeSchicht: number;
  /** K25 — die Einheiten, an denen eine der beiden Proben hängt. */
  readonly ohnePflichtangabe: readonly { readonly id: string; readonly bezeichnung: string }[];
}

const NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function plus(a: Staerke, b: Staerke): Staerke {
  return {
    fuehrer: a.fuehrer + b.fuehrer,
    unterfuehrer: a.unterfuehrer + b.unterfuehrer,
    mannschaft: a.mannschaft + b.mannschaft,
  };
}

function summe(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

function verteilung(matrix: { readonly [wert: string]: kennzahlen.Matrixzeile }): Verteilungszeile[] {
  return Object.entries(matrix).map(([wert, zeile]) => ({
    wert,
    staerke: zeile.staerke,
    gesamt: zeile.gesamt,
  }));
}

/**
 * Rechnet die Zahlen der Status-Matrix.
 *
 * **`maennlich` wird als Rest über beide anderen Geschlechter gebildet** —
 * `Gesamt − weiblich − divers`, wie K5 und `Log!I7` es tun. Das Blatt „Status“
 * der Excel rechnet an dieser einen Stelle anders: `M = J − N` zieht nur die
 * weiblichen ab, die diversen nicht (`excel-domaenenmodell.md` §4.2). Damit
 * widerspricht die Vorlage sich selbst, und zwar zwischen zwei Blättern über
 * derselben Größe. Hier gilt **eine** Definition, und es ist die, die aufgeht;
 * die Abweichung ist als Befund A-B1 festgehalten und gehört vor den
 * Paritätsvergleich geklärt.
 */
export function statusdaten(zustand: Zustand): Statusdaten {
  const zeilen: Organisationszeile[] = [];
  for (const [organisation] of Object.entries(kennzahlen.matrixOrganisation(zustand))) {
    const einheiten = kennzahlen
      .einheitenDerLage(zustand)
      .filter((e) => (typeof e.organisation.wert === "string" ? e.organisation.wert : "") === organisation);
    let staerke: Staerke = NULL;
    let maennlich = 0;
    let weiblich = 0;
    let divers = 0;
    let vegetarisch = 0;
    let vegan = 0;
    let uebernachtungM = 0;
    let uebernachtungW = 0;
    let uebernachtungD = 0;
    for (const einheit of einheiten) {
      staerke = plus(staerke, einheit.wirksameStaerke);
      const zahlen = kennzahlen.logistik(zustand, einheit);
      maennlich += zahlen.maennlich;
      weiblich += zahlen.weiblich;
      divers += zahlen.divers;
      vegetarisch += zahlen.vegetarisch;
      vegan += zahlen.vegan;
      const nacht = kennzahlen.uebernachtung(zustand, einheit);
      // K6 benennt die drei Felder kurz — `m`, `w`, `d` —, weil sie in der
      // Excel so heißen (`Log!N..P`, „ÜN (m)/(w)/(d)“).
      uebernachtungM += nacht.m;
      uebernachtungW += nacht.w;
      uebernachtungD += nacht.d;
    }
    zeilen.push({
      organisation,
      staerke,
      gesamt: summe(staerke),
      maennlich,
      weiblich,
      divers,
      vegetarisch,
      vegan,
      uebernachtungM,
      uebernachtungW,
      uebernachtungD,
    });
  }

  const gesamtzeile = zeilen.reduce<Organisationszeile>(
    (a, b) => ({
      organisation: "Gesamt",
      staerke: plus(a.staerke, b.staerke),
      gesamt: a.gesamt + b.gesamt,
      maennlich: a.maennlich + b.maennlich,
      weiblich: a.weiblich + b.weiblich,
      divers: a.divers + b.divers,
      vegetarisch: a.vegetarisch + b.vegetarisch,
      vegan: a.vegan + b.vegan,
      uebernachtungM: a.uebernachtungM + b.uebernachtungM,
      uebernachtungW: a.uebernachtungW + b.uebernachtungW,
      uebernachtungD: a.uebernachtungD + b.uebernachtungD,
    }),
    {
      organisation: "Gesamt",
      staerke: NULL,
      gesamt: 0,
      maennlich: 0,
      weiblich: 0,
      divers: 0,
      vegetarisch: 0,
      vegan: 0,
      uebernachtungM: 0,
      uebernachtungW: 0,
      uebernachtungD: 0,
    },
  );

  const status = verteilung(kennzahlen.matrixStatus(zustand));
  const schichten = verteilung(kennzahlen.matrixSchicht(zustand));

  return {
    einsatzName: typeof zustand.einsatz?.name.wert === "string" ? zustand.einsatz.name.wert : "(ohne Namen)",
    fuestName: typeof zustand.einsatz?.fuestName.wert === "string" ? zustand.einsatz.fuestName.wert : "",
    organisationen: zeilen,
    organisationenSumme: gesamtzeile,
    status,
    statusSumme: status.reduce((s, z) => s + z.gesamt, 0),
    schichten,
    schichtenSumme: schichten.reduce((s, z) => s + z.gesamt, 0),
    probeStatus: kennzahlen.konsistenzStatus(zustand),
    probeSchicht: kennzahlen.konsistenzSchicht(zustand),
    ohnePflichtangabe: kennzahlen.einheitenOhnePflichtangabe(zustand).map((einheit) => ({
      id: einheit.id,
      bezeichnung: typeof einheit.bezeichnung.wert === "string" ? einheit.bezeichnung.wert : einheit.id,
    })),
  };
}

/** Die Meldung zu K21, im Wortlaut der Vorlage (`Status!G36`). */
export function meldungStatus(probe: number): string {
  return probe === 0 ? "o.k." : "Einheiten ohne Statusangabe oder Organisation";
}

/** Die Meldung zu K23, im Wortlaut der Vorlage (`Status!G43`). */
export function meldungSchicht(probe: number): string {
  return probe === 0 ? "o.k." : "Einheiten ohne Schichtangabe oder Organisation";
}

function zahl(wert: number): string {
  return `<td class="zahl">${String(wert)}</td>`;
}

function verteilungstabelle(titel: string, zeilen: readonly Verteilungszeile[], gesamt: number): string {
  return [
    `  <h2>${htmlMaskieren(titel)}</h2>`,
    '  <table class="status">',
    '    <thead><tr><th scope="col">Wert</th><th scope="col">Fü</th><th scope="col">UFü</th><th scope="col">He</th><th scope="col">Gesamt</th></tr></thead>',
    "    <tbody>",
    ...zeilen.map((zeile) =>
      [
        "      <tr>",
        `        <th scope="row">${htmlMaskieren(zeile.wert)}</th>`,
        `        ${zahl(zeile.staerke.fuehrer)}`,
        `        ${zahl(zeile.staerke.unterfuehrer)}`,
        `        ${zahl(zeile.staerke.mannschaft)}`,
        `        ${zahl(zeile.gesamt)}`,
        "      </tr>",
      ].join("\n"),
    ),
    '      <tr class="summenzeile">',
    '        <th scope="row">Summe</th>',
    "        <td></td><td></td><td></td>",
    `        ${zahl(gesamt)}`,
    "      </tr>",
    "    </tbody>",
    "  </table>",
  ].join("\n");
}

/** Setzt die Status-Matrix als HTML. */
export function statusAlsHtml(daten: Statusdaten, kopf: Ausgabekopf): string {
  const organisationszeilen = [...daten.organisationen, daten.organisationenSumme].map((zeile, nummer) =>
    [
      `      <tr${nummer === daten.organisationen.length ? ' class="summenzeile"' : ""}>`,
      `        <th scope="row">${htmlMaskieren(zeile.organisation)}</th>`,
      `        ${zahl(zeile.staerke.fuehrer)}`,
      `        ${zahl(zeile.staerke.unterfuehrer)}`,
      `        ${zahl(zeile.staerke.mannschaft)}`,
      `        ${zahl(zeile.gesamt)}`,
      `        ${zahl(zeile.maennlich)}`,
      `        ${zahl(zeile.weiblich)}`,
      `        ${zahl(zeile.divers)}`,
      `        ${zahl(zeile.vegetarisch)}`,
      `        ${zahl(zeile.vegan)}`,
      `        ${zahl(zeile.uebernachtungM)}`,
      `        ${zahl(zeile.uebernachtungW)}`,
      `        ${zahl(zeile.uebernachtungD)}`,
      "      </tr>",
    ].join("\n"),
  );

  const probeStatusOk = daten.probeStatus === 0;
  const probeSchichtOk = daten.probeSchicht === 0;

  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>Status — ${htmlMaskieren(daten.einsatzName)}</title>`,
    "  <style>",
    STATUS_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <p class="fuest">${htmlMaskieren(daten.fuestName)}</p>`,
    "  <h2>Stärke nach Organisationen</h2>",
    '  <table class="status">',
    "    <thead>",
    "      <tr>",
    '        <th scope="col">Organisation</th>',
    '        <th scope="col">Fü</th><th scope="col">UFü</th><th scope="col">He</th><th scope="col">Gesamt</th>',
    '        <th scope="col">Männl.</th><th scope="col">Weibl.</th><th scope="col">Div.</th>',
    '        <th scope="col">Veget.</th><th scope="col">Vegan</th>',
    '        <th scope="col">ÜN (m)</th><th scope="col">ÜN (w)</th><th scope="col">ÜN (d)</th>',
    "      </tr>",
    "    </thead>",
    "    <tbody>",
    ...organisationszeilen,
    "    </tbody>",
    "  </table>",
    verteilungstabelle("Status der Einsatzkräfte", daten.status, daten.statusSumme),
    verteilungstabelle("Schichten", daten.schichten, daten.schichtenSumme),
    '  <h2>Kontrollsummen</h2>',
    '  <ul class="proben">',
    `    <li class="${probeStatusOk ? "ok" : "fehler"}">Status: ${htmlMaskieren(meldungStatus(daten.probeStatus))}${probeStatusOk ? "" : ` (${String(daten.probeStatus)})`}</li>`,
    `    <li class="${probeSchichtOk ? "ok" : "fehler"}">Schicht: ${htmlMaskieren(meldungSchicht(daten.probeSchicht))}${probeSchichtOk ? "" : ` (${String(daten.probeSchicht)})`}</li>`,
    "  </ul>",
    // K25 nennt die Einheiten, an denen es liegt. Die Vorlage kann das nicht;
    // sie sagt nur, **dass** etwas fehlt — und dann sucht jemand von Hand.
    daten.ohnePflichtangabe.length === 0
      ? '  <p class="hinweis">Alle Einheiten tragen Organisation, Status und Schicht.</p>'
      : [
          '  <p class="hinweis">Ohne Pflichtangabe:</p>',
          '  <ul class="fehlende">',
          ...daten.ohnePflichtangabe.map(
            (einheit) => `    <li>${htmlMaskieren(einheit.bezeichnung)} (${htmlMaskieren(einheit.id)})</li>`,
          ),
          "  </ul>",
        ].join("\n"),
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export const STATUS_STIL = [
  "    @page { size: A4 portrait; margin: 12mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 11pt; margin: 5mm 0 1.5mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    .fuest { margin: 0 0 4mm; }",
  "    table.status { border-collapse: collapse; width: 100%; }",
  "    table.status th, table.status td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; }",
  "    table.status thead th { background: #eee; font-size: 9pt; }",
  '    table.status th[scope="row"] { text-align: left; font-weight: 400; }',
  "    td.zahl { text-align: right; font-variant-numeric: tabular-nums; }",
  "    tr.summenzeile th, tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  "    ul.proben { margin: 0; padding-left: 5mm; }",
  "    .ok { color: #157a3c; }",
  "    .fehler { color: #b91c1c; font-weight: 700; }",
  "    .hinweis { font-size: 9pt; color: #444; }",
].join("\n");
