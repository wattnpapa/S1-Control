import { nowIso, DISCOVERY_OFFER_TTL_MS } from './update-peer-protocol';
import type { PeerOffer } from '../../shared/types';

interface ObservedPeerOffer extends PeerOffer {
  seenAt: string;
}

/**
 * Tracks discovered peer offers for diagnostics and status pages.
 */
export class PeerDiscoveryTracker {
  private readonly discoveredOffers = new Map<string, ObservedPeerOffer>();

  private lastDiscoveryAt: string | null = null;

  /**
   * Returns current discovery timestamp.
   */
  public getLastDiscoveryAt(): string | null {
    return this.lastDiscoveryAt;
  }

  /**
   * Returns observed offers and automatically prunes stale entries.
   */
  public getObservedOffers(): PeerOffer[] {
    this.prune();
    return [...this.discoveredOffers.values()];
  }

  /**
   * Stores newly observed offers and updates discovery timestamp.
   */
  public observe(offers: PeerOffer[]): void {
    const seenAt = nowIso();
    for (const offer of offers) {
      this.discoveredOffers.set(`${offer.peerId}:${offer.artifactName}`, { ...offer, seenAt });
    }
    this.lastDiscoveryAt = seenAt;
    this.prune();
  }

  /**
   * Removes offers older than the configured TTL.
   */
  private prune(): void {
    const threshold = Date.now() - DISCOVERY_OFFER_TTL_MS;
    for (const [key, offer] of this.discoveredOffers.entries()) {
      if (Date.parse(offer.seenAt) < threshold) {
        this.discoveredOffers.delete(key);
      }
    }
  }
}
