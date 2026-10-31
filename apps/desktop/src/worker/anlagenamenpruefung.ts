/**
 * Pflichtnamen der Anlagen, die nur aus Leerzeichen bestehen dürfen — nie.
 *
 * Das Katalogschema verlangt einen Pflichttext mit mindestens einem Zeichen,
 * und ein Leerzeichen erfüllt das. Ein Abschnitt, eine Einheit, ein
 * Tagebucheintrag oder ein Dienstposten „ “ stünde für immer im
 * append-only-Protokoll und erschiene als Zeile ohne Inhalt. Ergänzt
 * `einheitsteilpruefung.ts` (Auftrag, Fahrzeug, Person) um die übrigen
 * Anlagen; ein Teil von `pruefeNeu` im Aktendienst.
 */

import type { Ereignisentwurf } from "@s1/speicher";

const PFLICHTNAMEN: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  AbschnittAngelegt: [["name", "Der Abschnitt braucht einen Namen."]],
  EinheitGemeldet: [["bezeichnung", "Die Einheit braucht eine Bezeichnung."]],
  EtbEintragErfasst: [["text", "Der Tagebucheintrag braucht einen Text."]],
  EtbEintragBerichtigt: [["text", "Die Berichtigung braucht einen Text."]],
  DienstpostenAngelegt: [
    ["teileinheit", "Der Dienstposten braucht eine Teileinheit."],
    ["funktion", "Der Dienstposten braucht eine Funktion."],
  ],
};

/** Liefert die Meldung, wenn ein Pflichtname leer oder nur Leerzeichen ist. */
export function pruefeAnlagenamen(entwurf: Ereignisentwurf): string | undefined {
  const regeln = PFLICHTNAMEN[entwurf.typ];
  if (regeln === undefined || typeof entwurf.nutzlast !== "object" || entwurf.nutzlast === null) return undefined;
  const nutzlast = entwurf.nutzlast as Record<string, unknown>;
  return regeln.find(([schluessel]) => {
    const wert = nutzlast[schluessel];
    return typeof wert === "string" && wert.trim() === "";
  })?.[1];
}
