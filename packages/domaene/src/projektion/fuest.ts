/**
 * Das Blatt der Führungsstelle: Dienstposten und Schichtplan (M5.4).
 *
 * Vorbild ist `excel-domaenenmodell.md` §5. Das Blatt ist **fachlich ein
 * zweites Modell** neben der Einheitentabelle, und der Satz steht dort
 * ausdrücklich: Funktion (Dienstposten) × Schicht × Rolle → Besetzung 0/1,
 * dazu ein Dienstplan Funktion × Tag → Person als Freitext.
 *
 * **Warum die Führungsstelle nicht als Einheit erfasst wird.** Sie erscheint
 * im Lagebild als Stärke wie jede andere Einheit — aber ihre Stärke entsteht
 * aus den besetzten Dienstposten und wird nicht getrennt gemeldet. Genau das
 * rechnet K17: je `teileinheit × schicht` eine virtuelle Einheit. Würde sie
 * zusätzlich als Einheit erfasst, stünde sie zweimal in der Gesamtstärke.
 *
 * **Die Rolle folgt der Funktion, und die Zuordnung ist ein Stammdatum.** K17
 * nimmt sie als Parameter entgegen, damit `kennzahlen.ts` kein Vokabular
 * kennt (KONZEPT-EREIGNISSE §1.2). Hier steht eine Vorbelegung, und sie ist
 * ein Befund: Sie gehört fachlich zu den Stammdaten der Führungsstelle und
 * nicht in den Code.
 */

import { fuestProjektion, type FuestZeile } from "../kennzahlen.js";
import type { Id, Staerke } from "../werte.js";
import type { DienstpostenZustand, Zustand } from "../zustand.js";

/**
 * Die fünf Teilbereiche des Blattes, in seiner Reihenfolge
 * (`excel-domaenenmodell.md` §5).
 *
 * Sie sind **keine** geschlossene Liste im Sinne von §3.7: `teileinheit` ist
 * im Katalog Pflichttext und nicht Aufzählung, ein Einsatz darf also einen
 * sechsten Teilbereich führen. Diese Liste bestimmt nur die Reihenfolge und
 * die Vorbelegung der Maske; was sie nicht kennt, kommt danach.
 */
export const TEILBEREICHE = ["Stab", "ZTr FK", "FGr F", "FGr K", "Externe"] as const;

/**
 * Welche Rolle eine Funktion belegt — die Vorbelegung.
 *
 * **Befund, nicht Festlegung.** Die Zuordnung Funktion → Fü/UFü/He ist ein
 * Stammdatum der Führungsstelle: Ob ein „SGL 3" als Unterführer oder als
 * Führer zählt, entscheidet die Dienstvorschrift der Stelle und nicht dieses
 * Programm. Bis `Einstellungen` im Kontrakt Stammdaten führt, steht hier eine
 * Vorbelegung nach dem, was die Vorlage in ihren Funktionszeilen anlegt.
 *
 * Die Regel ist bewusst grob: Wer eine Stelle leitet, ist Führer; wer eine
 * Gruppe oder einen Trupp führt oder ein Sachgebiet betreut, ist Unterführer;
 * alles Übrige ist Helfer.
 */
export function rolleDerFunktion(funktion: string): keyof Staerke {
  const text = funktion.trim().toLocaleLowerCase("de-DE");
  if (text.startsWith("ltr") || text.startsWith("leiter")) return "fuehrer";
  if (
    text.startsWith("sgl") ||
    text.startsWith("fügeh") ||
    text.startsWith("fuegeh") ||
    text.startsWith("grfü") ||
    text.startsWith("grfue") ||
    text.startsWith("trfü") ||
    text.startsWith("trfue") ||
    text.startsWith("ztrfü") ||
    text.startsWith("ztrfue")
  ) {
    return "unterfuehrer";
  }
  return "mannschaft";
}

