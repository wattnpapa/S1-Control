/**
 * Die Zeile mit der Führungsstelle unter dem Kopf jeder Ausgabe.
 *
 * Die Excel trägt auf jedem Blatt oben den Namen der eigenen Führungsstelle
 * und die übergeordnete Führungsstelle aus dem Blatt „Stammdaten“. Beides
 * kommt aus dem Einsatz und nicht vom Arbeitsplatz: Zwei Rechner am selben
 * Share sollen dasselbe Blatt drucken.
 *
 * Die übergeordnete Stelle steht nur da, wenn sie eingetragen ist. Eine
 * leere Angabe „übergeordnet: —“ wäre auf einem Ausdruck für die Lagekarte
 * eine Zeile, die nichts sagt.
 */

import { projektion, type Zustand } from "@s1/domaene";

import { htmlMaskieren } from "./index.js";

export interface Fuestangaben {
  readonly fuestName: string;
  readonly uebergeordneteFuestName?: string;
}

/** Liest beide Angaben aus den Stammdaten; ohne Einsatz bleibt der Name leer. */
export function fuestangaben(zustand: Zustand): Fuestangaben {
  const stammdaten = projektion.einsatzstammdaten(zustand);
  const oben = stammdaten?.uebergeordneteFuestName;
  return {
    fuestName: stammdaten?.fuestName ?? "",
    ...(oben === undefined ? {} : { uebergeordneteFuestName: oben }),
  };
}

/** Setzt die Zeile `<p class="fuest">` — mit der übergeordneten Stelle, wenn es eine gibt. */
export function fuestzeileAlsHtml(angaben: Fuestangaben): string {
  const oben = angaben.uebergeordneteFuestName;
  const zusatz =
    oben === undefined || oben === ""
      ? ""
      : ` <span class="uebergeordnet">· übergeordnete Führungsstelle: ${htmlMaskieren(oben)}</span>`;
  return `  <p class="fuest">${htmlMaskieren(angaben.fuestName)}${zusatz}</p>`;
}
