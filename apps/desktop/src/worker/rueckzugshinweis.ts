/**
 * Der Hinweis beim Zurückziehen einer schon verteilten Nachricht (Audits
 * Nachrichten Runde 2, R2-ETB P3-4).
 *
 * Das Zurückziehen fragte bei einer gesichteten, an S4 grün verteilten und
 * von S2 erledigten Nachricht dasselbe wie bei einer Fehlanlage und sagte
 * nicht, wer sie schon hat. Die Stellen des Verteilers sehen danach nur die
 * Marke im Posteingang; wer schon danach handelt, erfährt es nicht von selbst.
 * Der Worker nennt deshalb nach dem Zurückziehen die Stellen mit ihrem Stand
 * — als Warnung, damit jemand Bescheid gibt.
 */

import { projektion, type Zustand } from "@s1/domaene";
import type { Ereignisentwurf } from "@s1/speicher";

/** „S2 (erledigt), S4 (gelesen), Leiter (neu)“ — die Stellen des Verteilers mit ihrem Stand. */
function stellenMitStand(zeile: projektion.Nachrichtenzeile): string {
  return zeile.verteiler
    .map((m) => `${projektion.stellenWort(m.stelle)} (${m.erledigt ? "erledigt" : m.gelesen ? "gelesen" : "neu"})`)
    .join(", ");
}

/** Der Hinweis, wenn die Nachricht vor dem Zurückziehen schon verteilt war; sonst `undefined`. */
export function rueckzugshinweis(zustand: Zustand, entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ !== "NachrichtZurueckgezogen" || entwurf.neu !== true) return undefined;
  const nachrichtId = (entwurf.nutzlast as { nachrichtId?: unknown } | null | undefined)?.nachrichtId;
  if (typeof nachrichtId !== "string") return undefined;
  const zeile = projektion.nachrichtNach(zustand, nachrichtId);
  if (zeile === undefined || zeile.zurueckgezogen) return undefined;
  // Review 2026-11-21: Mit LdF als Station ist der Verteiler nach der Beförderung noch leer — die Gegenstelle hat sie trotzdem.
  if (zeile.verteiler.length === 0) return zeile.befoerderung === undefined ? undefined : schonUebermitteltText(zeile);
  const verteilt = `Die Nachricht ${projektion.nachrichtKurzname(zeile)} war schon verteilt: ${stellenMitStand(zeile)}. Diese Stellen sehen nur die Marke „zurückgezogen“ — bitte ihnen Bescheid geben.`;
  // Review Runde 2: Ein beförderter Ausgang ist auch draußen — die Gegenstelle gehört dazu.
  return zeile.befoerderung === undefined || zeile.richtung !== "AUSGANG" ? verteilt : `${verteilt} ${schonUebermitteltText(zeile)}`;
}

/** „… ist schon an OV Wildeshausen übermittelt (Funk, 1603 Ka) …“ — der Ausgang ist draußen, auch wenn noch niemand verteilt hat. */
export function schonUebermitteltText(zeile: Pick<projektion.Nachrichtenzeile, "befoerderung" | "gegenstelle" | "betreff">): string {
  const b = zeile.befoerderung;
  const an = zeile.gegenstelle === undefined ? "" : ` an ${zeile.gegenstelle}`;
  const wie = b === undefined ? "" : ` (${projektion.mittelWort(b.mittel)}, Hz. ${b.handzeichen})`;
  const name = zeile.betreff.trim() === "" ? "Die Nachricht" : `Die Nachricht „${zeile.betreff}“`;
  return `${name} ist schon${an} übermittelt${wie}. Zurückziehen hält sie nicht auf — bitte die Gegenstelle verständigen.`;
}
