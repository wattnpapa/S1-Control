/**
 * Der sichtbare Stand einer Nachricht für die Listen (additiv, 2026-11-17).
 *
 * Der Laufzustand des Folds (`VOR_FMZ` … `ERLEDIGT`, KONZEPT-NACHRICHTEN.md
 * §9) bleibt, wie er ist: Die Warteschlange der FmZ, der LdF und der Sichter
 * hängen an ihm, und eine Änderung dort wäre eine Änderung des Zustands
 * (`FOLD_VERSION`). Was die Audits bemängeln, ist die **Anzeige**:
 *
 *  * SGL P0-1 / Fernmelder P2: Ein Ausgang hieß nach der Beförderung
 *    „erledigt", auch ohne Nummer, und die Annahme war in der Liste nicht zu
 *    sehen. Deshalb hier ein feinerer Stand je Zeile, der „angenommen" und
 *    „befördert" trennt, und die Regel: **ohne Nummer nie „erledigt"**.
 *  * LdF P0-2 / Fernmelder P1-5: Die Zwanzig-Minuten-Marke maß nur ab der
 *    Annahme; was noch niemand angenommen hatte, blieb unbemerkt. Die
 *    Wartezeit läuft deshalb ab dem Eintreffen bei der FmZ — der HLC von
 *    `NachrichtVerfasst` (die Wanduhr des schreibenden Rechners beim
 *    Aufgeben), oder ab einer früheren Annahme, wenn die FmZ vom Papier
 *    nacherfasst hat.
 *
 * Reine Funktionen über Werten der Zeile; Ring 2 liest keine Uhr.
 */

import { datumZeitGruppe } from "../zeit/datumZeitGruppe.js";
import type { Laufzustand, Mittelvermerk, Zeitvermerk } from "../zustand-nachricht.js";
import { mittelWort } from "./tagebuch-nachrichten.js";

/** Der Stand je Zeile, wie die Listen ihn zeigen. */
export const LAUFSTAENDE = [
  "vorFmz",
  "beimLdf",
  "angenommen",
  "befoerdert",
  "vorSichter",
  "verteilt",
  "erledigt",
  "zurueckgezogen",
] as const;
export type Laufstand = (typeof LAUFSTAENDE)[number];

const LAUFSTAND_WORT: Readonly<Record<Laufstand, string>> = {
  vorFmz: "vor der FmZ",
  beimLdf: "beim LdF",
  angenommen: "angenommen (FmZ)",
  befoerdert: "befördert",
  vorSichter: "vor dem Sichter",
  verteilt: "verteilt",
  erledigt: "erledigt",
  zurueckgezogen: "zurückgezogen",
};

/** Das Wort eines Standes für Listen und Ansicht. */
export function laufstandWort(stand: Laufstand): string {
  return LAUFSTAND_WORT[stand];
}

/** Was {@link laufstandAus} von der Zeile braucht. */
export interface Laufstandangaben {
  readonly laufzustand: Laufzustand;
  readonly richtung: string;
  readonly gespraechsnotiz: boolean;
  readonly nummer?: number | undefined;
  readonly annahme?: Zeitvermerk | undefined;
  readonly sichtung?: unknown;
}

/**
 * Der Stand aus Laufzustand und Vermerken. Ein Ausgang ohne Sichtung ist
 * nach der Beförderung „befördert", nicht „erledigt" (SGL P0-1: erledigt
 * heißt beim Eingang „die Stelle hat bearbeitet", beim Ausgang nur „die
 * Funkstrecke ist bedient"); eine Nachricht ohne Nummer bleibt „verteilt".
 */
