/**
 * STAN-Vorschlag zu einem freien Einheitennamen (M1.4, aus v1
 * `stan/thw-stan-inference.ts`).
 *
 * Wie die Zeichen-Inferenz ein **Vorschlag**, kein Ereignis und kein
 * Bestandteil des Folds. Was der Bediener uebernimmt, wird als
 * `EinheitGemeldet` mit `vorlageId` geschrieben.
 *
 * Gegenueber v1 ist eines weggefallen: die Heuristiken `heuristicStrength`,
 * `heuristicVehicles`, `heuristicTacticalSign` und `heuristicVehicleSigns`.
 * Sie erfanden Sollstaerken und Fahrzeuglisten fuer Eintraege, bei denen die
 * StAN keine hergibt („ZTr" ⇒ 1/2/6, „TZ" ⇒ 1/4/20) — Zahlen ohne Beleg, die
 * in der Maske aber wie eine Sollstaerke aus der StAN aussehen. Ein Eintrag
 * ohne Sollstaerke liefert jetzt keine, und die Maske zeigt ein leeres Feld
 * statt einer erfundenen Zahl.
 */

import type { Organisation } from "../ereignis.js";
import { normalisiereText, wortmenge, zerlegeInWorte } from "../zeichen/text.js";
import { THW_STAN, type StanEintrag } from "./daten.js";

/** Kennungen, die keine Einheit beschreiben (v1 `EXCLUDED_IDS`). */
const AUSGENOMMEN: ReadonlySet<string> = new Set(["vorbemerkung", "anschreiben-stan"]);

/**
 * Ab dieser Uebereinstimmung gilt ein Eintrag als Treffer. Startwert aus v1
 * (0,45); nicht hergeleitet, sondern erprobt.
 */
export const STAN_SCHWELLE = 0.45;

const EINTRAEGE: readonly StanEintrag[] = THW_STAN.filter((eintrag) => !AUSGENOMMEN.has(eintrag.id));

export interface StanVorschlag extends StanEintrag {
  readonly sicherheit: number;
}

function schluesselworte(eintrag: StanEintrag): ReadonlySet<string> {
  const worte = new Set<string>(zerlegeInWorte(eintrag.titel));
  if (eintrag.quelldatei !== undefined) {
    for (const wort of zerlegeInWorte(eintrag.quelldatei)) worte.add(wort);
  }
  return worte;
}

function bewerte(suchworte: ReadonlySet<string>, eintrag: StanEintrag): number {
  if (suchworte.size === 0) return 0;
  const worte = schluesselworte(eintrag);
  if (worte.size === 0) return 0;
  let treffer = 0;
  for (const wort of suchworte) if (worte.has(wort)) treffer += 1;
  const anteil = treffer / suchworte.size;
  const kennungsBonus = worte.has(normalisiereText(eintrag.id).replace(/\s+/g, "")) ? 0.1 : 0;
  return Math.min(1, anteil + kennungsBonus);
}

/**
 * Sucht den am besten passenden StAN-Eintrag.
 *
 * Nur fuer das THW: Die StAN ist eine THW-Vorschrift, und ein Vorschlag aus
 * ihr fuer eine Feuerwehreinheit waere fachlich falsch. Zieldatenmodell §2.1
 * fuehrt fuer die uebrigen Organisationen eigene Kataloge (KatS-StAN Nds,
 * Feuerwehr), die M1.4 als eigene Datensaetze ergaenzt, sobald sie vorliegen.
 *
 * Bei Gleichstand gewinnt der zuerst gelistete Eintrag — die Reihenfolge des
 * Datensatzes ist fest, das Ergebnis damit reproduzierbar.
 */
export function schlageStanVor(organisation: Organisation, name: string): StanVorschlag | null {
  if (organisation !== "THW") return null;
  const suchworte = wortmenge(name);
  if (suchworte.size === 0) return null;

  let bestes: StanEintrag | null = null;
  let besteSicherheit = 0;
  for (const eintrag of EINTRAEGE) {
    const sicherheit = bewerte(suchworte, eintrag);
    if (sicherheit <= besteSicherheit) continue;
    bestes = eintrag;
    besteSicherheit = sicherheit;
  }
  if (bestes === null || besteSicherheit < STAN_SCHWELLE) return null;
  return { ...bestes, sicherheit: besteSicherheit };
}

/** Alle StAN-Eintraege, ohne die ausgenommenen Kennungen. */
export function stanEintraege(): readonly StanEintrag[] {
  return EINTRAEGE;
}
