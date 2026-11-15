/**
 * Die Zeile eines Fahrzeugs in den Untertabellen — als Text.
 *
 * Eine eigene Datei, weil die Zeile mit dem Bogen wächst: Sitzplätze
 * (Schema 9) und die abweichende Grundfarbe des taktischen Zeichens
 * (Schema 13) stehen im Zustand und gehören dorthin, wo jemand das Fahrzeug
 * liest. Die Anwendung zeichnet an Fahrzeugen kein taktisches Zeichen; die
 * Farbe steht deshalb als Wort da.
 */

import type { Untertabelle } from "@s1/domaene";

type Fahrzeug = Untertabelle["fahrzeuge"][number];

/**
 * Was die Farbe sagt, nicht wie sie heißt: Gerät in abweichender Farbe gehört
 * nicht der Einheit, die es führt. Ein Wert, den dieser Stand nicht kennt,
 * bleibt sichtbar, statt zu verschwinden.
 */
const ZEICHENFARBE: Readonly<Record<string, string>> = {
  KOMMUNAL: "Zeichen orange (kommunal)",
  GRAU: "Zeichen grau",
};

export function zeichenfarbeText(farbe: string): string {
  return ZEICHENFARBE[farbe] ?? `Zeichenfarbe ${farbe}`;
}

export function fahrzeugText(fahrzeug: Fahrzeug): string {
  return [
    fahrzeug.typ,
    fahrzeug.bezeichnung === "" ? "" : ` — ${fahrzeug.bezeichnung}`,
    fahrzeug.kennzeichen === undefined ? "" : ` (${fahrzeug.kennzeichen})`,
    fahrzeug.funkrufname === undefined ? "" : ` · ${fahrzeug.funkrufname}`,
    fahrzeug.sitzplaetze === undefined ? "" : ` · ${String(fahrzeug.sitzplaetze)} Sitzplätze`,
    fahrzeug.zeichenfarbe === undefined ? "" : ` · ${zeichenfarbeText(fahrzeug.zeichenfarbe)}`,
  ].join("");
}
