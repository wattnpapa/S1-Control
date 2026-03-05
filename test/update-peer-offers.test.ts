import { describe, expect, it, vi } from 'vitest';
import type { PeerArtifact } from '../src/shared/types';

vi.mock('../src/main/services/update-peer-protocol', () => ({
  detectPrimaryIp: vi.fn(() => '10.1.2.3'),
}));

import { buildPeerOfferWireMessage, matchesPeerQuery, toPeerOffer } from '../src/main/services/update-peer-offers';

describe('update-peer offers', () => {
  const artifact: PeerArtifact = {
    version: '2026.03.05.21.00',
    platform: 'darwin',
    arch: 'arm64',
    channel: 'latest',
    artifactName: 'S1-Control.zip',
    sha512: 'abc123',
    size: 1024,
    filePath: '/tmp/S1-Control.zip',
    freshnessTs: '2026-03-05T21:00:00.000Z',
  };

  it('matches peer query by wildcard or exact version and platform tuple', () => {
    expect(
      matchesPeerQuery(artifact, {
        requestId: 'r1',
        versionWanted: '*',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      }),
    ).toBe(true);
    expect(
      matchesPeerQuery(artifact, {
        requestId: 'r2',
        versionWanted: '2026.03.05.21.00',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      }),
    ).toBe(true);
    expect(
      matchesPeerQuery(artifact, {
        requestId: 'r3',
        versionWanted: '2026.03.05.20.59',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      }),
    ).toBe(false);
  });

  it('builds offer wire payload with host and uptime', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000100);
    const wire = buildPeerOfferWireMessage({
      requestId: 'req-1',
      peerId: 'peer-a',
      httpPort: 47000,
      artifact,
      startedAt: 1700000000000,
    });

    expect(wire.host).toBe('10.1.2.3');
    expect(wire.httpPort).toBe(47000);
    expect(wire.uptimeMs).toBe(100);
    expect(wire.artifactName).toBe('S1-Control.zip');
  });

  it('maps wire payload to internal offer with RTT', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000001200);
    const offer = toPeerOffer(
      {
        requestId: 'req-1',
        peerId: 'peer-a',
        host: '10.1.2.3',
        httpPort: 47000,
        version: artifact.version,
        artifactName: artifact.artifactName,
        sha512: artifact.sha512,
        size: artifact.size,
        freshnessTs: artifact.freshnessTs,
        uptimeMs: 100,
      },
      1700000001000,
    );

    expect(offer.rttMs).toBe(200);
    expect(offer.peerId).toBe('peer-a');
    expect(offer.host).toBe('10.1.2.3');
  });
});