/** Eine Zeile des Dienstpostenblatts. */
export interface Dienstpostenzeile {
  readonly id: Id;
  readonly teileinheit: string;
  readonly funktion: string;
  readonly schicht: string;
  readonly reihenfolge: number;
  /** Die Rolle, mit der dieser Posten in die Stärke eingeht. */
  readonly rolle: keyof Staerke;
  /** Der Text der Besetzung; leer heißt unbesetzt. */
  readonly besetzung: string;
  readonly besetzt: boolean;
  /** §5.4.5 sinngemäß: Entfernen ist kein Löschen; der Posten bleibt sichtbar. */
  readonly entfernt: boolean;
}

/** Ein Teilbereich mit seinen Posten und seinen beiden Summenzeilen. */
export interface Teilbereichsblock {
  readonly teileinheit: string;
  readonly zeilen: readonly Dienstpostenzeile[];
  /** Je Schicht die Stärke der **besetzten** Posten. */
  readonly summeJeSchicht: { readonly [schicht: string]: Staerke };
}

function text(wert: unknown, ersatz = ""): string {
  return typeof wert === "string" && wert.length > 0 ? wert : ersatz;
}

const NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

export function dienstpostenzeile(posten: DienstpostenZustand): Dienstpostenzeile {
  const funktion = text(posten.funktion.wert);
  const besetzung = text(posten.besetzung?.wert);
  return {
    id: posten.id,
    teileinheit: text(posten.teileinheit.wert),
    funktion,
    schicht: text(posten.schicht?.wert),
    reihenfolge: typeof posten.reihenfolge.wert === "number" ? posten.reihenfolge.wert : 0,
    rolle: rolleDerFunktion(funktion),
    besetzung,
    besetzt: besetzung !== "",
    entfernt: posten.entfernt?.wert === true,
  };
}

/**
 * Ordnet zwei Posten: Reihenfolge, dann Funktion, dann Id.
 *
 * Wie überall in den Projektionen endet die Ordnung bei der Id (§5.3): Ohne
 * sie zeigten zwei Clients dasselbe Blatt verschieden, sobald zwei Posten
 * dieselbe Reihenfolge tragen — und das tun sie, sobald jemand einen einfügt.
 */
export function vergleicheDienstposten(links: Dienstpostenzeile, rechts: Dienstpostenzeile): number {
  if (links.reihenfolge !== rechts.reihenfolge) return links.reihenfolge - rechts.reihenfolge;
  const nachFunktion = links.funktion.localeCompare(rechts.funktion, "de-DE");
  if (nachFunktion !== 0) return nachFunktion;
  return links.id < rechts.id ? -1 : links.id > rechts.id ? 1 : 0;
}

export interface Dienstpostenoptionen {
  /** Entfernte Posten mitführen; ohne Angabe fallen sie heraus (§5.4.5). */
  readonly mitEntfernten?: boolean;
}

/**
 * Das Dienstpostenblatt: die Teilbereiche in der Ordnung der Vorlage, danach
 * alles, was die Vorlage nicht kennt.
 */
export function dienstpostenblatt(
  zustand: Zustand,
  optionen: Dienstpostenoptionen = {},
): readonly Teilbereichsblock[] {
  const alle = Object.values(zustand.dienstposten)
    .map(dienstpostenzeile)
    .filter((zeile) => optionen.mitEntfernten === true || !zeile.entfernt)
    .sort(vergleicheDienstposten);

  const nachBereich = new Map<string, Dienstpostenzeile[]>();
  for (const zeile of alle) {
    nachBereich.set(zeile.teileinheit, [...(nachBereich.get(zeile.teileinheit) ?? []), zeile]);
  }

  const bekannt = [...TEILBEREICHE].filter((name) => nachBereich.has(name));
  const unbekannt = [...nachBereich.keys()].filter((name) => !TEILBEREICHE.includes(name as never)).sort();

  return [...bekannt, ...unbekannt].map((teileinheit) => {
    const zeilen = nachBereich.get(teileinheit) ?? [];
    const summeJeSchicht: Record<string, Staerke> = {};
    for (const zeile of zeilen) {
      if (!zeile.besetzt || zeile.entfernt) continue;
      const bisher = summeJeSchicht[zeile.schicht] ?? NULL;
      summeJeSchicht[zeile.schicht] = { ...bisher, [zeile.rolle]: bisher[zeile.rolle] + 1 };
    }
    return { teileinheit, zeilen, summeJeSchicht };
  });
}

