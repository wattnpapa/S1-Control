/**
 * Die Arbeitsplätze der Fernmeldezentrale auf einen Blick — für den LdF.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (LdF-A1, Fernmelder Fm-A1, S6
 * S6-A3): je Platz besetzt von wem, zuletzt gesehen, was ihm zugeteilt ist
 * und welche Rufgruppen er abhört. Die Angaben standen verstreut in
 * Statuszeile, Diagnose, Zuteilungsmaske und Funkplan.
 *
 * Keine neuen Daten: Präsenz (Stellen, Handzeichen, Wanduhr), die Zuteilung
 * des LdF an der Nachricht (`vorschlag.fernmelder`, Annahme) und das Feld
 * „hört“ der Rufgruppe. „hört“ ist Freitext; eine Rufgruppe gilt als
 * abgehört von einem Platz, wenn der Text dessen Namen als Wort enthält
 * („Fm1“, „Fm 1“, „LdF“).
 */

import { FERNMELDERSTELLEN, fernmeldername } from "../fernmelderstellen.js";
import type { Nachrichtenzeile } from "./nachrichtenzeile.js";

/** Ein lebender oder veralteter Arbeitsplatz aus der Präsenz. */
export interface Praesenzplatz {
  readonly anzeigename: string;
  readonly stellen?: readonly string[] | undefined;
  readonly handzeichen?: string | undefined;
  /** Wanduhr des letzten Lebenszeichens. */
  readonly wanduhr?: string | undefined;
  readonly veraltet: boolean;
}

export interface Fmzplatz {
  /** Stellenschlüssel: LDF, SICHTER, FM1 … */
  readonly stelle: string;
  /** „LdF“, „Sichter“, „Fm1“ … */
  readonly name: string;
  /** Wer die Stelle besetzt hält, mit Handzeichen; leer heißt unbesetzt. */
  readonly besetzt: readonly { readonly anzeigename: string; readonly handzeichen?: string; readonly zuletzt?: string }[];
  /** Zugeteilt und noch nicht befördert. */
  readonly zugeteilt: number;
  /** Davon schon angenommen. */
  readonly angenommen: number;
  /** Seit wann die älteste offene Zuteilung liegt. */
  readonly aeltesteSeit?: string;
  /** Rufgruppen, deren „hört“ diesen Platz nennt. */
  readonly rufgruppen: readonly string[];
}

const LEITSTELLEN: readonly { readonly stelle: string; readonly name: string }[] = [
  { stelle: "LDF", name: "LdF" },
  { stelle: "SICHTER", name: "Sichter" },
];

function plaetze(): readonly { readonly stelle: string; readonly name: string }[] {
  return [...LEITSTELLEN, ...FERNMELDERSTELLEN.map((stelle) => ({ stelle, name: fernmeldername(stelle) ?? stelle }))];
}

/** „Fm1“ trifft „Fm1“, „Fm 1“ und „fm1“ als Wort, nicht „Fm12“. */
export function hoertPlatz(hoert: string | undefined, name: string): boolean {
  if (hoert === undefined || hoert.trim() === "") return false;
  const muster = name.replace(/(\d+)$/u, "\\s*$1");
  return new RegExp(`(^|[^\\p{L}\\d])${muster}(?![\\p{L}\\d])`, "iu").test(hoert);
}

function besetzung(praesenz: readonly Praesenzplatz[], stelle: string): Fmzplatz["besetzt"] {
  return praesenz
    .filter((p) => !p.veraltet && (p.stellen ?? []).includes(stelle))
    .map((p) => ({
      anzeigename: p.anzeigename,
      ...(p.handzeichen === undefined || p.handzeichen === "" ? {} : { handzeichen: p.handzeichen }),
      ...(p.wanduhr === undefined ? {} : { zuletzt: p.wanduhr }),
    }));
}

function zuteilungen(zeilen: readonly Nachrichtenzeile[], name: string): Pick<Fmzplatz, "zugeteilt" | "angenommen" | "aeltesteSeit"> {
  const offen = zeilen.filter((z) => !z.zurueckgezogen && z.befoerderung === undefined && z.vorschlag?.fernmelder.trim() === name);
  const seit = offen.map((z) => z.vorschlag?.zeitpunkt).filter((t): t is string => t !== undefined).sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  return {
    zugeteilt: offen.length,
    angenommen: offen.filter((z) => z.annahme !== undefined).length,
    ...(seit === undefined ? {} : { aeltesteSeit: seit }),
  };
}

export interface Fmzlage {
  readonly praesenz: readonly Praesenzplatz[];
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly rufgruppen: readonly { readonly name: string; readonly hoert?: string | undefined }[];
}

export function fmzPlaetze(lage: Fmzlage): readonly Fmzplatz[] {
  return plaetze().map(({ stelle, name }) => ({
    stelle,
    name,
    besetzt: besetzung(lage.praesenz, stelle),
    ...zuteilungen(lage.zeilen, name),
    rufgruppen: lage.rufgruppen.filter((r) => hoertPlatz(r.hoert, name)).map((r) => r.name),
  }));
}
