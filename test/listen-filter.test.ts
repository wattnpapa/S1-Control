import { describe, expect, it } from 'vitest';
import { filtereListe } from '../src/renderer/src/app/useListenFilter';

const elemente = [
  { id: '1', name: 'GKW', status: 'AKTIV', abschnittName: 'Nord' },
  { id: '2', name: 'MzKW', status: 'AUSSER_BETRIEB', abschnittName: 'Anfahrt' },
  { id: '3', name: 'MTW', status: 'IN_BEREITSTELLUNG', abschnittName: 'Bereitstellung' },
];

describe('Listenfilter', () => {
  it('sucht über alle angegebenen Felder, unabhängig von Groß- und Kleinschreibung', () => {
    const treffer = filtereListe(elemente, (e) => [e.name, e.abschnittName], 'nord', 'ALLE');
    expect(treffer.map((e) => e.id)).toEqual(['1']);
  });

  it('fasst abgemeldet und außer Betrieb zu einem Filter zusammen', () => {
    const treffer = filtereListe(elemente, (e) => [e.name], '', 'AUSSER_EINSATZ');
    expect(treffer.map((e) => e.id)).toEqual(['2']);
  });

  it('filtert auf einen einzelnen Zustand', () => {
    const treffer = filtereListe(elemente, (e) => [e.name], '', 'IN_BEREITSTELLUNG');
    expect(treffer.map((e) => e.id)).toEqual(['3']);
  });

  it('sortiert nach Abschnitt', () => {
    const treffer = filtereListe(elemente, (e) => [e.name], '', 'ALLE');
    expect(treffer.map((e) => e.abschnittName)).toEqual(['Anfahrt', 'Bereitstellung', 'Nord']);
  });
});
