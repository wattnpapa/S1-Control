/**
 * Bauhilfen fuer Ereignisse — ausschliesslich fuer Tests.
 *
 * Bewusst nicht aus `index.ts` exportiert: Das ist kein Teil der oeffentlichen
 * Schnittstelle von `@s1/domaene`. Die Datei liegt trotzdem unter `src/`,
 * damit `tsc -b` und ESLint sie mit denselben Ringgrenzen pruefen wie den
 * Produktionscode.
 *
 * Sie bauen gegen den **Katalog** (§5), nicht gegen die fuenf Arten von M0.2.
 * Pflichtfelder, die ein Test nicht nennt, bekommen einen benannten Vorgabe-
 * wert; die Bauhilfe darf das, der Fold nicht (§4.2).
 */

import { SCHEMA_VERSION, ereignisId, type Akteur } from "../ereignis.js";
import type { EingehendesEreignis } from "../fold.js";
import type { Hlc } from "../hlc.js";
import type { Staerke } from "../werte.js";

export function hlc(millisekunden: number, zaehler: number, clientId: string): Hlc {
  return { millisekunden, zaehler, clientId };
}

export function akteur(clientId: string): Akteur {
  return { benutzer: `Bediener ${clientId}`, host: `rechner-${clientId}`, clientId };
}

/** Der Rahmenanteil, den alle Bauhilfen gemeinsam setzen (§2.1). */
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

/** Die Vorbelegungen aus ZDM §3.2 (Startwert S9). */
const KOSTEN_VORBELEGUNG = {
  psaKostenProSatz: 180,
  vdaProTag: 150,
  ukVerpflegungProTag: 20,
  geplanteEinsatztage: 5,
};

export interface EinsatzAnlage {
  readonly einsatzId: string;
  readonly name: string;
  readonly art: string;
  readonly fuestName: string;
  readonly uebergeordneteFuestName?: string;
  readonly ort?: string;
  readonly beginn: string;
  readonly schichtmodell: string;
  readonly kosten?: typeof KOSTEN_VORBELEGUNG;
}

export function einsatzAngelegt(
  h: Hlc,
  laufnummer: number,
  nutzlast: EinsatzAnlage,
): EingehendesEreignis {
  return {
    ...rahmen(h, laufnummer),
    typ: "EinsatzAngelegt",
    nutzlast: { kosten: KOSTEN_VORBELEGUNG, ...nutzlast },
  };
}

export interface AbschnittAnlage {
  readonly abschnittId: string;
  readonly name: string;
  /** Heisst im Katalog `typ`; die Bauhilfe nimmt den Namen aus M0.2 entgegen. */
  readonly abschnittstyp: string;
  readonly parentId?: string;
  readonly reihenfolge: number;
  readonly bemerkung?: string;
}

export function abschnittAngelegt(
  h: Hlc,
  laufnummer: number,
  nutzlast: AbschnittAnlage,
): EingehendesEreignis {
  const { abschnittstyp, ...uebrige } = nutzlast;
  return {
    ...rahmen(h, laufnummer),
    typ: "AbschnittAngelegt",
    nutzlast: { ...uebrige, typ: abschnittstyp },
  };
}

export interface EinheitAnlage {
  readonly einheitId: string;
  readonly abschnittId: string;
  readonly bezeichnung: string;
  readonly organisation: string;
  readonly organisationName?: string;
  readonly ebene: string;
  readonly staerke: Staerke;
  readonly personalErfassung: string;
  readonly status: string;
  readonly schicht?: string;
  readonly hierarchie?: readonly { art: string; name: string }[];
  readonly reihenfolge?: number;
  readonly istFuehrungDesAbschnitts?: boolean;
}

export function einheitGemeldet(
  h: Hlc,
  laufnummer: number,
  nutzlast: EinheitAnlage,
): EingehendesEreignis {
  return {
    ...rahmen(h, laufnummer),
    typ: "EinheitGemeldet",
    nutzlast: {
      hierarchie: [],
      reihenfolge: 0,
      istFuehrungDesAbschnitts: false,
      ...nutzlast,
    },
  };
}

export function einheitVerschoben(
  h: Hlc,
  laufnummer: number,
  einheitId: string,
  vonAbschnittId: string,
  nachAbschnittId: string,
): EingehendesEreignis {
  return {
    ...rahmen(h, laufnummer),
    typ: "EinheitVerschoben",
    // §2.2: `vorher` traegt den gesehenen Vorher-Wert; der Katalog nennt
    // dieselben beiden Werte `vonAbschnittId` und `nachAbschnittId`.
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
): EingehendesEreignis {
  return { ...rahmen(h, laufnummer), typ: "StaerkeGeaendert", vorher, neu, nutzlast: { einheitId } };
}

export function statusGesetzt(
  h: Hlc,
  laufnummer: number,
  einheitId: string,
  vorher: string,
  neu: string,
): EingehendesEreignis {
  return { ...rahmen(h, laufnummer), typ: "StatusGesetzt", vorher, neu, nutzlast: { einheitId } };
}

/** Eine Ereignisart, die dieser Client nicht kennt (§3.7 Regel 1). */
export function fremdesEreignis(h: Hlc, laufnummer: number, typ: string): EingehendesEreignis {
  return { ...rahmen(h, laufnummer), typ, nutzlast: { irgendwas: true } };
}

export function staerke(fuehrer: number, unterfuehrer: number, mannschaft: number): Staerke {
  return { fuehrer, unterfuehrer, mannschaft };
}
