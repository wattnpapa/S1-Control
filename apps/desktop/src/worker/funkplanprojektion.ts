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
 * F3: Der Plan wird gegen die Uhr des Workers gerechnet (letzter Kontakt über
 * der Schwelle), und die Ansicht trägt die Funkproben als Zeitfolge aus dem
 * Ereignisstrom — die jüngsten {@link projektion.FUNKPROBEN_GRENZE}, mit
 * derselben Suche zugeschnitten. Die Folge läuft über alle Ereignisse der
 * Akte; das ist ein Durchgang ohne Faltung, wie beim Tagebuch.
 *
 * Und die Auswahl der Tabellenzellen mit `werteAus` (Gruppe FUNK der
 * Einheitentabelle): `projektion.auswahlwerte`, bei Rufgruppen mit der
 * Betriebsart für die Marke „DMO“.
 *
 * F4: die fünf Zahlen für `Lagebild.funk`. Das Lagebild wird in jedem Takt
 * gebaut, also einmal je Sekunde; „kein Kontakt über der Schwelle“ hängt an
 * der Uhr, aber eine Minute Auflösung genügt dafür. Gemerkt wird deshalb wie
 * bei der Versorgung das letzte Ergebnis je Zustand und Minute.
 */

import { projektion, type EingehendesEreignis, type Funkplan, type Funkprobenzeile, type Funkteilnehmer, type Zustand } from "@s1/domaene";

import type { Funklage, Funkplanansicht, Funkplanbereich, Ruf, Zustandswahl } from "../kontrakt/index.js";

const MINUTE_MS = 60_000;

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

/** Die Funkproben, auf die Treffer der Suche zugeschnitten (Einheit, Rufgruppe, Grund, Akteur). */
export function funkprobenGefiltert(folge: readonly Funkprobenzeile[], suche: string | undefined): readonly Funkprobenzeile[] {
  const nadel = (suche ?? "").trim().toLocaleLowerCase("de-DE");
  if (nadel === "") return folge;
  return folge.filter((z) => passt(nadel, z.einheit, z.rufgruppe, z.grund, z.akteur));
}

/** Die geltenden Bereiche ohne Systemabschnitte, in der Ordnung des Baums. */
export function funkplanbereiche(zustand: Zustand): readonly Funkplanbereich[] {
  const baum = projektion.abschnittsbaum(zustand, { ohneAufgeloeste: true, ohneArchiv: true });
  return projektion
    .baumZeilen(baum)
    .filter((k) => !k.systemAbschnitt)
    .map((k) => ({ abschnittId: k.id, name: k.name, tiefe: k.tiefe }));
}

/** Was der Worker neben dem Zustand mitgibt: Zeigerstand, Uhr und die Ereignisse der Akte. */
export interface Funkplanumfeld {
  readonly lageZeiger: number;
  readonly jetztMs: number;
  readonly ereignisse: readonly EingehendesEreignis[];
}

/** Das Blatt „Funkplan" für den Ruf `funkplanAnfordern`. */
export function funkplanansicht(
  zustand: Zustand,
  ruf: Extract<Ruf, { art: "funkplanAnfordern" }>,
  umfeld: Funkplanumfeld,
): Funkplanansicht {
  const jetzt = new Date(umfeld.jetztMs).toISOString();
  return {
    lageZeiger: umfeld.lageZeiger,
    plan: funkplanGefiltert(projektion.funkplan(zustand, jetzt), ruf.suche),
    bereiche: funkplanbereiche(zustand),
    jetzt,
    funkproben: funkprobenGefiltert(projektion.funkprobenfolge(zustand, umfeld.ereignisse), ruf.suche),
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

let gemerkt: { zustand: Zustand; minute: number; zahlen: Funklage } | undefined;

/** Die Zahlen fürs Lagebild; gleicher Zustand in derselben Minute rechnet nicht neu. */
export function funkFuerLagebild(zustand: Zustand, jetztMs: number): Funklage {
  const minute = Math.floor(jetztMs / MINUTE_MS);
  if (gemerkt !== undefined && gemerkt.zustand === zustand && gemerkt.minute === minute) return gemerkt.zahlen;
  const z = projektion.funkplan(zustand, new Date(minute * MINUTE_MS).toISOString()).zahlen;
  const zahlen: Funklage = {
    rufgruppen: z.rufgruppen,
    zugeordnet: z.zugeordnet,
    ohneRufgruppe: z.ohneRufgruppe,
    ohneKontakt: z.ohneKontakt,
    ...(z.letzteFunkprobe === undefined ? {} : { letzteFunkprobe: z.letzteFunkprobe }),
  };
  gemerkt = { zustand, minute, zahlen };
  return zahlen;
}
