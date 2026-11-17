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

import { STELLE_LDF, ldfBesetzt } from "../kontrakt/ldfschritte.js";
import { useLaden } from "./laden.js";

/** Die Stelle der FmZ in der Liste der Stellen (NACHRICHT_STELLEN). */
export const STELLE_FMZ = "FMZ";

/** Die Schritte des oberen Teils: Annehmen, Befördern, Nachweisen (FMZ), Vorschlag und Weitergabe (LDF). */
export type Vorbehaltsschritt = "annahme" | "befoerderung" | "nachweis" | "vorschlag" | "weitergabe";

export const TEXT_VORBEHALT = "Dieser Teil ist der Fernmeldezentrale vorbehalten (Vordruck, Felder 1 bis 6). Trotzdem eintragen?";

/** Die Stelle, der der Schritt vorbehalten ist. */
export function vorbehaltsstelle(schritt: Vorbehaltsschritt): string {
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
): boolean {
  const gesucht = vorbehaltsstelle(schritt);
  if (eigene.includes(gesucht)) return false;
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
}

/** Der Vorbehalt für eine offene Maske; „Trotzdem“ gilt nur für diese Maske. */
export function useStellenvorbehalt(schritt: Vorbehaltsschritt): Stellenvorbehalt {
  const eigene = useLaden((z) => z.lagebild?.sitzung?.stellen) ?? [];
  const peers = useLaden((z) => z.lagebild?.peers) ?? [];
  const [frei, setzeFrei] = useState(false);
  if (!stelleFehlt(schritt, eigene, peers)) return { hinweis: null, gesperrt: false, grund: undefined };
  const grund = eintragsgrund(schritt, eigene);
  if (frei) return { hinweis: <p className="hinweistext" role="status">Wird vermerkt als: {grund}.</p>, gesperrt: false, grund };
  return {
    hinweis: (
      <p className="warnung" role="status">
        {TEXT_VORBEHALT}{" "}
        <button type="button" onClick={() => setzeFrei(true)}>
          Trotzdem
        </button>
      </p>
    ),
    gesperrt: true,
    grund: undefined,
  };
}
