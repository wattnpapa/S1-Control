import crypto from 'node:crypto';
import dgram from 'node:dgram';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { debugSync } from './debug';
import type { PeerArtifact, PeerOffer, PeerTransferStats, PeerUpdateStatus } from '../../shared/types';

const DISCOVERY_PORT = Number(process.env.S1_UPDATER_PEER_PORT || '41234');
const DISCOVERY_TIMEOUT_MS = 1500;
const DOWNLOAD_TIMEOUT_MS = 3000;
const PEER_BLOCK_MS = 10 * 60 * 1000;

interface PeerQuery {
  requestId: string;
  versionWanted: string;
  platform: string;
  arch: string;
  channel: string;
}

interface PeerOfferWire {
  requestId: string;
  peerId: string;
  host: string;
  httpPort: number;
  version: string;
  artifactName: string;
  sha512: string;
  size: number;
  freshnessTs: string;
  uptimeMs: number;
}

type WireMessage =
  | { type: 's1-update-query'; payload: PeerQuery }
  | { type: 's1-update-offer'; payload: PeerOfferWire };

interface PendingQuery {
  startedAt: number;
  offers: PeerOffer[];
  resolve: (offers: PeerOffer[]) => void;
  timer: NodeJS.Timeout;
}

/**
 * Handles Now Iso.
 */
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Handles Parse Wire.
 */
