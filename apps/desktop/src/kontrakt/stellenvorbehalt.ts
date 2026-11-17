/**
 * Der Stellenvorbehalt als `grund`-Pflicht im Worker (Audits Nachrichten
 * Runde 2: R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2; Entscheidung 13).
 *
 * Entscheidung 13 macht aus dem Vorbehalt der Lehrunterlage **kein Recht und
 * keine Sperre**, sondern einen Hinweis mit „Trotzdem“. Bis Runde 2 stand der
 * Hinweis nur in den Masken Annehmen, Befördern, Nachweisen, Vorschlag und
 * Weitergabe. Drei Wege liefen ohne ihn:
 *
 *  - **Sichten** durch eine Stelle, die nicht Sichter ist: Ein Fachberater
 *    nahm dem Sichter eine Nachricht ohne Rückfrage aus der Warteschlange.
 *  - **Eingang aufnehmen** ohne die Stelle FmZ (der Aufnahmevermerk ist Feld
 *    1, 2 und 6, also der obere Teil).
 *  - **Papier-Nachtrag** mit Annahme, Beförderung oder Nummer ohne die
 *    Stelle FmZ.
 *
 * Die Regel steht hier im Kontrakt, weil Worker und Renderer sie beide lesen
 * (wie `sichterBesetzt`): Der Worker verlangt dann einen `grund`
 * (`brauchtGrund` mit `stelle` und `hinweis`), der Renderer kann vorher
 * fragen. **Ausgenommen sind die Ersatzregeln**: Ist kein Sichter besetzt,
 * sichtet die FmZ oder der LdF ohne Rückfrage; der Worker schreibt dann
 * `GRUND_ERSATZSICHTER` an die Sichtung.
 */

import { projektion } from "@s1/domaene";

import type { Entwurf } from "./index.js";

/** Die Stellen, denen der Vordruck Teile vorbehält. */
export const STELLE_SICHTER = "SICHTER";
export const STELLE_FMZ = "FMZ";
const STELLE_LDF = "LDF";

export const TEXT_VORBEHALT_SICHTER = "Sichten ist dem Sichter vorbehalten (Vordruck, Felder 18 bis 20). Trotzdem sichten?";
export const TEXT_VORBEHALT_FMZ = "Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6). Trotzdem eintragen?";

/** Was die Regel über Sitzung und Präsenz wissen muss. */
export interface Vorbehaltsumfeld {
  /** Die Stellen der Sitzung. */
  readonly stellen: readonly string[];
  /** Ein lebender Arbeitsplatz (dieser oder ein anderer) hat die Stelle SICHTER. */
  readonly sichterBesetzt: boolean;
  /**
   * Die Sichtung gilt einer Gesprächsnotiz, die diese Sitzung verfasst hat:
   * Ihr Verfasser verteilt sie aus eigenem Recht (§5, Folie 28) — kein Vorbehalt.
   */
  readonly eigeneGespraechsnotiz?: boolean;
}

/** Ein Vorbehalt, den die Sitzung nicht erfüllt: die Stelle und der Satz mit „Trotzdem“. */
export interface Vorbehalt {
  readonly stelle: typeof STELLE_SICHTER | typeof STELLE_FMZ;
  readonly meldung: string;
}

function objekt(wert: unknown): Record<string, unknown> | undefined {
  return typeof wert === "object" && wert !== null && !Array.isArray(wert) ? (wert as Record<string, unknown>) : undefined;
}

/**
 * Die Ersatzregel des Sichters (§5): Ist kein Sichter besetzt, sichtet, wer
 * die Nachricht in der FmZ hat — der Fernmelder oder, mit LdF als Station,
 * der LdF (R2-LdF P1-3). Dann braucht die Sichtung keinen weiteren Grund.
 */
export function istErsatzsichter(umfeld: Vorbehaltsumfeld): boolean {
  if (umfeld.stellen.includes(STELLE_SICHTER) || umfeld.sichterBesetzt) return false;
  return umfeld.stellen.includes(STELLE_FMZ) || umfeld.stellen.includes(STELLE_LDF);
}

/** Trägt die Anlage Werte des oberen Teils, die die FmZ schreibt (Aufnahme, Annahme, Beförderung, Nummer)? */
export function hatFmzWerte(entwurf: Pick<Entwurf, "nutzlast" | "nachrichtenfolge">): boolean {
  const folge = entwurf.nachrichtenfolge;
  if (objekt(objekt(entwurf.nutzlast)?.["aufnahme"]) !== undefined) return true;
  return folge !== undefined && (folge.annahme !== undefined || folge.befoerderung !== undefined || folge.nachweis !== undefined);
}

/**
 * Der Vorbehalt, den dieser Entwurf berührt und die Sitzung nicht erfüllt —
 * oder `undefined`. Ein Entwurf mit `grund` ist freigegeben („Trotzdem“); eine
 * Rücknahme (Sichtung auf `null`) ist kein Sichten.
 */
export function stellenvorbehalt(entwurf: Pick<Entwurf, "typ" | "nutzlast" | "neu" | "grund" | "nachrichtenfolge">, umfeld: Vorbehaltsumfeld): Vorbehalt | undefined {
  if (entwurf.grund !== undefined && entwurf.grund.trim() !== "") return undefined;
  if (entwurf.typ === "NachrichtGesichtet") {
    if (objekt(entwurf.neu) === undefined || umfeld.stellen.includes(STELLE_SICHTER) || istErsatzsichter(umfeld)) return undefined;
    if (umfeld.eigeneGespraechsnotiz === true) return undefined;
    return { stelle: STELLE_SICHTER, meldung: TEXT_VORBEHALT_SICHTER };
  }
  if (entwurf.typ === "NachrichtVerfasst" && hatFmzWerte(entwurf) && !umfeld.stellen.includes(STELLE_FMZ)) {
    return { stelle: STELLE_FMZ, meldung: TEXT_VORBEHALT_FMZ };
  }
  return undefined;
}

/** Der `grund` nach „Trotzdem“: „Eintrag durch Fachberater, nicht Sichter“ — wie `eintragsgrund` der Masken. */
export function vorbehaltsgrund(vorbehalt: Pick<Vorbehalt, "stelle">, stellen: readonly string[]): string {
  const durch = stellen.length === 0 ? "Arbeitsplatz ohne Stelle" : stellen.map(projektion.stellenWort).join(", ");
  return `Eintrag durch ${durch}, nicht ${projektion.stellenWort(vorbehalt.stelle)}`;
}
