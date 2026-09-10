/**
 * Die Zeilen des Blattes „Log" (M5.1).
 *
 * Vorbild ist `excel-domaenenmodell.md` §4.3: **eine Zeile je Bereich**, nicht
 * je Einheit. Die Logistik plant für einen Ort — wie viele Betten stehen im
 * Bereitstellungsraum, wie viele Essen gehen an den Einsatzort 3 —, und diese
 * Frage beantwortet die Einheitenliste nicht ohne Nachrechnen.
 *
 * **Warum in Ring 2 und nicht in der Ausgabe.** Die Zeile ist eine Rechnung
 * über den Zustand: Gesamtstärke je Schicht (K24), Logistikzahlen je Einheit
 * (K4 bis K6), aufsummiert über den Abschnitt. Stünde sie in `@s1/ausgaben`,
 * rechnete eine Ausgabe — und dann rechneten zwei Ausgaben dieselbe Größe
 * zweimal, sobald jemand die Zahlen auch auf dem Bildschirm sehen will.
 *
 * **Was hier nicht steht:** die Reihenfolge der Bereiche. Sie kommt aus dem
 * Abschnittsbaum (§5.3), nicht aus einer zweiten Liste — die Vorlage hat dort
 * feste Zeilennummern, weil sie keinen Baum kennt.
 */

import { ANGEFORDERT, matrixAbschnittSchicht, uebernachtung } from "../kennzahlen.js";
import * as kennzahlen from "../kennzahlen.js";
import { SCHICHTEN } from "../ereignis.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";

import { abschnittsbaum, baumZeilen } from "./baum.js";

/**
 * Die vier Schichtspalten D bis G — **in der Reihenfolge der Vorlage**.
 *
 * Sie ist eine andere als die von `SCHICHTEN` in `ereignis.ts`: Das Blatt
 * führt Früh, Spät, Tag, Nacht (§4.3), der Katalog Tag, Nacht, Früh, Spät.
 * Beide sind richtig für ihren Zweck; hier gilt die der Vorlage, weil dieses
 * Modul ihr Blatt nachbildet.
 */
export const LOG_SCHICHTEN = ["FRUEH", "SPAET", "TAG", "NACHT"] as const;

/** Eine Zeile des Blattes: ein Bereich mit allem, was die Logistik von ihm braucht. */
export interface Logistikzeile {
  readonly abschnittId: Id;
  readonly name: string;
  readonly typ: string;
  /** Spalten D bis G: Gesamtstärke je Schicht (K24). */
  readonly jeSchicht: { readonly [schicht: string]: number };
  /** Spalte H: die Gesamtstärke des Bereichs. */
  readonly gesamt: number;
  /** Spalte I: `H − J − K` (K5) — siehe {@link LOG_MAENNLICH}. */
  readonly maennlich: number;
  /** Spalte J. */
  readonly weiblich: number;
  /** Spalte K. */
  readonly divers: number;
  /** Spalte L. */
  readonly vegetarisch: number;
  /** Spalte M. */
  readonly vegan: number;
  /** Spalten N bis P: Übernachtungsbedarf nach m/w/d (K6). */
  readonly uebernachtung: { readonly m: number; readonly w: number; readonly d: number };
}

/**
 * Die Formel hinter Spalte I, als Text — sie steht im Ausdruck.
 *
 * **Warum sie überhaupt sichtbar wird.** Die Vorlage widerspricht sich hier:
 * Das Blatt „Status" rechnet `Männl. = Gesamt − Weibl.`, das Blatt „Log"
 * `I = H − J − K`, also zusätzlich ohne die diversen Kräfte
 * (`excel-domaenenmodell.md` §4.2 gegen §4.3). Beides kann nicht stimmen.
 * Gebaut ist die Lesart des Log-Blatts, weil dieses Blatt hier entsteht und
 * K5 sie seit M1.3 rechnet. Die Formel im Blatt zu nennen, kostet eine Zeile
 * und erspart der Führungsstelle die Frage, welche der beiden Zahlen sie
 * gerade ansieht.
 */
export const LOG_MAENNLICH = "männlich = Gesamt − weiblich − divers (K5)";

const LEER: Logistikzeile["uebernachtung"] = { m: 0, w: 0, d: 0 };

function nullzeile(abschnittId: Id, name: string, typ: string): Logistikzeile {
  return {
    abschnittId,
    name,
    typ,
    jeSchicht: Object.fromEntries(LOG_SCHICHTEN.map((s) => [s, 0])),
    gesamt: 0,
    maennlich: 0,
    weiblich: 0,
    divers: 0,
    vegetarisch: 0,
    vegan: 0,
    uebernachtung: LEER,
  };
}

