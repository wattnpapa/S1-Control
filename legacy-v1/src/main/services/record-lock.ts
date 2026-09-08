import crypto from 'node:crypto';
import type { RecordEditLockInfo, RecordEditLockType } from '../../shared/types';
import type { DbContext } from '../db/connection';
import type { JsonRecordEditLock } from '../json-store/types';
import { mutateSystemFileSync, readSystemFile } from '../json-store/system-store';
import { systemFilePath } from '../db/connection';

const LOCK_TTL_MS = 45_000;

interface LockIdentity {
  clientId: string;
  computerName: string;
  userName: string;
}

interface LockTarget {
  einsatzId: string;
  entityType: RecordEditLockType;
  entityId: string;
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function toLockInfo(row: JsonRecordEditLock, selfClientId: string): RecordEditLockInfo {
  return {
    id: row.id,
    einsatzId: row.einsatzId,
    entityType: row.entityType as RecordEditLockType,
    entityId: row.entityId,
    clientId: row.clientId,
    computerName: row.computerName,
    userName: row.userName,
    acquiredAt: row.acquiredAt,
    heartbeatAt: row.heartbeatAt,
    expiresAt: row.expiresAt,
    isSelf: row.clientId === selfClientId,
  };
}

function cleanupExpired(locks: JsonRecordEditLock[], nowIso: string): JsonRecordEditLock[] {
  return locks.filter((l) => l.expiresAt >= nowIso);
}

function getSysPath(ctx: DbContext): string {
  return systemFilePath(ctx.path);
}

export function acquireRecordEditLock(
  ctx: DbContext,
  target: LockTarget,
  identity: LockIdentity,
): { acquired: true; lock: RecordEditLockInfo } | { acquired: false; lock: RecordEditLockInfo } {
  const nowTs = Date.now();
  const nowIso = toIso(nowTs);
  const expiresIso = toIso(nowTs + LOCK_TTL_MS);
  let result!: { acquired: boolean; lock: RecordEditLockInfo };

  mutateSystemFileSync(getSysPath(ctx), (system) => {
    system.recordEditLocks = cleanupExpired(system.recordEditLocks, nowIso);
    const existing = system.recordEditLocks.find(
      (l) => l.entityType === target.entityType && l.entityId === target.entityId,
    );

    if (!existing) {
      const newLock: JsonRecordEditLock = {
        id: crypto.randomUUID(),
        einsatzId: target.einsatzId,
        entityType: target.entityType,
        entityId: target.entityId,
        clientId: identity.clientId,
        computerName: identity.computerName,
        userName: identity.userName,
        acquiredAt: nowIso,
        heartbeatAt: nowIso,
        expiresAt: expiresIso,
      };
      system.recordEditLocks.push(newLock);
      result = { acquired: true, lock: toLockInfo(newLock, identity.clientId) };
      return;
    }

    if (existing.clientId === identity.clientId) {
      existing.computerName = identity.computerName;
      existing.userName = identity.userName;
      existing.heartbeatAt = nowIso;
      existing.expiresAt = expiresIso;
      result = { acquired: true, lock: toLockInfo(existing, identity.clientId) };
      return;
    }

    result = { acquired: false, lock: toLockInfo(existing, identity.clientId) };
  });

  return result as { acquired: true; lock: RecordEditLockInfo } | { acquired: false; lock: RecordEditLockInfo };
}

export function refreshRecordEditLock(
  ctx: DbContext,
  target: LockTarget,
  identity: LockIdentity,
): { refreshed: true; lock: RecordEditLockInfo } | { refreshed: false; lock: RecordEditLockInfo | null } {
  const nowTs = Date.now();
  const nowIso = toIso(nowTs);
  const expiresIso = toIso(nowTs + LOCK_TTL_MS);
  let result!: { refreshed: boolean; lock: RecordEditLockInfo | null };

  mutateSystemFileSync(getSysPath(ctx), (system) => {
    system.recordEditLocks = cleanupExpired(system.recordEditLocks, nowIso);
    const existing = system.recordEditLocks.find(
      (l) => l.entityType === target.entityType && l.entityId === target.entityId,
    );
    if (!existing) {
      result = { refreshed: false, lock: null };
      return;
    }
    if (existing.clientId !== identity.clientId) {
      result = { refreshed: false, lock: toLockInfo(existing, identity.clientId) };
      return;
    }
    existing.computerName = identity.computerName;
    existing.userName = identity.userName;
    existing.heartbeatAt = nowIso;
    existing.expiresAt = expiresIso;
    result = { refreshed: true, lock: toLockInfo(existing, identity.clientId) };
  });

  return result as { refreshed: true; lock: RecordEditLockInfo } | { refreshed: false; lock: RecordEditLockInfo | null };
}

export function releaseRecordEditLock(ctx: DbContext, target: LockTarget, identity: LockIdentity): void {
  mutateSystemFileSync(getSysPath(ctx), (system) => {
    system.recordEditLocks = system.recordEditLocks.filter(
      (l) => !(l.entityType === target.entityType && l.entityId === target.entityId && l.clientId === identity.clientId),
    );
  });
}

export function ensureRecordEditLockOwnership(ctx: DbContext, target: LockTarget, identity: LockIdentity): void {
  const nowIso = toIso(Date.now());
  const system = readSystemFile(getSysPath(ctx));
  const locks = cleanupExpired(system.recordEditLocks, nowIso);
  const existing = locks.find(
    (l) => l.entityType === target.entityType && l.entityId === target.entityId,
  );
  if (!existing) {
    throw new Error('Datensatz ist nicht zur Bearbeitung gesperrt. Bitte Datensatz erneut öffnen.');
  }
  if (existing.clientId !== identity.clientId) {
    throw new Error(`Datensatz wird gerade von ${existing.computerName} (${existing.userName}) bearbeitet.`);
  }
}

export function listRecordEditLocks(ctx: DbContext, einsatzId: string, selfClientId: string): RecordEditLockInfo[] {
  const nowIso = toIso(Date.now());
  const system = readSystemFile(getSysPath(ctx));
  return cleanupExpired(system.recordEditLocks, nowIso)
    .filter((l) => l.einsatzId === einsatzId)
    .map((l) => toLockInfo(l, selfClientId));
}
