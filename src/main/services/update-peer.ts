import crypto from 'node:crypto';
import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import { debugSync } from './debug';
import { PeerDiscoveryTracker } from './update-peer-discovery';
import { createLocalFeedServer } from './update-peer-feed';
import {
  broadcastQuery,
  detectPrimaryIp,
  DISCOVERY_MONITOR_INTERVAL_MS,
  DISCOVERY_PORT,
  DISCOVERY_TIMEOUT_MS,
  nowIso,
  parseWireMessage,
  selectBestOffers as selectBestOffersInternal,
} from './update-peer-protocol';
import type { PeerOfferWireMessage, PeerQueryMessage, WireMessage } from './update-peer-protocol';
import { downloadPeerFile, nextPeerBlockTimestamp } from './update-peer-transfer';
import type { PeerArtifact, PeerOffer, PeerTransferStats, PeerUpdateStatus } from '../../shared/types';

interface PendingQuery {
  startedAt: number;
  offers: PeerOffer[];
  resolve: (offers: PeerOffer[]) => void;
  timer: NodeJS.Timeout;
}

/**
 * Computes SHA512 digest (base64) for a local file.
 */
function sha512File(filePath: string): string {
  const hash = crypto.createHash('sha512');
  const file = fs.readFileSync(filePath);
  hash.update(file);
  return hash.digest('base64');
}

/**
 * Sort helper exported for tests and selection consistency.
 */
export function selectBestOffers(offers: PeerOffer[]): PeerOffer[] {
  return selectBestOffersInternal(offers);
}

/**
 * Decoder exported for tests to validate wire compatibility.
 */
export function decodePeerMessage(input: Buffer): WireMessage | null {
  return parseWireMessage(input);
}

export class UpdatePeerService {
  private readonly enabled: boolean;

  private readonly peerId = crypto.randomUUID();

  private readonly startedAt = Date.now();

  private readonly cacheDir: string;

  private readonly artifacts = new Map<string, PeerArtifact>();

  private readonly blockedPeers = new Map<string, number>();

  private readonly pendingQueries = new Map<string, PendingQuery>();

  private readonly discoveryTracker = new PeerDiscoveryTracker();

  private socket: dgram.Socket | null = null;

  private httpServer: http.Server | null = null;

  private httpPort: number | null = null;

  private lastTransfer: PeerTransferStats | null = null;

  private discoveryTimer: NodeJS.Timeout | null = null;

  /**
   * Creates a peer update service instance.
   */
  public constructor(cacheDir: string, enabled: boolean) {
    this.cacheDir = cacheDir;
    this.enabled = enabled;
  }

  /**
   * Returns current peer subsystem status for UI/debug.
   */
  public getStatus(): PeerUpdateStatus {
    return {
      enabled: this.enabled,
      seederActive: this.enabled && this.httpPort !== null,
      discoveryPort: DISCOVERY_PORT,
      httpPort: this.httpPort,
      offeredArtifacts: [...this.artifacts.values()],
      discoveredOffers: this.discoveryTracker.getObservedOffers(),
      lastDiscoveryAt: this.discoveryTracker.getLastDiscoveryAt(),
      lastTransfer: this.lastTransfer,
    };
  }

  /**
   * Starts HTTP seeding and UDP discovery services.
   */
  public startPeerServices(): void {
    if (!this.enabled || this.socket) {
      return;
    }
    fs.mkdirSync(this.cacheDir, { recursive: true });
    this.startHttpServer();
    this.startUdpSocket();
    this.startDiscoveryMonitor();
  }

  /**
   * Stops HTTP/UDP services and resolves pending discovery calls.
   */
  public stopPeerServices(): void {
    for (const pending of this.pendingQueries.values()) {
      clearTimeout(pending.timer);
      pending.resolve([]);
    }
    this.pendingQueries.clear();
    if (this.discoveryTimer) {
      clearInterval(this.discoveryTimer);
      this.discoveryTimer = null;
    }
    this.socket?.close();
    this.socket = null;
    this.httpServer?.close();
    this.httpServer = null;
    this.httpPort = null;
  }