/** Baut die Zeile eines Abschnitts aus den Einheiten, die unmittelbar in ihm stehen. */
export function logistikzeile(zustand: Zustand, abschnittId: Id): Logistikzeile {
  const abschnitt = zustand.abschnitte[abschnittId];
  const name = typeof abschnitt?.name.wert === "string" ? abschnitt.name.wert : abschnittId;
  const typ = typeof abschnitt?.typ.wert === "string" ? abschnitt.typ.wert : "EINSATZORT";
  const zeile = nullzeile(abschnittId, name, typ);

  const jeSchicht: Record<string, number> = { ...zeile.jeSchicht };
  const matrix = matrixAbschnittSchicht(zustand, abschnittId);
  for (const schicht of Object.keys(matrix)) {
    // §3.7: Ein unbekannter Schichtwert bekommt hier **keine** eigene Spalte —
    // das Blatt hat vier. Er fällt damit aus D bis G heraus, steht aber in
    // Spalte H, weil die Gesamtstärke ihn zählt. Genau so verhält sich die
    // Vorlage: Ihre SUMIFS treffen nur die vier Werte der Kopfzeile.
    if (schicht in jeSchicht) jeSchicht[schicht] = (matrix[schicht]?.gesamt ?? 0);
  }

  const einheiten = kennzahlen.einheitenImAbschnitt(zustand, abschnittId);
  let gesamt = 0;
  let weiblich = 0;
  let divers = 0;
  let vegetarisch = 0;
  let vegan = 0;
  let un = { ...LEER };
  for (const einheit of einheiten) {
    const zahlen = kennzahlen.logistik(zustand, einheit);
    const bedarf = uebernachtung(zustand, einheit);
    gesamt += kennzahlen.gesamtstaerke(einheit);
    weiblich += zahlen.weiblich;
    divers += zahlen.divers;
    vegetarisch += zahlen.vegetarisch;
    vegan += zahlen.vegan;
    un = { m: un.m + bedarf.m, w: un.w + bedarf.w, d: un.d + bedarf.d };
  }

  return {
    ...zeile,
    jeSchicht,
    gesamt,
    // K5 auf der Ebene des Bereichs: Die Summe der Reste ist der Rest der
    // Summen, solange keine Einheit mehr weibliche und diverse Kräfte meldet
    // als sie Köpfe hat. Tut sie es doch, wird die Zahl negativ — und das ist
    // die richtige Anzeige, nicht eine auf null gekappte.
    maennlich: gesamt - weiblich - divers,
    weiblich,
    divers,
    vegetarisch,
    vegan,
    uebernachtung: un,
  };
}

/** Das ganze Blatt: die Bereiche, die getrennte Zeile und die Gesamtzeile. */
export interface Logistikblatt {
  /** Die Bereiche in der Ordnung des Abschnittsbaums, ohne `ANGEFORDERT` und `ARCHIV`. */
  readonly zeilen: readonly Logistikzeile[];
  /** Zeile 35 der Vorlage: die Summe über {@link zeilen}. */
  readonly gesamt: Logistikzeile;
  /**
   * Zeile 38 der Vorlage: „Kräfte aus dem Bereich Angefordert / Anmarsch",
   * **getrennt** und nicht in der Gesamtzeile.
   */
  readonly angefordert: Logistikzeile;
}

function plus(links: Logistikzeile, rechts: Logistikzeile): Logistikzeile {
  const jeSchicht: Record<string, number> = {};
  for (const schicht of LOG_SCHICHTEN) {
    jeSchicht[schicht] = (links.jeSchicht[schicht] ?? 0) + (rechts.jeSchicht[schicht] ?? 0);
  }
  return {
    ...links,
    jeSchicht,
    gesamt: links.gesamt + rechts.gesamt,
    maennlich: links.maennlich + rechts.maennlich,
    weiblich: links.weiblich + rechts.weiblich,
    divers: links.divers + rechts.divers,
    vegetarisch: links.vegetarisch + rechts.vegetarisch,
    vegan: links.vegan + rechts.vegan,
    uebernachtung: {
      m: links.uebernachtung.m + rechts.uebernachtung.m,
      w: links.uebernachtung.w + rechts.uebernachtung.w,
      d: links.uebernachtung.d + rechts.uebernachtung.d,
    },
  };
}

export interface Logistikoptionen {
  /**
   * Zeilen ohne Kräfte mitführen; ohne Angabe fallen sie heraus.
   *
   * Die Vorlage blendet sie beim Blattwechsel per Makro aus (`t_log`), also
   * ist das Ausblenden die Vorgabe und nicht die Ausnahme. Ein leerer Bereich
   * auf einem Logistikblatt ist eine Zeile, die jemand liest und dann
   * überspringt.
   */
  readonly mitLeeren?: boolean;
}

export function logistikblatt(zustand: Zustand, optionen: Logistikoptionen = {}): Logistikblatt {
  const zeilen: Logistikzeile[] = [];
  let angefordert = nullzeile(ANGEFORDERT, "Angefordert / Anmarsch", ANGEFORDERT);

  for (const knoten of baumZeilen(abschnittsbaum(zustand))) {
    const zeile = logistikzeile(zustand, knoten.id);
    if (zeile.typ === ANGEFORDERT) {
      // Alle angeforderten Bereiche fallen in die **eine** getrennte Zeile:
      // Die Vorlage kennt genau einen solchen Bereich, das Zielmodell lässt
      // mehrere zu (ZDM §2.4), und zwei getrennte Zeilen wären ein Blatt, das
      // die Vorlage nicht hat.
      angefordert = { ...plus(angefordert, zeile), abschnittId: ANGEFORDERT, name: "Angefordert / Anmarsch", typ: ANGEFORDERT };
      continue;
    }
    if (zeile.typ === "ARCHIV") continue;
    if (optionen.mitLeeren !== true && zeile.gesamt === 0) continue;
    zeilen.push(zeile);
  }

  const gesamt = zeilen.reduce(plus, nullzeile("GESAMT", "Gesamt", "GESAMT"));
  return { zeilen, gesamt: { ...gesamt, abschnittId: "GESAMT", name: "Gesamt", typ: "GESAMT" }, angefordert };
}

/** Die Schichtwerte, die der Katalog kennt — für Prüfungen gegen {@link LOG_SCHICHTEN}. */
export const KATALOG_SCHICHTEN = SCHICHTEN;
