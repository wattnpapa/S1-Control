/**
 * `@s1/netz` — Ring 3: der UDP-Hinweis.
 *
 * Der Hinweis ist ausdruecklich nur ein Beschleuniger. Faellt er aus oder
 * blockiert eine Firewall den Port, bleibt der Poll am Byte-Offset der
 * verbindliche Weg (02-ZIELBILD.md, tragende Festlegung 6). Deshalb steht
 * hier nichts, worauf die Richtigkeit des Systems aufbaut.
 */

import type { Socket } from "node:dgram";

import { einsatzKennung } from "@s1/domaene";

/** Port des Hinweisverkehrs. Bewusst hoch gewaehlt, damit keine Adminrechte noetig sind. */
export const HINWEIS_PORT = 47411;

/** Ein Hinweis sagt nur: „in diesem Einsatz hat sich etwas geaendert". */
export interface Hinweis {
  readonly einsatz: string;
  readonly clientId: string;
  readonly segment: number;
  readonly offset: number;
}

/**
 * Baut die Nutzlast eines Hinweises als kompakte JSON-Zeile.
 *
 * Absichtlich ohne Zeitstempel: die Ordnung entsteht ueber die HLC im
 * Ereignisstrom, nie ueber die Wanduhr eines Absenders.
 */
export function hinweisNutzlast(hinweis: Hinweis): string {
  return JSON.stringify(hinweis);
}

/** Liest eine Hinweis-Nutzlast zurueck; ungueltige Datagramme ergeben `undefined`. */
export function hinweisLesen(nutzlast: string): Hinweis | undefined {
  try {
    const wert: unknown = JSON.parse(nutzlast);
    if (typeof wert !== "object" || wert === null) return undefined;
    const roh = wert as Partial<Hinweis>;
    if (
      typeof roh.einsatz !== "string" ||
      typeof roh.clientId !== "string" ||
      typeof roh.segment !== "number" ||
      typeof roh.offset !== "number"
    ) {
      return undefined;
    }
    return { einsatz: roh.einsatz, clientId: roh.clientId, segment: roh.segment, offset: roh.offset };
  } catch {
    return undefined;
  }
}

/**
 * Verschickt einen Hinweis ueber einen bereits geoeffneten Socket.
 *
 * Der Socket wird hereingereicht statt hier erzeugt: so bleibt das Paket ohne
 * eigenen Lebenszyklus testbar, und die Schale entscheidet ueber Bindung und
 * Broadcast-Rechte.
 */
export function hinweisSenden(socket: Socket, ziel: string, hinweis: Hinweis): void {
  const nutzlast = hinweisNutzlast(hinweis);
  socket.send(nutzlast, HINWEIS_PORT, ziel);
}

/** Name des Einsatzes, wie ihn ein Hinweis fuehrt — identisch zum Ordnernamen. */
export function hinweisFuerEinsatz(datum: string, name: string, clientId: string, segment: number, offset: number): Hinweis {
  return { einsatz: einsatzKennung(datum, name).ordner, clientId, segment, offset };
}
