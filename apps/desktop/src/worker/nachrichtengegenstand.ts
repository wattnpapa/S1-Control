/**
 * Der Gegenstand eines Nachrichtenschritts für die Statuszeile und
 * „Rückgängig“ (Audit Fernmelder P3-1): „Nachricht A 7 ‚Sperrung B212‘“ statt
 * des nackten „Nachricht A“, damit der Fernmelder an der Rückmeldung erkennt,
 * welche Nachricht er gerade angefasst hat.
 *
 * Der Domänenname (`projektion.ereignisgegenstand`) bleibt unverändert; hier
 * wird nur der Betreff angehängt — der Worker kennt den Zustand, der
 * Renderer nur das Lagebild.
 */

import { projektion, type EingehendesEreignis, type Zustand } from "@s1/domaene";

/** Wie lang der Betreff in der Statuszeile höchstens wird, damit die Zeile nicht umbricht. */
const BETREFF_MAX = 40;

function betreffVon(zustand: Zustand, ereignis: EingehendesEreignis): string | undefined {
  const nutzlast = ereignis.nutzlast;
  const id = typeof nutzlast === "object" && nutzlast !== null ? (nutzlast as { nachrichtId?: unknown }).nachrichtId : undefined;
  if (typeof id !== "string") return undefined;
  const wert = zustand.nachrichten?.[id]?.betreff?.wert;
  const betreff = typeof wert === "string" ? wert.trim() : "";
  if (betreff === "") return undefined;
  return betreff.length > BETREFF_MAX ? `${betreff.slice(0, BETREFF_MAX - 1)}…` : betreff;
}

/** Der Gegenstand des Ereignisses; bei einer Nachricht mit Betreff angehängt in Anführungszeichen. */
export function gegenstandMitBetreff(zustand: Zustand, ereignis: EingehendesEreignis): string {
  const gegenstand = projektion.ereignisgegenstand(zustand, ereignis);
  if (!/^(Nachricht|Gesprächsnotiz) /u.test(gegenstand)) return gegenstand;
  const betreff = betreffVon(zustand, ereignis);
  return betreff === undefined ? gegenstand : `${gegenstand} ‚${betreff}‘`;
}
