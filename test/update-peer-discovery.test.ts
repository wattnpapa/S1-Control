import { describe, expect, it, vi } from 'vitest';
import type { PeerOffer } from '../src/shared/types';

vi.mock('../src/main/services/update-peer-protocol', () => ({
  nowIso: vi.fn(() => '2026-03-05T21:00:00.000Z'),
  DISCOVERY_OFFER_TTL_MS: 60_000,
}));

import { PeerDiscoveryTracker } from '../src/main/services/update-peer-discovery';

function offer(peerId: string, artifactName: string): PeerOffer {
  return {
    peerId,
    host: '10.0.0.10',
    httpPort: 47000,
    version: '2026.03.05.21.00',
    artifactName,
    sha512: 'abc',
    size: 1000,
    freshnessTs: '2026-03-05T20:59:00.000Z',
  };
}

describe('peer discovery tracker', () => {
  it('starts with empty state', () => {
    const tracker = new PeerDiscoveryTracker();
    expect(tracker.getLastDiscoveryAt()).toBeNull();
    expect(tracker.getObservedOffers()).toEqual([]);
  });

  it('stores offers and replaces by peerId+artifact key', () => {
    const tracker = new PeerDiscoveryTracker();
    const first = offer('peer-a', 'A.zip');
    const second = { ...first, host: '10.0.0.11' };

    tracker.observe([first]);
    tracker.observe([second]);

    expect(tracker.getObservedOffers()).toHaveLength(1);
    expect(tracker.getObservedOffers()[0]?.host).toBe('10.0.0.11');
    expect(tracker.getLastDiscoveryAt()).toBe('2026-03-05T21:00:00.000Z');
  });

  it('prunes stale entries based on ttl', () => {
    const tracker = new PeerDiscoveryTracker();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-03-05T21:00:30.000Z'));
    tracker.observe([offer('peer-a', 'A.zip')]);

    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-03-05T21:02:00.000Z'));
    expect(tracker.getObservedOffers()).toEqual([]);
  });
});
