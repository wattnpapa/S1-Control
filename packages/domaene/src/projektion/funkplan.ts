/**
 * Der Funkplan (KONZEPT-FUNKPLAN.md §3, §5 und §7): welche Einheit über
 * welche Rufgruppe erreichbar ist, wer dort abhört und wer noch ohne steht.
 *
 * **Wer im Plan steht.** Jede Einheit, die nach der einen Zählregel
 * (`kennzahlen.zaehlklasse`) zählt oder erwartet wird. Entfernte,
 * aufgegangene und beendete Einheiten (Archiv, Rückmarsch) fallen heraus;
 * ruhende und angeforderte bleiben, denn auch sie müssen erreichbar sein.
 *
 * **Ohne Rufgruppe** ist, wer keine Hauptrufgruppe trägt oder deren Gruppe
 * aufgelöst oder (noch) unbekannt ist. Das Auflösen setzt nichts um; die
 * Einheiten zählen ab der Auflösung als ohne Rufgruppe, bis jemand sie
 * umsetzt (§3). Eine aufgelöste Gruppe bleibt in der Liste, ohne Teilnehmer.
 *
 * **„Bereich ≠ Gruppe"** steht, wenn eine geltende Gruppe einen Bereich trägt
 * und der wirksame Bereich der Einheit weder dieser noch einer seiner
 * Unterabschnitte ist (Entscheidung 3). Ein Hinweis, keine Automatik.
 */

import { anzeigename, erreichbarkeit, funkrufnameDerEinheit, zaehlklasse } from "../kennzahlen.js";
import type { Id } from "../werte.js";
import type { EinheitZustand, RufgruppeZustand, Zustand } from "../zustand.js";
import { abschnittsbaum, baumZeilen } from "./baum.js";
import { rufgruppeGilt, rufgruppenAnzeige, rufgruppenListe } from "./rufgruppen.js";

/** Der Text der Spalte „Hinweis", solange es keinen Funkhinweis gibt (F2). */
export const HINWEIS_BEREICH_ABWEICHEND = "Bereich ≠ Gruppe";

export interface Funkteilnehmer {
  readonly einheitId: Id;
  readonly einheit: string;
  readonly abschnittId: Id;
  readonly bereich: string;
  /** Der Statusschlüssel; das Wort liefert `statusTitel`. */
  readonly status: string;
  /** K31; leer, wenn weder Override noch ein Fahrzeug mit Funkrufnamen. */
  readonly funkrufname: string;
  /** K9. */
  readonly erreichbarkeit: string;
  /** Noch nicht vor Ort (angefordert, Anmarsch, Eingang). */
  readonly erwartet: boolean;
  /** Die gesetzte Hauptrufgruppe, auch eine aufgelöste oder unbekannte. */
  readonly rufgruppeId?: Id;
  readonly rufgruppe?: string;
  /** Die gesetzte Gruppe ist aufgelöst — die Einheit steht deshalb ohne. */
  readonly rufgruppeAufgeloest: boolean;
  readonly bereichWeichtAb: boolean;
  /** Was in der Spalte „Hinweis" steht; in F1 nur „Bereich ≠ Gruppe". */
  readonly hinweis: string;
}

export interface Rufgruppenkarte {
  readonly rufgruppeId: Id;
  readonly betriebsart: string;
  readonly name: string;
  readonly zweck?: string;
  readonly hoert?: string;
  readonly gateway?: string;
  readonly bemerkung?: string;
  readonly abschnittId?: Id;
  readonly bereich?: string;
  readonly aufgeloest: boolean;
  /** Wann aufgelöst wurde (Wanduhr des Ereignisses). */
  readonly aufgeloestAm?: string;
  readonly teilnehmer: readonly Funkteilnehmer[];
}

export interface Funkbereich {
  readonly abschnittId: Id;
  readonly name: string;
  readonly teilnehmer: readonly Funkteilnehmer[];
}

export interface Funkzahlen {
  /** Geltende Rufgruppen. */
  readonly rufgruppen: number;
  readonly zugeordnet: number;
  readonly ohneRufgruppe: number;
  /** Geltende Gruppen im Direktbetrieb oder über einen Gateway. */
  readonly dmoOderGateway: number;
}

