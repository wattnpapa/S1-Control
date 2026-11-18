/**
 * Der Stau vor dem Sichter (Audit Sichter P1-4, auch ETB P3-3, Sichter P3-4).
 *
 * Fiel der Sichter aus (Absturz, Netz, Fenster zu), lag ein Blitz im Eingang
 * minutenlang „vor dem Sichter“, und niemand sah es: Die Kachel zählte hoch,
 * aber keiner bekam einen Hinweis. Ein Arbeitsplatz mit Stelle FMZ (oder LDF)
 * bekommt deshalb, wenn kein Sichter besetzt ist und ein Eingang mindestens
 * die Schwelle der FmZ lang vor dem Sichter liegt, einmal je Nachricht die
 * Mitteilung „n Eingänge warten seit m Minuten vor dem Sichter, kein Sichter
 * besetzt“. Der Knopf „Ich sichte jetzt selbst“ ist Sache der Oberfläche.
 *
 * Die Prüfung hängt an der Uhr, nicht am Eintreffen: Sie läuft im Takt des
 * Workers, je Minute einmal genügt.
 */

import { projektion, type Zustand } from "@s1/domaene";

const MINUTE_MS = 60_000;

/** Die Stellen, an die der Hinweis geht: die FmZ, die den Eingang aufnimmt, und der LdF. */
const MELDESTELLEN: ReadonlySet<string> = new Set(["FMZ", "LDF"]);

/** „2 Eingänge warten seit 23 Minuten vor dem Sichter, kein Sichter besetzt“. */
export function sichterstauText(anzahl: number, minuten: number): string {
  const eingaenge = anzahl === 1 ? "1 Eingang wartet" : `${String(anzahl)} Eingänge warten`;
  const zeit = minuten === 1 ? "1 Minute" : `${String(minuten)} Minuten`;
  return `${eingaenge} seit ${zeit} vor dem Sichter, kein Sichter besetzt`;
}

/**
 * Additiv (R2-FM P2-5, R2-Si P2-2): Der Sichter ist besetzt, reagiert aber
 * nicht (Funkgerät, Telefon, Tür) — der häufigere Fall als der geschlossene
 * Arbeitsplatz. Über der Schwelle des Vorrangs darf die FmZ selbst sichten.
 */
export function saeumigerSichterText(anzahl: number, minuten: number): string {
  const eingaenge = anzahl === 1 ? "1 Eingang wartet" : `${String(anzahl)} Eingänge warten`;
  const zeit = minuten === 1 ? "1 Minute" : `${String(minuten)} Minuten`;
  return `${eingaenge} seit ${zeit} vor dem Sichter, obwohl ein Sichter besetzt ist — „Ich sichte jetzt selbst“ ist frei`;
}

/**
 * Additiv (R2-LdF P1-2, R2-Si P1-1): Der LdF ist mit `ldfStation` eine
 * Station vor dem Sichter. Ein Eingang konnte dort beliebig lange liegen,
 * ohne dass Band, Zeile oder FmZ es zeigten. Gemessen wird ab der Aufnahme
 * (`wartetSeitLdf`), gemeldet an FmZ, LdF und Sichter — auch bei besetztem
 * LdF, denn gerade der säumige LdF ist der Fall.
 */
const LDF_MELDESTELLEN: ReadonlySet<string> = new Set(["FMZ", "LDF", "SICHTER"]);

/** „1 Eingang wartet seit 7 Minuten beim LdF“. */
export function ldfstauText(anzahl: number, minuten: number): string {
  const eingaenge = anzahl === 1 ? "1 Eingang wartet" : `${String(anzahl)} Eingänge warten`;
  const zeit = minuten === 1 ? "1 Minute" : `${String(minuten)} Minuten`;
  return `${eingaenge} seit ${zeit} beim LdF, noch nicht an den Sichter weitergegeben`;
}

/** Was der Wächter je Durchgang braucht. */
export interface Staulage {
  readonly zustand: Zustand;
  readonly stellen: readonly string[];
  readonly jetztMs: number;
  readonly sichterBesetzt: boolean;
}

/**
 * Merkt sich, welche Eingänge schon gemeldet sind, und meldet je Nachricht
 * einmal. Ein Eingang, der wieder unter die Schwelle fällt (gesichtet),
 * scheidet aus; ein neuer zählt neu.
 */
export class Sichterstauwaechter {
  readonly #gemeldet = new Set<string>();
  readonly #gemeldetLdf = new Set<string>();
  #letzteMinute = Number.NEGATIVE_INFINITY;

  /**
   * Liefert den Hinweistext, wenn ein Eingang neu über die Schwelle kam —
   * vor dem Sichter, beim LdF oder beides (dann in einem Satz); sonst `undefined`.
   */
  pruefe(lage: Staulage): string | undefined {
    const minute = Math.floor(lage.jetztMs / MINUTE_MS);
    if (minute === this.#letzteMinute) return undefined;
    this.#letzteMinute = minute;
    if (lage.zustand.nachrichten === undefined) return undefined;
    const jetzt = new Date(minute * MINUTE_MS).toISOString();
    const texte = [this.#vorSichter(lage, jetzt), this.#beimLdf(lage, jetzt)].filter((t): t is string => t !== undefined);
    return texte.length === 0 ? undefined : texte.join(". ");
  }

  #vorSichter(lage: Staulage, jetzt: string): string | undefined {
    if (!lage.stellen.some((s) => MELDESTELLEN.has(s)) || lage.stellen.includes("SICHTER")) return undefined;
    // R2-FM P2-5, R2-Si P2-2: die Schwelle je Vorrang; auch bei besetztem, aber säumigem Sichter.
    const ueber = projektion
      .nachrichtenausschnitt(lage.zustand, { sicht: "sichter", jetzt })
      .zeilen.filter((z) => !z.zurueckgezogen && z.sichterSchwelleUeberschritten === true);
    return this.#neueMelden(ueber.map((z) => [z.id, z.wartetSeitSichter ?? 0]), this.#gemeldet, lage.sichterBesetzt ? saeumigerSichterText : sichterstauText);
  }

  #beimLdf(lage: Staulage, jetzt: string): string | undefined {
    if (!lage.stellen.some((s) => LDF_MELDESTELLEN.has(s))) return undefined;
    const schwelle = projektion.fmzSchwelle(lage.zustand);
    const ueber = projektion
      .nachrichtenausschnitt(lage.zustand, { sicht: "ldf", jetzt })
      .zeilen.filter((z) => z.richtung === "EINGANG" && !z.zurueckgezogen && projektion.ueberWarteschwelle(z.wartetSeitLdf, schwelle));
    return this.#neueMelden(ueber.map((z) => [z.id, z.wartetSeitLdf ?? 0]), this.#gemeldetLdf, ldfstauText);
  }

  /** Je Nachricht einmal: nur wenn eine neue dazukam, dann mit allen und der längsten Wartezeit. */
  #neueMelden(ueber: readonly (readonly [string, number])[], gemeldet: Set<string>, text: (anzahl: number, minuten: number) => string): string | undefined {
    const neu = ueber.filter(([id]) => !gemeldet.has(id));
    for (const [id] of neu) gemeldet.add(id);
    if (neu.length === 0) return undefined;
    return text(ueber.length, Math.max(...ueber.map(([, minuten]) => minuten)));
  }
}