  /**
   * Registers locally cached update artifacts for sharing to peers.
   */
  public announceLocalArtifacts(artifacts: PeerArtifact[]): void {
    for (const artifact of artifacts) {
      if (fs.existsSync(artifact.filePath)) {
        this.artifacts.set(artifact.artifactName, artifact);
      }
    }
    debugSync('peer-service', 'announce-artifacts', { count: artifacts.length, total: this.artifacts.size });
  }

  /**
   * Queries LAN peers for matching update artifacts.
   */
  public async queryPeersForVersion(query: PeerQueryMessage): Promise<PeerOffer[]> {
    if (!this.enabled || !this.socket || !this.httpPort) {
      return [];
    }
    return new Promise<PeerOffer[]>((resolve) => {
      const timer = setTimeout(() => this.finishPendingQuery(query.requestId), DISCOVERY_TIMEOUT_MS);
      this.pendingQueries.set(query.requestId, { startedAt: Date.now(), offers: [], resolve, timer });
      broadcastQuery(this.socket, { type: 's1-update-query', payload: query } satisfies WireMessage);
      debugSync('peer-discovery', 'query', {
        requestId: query.requestId,
        version: query.versionWanted,
        platform: query.platform,
        arch: query.arch,
      });
    });
  }

  /**
   * Downloads and validates an artifact from a selected peer.
   */
  public async downloadFromPeer(
    offer: PeerOffer,
    targetPath: string,
    expectedSha512: string,
    onProgress?: (transferred: number, total: number) => void,
  ): Promise<string> {
    try {
      const result = await downloadPeerFile({
        offer,
        targetPath,
        expectedSha512,
        blockedUntil: this.blockedPeers.get(offer.peerId),
        onProgress,
      });
      this.lastTransfer = result.stats;
      return result.targetPath;
    } catch (error) {
      if ((error instanceof Error ? error.message : String(error)).includes('SHA512-Prüfung')) {
        this.blockedPeers.set(offer.peerId, nextPeerBlockTimestamp());
      }
      const fallbackStats: PeerTransferStats = {
        direction: 'download',
        peerId: offer.peerId,
        host: offer.host,
        artifactName: offer.artifactName,
        bytes: 0,
        durationMs: 0,
        at: nowIso(),
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      };
      this.lastTransfer = (error as { peerStats?: PeerTransferStats }).peerStats ?? fallbackStats;
      throw error;
    }
  }

  /**
   * Creates temporary local generic feed endpoint for updater handover.
   */
  public createLocalFeedServer(metadata: {
    platform: string;
    version: string;
    artifactName: string;
    sha512: string;
    size: number;
    filePath: string;
  }): Promise<{ feedUrl: string; close: () => Promise<void> }> {
    return createLocalFeedServer(metadata);
  }

  /**
   * Verifies file integrity with SHA512.
   */
  public static verifyFileSha512(filePath: string, expected: string): boolean {
    return sha512File(filePath) === expected;
  }

  /**
   * Starts HTTP file server endpoint for artifact transfer.
   */
  private startHttpServer(): void {
    this.httpServer = http.createServer((req, res) => this.handleHttp(req, res));
    this.httpServer.listen(0, '0.0.0.0', () => {
      const addr = this.httpServer?.address();
      this.httpPort = typeof addr === 'object' && addr ? addr.port : null;
      debugSync('peer-service', 'http-listen', { peerId: this.peerId, httpPort: this.httpPort });
    });
  }

  /**
   * Starts UDP socket and message handlers.
   */
  private startUdpSocket(): void {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket.on('message', (msg, rinfo) => this.handleUdp(msg, rinfo.address, rinfo.port));
    this.socket.on('error', (error) => debugSync('peer-service', 'udp-error', { message: String(error) }));
    this.socket.bind(DISCOVERY_PORT, () => {
      this.socket?.setBroadcast(true);
      debugSync('peer-service', 'udp-listen', { peerId: this.peerId, port: DISCOVERY_PORT });
    });
  }

