/**
 * Die Plandatei aus 05-UMSETZUNGSPLAN.md, M0.4.
 *
 * Sie beschreibt einen Lauf **vollständig**: Startwert, Zahl der Clients, Zahl
 * der Kommandos, Störprofil und Fehlerinjektion. Zwei Läufe mit derselben
 * Plandatei sind derselbe Lauf — das ist die Bedingung „reproduzierbar
 * konvergent" aus der DoD, und ein roter Lauf ist allein aus seinem Plan
 * wiederholbar.
 *
 * Bewusst reines JSON ohne Schema-Bibliothek: Der Plan wird von Hand
 * geschrieben und von der Simulation gelesen, und jede unbekannte oder falsch
 * getippte Angabe soll benannt werden, statt still auf einen Vorgabewert zu
 * fallen.
 */

import {
  SEGMENTGROESSE_BYTE,
  TAKT_A_MS,
  TAKT_B_MS,
} from "@s1/speicher";

import { OHNE_STOERUNG, VOLLE_STOERUNG, type Stoerprofil } from "./feindlichesDateisystem.js";

/**
 * Die Fehlerinjektion aus der DoD — Kill mitten im Append, Partition,
 * Uhrsprung — sowie die weiteren Fehlerbilder, die §9 (Auflage 15) als vom
 * Konzept behandelt aufführt.
 *
 * Alle Werte sind Wahrscheinlichkeiten je Kommando, nicht je Aufruf: So hängt
 * die Zahl der Störungen an der Zahl der Bedienschritte und nicht daran, wie
 * viele Dateizugriffe eine Umsetzung zufällig braucht.
 */
export interface Fehlerinjektion {
  /** Harter Abbruch mitten im lokalen Anhang samt Neustart der Akte (§5.2, §8.1). */
  readonly kill: number;
  /** §8.3: Der Share ist für eine Weile nicht erreichbar. */
  readonly partition: number;
  readonly partitionMs: number;
  /** §3.2: Die Wanduhr eines Clients springt. Richtung wird gezogen. */
  readonly uhrsprung: number;
  readonly uhrsprungMs: number;
  /** §8.9 „dauerhaft": Entzug des Schreibrechts auf dem Share für eine Weile. */
  readonly schreibrechtEntzug: number;
  readonly schreibrechtEntzugMs: number;
  /** §8.2: Ein Byte in einer fremden Share-Datei kippt — Quarantäne beim Leser. */
  readonly beschaedigung: number;
  /** §4.5 Fall 2: Ein Profil wird geklont; ein zweiter Prozess schreibt unter derselben Kennung. */
  readonly profilKlon: number;
  /** §8.8: Der lokale Schreibweg scheitert. */
  readonly lokaleSchreibstoerung: number;
}

export const OHNE_FEHLER: Fehlerinjektion = {
  kill: 0,
  partition: 0,
  partitionMs: 0,
  uhrsprung: 0,
  uhrsprungMs: 0,
  schreibrechtEntzug: 0,
  schreibrechtEntzugMs: 0,
  beschaedigung: 0,
  profilKlon: 0,
  lokaleSchreibstoerung: 0,
};

/**
 * Die Fehlerinjektion der Abnahme.
 *
 * Die Werte sind so gewählt, dass jede Störung in 2.000 Kommandos mehrfach
 * vorkommt; der Bericht weist am Ende nach, dass keine davon null Mal griff.
 * Ein Lauf, in dem eine geforderte Störung gar nicht auftrat, ist kein
 * Nachweis über sie, sondern ein Lauf ohne sie.
 */
export const ALLE_FEHLER: Fehlerinjektion = {
  kill: 0.01,
  partition: 0.004,
  partitionMs: 20_000,
  uhrsprung: 0.004,
  uhrsprungMs: 8 * 60 * 1000,
  schreibrechtEntzug: 0.002,
  schreibrechtEntzugMs: 30_000,
  beschaedigung: 0.002,
  profilKlon: 0.001,
  lokaleSchreibstoerung: 0.006,
};

