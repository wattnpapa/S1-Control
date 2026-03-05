import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { debugSync } from './debug';
import { nowIso } from './update-peer-protocol';
import type { PeerOffer, PeerTransferStats } from '../../shared/types';

const DOWNLOAD_TIMEOUT_MS = 3000;
const PEER_BLOCK_MS = 10 * 60 * 1000;

export interface PeerDownloadResult {
  targetPath: string;
  stats: PeerTransferStats;
}

export interface DownloadPeerFileInput {
  offer: PeerOffer;
  targetPath: string;
  expectedSha512: string;
  blockedUntil?: number;
  onProgress?: (transferred: number, total: number) => void;
}

/**
 * Downloads an update artifact from a peer and validates SHA512 integrity.
 */
export async function downloadPeerFile(input: DownloadPeerFileInput): Promise<PeerDownloadResult> {
  ensurePeerNotBlocked(input.offer.peerId, input.blockedUntil);
  fs.mkdirSync(path.dirname(input.targetPath), { recursive: true });

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(buildPeerUrl(input.offer), { signal: controller.signal });
    if (!response.ok || !response.body) {
      throw new Error(`Peer-Download fehlgeschlagen (${response.status})`);
    }
    const total = Number(response.headers.get('content-length') || input.offer.size || 0);
    const transferred = await streamResponseToFile({
      body: response.body,
      targetPath: input.targetPath,
      expectedSha512: input.expectedSha512,
      total,
      onProgress: input.onProgress,
    });
    const stats: PeerTransferStats = {
      direction: 'download',
      peerId: input.offer.peerId,
      host: input.offer.host,
      artifactName: input.offer.artifactName,
      bytes: transferred,
      durationMs: Date.now() - started,
      at: nowIso(),
      ok: true,
    };
    debugSync('peer-download', 'ok', stats);
    return { targetPath: input.targetPath, stats };
  } catch (error) {
    const stats: PeerTransferStats = {
      direction: 'download',
      peerId: input.offer.peerId,
      host: input.offer.host,
      artifactName: input.offer.artifactName,
      bytes: 0,
      durationMs: Date.now() - started,
      at: nowIso(),
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
    debugSync('peer-download', 'failed', stats);
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { peerStats: stats });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns the block timestamp used for temporary peer quarantine after hash failures.
 */
export function nextPeerBlockTimestamp(): number {
  return Date.now() + PEER_BLOCK_MS;
}

/**
 * Builds HTTP URL for downloading an artifact from a peer.
 */
function buildPeerUrl(offer: PeerOffer): string {
  return `http://${offer.host}:${offer.httpPort}/update/${encodeURIComponent(offer.artifactName)}`;
}

/**
 * Guards against using a temporarily blocked peer.
 */
function ensurePeerNotBlocked(peerId: string, blockedUntil?: number): void {
  if (blockedUntil && blockedUntil > Date.now()) {
    throw new Error(`Peer ${peerId} ist temporär gesperrt.`);
  }
}

/**
 * Streams response body to file while hashing and reporting progress.
 */
async function streamResponseToFile(
  input: {
    body: ReadableStream<Uint8Array>;
    targetPath: string;
    expectedSha512: string;
    total: number;
    onProgress?: (transferred: number, total: number) => void;
  },
): Promise<number> {
  const hash = crypto.createHash('sha512');
  const file = fs.createWriteStream(input.targetPath);
  let transferred = 0;
  for await (const chunk of input.body as unknown as AsyncIterable<Buffer>) {
    hash.update(chunk);
    transferred += chunk.length;
    file.write(chunk);
    input.onProgress?.(transferred, input.total);
  }
  file.end();
  const digest = hash.digest('base64');
  if (digest !== input.expectedSha512) {
    fs.rmSync(input.targetPath, { force: true });
    throw new Error('SHA512-Prüfung für Peer-Download fehlgeschlagen');
  }
  return transferred;
}