  /**
   * Serves artifact bytes for LAN peers.
   */
  private handleHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
    const requestUrl = req.url ? decodeURIComponent(req.url) : '/';
    const artifactName = requestUrl.replace(/^\/update\//, '');
    const artifact = this.artifacts.get(artifactName);
    if (!requestUrl.startsWith('/update/') || !artifact || !fs.existsSync(artifact.filePath)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('content-type', 'application/octet-stream');
    res.setHeader('content-length', String(artifact.size));
    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.end();
      return;
    }
    const started = Date.now();
    const stream = fs.createReadStream(artifact.filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end();
    });
    stream.on('end', () => {
      this.lastTransfer = {
        direction: 'upload',
        peerId: this.peerId,
        host: detectPrimaryIp(),
        artifactName,
        bytes: artifact.size,
        durationMs: Date.now() - started,
        at: nowIso(),
        ok: true,
      };
    });
    stream.pipe(res);
  }

  /**
   * Handles incoming UDP query/offer messages.
   */
  private handleUdp(msg: Buffer, sourceHost: string, sourcePort: number): void {
    const parsed = parseWireMessage(msg);
    if (!parsed) return;
    if (parsed.type === 's1-update-query') {
      this.handleUdpQuery(parsed.payload, sourceHost, sourcePort);
      return;
    }
    this.recordIncomingOffer(parsed.payload);
  }

  /**
   * Handles a discovery query and sends matching offers.
   */
  private handleUdpQuery(query: PeerQueryMessage, sourceHost: string, sourcePort: number): void {
    if (!this.socket || !this.httpPort) {
      return;
    }
    const matches = [...this.artifacts.values()].filter(
      (item) =>
        (query.versionWanted === '*' || item.version === query.versionWanted) &&
        item.platform === query.platform &&
        item.arch === query.arch &&
        item.channel === query.channel,
    );
    for (const matching of matches) {
      const payload: PeerOfferWireMessage = {
        requestId: query.requestId,
        peerId: this.peerId,
        host: detectPrimaryIp(),
        httpPort: this.httpPort,
        version: matching.version,
        artifactName: matching.artifactName,
        sha512: matching.sha512,
        size: matching.size,
        freshnessTs: matching.freshnessTs,
        uptimeMs: Date.now() - this.startedAt,
      };
      this.socket.send(JSON.stringify({ type: 's1-update-offer', payload } satisfies WireMessage), sourcePort, sourceHost);
      debugSync('peer-offer', 'sent', { requestId: query.requestId, to: sourceHost, artifact: matching.artifactName });
    }
  }

  /**
   * Stores incoming offer for an active query.
   */
  private recordIncomingOffer(payload: PeerOfferWireMessage): void {
    const pending = this.pendingQueries.get(payload.requestId);
    if (!pending || payload.peerId === this.peerId) {
      return;
    }
    pending.offers.push({
      peerId: payload.peerId,
      host: payload.host,
      httpPort: payload.httpPort,
      version: payload.version,
      artifactName: payload.artifactName,
      sha512: payload.sha512,
      size: payload.size,
      freshnessTs: payload.freshnessTs,
      rttMs: Date.now() - pending.startedAt,
    });
    debugSync('peer-offer', 'received', { requestId: payload.requestId, from: payload.host, artifact: payload.artifactName });
  }

  /**
   * Completes a pending query and resolves with sorted offers.
   */
  private finishPendingQuery(requestId: string): void {
    const pending = this.pendingQueries.get(requestId);
    this.pendingQueries.delete(requestId);
    const offers = selectBestOffersInternal(pending?.offers ?? []);
    this.discoveryTracker.observe(offers);
    pending?.resolve(offers);
  }

  /**
   * Starts periodic passive discovery scans for debug/status view.
   */
  private startDiscoveryMonitor(): void {
    if (!this.enabled || this.discoveryTimer) {
      return;
    }
    this.discoveryTimer = setInterval(() => {
      void this.scanNetworkOffers();
    }, DISCOVERY_MONITOR_INTERVAL_MS);
    void this.scanNetworkOffers();
  }

  /**
   * Performs one passive discovery scan cycle.
   */
  private async scanNetworkOffers(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    try {
      const offers = await this.queryPeersForVersion({
        requestId: crypto.randomUUID(),
        versionWanted: '*',
        platform: process.platform,
        arch: process.arch,
        channel: 'latest',
      });
      this.discoveryTracker.observe(offers);
      debugSync('peer-discovery', 'monitor-scan', { offers: offers.length });
    } catch (error) {
      debugSync('peer-discovery', 'monitor-scan-failed', { message: error instanceof Error ? error.message : String(error) });
    }
  }
}
