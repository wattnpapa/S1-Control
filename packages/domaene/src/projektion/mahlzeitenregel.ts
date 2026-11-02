/**
 * Die Mahlzeitenregel des Einsatzes und die Zeitfolge der Mahlzeiten (S4).
 *
 * Die Regel ist ein Parameter des Einsatzes mit Vorbelegung (Entscheidung 4):
 * Ein Hochwasser im September und ein Sturm im Januar verpflegen die
 * Nachtschicht nicht zur selben Stunde. Gesetzt wird sie mit
 * `MahlzeitenregelGesetzt` als Ganzes; ist der gespeicherte Wert unlesbar,
 * gilt die Vorbelegung — eine Vorausschau ohne Mahlzeiten wäre schlechter.
 */

import { zMahlzeitregelzeile } from "../katalog/schemata-versorgung.js";
import { MAHLZEITENREGEL_VORBELEGUNG, type Mahlzeit, type Mahlzeitenregel } from "../werte.js";
import type { Zustand } from "../zustand.js";

/** Die Regel, wie sie geprüft wird — auch vom Worker vor dem Schreiben. */
export function regelFehler(wert: unknown): string | undefined {
  if (!Array.isArray(wert) || wert.length === 0) return "Die Mahlzeitenregel braucht mindestens eine Mahlzeit.";
  const gesehen = new Set<string>();
  for (const zeile of wert) {
    const geprueft = zMahlzeitregelzeile.safeParse(zeile);
    if (!geprueft.success) return "Jede Mahlzeit braucht eine Ausgabezeit HHMM und ihre Schichten.";
    if (gesehen.has(geprueft.data.mahlzeit)) return "Jede Mahlzeit darf nur einmal in der Regel stehen.";
    gesehen.add(geprueft.data.mahlzeit);
  }
  return undefined;
}

/** Die geltende Regel des Einsatzes und ob es die Vorbelegung ist. */
export function regelstand(zustand: Zustand): { readonly regel: Mahlzeitenregel; readonly vorbelegung: boolean } {
  const wert: unknown = zustand.einsatz?.mahlzeitenregel?.wert;
  if (wert === undefined || wert === null || regelFehler(wert) !== undefined) {
    return { regel: MAHLZEITENREGEL_VORBELEGUNG, vorbelegung: true };
  }
  return { regel: wert as Mahlzeitenregel, vorbelegung: false };
}

export function mahlzeitenregelDes(zustand: Zustand): Mahlzeitenregel {
  return regelstand(zustand).regel;
}

// --- Die Zeitfolge der Mahlzeiten ------------------------------------------

const TAG_MS = 24 * 60 * 60 * 1000;

/** Eine Mahlzeit als Zeitpunkt im Horizont. */
export interface Ausgabetermin {
  readonly mahlzeit: Mahlzeit;
  readonly uhrzeit: string;
  readonly ms: number;
  readonly zeitpunkt: string;
  /** Der Kalendertag in Ortszeit, `JJJJ-MM-TT` — der Schlüssel der Bestellung. */
  readonly datum: string;
  /** 0 heute, 1 morgen, 2 übermorgen — in Ortszeit. */
  readonly tag: number;
  readonly schichten: readonly string[];
}

function uhrzeitMs(uhrzeit: string): number | undefined {
  const treffer = /^(\d{2})(\d{2})$/.exec(uhrzeit);
  if (treffer === null) return undefined;
  const stunden = Number(treffer[1]);
  const minuten = Number(treffer[2]);
  if (stunden > 23 || minuten > 59) return undefined;
  return (stunden * 60 + minuten) * 60 * 1000;
}

/**
 * Die Mahlzeiten im Horizont `[jetzt, jetzt + stunden)`, in Zeitfolge.
 *
 * Eine Mahlzeit genau „jetzt" gehört dazu: Sie wird gerade ausgegeben.
 */
export function ausgabetermine(
  regel: Mahlzeitenregel,
  jetzt: number,
  versatzMinuten: number,
  stunden: number,
): readonly Ausgabetermin[] {
  if (!Number.isFinite(jetzt) || !Number.isFinite(versatzMinuten)) return [];
  const versatz = versatzMinuten * 60 * 1000;
  const heute = Math.floor((jetzt + versatz) / TAG_MS) * TAG_MS;
  const bis = jetzt + stunden * 60 * 60 * 1000;
  const termine: Ausgabetermin[] = [];
  for (let tag = 0; tag * 24 <= stunden + 24; tag += 1) {
    for (const zeile of regel) {
      const uhr = uhrzeitMs(zeile.uhrzeit);
      if (uhr === undefined) continue;
      const ms = heute + tag * TAG_MS + uhr - versatz;
      if (ms < jetzt || ms >= bis) continue;
      termine.push({
        mahlzeit: zeile.mahlzeit,
        uhrzeit: zeile.uhrzeit,
        ms,
        zeitpunkt: new Date(ms).toISOString(),
        datum: new Date(ms + versatz).toISOString().slice(0, 10),
        tag,
        schichten: zeile.schichten,
      });
    }
  }
  return termine.sort((a, b) => a.ms - b.ms);
}

