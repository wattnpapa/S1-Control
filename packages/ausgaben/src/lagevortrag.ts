/**
 * Die Mappe für die Lagebesprechung als druckbare Seite (A4 hoch).
 *
 * Stab-Review vom 22.11.2026, LtrStab A2 und S2 FA-S2-4: eine Seite für den
 * Vortrag, nicht fünf Ausdrucke. Abschnitte in der Reihenfolge, in der eine
 * Lagebesprechung sie braucht: Kräfte, was kommt und wer gehen muss,
 * Aufträge, Anforderungen, Nachrichten im Rücklauf, die letzten Einträge.
 * Daneben eine freie Spalte für Notizen; was gesagt wird, gehört von Hand
 * dazu. Gerechnet wird nichts hier, alles kommt aus `projektion.lagevortrag`.
 */

import { fachlagewort, projektion } from "@s1/domaene";

import { druckseiteAlsHtml, tabellenrahmen, zeitText } from "./druckseite.js";
import { htmlMaskieren, type Ausgabekopf } from "./index.js";

function zelle(text: string | number | undefined, klasse = ""): string {
  const inhalt = text === undefined || text === "" ? "—" : htmlMaskieren(String(text));
  return `<td${klasse === "" ? "" : ` class="${klasse}"`}>${inhalt}</td>`;
}

function tabelle(kopf: readonly string[], zeilen: readonly string[][], leer: string): string {
  const koerper = zeilen.length === 0 ? [`      <tr><td colspan="${String(kopf.length)}">${htmlMaskieren(leer)}</td></tr>`] : zeilen.map((z) => `      <tr>${z.join("")}</tr>`);
  return tabellenrahmen(
    [
      '  <table class="liste">',
      `    <thead><tr>${kopf.map((k) => `<th scope="col">${htmlMaskieren(k)}</th>`).join("")}</tr></thead>`,
      "    <tbody>",
      ...koerper,
      "    </tbody>",
      "  </table>",
    ].join("\n"),
  );
}

function kraefte(v: projektion.Lagevortrag): string {
  const spalten = projektion.KRAEFTESPALTEN;
  const zeile = (z: projektion.Kraeftezeile): string[] => [
    zelle(`${"  ".repeat(z.tiefe)}${z.name}`),
    ...spalten.map((s) => zelle(z.je[s], "zahl")),
    zelle(z.gesamt, "zahl"),
    zelle(z.erwartet, "zahl"),
  ];
  const kopf = ["Abschnitt", ...spalten.map(projektion.kraeftespaltenTitel), "Gesamt", "erwartet"];
  return tabelle(kopf, [...v.uebersicht.kraefte.map(zeile), zeile(v.uebersicht.gesamt)], "Noch keine Kräfte vor Ort.");
}

function kommenUndGehen(v: projektion.Lagevortrag): string {
  const kommen = v.uebersicht.kommen.map((b) => [zelle(b.art === "anmarsch" ? "im Anmarsch" : b.art), zelle(b.name), zelle(b.art === "zugesagt" ? zeitText(b.zeitpunkt) : ""), zelle(b.zusatz)]);
  const gehen = v.ablaufend.map((z) => [zelle("verfügbar bis"), zelle(z.einheit), zelle(zeitText(z.verfuegbarBis)), zelle(z.abloesung === undefined ? "keine Ablösung" : `${z.abloesung.marke.text}: ${z.abloesung.durch}`)]);
  return tabelle(["Was", "Einheit", "Zeit", "Bemerkung"], [...kommen, ...gehen], "Niemand kommt, niemandes Zeit läuft ab.");
}

function auftraege(v: projektion.Lagevortrag): string {
  const offen = v.uebersicht.auftraege.filter((a) => a.offen);
  return tabelle(["Auftrag", "Einheit", "Abschnitt", "seit"], offen.map((a) => [zelle(a.text), zelle(a.einheit), zelle(a.abschnitt), zelle(zeitText(a.von))]), "Keine offenen Aufträge.");
}

function anforderungen(v: projektion.Lagevortrag): string {
  return tabelle(
    ["Nr.", "Zustand", "Vorgesehen", "Zusage", "Auftrag"],
    v.anforderungen.map((a) => [zelle(a.kennung), zelle(a.zustand), zelle(a.vorgeseheneEinheitText), zelle(a.zugesagtFuer === undefined ? "" : `${zeitText(a.zugesagtFuer)} ${a.zugesagtVon ?? ""}`), zelle(a.vorgesehenerAuftrag)]),
    "Keine offenen Anforderungen.",
  );
}

