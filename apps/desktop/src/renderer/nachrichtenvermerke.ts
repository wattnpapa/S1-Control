/**
 * Der Vermerk der FmZ an einem Ausgang für Ausgang, Lese-Ansicht und Vorschau
 * (Audit zweite Runde R2-FaBe P0-2, R2-SGL P3-4).
 *
 * Den Wortlaut („angenommen (Fm) 1710 Fm · Quittung der Gegenstelle 1720 Ha
 * (Telefon)", ohne Beförderung „… · noch nicht übermittelt") liefert Ring 2
 * als `fmzVermerkText` (`projektion.fmzVermerkTextAus`); hier steht nur der
 * Rückgriff für eine Zeile ohne diesen Text, damit Ausgang, Ansicht und
 * Vorschau nie zwei Sätze für dasselbe führen.
 */

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

/** Der Vermerk eines Ausgangs; ohne Text aus Ring 2 gilt die Nachricht als nicht übermittelt. */
export function ausgangsvermerk(zeile: Pick<Nachrichtenzeile, "fmzVermerkText">): string {
  return zeile.fmzVermerkText ?? projektion.TEXT_NICHT_UEBERMITTELT;
}

/** Ob der Satz für die Zeile gilt: nur ein Ausgang wird von der FmZ befördert. */
export function istAusgang(zeile: Pick<Nachrichtenzeile, "richtungKurz">): boolean {
  return zeile.richtungKurz === "A";
}
