/**
 * Die Marken der Ressourcenplanung in der Einheitentabelle (K12, K18).
 *
 * Beide Kennzahlen wurden gerechnet und nirgends gezeichnet. K12 steht als
 * Marke „Ablösung angefordert / zugesagt / eingetroffen“ an der Bezeichnung —
 * dort, wo man sie auch mit ausgeblendeter Ressourcenplanung sieht. K18 steht
 * als „läuft ab“ / „abgelaufen“ an der Zelle „Verfügbar bis“.
 *
 * **Die Uhr für K18 ist eine gemeinsame Minutenuhr.** Die Projektion kennt
 * keine Uhr (Ring 2), und die Tabelle wird nur nach einem Ereignis neu
 * geholt. Ohne eigene Uhr erschiene die Marke erst, wenn irgendwer irgendwo
 * schreibt; mit einem Zeitgeber je Zelle liefen bei hundert Zeilen hundert
 * Zeitgeber. Diese Datei hält einen einzigen, solange eine Marke zu sehen ist.
 *
 * Eine eigene Datei, damit die Einheitentabelle nur den Aufruf trägt.
 */

import { useSyncExternalStore } from "react";

import { projektion, type Spalte, type Tabellenzeile } from "@s1/domaene";

const TAKT_MS = 60_000;
const hoerer = new Set<() => void>();
let zeitgeber: ReturnType<typeof setInterval> | undefined;
let stand = new Date().toISOString();

function abonniere(hoere: () => void): () => void {
  hoerer.add(hoere);
  if (zeitgeber === undefined) {
    stand = new Date().toISOString();
    zeitgeber = setInterval(() => {
      stand = new Date().toISOString();
      for (const h of hoerer) h();
    }, TAKT_MS);
  }
  return () => {
    hoerer.delete(hoere);
    if (hoerer.size === 0 && zeitgeber !== undefined) {
      clearInterval(zeitgeber);
      zeitgeber = undefined;
    }
  };
}

/** „Jetzt“ als ISO-Zeitpunkt, auf die Minute nachgeführt. */
export function useMinutenuhr(): string {
  return useSyncExternalStore(abonniere, () => stand);
}

function Marke({ marke }: { readonly marke: projektion.Marke }): React.JSX.Element {
  return <span className={`marke-zustand ${marke.ton}`}>{marke.text}</span>;
}

function Ablaufmarke({ bis }: { readonly bis: unknown }): React.JSX.Element | null {
  const jetzt = useMinutenuhr();
  const marke = projektion.verfuegbarkeitsmarke(bis, jetzt);
  return marke === undefined ? null : <> <Marke marke={marke} /></>;
}

export interface ZellmarkenEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalte: Spalte;
}

/** Die Marken, die zu dieser Zelle gehören — oder nichts. */
export function Zellmarken({ zeile, spalte }: ZellmarkenEigenschaften): React.JSX.Element | null {
  if (spalte.schluessel === "bezeichnung" && zeile.abloesung !== undefined) {
    return <> <Marke marke={zeile.abloesung} /></>;
  }
  if (spalte.schluessel === "verfuegbarBis") {
    return <Ablaufmarke bis={zeile.zellen["verfuegbarBis"]?.wert} />;
  }
  return null;
}
