/**
 * Fahrzeuge, Personen und Meldung einer Einheit im Zustand finden.
 *
 * Die Einheiten des Demo-Einsatzes kommen aus Erfassungsbögen; ihre Fahrzeuge
 * und Personen bekommen die Kennungen der Übernahme. Schritte, die ein
 * Fahrzeug oder eine Person meinen, suchen sie deshalb beim Abspielen — in
 * fester Reihenfolge (nach Kennung), damit jeder Lauf dasselbe trifft.
 */

import type { FahrzeugZustand, MeldungZustand, PersonZustand, Zustand } from "@s1/domaene";

function nachKennung<T extends { readonly id: string }>(teile: readonly T[]): T[] {
  return [...teile].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Die Fahrzeuge der Einheit; mit `typ` nur die, deren Typ den Text enthält. */
export function fahrzeugeDer(zustand: Zustand, einheitId: string, typ?: string): FahrzeugZustand[] {
  const alle = Object.values(zustand.fahrzeuge).filter((f) => f.einheitId?.wert === einheitId && f.entfernt?.wert !== true);
  return nachKennung(typ === undefined ? alle : alle.filter((f) => f.typ.wert?.includes(typ) === true));
}

export function personenDer(zustand: Zustand, einheitId: string): PersonZustand[] {
  return nachKennung(Object.values(zustand.personen).filter((p) => p.einheitId?.wert === einheitId));
}

/** Die Meldung des Eingangskorbs, aus der die Einheit übernommen wurde. */
export function meldungDer(zustand: Zustand, einheitId: string): MeldungZustand | undefined {
  return Object.values(zustand.meldungen).find((m) => m.uebernahme?.wert?.einheitId === einheitId);
}
