import { describe, expect, it } from 'vitest';
import type { AbschnittDetails } from '../src/shared/types';
import { aggregateStaerkeUebersicht, staerkeZusatz } from '../src/renderer/src/utils/staerke';

function einheit(staerke: string, status: 'AKTIV' | 'ABGEMELDET' = 'AKTIV') {
  return {
    id: `e-${staerke}-${status}`,
    parentEinsatzEinheitId: null,
    nameImEinsatz: 'Zug',
    organisation: 'THW' as const,
    aktuelleStaerke: 0,
    aktuelleStaerkeTaktisch: staerke,
    status,
    piktogrammKey: null,
    tacticalSignConfigJson: null,
    aktuellerAbschnittId: 'a',
    grFuehrerName: null,
    ovName: null,
    ovTelefon: null,
    ovFax: null,
    rbName: null,
    rbTelefon: null,
    rbFax: null,
    lvName: null,
    lvTelefon: null,
    lvFax: null,
    bemerkung: null,
    vegetarierVorhanden: null,
    erreichbarkeiten: null,
  } as unknown as AbschnittDetails['einheiten'][number];
}

describe('Stärke vor Ort', () => {
  it('zählt abgemeldete Einheiten und Anfahrt-Abschnitte nicht zur gemeldeten Stärke', () => {
    const details: AbschnittDetails[] = [
      { einheiten: [einheit('0/1/8/9'), einheit('1/0/0/1', 'ABGEMELDET')], fahrzeuge: [] },
      { einheiten: [einheit('0/2/6/8')], fahrzeuge: [] },
    ];

    const uebersicht = aggregateStaerkeUebersicht(details, ['NORMAL', 'ANFAHRT']);

    expect(uebersicht.vorOrt).toEqual({ fuehrung: 0, unterfuehrung: 1, mannschaft: 8, gesamt: 9 });
    expect(uebersicht.inAnfahrt.gesamt).toBe(8);
    expect(uebersicht.abgemeldet.gesamt).toBe(1);
  });

  it('weist abgemeldete Kräfte auch in einem Anfahrt-Abschnitt als abgemeldet aus', () => {
    const details: AbschnittDetails[] = [{ einheiten: [einheit('0/0/4/4', 'ABGEMELDET')], fahrzeuge: [] }];

    const uebersicht = aggregateStaerkeUebersicht(details, ['ANFAHRT']);

    expect(uebersicht.abgemeldet.gesamt).toBe(4);
    expect(uebersicht.inAnfahrt.gesamt).toBe(0);
  });

  it('erklärt die Abweichung in einem kurzen Zusatz', () => {
    const details: AbschnittDetails[] = [
      { einheiten: [einheit('0/1/8/9')], fahrzeuge: [] },
      { einheiten: [einheit('0/0/6/6')], fahrzeuge: [] },
    ];

    const uebersicht = aggregateStaerkeUebersicht(details, ['NORMAL', 'ANFAHRT']);

    expect(staerkeZusatz(uebersicht)).toBe('+6 in Anfahrt');
    expect(staerkeZusatz(aggregateStaerkeUebersicht([], []))).toBe('');
  });
});
