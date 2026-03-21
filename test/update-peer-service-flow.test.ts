import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PeerOfferWireMessage } from '../src/main/services/update-peer-protocol';

type Handler = (...args: unknown[]) => void;

function makeEmitter() {
  const handlers = new Map<string, Handler[]>();
  return {
    on(event: string, handler: Handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const handler of handlers.get(event) ?? []) {
        handler(...args);
      }
    },
  };
}

const hoisted = vi.hoisted(() => ({
  socket: null as null | {
    on: (event: string, handler: Handler) => unknown;
    emit: (event: string, ...args: unknown[]) => void;
    bind: (port: number, cb: () => void) => void;
    setBroadcast: (flag: boolean) => void;
    send: (message: string, port: number, host: string) => void;
    close: () => void;
    sent: Array<{ message: string; port: number; host: string }>;
    closed: boolean;
  },
  server: null as null | {
    listen: (port: number, host: string, cb: () => void) => void;
    close: () => void;
    address: () => { port: number };
    closed: boolean;
  },
  broadcastMock: vi.fn(),
  downloadMock: vi.fn(),
  createLocalFeedMock: vi.fn(async () => ({ feedUrl: 'http://127.0.0.1:40000', close: async () => undefined })),
  debugMock: vi.fn(),
}));

vi.mock('node:dgram', () => ({
  default: {
    createSocket: vi.fn(() => hoisted.socket),
  },
  createSocket: vi.fn(() => hoisted.socket),
}));

vi.mock('node:http', () => ({
  default: {
    createServer: vi.fn(() => hoisted.server),
  },
  createServer: vi.fn(() => hoisted.server),
}));

vi.mock('../src/main/services/update-peer-protocol', async () => {
  const actual = await vi.importActual<typeof import('../src/main/services/update-peer-protocol')>(
    '../src/main/services/update-peer-protocol',
  );
  return {
    ...actual,
    broadcastQuery: hoisted.broadcastMock,
  };
});

vi.mock('../src/main/services/update-peer-transfer', () => ({
  downloadPeerFile: hoisted.downloadMock,
  nextPeerBlockTimestamp: vi.fn(() => 999999999999),
}));

vi.mock('../src/main/services/update-peer-feed', () => ({
  createLocalFeedServer: hoisted.createLocalFeedMock,
}));

vi.mock('../src/main/services/debug', () => ({
  debugSync: hoisted.debugMock,
}));

import { UpdatePeerService } from '../src/main/services/update-peer';
import { DISCOVERY_PORT, DISCOVERY_TIMEOUT_MS } from '../src/main/services/update-peer-protocol';

