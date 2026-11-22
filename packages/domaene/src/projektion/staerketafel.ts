/**
 * Die Stärketafeln des Sachgebiets 1 für den Monitor: Ist-Stärke je
 * Abschnitt und je Organisation, Fü / UFü / He = Gesamt.
 *
 * **Eine Zählregel (`kennzahlen.zaehlklasse`).** Die Zeilen zählen nur
 * Kräfte vor Ort, die Gesamtzeile ist dieselbe Zahl wie im Kopfband. Was
 * noch nicht da ist (angefordert, Anmarsch, Rufbereitschaft, Eingang), steht
 * je Zeile als „erwartet" daneben und nie in der Summe.
 *
 * Die Abschnitte folgen dem Abschnittsbaum mit seiner Tiefe; jede Zeile
 * trägt die **eigene** Stärke des Abschnitts, damit die Zeilen zusammen die
 * Gesamtzeile ergeben. Ein Abschnitt ohne Kräfte bleibt stehen, solange
 * darunter einer mit Kräften hängt — sonst fehlte der Zusammenhang.
 * Die Bereiche „Angefordert / Anmarsch" und der Eingang sind keine Zeilen,
 * sondern eine getrennte Zeile `anmarsch` mit ihren erwarteten Kräften —
 * wie Zeile 38 des Logistikblatts. „Einsatz beendet" fehlt.
 *
 * Die Organisationen laufen in der Reihenfolge des Katalogs
 * (`ORGANISATIONEN`), unbekannte Werte (§3.7) danach in Schlüsselordnung.
 */

import { organisationTitel } from "../beschriftungen.js";
import { ORGANISATIONEN } from "../ereignis.js";
import { ANGEFORDERT, zaehlklasse, zaehlstand } from "../kennzahlen.js";
import { STAERKE_NULL, staerkePlus, type Staerke } from "../werte.js";
import { EINGANG_ABSCHNITT_ID, type Zustand } from "../zustand.js";
import { abschnittsbaum, type Baumknoten } from "./baum.js";
import { statustafel, type Statustafel } from "./einsatzstatus.js";
import { kommenUndGehen, type Bewegung } from "./kommengehen.js";
import { laufendeAuftraege, type Auftragszeile } from "./auftragslage.js";
import { kreuzzellen, organisationsschluessel } from "./staerkematrix.js";

export interface Staerketafelzeile {
  /** Abschnitts-Id oder Organisationsschlüssel; `GESAMT` und `ANMARSCH` für die Sonderzeilen. */
  readonly schluessel: string;
  readonly name: string;
  /** Tiefe im Abschnittsbaum; bei Organisationen und Sonderzeilen 0. */
  readonly tiefe: number;
  /** Ist-Stärke je Rolle — in der Zeile `anmarsch` die erwartete. */
  readonly staerke: Staerke;
  /** Köpfe von {@link staerke}. */
  readonly gesamt: number;
  /** Erwartete Köpfe dieser Zeile, nicht in {@link gesamt}. */
  readonly erwartet: number;
}

export interface Staerketafel {
  readonly abschnitte: readonly Staerketafelzeile[];
  /** Kräfte in „Angefordert / Anmarsch" und im Eingang — getrennt, nie in der Gesamtzeile. */
  readonly anmarsch: Staerketafelzeile;
  readonly organisationen: readonly Staerketafelzeile[];
  /** Ist-Stärke des Einsatzes (Kopfband) und alle erwarteten Köpfe. */
  readonly gesamt: Staerketafelzeile;
  /**
   * Abschnitt × Organisation: Ist-Köpfe je Zelle, Schlüssel wie in
   * {@link abschnitte} und {@link organisationen}. Fehlt ein Paar, ist es 0.
   */
  readonly kreuz: Readonly<Record<string, Readonly<Record<string, number>>>>;
  /** Additiv: Einsatzwert je Organisation und Abschnitt (Monitor „Status", „Einsatzmittel"). */
  readonly status?: Statustafel;
  /** Additiv: Anforderungen, Anmarsch und „verfügbar bis" in Zeitfolge (Monitor „Kommen und Gehen"). */
  readonly kommenGehen?: readonly Bewegung[];
  /** Additiv: laufende Aufträge, älteste zuerst (Monitor „Aufträge"). */
  readonly auftraege?: readonly Auftragszeile[];
}

