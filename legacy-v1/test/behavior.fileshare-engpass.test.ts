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
import { readSystemFile } from '../src/main/json-store/system-store';
import { systemFilePath } from '../src/main/db/connection';
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

  it('Szenario: JSON-Store öffnet und liest sauber', () => {
    const ctx = createTestDb('s1-control-behavior-db-json-');
    expect(ctx.einsatz.schemaVersion).toBe(1);
    expect(ctx.system.schemaVersion).toBe(1);
    expect(Array.isArray(ctx.einsatz.abschnitte)).toBe(true);
  });

  it('Szenario: Client-Liste nach listActiveClients nicht verändert', () => {
    const ctx = createTestDb('s1-control-behavior-presence-readonly-');
    const service = new ClientPresenceService();
    service.start(ctx);

    const sys1 = readSystemFile(systemFilePath(ctx.path));
    const before = sys1.activeClients;
    expect(before).toHaveLength(1);
    const beforeSeen = before[0]!.lastSeen;

    service.listActiveClients();
    service.listActiveClients();
    service.listActiveClients();

    // listActiveClients reads from disk — lastSeen should still be the same (no timer advance)
    const sys2 = readSystemFile(systemFilePath(ctx.path));
    expect(sys2.activeClients).toHaveLength(1);
    expect(sys2.activeClients[0]!.lastSeen).toBe(beforeSeen);
    service.stop(true);
  });

  it('Szenario: Batch-Details liefern identische Inhalte wie Einzelabfragen', () => {
    const ctx = createTestDb('s1-control-behavior-batch-details-');
    const einsatz = createEinsatz(ctx, { name: 'Hochwasser', fuestName: 'FüSt 1' });
    const root = listAbschnitte(ctx.einsatz, einsatz.id)[0]!;
    const ost = createAbschnitt(ctx, { einsatzId: einsatz.id, name: 'EA Ost', systemTyp: 'NORMAL', parentId: root.id });

    createEinheit(ctx, { einsatzId: einsatz.id, nameImEinsatz: 'OV Oldenburg', organisation: 'THW', aktuelleStaerke: 9, aktuelleStaerkeTaktisch: '0/1/8/9', aktuellerAbschnittId: root.id });
    createEinheit(ctx, { einsatzId: einsatz.id, nameImEinsatz: 'FW Wache 1', organisation: 'FEUERWEHR', aktuelleStaerke: 6, aktuelleStaerkeTaktisch: '0/1/5/6', aktuellerAbschnittId: ost.id });

    const rootDetails = listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, root.id);
    const ostDetails = listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, ost.id);

    createFahrzeug(ctx, { einsatzId: einsatz.id, name: 'MTW 1', aktuelleEinsatzEinheitId: rootDetails.einheiten[0]!.id });
    createFahrzeug(ctx, { einsatzId: einsatz.id, name: 'HLF 20', aktuelleEinsatzEinheitId: ostDetails.einheiten[0]!.id });

    const expectedByAbschnitt: Record<string, ReturnType<typeof listAbschnittDetails>> = {
      [root.id]: listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, root.id),
      [ost.id]: listAbschnittDetails(ctx.einsatz, ctx.system, einsatz.id, ost.id),
    };
    const batch = listAbschnittDetailsBatch(ctx.einsatz, ctx.system, einsatz.id);

    expect(batch[root.id]).toEqual(expectedByAbschnitt[root.id]);
    expect(batch[ost.id]).toEqual(expectedByAbschnitt[ost.id]);
  });
});
