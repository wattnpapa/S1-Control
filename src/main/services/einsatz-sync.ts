import crypto from 'node:crypto';
import dgram from 'node:dgram';
import path from 'node:path';
import { debugSync } from './debug';
import type { EinsatzChangedSignal } from '../../shared/types';

const DEFAULT_SYNC_PORT = Number(process.env.S1_SYNC_BROADCAST_PORT || '41235');
const LOOPBACK_ADDRESS = '255.255.255.255';
const MIN_BROADCAST_INTERVAL_MS = 200;

interface EinsatzChangedWireMessage {
  type: 's1-einsatz-changed';
  payload: EinsatzChangedSignal;
}

interface MatchContext {
  sameEinsatzId: boolean;
  sameBaseName: boolean;
  sameDbPath: boolean;
}

/**
 * Handles To Normalized Path.
 */
function toNormalizedPath(filePath: string): string {
  return path.normalize(filePath).toLowerCase();
}

/**
 * Handles To Wire Message.
 */
function toWireMessage(payload: EinsatzChangedSignal): Buffer {
  const message: EinsatzChangedWireMessage = {
    type: 's1-einsatz-changed',
    payload,
  };
  return Buffer.from(JSON.stringify(message), 'utf8');
}

/**
 * Handles Parse Wire Message.
 */
function parseWireMessage(data: Buffer): EinsatzChangedWireMessage | null {
  try {
    const parsed = JSON.parse(data.toString('utf8')) as EinsatzChangedWireMessage;
    if (parsed?.type !== 's1-einsatz-changed' || !parsed.payload) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Computes matching flags between incoming and current DB context.
 */
function computeMatchContext(payload: EinsatzChangedSignal, currentDbPath: string | null, currentEinsatzId: string | null): MatchContext {
  const incomingPath = toNormalizedPath(payload.dbPath);
  const currentPath = currentDbPath ? toNormalizedPath(currentDbPath) : null;
  const incomingBaseName = path.basename(payload.dbPath).toLowerCase();
  const currentBaseName = currentDbPath ? path.basename(currentDbPath).toLowerCase() : null;
  return {
    sameEinsatzId: currentEinsatzId ? payload.einsatzId === currentEinsatzId : false,
    sameBaseName: currentBaseName ? incomingBaseName === currentBaseName : false,
    sameDbPath: currentPath ? incomingPath === currentPath : false,
  };
}

/**
 * Returns whether remote change should be applied locally.
 */
function shouldApplyRemoteChange(
  payload: EinsatzChangedSignal,
  currentDbPath: string | null,
  match: MatchContext,
  localClientId: string,
): boolean {
  if (payload.sourceClientId === localClientId || !currentDbPath) {
    return false;
  }
  return match.sameDbPath || match.sameBaseName || match.sameEinsatzId;
}

/**
 * Handles Einsatz Sync Service.
 */
export class EinsatzSyncService {
  private readonly clientId = crypto.randomUUID();

  private readonly port: number;

  private socket: dgram.Socket | null = null;

  private currentDbPath: string | null = null;

  private currentEinsatzId: string | null = null;

  private readonly onRemoteChange: (signal: EinsatzChangedSignal) => void;

  private lastBroadcastAt = 0;

  private lastBroadcastKey: string | null = null;

  public constructor(onRemoteChange: (signal: EinsatzChangedSignal) => void, port = DEFAULT_SYNC_PORT) {
    this.onRemoteChange = onRemoteChange;
    this.port = port;
  }

  /**
   * Handles Start.
   */
  public start(dbPath: string): void {
    this.currentDbPath = dbPath;
    if (this.socket) {
      return;
    }
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.on('error', (error) => {
      debugSync('einsatz-sync', 'udp-error', { message: String(error), port: this.port });
    });
    socket.on('message', (msg, remote) => {
      this.handleMessage(msg, remote.address);
    });
    socket.bind(this.port, () => {
      socket.setBroadcast(true);
      debugSync('einsatz-sync', 'udp-listen', { clientId: this.clientId, port: this.port });
    });
    this.socket = socket;
  }

  /**
   * Handles Stop.
   */
  public stop(): void {
    this.currentDbPath = null;
    this.currentEinsatzId = null;
    if (!this.socket) {
      return;
    }
    this.socket.close();
    this.socket = null;
  }

  /**
   * Handles Set Db Path.
   */
  public setDbPath(dbPath: string): void {
    this.currentDbPath = dbPath;
  }

  /**
   * Handles Set Context.
   */
  public setContext(input: { dbPath: string; einsatzId?: string | null }): void {
    this.currentDbPath = input.dbPath;
    this.currentEinsatzId = input.einsatzId ?? null;
  }

  /**
   * Handles Broadcast Change.
   */
  public broadcastChange(input: { einsatzId: string; dbPath: string; reason: string }): void {
    this.currentDbPath = input.dbPath;
    this.currentEinsatzId = input.einsatzId;
    if (!this.socket) {
      return;
    }
    const broadcastKey = `${input.einsatzId}:${toNormalizedPath(input.dbPath)}`;
    const now = Date.now();
    if (this.lastBroadcastKey === broadcastKey && now - this.lastBroadcastAt < MIN_BROADCAST_INTERVAL_MS) {
      debugSync('einsatz-sync', 'broadcast:throttled', {
        clientId: this.clientId,
        einsatzId: input.einsatzId,
        dbPath: input.dbPath,
        reason: input.reason,
      });
      return;
    }
    this.lastBroadcastKey = broadcastKey;
    this.lastBroadcastAt = now;
    const payload: EinsatzChangedSignal = {
      einsatzId: input.einsatzId,
      dbPath: input.dbPath,
      sourceClientId: this.clientId,
      changedAt: new Date().toISOString(),
      reason: input.reason,
    };
    const message = toWireMessage(payload);
    this.socket.send(message, this.port, LOOPBACK_ADDRESS);
    debugSync('einsatz-sync', 'broadcast', {
      clientId: this.clientId,
      einsatzId: input.einsatzId,
      dbPath: input.dbPath,
      reason: input.reason,
    });
  }

  /**
   * Handles Handle Message.
   */
  private handleMessage(message: Buffer, host: string): void {
    const parsed = parseWireMessage(message);
    if (!parsed) {
      debugSync('einsatz-sync', 'received:invalid', { clientId: this.clientId, from: host, size: message.length });
      return;
    }
    const match = computeMatchContext(parsed.payload, this.currentDbPath, this.currentEinsatzId);
    debugSync('einsatz-sync', 'received', {
      clientId: this.clientId,
      from: host,
      sourceClientId: parsed.payload.sourceClientId,
      einsatzId: parsed.payload.einsatzId,
      reason: parsed.payload.reason,
      sameClient: parsed.payload.sourceClientId === this.clientId,
      hasCurrentPath: Boolean(this.currentDbPath),
      sameDbPath: match.sameDbPath,
      sameBaseName: match.sameBaseName,
      sameEinsatzId: match.sameEinsatzId,
    });
    if (!shouldApplyRemoteChange(parsed.payload, this.currentDbPath, match, this.clientId)) {
      return;
    }
    debugSync('einsatz-sync', 'remote-change', {
      clientId: this.clientId,
      from: host,
      sourceClientId: parsed.payload.sourceClientId,
      einsatzId: parsed.payload.einsatzId,
      reason: parsed.payload.reason,
    });
    this.onRemoteChange(parsed.payload);
  }
}
