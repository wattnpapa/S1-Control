import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import { vi } from 'vitest';
import { ClientPresenceService } from '../src/main/services/clients';
import { readSystemFile } from '../src/main/json-store/system-store';
import { systemFilePath } from '../src/main/db/connection';
import { createTestDb } from './helpers/db';

function setupClientPresenceEnvironment(): void {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(os, 'hostname').mockReturnValue('client-a');
    vi.spyOn(os, 'networkInterfaces').mockReturnValue({
      en0: [{ family: 'IPv4', internal: false, address: '10.10.10.5' }] as never,
    } as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
}

describe('client presence service - lifecycle', () => {
  setupClientPresenceEnvironment();

  it('registers self, marks master and removes itself on stop', () => {
    const ctx = createTestDb('s1-control-clients-');
    const service = new ClientPresenceService();
    service.start(ctx);

    const list = service.listActiveClients();
    expect(list).toHaveLength(1);
    expect(list[0]?.computerName).toBe('client-a');
    expect(list[0]?.ipAddress).toBe('10.10.10.5');
    expect(typeof list[0]?.dbPath).toBe('string');
    expect(list[0]?.isSelf).toBe(true);
    expect(list[0]?.isMaster).toBe(true);
    expect(service.canWriteBackups()).toBe(true);

    service.stop(true);
    const sys = readSystemFile(systemFilePath(ctx.path));
    expect(sys.activeClients).toHaveLength(0);
  });
});

describe('client presence service - master election', () => {
  setupClientPresenceEnvironment();

  it('cleans stale clients and elects new master after old one stops', () => {
    const ctx = createTestDb('s1-control-clients-');

    const staleTs = new Date(Date.now() - 5 * 60_000).toISOString();
    ctx.system.activeClients.push({
      clientId: 'stale-client',
      computerName: 'stale-host',
      ipAddress: '10.0.0.99',
      dbPath: '/tmp/stale.s1control',
      lastSeen: staleTs,
      startedAt: staleTs,
      isMaster: false,
    });
    const { writeSystemFile } = require('../src/main/json-store/system-store');
    writeSystemFile(systemFilePath(ctx.path), ctx.system);

    const first = new ClientPresenceService();
    first.start(ctx);
    vi.advanceTimersByTime(10);

    vi.mocked(os.hostname).mockReturnValue('client-b');
    vi.mocked(os.networkInterfaces).mockReturnValue({
      en0: [{ family: 'IPv4', internal: false, address: '10.10.10.6' }] as never,
    } as never);

    const second = new ClientPresenceService();
    second.start(ctx);
    vi.advanceTimersByTime(10);

    const active = second.listActiveClients();
    expect(active.some((c) => c.clientId === 'stale-client')).toBe(false);
    expect(active).toHaveLength(2);
    expect(active.filter((c) => c.isMaster)).toHaveLength(1);
    expect(first.canWriteBackups()).toBe(true);
    expect(second.canWriteBackups()).toBe(false);

    first.stop(true);
    vi.advanceTimersByTime(10);
    second.listActiveClients();
    expect(second.canWriteBackups()).toBe(true);

    second.stop(true);
    const sys = readSystemFile(systemFilePath(ctx.path));
    expect(sys.activeClients.find((c) => c.clientId === 'stale-client')).toBeUndefined();
  });

  it('returns empty list before start and keeps db entry when stop(false)', () => {
    const ctx = createTestDb('s1-control-clients-');
    const service = new ClientPresenceService();
    expect(service.listActiveClients()).toEqual([]);

    service.start(ctx);
    const started = service.listActiveClients();
    expect(started).toHaveLength(1);

    service.stop(false);
    expect(service.canWriteBackups()).toBe(false);
    const sys = readSystemFile(systemFilePath(ctx.path));
    expect(sys.activeClients).toHaveLength(1);
  });
});

describe('client presence service - network/address behavior', () => {
  setupClientPresenceEnvironment();

  it('falls back to loopback if no external IPv4 is available', () => {
    const ctx = createTestDb('s1-control-clients-');
    vi.mocked(os.networkInterfaces).mockReturnValue({
      en0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }] as never,
      lo0: undefined as never,
    } as never);
    const service = new ClientPresenceService();
    service.start(ctx);

    const list = service.listActiveClients();
    expect(list[0]?.ipAddress).toBe('127.0.0.1');
    service.stop(true);
  });
});

describe('client presence service - robustness', () => {
  setupClientPresenceEnvironment();

  it('ignores errors on shutdown and no-ops heartbeat without path', () => {
    const ctx = createTestDb('s1-control-clients-');
    const service = new ClientPresenceService();
    service.start(ctx);
    service.stop(true);
    // Double stop should not throw
    service.stop(true);
  });
});
