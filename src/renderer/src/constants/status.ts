import type { EinheitStatus, FahrzeugStatus } from '@shared/types';

/** Klartext statt technischer Schlüssel in der Anzeige. */
const EINHEIT_TEXT: Record<EinheitStatus, string> = {
  AKTIV: 'im Einsatz',
  IN_BEREITSTELLUNG: 'in Bereitstellung',
  ABGEMELDET: 'abgemeldet',
};

const FAHRZEUG_TEXT: Record<FahrzeugStatus, string> = {
  AKTIV: 'im Einsatz',
  IN_BEREITSTELLUNG: 'in Bereitstellung',
  AUSSER_BETRIEB: 'außer Betrieb',
};

export function einheitStatusText(status: EinheitStatus): string {
  return EINHEIT_TEXT[status] ?? status;
}

export function fahrzeugStatusText(status: FahrzeugStatus): string {
  return FAHRZEUG_TEXT[status] ?? status;
}

/**
 * Zusatzklasse für die Anzeige. Der Zustand wird nicht allein über Farbe
 * vermittelt, sondern immer zusammen mit dem Text.
 */
export function statusKlasse(status: EinheitStatus | FahrzeugStatus): string {
  if (status === 'ABGEMELDET' || status === 'AUSSER_BETRIEB') {
    return 'status-marke status-aus';
  }
  if (status === 'IN_BEREITSTELLUNG') {
    return 'status-marke status-bereit';
  }
  return 'status-marke status-aktiv';
}
