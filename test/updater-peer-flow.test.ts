import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const autoUpdaterMock = {
    setFeedURL: vi.fn(),
    checkForUpdates: vi.fn(async () => ({ updateInfo: { version: '2026.03.21.13.00' } })),
    downloadUpdate: vi.fn(async () => undefined),
  };
  const debugSyncMock = vi.fn();
  return { autoUpdaterMock, debugSyncMock };
});

vi.mock('electron-updater', () => ({
  autoUpdater: hoisted.autoUpdaterMock,
}));

vi.mock('../src/main/services/debug', () => ({
  debugSync: hoisted.debugSyncMock,
}));

import { tryPeerFirstDownload } from '../src/main/services/updater-peer-flow';
import type { PeerOffer } from '../src/shared/types';

function baseParams(overrides?: {
  offers?: PeerOffer[];
  downloadFailsFor?: Set<string>;
}) {
  const states: Array<Record<string, unknown>> = [];
  const offers = overrides?.offers ?? [];
  const failed = overrides?.downloadFailsFor ?? new Set<string>();

  const peerService = {
    queryPeersForVersion: vi.fn(async () => offers),
    downloadFromPeer: vi.fn(async (offer: PeerOffer, _targetPath: string, _sha: string, onProgress?: (t: number, total: number) => void) => {
      onProgress?.(50, 100);
      if (failed.has(offer.peerId)) {
        throw new Error(`failed-${offer.peerId}`);
      }
      return '/tmp/cache/S1-Control.zip';
    }),
    announceLocalArtifacts: vi.fn(),
    createLocalFeedServer: vi.fn(async () => ({
      feedUrl: 'http://127.0.0.1:33333',
      close: vi.fn(async () => undefined),
    })),
  };

  return {
    states,
    peerService,
    params: {
      peerService,
      pendingArtifact: {
        version: '2026.03.21.13.00',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
        artifactName: 'S1-Control.zip',
        sha512: 'sha',
        size: 123,
      },
      updateCacheDir: '/tmp/cache',
      genericFeedUrl: 'https://updates.example.test/latest',
      setState: (next: Record<string, unknown>) => states.push(next),
      nowIso: () => '2026-03-21T13:00:00.000Z',
    },
  };
}

describe('updater peer flow', () => {
  beforeEach(() => {
    hoisted.autoUpdaterMock.setFeedURL.mockReset();
    hoisted.autoUpdaterMock.checkForUpdates.mockReset();
    hoisted.autoUpdaterMock.downloadUpdate.mockReset();
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: 'x' } });
    hoisted.autoUpdaterMock.downloadUpdate.mockResolvedValue(undefined);
    hoisted.debugSyncMock.mockReset();
  });

  it('returns false when no offers are discovered', async () => {
    const { params, states, peerService } = baseParams();

    const ok = await tryPeerFirstDownload(params);

    expect(ok).toBe(false);
    expect(peerService.downloadFromPeer).not.toHaveBeenCalled();
    expect(states[0]).toMatchObject({
      stage: 'downloading',
      peerModeStage: 'discovering',
      downloadSource: 'peer-lan',
    });
  });

  it('downloads from peer, switches to local feed and restores generic feed url', async () => {
    const offer: PeerOffer = {
      peerId: 'peer-a',
      host: '10.0.0.11',
      httpPort: 41235,
      version: '2026.03.21.13.00',
      artifactName: 'S1-Control.zip',
      sha512: 'sha',
      size: 123,
      freshnessTs: '2026-03-21T13:00:00.000Z',
      rttMs: 10,
    };
    const { params, states, peerService } = baseParams({ offers: [offer] });

    const ok = await tryPeerFirstDownload(params);

    expect(ok).toBe(true);
    expect(peerService.downloadFromPeer).toHaveBeenCalledTimes(1);
    expect(peerService.announceLocalArtifacts).toHaveBeenCalledTimes(1);
    expect(peerService.createLocalFeedServer).toHaveBeenCalledTimes(1);
    expect(hoisted.autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(hoisted.autoUpdaterMock.downloadUpdate).toHaveBeenCalledTimes(1);
    expect(hoisted.autoUpdaterMock.setFeedURL).toHaveBeenCalledWith({ provider: 'generic', url: 'http://127.0.0.1:33333' });
    expect(hoisted.autoUpdaterMock.setFeedURL).toHaveBeenLastCalledWith({ provider: 'generic', url: 'https://updates.example.test/latest' });

    expect(states.some((entry) => entry.peerModeStage === 'verifying')).toBe(true);
    expect(states.some((entry) => entry.progressPercent === 50)).toBe(true);
  });

  it('tries up to two offers and logs failures before fallback false', async () => {
    const offers: PeerOffer[] = [
      {
        peerId: 'peer-a',
        host: '10.0.0.11',
        httpPort: 41235,
        version: '2026.03.21.13.00',
        artifactName: 'S1-Control.zip',
        sha512: 'sha',
        size: 123,
        freshnessTs: '2026-03-21T13:00:00.000Z',
        rttMs: 10,
      },
      {
        peerId: 'peer-b',
        host: '10.0.0.12',
        httpPort: 41235,
        version: '2026.03.21.13.00',
        artifactName: 'S1-Control.zip',
        sha512: 'sha',
        size: 123,
        freshnessTs: '2026-03-21T12:59:59.000Z',
        rttMs: 20,
      },
      {
        peerId: 'peer-c',
        host: '10.0.0.13',
        httpPort: 41235,
        version: '2026.03.21.13.00',
        artifactName: 'S1-Control.zip',
        sha512: 'sha',
        size: 123,
        freshnessTs: '2026-03-21T12:59:58.000Z',
        rttMs: 30,
      },
    ];

    const { params, peerService } = baseParams({
      offers,
      downloadFailsFor: new Set(['peer-a', 'peer-b', 'peer-c']),
    });

    const ok = await tryPeerFirstDownload(params);

    expect(ok).toBe(false);
    expect(peerService.downloadFromPeer).toHaveBeenCalledTimes(2);
    expect(hoisted.debugSyncMock).toHaveBeenCalled();
    expect(hoisted.autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
  });
});
