import dgram from 'node:dgram';
import os from 'node:os';
import type { PeerOffer } from '../../shared/types';

export const DISCOVERY_PORT = Number(process.env.S1_UPDATER_PEER_PORT || '41234');
export const DISCOVERY_TIMEOUT_MS = 1500;
export const DISCOVERY_MONITOR_INTERVAL_MS = 10_000;
export const DISCOVERY_OFFER_TTL_MS = 60_000;

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

export type WireMessage =
  | { type: 's1-update-query'; payload: PeerQuery }
  | { type: 's1-update-offer'; payload: PeerOfferWire };

export type PeerQueryMessage = PeerQuery;
export type PeerOfferWireMessage = PeerOfferWire;

/**
 * Returns current timestamp as ISO string.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Parses and validates a UDP wire message.
 */
export function parseWireMessage(input: Buffer): WireMessage | null {
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
 * Encodes a wire message as JSON string.
 */
export function encodeWireMessage(message: WireMessage): string {
  return JSON.stringify(message);
}

/**
 * Detects a primary IPv4 address for peer responses.
 */
export function detectPrimaryIp(): string {
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
 * Sorts peer offers by freshness, then latency, then peer id.
 */
export function selectBestOffers(offers: PeerOffer[]): PeerOffer[] {
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
 * Broadcasts a query to the LAN update discovery port.
 */
export function broadcastQuery(socket: dgram.Socket, message: WireMessage): void {
  socket.send(encodeWireMessage(message), DISCOVERY_PORT, '255.255.255.255');
}
