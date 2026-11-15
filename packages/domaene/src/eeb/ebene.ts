/**
 * Die taktische Ebene aus dem Einheitstyp eines Erfassungsbogens.
 *
 * Der Bogen fuehrt keine Ebene; das Zielmodell braucht sie fuer das
 * taktische Zeichen (ZDM §2.8). Diese Datei ist reine Textheuristik ohne
 * Abhaengigkeit zum Format — der Adapter ruft sie, der Katalog nicht.
 */

/**
 * Die taktische Ebene aus dem **ausgeschriebenen** Einheitstyp.
 *
 * Der Bogen fuehrt keine Ebene; die Excel braucht sie fuer das taktische
 * Zeichen (ZDM §2.8). Gelesen wird der Name, nicht der Vokabularcode: Ein
 * Freitext-Einheitstyp einer fremden Organisation („Löschzug",
 * „SEG Sanität") traegt dieselbe Auskunft, und der Code waere dort leer.
 *
 * Die Reihenfolge ist bedeutsam: „Zugtrupp" enthaelt „Zug", und „Fachgruppe"
 * enthaelt „Gruppe". Geprueft wird deshalb vom Spezielleren zum Allgemeinen.
 */
const EBENEN_MUSTER: readonly (readonly [RegExp, string])[] = [
  [/zugtrupp/i, "ZUGTRUPP"],
  [/gro(ß|ss)verband/i, "GROSSVERBAND"],
  [/abteilung/i, "ABTEILUNG"],
  [/bereitschaft/i, "BEREITSCHAFT"],
  [/staffel/i, "STAFFEL"],
  [/trupp/i, "TRUPP"],
  [/gruppe/i, "GRUPPE"],
  [/\bzug\b|löschzug|loeschzug/i, "ZUG"],
];

/**
 * Leitet die taktische Ebene aus einem Einheitstyp ab.
 *
 * **Ein Vorschlag, keine Tatsache.** Was der Adapter nicht erkennt, wird
 * `UNBESTIMMT` — ZDM §2.8 fuehrt den Wert genau fuer „keine Spalte gefuellt",
 * und ein Fehlschlag an einem fremden Einheitstyp waere der falsche Umgang
 * mit einer Meldung, die trotzdem gilt.
 */
export function ebeneAusEinheitstyp(text: string | undefined): string {
  if (text === undefined) return "UNBESTIMMT";
  for (const [muster, ebene] of EBENEN_MUSTER) {
    if (muster.test(text)) return ebene;
  }
  return "UNBESTIMMT";
}
