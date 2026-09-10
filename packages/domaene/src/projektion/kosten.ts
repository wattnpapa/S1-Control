/**
 * Die Zeilen der Kostenübersicht (M5.2).
 *
 * Vorbild sind die Spalten AN bis AW des Blattes „Stärke"
 * (`excel-domaenenmodell.md` §2): PSA-Bedarf, PSA-Kosten je Tag, VDA und
 * Unterkunft je Tag, Personentage, Gesamtkosten — alles **je Einheit**, weil
 * die Zahl der PSA-Sätze je Einheit verschieden ist.
 *
 * **Was hier nicht nachgebaut wird.** Die Vorlage hat zehn Spalten, von denen
 * neun Formeln sind und sechs davon nur einen Kopfwert nach unten
 * durchreichen (`AQ = $AQ$3`, `AS = $AS$3`, `AT = $AT$3`). Sie Zelle für
 * Zelle nachzubilden hieße, denselben Parameter in jeder Zeile ein weiteres
 * Mal zu führen. Hier stehen die vier Parameter **einmal** am Blatt und die
 * vier gerechneten Größen je Zeile — K13 bis K16, die seit M1.3 in Ring 2
 * stehen. Eine Ausgabe rechnet nichts nach.
 *
 * **Warum die Parameter zum Einsatz gehören und nicht in den Code.** Sie
 * stehen in der Anlage `EinsatzAngelegt.kosten` und sind über
 * `KostenParameterGeaendert` änderbar (§5.2). Wären sie Konstanten, hätte der
 * Zustand einen Anfangswert ohne Ereignisquelle, und der `vorher`-Wert der
 * ersten Änderung passte auf nichts (§2.2a).
 */

import * as kennzahlen from "../kennzahlen.js";
import type { Id } from "../werte.js";
import type { Zustand } from "../zustand.js";

import { abschnittsbaum, baumZeilen } from "./baum.js";

/** Die vier Parameter des Einsatzes, wie sie über dem Blatt stehen. */
export interface Kostenparameter {
  readonly psaKostenProSatz: number;
  readonly vdaProTag: number;
  readonly ukVerpflegungProTag: number;
  readonly geplanteEinsatztage: number;
}

/** Eine Zeile: eine Einheit mit ihren vier Kostenzahlen. */
export interface Kostenzeile {
  readonly einheitId: Id;
  readonly abschnittId: Id;
  readonly abschnittName: string;
  readonly bezeichnung: string;
  readonly organisation: string;
  /** Spalte AN: der PSA-Bedarf ist die Gesamtstärke. */
  readonly koepfe: number;
  /** Spalte AO: die einzige Eingabespalte der Gruppe. */
  readonly psaSaetzeProTag: number;
  /** **K13** — Spalte AR. */
  readonly psaProTag: number;
  /** **K14** — Spalte AU. */
  readonly vdaUkProTag: number;
  /** **K15** — Spalte AV: Einsatztage × Köpfe, also Personentage. */
  readonly personentage: number;
  /** **K16** — Spalte AW. */
  readonly gesamt: number;
}

export interface Kostenblatt {
  readonly parameter: Kostenparameter;
  readonly zeilen: readonly Kostenzeile[];
  readonly summe: {
    readonly koepfe: number;
    readonly psaProTag: number;
    readonly vdaUkProTag: number;
    readonly personentage: number;
    readonly gesamt: number;
  };
  /**
   * Einheiten, die aus der Rechnung fallen, weil ihr Abschnitt nicht zählt
   * (`ANGEFORDERT`, `ARCHIV`; ZDM §2.4). Die Zahl steht im Blatt: Eine
   * Kostensumme, die stillschweigend weniger Kräfte zählt als das Lagebild,
   * ist eine Zahl, der später niemand glaubt.
   */
  readonly ausgenommen: number;
}

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert.length > 0 ? wert : ersatz;
}

export function kostenparameter(zustand: Zustand): Kostenparameter {
  const k = zustand.einsatz?.kosten;
  const zahl = (wert: unknown): number => (typeof wert === "number" ? wert : 0);
  return {
    psaKostenProSatz: zahl(k?.psaKostenProSatz?.wert),
    vdaProTag: zahl(k?.vdaProTag?.wert),
    ukVerpflegungProTag: zahl(k?.ukVerpflegungProTag?.wert),
    geplanteEinsatztage: zahl(k?.geplanteEinsatztage?.wert),
  };
}

/**
 * Baut das Blatt.
 *
 * Geordnet wird nach dem Abschnittsbaum und darin nach der Ordnung der
 * Einheitentabelle (§5.3): Wer eine Kostenzeile sucht, sucht sie dort, wo die
 * Einheit auch im Druck steht.
 */
export function kostenblatt(zustand: Zustand): Kostenblatt {
  const zeilen: Kostenzeile[] = [];
  let ausgenommen = 0;

  for (const knoten of baumZeilen(abschnittsbaum(zustand))) {
    const zaehlt = kennzahlen.zaehltInKosten(zustand, knoten.id);
    const einheiten = kennzahlen.einheitenImAbschnitt(zustand, knoten.id);
    if (!zaehlt) {
      ausgenommen += einheiten.length;
      continue;
    }
    for (const einheit of einheiten) {
      const zahlen = kennzahlen.kosten(zustand, einheit);
      zeilen.push({
        einheitId: einheit.id,
        abschnittId: knoten.id,
        abschnittName: knoten.name,
        bezeichnung: kennzahlen.anzeigename(einheit),
        organisation: text(einheit.organisation.wert),
        koepfe: kennzahlen.gesamtstaerke(einheit),
        psaSaetzeProTag:
          typeof einheit.psaSaetzeProTag?.wert === "number" ? einheit.psaSaetzeProTag.wert : 0,
        ...zahlen,
      });
    }
  }

  const summe = zeilen.reduce(
    (s, z) => ({
      koepfe: s.koepfe + z.koepfe,
      psaProTag: s.psaProTag + z.psaProTag,
      vdaUkProTag: s.vdaUkProTag + z.vdaUkProTag,
      personentage: s.personentage + z.personentage,
      gesamt: s.gesamt + z.gesamt,
    }),
    { koepfe: 0, psaProTag: 0, vdaUkProTag: 0, personentage: 0, gesamt: 0 },
  );

  return { parameter: kostenparameter(zustand), zeilen, summe, ausgenommen };
}
