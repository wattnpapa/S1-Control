/**
 * Die Ausgaben der Versorgung im Worker (S4): welche Zahlen in die Seite
 * kommen. Wie sie aussieht, steht in `@s1/ausgaben`; gerechnet wird in
 * Ring 2 — für die Uhr dieses Workers, wie das Blatt.
 */

import { belegungAlsHtml, type Ausgabekopf } from "@s1/ausgaben";
import { projektion, type Zustand } from "@s1/domaene";

import { ortsversatz } from "./versorgungsprojektion.js";

export type Versorgungsausgabe = "belegung";

export const VERSORGUNGSAUSGABEN: ReadonlySet<string> = new Set<Versorgungsausgabe>(["belegung"]);

/** Rendert eine Versorgungsausgabe; `marke` ist der Zeitstempel für den Dateinamen. */
export function versorgungsausgabe(
  ausgabe: Versorgungsausgabe,
  zustand: Zustand,
  jetztMs: number,
  kopf: Ausgabekopf & { readonly marke: string },
): { dateiname: string; html: string } {
  const blatt = projektion.versorgungsblatt(zustand, {
    jetzt: new Date(jetztMs).toISOString(),
    versatzMinuten: ortsversatz(jetztMs),
  });
  switch (ausgabe) {
    case "belegung":
      return { dateiname: `belegung_${kopf.marke}`, html: belegungAlsHtml(blatt.belegung, kopf) };
  }
}