export interface Plan {
  /** Der Startwert. Alles Weitere folgt aus ihm (§7.6, DoD „reproduzierbar"). */
  readonly startwert: number;
  readonly clients: number;
  /** Zahl der fachlichen Bedienschritte über alle Clients (DoD: 2.000). */
  readonly kommandos: number;
  /**
   * In wie viele Abschnitte die Kommandos zerfallen. Nach jedem Abschnitt wird
   * eine Ruhephase hergestellt und verglichen — „Konvergenzvergleich per Hash
   * **nach jeder Ruhephase**" (M0.4).
   */
  readonly phasen: number;
  readonly profil: Stoerprofil;
  readonly fehler: Fehlerinjektion;
  readonly segmentgroesse: number;
  readonly taktAMs: number;
  readonly taktBMs: number;
  /**
   * Wie viele Ruhe-Durchläufe höchstens versucht werden, bevor der Lauf als
   * „Ruhe nicht erreicht" endet.
   *
   * Das ist keine Bequemlichkeit, sondern die Abgrenzung zum Abbruchkriterium:
   * Ein Lauf, der nicht zur Ruhe kommt, ist **nicht** dasselbe wie ein Lauf mit
   * verschiedenen Hashes und wird auch nicht so gemeldet (§7.6, dritte Zeile).
   */
  readonly ruheVersucheMax: number;
  readonly einsatzId: string;
}

/** Der Plan der Abnahme: 4 Clients, 2.000 Kommandos, alle Störungen (DoD M0.4). */
export function abnahmePlan(startwert = 20260904): Plan {
  return {
    startwert,
    clients: 4,
    kommandos: 2_000,
    phasen: 5,
    profil: VOLLE_STOERUNG,
    fehler: ALLE_FEHLER,
    // Deutlich unter dem Startwert von 4 MiB (§4.2): Ohne Segmentwechsel
    // prüfte der Lauf weder §4.3 noch die Verfallsregel aus §6.2 noch die
    // aufsteigende Spiegelung aus §5.4.4. Der Startwert selbst wird davon
    // nicht berührt — er steht unverändert in `startwerte.ts` (§10, A4).
    segmentgroesse: 24 * 1024,
    taktAMs: TAKT_A_MS,
    taktBMs: TAKT_B_MS,
    ruheVersucheMax: 400,
    einsatzId: "2026-09-09_hochwasser-weser-ems_a1b2c3",
  };
}

/** Derselbe Plan ohne jede Störung — der Vergleichslauf. */
export function ruhigerPlan(startwert = 20260904): Plan {
  return { ...abnahmePlan(startwert), profil: OHNE_STOERUNG, fehler: OHNE_FEHLER };
}

/** Ein Feld aus dem Plan, das nicht gesetzt sein muss. */
type Teilplan = { readonly [K in keyof Plan]?: unknown };

function zahl(wert: unknown, name: string, vorgabe: number): number {
  if (wert === undefined) return vorgabe;
  if (typeof wert !== "number" || !Number.isFinite(wert)) {
    throw new TypeError(`Plandatei: ${name} muss eine Zahl sein, ist ${JSON.stringify(wert)}`);
  }
  return wert;
}

function teilprofil(wert: unknown, vorgabe: Stoerprofil): Stoerprofil {
  if (wert === undefined) return vorgabe;
  if (typeof wert !== "object" || wert === null) {
    throw new TypeError("Plandatei: profil muss ein Objekt sein");
  }
  const roh = wert as Record<string, unknown>;
  for (const schluessel of Object.keys(roh)) {
    if (!(schluessel in vorgabe)) {
      throw new TypeError(`Plandatei: profil kennt kein Feld ${JSON.stringify(schluessel)}`);
    }
  }
  const ergebnis: Record<string, number> = { ...vorgabe };
  for (const [schluessel, vorgabewert] of Object.entries(vorgabe)) {
    ergebnis[schluessel] = zahl(roh[schluessel], `profil.${schluessel}`, vorgabewert);
  }
  return ergebnis as unknown as Stoerprofil;
}

