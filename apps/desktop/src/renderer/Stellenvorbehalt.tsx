/**
 * Der Hinweis „Dieser Teil ist der Fernmeldezentrale vorbehalten“
 * (Entscheidung 13 vom 2026-11-17, Befund LdF P2-3; KONZEPT-NACHRICHTEN.md §11).
 *
 * Die Lehrunterlage (Folie 7) behält den oberen Teil des Vordrucks, Felder 1
 * bis 6, den Fernmeldern vor. Die Anwendung macht daraus **kein Recht und
 * keine Sperre** (Papier und Notbetrieb gehen vor, §4): Wer ohne die Stelle
 * FMZ annimmt, befördert oder nachweist, beziehungsweise ohne die Stelle LDF
 * einen Übermittlungsweg vorschlägt oder an den Sichter weitergibt, bekommt
 * vorher den Hinweis und gibt den Schritt mit „Trotzdem“ frei. Der Schritt
 * trägt dann einen `grund`, der im Tagebuch steht, damit nachvollziehbar
 * bleibt, wer den oberen Teil an der FmZ vorbei ausgefüllt hat.
 *
 * Gerechnet wird hier nur die Anzeige: Stellen der Sitzung und Präsenz kommen
 * aus dem Lagebild, die Ersatzregel (kein LdF besetzt, dann darf die FmZ den
 * Schritt des LdF) ist dieselbe wie beim Befördern (`ldfBesetzt`).
 */

import { useState } from "react";

import { projektion } from "@s1/domaene";

import { sichterBesetzt } from "../kontrakt/fmzschritte.js";
import { TEXT_VORBEHALT_SICHTER as TEXT_SICHTER_KONTRAKT, istErsatzsichter, vorbehaltstextFuer } from "../kontrakt/stellenvorbehalt.js";
import { STELLE_LDF, ldfBesetzt } from "../kontrakt/ldfschritte.js";
import { useLaden } from "./laden.js";

/** Die Stelle der FmZ in der Liste der Stellen (NACHRICHT_STELLEN). */
export const STELLE_FMZ = "FMZ";

/** Die Stelle des Sichters (NACHRICHT_STELLEN). */
export const STELLE_SICHTER = "SICHTER";

/**
 * Die Schritte des oberen Teils: Annehmen, Befördern, Nachweisen (FMZ), Vorschlag und Weitergabe (LDF).
 *
 * Additiv nach der zweiten Audit-Runde (R2-FaBe P0-1, R2-SGL P1-2, R2-FM P3-2):
 * „sichtung“ (Laufzettel und Nachsichten, Stelle SICHTER; die FmZ darf es
 * ohne besetzten Sichter, Ersatzregel §5), „aufnahme“ (Eingang aufnehmen,
 * FMZ) und „nachtrag“ (Papier-Nachtrag mit FmZ-Teil, FMZ). Vorher ging das
 * Sichten für jede Stelle ohne Hinweis, und der Nachtrag umging den
 * Hinweis der Annahme- und Beförderungsmaske.
 */
export type Vorbehaltsschritt = "annahme" | "befoerderung" | "nachweis" | "vorschlag" | "weitergabe" | "sichtung" | "aufnahme" | "nachtrag";

/**
 * Die Sätze kommen vollständig aus dem Kontrakt (`vorbehaltstextFuer`, R2-FaBe
 * P2-7, R2-LdF P3-1): je Schritt die Stelle, das Feld, wen man ruft und was
 * „Trotzdem“ tut — derselbe Wortlaut wie im Worker. Der eigene Satz des
 * Renderers für die FmZ-Schritte ist entfallen.
 */
export { vorbehaltstextFuer } from "../kontrakt/stellenvorbehalt.js";

/** Der Hinweis beim Sichten ohne Stelle Sichter (R2-FaBe P0-1): derselbe Satz wie im Worker (`kontrakt/stellenvorbehalt.ts`). */
export const TEXT_VORBEHALT_SICHTER = TEXT_SICHTER_KONTRAKT;

/** Der Satz des Hinweises je Schritt. */
export function vorbehaltstext(schritt: Vorbehaltsschritt): string {
  return vorbehaltstextFuer(schritt);
}

