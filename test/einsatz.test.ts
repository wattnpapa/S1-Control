import { describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  benutzer,
  einsatz,
  einsatzAbschnitt,
  einsatzCommandLog,
  einsatzEinheit,
  einsatzEinheitHelfer,
  einsatzFahrzeug,
  stammdatenFahrzeug,
} from '../src/main/db/schema';
import { AppError } from '../src/main/services/errors';
import {
  archiveEinsatz,
  createAbschnitt,
  createEinheit,
  createEinheitHelfer,
  createEinsatz,
  createFahrzeug,
  deleteEinheitHelfer,
  ensureNotArchived,
  hasUndoableCommand,
  listAbschnittDetails,
  listAbschnitte,
  listEinheitHelfer,
  listEinsaetze,
  splitEinheit,
  updateAbschnitt,
  updateEinheit,
  updateEinheitHelfer,
  updateFahrzeug,
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

  it('supports abschnitt type BEREITSTELLUNGSRAUM', () => {
    const ctx = createTestDb('s1-control-einsatz-bereitstellungsraum-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      const abschnitt = createAbschnitt(ctx, {
        einsatzId: created.id,
        name: 'BR Nord',
        parentId: root.id,
        systemTyp: 'BEREITSTELLUNGSRAUM',
      });

      const row = ctx.db.select().from(einsatzAbschnitt).where(eq(einsatzAbschnitt.id, abschnitt.id)).get();
      expect(row?.systemTyp).toBe('BEREITSTELLUNGSRAUM');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('supports explicit tactical-sign config and source fallback during split', () => {
    const ctx = createTestDb('s1-control-einsatz-sign-config-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'Basis',
        organisation: 'THW',
        aktuelleStaerke: 4,
        aktuelleStaerkeTaktisch: '0/0/4/4',
        tacticalSignConfigJson: '{"unit":"X"}',
        aktuellerAbschnittId: root.id,
      });

      const source = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;
      expect(source.tacticalSignConfigJson).toContain('"unit":"X"');

      splitEinheit(ctx, {
        einsatzId: created.id,
        sourceEinheitId: source.id,
        nameImEinsatz: 'Teil A',
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 1,
      });

      splitEinheit(ctx, {
        einsatzId: created.id,
        sourceEinheitId: source.id,
        nameImEinsatz: 'Teil B',
        fuehrung: 0,
        unterfuehrung: 0,
        mannschaft: 1,
        tacticalSignConfigJson: '{"unit":"Y"}',
      });

      const children = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.parentEinsatzEinheitId, source.id), eq(einsatzEinheit.einsatzId, created.id)))
        .all();

      expect(children.some((row) => row.tacticalSignConfigJson?.includes('"unit":"X"'))).toBe(true);
      expect(children.some((row) => row.tacticalSignConfigJson?.includes('"unit":"Y"'))).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('validates split source existence, non-zero split and non-negative values', () => {
    const ctx = createTestDb('s1-control-einsatz-split-edge-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'Basis',
        organisation: 'THW',
        aktuelleStaerke: 2,
        aktuelleStaerkeTaktisch: '0/0/2/2',
        aktuellerAbschnittId: root.id,
      });

      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: 'missing',
          nameImEinsatz: 'Teil',
          fuehrung: 0,
          unterfuehrung: 0,
          mannschaft: 1,
        }),
      ).toThrow('Quell-Einheit nicht gefunden');

      const source = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;
      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: source.id,
          nameImEinsatz: 'Teil',
          fuehrung: 0,
          unterfuehrung: 0,
          mannschaft: 0,
        }),
      ).toThrow('größer 0');

      expect(() =>
        splitEinheit(ctx, {
          einsatzId: created.id,
          sourceEinheitId: source.id,
          nameImEinsatz: 'Teil',
          fuehrung: -1,
          unterfuehrung: 0,
          mannschaft: 0,
        }),
      ).toThrow('>= 0');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('creates fahrzeug with existing stammdaten id without creating duplicates', () => {
    const ctx = createTestDb('s1-control-einsatz-fahrzeug-stammdaten-');
    try {
      const created = createEinsatz(ctx, { name: 'Lage', fuestName: 'FüSt' });
      const root = listAbschnitte(ctx, created.id)[0]!;
      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'Basis',
        organisation: 'THW',
        aktuelleStaerke: 2,
        aktuelleStaerkeTaktisch: '0/0/2/2',
        aktuellerAbschnittId: root.id,
      });
      const source = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;
      ctx.db.insert(stammdatenFahrzeug).values({
        id: 'stamm-1',
        stammdatenEinheitId: null,
        name: 'MTW',
        kennzeichen: 'THW-1',
        standardPiktogrammKey: 'mtw',
      }).run();

      createFahrzeug(ctx, {
        einsatzId: created.id,
        name: 'MTW',
        aktuelleEinsatzEinheitId: source.id,
        stammdatenFahrzeugId: 'stamm-1',
      });
      createFahrzeug(ctx, {
        einsatzId: created.id,
        name: 'MTW 2',
        aktuelleEinsatzEinheitId: source.id,
        stammdatenFahrzeugId: 'stamm-1',
      });

      const rows = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.einsatzId, created.id)).all();
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.stammdatenFahrzeugId === 'stamm-1')).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('updates abschnitt, einheit and fahrzeug in-place', () => {
    const ctx = createTestDb('s1-control-einsatz-update-');
    try {
      const created = createEinsatz(ctx, { name: 'Update-Test', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      const abschnitt = createAbschnitt(ctx, {
        einsatzId: created.id,
        name: 'EA Nord',
        systemTyp: 'NORMAL',
        parentId: root.id,
      });

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'FK Nord',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: abschnitt.id,
      });
      const einheit = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, created.id), eq(einsatzEinheit.nameImEinsatz, 'FK Nord')))
        .get()!;

      createFahrzeug(ctx, {
        einsatzId: created.id,
        name: 'MTW Nord',
        kennzeichen: 'THW-1',
        aktuelleEinsatzEinheitId: einheit.id,
      });
      const fahrzeug = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.einsatzId, created.id)).get()!;

      updateAbschnitt(ctx, {
        einsatzId: created.id,
        abschnittId: abschnitt.id,
        name: 'EA Nord Neu',
        systemTyp: 'LOGISTIK',
        parentId: null,
      });
      updateEinheit(ctx, {
        einsatzId: created.id,
        einheitId: einheit.id,
        nameImEinsatz: 'FK Nord Neu',
        organisation: 'FEUERWEHR',
        aktuelleStaerke: 6,
        aktuelleStaerkeTaktisch: '0/1/5/6',
        status: 'IN_BEREITSTELLUNG',
      });
      updateFahrzeug(ctx, {
        einsatzId: created.id,
        fahrzeugId: fahrzeug.id,
        name: 'ELW Nord',
        kennzeichen: 'HH-1234',
        aktuelleEinsatzEinheitId: einheit.id,
        status: 'IN_BEREITSTELLUNG',
      });

      const updatedAbschnitt = ctx.db.select().from(einsatzAbschnitt).where(eq(einsatzAbschnitt.id, abschnitt.id)).get();
      expect(updatedAbschnitt?.name).toBe('EA Nord Neu');
      expect(updatedAbschnitt?.systemTyp).toBe('LOGISTIK');
      expect(updatedAbschnitt?.parentId).toBeNull();

      const updatedEinheit = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.id, einheit.id)).get();
      expect(updatedEinheit?.nameImEinsatz).toBe('FK Nord Neu');
      expect(updatedEinheit?.organisation).toBe('FEUERWEHR');
      expect(updatedEinheit?.aktuelleStaerkeTaktisch).toBe('0/1/5/6');
      expect(updatedEinheit?.status).toBe('IN_BEREITSTELLUNG');

      const updatedVehicle = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.id, fahrzeug.id)).get();
      expect(updatedVehicle?.status).toBe('IN_BEREITSTELLUNG');
      expect(updatedVehicle?.aktuelleEinsatzEinheitId).toBe(einheit.id);

      const vehicleMaster = ctx.db
        .select()
        .from(stammdatenFahrzeug)
        .where(eq(stammdatenFahrzeug.id, updatedVehicle!.stammdatenFahrzeugId!))
        .get();
      expect(vehicleMaster?.name).toBe('ELW Nord');
      expect(vehicleMaster?.kennzeichen).toBe('HH-1234');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('stores person and reachability fields for units', () => {
    const ctx = createTestDb('s1-control-einsatz-person-fields-');
    try {
      const created = createEinsatz(ctx, { name: 'Personen-Test', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0]!;

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'FK OL',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: root.id,
        vegetarierVorhanden: true,
        erreichbarkeiten: '2m-Funk, Mobiltelefon GrFü',
      });

      const einheit = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, created.id), eq(einsatzEinheit.nameImEinsatz, 'FK OL')))
        .get();
      expect(einheit?.vegetarierVorhanden).toBe(true);
      expect(einheit?.erreichbarkeiten).toBe('2m-Funk, Mobiltelefon GrFü');

      updateEinheit(ctx, {
        einsatzId: created.id,
        einheitId: einheit!.id,
        nameImEinsatz: 'FK OL',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        status: 'AKTIV',
        vegetarierVorhanden: false,
        erreichbarkeiten: 'Nur 2m-Funk',
      });

      const updated = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.id, einheit!.id)).get();
      expect(updated?.vegetarierVorhanden).toBe(false);
      expect(updated?.erreichbarkeiten).toBe('Nur 2m-Funk');

      const details = listAbschnittDetails(ctx, created.id, root.id);
      const listed = details.einheiten.find((row) => row.id === einheit!.id);
      expect(listed?.vegetarierVorhanden).toBe(false);
      expect(listed?.erreichbarkeiten).toBe('Nur 2m-Funk');
    } finally {
      ctx.sqlite.close();
    }
  });

  it('creates, updates, lists and deletes helpers per unit', () => {
    const ctx = createTestDb('s1-control-einsatz-helfer-');
    try {
      const created = createEinsatz(ctx, { name: 'Helfer', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, created.id)[0]!;
      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'FK OL',
        organisation: 'THW',
        aktuelleStaerke: 4,
        aktuelleStaerkeTaktisch: '0/1/3/4',
        aktuellerAbschnittId: root.id,
      });
      const einheit = ctx.db.select().from(einsatzEinheit).where(eq(einsatzEinheit.einsatzId, created.id)).get()!;

      createEinheitHelfer(ctx, {
        einsatzId: created.id,
        einsatzEinheitId: einheit.id,
        name: '',
        rolle: 'FUEHRER',
        anzahl: 2,
        funktion: 'Truppführer',
        telefon: '0151-123',
        erreichbarkeit: 'Funk',
        vegetarisch: true,
      });

      let helfer = listEinheitHelfer(ctx, einheit.id);
      expect(helfer).toHaveLength(1);
      expect(helfer[0]?.name).toBe('N.N.');
      expect(helfer[0]?.rolle).toBe('FUEHRER');
      expect(helfer[0]?.anzahl).toBe(2);
      expect(helfer[0]?.vegetarisch).toBe(true);

      updateEinheitHelfer(ctx, {
        einsatzId: created.id,
        helferId: helfer[0]!.id,
        name: '',
        rolle: 'UNTERFUEHRER',
        anzahl: 3,
        funktion: 'Gruppenführer',
        telefon: '0151-456',
        erreichbarkeit: 'Telefon',
        vegetarisch: false,
        bemerkung: 'Schicht A',
      });

      helfer = listEinheitHelfer(ctx, einheit.id);
      expect(helfer[0]?.name).toBe('N.N.');
      expect(helfer[0]?.rolle).toBe('UNTERFUEHRER');
      expect(helfer[0]?.anzahl).toBe(3);
      expect(helfer[0]?.funktion).toBe('Gruppenführer');
      expect(helfer[0]?.vegetarisch).toBe(false);
      expect(helfer[0]?.bemerkung).toBe('Schicht A');

      const helperRow = ctx.db.select().from(einsatzEinheitHelfer).where(eq(einsatzEinheitHelfer.id, helfer[0]!.id)).get();
      expect(helperRow).toBeTruthy();

      deleteEinheitHelfer(ctx, { einsatzId: created.id, helferId: helfer[0]!.id });
      expect(listEinheitHelfer(ctx, einheit.id)).toHaveLength(0);
    } finally {
      ctx.sqlite.close();
    }
  });
});
