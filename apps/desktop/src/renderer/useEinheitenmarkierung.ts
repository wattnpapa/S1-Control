/**
 * Die Markierung in der Einheitentabelle: welche Zeilen gewählt sind und wo
 * das Kontextmenü der Auswahl aufging.
 *
 * Klick markiert eine Zeile allein (ein zweiter Klick hebt sie auf), mit Strg
 * kommt sie dazu oder geht weg. Rechtsklick markiert ebenso, hebt aber nie
 * auf: Ohne Strg ist die Zeile danach allein markiert, mit Strg kommt sie
 * dazu — und das Kontextmenü gilt der Auswahl, die dann steht.
 */

import { useCallback, useState } from "react";

import type { Kontextort } from "./Klappmenue.js";
import { umgeschaltet } from "./useSpaltenwahl.js";

export interface Einheitenmarkierung {
  readonly markiert: readonly string[];
  /** Wo das Kontextmenü aufging; es gilt nur, solange etwas markiert ist. */
  readonly kontext: Kontextort | undefined;
  klick(einheitId: string, mitStrg: boolean): void;
  rechtsklick(einheitId: string, ereignis: React.MouseEvent): void;
  hebeAuf(): void;
  schliesseKontext(): void;
}

export function useEinheitenmarkierung(aufEinheit: (einheitId: string | undefined) => void): Einheitenmarkierung {
  const [markiert, setzeMarkiert] = useState<readonly string[]>([]);
  const [kontext, setzeKontext] = useState<Kontextort | undefined>(undefined);
  const hebeAuf = useCallback(() => {
    setzeMarkiert([]);
  }, []);
  const schliesseKontext = useCallback(() => {
    setzeKontext(undefined);
  }, []);
  return {
    markiert,
    kontext: markiert.length > 0 ? kontext : undefined,
    klick: (id, mitStrg) => {
      setzeMarkiert((bisher) => (mitStrg ? umgeschaltet(bisher, id) : bisher.length === 1 && bisher[0] === id ? [] : [id]));
      aufEinheit(id);
    },
    rechtsklick: (id, ereignis) => {
      // Das Menü des Browsers trüge hier nichts bei (Entwurf, offene Fragen).
      ereignis.preventDefault();
      const mitStrg = ereignis.ctrlKey || ereignis.metaKey;
      setzeMarkiert((bisher) => (!mitStrg ? [id] : bisher.includes(id) ? bisher : [...bisher, id]));
      aufEinheit(id);
      setzeKontext({ x: ereignis.clientX, y: ereignis.clientY });
    },
    hebeAuf,
    schliesseKontext,
  };
}
