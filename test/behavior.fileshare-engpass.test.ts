import os from 'node:os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClientPresenceService } from '../src/main/services/clients';
import {
  createAbschnitt,
  createEinheit,
  createEinsatz,
  createFahrzeug,
  listAbschnittDetails,
  listAbschnittDetailsBatch,
  listAbschnitte,
} from '../src/main/services/einsatz';
import { activeClient } from '../src/main/db/schema';
import { createTestDb } from './helpers/db';

describe('behavior: Fileshare-Engpass', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(os, 'hostname').mockReturnValue('perf-client');
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      en0: [{ family: 'IPv4', internal: false, address: '10.10.20.5' }] as never,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('Szenario: DB-Open setzt WAL/NORMAL/FOREIGN_KEYS', () => {
    const ctx = createTestDb('s1-control-behavior-db-pragmas-');
    try {
      const journalMode = ctx.sqlite.pragma('journal_mode', { simple: true });
      const synchronous = ctx.sqlite.pragma('synchronous', { simple: true });
      const foreignKeys = ctx.sqlite.pragma('foreign_keys', { simple: true });
      const busyTimeout = ctx.sqlite.pragma('busy_timeout', { simple: true });

      expect(String(journalMode).toLowerCase()).toBe('wal');
      expect(Number(synchronous)).toBe(1);
      expect(Number(foreignKeys)).toBe(1);
      expect(Number(busyTimeout)).toBe(5000);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('Szenario: Client-Liste verursacht keine zusätzlichen Heartbeat-Writes', () => {
    const ctx = createTestDb('s1-control-behavior-presence-readonly-');
    try {
      const service = new ClientPresenceService();
      service.start(ctx);

      const before = ctx.db.select().from(activeClient).all();
      expect(before).toHaveLength(1);
      const beforeSeen = before[0]!.lastSeen;

      service.listActiveClients();
      service.listActiveClients();
      service.listActiveClients();

      const after = ctx.db.select().from(activeClient).all();
      expect(after).toHaveLength(1);
      expect(after[0]!.lastSeen).toBe(beforeSeen);
    } finally {
      ctx.sqlite.close();
    }
  });

  it('Szenario: Batch-Details liefern identische Inhalte wie Einzelabfragen', () => {
    const ctx = createTestDb('s1-control-behavior-batch-details-');
    try {
      const einsatz = createEinsatz(ctx, { name: 'Hochwasser', fuestName: 'FüSt 1' });
      const root = listAbschnitte(ctx, einsatz.id)[0]!;
      const ost = createAbschnitt(ctx, {
        einsatzId: einsatz.id,
        name: 'EA Ost',
        systemTyp: 'NORMAL',
        parentId: root.id,
      });

      createEinheit(ctx, {
        einsatzId: einsatz.id,
        nameImEinsatz: 'OV Oldenburg',
        organisation: 'THW',
        aktuelleStaerke: 9,
        aktuelleStaerkeTaktisch: '0/1/8/9',
        aktuellerAbschnittId: root.id,
      });
      createEinheit(ctx, {
        einsatzId: einsatz.id,
        nameImEinsatz: 'FW Wache 1',
        organisation: 'FEUERWEHR',
        aktuelleStaerke: 6,
        aktuelleStaerkeTaktisch: '0/1/5/6',
        aktuellerAbschnittId: ost.id,
      });

      const rootDetails = listAbschnittDetails(ctx, einsatz.id, root.id);
      const ostDetails = listAbschnittDetails(ctx, einsatz.id, ost.id);
      createFahrzeug(ctx, {
        einsatzId: einsatz.id,
        name: 'MTW 1',
        aktuelleEinsatzEinheitId: rootDetails.einheiten[0]!.id,
      });
      createFahrzeug(ctx, {
        einsatzId: einsatz.id,
        name: 'HLF 20',
        aktuelleEinsatzEinheitId: ostDetails.einheiten[0]!.id,
      });

      const expectedByAbschnitt: Record<string, ReturnType<typeof listAbschnittDetails>> = {
        [root.id]: listAbschnittDetails(ctx, einsatz.id, root.id),
        [ost.id]: listAbschnittDetails(ctx, einsatz.id, ost.id),
      };
      const batch = listAbschnittDetailsBatch(ctx, einsatz.id);

      expect(batch[root.id]).toEqual(expectedByAbschnitt[root.id]);
      expect(batch[ost.id]).toEqual(expectedByAbschnitt[ost.id]);
    } finally {
      ctx.sqlite.close();
    }
  });
});
