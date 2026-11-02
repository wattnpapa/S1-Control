/**
 * Der Funkplan im Worker (KONZEPT-FUNKPLAN.md §5) — die Naht zwischen Ruf
 * und Ring 2.
 *
 * Gerechnet wird in `projektion.funkplan`; hier wird nur zugeschnitten: Die
 * Suche findet Einheit, Funkrufname, Rufgruppe, weitere Rufgruppen und
 * Funkhinweis (§5, F2) und lässt die Zahlen des Bandes stehen. Wer „EA2“
 * sucht, sieht die Gruppe THW_OL_EA2 mit allen Teilnehmern und Mithörern und
 * dazu jede Einheit, deren Name es trägt — die Antwort auf „wer hört dort“,
 * nicht nur auf „wie heißt die Gruppe“.
 *
 * Dazu die Bereiche für die Maske der Rufgruppe: geltende Abschnitte in der
 * Ordnung des Baums, ohne Eingang und Archiv. Der Renderer bekommt sie hier
 * mit, weil er den Baum nicht immer geholt hat (die Lage muss nicht offen
 * gewesen sein).
 *
 * Und die Auswahl der Tabellenzellen mit `werteAus` (Gruppe FUNK der
 * Einheitentabelle): `projektion.auswahlwerte`, bei Rufgruppen mit der
 * Betriebsart für die Marke „DMO“.
 */

import { projektion, type Funkplan, type Funkteilnehmer, type Zustand } from "@s1/domaene";

import type { Funkplanansicht, Funkplanbereich, Ruf, Zustandswahl } from "../kontrakt/index.js";

function passt(nadel: string, ...heu: readonly (string | undefined)[]): boolean {
  return heu.some((text) => text !== undefined && text.toLocaleLowerCase("de-DE").includes(nadel));
}

function trifftTeilnehmer(nadel: string, t: Funkteilnehmer): boolean {
  return passt(nadel, t.einheit, t.funkrufname, t.rufgruppe, t.funkhinweis, ...t.weitereRufgruppen.map((w) => w.name));
}

/** Der Plan, auf die Treffer der Suche zugeschnitten; leere Suche lässt ihn unverändert. */
export function funkplanGefiltert(plan: Funkplan, suche: string | undefined): Funkplan {
  const nadel = (suche ?? "").trim().toLocaleLowerCase("de-DE");
  if (nadel === "") return plan;
  const trifft = (t: Funkteilnehmer): boolean => trifftTeilnehmer(nadel, t);
  const rufgruppen = plan.rufgruppen.map((r) =>
    passt(nadel, r.name, r.zweck) ? r : { ...r, teilnehmer: r.teilnehmer.filter(trifft), mithoerer: r.mithoerer.filter(trifft) },
  );
  const sichtbar = new Set(rufgruppen.flatMap((r) => [...r.teilnehmer, ...r.mithoerer].map((t) => t.einheitId)));
  const bleibt = (t: Funkteilnehmer): boolean => sichtbar.has(t.einheitId) || trifftTeilnehmer(nadel, t);
  return {
    rufgruppen,
    ohneRufgruppe: plan.ohneRufgruppe.filter(bleibt),
    jeBereich: plan.jeBereich
      .map((b) => ({ ...b, teilnehmer: b.teilnehmer.filter(bleibt) }))
      .filter((b) => b.teilnehmer.length > 0),
    zahlen: plan.zahlen,
    schwelleMinuten: plan.schwelleMinuten,
  };
}

/** Die geltenden Bereiche ohne Systemabschnitte, in der Ordnung des Baums. */
export function funkplanbereiche(zustand: Zustand): readonly Funkplanbereich[] {
  const baum = projektion.abschnittsbaum(zustand, { ohneAufgeloeste: true, ohneArchiv: true });
  return projektion
    .baumZeilen(baum)
    .filter((k) => !k.systemAbschnitt)
    .map((k) => ({ abschnittId: k.id, name: k.name, tiefe: k.tiefe }));
}

/** Das Blatt „Funkplan" für den Ruf `funkplanAnfordern`. */
export function funkplanansicht(
  zustand: Zustand,
  ruf: Extract<Ruf, { art: "funkplanAnfordern" }>,
  lageZeiger: number,
): Funkplanansicht {
  return {
    lageZeiger,
    plan: funkplanGefiltert(projektion.funkplan(zustand), ruf.suche),
    bereiche: funkplanbereiche(zustand),
  };
}

/** Die Auswahl der Spalten mit `werteAus`, je Spaltenschlüssel — für die Tabellenansicht. */
export function tabellenauswahl(zustand: Zustand): { readonly [spalte: string]: readonly Zustandswahl[] } {
  const ergebnis: Record<string, readonly Zustandswahl[]> = {};
  for (const spalte of projektion.SPALTEN) {
    if (spalte.werteAus === undefined) continue;
    ergebnis[spalte.schluessel] = projektion.auswahlwerte(zustand, spalte).map((w) => {
      const betriebsart = spalte.werteAus === "rufgruppen" ? zustand.rufgruppen?.[w.wert]?.betriebsart.wert : undefined;
      return typeof betriebsart === "string" ? { ...w, betriebsart } : w;
    });
  }
  return ergebnis;
}