export function laufstandAus(angaben: Laufstandangaben): Laufstand {
  switch (angaben.laufzustand) {
    case "ZURUECKGEZOGEN":
      return "zurueckgezogen";
    case "VOR_LDF":
      return "beimLdf";
    case "VOR_FMZ":
      return angaben.annahme === undefined ? "vorFmz" : "angenommen";
    case "VOR_SICHTER":
      return "vorSichter";
    case "VERTEILT":
      return "verteilt";
    case "ERLEDIGT":
      if (angaben.richtung === "AUSGANG" && !angaben.gespraechsnotiz && angaben.sichtung === undefined) return "befoerdert";
      return angaben.nummer === undefined ? "verteilt" : "erledigt";
  }
}

/**
 * Die Marke „ohne Nummer": Die Nachricht hat die FmZ hinter sich (oder ist
 * ein Eingang, eine Gesprächsnotiz), trägt aber keine Nummer der Nachweisung
 * — die Lücke im Technischen Betriebsbuch (LdF P1-2, SGL P1-6).
 */
export function ohneNummerAus(stand: Laufstand, nummer: number | undefined): boolean {
  if (nummer !== undefined) return false;
  return stand !== "zurueckgezogen" && stand !== "vorFmz" && stand !== "beimLdf" && stand !== "angenommen";
}

/** Uhrzeit vierstellig in der Zeit des Vordrucks (Europe/Berlin), „1320". */
function uhrzeit(iso: string): string {
  return datumZeitGruppe(iso).slice(2, 6);
}

function vermerkteil(wort: string, vermerk: Zeitvermerk | undefined, mittel?: string): string | undefined {
  if (vermerk === undefined) return undefined;
  const teile = [wort, uhrzeit(vermerk.zeitpunkt), vermerk.handzeichen].filter((t) => t !== "");
  return mittel === undefined ? teile.join(" ") : `${teile.join(" ")} (${mittelWort(mittel)})`;
}

/**
 * „angenommen 1320 Fm · befördert 1321 Fm (Funk)" — der Vermerk der FmZ für
 * die Spalte „Stand" der Listen (SGL P0-1: Zeit, Handzeichen und Mittel
 * standen nur im aufgeschlagenen Vordruck). Beim Eingang die Aufnahme.
 */
export function fmzVermerkTextAus(
  aufnahme: Mittelvermerk | undefined,
  annahme: Zeitvermerk | undefined,
  befoerderung: Mittelvermerk | undefined,
): string | undefined {
  const teile = [
    vermerkteil("aufgenommen", aufnahme, aufnahme?.mittel),
    vermerkteil("angenommen", annahme),
    vermerkteil("befördert", befoerderung, befoerderung?.mittel),
  ].filter((t): t is string => t !== undefined);
  return teile.length === 0 ? undefined : teile.join(" · ");
}

/**
 * Seit wann die Nachricht bei der FmZ liegt (ms seit Epoche): das Eintreffen
 * (HLC der Anlage), oder eine frühere Annahme bei Nacherfassung vom Papier.
 */
export function eintreffenMs(angelegtMs: number, annahme: Zeitvermerk | undefined): number {
  const angenommen = annahme === undefined ? Number.NaN : Date.parse(annahme.zeitpunkt);
  return Number.isFinite(angenommen) && angenommen < angelegtMs ? angenommen : angelegtMs;
}

/**
 * Was die Wartezeit braucht. Die Zeile trägt es (`eintreffenBeiFmz`,
 * `vorSichterSeit`), der Zustand liefert es über `wartegrundlage` in
 * `nachrichtenzeile.ts` — eine Rechnung für Spalte und Band.
 */
export interface Wartegrundlage {
  readonly richtung: string;
  readonly gespraechsnotiz: boolean;
  readonly laufzustand: Laufzustand;
  /** ISO: seit wann der Ausgang bei der FmZ liegt (siehe {@link eintreffenMs}). */
  readonly eintreffenBeiFmz?: string | undefined;
  /** ISO: seit wann der Eingang vor dem Sichter liegt (Aufnahme oder Weitergabe des LdF). */
  readonly vorSichterSeit?: string | undefined;
}

