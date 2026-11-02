/**
 * Die Marken der Ressourcenplanung in der Einheitentabelle (K12, K18) — und
 * die Weiche zu den Marken der Gruppe Funk (`Funkmarken.tsx`), dort auch
 * „Letzter Kontakt" mit derselben Minutenuhr wie K18.
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

import { Kontaktmarke, Rufgruppenzellmarke } from "./Funkmarken.js";
import type { Zustandswahl } from "../kontrakt/index.js";

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

/**
 * „Letzter Kontakt" (Funkplan F3): Die Zeile trägt den Kontakt ohne Uhr, die
 * Marke entsteht mit der Minutenuhr — wie „läuft ab" an „Verfügbar bis". Die
 * Zelle zeigt nur die Marke; ihr Text ist derselbe.
 */
function Kontaktzellmarke({ zeile }: { readonly zeile: Tabellenzeile }): React.JSX.Element | null {
  const jetzt = useMinutenuhr();
  if (zeile.letzterKontakt === undefined) return null;
  return <Kontaktmarke marke={projektion.kontaktmarke(zeile.letzterKontakt, jetzt)} />;
}

export interface ZellmarkenEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalte: Spalte;
  /** Bei Spalten mit `werteAus`: die Auswahl der Tabellenansicht (Betriebsart der Rufgruppe). */
  readonly werteliste?: readonly Zustandswahl[];
}

/** Die Marken, die zu dieser Zelle gehören — oder nichts. */
export function Zellmarken({ zeile, spalte, werteliste }: ZellmarkenEigenschaften): React.JSX.Element | null {
  if (spalte.werteAus === "rufgruppen") return <Rufgruppenzellmarke zeile={zeile} werteliste={werteliste} />;
  if (spalte.schluessel === "bezeichnung" && zeile.abloesung !== undefined) {
    return <> <Marke marke={zeile.abloesung} /></>;
  }
  if (spalte.schluessel === "letzterKontakt") return <Kontaktzellmarke zeile={zeile} />;
  if (spalte.schluessel === "verfuegbarBis") {
    return <Ablaufmarke bis={zeile.zellen["verfuegbarBis"]?.wert} />;
  }
  return null;
}
