import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { moveEinheit, moveFahrzeug } from '../src/main/services/command';
import { createAbschnitt, createEinheit, createEinsatz, createFahrzeug, listAbschnitte } from '../src/main/services/einsatz';
import { AppError } from '../src/main/services/errors';
import { exportEinsatzakte } from '../src/main/services/export';
import { createTestDb } from './helpers/db';

describe('export service - payload', () => {
  it('exports einsatzakte zip with html/csv/s1control', async () => {
    const ctx = createTestDb('s1-control-export-');
    const created = createEinsatz(ctx, { name: 'Übung Nord', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, created.id)[0]!;
    const zielAbschnitt = createAbschnitt(ctx, { einsatzId: created.id, name: 'EA Nord', systemTyp: 'NORMAL' });

    createEinheit(ctx, { einsatzId: created.id, nameImEinsatz: 'OV Test', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: root.id });
    const einheit = ctx.einsatz.einheiten.find((e) => e.nameImEinsatz === 'OV Test' && e.einsatzId === created.id)!;

    createFahrzeug(ctx, { einsatzId: created.id, name: 'MTW 1', aktuelleEinsatzEinheitId: einheit.id });
    const fahrzeug = ctx.einsatz.fahrzeuge.find((f) => f.einsatzId === created.id)!;

    const user = { id: 'user-export', name: 'exporter', rolle: 'S1' as const };
    moveEinheit(ctx, { einsatzId: created.id, einheitId: einheit.id, nachAbschnittId: zielAbschnitt.id }, user);
    moveFahrzeug(ctx, { einsatzId: created.id, fahrzeugId: fahrzeug.id, nachAbschnittId: zielAbschnitt.id }, user);

    // Export reads from ctx.path - need to save first
    await ctx.save();

    const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-export-out-')), 'einsatzakte.zip');
    await exportEinsatzakte(ctx, created.id, outPath);

    expect(fs.existsSync(outPath)).toBe(true);
    const zipBuffer = fs.readFileSync(outPath);
    const zip = await JSZip.loadAsync(zipBuffer);

    const html = await zip.file('einsatzakte/report.html')?.async('string');
    const einheitenCsv = await zip.file('einsatzakte/einheiten.csv')?.async('string');
    const bewegungenCsv = await zip.file('einsatzakte/bewegungen.csv')?.async('string');
    const dbCopy = await zip.file('einsatzakte/einsatz.s1control')?.async('nodebuffer');

    expect(html).toContain('Einsatzakte: Übung Nord');
    expect(html).toContain('Kräfteübersicht Einheiten');
    expect(einheitenCsv).toContain('name_im_einsatz');
    expect(bewegungenCsv).toContain('typ');
    expect(dbCopy && dbCopy.length > 0).toBe(true);
  });
});

describe('export service - error and edge cases', () => {
  it('throws NOT_FOUND when einsatz does not exist', async () => {
    const ctx = createTestDb('s1-control-export-missing-');
    const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-export-missing-out-')), 'x.zip');
    await expect(exportEinsatzakte(ctx, 'missing', outPath)).rejects.toThrow(AppError);
  });

  it('exports valid report even without einheiten and fahrzeuge', async () => {
    const ctx = createTestDb('s1-control-export-empty-');
    const created = createEinsatz(ctx, { name: 'A & B <Test>', fuestName: 'FüSt "Zentral"' });
    await ctx.save();

    const outPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-export-empty-out-')), 'einsatzakte-empty.zip');
    await exportEinsatzakte(ctx, created.id, outPath);

    const zip = await JSZip.loadAsync(fs.readFileSync(outPath));
    const html = (await zip.file('einsatzakte/report.html')?.async('string')) ?? '';
    const bewegungenCsv = (await zip.file('einsatzakte/bewegungen.csv')?.async('string')) ?? '';

    expect(html).toContain('A &amp; B &lt;Test&gt;');
    expect(html).toContain('FüSt &quot;Zentral&quot;');
    expect(bewegungenCsv.trim().split('\n')).toHaveLength(1);
  });
});