describe('update peer service flow', () => {
  const tempDirs: string[] = [];

  beforeEach(() => {
    const socketEmitter = makeEmitter();
    hoisted.socket = {
      ...socketEmitter,
      bind: (_port: number, cb: () => void) => cb(),
      setBroadcast: () => undefined,
      send: (message: string, port: number, host: string) => {
        hoisted.socket?.sent.push({ message, port, host });
      },
      close: () => {
        if (hoisted.socket) hoisted.socket.closed = true;
      },
      sent: [],
      closed: false,
    };
    hoisted.server = {
      listen: (_port: number, _host: string, cb: () => void) => cb(),
      address: () => ({ port: 45555 }),
      close: () => {
        if (hoisted.server) hoisted.server.closed = true;
      },
      closed: false,
    };
    hoisted.broadcastMock.mockReset();
    hoisted.downloadMock.mockReset();
    hoisted.createLocalFeedMock.mockClear();
    hoisted.debugMock.mockReset();
  });

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('starts/stops services, announces artifacts and resolves discovery offers', async () => {
    vi.useFakeTimers();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-peer-service-'));
    tempDirs.push(dir);
    const artifactPath = path.join(dir, 'S1-Control.zip');
    fs.writeFileSync(artifactPath, 'zip');

    const service = new UpdatePeerService(dir, true);
    service.startPeerServices();

    const statusAfterStart = service.getStatus();
    expect(statusAfterStart.enabled).toBe(true);
    expect(statusAfterStart.seederActive).toBe(true);
    expect(statusAfterStart.httpPort).toBe(45555);

    service.announceLocalArtifacts([
      {
        version: '2026.03.21.16.00',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
        artifactName: 'S1-Control.zip',
        sha512: 'sha',
        size: 3,
        filePath: artifactPath,
        freshnessTs: '2026-03-21T16:00:00.000Z',
      },
      {
        version: '2026.03.21.16.00',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
        artifactName: 'missing.zip',
        sha512: 'sha',
        size: 3,
        filePath: path.join(dir, 'missing.zip'),
        freshnessTs: '2026-03-21T16:00:00.000Z',
      },
    ]);

    const queryPromise = service.queryPeersForVersion({
      requestId: 'req-1',
      versionWanted: '2026.03.21.16.00',
      platform: 'darwin',
      arch: 'arm64',
      channel: 'latest',
    });
    expect(hoisted.broadcastMock).toHaveBeenCalledTimes(1);

    const offer: PeerOfferWireMessage = {
      requestId: 'req-1',
      peerId: 'remote-peer',
      host: '10.0.0.12',
      httpPort: 41235,
      version: '2026.03.21.16.00',
      artifactName: 'S1-Control.zip',
      sha512: 'sha',
      size: 3,
      freshnessTs: '2026-03-21T16:00:00.000Z',
      uptimeMs: 1200,
    };
    hoisted.socket?.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 's1-update-offer', payload: offer }), 'utf8'),
      { address: '10.0.0.12', port: DISCOVERY_PORT },
    );
    vi.advanceTimersByTime(DISCOVERY_TIMEOUT_MS + 1);

    const offers = await queryPromise;
    expect(offers).toHaveLength(1);
    expect(offers[0]?.peerId).toBe('remote-peer');
    expect(service.getStatus().discoveredOffers.length).toBeGreaterThan(0);

    const pending = service.queryPeersForVersion({
      requestId: 'req-stop',
      versionWanted: '*',
      platform: 'darwin',
      arch: 'arm64',
      channel: 'latest',
    });
    service.stopPeerServices();
    await expect(pending).resolves.toEqual([]);
    expect(hoisted.socket?.closed).toBe(true);
    expect(hoisted.server?.closed).toBe(true);
  });

  it('handles download success, hash-failure quarantine and disabled mode no-ops', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-peer-service-'));
    tempDirs.push(dir);
    const enabled = new UpdatePeerService(dir, true);
    enabled.startPeerServices();

    hoisted.downloadMock.mockResolvedValueOnce({
      targetPath: '/tmp/S1-Control.zip',
      stats: {
        direction: 'download',
        peerId: 'peer-a',
        host: '10.0.0.11',
        artifactName: 'S1-Control.zip',
        bytes: 3,
        durationMs: 1,
        at: '2026-03-21T16:00:00.000Z',
        ok: true,
      },
    });

    const offer = {
      peerId: 'peer-a',
      host: '10.0.0.11',
      httpPort: 41235,
      version: '2026.03.21.16.00',
      artifactName: 'S1-Control.zip',
      sha512: 'sha',
      size: 3,
      freshnessTs: '2026-03-21T16:00:00.000Z',
      rttMs: 10,
    };
    await expect(enabled.downloadFromPeer(offer, '/tmp/a.zip', 'sha')).resolves.toBe('/tmp/S1-Control.zip');
    expect(enabled.getStatus().lastTransfer?.ok).toBe(true);

    hoisted.downloadMock.mockRejectedValueOnce(new Error('SHA512-Prüfung fehlgeschlagen'));
    await expect(enabled.downloadFromPeer(offer, '/tmp/a.zip', 'sha')).rejects.toThrow();

    hoisted.downloadMock.mockImplementationOnce(async (input: { blockedUntil?: number }) => {
      expect(input.blockedUntil).toBe(999999999999);
      return {
        targetPath: '/tmp/S1-Control.zip',
        stats: {
          direction: 'download',
          peerId: 'peer-a',
          host: '10.0.0.11',
          artifactName: 'S1-Control.zip',
          bytes: 3,
          durationMs: 1,
          at: '2026-03-21T16:00:00.000Z',
          ok: true,
        },
      };
    });
    await expect(enabled.downloadFromPeer(offer, '/tmp/a.zip', 'sha')).resolves.toBe('/tmp/S1-Control.zip');

    const feed = await enabled.createLocalFeedServer({
      platform: 'darwin',
      version: '2026.03.21.16.00',
      artifactName: 'S1-Control.zip',
      sha512: 'sha',
      size: 3,
      filePath: '/tmp/S1-Control.zip',
    });
    expect(feed.feedUrl).toBe('http://127.0.0.1:40000');
    expect(hoisted.createLocalFeedMock).toHaveBeenCalledTimes(1);

    const disabled = new UpdatePeerService(dir, false);
    disabled.startPeerServices();
    expect(disabled.getStatus().seederActive).toBe(false);
    await expect(
      disabled.queryPeersForVersion({
        requestId: 'req-disabled',
        versionWanted: '*',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      }),
    ).resolves.toEqual([]);
  });
});
