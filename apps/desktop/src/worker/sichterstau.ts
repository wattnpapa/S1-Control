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
  #letzteMinute = Number.NEGATIVE_INFINITY;

  /** Liefert den Hinweistext, wenn ein Eingang neu über die Schwelle kam; sonst `undefined`. */
  pruefe(lage: Staulage): string | undefined {
    const minute = Math.floor(lage.jetztMs / MINUTE_MS);
    if (minute === this.#letzteMinute) return undefined;
    this.#letzteMinute = minute;
    if (lage.sichterBesetzt || !lage.stellen.some((s) => MELDESTELLEN.has(s)) || lage.zustand.nachrichten === undefined) return undefined;
    const jetzt = new Date(minute * MINUTE_MS).toISOString();
    const schwelle = projektion.fmzSchwelle(lage.zustand);
    const ueber = projektion
      .nachrichtenausschnitt(lage.zustand, { sicht: "sichter", jetzt })
      .zeilen.filter((z) => !z.zurueckgezogen && projektion.ueberWarteschwelle(z.wartetSeitSichter, schwelle));
    const neu = ueber.filter((z) => !this.#gemeldet.has(z.id));
    for (const zeile of neu) this.#gemeldet.add(zeile.id);
    if (neu.length === 0) return undefined;
    const laengste = Math.max(...ueber.map((z) => z.wartetSeitSichter ?? 0));
    return sichterstauText(ueber.length, laengste);
  }
}
