import type { AbschnittSystemTyp } from '@shared/types';

/**
 * Klartext und Erklärung der Abschnittsarten. Die Art entscheidet mit, ob
 * Kräfte zur gemeldeten Stärke zählen — das muss bei der Auswahl sichtbar sein.
 */
export const ABSCHNITT_TYP_OPTIONEN: Array<{
  wert: AbschnittSystemTyp;
  bezeichnung: string;
  erklaerung: string;
}> = [
  {
    wert: 'NORMAL',
    bezeichnung: 'Einsatzabschnitt',
    erklaerung: 'Kräfte vor Ort, zählen zur gemeldeten Stärke.',
  },
  {
    wert: 'FUEST',
    bezeichnung: 'Führungsstelle',
    erklaerung: 'Führung und Koordinierung, zählt zur gemeldeten Stärke.',
  },
  {
    wert: 'ANFAHRT',
    bezeichnung: 'Anfahrt (noch nicht vor Ort)',
    erklaerung: 'Kräfte sind unterwegs und zählen nicht zur gemeldeten Stärke.',
  },
  {
    wert: 'LOGISTIK',
    bezeichnung: 'Logistik',
    erklaerung: 'Versorgung und Nachschub, zählt zur gemeldeten Stärke.',
  },
  {
    wert: 'BEREITSTELLUNGSRAUM',
    bezeichnung: 'Bereitstellungsraum',
    erklaerung: 'Kräfte vor Ort in Bereitstellung, zählen zur gemeldeten Stärke.',
  },
];

export function abschnittTypBezeichnung(typ: AbschnittSystemTyp): string {
  return ABSCHNITT_TYP_OPTIONEN.find((option) => option.wert === typ)?.bezeichnung ?? typ;
}

export function abschnittTypErklaerung(typ: AbschnittSystemTyp): string {
  return ABSCHNITT_TYP_OPTIONEN.find((option) => option.wert === typ)?.erklaerung ?? '';
}
