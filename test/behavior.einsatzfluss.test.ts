import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { benutzer, einsatzEinheit } from '../src/main/db/schema';
import { moveEinheit, undoLastCommand } from '../src/main/services/command';
import { hashPassword } from '../src/main/services/auth';
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
    try {
      // Given: ein Einsatz mit FüSt-Abschnitt und EA Nord
      const einsatz = createEinsatz(ctx, { name: 'Flutlage', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, einsatz.id)[0]!;
      const nord = createAbschnitt(ctx, {
        einsatzId: einsatz.id,
        name: 'EA Nord',
        parentId: root.id,
        systemTyp: 'NORMAL',
      });

      createEinheit(ctx, {
        einsatzId: einsatz.id,
        nameImEinsatz: 'OV Oldenburg',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: root.id,
      });

      const einheit = ctx.db
        .select({ id: einsatzEinheit.id })
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, einsatz.id), eq(einsatzEinheit.nameImEinsatz, 'OV Oldenburg')))
        .get();
      expect(einheit).toBeTruthy();

      ctx.db
        .insert(benutzer)
        .values({
          id: 'u1',
          name: 'S1',
          rolle: 'S1',
          passwortHash: hashPassword('pw'),
          aktiv: true,
        })
        .run();

      // When: Einheit wird nach EA Nord verschoben
      moveEinheit(
        ctx,
        {
          einsatzId: einsatz.id,
          einheitId: einheit!.id,
          nachAbschnittId: nord.id,
        },
        { id: 'u1', name: 'S1', rolle: 'S1' },
      );

      // Then: Einheit liegt in EA Nord
      const afterMove = listAbschnittDetails(ctx, einsatz.id, nord.id);
      expect(afterMove.einheiten.map((item) => item.nameImEinsatz)).toContain('OV Oldenburg');

      // When: letzte Aktion wird rückgängig gemacht
      const undone = undoLastCommand(ctx, einsatz.id, { id: 'u1', name: 'S1', rolle: 'S1' });
      expect(undone).toBe(true);

      // Then: Einheit liegt wieder im Ursprungsabschnitt
      const afterUndo = listAbschnittDetails(ctx, einsatz.id, root.id);
      expect(afterUndo.einheiten.map((item) => item.nameImEinsatz)).toContain('OV Oldenburg');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('Szenario: Teileinheit aus Stamm-Einheit reduzieren die Quellstärke', () => {
    const ctx = createTestDb('s1-control-behavior-split-');
    try {
      // Given: eine Einheit mit taktischer Stärke
      const einsatz = createEinsatz(ctx, { name: 'Sturmlage', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, einsatz.id)[0]!;
      createEinheit(ctx, {
        einsatzId: einsatz.id,
        nameImEinsatz: 'TZ Basis',
        organisation: 'THW',
        aktuelleStaerke: 12,
        aktuelleStaerkeTaktisch: '1/2/9/12',
        aktuellerAbschnittId: root.id,
      });

      const source = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, einsatz.id), eq(einsatzEinheit.nameImEinsatz, 'TZ Basis')))
        .get()!;

      // When: eine Teileinheit abgespalten wird
      splitEinheit(ctx, {
        einsatzId: einsatz.id,
        sourceEinheitId: source.id,
        nameImEinsatz: 'TZ Basis - Teil 1',
        fuehrung: 0,
        unterfuehrung: 1,
        mannschaft: 3,
      });

      // Then: Quelle reduziert, Teil vorhanden
      const details = listAbschnittDetails(ctx, einsatz.id, root.id);
      const names = details.einheiten.map((item) => item.nameImEinsatz);
      expect(names).toContain('TZ Basis');
      expect(names).toContain('TZ Basis - Teil 1');

      const sourceAfter = details.einheiten.find((item) => item.nameImEinsatz === 'TZ Basis');
      expect(sourceAfter?.aktuelleStaerkeTaktisch).toBe('1/1/6/8');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('Szenario: archivierter Einsatz ist schreibgeschützt', () => {
    const ctx = createTestDb('s1-control-behavior-archive-');
    try {
      // Given: ein aktiver Einsatz
      const einsatz = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
      ensureNotArchived(ctx, einsatz.id);

      // When: Einsatz archiviert wird
      archiveEinsatz(ctx, einsatz.id);

      // Then: Schreibzugriffe werden blockiert
      expect(() =>
        createAbschnitt(ctx, {
          einsatzId: einsatz.id,
          name: 'EA Süd',
          systemTyp: 'NORMAL',
        }),
      ).toThrow('archiviert');
    } finally {
      ctx.sqlite.close();
    }
  });
});
