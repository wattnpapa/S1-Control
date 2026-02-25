import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  benutzer,
  einsatz,
  einsatzAbschnitt,
  einsatzCommandLog,
  einsatzEinheit,
  einsatzFahrzeug,
} from '../src/main/db/schema';
import { AppError } from '../src/main/services/errors';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinsatz,
  createFahrzeug,
  ensureNotArchived,
  hasUndoableCommand,
  listAbschnittDetails,
  listAbschnitte,
  listEinsaetze,
  splitEinheit,
} from '../src/main/services/einsatz';
import { createTestDb } from './helpers/db';
import { hashPassword } from '../src/main/services/auth';

describe('einsatz service', () => {
  it('creates einsatz and root FüSt abschnitt', () => {
    const ctx = createTestDb('s1-control-einsatz-create-');
    try {
      const created = createEinsatz(ctx, { name: 'Hochwasser', fuestName: 'FüSt 1' });
      const einsaetze = listEinsaetze(ctx);
      const abschnitte = listAbschnitte(ctx, created.id);

      expect(einsaetze.some((e) => e.id === created.id)).toBe(true);
      expect(abschnitte).toHaveLength(1);
      expect(abschnitte[0]?.systemTyp).toBe('FUEST');
      expect(abschnitte[0]?.name).toBe('FüSt 1');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('archives einsatz and blocks writes', () => {
    const ctx = createTestDb('s1-control-einsatz-archive-');
    try {
      const created = createEinsatz(ctx, { name: 'Sturm', fuestName: 'FüSt Nord' });
      archiveEinsatz(ctx, created.id);

      const archived = ctx.db.select().from(einsatz).where(eq(einsatz.id, created.id)).get();
      expect(archived?.status).toBe('ARCHIVIERT');

      expect(() =>
        createAbschnitt(ctx, {
          einsatzId: created.id,
          name: 'EA Süd',
          systemTyp: 'NORMAL',
        }),
      ).toThrow(AppError);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('throws NOT_FOUND for missing einsatz in guard and archive', () => {
    const ctx = createTestDb('s1-control-einsatz-not-found-');
    try {
      expect(() => ensureNotArchived(ctx, 'missing')).toThrow('Einsatz nicht gefunden');
      expect(() => archiveEinsatz(ctx, 'missing')).toThrow('Einsatz nicht gefunden');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('validates tactical strength on createEinheit', () => {
    const ctx = createTestDb('s1-control-einsatz-einheit-validation-');
    try {
      const created = createEinsatz(ctx, { name: 'Übung', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0];
      expect(root).toBeTruthy();

      expect(() =>
        createEinheit(ctx, {
          einsatzId: created.id,
          nameImEinsatz: 'TZ 1',
          organisation: 'THW',
          aktuelleStaerke: 5,
          aktuelleStaerkeTaktisch: '1/1/1/3',
          aktuellerAbschnittId: root!.id,
        }),
      ).toThrow('inkonsistent');

      expect(() =>
        createEinheit(ctx, {
          einsatzId: created.id,
          nameImEinsatz: 'TZ 2',
          organisation: 'THW',
          aktuelleStaerke: 1,
          aktuelleStaerkeTaktisch: 'x/y/z',
          aktuellerAbschnittId: root!.id,
        }),
      ).toThrow('ungültig');

      expect(() =>
        createEinheit(ctx, {
          einsatzId: created.id,
          nameImEinsatz: 'TZ 3',
          organisation: 'THW',
          aktuelleStaerke: -1,
          aktuellerAbschnittId: root!.id,
        }),
      ).toThrow('Stärke muss');

      expect(() =>
        createEinheit(ctx, {
          einsatzId: created.id,
          nameImEinsatz: 'TZ 4',
          organisation: 'INVALID' as never,
          aktuelleStaerke: 1,
          aktuellerAbschnittId: root!.id,
        }),
      ).toThrow('Organisation ist');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('creates fahrzeug linked to unit and abschnitt', () => {
    const ctx = createTestDb('s1-control-einsatz-fahrzeug-');
    try {
      const created = createEinsatz(ctx, { name: 'Brand', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'OV Oldenburg',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: root.id,
      });

      const source = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, created.id), eq(einsatzEinheit.nameImEinsatz, 'OV Oldenburg')))
        .get();
      expect(source).toBeTruthy();

      createFahrzeug(ctx, {
        einsatzId: created.id,
        name: 'MTW OV',
        aktuelleEinsatzEinheitId: source!.id,
      });

      const fahrzeug = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.einsatzId, created.id)).get();
      expect(fahrzeug?.aktuelleEinsatzEinheitId).toBe(source!.id);
      expect(fahrzeug?.aktuellerAbschnittId).toBe(root.id);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('supports splitting unit and exposes details', () => {
    const ctx = createTestDb('s1-control-einsatz-split-');
    try {
      const created = createEinsatz(ctx, { name: 'THW Lage', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'TZ Basis',
        organisation: 'THW',
        aktuelleStaerke: 12,
        aktuelleStaerkeTaktisch: '1/2/9/12',
        aktuellerAbschnittId: root.id,
      });

      const source = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, created.id), eq(einsatzEinheit.nameImEinsatz, 'TZ Basis')))
        .get();
      expect(source).toBeTruthy();

      splitEinheit(ctx, {
        einsatzId: created.id,
        sourceEinheitId: source!.id,
        nameImEinsatz: 'TZ Basis - Teil 1',
        fuehrung: 0,
        unterfuehrung: 1,
        mannschaft: 3,
      });

      const updatedSource = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.id, source!.id)).get();
      expect(updatedSource?.aktuelleStaerkeTaktisch).toBe('1/1/6/8');

      const details = listAbschnittDetails(ctx, created.id, root.id);
      expect(details.einheiten).toHaveLength(2);
      expect(details.einheiten.some((e) => e.parentEinsatzEinheitId === source!.id)).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('checks undo availability from command log', () => {
    const ctx = createTestDb('s1-control-einsatz-undo-flag-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      expect(hasUndoableCommand(ctx, created.id)).toBe(false);

      const userId = 'u1';
      ctx.db
        .insert(benutzer)
        .values({
          id: userId,
          name: 'tester',
          rolle: 'S1',
          passwortHash: hashPassword('pw'),
          aktiv: true,
        })
        .run();

      ctx.db
        .insert(einsatzCommandLog)
        .values({
          id: 'c1',
          einsatzId: created.id,
          benutzerId: userId,
          commandTyp: 'MOVE_EINHEIT',
          payloadJson: '{}',
          timestamp: new Date().toISOString(),
          undone: false,
        })
        .run();

      expect(hasUndoableCommand(ctx, created.id)).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('throws for invalid split requests', () => {
    const ctx = createTestDb('s1-control-einsatz-split-invalid-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'Basis',
        organisation: 'THW',
        aktuelleStaerke: 3,
        aktuelleStaerkeTaktisch: '0/0/3/3',
        aktuellerAbschnittId: root.id,
      });

      const source = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;

      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: source.id,
          nameImEinsatz: 'Teil',
          fuehrung: 0,
          unterfuehrung: 0,
          mannschaft: 4,
        }),
      ).toThrow('übersteigt');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('throws if vehicle is created without existing unit', () => {
    const ctx = createTestDb('s1-control-einsatz-vehicle-validation-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      expect(() =>
        createFahrzeug(ctx, {
          einsatzId: created.id,
          name: 'GKW 0',
          aktuelleEinsatzEinheitId: '',
        }),
      ).toThrow('erforderlich');

      expect(() =>
        createFahrzeug(ctx, {
          einsatzId: created.id,
          name: 'GKW 1',
          aktuelleEinsatzEinheitId: 'missing-unit',
        }),
      ).toThrow('nicht gefunden');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('rejects split with empty name and invalid organisation', () => {
    const ctx = createTestDb('s1-control-einsatz-split-validation-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'Basis',
        organisation: 'THW',
        aktuelleStaerke: 3,
        aktuelleStaerkeTaktisch: '0/0/3/3',
        aktuellerAbschnittId: root.id,
      });
      const source = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;

      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: source.id,
          nameImEinsatz: ' ',
          fuehrung: 0,
          unterfuehrung: 0,
          mannschaft: 1,
        }),
      ).toThrow('erforderlich');

      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: source.id,
          nameImEinsatz: 'Teil',
          organisation: 'INVALID' as never,
          fuehrung: 0,
          unterfuehrung: 0,
          mannschaft: 1,
        }),
      ).toThrow('Organisation ist');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('creates nested abschnitt with parent reference', () => {
    const ctx = createTestDb('s1-control-einsatz-abschnitt-parent-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;
      const child = createAbschnitt(ctx, {
        einsatzId: created.id,
        name: 'EA Nord',
        parentId: root.id,
        systemTyp: 'NORMAL',
      });
      const inDb = ctx.db.select().from(einsatzAbschnitt).where(eq(einsatzAbschnitt.id, child.id)).get();
      expect(inDb?.parentId).toBe(root.id);
    } finally {
      ctx.sqlite.close();
    }
  });
});