/** Ganze Minuten von `seit` bis `jetzt`, nie negativ; `undefined`, wenn eines fehlt. */
function minutenZwischen(seit: string | undefined, jetzt: string | number | undefined): number | undefined {
  if (seit === undefined || jetzt === undefined) return undefined;
  const dauer = (typeof jetzt === "number" ? jetzt : Date.parse(jetzt)) - Date.parse(seit);
  return Number.isFinite(dauer) ? Math.max(0, Math.floor(dauer / 60000)) : undefined;
}

/**
 * Die Wartezeit eines Ausgangs bei der FmZ in ganzen Minuten — nur, solange
 * er nicht befördert ist (LdF P0-2).
 *
 * **Die eine Rechnung für Spalte „Wartet“ und Band** (zweiter Durchlauf der
 * Audits): Die Spalte zeigte 0 Minuten, während das Band dieselbe Nachricht
 * über der Schwelle zählte. Ursache: Die Zeile trug eine beim Abruf
 * gerechnete Minutenzahl, und das Blatt holt seine Zeilen nur neu, wenn sich
 * der Lagezeiger bewegt — die Zahl blieb bei 0 stehen, während das Lagebild
 * jede Minute gegen die Uhr des Workers neu zählte (dazu noch auf die Minute
 * abgerundet). Seitdem trägt die Zeile den Zeitpunkt des Eintreffens, und
 * Spalte wie Band rechnen mit dieser Funktion gegen dieselbe Zeit
 * (`Nachrichtenlage.gerechnetUm`).
 */
export function wartezeitAusGrundlage(grundlage: Wartegrundlage, jetzt: string | number | undefined): number | undefined {
  if (grundlage.richtung !== "AUSGANG" || grundlage.gespraechsnotiz) return undefined;
  if (grundlage.laufzustand !== "VOR_FMZ" && grundlage.laufzustand !== "VOR_LDF") return undefined;
  return minutenZwischen(grundlage.eintreffenBeiFmz, jetzt);
}

/** Die Wartezeit eines Eingangs vor dem Sichter in ganzen Minuten (Sichter P1-4); sonst `undefined`. */
export function vorSichterAusGrundlage(grundlage: Wartegrundlage, jetzt: string | number | undefined): number | undefined {
  if (grundlage.richtung !== "EINGANG" || grundlage.laufzustand !== "VOR_SICHTER") return undefined;
  return minutenZwischen(grundlage.vorSichterSeit, jetzt);
}

/** Über der Schwelle: mindestens so viele ganze Minuten, wie die Schwelle nennt. */
export function ueberWarteschwelle(minuten: number | undefined, schwelleMinuten: number): boolean {
  return minuten !== undefined && minuten >= schwelleMinuten;
}

/**
 * Die Wartezeit eines Ausgangs bei der FmZ in ganzen Minuten — nur, solange
 * er nicht befördert ist, und nur mit `jetzt` (LdF P0-2). Bestand; rechnet
 * über {@link wartezeitAusGrundlage}.
 */
export function wartetSeitAus(
  angaben: { readonly richtung: string; readonly gespraechsnotiz: boolean; readonly laufzustand: Laufzustand },
  seitMs: number,
  jetzt: string | undefined,
): number | undefined {
  const eintreffenBeiFmz = Number.isFinite(seitMs) ? new Date(seitMs).toISOString() : undefined;
  return wartezeitAusGrundlage({ ...angaben, eintreffenBeiFmz }, jetzt);
}

/** Stand und Marke einer Zeile — gesetzt aus der Projektion, sonst nachgerechnet. */
export function standDerZeile(
  zeile: Laufstandangaben & { readonly laufstand?: Laufstand | undefined; readonly ohneNummer?: boolean | undefined },
): { readonly laufstand: Laufstand; readonly ohneNummer: boolean } {
  const laufstand = zeile.laufstand ?? laufstandAus(zeile);
  return { laufstand, ohneNummer: zeile.ohneNummer ?? ohneNummerAus(laufstand, zeile.nummer) };
}