/**
 * Die Stärke der Führungsstelle, wie sie in den Druck eingeht — K17 mit der
 * Vorbelegung aus {@link rolleDerFunktion}.
 */
export function fuestStaerke(zustand: Zustand): readonly FuestZeile[] {
  return fuestProjektion(zustand, rolleDerFunktion);
}

// ---------------------------------------------------------------------------
// Der Schichtplan
// ---------------------------------------------------------------------------

/** Eine Zeile des Schichtplans: ein Dienstposten mit seinen beschriebenen Tagen. */
export interface Schichtplanzeile {
  readonly dienstpostenId: Id;
  readonly teileinheit: string;
  readonly funktion: string;
  readonly schicht: string;
  /** Datum → Text; nur Tage, an denen etwas steht. */
  readonly tage: { readonly [datum: string]: string };
}

export interface Schichtplanblatt {
  /** Die Tage, die überhaupt vorkommen, aufsteigend. */
  readonly tage: readonly string[];
  readonly zeilen: readonly Schichtplanzeile[];
}

export interface Schichtplanoptionen {
  /** Erster angezeigter Tag (ISO-Datum), einschließlich. */
  readonly von?: string;
  /** Letzter angezeigter Tag, einschließlich. */
  readonly bis?: string;
  readonly mitEntfernten?: boolean;
}

/**
 * Baut den Schichtplan.
 *
 * **Die Spalten kommen aus den Daten und nicht aus einem Kalender.** Die
 * Vorlage hat feste Spalten J bis AS und blendet vergangene Tage von Hand aus;
 * hier steht eine Spalte, sobald jemand etwas hineingeschrieben hat. Ein
 * Kalender, der 36 leere Spalten erzeugt, wäre auf einem Bildschirm dasselbe
 * Ärgernis wie in der Vorlage.
 *
 * `von`/`bis` schneiden zu — der Plan reicht über Wochen, der Bildschirm nicht.
 *
 * Ein Dienstposten ohne Planzeile hat nach §5.7 **keinen** Eintrag in
 * `schichtplan`; er erscheint hier trotzdem, mit leerem `tage`. Das ist die
 * Zeile, in die jemand den ersten Eintrag schreibt.
 */
export function schichtplanblatt(
  zustand: Zustand,
  optionen: Schichtplanoptionen = {},
): Schichtplanblatt {
  const posten = Object.values(zustand.dienstposten)
    .map(dienstpostenzeile)
    .filter((zeile) => optionen.mitEntfernten === true || !zeile.entfernt)
    .sort(vergleicheDienstposten);

  const imFenster = (datum: string): boolean =>
    (optionen.von === undefined || datum >= optionen.von) &&
    (optionen.bis === undefined || datum <= optionen.bis);

  const tage = new Set<string>();
  const zeilen: Schichtplanzeile[] = zeilen_(posten, zustand, imFenster, tage);

  return { tage: [...tage].sort(), zeilen };
}

function zeilen_(
  posten: readonly Dienstpostenzeile[],
  zustand: Zustand,
  imFenster: (datum: string) => boolean,
  tage: Set<string>,
): Schichtplanzeile[] {
  return posten.map((zeile) => {
    const eintraege = zustand.schichtplan[zeile.id] ?? {};
    const gefuellt: Record<string, string> = {};
    for (const datum of Object.keys(eintraege).sort()) {
      const wert = eintraege[datum]?.wert;
      // §5.7: Der Wert ist `string | null`; `null` heißt „Eintrag gelöscht"
      // und ist keine leere Zelle mit Inhalt. Beides sieht im Blatt gleich
      // aus, und das ist richtig — der Unterschied steht im Tagebuch.
      if (typeof wert !== "string" || wert === "" || !imFenster(datum)) continue;
      gefuellt[datum] = wert;
      tage.add(datum);
    }
    return {
      dienstpostenId: zeile.id,
      teileinheit: zeile.teileinheit,
      funktion: zeile.funktion,
      schicht: zeile.schicht,
      tage: gefuellt,
    };
  });
}