/** Die Stelle, der der Schritt vorbehalten ist. */
export function vorbehaltsstelle(schritt: Vorbehaltsschritt): string {
  if (schritt === "sichtung") return STELLE_SICHTER;
  return schritt === "vorschlag" || schritt === "weitergabe" ? STELLE_LDF : STELLE_FMZ;
}

/**
 * Fehlt der Sitzung die Stelle des Schritts? Die FmZ darf die Schritte des
 * LdF, solange kein LdF besetzt ist (Ersatzregel, §5).
 */
export function stelleFehlt(
  schritt: Vorbehaltsschritt,
  eigene: readonly string[],
  peers: Parameters<typeof ldfBesetzt>[1],
  saeumig = false,
): boolean {
  const gesucht = vorbehaltsstelle(schritt);
  if (eigene.includes(gesucht)) return false;
  // Ersatzsichter (§5): Ohne besetzten Sichter verteilt die FmZ (oder der LdF) selbst — dieselbe Regel wie im Worker.
  // R2-FM P2-5, R2-Si P2-2: ebenso bei besetztem, säumigem Sichter („Ich sichte jetzt selbst“).
  if (gesucht === STELLE_SICHTER) return !istErsatzsichter({ stellen: eigene, sichterBesetzt: sichterBesetzt(eigene, peers), sichterSaeumig: saeumig });
  return !(gesucht === STELLE_LDF && eigene.includes(STELLE_FMZ) && !ldfBesetzt(eigene, peers));
}

/** Der `grund` des Schritts: „Eintrag durch S4, nicht FmZ“ (für Schritte des LdF „nicht LdF“). */
export function eintragsgrund(schritt: Vorbehaltsschritt, eigene: readonly string[]): string {
  const durch = eigene.length === 0 ? "Arbeitsplatz ohne Stelle" : eigene.map(projektion.stellenWort).join(", ");
  return `Eintrag durch ${durch}, nicht ${projektion.stellenWort(vorbehaltsstelle(schritt))}`;
}

export interface Stellenvorbehalt {
  /** Der Hinweis mit „Trotzdem“, oder der Satz, was eingetragen wird; `null`, wenn die Stelle passt. */
  readonly hinweis: React.ReactNode;
  /** Solange wahr, ist der Schritt nicht freigegeben. */
  readonly gesperrt: boolean;
  /** Der Grund für den Entwurf, nur nach „Trotzdem“. */
  readonly grund: string | undefined;
  /**
   * Additiv (R2-FaBe P0-1): Der Worker hat mit `brauchtGrund` abgewiesen —
   * etwa weil die Präsenz dort anders stand als hier. Dann zeigt die Maske
   * den Hinweis, auch wenn sie selbst keinen erwartet hätte.
   */
  readonly erzwinge: () => void;
}

/** Der Vorbehalt für eine offene Maske; „Trotzdem“ gilt nur für diese Maske. */
export function useStellenvorbehalt(schritt: Vorbehaltsschritt, aktiv = true, saeumig = false): Stellenvorbehalt {
  const eigene = useLaden((z) => z.lagebild?.sitzung?.stellen) ?? [];
  const peers = useLaden((z) => z.lagebild?.peers) ?? [];
  const [frei, setzeFrei] = useState(false);
  const [erzwungen, setzeErzwungen] = useState(false);
  const erzwinge = (): void => setzeErzwungen(true);
  // `aktiv` falsch: Der Schritt kommt in dieser Lage der Maske nicht vor (etwa kein Nachtrag gewählt).
  if (!erzwungen && (!aktiv || !stelleFehlt(schritt, eigene, peers, saeumig))) return { hinweis: null, gesperrt: false, grund: undefined, erzwinge };
  const grund = eintragsgrund(schritt, eigene);
  if (frei) return { hinweis: <p className="hinweistext" role="status">Wird vermerkt als: {grund}.</p>, gesperrt: false, grund, erzwinge };
  return {
    hinweis: (
      <p className="warnung" role="status">
        {vorbehaltstext(schritt)}{" "}
        <button type="button" onClick={() => setzeFrei(true)}>
          Trotzdem
        </button>
      </p>
    ),
    gesperrt: true,
    grund: undefined,
    erzwinge,
  };
}

/** Ob der Worker den Schritt mangels Grund abgewiesen hat (§2.4, `brauchtGrund`). */
export function brauchtGrund(ergebnis: { readonly art: string } | undefined): boolean {
  return ergebnis?.art === "brauchtGrund";
}
