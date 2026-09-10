/**
 * Die Brückenattrappe der Renderer-Tests — ausschliesslich fuer Tests.
 *
 * Sie steht an der Stelle, an der im Betrieb das Preload steht: Der Renderer
 * hat weder Node noch Electron (02-ZIELBILD.md, „Vier Ringe"), und
 * {@link setzeBruecke} ist die benannte Naht dafuer. Eine Attrappe ist damit
 * kein Notbehelf, sondern der vorgesehene Weg — die Alternative waere ein
 * gefaelschtes `window`.
 *
 * Sie merkt sich **jeden** Ruf. Genau daran haengen die Aussagen, um die es
 * geht: Welche Ereignisart eine Maske schreibt und mit welchem `vorher`
 * (§2.2a, Auflage 6), laesst sich nur an der abgeschickten Anfrage messen.
 */

import { setzeBruecke, type Bruecke } from "../bruecke.js";
import type { Antwort, Mitteilung, Ruf } from "../../kontrakt/index.js";

export interface Attrappe extends Bruecke {
  readonly rufe: Ruf[];
  antwortet(art: Ruf["art"], wert: unknown): void;
  scheitert(art: Ruf["art"], meldung: string): void;
  /** Schiebt eine Mitteilung, als kaeme sie aus dem Main. */
  schiebe(mitteilung: Mitteilung): void;
  /** Alle Rufe einer Art, in Reihenfolge. */
  rufeDerArt<A extends Ruf["art"]>(art: A): Extract<Ruf, { art: A }>[];
  letzterRuf<A extends Ruf["art"]>(art: A): Extract<Ruf, { art: A }> | undefined;
}

export function baueAttrappe(): Attrappe {
  const rufe: Ruf[] = [];
  const antworten = new Map<string, Antwort<unknown>>();
  const hoerer: ((mitteilung: Mitteilung) => void)[] = [];
  const attrappe: Attrappe = {
    rufe,
    plattform: "linux",
    electron: "43.0.0",
    antwortet(art, wert) {
      antworten.set(art, { ok: true, wert });
    },
    scheitert(art, meldung) {
      antworten.set(art, { ok: false, meldung });
    },
    schiebe(mitteilung) {
      for (const hoert of hoerer) hoert(mitteilung);
    },
    rufeDerArt(art) {
      return rufe.filter((ruf): ruf is Extract<Ruf, { art: typeof art }> => ruf.art === art);
    },
    letzterRuf(art) {
      const treffer = attrappe.rufeDerArt(art);
      return treffer[treffer.length - 1];
    },
    async ruf(anfrage) {
      rufe.push(anfrage);
      return antworten.get(anfrage.art) ?? { ok: true, wert: null };
    },
    aufMitteilung(hoert) {
      hoerer.push(hoert);
      return () => {
        hoerer.splice(hoerer.indexOf(hoert), 1);
      };
    },
  };
  setzeBruecke(attrappe);
  return attrappe;
}
