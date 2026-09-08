/**
 * Kanonische Serialisierung nach KONZEPT-SPEICHER.md §7.6.
 *
 * Sie ist die Grundlage des `zustandsHash` und damit des zaehlbaren
 * Abbruchkriteriums aus Auflage 18. Zwei Clients heissen genau dann
 * konvergent, wenn sie bei gleichem Versionsvektor dieselbe Serialisierung
 * erzeugen — deshalb steht hier jede Regel ausgeschrieben und nicht
 * `JSON.stringify` mit Ersetzerfunktion.
 *
 * Die Regeln aus §7.6:
 *   * Objektschluessel aufsteigend nach Unicode-Codepoint sortiert.
 *   * Keine Leerzeichen, keine Zeilenumbrueche zwischen den Bestandteilen.
 *   * Zahlen in der kuerzesten Dezimaldarstellung nach ECMA-262
 *     `Number::toString` — also genau das, was `JSON.stringify` erzeugt.
 *     Kein `-0`; die Zahl null wird als `0` geschrieben.
 *   * Felder ohne Wert werden weggelassen, nicht als `null` geschrieben.
 *   * Leere Objekte und leere Listen bleiben erhalten.
 *   * Zeichenketten mit den Maskierungen von `JSON.stringify`.
 */

/** Was in einem materialisierten Zustand vorkommen darf. */
export type KanonischerWert =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly KanonischerWert[]
  | { readonly [schluessel: string]: KanonischerWert };

/**
 * Vergleicht zwei Zeichenketten aufsteigend nach Unicode-Codepoint (§7.6).
 *
 * `Array.prototype.sort` vergleicht Zeichenketten nach UTF-16-Codeunits, was
 * ausserhalb der BMP von der Codepoint-Ordnung abweicht. Deshalb wird hier
 * ueber die Codepoints verglichen, nicht ueber `<`.
 */
export function vergleicheNachCodepunkt(a: string, b: string): number {
  const links = [...a];
  const rechts = [...b];
  const kuerzer = Math.min(links.length, rechts.length);
  for (let i = 0; i < kuerzer; i += 1) {
    const x = (links[i] as string).codePointAt(0) as number;
    const y = (rechts[i] as string).codePointAt(0) as number;
    if (x !== y) return x < y ? -1 : 1;
  }
  return links.length - rechts.length;
}

function zahl(wert: number): string {
  if (!Number.isFinite(wert)) {
    throw new RangeError(`Nicht serialisierbare Zahl im Zustand: ${String(wert)}`);
  }
  // Kein `-0` (§7.6): `Object.is(-0, 0)` ist falsch, `-0 === 0` ist wahr.
  return Object.is(wert, -0) ? "0" : String(wert);
}

/**
 * Serialisiert einen Zustand kanonisch nach §7.6.
 *
 * `undefined` ist die Abwesenheit eines Wertes und wird weggelassen; `null`
 * bleibt erhalten, weil es im Zustand ein gesetzter Wert sein kann. Genau
 * diese Unterscheidung meint §7.6: „Ein Feld, das nie gesetzt wurde, und ein
 * Feld, das auf einen leeren Wert gesetzt wurde, sind damit unterscheidbar."
 */
export function kanonischeSerialisierung(wert: KanonischerWert): string {
  if (wert === undefined) {
    throw new TypeError("Der Wurzelwert eines Zustands darf nicht undefined sein.");
  }
  return schreibe(wert);
}

function schreibe(wert: Exclude<KanonischerWert, undefined>): string {
  if (wert === null) return "null";
  switch (typeof wert) {
    case "string":
      return JSON.stringify(wert);
    case "number":
      return zahl(wert);
    case "boolean":
      return wert ? "true" : "false";
    default:
      break;
  }

  if (Array.isArray(wert)) {
    // In einer Liste ist die Position bedeutungstragend; ein `undefined`
    // liesse sich nicht weglassen, ohne die Positionen zu verschieben.
    return `[${wert
      .map((eintrag) => {
        if (eintrag === undefined) {
          throw new TypeError("undefined ist in einer Liste des Zustands nicht zulaessig.");
        }
        return schreibe(eintrag);
      })
      .join(",")}]`;
  }

  const objekt = wert as { readonly [schluessel: string]: KanonischerWert };
  const teile: string[] = [];
  for (const schluessel of Object.keys(objekt).sort(vergleicheNachCodepunkt)) {
    const eintrag = objekt[schluessel];
    if (eintrag === undefined) continue; // §7.6: Felder ohne Wert werden weggelassen.
    teile.push(`${JSON.stringify(schluessel)}:${schreibe(eintrag)}`);
  }
  return `{${teile.join(",")}}`;
}

/**
 * Eine SHA-256-Funktion, die Hex in voller Laenge liefert (§7.6, 64 Zeichen).
 *
 * Sie wird injiziert, nicht importiert: `@s1/domaene` ist plattformneutral und
 * darf `node:crypto` nicht sehen (02-ZIELBILD.md, „Vier Ringe"). Die
 * Speicherschicht reicht ihre Umsetzung herein.
 */
export type Sha256Hex = (text: string) => string;

/**
 * Bildet den `zustandsHash` nach §7.6: SHA-256 ueber die UTF-8-Bytes der
 * kanonischen Serialisierung, in voller Laenge als 64 Hexzeichen.
 */
export function zustandsHash(wert: KanonischerWert, sha256Hex: Sha256Hex): string {
  const hash = sha256Hex(kanonischeSerialisierung(wert));
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new RangeError(`Der zustandsHash muss 64 Hexzeichen sein (§7.6), war: ${hash}`);
  }
  return hash;
}
