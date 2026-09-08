import { describe, expect, it } from 'vitest';
import {
  archiveEinsatz,
  createEinsatz,
  listAbschnitte,
  updateEinsatz,
} from '../src/main/services/einsatz';
import { createTestDb } from './helpers/db';

describe('behavior: Einsatz Basisdaten', () => {
  it('Szenario: Einsatzname und FüSt-Name können geändert werden', () => {
    const ctx = createTestDb('s1-control-behavior-einsatz-update-');

    const einsatz = createEinsatz(ctx, { name: 'Flutlage', fuestName: 'FüSt 1' });

    updateEinsatz(ctx, { einsatzId: einsatz.id, name: 'Sturmschaden', fuestName: 'FüSt 2' });

    expect(ctx.einsatz.einsatz.name).toBe('Sturmschaden');
    expect(ctx.einsatz.einsatz.fuestName).toBe('FüSt 2');

    const abschnitte = listAbschnitte(ctx.einsatz, einsatz.id);
    const fuest = abschnitte.find((a) => a.systemTyp === 'FUEST' && a.parentId === null);
    expect(fuest).toBeTruthy();
    expect(fuest!.name).toBe('FüSt 2');
  });

  it('Szenario: archivierter Einsatz kann nicht bearbeitet werden', () => {
    const ctx = createTestDb('s1-control-behavior-einsatz-update-archived-');

    const einsatz = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
    archiveEinsatz(ctx, einsatz.id);

    expect(() =>
      updateEinsatz(ctx, { einsatzId: einsatz.id, name: 'Neuer Name', fuestName: 'FüSt neu' }),
    ).toThrow('Archiviert');
  });
});