function teilfehler(wert: unknown, vorgabe: Fehlerinjektion): Fehlerinjektion {
  if (wert === undefined) return vorgabe;
  if (typeof wert !== "object" || wert === null) {
    throw new TypeError("Plandatei: fehler muss ein Objekt sein");
  }
  const roh = wert as Record<string, unknown>;
  for (const schluessel of Object.keys(roh)) {
    if (!(schluessel in vorgabe)) {
      throw new TypeError(`Plandatei: fehler kennt kein Feld ${JSON.stringify(schluessel)}`);
    }
  }
  const ergebnis: Record<string, number> = { ...vorgabe };
  for (const [schluessel, vorgabewert] of Object.entries(vorgabe)) {
    ergebnis[schluessel] = zahl(roh[schluessel], `fehler.${schluessel}`, vorgabewert);
  }
  return ergebnis as unknown as Fehlerinjektion;
}

/**
 * Deutet den Inhalt einer Plandatei.
 *
 * Fehlende Felder fallen auf den Abnahmeplan zurück; **unbekannte** Felder sind
 * ein Fehler. Ein vertipptes `kommandi: 5000` still zu ignorieren hieße, einen
 * Lauf zu melden, den niemand angefordert hat.
 */
export function deutePlan(text: string, vorgabe: Plan = abnahmePlan()): Plan {
  let roh: unknown;
  try {
    roh = JSON.parse(text);
  } catch (fehler) {
    throw new SyntaxError(`Plandatei ist kein gültiges JSON: ${(fehler as Error).message}`, {
      cause: fehler,
    });
  }
  if (typeof roh !== "object" || roh === null || Array.isArray(roh)) {
    throw new TypeError("Plandatei muss ein JSON-Objekt sein");
  }
  const p = roh as Teilplan & Record<string, unknown>;
  for (const schluessel of Object.keys(p)) {
    if (!(schluessel in vorgabe)) {
      throw new TypeError(`Plandatei kennt kein Feld ${JSON.stringify(schluessel)}`);
    }
  }
  const einsatzId = p.einsatzId ?? vorgabe.einsatzId;
  if (typeof einsatzId !== "string" || einsatzId.length === 0) {
    throw new TypeError("Plandatei: einsatzId muss eine nicht leere Zeichenkette sein");
  }
  const plan: Plan = {
    startwert: zahl(p.startwert, "startwert", vorgabe.startwert),
    clients: zahl(p.clients, "clients", vorgabe.clients),
    kommandos: zahl(p.kommandos, "kommandos", vorgabe.kommandos),
    phasen: zahl(p.phasen, "phasen", vorgabe.phasen),
    profil: teilprofil(p.profil, vorgabe.profil),
    fehler: teilfehler(p.fehler, vorgabe.fehler),
    segmentgroesse: zahl(p.segmentgroesse, "segmentgroesse", vorgabe.segmentgroesse),
    taktAMs: zahl(p.taktAMs, "taktAMs", vorgabe.taktAMs),
    taktBMs: zahl(p.taktBMs, "taktBMs", vorgabe.taktBMs),
    ruheVersucheMax: zahl(p.ruheVersucheMax, "ruheVersucheMax", vorgabe.ruheVersucheMax),
    einsatzId,
  };
  pruefePlan(plan);
  return plan;
}

/** Weist Pläne ab, die keinen auswertbaren Lauf ergeben können. */
export function pruefePlan(plan: Plan): void {
  if (!Number.isInteger(plan.clients) || plan.clients < 2) {
    throw new RangeError(`Ein Konvergenzvergleich braucht mindestens 2 Clients, geplant sind ${plan.clients}`);
  }
  if (!Number.isInteger(plan.kommandos) || plan.kommandos < 1) {
    throw new RangeError(`kommandos muss mindestens 1 sein, ist ${plan.kommandos}`);
  }
  if (!Number.isInteger(plan.phasen) || plan.phasen < 1) {
    throw new RangeError(`phasen muss mindestens 1 sein, ist ${plan.phasen}`);
  }
  if (plan.segmentgroesse < 1024 || plan.segmentgroesse > SEGMENTGROESSE_BYTE) {
    throw new RangeError(
      `segmentgroesse muss zwischen 1024 und ${SEGMENTGROESSE_BYTE} liegen (§4.2, §10), ist ${plan.segmentgroesse}`,
    );
  }
  if (plan.taktAMs <= 0 || plan.taktBMs <= 0) {
    throw new RangeError("taktAMs und taktBMs müssen positiv sein (§6.2)");
  }
}
