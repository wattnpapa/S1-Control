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

/** Der Satz, solange ein Ausgang die FmZ nicht verlassen hat (R2-FaBe P0-2): niemand soll ihn für angekommen halten. */
export const TEXT_NICHT_UEBERMITTELT = "noch nicht übermittelt";

/** Die Beschriftung der Beförderungszeit eines Ausgangs: Sie ist die Quittung der Gegenstelle, nicht die der FmZ. */
export const TITEL_QUITTUNG_GEGENSTELLE = "Quittung der Gegenstelle";

function vermerkteil(wort: string, vermerk: Zeitvermerk | undefined, mittel?: string): string | undefined {
  if (vermerk === undefined) return undefined;
  const teile = [wort, uhrzeit(vermerk.zeitpunkt), vermerk.handzeichen].filter((t) => t !== "");
  return mittel === undefined || mittel === "" ? teile.join(" ") : `${teile.join(" ")} (${mittelWort(mittel)})`;
}

/**
 * Der Vermerk der FmZ in Worten für die Spalte „Stand" und die Lese-Ansicht
 * (SGL P0-1; Wortlaut nach R2-FaBe P0-2, R2-SGL P3-4). Annahme und Aufnahme
 * sind Vermerke der eigenen FmZ und heißen so; die Beförderungszeit ist die
 * Quittung der Gegenstelle. Ein Fachberater las „angenommen 2040 Fm" als
 * Bestätigung des Empfängers.
 *
 * - Ausgang: „angenommen (FmZ) 1710 Fm · Quittung der Gegenstelle 1720 Ha
 *   (Telefon)"; ohne Beförderung „… · noch nicht übermittelt", ganz ohne
 *   Vermerk nur „noch nicht übermittelt".
 * - Eingang: „aufgenommen (FmZ) 1705 Fm (Funk)"; ohne Aufnahme `undefined`.
 */
export function fmzVermerkTextAus(
  aufnahme: Mittelvermerk | undefined,
  annahme: Zeitvermerk | undefined,
  befoerderung: Mittelvermerk | undefined,
  ausgang = false,
): string | undefined {
  const quittung = vermerkteil(TITEL_QUITTUNG_GEGENSTELLE, befoerderung, befoerderung?.mittel);
  const teile = [
    vermerkteil("aufgenommen (FmZ)", aufnahme, aufnahme?.mittel),
    vermerkteil("angenommen (FmZ)", annahme),
    quittung ?? (ausgang ? TEXT_NICHT_UEBERMITTELT : undefined),
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
  /**
   * Additiv (R2-LdF P1-2, R2-Si P1-1): seit wann die Nachricht beim LdF liegt
   * — der Eingang ab der Aufnahme, der Ausgang ab der Annahme (ISO).
   */
  readonly vorLdfSeit?: string | undefined;
  /** Additiv (FOLD_VERSION 16): der Ausgang ist befördert — beim LdF zählt die Zeit ab der Beförderung. */
  readonly befoerdert?: boolean | undefined;
}

/**
 * Der Schritt, auf den eine Nachricht beim LdF wartet (2026-11-21):
 * „zuteilung“ — ein Ausgang vor der Beförderung, der LdF teilt ihn einem
 * Fernmelder zu; „weitergabe“ — ein Eingang oder ein beförderter Ausgang,
 * der LdF trägt die Nachweisung ein und gibt an den Sichter.
 */
export type Ldfschritt = "zuteilung" | "weitergabe";

export function ldfSchrittDer(zeile: { readonly laufzustand: Laufzustand; readonly richtung: string; readonly befoerderung?: unknown }): Ldfschritt | undefined {
  if (zeile.laufzustand !== "VOR_LDF") return undefined;
  return zeile.richtung === "AUSGANG" && zeile.befoerderung === undefined ? "zuteilung" : "weitergabe";
}

/**
 * Ein beförderter Ausgang, der beim LdF auf Nachweisung und Weitergabe
 * wartet, obwohl kein LdF besetzt ist (Review 2026-11-21): Die Ersatzregel
 * greift nur im Augenblick der Beförderung; ging der LdF danach, gibt ein
 * Fernmelder ihn selbst weiter. Nur `false` zählt — ohne Angabe gilt besetzt.
 */
export function haengtBeimLdf(zeile: { readonly laufzustand: Laufzustand; readonly richtung: string; readonly befoerderung?: unknown }, ldfBesetzt: boolean | undefined): boolean {
  return ldfBesetzt === false && zeile.richtung === "AUSGANG" && ldfSchrittDer(zeile) === "weitergabe";
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
  // FOLD_VERSION 16: Befördert und wieder beim LdF zählt die Zeit seit der Beförderung, nicht seit der Aufgabe.
  if (grundlage.befoerdert === true) return minutenZwischen(grundlage.vorLdfSeit, jetzt);
  return minutenZwischen(grundlage.eintreffenBeiFmz, jetzt);
}

/** Die Wartezeit eines Eingangs vor dem Sichter in ganzen Minuten (Sichter P1-4); sonst `undefined`. */
export function vorSichterAusGrundlage(grundlage: Wartegrundlage, jetzt: string | number | undefined): number | undefined {
  // 2026-11-21: auch der beförderte Ausgang (nicht die Gesprächsnotiz), der vor dem Sichter wartet.
  const ausgang = grundlage.richtung === "AUSGANG" && !grundlage.gespraechsnotiz;
  if ((grundlage.richtung !== "EINGANG" && !ausgang) || grundlage.laufzustand !== "VOR_SICHTER") return undefined;
  return minutenZwischen(grundlage.vorSichterSeit, jetzt);
}

/**
 * Die Wartezeit beim LdF in ganzen Minuten (R2-LdF P1-2): Ein Eingang hatte
 * dort keine Uhr, die Stau-Warnung begann erst mit der Weitergabe. Nur im
 * Laufzustand VOR_LDF; sonst `undefined`.
 */
export function vorLdfAusGrundlage(grundlage: Wartegrundlage, jetzt: string | number | undefined): number | undefined {
  if (grundlage.laufzustand !== "VOR_LDF") return undefined;
  return minutenZwischen(grundlage.vorLdfSeit, jetzt);
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