/** Der Name einer Einheit ohne Organisation. */
export const OHNE_ORGANISATION = "ohne Angabe";

function koepfe(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

function zeile(schluessel: string, name: string, staerke: Staerke, erwartet: number, tiefe = 0): Staerketafelzeile {
  return { schluessel, name, tiefe, staerke, gesamt: koepfe(staerke), erwartet };
}

function istWarteschlange(knoten: Baumknoten): boolean {
  return knoten.typ === ANGEFORDERT || knoten.typ === "EINGANG" || knoten.id === EINGANG_ABSCHNITT_ID;
}

interface Abschnittsstand {
  anmarsch: Staerke;
}

/** Liefert die Zeilen eines Teilbaums; leere Zweige fallen weg. */
function zeilenDes(zustand: Zustand, knoten: Baumknoten, stand: Abschnittsstand): Staerketafelzeile[] {
  if (istWarteschlange(knoten)) {
    const einheiten = Object.values(zustand.einheiten).filter((e) => e.wirksamerAbschnittId === knoten.id);
    const z = zaehlstand(zustand, einheiten);
    stand.anmarsch = staerkePlus(stand.anmarsch, staerkePlus(z.erwartet, z.ist));
    return knoten.kinder.flatMap((kind) => zeilenDes(zustand, kind, stand));
  }
  const unten = knoten.kinder.flatMap((kind) => zeilenDes(zustand, kind, stand));
  const eigene = zeile(knoten.id, knoten.name, knoten.eigeneStaerke, knoten.erwartet, knoten.tiefe);
  if (unten.length === 0 && eigene.gesamt === 0 && eigene.erwartet === 0) return [];
  return [eigene, ...unten];
}

function rang(schluessel: string): number {
  const stelle = (ORGANISATIONEN as readonly string[]).indexOf(schluessel);
  if (schluessel === "") return ORGANISATIONEN.length + 1;
  return stelle === -1 ? ORGANISATIONEN.length : stelle;
}

/** Ist und erwartet je Organisation; „beendet" und entfernte Einheiten zählen nicht. */
export function organisationszeilen(zustand: Zustand): Staerketafelzeile[] {
  const ist = new Map<string, Staerke>();
  const erwartet = new Map<string, number>();
  for (const einheit of Object.values(zustand.einheiten)) {
    const klasse = zaehlklasse(zustand, einheit);
    if (klasse !== "ist" && klasse !== "erwartet") continue;
    const k = organisationsschluessel(einheit);
    if (!ist.has(k)) {
      ist.set(k, STAERKE_NULL);
      erwartet.set(k, 0);
    }
    if (klasse === "ist") ist.set(k, staerkePlus(ist.get(k) ?? STAERKE_NULL, einheit.wirksameStaerke));
    else erwartet.set(k, (erwartet.get(k) ?? 0) + koepfe(einheit.wirksameStaerke));
  }
  return [...ist.keys()]
    .sort((a, b) => rang(a) - rang(b) || a.localeCompare(b))
    .map((k) => zeile(k, k === "" ? OHNE_ORGANISATION : organisationTitel(k), ist.get(k) ?? STAERKE_NULL, erwartet.get(k) ?? 0))
    .filter((z) => z.gesamt > 0 || z.erwartet > 0);
}

export function staerketafel(zustand: Zustand): Staerketafel {
  const stand: Abschnittsstand = { anmarsch: STAERKE_NULL };
  const baum = abschnittsbaum(zustand, { ohneArchiv: true, ohneAufgeloeste: true });
  const abschnitte = baum.flatMap((knoten) => zeilenDes(zustand, knoten, stand));
  const gesamt = zaehlstand(zustand);
  return {
    abschnitte,
    anmarsch: zeile("ANMARSCH", "Angefordert / Anmarsch", stand.anmarsch, 0),
    organisationen: organisationszeilen(zustand),
    gesamt: zeile("GESAMT", "Gesamt", gesamt.ist, koepfe(gesamt.erwartet)),
    kreuz: kreuzzellen(zustand),
    status: statustafel(zustand),
    kommenGehen: kommenUndGehen(zustand),
    auftraege: laufendeAuftraege(zustand),
  };
}
