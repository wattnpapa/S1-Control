/**
 * Das Drehbuch des Demo-Einsatzes — die Bausteine.
 *
 * Ein Drehbuch ist eine Liste von Schritten. Jeder Schritt ist ein
 * **Bedienschritt**, wie ihn auch die Oberfläche schickt (`Entwurf`), mit der
 * Minute seit Einsatzbeginn, zu der er geschieht, und der Stelle, die ihn
 * ausführt. Der Demo-Einsatz entsteht also auf demselben Weg wie ein echter:
 * über `Aktendienst.bediene`, mit allen Prüfungen und Folgeschritten. Ein
 * Drehbuch, das an den Ereignissen vorbei Dateien schriebe, zeigte eine Lage,
 * die die Software selbst nicht erzeugen kann.
 *
 * Die Zeiten sind **relativ**: Der Einsatz beginnt zwölf Stunden vor dem
 * Anlegen (`DEMO_DAUER_MINUTEN`), der letzte Schritt liegt kurz vor jetzt.
 */

import { anzeigezoneWandzeit, type Zustand } from "@s1/domaene";

import type { Entwurf } from "../../kontrakt/index.js";
import type { Aktendienst } from "../aktendienst.js";

/** Der Demo-Einsatz beginnt zwölf Stunden vor dem Anlegen. */
export const DEMO_DAUER_MINUTEN = 12 * 60;

/** Wer einen Schritt ausführt: die Stellen der Sitzung und ihr Handzeichen. */
export interface Demostelle {
  readonly stellen: readonly string[];
  readonly handzeichen: string;
}

/**
 * Ein Entwurf, der erst beim Abspielen entsteht — für Schritte, deren
 * Vorher-Wert davon abhängt, was Folgeschritte anderer Schritte inzwischen
 * geschrieben haben (die Funkprobe sieht den Kontakt, den eine beförderte
 * Nachricht hinterlassen hat).
 */
export type Entwurfsbauer = (zustand: Zustand) => Entwurf | undefined;

/** Was ein Schritt schreibt: ein fertiger Entwurf oder einer, der beim Abspielen entsteht. */
export type Schrittentwurf = Entwurf | Entwurfsbauer;

/**
 * Ein Schritt, der kein einzelner Bedienschritt ist, sondern ein Ruf an den
 * Aktendienst (der Erfassungsbogen: einlesen und übernehmen). Liefert die
 * Meldung, wenn er scheitert.
 */
export type Demotat = (dienst: Aktendienst) => Promise<string | undefined>;

interface Schrittkopf {
  /** Minuten seit Einsatzbeginn; höchstens {@link DEMO_DAUER_MINUTEN}. */
  readonly minute: number;
  /** Ohne Angabe: ohne Stelle, wie ein Arbeitsplatz, der keine gewählt hat. */
  readonly als?: Demostelle;
}

export type Demoschritt = Schrittkopf & ({ readonly entwurf: Schrittentwurf } | { readonly tat: Demotat; readonly name: string });

/** Die Zeitrechnung eines Drehbuchs: alles hängt am Beginn. */
export interface Demozeit {
  readonly beginnMs: number;
  /** Der Zeitpunkt `minute` Minuten nach Einsatzbeginn, ISO-8601. */
  um(minute: number): string;
  /** Der Kalendertag dieses Zeitpunkts in der Anzeigezone, `JJJJ-MM-TT`. */
  tag(minute: number): string;
}

export function demozeit(beginnMs: number): Demozeit {
  const um = (minute: number): string => new Date(beginnMs + minute * 60_000).toISOString();
  return {
    beginnMs,
    um,
    tag(minute) {
      const wand = anzeigezoneWandzeit(new Date(beginnMs + minute * 60_000));
      if (wand === undefined) return um(minute).slice(0, 10);
      const zwei = (zahl: number): string => String(zahl).padStart(2, "0");
      return `${String(wand.jahr)}-${zwei(wand.monat)}-${zwei(wand.tag)}`;
    },
  };
}

/** Ein Schritt ohne Stelle. */
export function schritt(minute: number, entwurf: Schrittentwurf): Demoschritt {
  return { minute, entwurf };
}

/** Ein Schritt, den eine Stelle ausführt. */
export function schrittAls(als: Demostelle, minute: number, entwurf: Schrittentwurf): Demoschritt {
  return { minute, als, entwurf };
}

/** Lässt die Schritte weg, die ein Schrittbauer mit `undefined` verweigert hat. */
export function vorhandene(schritte: readonly (Demoschritt | undefined)[]): Demoschritt[] {
  return schritte.filter((s): s is Demoschritt => s !== undefined);
}

/** Die Stellen der Führungsstelle im Demo-Einsatz. */
export const STELLE = {
  s1: { stellen: ["S1"], handzeichen: "Wi" },
  s2: { stellen: ["S2"], handzeichen: "Ha" },
  s3: { stellen: ["S3"], handzeichen: "Be" },
  s4: { stellen: ["S4"], handzeichen: "Kl" },
  leiter: { stellen: ["LEITER"], handzeichen: "Ah" },
  sichter: { stellen: ["SICHTER"], handzeichen: "Si" },
  ldf: { stellen: ["LDF"], handzeichen: "Ld" },
  fm1: { stellen: ["FM1"], handzeichen: "Mo" },
  fm2: { stellen: ["FM2"], handzeichen: "Ts" },
} as const satisfies Readonly<Record<string, Demostelle>>;
