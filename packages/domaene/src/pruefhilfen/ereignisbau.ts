/**
 * Bauhilfen fuer Ereignisse — ausschliesslich fuer Tests.
 *
 * Bewusst nicht aus `index.ts` exportiert: Das ist kein Teil der oeffentlichen
 * Schnittstelle von `@s1/domaene`. Die Datei liegt trotzdem unter `src/`,
 * damit `tsc -b` und ESLint sie mit denselben Ringgrenzen pruefen wie den
 * Produktionscode.
 */

import {
  SCHEMA_VERSION,
  ereignisId,
  type AbschnittAngelegt,
  type Akteur,
  type EinheitGemeldet,
  type EinheitVerschoben,
  type EinsatzAngelegt,
  type FremdesEreignis,
  type Staerke,
  type StaerkeGeaendert,
} from "../ereignis.js";
import type { Hlc } from "../hlc.js";

export function hlc(millisekunden: number, zaehler: number, clientId: string): Hlc {
  return { millisekunden, zaehler, clientId };
}

export function akteur(clientId: string): Akteur {
  return { benutzer: `Bediener ${clientId}`, host: `rechner-${clientId}`, clientId };
}

/** Der Rahmenanteil, den alle Bauhilfen gemeinsam setzen (§2.4). */
function rahmen(h: Hlc, laufnummer: number) {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    // Die Wanduhr ist reine Anzeige (§3.1) und wird hier aus der HLC
    // abgeleitet, damit die Bauhilfen keine echte Uhr brauchen.
    wanduhr: new Date(h.millisekunden).toISOString(),
  };
}

export function einsatzAngelegt(
  h: Hlc,
  laufnummer: number,
  nutzlast: EinsatzAngelegt["nutzlast"],
): EinsatzAngelegt {
  return { ...rahmen(h, laufnummer), typ: "EinsatzAngelegt", nutzlast };
}

export function abschnittAngelegt(
  h: Hlc,
  laufnummer: number,
  nutzlast: AbschnittAngelegt["nutzlast"],
): AbschnittAngelegt {
  return { ...rahmen(h, laufnummer), typ: "AbschnittAngelegt", nutzlast };
}

export function einheitGemeldet(
  h: Hlc,
  laufnummer: number,
  nutzlast: EinheitGemeldet["nutzlast"],
): EinheitGemeldet {
  return { ...rahmen(h, laufnummer), typ: "EinheitGemeldet", nutzlast };
}

export function einheitVerschoben(
  h: Hlc,
  laufnummer: number,
  einheitId: string,
  vonAbschnittId: string,
  nachAbschnittId: string,
): EinheitVerschoben {
  return {
    ...rahmen(h, laufnummer),
    typ: "EinheitVerschoben",
    // §2.5: `vorher` traegt den gesehenen Vorher-Wert; der Ereigniskatalog
    // nennt dieselben beiden Werte `vonAbschnittId` und `nachAbschnittId`.
    vorher: vonAbschnittId,
    neu: nachAbschnittId,
    nutzlast: { einheitId },
  };
}

export function staerkeGeaendert(
  h: Hlc,
  laufnummer: number,
  einheitId: string,
  vorher: Staerke,
  neu: Staerke,
): StaerkeGeaendert {
  return { ...rahmen(h, laufnummer), typ: "StaerkeGeaendert", vorher, neu, nutzlast: { einheitId } };
}

/** Eine Ereignisart, die dieser Client nicht kennt (§4.1 Regel 4). */
export function fremdesEreignis(h: Hlc, laufnummer: number, typ: string): FremdesEreignis {
  return { ...rahmen(h, laufnummer), typ, nutzlast: { irgendwas: true } };
}

export function staerke(fuehrer: number, unterfuehrer: number, mannschaft: number): Staerke {
  return { fuehrer, unterfuehrer, mannschaft };
}
