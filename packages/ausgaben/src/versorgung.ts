/**
 * Die Ausgaben der Versorgung (S4, KONZEPT-S4.md §5) — Seiten für Papier.
 *
 * Belegungsliste (S4.2): je Unterkunft die Einheiten mit Köpfen, für den
 * Zettel an der Hallentür. Bestellliste und Vorausschau (S4.3): für den
 * Verpflegungsträger, der morgen früh kocht. Die Rechnung steht in Ring 2
 * (`projektion.versorgungsblatt`); hier entsteht nur die Seite.
 */

import type { Belegung, Unterkunftskarte, Versorgungsblatt } from "@s1/domaene";

import { htmlMaskieren, kopfAlsHtml, type Ausgabekopf } from "./index.js";

export const VERSORGUNG_STIL = [
  "    @page { size: A4; margin: 12mm; }",
  "    body { font-family: system-ui, sans-serif; font-size: 10pt; margin: 0; }",
  "    h1 { font-size: 14pt; margin: 0 0 2mm; }",
  "    h2 { font-size: 12pt; margin: 6mm 0 1.5mm; }",
  "    .ausgabe-kopf p { margin: 0; font-size: 8pt; color: #444; }",
  "    table { border-collapse: collapse; width: 100%; }",
  "    th, td { border: 0.3mm solid #999; padding: 0.8mm 1.5mm; text-align: left; }",
  "    thead th { background: #eee; font-size: 9pt; }",
  "    td.zahl, th.zahl { text-align: right; font-variant-numeric: tabular-nums; }",
  "    tr.summenzeile th, tr.summenzeile td { font-weight: 700; background: #e8e8e8; }",
  "    .unterkunft { break-inside: avoid; }",
  "    .marke { font-weight: 700; }",
  "    .hinweis { font-size: 8pt; color: #444; margin-top: 4mm; }",
].join("\n");