export interface Funkplan {
  /** Geltende nach Reihenfolge, aufgelöste am Ende (`rufgruppenListe`). */
  readonly rufgruppen: readonly Rufgruppenkarte[];
  readonly ohneRufgruppe: readonly Funkteilnehmer[];
  /** Dieselben Zeilen nach wirksamem Bereich, in der Ordnung des Abschnittsbaums. */
  readonly jeBereich: readonly Funkbereich[];
  readonly zahlen: Funkzahlen;
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function bereichsname(zustand: Zustand, id: Id): string {
  return text(zustand.abschnitte[id]?.name.wert) ?? id;
}

/** `true`, wenn `abschnittId` der Bereich `ziel` oder einer seiner Unterabschnitte ist. */
function liegtIn(zustand: Zustand, abschnittId: Id, ziel: Id): boolean {
  const gesehen = new Set<Id>();
  let laufend: Id | undefined = abschnittId;
  while (laufend !== undefined && !gesehen.has(laufend)) {
    if (laufend === ziel) return true;
    gesehen.add(laufend);
    laufend = zustand.abschnitte[laufend]?.wirksamerParentId;
  }
  return false;
}

function teilnehmer(zustand: Zustand, einheit: EinheitZustand, erwartet: boolean): Funkteilnehmer {
  const id = text(einheit.rufgruppeId?.wert);
  const gruppe = id === undefined ? undefined : zustand.rufgruppen?.[id];
  const bezug = rufgruppeGilt(gruppe) ? text(gruppe.abschnittId?.wert) : undefined;
  const weichtAb = bezug !== undefined && !liegtIn(zustand, einheit.wirksamerAbschnittId, bezug);
  return {
    einheitId: einheit.id,
    einheit: anzeigename(einheit),
    abschnittId: einheit.wirksamerAbschnittId,
    bereich: bereichsname(zustand, einheit.wirksamerAbschnittId),
    status: text(einheit.status.wert) ?? "",
    funkrufname: funkrufnameDerEinheit(zustand, einheit),
    erreichbarkeit: erreichbarkeit(einheit),
    erwartet,
    ...(id === undefined ? {} : { rufgruppeId: id, rufgruppe: gruppe === undefined ? id : rufgruppenAnzeige(gruppe) }),
    rufgruppeAufgeloest: gruppe !== undefined && !rufgruppeGilt(gruppe),
    bereichWeichtAb: weichtAb,
    hinweis: weichtAb ? HINWEIS_BEREICH_ABWEICHEND : "",
  };
}

/** Die Einheiten des Plans in der Ordnung der Einheitentabelle: Bereich im Baum, Reihenfolge, Name. */
function teilnehmerDerLage(zustand: Zustand, bereichsrang: ReadonlyMap<Id, number>): Funkteilnehmer[] {
  const rang = (e: EinheitZustand): number => bereichsrang.get(e.wirksamerAbschnittId) ?? Number.MAX_SAFE_INTEGER;
  const reihe = (e: EinheitZustand): number => (typeof e.reihenfolge.wert === "number" ? e.reihenfolge.wert : 0);
  return Object.values(zustand.einheiten)
    .map((einheit) => ({ einheit, klasse: zaehlklasse(zustand, einheit) }))
    .filter(({ klasse }) => klasse === "ist" || klasse === "erwartet")
    .sort((a, b) => rang(a.einheit) - rang(b.einheit) || reihe(a.einheit) - reihe(b.einheit) || anzeigename(a.einheit).localeCompare(anzeigename(b.einheit), "de"))
    .map(({ einheit, klasse }) => teilnehmer(zustand, einheit, klasse === "erwartet"));
}

function karte(zustand: Zustand, r: RufgruppeZustand, alle: readonly Funkteilnehmer[]): Rufgruppenkarte {
  const gilt = r.aufgeloest?.wert !== true;
  const abschnittId = text(r.abschnittId?.wert);
  const optional = { zweck: text(r.zweck?.wert), hoert: text(r.hoert?.wert), gateway: text(r.gateway?.wert), bemerkung: text(r.bemerkung?.wert) };
  return {
    rufgruppeId: r.id,
    betriebsart: text(r.betriebsart.wert) ?? "",
    name: rufgruppenAnzeige(r),
    ...Object.fromEntries(Object.entries(optional).filter(([, wert]) => wert !== undefined)),
    ...(abschnittId === undefined ? {} : { abschnittId, bereich: bereichsname(zustand, abschnittId) }),
    aufgeloest: !gilt,
    ...(!gilt && r.aufgeloest?.wanduhr !== undefined ? { aufgeloestAm: r.aufgeloest.wanduhr } : {}),
    teilnehmer: gilt ? alle.filter((t) => t.rufgruppeId === r.id) : [],
  };
}

function jeBereich(alle: readonly Funkteilnehmer[]): Funkbereich[] {
  const bereiche = new Map<Id, Funkbereich & { teilnehmer: Funkteilnehmer[] }>();
  for (const t of alle) {
    const bereich = bereiche.get(t.abschnittId) ?? { abschnittId: t.abschnittId, name: t.bereich, teilnehmer: [] };
    bereich.teilnehmer.push(t);
    bereiche.set(t.abschnittId, bereich);
  }
  return [...bereiche.values()];
}

/** Der Funkplan des Einsatzes: Zuordnung je Rufgruppe und je Bereich, ohne Rufgruppe, Zahlen. */
export function funkplan(zustand: Zustand): Funkplan {
  const bereichsrang = new Map(baumZeilen(abschnittsbaum(zustand)).map((knoten, stelle) => [knoten.id, stelle]));
  const alle = teilnehmerDerLage(zustand, bereichsrang);
  const rufgruppen = rufgruppenListe(zustand).map((r) => karte(zustand, r, alle));
  const geltend = rufgruppen.filter((r) => !r.aufgeloest);
  const zugeordnet = new Set(geltend.flatMap((r) => r.teilnehmer.map((t) => t.einheitId)));
  const ohneRufgruppe = alle.filter((t) => !zugeordnet.has(t.einheitId));
  return {
    rufgruppen,
    ohneRufgruppe,
    jeBereich: jeBereich(alle),
    zahlen: {
      rufgruppen: geltend.length,
      zugeordnet: zugeordnet.size,
      ohneRufgruppe: ohneRufgruppe.length,
      dmoOderGateway: geltend.filter((r) => r.betriebsart === "DMO" || r.gateway !== undefined).length,
    },
  };
}
