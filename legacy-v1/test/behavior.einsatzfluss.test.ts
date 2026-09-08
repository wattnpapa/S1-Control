import { describe, expect, it } from 'vitest';
import { moveEinheit, undoLastCommand } from '../src/main/services/command';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinsatz,
  ensureNotArchived,
  listAbschnittDetails,
  listAbschnitte,
  splitEinheit,
} from '../src/main/services/einsatz';
import { createTestDb } from './helpers/db';

describe('behavior: Einsatzfluss', () => {
  it('Szenario: Abschnittswechsel einer Einheit kann rückgängig gemacht werden', () => {
    const ctx = createTestDb('s1-control-behavior-move-undo-');

    const einsatz = createEinsatz(ctx, { name: 'Flutlage', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, einsatz.id)[0]!;
    const nord = createAbschnitt(ctx, { einsatzId: einsatz.id, name: 'EA Nord', parentId: root.id, systemTyp: 'NORMAL' });

    createEinheit(ctx, { einsatzId: einsatz.id, nameImEinsatz: 'OV Oldenburg', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: root.id });

    const einheit = ctx.einsatz.einheiten.find((e) => e.einsatzId === einsatz.id && e.nameImEinsatz === 'OV Oldenburg');
    expect(einheit).toBeTruthy();

    const user = { id: 'u1', name: 'S1', rolle: 'S1' as const };
    moveEinheit(ctx, { einsatzId: einsatz.id, einheitId: einheit!.id, nachAbschnittId: nord.id }, user);

    const afterMove = listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, nord.id);
    expect(afterMove.einheiten.map((item) => item.nameImEinsatz)).toContain('OV Oldenburg');

    const undone = undoLastCommand(ctx, einsatz.id, user);
    expect(undone).toBe(true);

    const afterUndo = listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, root.id);
    expect(afterUndo.einheiten.map((item) => item.nameImEinsatz)).toContain('OV Oldenburg');
  });
});

describe('behavior: Einsatzfluss - split und archiv', () => {
  it('Szenario: Teileinheit aus Stamm-Einheit reduzieren die Quellstärke', () => {
    const ctx = createTestDb('s1-control-behavior-split-');

    const einsatz = createEinsatz(ctx, { name: 'Sturmlage', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, einsatz.id)[0]!;
    createEinheit(ctx, { einsatzId: einsatz.id, nameImEinsatz: 'TZ Basis', organisation: 'THW', aktuelleStaerke: 12, aktuelleStaerkeTaktisch: '1/2/9/12', aktuellerAbschnittId: root.id });

    const source = ctx.einsatz.einheiten.find((e) => e.einsatzId === einsatz.id && e.nameImEinsatz === 'TZ Basis')!;

    splitEinheit(ctx, { einsatzId: einsatz.id, sourceEinheitId: source.id, nameImEinsatz: 'TZ Basis - Teil 1', fuehrung: 0, unterfuehrung: 1, mannschaft: 3 });

    const details = listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, root.id);
    const names = details.einheiten.map((item) => item.nameImEinsatz);
    expect(names).toContain('TZ Basis');
    expect(names).toContain('TZ Basis - Teil 1');

    const sourceAfter = details.einheiten.find((item) => item.nameImEinsatz === 'TZ Basis');
    expect(sourceAfter?.aktuelleStaerkeTaktisch).toBe('1/1/6/8');
  });

  it('Szenario: archivierter Einsatz ist schreibgeschützt', () => {
    const ctx = createTestDb('s1-control-behavior-archive-');

    const einsatz = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
    ensureNotArchived(ctx, einsatz.id);
    archiveEinsatz(ctx, einsatz.id);

    expect(() => createAbschnitt(ctx, { einsatzId: einsatz.id, name: 'EA Süd', systemTyp: 'NORMAL' })).toThrow('archiviert');
  });
});
