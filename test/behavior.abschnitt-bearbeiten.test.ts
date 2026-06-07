import { describe, expect, it } from 'vitest';
import {
  createAbschnitt,
  createEinsatz,
  listAbschnitte,
  updateAbschnitt,
} from '../src/main/services/einsatz';
import { createTestDb } from './helpers/db';

describe('behavior: Abschnitt bearbeiten', () => {
  it('Szenario: Abschnitt kann nach Anlage umbenannt werden', () => {
    const ctx = createTestDb('s1-control-behavior-abschnitt-rename-');

    const einsatz = createEinsatz(ctx, { name: 'Flutlage', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, einsatz.id)[0]!;
    const abschnitt = createAbschnitt(ctx, {
      einsatzId: einsatz.id,
      name: 'EA Nord',
      parentId: root.id,
      systemTyp: 'NORMAL',
    });

    updateAbschnitt(ctx, {
      einsatzId: einsatz.id,
      abschnittId: abschnitt.id,
      name: 'EA Süd',
      systemTyp: 'NORMAL',
      parentId: root.id,
    });

    const updated = ctx.einsatz.abschnitte.find((a) => a.id === abschnitt.id);
    expect(updated).toBeTruthy();
    expect(updated!.name).toBe('EA Süd');
  });

  it('Szenario: Abschnitt systemTyp kann geändert werden', () => {
    const ctx = createTestDb('s1-control-behavior-abschnitt-systtyp-');

    const einsatz = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, einsatz.id)[0]!;
    const abschnitt = createAbschnitt(ctx, {
      einsatzId: einsatz.id,
      name: 'Versorgung',
      parentId: root.id,
      systemTyp: 'NORMAL',
    });

    updateAbschnitt(ctx, {
      einsatzId: einsatz.id,
      abschnittId: abschnitt.id,
      name: 'Versorgung',
      systemTyp: 'LOGISTIK',
      parentId: root.id,
    });

    const updated = ctx.einsatz.abschnitte.find((a) => a.id === abschnitt.id);
    expect(updated).toBeTruthy();
    expect(updated!.systemTyp).toBe('LOGISTIK');
  });
});
