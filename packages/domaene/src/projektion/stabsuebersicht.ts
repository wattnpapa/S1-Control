/**
 * Die Stabsübersicht: Kräfte nach Status je Abschnitt und alle Aufträge.
 *
 * Gefordert im Stab-Review (docs/audits/stab): LtrStab A1, LtrFüSt F1,
 * S1 FA-S1-1, S3 FA-S3-1 und FA-S3-3, Fachberater FW FW-A3. Die Daten gab es
 * schon, aber verteilt: Köpfe nach Status nur im Ausdruck „Status“, Aufträge
 * nur je markierter Einheit. Hier stehen sie auf einer Seite.
 *
 * **Teilbaum statt eigener Stärke.** Anders als die Stärketafel zählt jede
 * Zeile ihren ganzen Teilbaum, wie der Abschnittsbaum im Blatt S1. Wer im
 * Lagevortrag „Stärke EA 2“ abliest, soll die Unterabschnitte mitbekommen
 * (Stab-Review LtrStab, LS-1). Die Gesamtzeile ist dieselbe Zahl wie im
 * Kopfband (`zaehlklasse`).
 *
 * **Eine Statusregel.** Spalten und Zählung je Abschnitt kommen aus
 * `statustafel` (einsatzstatus.ts), die auch die Monitoransichten „Status“
 * und „Einsatzmittel“ speist. Hier kommen nur der Teilbaum und die
 * Erwarteten dazu.
 */

import { statusTitel } from "../beschriftungen.js";
import { ANGEFORDERT, zaehlklasse } from "../kennzahlen.js";
import type { Id } from "../werte.js";
import { EINGANG_ABSCHNITT_ID, type EinheitZustand, type Zustand } from "../zustand.js";
import { abschnittsbaum, type Baumknoten } from "./baum.js";
import { STATUSSPALTEN, statustafel, type Statusspalte } from "./einsatzstatus.js";

/** Die Spalten der Kräfteübersicht — die der Statustafel; „erwartet“ zählt nicht in „gesamt“. */
export const KRAEFTESPALTEN = STATUSSPALTEN;
export type Kraeftespalte = Statusspalte;

export function kraeftespaltenTitel(spalte: Kraeftespalte): string {
  return spalte === "SONSTIGE" ? "sonstige" : statusTitel(spalte);
}

export interface Kraeftezeile {
  readonly abschnittId: Id;
  readonly name: string;
  readonly tiefe: number;
  /** Ist-Köpfe des Teilbaums je Statusspalte. */
  readonly je: Readonly<Record<Kraeftespalte, number>>;
  /** Summe von {@link je}. */
  readonly gesamt: number;
  /** Erwartete Köpfe des Teilbaums (angefordert, Anmarsch, Rufbereitschaft …). */
  readonly erwartet: number;
}

export interface Auftragsuebersichtzeile {
  readonly auftragId: Id;
  readonly text: string;
  readonly einheitId?: Id;
  readonly einheit: string;
  readonly abschnitt: string;
  readonly von?: string;
  readonly bis?: string;
  readonly offen: boolean;
}

export interface Stabsuebersicht {
  readonly kraefte: readonly Kraeftezeile[];
  /** Kräfte in „Angefordert / Anmarsch“ und im Eingang — nur erwartet. */
  readonly anmarsch: number;
  readonly gesamt: Kraeftezeile;
  /** Offene Aufträge zuerst (ältester Beginn oben), dann erledigte (jüngstes Ende oben). */
  readonly auftraege: readonly Auftragsuebersichtzeile[];
}

type Zaehler = Record<Kraeftespalte, number>;

function leer(): Zaehler {
  return { IM_EINSATZ: 0, EINSATZBEREIT: 0, RUHE: 0, NICHT_EINSATZBEREIT: 0, SONSTIGE: 0 };
}

function koepfe(einheit: EinheitZustand): number {
  const s = einheit.wirksameStaerke;
  return s.fuehrer + s.unterfuehrer + s.mannschaft;
}

function istWarteschlange(knoten: Baumknoten): boolean {
  return knoten.typ === ANGEFORDERT || knoten.typ === "EINGANG" || knoten.id === EINGANG_ABSCHNITT_ID;
}

interface Eigenstand {
  readonly je: Zaehler;
  erwartet: number;
}

function standDes(staende: Map<Id, Eigenstand>, abschnittId: Id): Eigenstand {
  let stand = staende.get(abschnittId);
  if (stand === undefined) {
    stand = { je: leer(), erwartet: 0 };
    staende.set(abschnittId, stand);
  }
  return stand;
}

/** Ist (aus der Statustafel) und erwartet je Abschnitt, nur die unmittelbar dort stehenden Einheiten. */
function eigenstaende(zustand: Zustand): Map<Id, Eigenstand> {
  const staende = new Map<Id, Eigenstand>();
  for (const [abschnittId, zeile] of Object.entries(statustafel(zustand).jeAbschnitt)) {
    const stand = standDes(staende, abschnittId);
    for (const spalte of KRAEFTESPALTEN) stand.je[spalte] += zeile[spalte].koepfe;
  }
  for (const einheit of Object.values(zustand.einheiten)) {
    if (zaehlklasse(zustand, einheit) === "erwartet") standDes(staende, einheit.wirksamerAbschnittId).erwartet += koepfe(einheit);
  }
  return staende;
}