function ruecklauf(v: projektion.Lagevortrag): string {
  return tabelle(
    ["Stelle", "offen", "ungelesen", "dringendste"],
    v.ruecklauf.map((r) => [zelle(r.stelle), zelle(r.kopien.length, "zahl"), zelle(r.ungelesen, "zahl"), zelle(r.kopien.slice(0, 2).map((k) => `${k.kennzeichen} ${k.betreff}`).join("; "))]),
    "Jede grüne Kopie ist erledigt.",
  );
}

function wort(wert: unknown): string {
  return typeof wert === "string" ? fachlagewort(wert) : wert === undefined ? "" : String(wert);
}

/** Lage je Abschnitt, Pegel und die offenen Einträge der übrigen Bereiche. */
function fachlageTeil(v: projektion.Lagevortrag): string[] {
  const f = v.fachlage;
  const offen = (b: projektion.Fachlagebereich): projektion.Fachlagezeile[] => f.zeilen[b].filter((z) => !z.erledigt);
  const p = f.patientensumme;
  return [
    "  <h2>Lage je Abschnitt</h2>",
    tabelle(["Abschnitt", "Lage", "Ort", "Bedarf", "Stand"], f.lageJeAbschnitt.map((z) => [zelle(z.abschnitt), zelle(wort(z.werte["lage"])), zelle(wort(z.werte["ort"])), zelle(wort(z.werte["bedarf"])), zelle(zeitText(z.zeitpunkt))]), "Keine Lagemeldungen."),
    "  <h2>Pegel und Deich</h2>",
    tabelle(["Pegel / Deich-km", "Wert / Art", "Tendenz / Maßnahme", "Prognose / Stand"], [
      ...f.pegelstaende.map((s) => [zelle(s.pegel), zelle(`${String(s.wertCm)} cm`), zelle(s.tendenzCm === undefined ? "" : `${s.tendenzCm >= 0 ? "+" : ""}${String(s.tendenzCm)} cm`), zelle(s.prognoseCm === undefined ? "" : `${String(s.prognoseCm)} cm`)]),
      ...offen("deich").map((z) => [zelle(`Deich-km ${wort(z.werte["deichKm"])}`), zelle(wort(z.werte["art"])), zelle(wort(z.werte["massnahme"])), zelle(wort(z.stand))]),
    ], "Keine Pegel und keine offenen Schadstellen."),
    "  <h2>Patienten, Amtshilfe, Material, Störungen</h2>",
    `  <p>${htmlMaskieren(`Patienten: ${String(p.gesamt)} (SK 1: ${String(p["SK1"])}, SK 2: ${String(p["SK2"])}, SK 3: ${String(p["SK3"])}, SK 4: ${String(p["SK4"])}), davon Einsatzkräfte: ${String(p.einsatzkraefte)}`)}</p>`,
    tabelle(["Bereich", "Eintrag", "Stand"], [
      ...offen("amtshilfe").map((z) => [zelle("Amtshilfe"), zelle(`${wort(z.werte["kennung"])}: ${wort(z.werte["leistung"])}`), zelle(wort(z.stand))]),
      ...offen("material").map((z) => [zelle("Material"), zelle(`${wort(z.werte["menge"])} ${wort(z.werte["mengeneinheit"])} ${wort(z.werte["bezeichnung"])}`), zelle(wort(z.stand))]),
      ...offen("stoerungen").map((z) => [zelle("Störung"), zelle(`${wort(z.werte["bereich"])}: ${wort(z.werte["beschreibung"])}`), zelle(wort(z.stand))]),
    ], "Nichts offen."),
  ];
}

function eintraege(v: projektion.Lagevortrag): string {
  return tabelle(["Zeit", "Eintrag"], v.eintraege.map((e) => [zelle(zeitText(e.zeitpunkt)), zelle(e.satz)]), "Noch keine eigenen Einträge.");
}

export function lagevortragAlsHtml(v: projektion.Lagevortrag, kopf: Ausgabekopf): string {
  return druckseiteAlsHtml({
    titel: "Lagevortrag",
    kopf,
    querformat: false,
    inhalt: [
      ...fachlageTeil(v),
      "  <h2>Kräfte nach Status</h2>",
      kraefte(v),
      "  <h2>Kommen und Gehen</h2>",
      kommenUndGehen(v),
      "  <h2>Offene Aufträge</h2>",
      auftraege(v),
      "  <h2>Anforderungen</h2>",
      anforderungen(v),
      "  <h2>Nachrichten im Rücklauf</h2>",
      ruecklauf(v),
      "  <h2>Letzte Einträge im Einsatztagebuch</h2>",
      eintraege(v),
      '  <h2>Notizen</h2>\n  <div class="notizfeld" style="min-height: 40mm; border: 0.3mm solid #999;"></div>',
    ],
  });
}
