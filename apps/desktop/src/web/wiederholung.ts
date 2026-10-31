/**
 * Der Wiederholungsspeicher des Web-Dienstes.
 *
 * Geht die Antwort eines Schreibrufs unterwegs verloren, weiss der Browser
 * nicht, ob die Eingabe angekommen ist. Ein erneutes „Übernehmen" legte die
 * Einheit sonst ein zweites Mal an. Die Web-Brücke schickt deshalb mit jedem
 * schreibenden Ruf eine Anfrage-ID (Kopf {@link KOPF_ANFRAGE_ID}) und
 * wiederholt sie unverändert, solange der Ausgang unbekannt ist. Der Dienst
 * merkt sich je Arbeitsplatz die zuletzt verarbeiteten IDs und liefert bei
 * einer Wiederholung das **ursprüngliche** Ergebnis, ohne erneut zu schreiben.
 *
 * Auch ein Ruf, der noch läuft, wird nicht doppelt gestartet: Die Wiederholung
 * hängt sich an denselben Vorgang. Der Speicher ist begrenzt (Anzahl und
 * Lebensdauer), weil er nur das Fenster zwischen „Antwort verloren" und
 * „Bediener versucht es erneut" überbrücken soll, kein Protokoll ist. Er lebt
 * im Speicher des Dienstes: Nach einem Neustart des Dienstes ist die Eingabe
 * zwar angekommen, die Wiederholung aber unbekannt — dagegen schützt nur der
 * Blick in die Liste, den die Oberfläche in der Meldung verlangt.
 */

export const KOPF_ANFRAGE_ID = "x-anfrage-id";
/** Form einer ID: so lang, dass sie nicht erraten wird, und ohne Sonderzeichen. */
export const ANFRAGE_ID_FORM = /^[A-Za-z0-9_-]{16,64}$/;
export const WIEDERHOLUNG_MAX_EINTRAEGE = 500;
export const WIEDERHOLUNG_LEBENSDAUER_MS = 10 * 60_000;

interface Eintrag {
  readonly art: string;
  readonly ergebnis: Promise<unknown>;
  readonly angelegt: number;
}

export interface WiederholungOptionen {
  readonly maxEintraege?: number;
  readonly lebensdauerMs?: number;
  readonly uhr?: () => number;
}

/** Liest die ID aus dem Kopf; eine ungültige ID gilt als fehlend. */
export function anfrageId(kopf: string | string[] | undefined): string | undefined {
  if (typeof kopf !== "string") return undefined;
  return ANFRAGE_ID_FORM.test(kopf) ? kopf : undefined;
}

export class Wiederholungsspeicher {
  readonly #eintraege = new Map<string, Eintrag>();
  readonly #max: number;
  readonly #lebensdauer: number;
  readonly #uhr: () => number;

  constructor(optionen: WiederholungOptionen = {}) {
    this.#max = optionen.maxEintraege ?? WIEDERHOLUNG_MAX_EINTRAEGE;
    this.#lebensdauer = optionen.lebensdauerMs ?? WIEDERHOLUNG_LEBENSDAUER_MS;
    this.#uhr = optionen.uhr ?? (() => Date.now());
  }

  get groesse(): number {
    return this.#eintraege.size;
  }

  /**
   * Führt `tue` höchstens einmal je (Arbeitsplatz, ID) aus.
   *
   * Eine ID, die schon mit einer **anderen** Art von Ruf gesehen wurde, ist
   * keine Wiederholung, sondern ein Versehen oder ein Zufallstreffer; sie wird
   * wie ein neuer Ruf behandelt. Wirft `tue`, wird nichts gemerkt, damit die
   * Wiederholung es erneut versuchen darf.
   */
  async fuehreAus<T>(schluessel: string, id: string, art: string, tue: () => Promise<T>): Promise<T> {
    this.#raeume();
    const key = `${schluessel}\u0000${id}`;
    const vorhanden = this.#eintraege.get(key);
    if (vorhanden?.art === art) return (await vorhanden.ergebnis) as T;

    const ergebnis = tue();
    this.#eintraege.set(key, { art, ergebnis, angelegt: this.#uhr() });
    try {
      return await ergebnis;
    } catch (fehler) {
      if (this.#eintraege.get(key)?.ergebnis === ergebnis) this.#eintraege.delete(key);
      throw fehler;
    }
  }

  /** Wirft Abgelaufenes weg und kürzt auf die Obergrenze (älteste zuerst). */
  #raeume(): void {
    const grenze = this.#uhr() - this.#lebensdauer;
    for (const [key, eintrag] of this.#eintraege) {
      if (eintrag.angelegt >= grenze) break;
      this.#eintraege.delete(key);
    }
    while (this.#eintraege.size >= this.#max) {
      const aeltester = this.#eintraege.keys().next();
      if (aeltester.done === true) break;
      this.#eintraege.delete(aeltester.value);
    }
  }
}