function parseWire(input: Buffer): WireMessage | null {
  try {
    const parsed = JSON.parse(input.toString('utf8')) as WireMessage;
    if (!parsed || typeof parsed !== 'object' || !('type' in parsed) || !('payload' in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Handles Detect Primary Ip.
 */
function detectPrimaryIp(): string {
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        return entry.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Handles Sha512 File.
 */
function sha512File(filePath: string): string {
  const hash = crypto.createHash('sha512');
  const file = fs.readFileSync(filePath);
  hash.update(file);
  return hash.digest('base64');
}

/**
 * Handles Select Best Offer Internal.
 */
function selectBestOfferInternal(offers: PeerOffer[]): PeerOffer[] {
  return [...offers].sort((a, b) => {
    const tA = Date.parse(a.freshnessTs);
    const tB = Date.parse(b.freshnessTs);
    if (tA !== tB) return tB - tA;
    const rA = a.rttMs ?? Number.MAX_SAFE_INTEGER;
    const rB = b.rttMs ?? Number.MAX_SAFE_INTEGER;
    if (rA !== rB) return rA - rB;
    return a.peerId.localeCompare(b.peerId);
  });
}

/**
 * Handles Select Best Offers.
 */
export function selectBestOffers(offers: PeerOffer[]): PeerOffer[] {
  return selectBestOfferInternal(offers);
}

/**
 * Handles Decode Peer Message.
 */
export function decodePeerMessage(input: Buffer): WireMessage | null {
  return parseWire(input);
}

export class UpdatePeerService {
  private readonly enabled: boolean;

  private readonly peerId = crypto.randomUUID();

  private readonly startedAt = Date.now();

  private readonly cacheDir: string;

  private readonly artifacts = new Map<string, PeerArtifact>();

  private readonly blockedPeers = new Map<string, number>();

  private readonly pendingQueries = new Map<string, PendingQuery>();

  private socket: dgram.Socket | null = null;

  private httpServer: http.Server | null = null;

  private httpPort: number | null = null;

  private lastTransfer: PeerTransferStats | null = null;

  /**
   * Creates an instance of this class.
   */
  public constructor(cacheDir: string, enabled: boolean) {
    this.cacheDir = cacheDir;
    this.enabled = enabled;
  }

  /**
   * Handles Get Status.
   */
  public getStatus(): PeerUpdateStatus {
    return {
      enabled: this.enabled,
      seederActive: this.enabled && this.httpPort !== null,
      discoveryPort: DISCOVERY_PORT,
      httpPort: this.httpPort,
      offeredArtifacts: [...this.artifacts.values()],
      lastTransfer: this.lastTransfer,
    };
  }

  /**
   * Handles Start Peer Services.
   */
  public startPeerServices(): void {
    if (!this.enabled || this.socket) {
      return;
    }
    fs.mkdirSync(this.cacheDir, { recursive: true });

    this.httpServer = http.createServer((req, res) => this.handleHttp(req, res));
    this.httpServer.listen(0, '0.0.0.0', () => {
      const addr = this.httpServer?.address();
      this.httpPort = typeof addr === 'object' && addr ? addr.port : null;
      debugSync('peer-service', 'http-listen', { peerId: this.peerId, httpPort: this.httpPort });
    });

    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.socket.on('message', (msg, rinfo) => this.handleUdp(msg, rinfo.address, rinfo.port));
    this.socket.on('error', (error) => {
      debugSync('peer-service', 'udp-error', { message: String(error) });
    });
    this.socket.bind(DISCOVERY_PORT, () => {
      this.socket?.setBroadcast(true);
      debugSync('peer-service', 'udp-listen', { peerId: this.peerId, port: DISCOVERY_PORT });
    });
  }

  /**
   * Handles Stop Peer Services.
   */
  public stopPeerServices(): void {
    for (const pending of this.pendingQueries.values()) {
      clearTimeout(pending.timer);
      pending.resolve([]);
    }
    this.pendingQueries.clear();
    this.socket?.close();
    this.socket = null;
    this.httpServer?.close();
    this.httpServer = null;
    this.httpPort = null;
  }

  /**
   * Handles Announce Local Artifacts.
   */
  public announceLocalArtifacts(artifacts: PeerArtifact[]): void {
    for (const artifact of artifacts) {
      if (!fs.existsSync(artifact.filePath)) {
        continue;
      }
      this.artifacts.set(artifact.artifactName, artifact);
    }
    debugSync('peer-service', 'announce-artifacts', {
      count: artifacts.length,
      total: this.artifacts.size,
    });
  }

  /**
   * Handles Query Peers For Version.
   */
  public async queryPeersForVersion(query: PeerQuery): Promise<PeerOffer[]> {
    if (!this.enabled || !this.socket || !this.httpPort) {
      return [];
    }
    return new Promise<PeerOffer[]>((resolve) => {
      const timer = setTimeout(() => {
        const pending = this.pendingQueries.get(query.requestId);
        this.pendingQueries.delete(query.requestId);
        resolve(selectBestOfferInternal(pending?.offers ?? []));
      }, DISCOVERY_TIMEOUT_MS);

      this.pendingQueries.set(query.requestId, {
        startedAt: Date.now(),
        offers: [],
        resolve,
        timer,
      });

      const wire = JSON.stringify({ type: 's1-update-query', payload: query } satisfies WireMessage);
      this.socket?.send(wire, DISCOVERY_PORT, '255.255.255.255');
      debugSync('peer-discovery', 'query', {
        requestId: query.requestId,
        version: query.versionWanted,
        platform: query.platform,
        arch: query.arch,
      });
    });
  }

  public async downloadFromPeer(
    offer: PeerOffer,
    targetPath: string,
    expectedSha512: string,
    onProgress?: (transferred: number, total: number) => void,
  ): Promise<string> {
    const blockedUntil = this.blockedPeers.get(offer.peerId);
    if (blockedUntil && blockedUntil > Date.now()) {
      throw new Error(`Peer ${offer.peerId} ist temporär gesperrt.`);
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    const started = Date.now();
    try {
      const response = await fetch(`http://${offer.host}:${offer.httpPort}/update/${encodeURIComponent(offer.artifactName)}`, {
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(`Peer-Download fehlgeschlagen (${response.status})`);
      }
      const total = Number(response.headers.get('content-length') || offer.size || 0);
      const hash = crypto.createHash('sha512');
      const file = fs.createWriteStream(targetPath);
      let transferred = 0;
      for await (const chunk of response.body as unknown as AsyncIterable<Buffer>) {
        hash.update(chunk);
        transferred += chunk.length;
        file.write(chunk);
        onProgress?.(transferred, total);
      }
      file.end();
      const digest = hash.digest('base64');
      if (digest !== expectedSha512) {
        this.blockedPeers.set(offer.peerId, Date.now() + PEER_BLOCK_MS);
        throw new Error('SHA512-Prüfung für Peer-Download fehlgeschlagen');
      }
      this.lastTransfer = {
        direction: 'download',
        peerId: offer.peerId,
        host: offer.host,
        artifactName: offer.artifactName,
        bytes: transferred,
        durationMs: Date.now() - started,
        at: nowIso(),
        ok: true,
      };
      debugSync('peer-download', 'ok', this.lastTransfer);
      return targetPath;
    } catch (error) {
      this.lastTransfer = {
        direction: 'download',
        peerId: offer.peerId,
        host: offer.host,
        artifactName: offer.artifactName,
        bytes: 0,
        durationMs: Date.now() - started,
        at: nowIso(),
        ok: false,
        reason: error instanceof Error ? error.message : String(error),
      };
      debugSync('peer-download', 'failed', this.lastTransfer);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  public createLocalFeedServer(metadata: {
    platform: string;
    version: string;
    artifactName: string;
    sha512: string;
    size: number;
    filePath: string;
  }): Promise<{ feedUrl: string; close: () => Promise<void> }> {
    const channelFile = metadata.platform === 'darwin' ? 'latest-mac.yml' : metadata.platform === 'linux' ? 'latest-linux.yml' : 'latest.yml';
    const yml = [
      `version: ${metadata.version}`,
      `path: ${metadata.artifactName}`,
      `sha512: ${metadata.sha512}`,
      'files:',
      `  - url: ${metadata.artifactName}`,
      `    sha512: ${metadata.sha512}`,
      `    size: ${metadata.size}`,
      `releaseDate: ${nowIso()}`,
    ].join('\n');

    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        if (!req.url) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const reqPath = decodeURIComponent(req.url.split('?')[0] || '/');
        if (reqPath === `/${channelFile}`) {
          res.setHeader('content-type', 'text/yaml; charset=utf-8');
          res.end(yml);
          return;
        }
        if (reqPath === `/${metadata.artifactName}`) {
          const stream = fs.createReadStream(metadata.filePath);
          stream.on('error', () => {
            res.statusCode = 500;
            res.end();
          });
          stream.pipe(res);
          return;
        }
        res.statusCode = 404;
        res.end();
      });
      server.on('error', reject);
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          reject(new Error('Lokaler Feed-Port konnte nicht ermittelt werden'));
          return;
        }
        resolve({
          feedUrl: `http://127.0.0.1:${addr.port}`,
          close: async () =>
            new Promise<void>((closeResolve) => {
              server.close(() => closeResolve());
            }),
        });
      });
    });
  }

  /**
   * Handles Verify File Sha512.
   */
  public static verifyFileSha512(filePath: string, expected: string): boolean {
    return sha512File(filePath) === expected;
  }

  /**
   * Handles Handle Http.
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
   * Handles Handle Udp.
   */
  private handleUdp(msg: Buffer, sourceHost: string, sourcePort: number): void {
    const parsed = parseWire(msg);
    if (!parsed) return;
    if (parsed.type === 's1-update-query') {
      this.handleUdpQuery(parsed.payload, sourceHost, sourcePort);
      return;
    }
    const pending = this.pendingQueries.get(parsed.payload.requestId);
    if (!pending) return;
    if (parsed.payload.peerId === this.peerId) return;
    pending.offers.push({
      peerId: parsed.payload.peerId,
      host: parsed.payload.host,
      httpPort: parsed.payload.httpPort,
      version: parsed.payload.version,
      artifactName: parsed.payload.artifactName,
      sha512: parsed.payload.sha512,
      size: parsed.payload.size,
      freshnessTs: parsed.payload.freshnessTs,
      rttMs: Date.now() - pending.startedAt,
    });
    debugSync('peer-offer', 'received', {
      requestId: parsed.payload.requestId,
      from: parsed.payload.host,
      artifact: parsed.payload.artifactName,
    });
  }

  /**
   * Handles Handle Udp Query.
   */
  private handleUdpQuery(query: PeerQuery, sourceHost: string, sourcePort: number): void {
    if (!this.socket || !this.httpPort) {
      return;
    }
    const matching = [...this.artifacts.values()].find(
      (item) =>
        item.version === query.versionWanted &&
        item.platform === query.platform &&
        item.arch === query.arch &&
        item.channel === query.channel,
    );
    if (!matching) {
      return;
    }
    const payload: PeerOfferWire = {
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
    const wire = JSON.stringify({ type: 's1-update-offer', payload } satisfies WireMessage);
    this.socket.send(wire, sourcePort, sourceHost);
    debugSync('peer-offer', 'sent', {
      requestId: query.requestId,
      to: sourceHost,
      artifact: matching.artifactName,
    });
  }
}

