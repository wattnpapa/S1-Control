import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { setEinsatzStatus } from '../src/main/services/einsatz-write/einsatz-core';
import { setzeBearbeiter } from '../src/main/services/auth';
import { createDbPath, openTestDb } from './helpers/db';

describe('Einsatz abschließen', () => {
  it('beendet den Einsatz und setzt ein Ende-Datum', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);

    setEinsatzStatus(ctx, { einsatzId, status: 'BEENDET' });

    expect(ctx.einsatz.einsatz.status).toBe('BEENDET');
    expect(ctx.einsatz.einsatz.end).not.toBeNull();
  });

  it('öffnet einen beendeten Einsatz wieder und räumt das Ende-Datum ab', () => {
    const einsatzId = crypto.randomUUID();
    const ctx = openTestDb(createDbPath(), einsatzId);
    setEinsatzStatus(ctx, { einsatzId, status: 'BEENDET' });

    setEinsatzStatus(ctx, { einsatzId, status: 'AKTIV' });

    expect(ctx.einsatz.einsatz.status).toBe('AKTIV');
    expect(ctx.einsatz.einsatz.end).toBeNull();
  });

  it('meldet einen unbekannten Einsatz', () => {
    const ctx = openTestDb(createDbPath(), crypto.randomUUID());
    expect(() => setEinsatzStatus(ctx, { einsatzId: 'fremd', status: 'BEENDET' })).toThrow(/nicht gefunden/);
  });
});

describe('Bearbeiter der Sitzung', () => {
  it('legt einen neuen Bearbeiter an und findet ihn beim zweiten Mal wieder', () => {
    const ctx = openTestDb(createDbPath(), crypto.randomUUID());

    const erster = setzeBearbeiter(ctx, '  Mustermann ');
    const zweiter = setzeBearbeiter(ctx, 'Mustermann');

    expect(erster.name).toBe('Mustermann');
    expect(zweiter.id).toBe(erster.id);
    expect(ctx.system.benutzer.filter((b) => b.name === 'Mustermann')).toHaveLength(1);
  });

  it('weist einen leeren Namen ab', () => {
    const ctx = openTestDb(createDbPath(), crypto.randomUUID());
    expect(() => setzeBearbeiter(ctx, '   ')).toThrow(/Namen angeben/);
  });
});