export function seite(titel: string, kopf: Ausgabekopf, inhalt: readonly string[]): string {
  return [
    "<!doctype html>",
    '<html lang="de">',
    "<head>",
    '  <meta charset="utf-8" />',
    `  <title>${htmlMaskieren(titel)} — ${htmlMaskieren(kopf.einsatzName)}</title>`,
    "  <style>",
    VERSORGUNG_STIL,
    "  </style>",
    "</head>",
    "<body>",
    kopfAlsHtml(kopf),
    `  <h2>${htmlMaskieren(titel)}</h2>`,
    ...inhalt,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

export const zahlzelle = (wert: number): string => `<td class="zahl">${String(wert)}</td>`;

function unterkunftAlsHtml(u: Unterkunftskarte): string[] {
  const zustand = u.ueberbelegt ? ' · <span class="marke">⚠ überbelegt</span>' : u.frei === 0 ? ' · <span class="marke">voll</span>' : "";
  return [
    '  <section class="unterkunft">',
    `    <h2>${htmlMaskieren(u.name)}${u.ort === undefined ? "" : ` · ${htmlMaskieren(u.ort)}`}</h2>`,
    `    <p>Kapazität ${String(u.kapazitaet)} · belegt ${String(u.belegt.gesamt)} · frei ${String(Math.max(0, u.frei))}${zustand}</p>`,
    "    <table>",
    '      <thead><tr><th scope="col">Einheit</th><th scope="col">Bereich</th><th scope="col" class="zahl">m</th><th scope="col" class="zahl">w</th><th scope="col" class="zahl">d</th><th scope="col" class="zahl">Köpfe</th></tr></thead>',
    "      <tbody>",
    ...(u.einheiten.length === 0 ? ['        <tr><td colspan="6">keine Einheit</td></tr>'] : []),
    ...u.einheiten.map(
      (e) =>
        `        <tr><th scope="row">${htmlMaskieren(e.einheit)}</th><td>${htmlMaskieren(e.bereich)}</td>${zahlzelle(e.m)}${zahlzelle(e.w)}${zahlzelle(e.d)}${zahlzelle(e.m + e.w + e.d)}</tr>`,
    ),
    `        <tr class="summenzeile"><th scope="row" colspan="2">Summe</th>${zahlzelle(u.belegt.m)}${zahlzelle(u.belegt.w)}${zahlzelle(u.belegt.d)}${zahlzelle(u.belegt.gesamt)}</tr>`,
    "      </tbody>",
    "    </table>",
    "  </section>",
  ];
}

/** Die Belegungsliste: je geltende Unterkunft die Einheiten mit Köpfen. */
export function belegungAlsHtml(belegung: Belegung, kopf: Ausgabekopf): string {
  const geltend = belegung.unterkuenfte.filter((u) => !u.aufgeloest);
  return seite("Belegungsliste", kopf, [
    `  <p>${String(geltend.length)} Unterkünfte · Kapazität ${String(belegung.kapazitaet)} · belegt ${String(belegung.belegt)} · frei ${String(belegung.frei)} · ohne Unterkunft ${String(belegung.ohneZuweisung.koepfe)} (${String(belegung.ohneZuweisung.einheiten)} Einheiten)</p>`,
    ...(geltend.length === 0 ? ["  <p>Keine Unterkunft angelegt.</p>"] : geltend.flatMap(unterkunftAlsHtml)),
    '  <p class="hinweis">Belegung: Übernachtungsbedarf der Einheit (K6); ohne gemeldeten Bedarf zählt eine zugewiesene Einheit mit ihren Köpfen. Eine Zuweisung über die Kapazität wird gezeigt, nicht verweigert.</p>',
  ]);
}

// ---------------------------------------------------------------------------
// Bestellliste und Vorausschau (S4.3)
// ---------------------------------------------------------------------------

const MAHLZEIT: Readonly<Record<string, string>> = { FRUEHSTUECK: "Frühstück", MITTAG: "Mittag", ABEND: "Abend", NACHT: "Nacht" };

function uhr(zeitpunkt: string, versatzMinuten: number): string {
  const d = new Date(Date.parse(zeitpunkt) + versatzMinuten * 60_000);
  return `${d.toISOString().slice(8, 10)}.${d.toISOString().slice(5, 7)}. ${d.toISOString().slice(11, 13)}${d.toISOString().slice(14, 16)}`;
}

function vorzeichen(zahl: number): string {
  return zahl > 0 ? `+${String(zahl)}` : zahl < 0 ? `−${String(-zahl)}` : "±0";
}

/**
 * Die Bestellliste: je Mahlzeit im Horizont Bedarf (Vorausschau), Bestellung
 * und Differenz, darunter der Mahlzeitenplan je Bereich mit Ausgabestelle.
 */
export function bestelllisteAlsHtml(blatt: Versorgungsblatt, kopf: Ausgabekopf, versatzMinuten: number): string {
  const zeilen = blatt.vorausschau.mahlzeiten.map((m, i) => {
    const stand = blatt.bestellstand[i];
    const b = stand?.bestellung;
    return `      <tr><th scope="row">${MAHLZEIT[m.mahlzeit] ?? m.mahlzeit} ${htmlMaskieren(uhr(m.zeitpunkt, versatzMinuten))}</th>${zahlzelle(m.vorausschau.portionen)}${zahlzelle(m.vorausschau.vegetarisch)}${zahlzelle(m.vorausschau.vegan)}<td class="zahl">${b === undefined ? "offen" : String(b.portionen)}</td><td class="zahl">${stand?.differenz === undefined ? "—" : vorzeichen(stand.differenz)}</td><td>${htmlMaskieren(b?.ausgabestelle ?? b?.bestelltBei ?? "")}</td><td class="zahl">${b?.geliefert === undefined ? "—" : String(b.geliefert)}</td></tr>`;
  });
  const plan = blatt.plan.zeilen.map(
    (z) => `      <tr><th scope="row">${htmlMaskieren(z.bereich)}</th>${blatt.plan.regel.map((r) => zahlzelle(z.jeMahlzeit[r.mahlzeit])).join("")}${zahlzelle(z.vegetarisch)}${zahlzelle(z.vegan)}<td>${htmlMaskieren(z.ausgabestelle === undefined ? "" : `${z.ausgabestelle.name}${z.ausgabestelle.vorbelegt ? " (Vorbelegung)" : ""}`)}</td></tr>`,
  );
  return seite("Bestellliste Verpflegung", kopf, [
    "  <table>",
    '    <thead><tr><th scope="col">Mahlzeit</th><th scope="col" class="zahl">Bedarf</th><th scope="col" class="zahl">veg.</th><th scope="col" class="zahl">vegan</th><th scope="col" class="zahl">bestellt</th><th scope="col" class="zahl">Differenz</th><th scope="col">bei</th><th scope="col" class="zahl">geliefert</th></tr></thead>',
    "    <tbody>",
    ...zeilen,
    "    </tbody>",
    "  </table>",
    "  <h2>Mahlzeitenplan je Bereich</h2>",
    "  <table>",
    `    <thead><tr><th scope="col">Bereich</th>${blatt.plan.regel.map((r) => `<th scope="col" class="zahl">${MAHLZEIT[r.mahlzeit] ?? r.mahlzeit} ${r.uhrzeit}</th>`).join("")}<th scope="col" class="zahl">veg.</th><th scope="col" class="zahl">vegan</th><th scope="col">Ausgabestelle</th></tr></thead>`,
    "    <tbody>",
    ...plan,
    `      <tr class="summenzeile"><th scope="row">Gesamt</th>${blatt.plan.regel.map((r) => zahlzelle(blatt.plan.summe.jeMahlzeit[r.mahlzeit])).join("")}${zahlzelle(blatt.plan.summe.vegetarisch)}${zahlzelle(blatt.plan.summe.vegan)}<td></td></tr>`,
    "    </tbody>",
    "  </table>",
    `  <p class="hinweis">Mahlzeitenregel${blatt.regelVorbelegung ? " (Vorbelegung)" : ""}: ${htmlMaskieren(blatt.regeltext)}. Bedarf = Vorausschau (Bestand + Zugänge − Abgänge). Anmarsch ohne Eintreffzeit ist nicht eingerechnet.</p>`,
  ]);
}

/** Die Vorausschau für den Verpflegungsträger: je Mahlzeit Bestand, Zu- und Abgänge, dazu die Liste. */
export function vorausschauAlsHtml(blatt: Versorgungsblatt, kopf: Ausgabekopf, versatzMinuten: number): string {
  const schau = blatt.vorausschau;
  const zeilen = schau.mahlzeiten.map(
    (m) => `      <tr><th scope="row">${MAHLZEIT[m.mahlzeit] ?? m.mahlzeit} ${htmlMaskieren(uhr(m.zeitpunkt, versatzMinuten))}</th>${zahlzelle(m.vorausschau.portionen)}${zahlzelle(m.vorausschau.vegetarisch)}${zahlzelle(m.vorausschau.vegan)}${zahlzelle(m.bestand.portionen)}<td class="zahl">+${String(m.zugang.portionen)}</td><td class="zahl">−${String(m.abgang.portionen)}</td></tr>`,
  );
  const bewegungen = schau.bewegungen.map(
    (b) => `      <tr><td>${b.zeitpunkt === undefined ? "ohne Zeit" : htmlMaskieren(uhr(b.zeitpunkt, versatzMinuten))}</td><td class="zahl">${b.art === "ABGANG" ? "−" : "+"}${String(b.koepfe)}</td><td>${htmlMaskieren(b.einheit)}</td><td>${htmlMaskieren(b.bereich)}</td><td>${htmlMaskieren(b.grund)}${b.art === "OHNE_ZEIT" ? " — nicht eingerechnet" : ""}</td></tr>`,
  );
  return seite(`Vorausschau Verpflegung, nächste ${String(schau.stunden)} h`, kopf, [
    "  <table>",
    '    <thead><tr><th scope="col">Mahlzeit</th><th scope="col" class="zahl">Portionen</th><th scope="col" class="zahl">veg.</th><th scope="col" class="zahl">vegan</th><th scope="col" class="zahl">Bestand</th><th scope="col" class="zahl">Zugang</th><th scope="col" class="zahl">Abgang</th></tr></thead>',
    "    <tbody>",
    ...zeilen,
    "    </tbody>",
    "  </table>",
    "  <h2>Zu- und Abgänge</h2>",
    "  <table>",
    "    <tbody>",
    ...(bewegungen.length === 0 ? ['      <tr><td colspan="5">keine</td></tr>'] : bewegungen),
    "    </tbody>",
    "  </table>",
    '  <p class="hinweis">Bestand = Einheiten der Einsatzbereiche je Mahlzeit nach Mahlzeitenregel und Schicht. Zugänge zählen ab der gemeldeten Eintreffzeit, Abgänge ab „verfügbar bis“, Einsatzende oder Rückführung. Was keine Zeit trägt, steht in der Liste, aber nicht in der Zahl.</p>',
  ]);
}