function zeileAus(knoten: Baumknoten, je: Zaehler, erwartet: number): Kraeftezeile {
  const gesamt = KRAEFTESPALTEN.reduce((summe, spalte) => summe + je[spalte], 0);
  return { abschnittId: knoten.id, name: knoten.name, tiefe: knoten.tiefe, je, gesamt, erwartet };
}

interface Sammlung {
  readonly zeilen: Kraeftezeile[];
  anmarsch: number;
}

/** Liefert den Teilbaumstand und hängt die Zeilen in Baumordnung an; leere Zweige fallen weg. */
function sammle(knoten: Baumknoten, staende: Map<Id, Eigenstand>, sammlung: Sammlung): Eigenstand {
  const eigen = staende.get(knoten.id) ?? { je: leer(), erwartet: 0 };
  if (istWarteschlange(knoten)) {
    sammlung.anmarsch += eigen.erwartet + KRAEFTESPALTEN.reduce((s, sp) => s + eigen.je[sp], 0);
    for (const kind of knoten.kinder) sammle(kind, staende, sammlung);
    return { je: leer(), erwartet: 0 };
  }
  const platz = sammlung.zeilen.length;
  const summe: Eigenstand = { je: { ...eigen.je }, erwartet: eigen.erwartet };
  for (const kind of knoten.kinder) {
    const unten = sammle(kind, staende, sammlung);
    for (const spalte of KRAEFTESPALTEN) summe.je[spalte] += unten.je[spalte];
    summe.erwartet += unten.erwartet;
  }
  const zeile = zeileAus(knoten, summe.je, summe.erwartet);
  if (zeile.gesamt > 0 || zeile.erwartet > 0) sammlung.zeilen.splice(platz, 0, zeile);
  return summe;
}

function kraefte(zustand: Zustand): Pick<Stabsuebersicht, "kraefte" | "anmarsch" | "gesamt"> {
  const staende = eigenstaende(zustand);
  const sammlung: Sammlung = { zeilen: [], anmarsch: 0 };
  const gesamt: Eigenstand = { je: leer(), erwartet: 0 };
  for (const wurzel of abschnittsbaum(zustand, { ohneAufgeloeste: true })) {
    if (wurzel.typ === "ARCHIV") continue;
    const unten = sammle(wurzel, staende, sammlung);
    for (const spalte of KRAEFTESPALTEN) gesamt.je[spalte] += unten.je[spalte];
    gesamt.erwartet += unten.erwartet;
  }
  const gesamtzeile = zeileAus({ id: "GESAMT", name: "Gesamt", tiefe: 0 } as Baumknoten, gesamt.je, gesamt.erwartet + sammlung.anmarsch);
  return { kraefte: sammlung.zeilen, anmarsch: sammlung.anmarsch, gesamt: gesamtzeile };
}

function text(wert: unknown): string | undefined {
  return typeof wert === "string" && wert !== "" ? wert : undefined;
}

function abschnittsname(zustand: Zustand, abschnittId: unknown): string {
  return typeof abschnittId === "string" ? (text(zustand.abschnitte[abschnittId]?.name.wert) ?? "") : "";
}

function auftragszeilen(zustand: Zustand): Auftragsuebersichtzeile[] {
  const zeilen: Auftragsuebersichtzeile[] = [];
  for (const auftrag of Object.values(zustand.auftraege)) {
    if (auftrag.zurueckgenommen?.wert === true) continue;
    const einheitId = text(auftrag.einheitId?.wert);
    const einheit = einheitId === undefined ? undefined : zustand.einheiten[einheitId];
    const von = text(auftrag.von?.wert);
    const bis = text(auftrag.bis?.wert);
    zeilen.push({
      auftragId: auftrag.id,
      text: text(auftrag.text.wert) ?? "",
      ...(einheitId === undefined ? {} : { einheitId }),
      einheit: text(einheit?.bezeichnung.wert) ?? "",
      abschnitt: abschnittsname(zustand, auftrag.abschnittId?.wert ?? einheit?.wirksamerAbschnittId),
      ...(von === undefined ? {} : { von }),
      ...(bis === undefined ? {} : { bis }),
      offen: bis === undefined,
    });
  }
  return zeilen.sort(vergleicheAuftraege);
}

/** Offene vor erledigten; offene nach Beginn aufsteigend, erledigte nach Ende absteigend. */
export function vergleicheAuftraege(a: Auftragsuebersichtzeile, b: Auftragsuebersichtzeile): number {
  if (a.offen !== b.offen) return a.offen ? -1 : 1;
  const unterschied = a.offen ? ms(a.von) - ms(b.von) : ms(b.bis) - ms(a.bis);
  return unterschied !== 0 ? unterschied : a.auftragId.localeCompare(b.auftragId);
}

/** Millisekunden eines Zeitpunkts; ohne Zeitpunkt ganz nach hinten (offen) bzw. vorn. Offsets wie „+01:00“ zählen. */
function ms(zeitpunkt: string | undefined): number {
  const wert = zeitpunkt === undefined ? Number.NaN : Date.parse(zeitpunkt);
  return Number.isNaN(wert) ? Number.MAX_SAFE_INTEGER : wert;
}

export function stabsuebersicht(zustand: Zustand): Stabsuebersicht {
  return { ...kraefte(zustand), auftraege: auftragszeilen(zustand) };
}
