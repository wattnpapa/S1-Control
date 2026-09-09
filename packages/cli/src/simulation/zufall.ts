/**
 * Die einzige Zufallsquelle der Simulation — KONZEPT-SPEICHER.md §7.6 und
 * 05-UMSETZUNGSPLAN.md, M0.4 („reproduzierbar konvergent").
 *
 * Reproduzierbarkeit ist Teil der Abnahmebedingung, nicht Komfort: Ein Lauf,
 * der nur manchmal konvergiert, ist kein Nachweis, und ein roter Lauf, der sich
 * nicht wiederholen lässt, ist nicht untersuchbar. Deshalb steht hinter jeder
 * Entscheidung dieser Simulation — welcher Client als Nächstes dran ist, welche
 * Störung wann greift, welches Byte gekippt wird — ein gesetzter Startwert und
 * niemals `Math.random`.
 *
 * Bewusst ein eigener, winziger Generator statt einer Abhängigkeit: Der
 * Algorithmus muss über Node-Versionen und Betriebssysteme hinweg dieselbe
 * Folge liefern (Auflage 17, drei Betriebssysteme), und dafür ist er hier
 * ausgeschrieben.
 */

/** Eine Zufallsquelle mit gesetztem Startwert. */
export class Zufall {
  /** Der Startwert, aus dem dieser Strom entstanden ist — gehört in jeden Bericht. */
  readonly startwert: number;
  #zustand: number;

  constructor(startwert: number) {
    if (!Number.isInteger(startwert) || startwert < 0 || startwert > 0xffff_ffff) {
      throw new RangeError(`Startwert muss eine ganze Zahl in [0, 2^32) sein: ${startwert}`);
    }
    this.startwert = startwert;
    // Ein Startwert von 0 ergäbe bei mulberry32 einen brauchbaren, aber
    // ungewöhnlich strukturierten Anfang; der Versatz vermeidet das, ohne die
    // Zuordnung Startwert -> Strom mehrdeutig zu machen.
    this.#zustand = (startwert + 0x9e37_79b9) >>> 0;
  }

  /** Gleichverteilt in [0, 1) — mulberry32. */
  naechste(): number {
    this.#zustand = (this.#zustand + 0x6d2b_79f5) >>> 0;
    let t = this.#zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0x1_0000_0000;
  }

  /** Ganze Zahl in [0, grenze). */
  bis(grenze: number): number {
    if (!Number.isInteger(grenze) || grenze <= 0) {
      throw new RangeError(`Grenze muss eine positive ganze Zahl sein: ${grenze}`);
    }
    return Math.floor(this.naechste() * grenze);
  }

  /** Ganze Zahl in [von, bis], beide Enden eingeschlossen. */
  zwischen(von: number, bis: number): number {
    if (bis < von) throw new RangeError(`Leeres Intervall: [${von}, ${bis}]`);
    return von + this.bis(bis - von + 1);
  }

  /** `true` mit der angegebenen Wahrscheinlichkeit. `0` heißt nie, `1` heißt immer. */
  trifft(wahrscheinlichkeit: number): boolean {
    if (wahrscheinlichkeit <= 0) return false;
    if (wahrscheinlichkeit >= 1) return true;
    return this.naechste() < wahrscheinlichkeit;
  }

  /** Ein Element aus einer nicht leeren Liste. */
  waehle<T>(liste: readonly T[]): T {
    if (liste.length === 0) throw new RangeError("Auswahl aus leerer Liste");
    return liste[this.bis(liste.length)] as T;
  }

  /**
   * Ein abgeleiteter Strom mit eigenem Startwert.
   *
   * Jede Störquelle bekommt einen eigenen Strom. Ohne diese Trennung
   * verschöbe eine zusätzliche Ziehung an einer Stelle die gesamte Folge an
   * allen anderen, und derselbe Startwert ergäbe nach jeder Codeänderung einen
   * anderen Lauf — die Reproduzierbarkeit gälte dann nur bis zur nächsten
   * Zeile.
   */
  abzweig(name: string): Zufall {
    let h = this.startwert >>> 0;
    for (const zeichen of name) {
      h = (Math.imul(h ^ (zeichen.codePointAt(0) as number), 0x0100_0193) + 1) >>> 0;
    }
    return new Zufall(h);
  }
}
