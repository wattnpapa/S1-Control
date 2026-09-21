import type { AbschnittDetails, AbschnittSystemTyp, EinheitStatus } from '@shared/types';
import type { TacticalStrength } from '@renderer/types/ui';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';

/**
 * Aufteilung der Kräfte eines Einsatzes nach ihrem Beitrag zur Einsatzstärke.
 *
 * Gemeldet wird `vorOrt`. Anrückende und abgemeldete Kräfte werden getrennt
 * ausgewiesen, damit die Regel sichtbar ist und nicht stillschweigend wirkt.
 */
export interface StaerkeUebersicht {
  vorOrt: TacticalStrength;
  inAnfahrt: TacticalStrength;
  abgemeldet: TacticalStrength;
}

export const EMPTY_STAERKE: TacticalStrength = {
  fuehrung: 0,
  unterfuehrung: 0,
  mannschaft: 0,
  gesamt: 0,
};

export function emptyStaerkeUebersicht(): StaerkeUebersicht {
  return {
    vorOrt: { ...EMPTY_STAERKE },
    inAnfahrt: { ...EMPTY_STAERKE },
    abgemeldet: { ...EMPTY_STAERKE },
  };
}

/**
 * Entscheidet, in welchen Topf eine Einheit zählt.
 *
 * Abgemeldete Kräfte sind nicht mehr im Einsatz, Kräfte in einem
 * Anfahrt-Abschnitt noch nicht vor Ort.
 */
export function staerkeTopf(
  einheitStatus: EinheitStatus,
  abschnittSystemTyp: AbschnittSystemTyp | undefined,
): keyof StaerkeUebersicht {
  if (einheitStatus === 'ABGEMELDET') {
    return 'abgemeldet';
  }
  if (abschnittSystemTyp === 'ANFAHRT') {
    return 'inAnfahrt';
  }
  return 'vorOrt';
}

function addInto(target: TacticalStrength, part: TacticalStrength): void {
  target.fuehrung += part.fuehrung;
  target.unterfuehrung += part.unterfuehrung;
  target.mannschaft += part.mannschaft;
  target.gesamt += part.gesamt;
}

/**
 * Summiert die Stärke aller Abschnitte, getrennt nach vor Ort, Anfahrt und
 * abgemeldet.
 */
export function aggregateStaerkeUebersicht(
  allDetails: AbschnittDetails[],
  systemTypen: Array<AbschnittSystemTyp | undefined>,
): StaerkeUebersicht {
  const result = emptyStaerkeUebersicht();
  allDetails.forEach((detail, index) => {
    const systemTyp = systemTypen[index];
    for (const einheit of detail.einheiten) {
      const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
      addInto(result[staerkeTopf(einheit.status, systemTyp)], parsed);
    }
  });
  return result;
}

/**
 * Kurzer Zusatztext zur gemeldeten Stärke, etwa "+9 in Anfahrt".
 * Leer, wenn es nichts zu erklären gibt.
 */
export function staerkeZusatz(uebersicht: StaerkeUebersicht): string {
  const teile: string[] = [];
  if (uebersicht.inAnfahrt.gesamt > 0) {
    teile.push(`+${uebersicht.inAnfahrt.gesamt} in Anfahrt`);
  }
  if (uebersicht.abgemeldet.gesamt > 0) {
    teile.push(`${uebersicht.abgemeldet.gesamt} abgemeldet`);
  }
  return teile.join(', ');
}
