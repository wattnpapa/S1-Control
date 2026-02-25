import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { benutzer, einsatzEinheit, einsatzFahrzeug } from '../src/main/db/schema';
import { hashPassword } from '../src/main/services/auth';
import { moveEinheit, moveFahrzeug } from '../src/main/services/command';
import { createAbschnitt, createEinheit, createEinsatz, createFahrzeug, listAbschnitte } from '../src/main/services/einsatz';
import { AppError } from '../src/main/services/errors';
import { exportEinsatzakte } from '../src/main/services/export';
import { createTestDb } from './helpers/db';

describe('export service', () => {
  it('exports einsatzakte zip with html/csv/sqlite', async () => {
    const ctx = createTestDb('s1-control-export-');
    try {
      const created = createEinsatz(ctx, { name: 'Übung Nord', fuestName: 'FüSt 1' });
      const abschnitte = listAbschnitte(ctx, created.id);
      const root = abschnitte[0]!;
      const zielAbschnitt = createAbschnitt(ctx, {
        einsatzId: created.id,
        name: 'EA Nord',
        systemTyp: 'NORMAL',
      });

      createEinheit(ctx, {
        einsatzId: created.id,
        nameImEinsatz: 'OV Test',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: root.id,
      });
      const einheit = ctx.db
        .select()
        .from(einsatzEinheit)
        .where(and(eq(einsatzEinheit.einsatzId, created.id), eq(einsatzEinheit.nameImEinsatz, 'OV Test')))
        .get()!;

      createFahrzeug(ctx, {
        einsatzId: created.id,
        name: 'MTW 1',
        aktuelleEinsatzEinheitId: einheit.id,
      });
      const fahrzeug = ctx.db.select().from(einsatzFahrzeug).where(eq(einsatzFahrzeug.einsatzId, created.id)).get()!;

      const userId = 'user-export';
      ctx.db
        .insert(benutzer)
        .values({
          id: userId,
          name: 'exporter',
          rolle: 'S1',
          passwortHash: hashPassword('pw'),
          aktiv: true,
        })
        .run();
      const user = { id: userId, name: 'exporter', rolle: 'S1' as const };

      // Produce movement entries so report/csv include both tables.
      moveEinheit(ctx, { einsatzId: created.id, einheitId: einheit.id, nachAbschnittId: zielAbschnitt.id }, user);
      moveFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: fahrzeug.id, nachAbschnittId: zielAbschnitt.id }, user);

      const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-export-out-')), 'einsatzakte.zip');
      await exportEinsatzakte(ctx, created.id, outPath);

      expect(fs.existsSync(outPath)).toBe(true);
      const zipBuffer = fs.readFileSync(outPath);
      const zip = await JSZip.loadAsync(zipBuffer);

      const html = await zip.file('einsatzakte/report.html')?.async('string');
      const einheitenCsv = await zip.file('einsatzakte/einheiten.csv')?.async('string');
      const bewegungenCsv = await zip.file('einsatzakte/bewegungen.csv')?.async('string');
      const dbCopy = await zip.file('einsatzakte/einsatz.sqlite')?.async('nodebuffer');

      expect(html).toContain('Einsatzakte: Übung Nord');
      expect(html).toContain('Kräfteübersicht Einheiten');
      expect(einheitenCsv).toContain('name_im_einsatz');
      expect(bewegungenCsv).toContain('typ');
      expect(dbCopy && dbCopy.length > 0).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('throws NOT_FOUND when einsatz does not exist', async () => {
    const ctx = createTestDb('s1-control-export-missing-');
    try {
      const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-export-missing-out-')), 'x.zip');
      await expect(exportEinsatzakte(ctx, 'missing', outPath)).rejects.toThrow(AppError);
    } finally {
      ctx.sqlite.close();
    }
  });
});
