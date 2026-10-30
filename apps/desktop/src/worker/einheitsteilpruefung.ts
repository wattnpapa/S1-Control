/**
 * Die Prüfungen über das Schema hinaus für Auftrag, Fahrzeug und Person
 * (§5.5, §5.6) — ein Teil von `pruefeNeu` im Aktendienst.
 *
 * Das Nutzlastschema verlangt einen Pflichttext mit **mindestens einem
 * Zeichen**; ein Leerzeichen erfüllt das. In einem append-only-Protokoll
 * bliebe ein Auftrag „ “ für immer stehen, und die Spalte K zeigte eine
 * Zeile ohne Inhalt. Und `AuftragBeendet` trägt sein Ende im Rahmen, nicht
 * in der Nutzlast — dort prüft das Schema nichts, und ein unlesbares Ende
 * machte aus einem laufenden Auftrag einen beendeten ohne Zeit.
 *
 * Eine eigene Datei, weil `aktendienst.ts` weit über der Grenze für neue
 * Dateien liegt; dort steht nur der Aufruf.
 */

import type { Ereignisentwurf } from "@s1/speicher";

/** Je Art die Pflichttexte der Nutzlast und ihr Wort in der Meldung. */
const PFLICHTTEXTE: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  AuftragErfasst: [["text", "Der Auftrag braucht einen Text."]],
  FahrzeugAngelegt: [["typ", "Das Fahrzeug braucht einen Typ."]],
  PersonHinzugefuegt: [
    ["nachname", "Die Person braucht einen Nachnamen."],
    ["vorname", "Die Person braucht einen Vornamen."],
  ],
};

function nurLeer(nutzlast: unknown, schluessel: string): boolean {
  if (typeof nutzlast !== "object" || nutzlast === null) return false;
  const wert = (nutzlast as Record<string, unknown>)[schluessel];
  return typeof wert === "string" && wert.trim() === "";
}

/** Liefert die Meldung, wenn der Entwurf nicht geschrieben werden darf. */
export function pruefeEinheitsteil(entwurf: Ereignisentwurf): string | undefined {
  if (entwurf.typ === "AuftragBeendet") {
    const neu: unknown = entwurf.neu;
    if (typeof neu !== "string" || Number.isNaN(new Date(neu).getTime())) {
      return "Das Ende des Auftrags ist keine lesbare Zeitangabe.";
    }
    return undefined;
  }
  const pflicht = PFLICHTTEXTE[entwurf.typ] ?? [];
  return pflicht.find(([schluessel]) => nurLeer(entwurf.nutzlast, schluessel))?.[1];
}
