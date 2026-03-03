import crypto from 'node:crypto';
import { and, eq, lt } from 'drizzle-orm';
import type { RecordEditLockInfo, RecordEditLockType } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { recordEditLock } from '../db/schema';

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

/**
 * Handles To Iso.
 */
function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Handles To Lock Info.
 */
function toLockInfo(row: typeof recordEditLock.$inferSelect, selfClientId: string): RecordEditLockInfo {
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

/**
 * Handles Cleanup Expired Locks.
 */
function cleanupExpiredLocks(ctx: DbContext, nowIso: string): void {
  ctx.db.delete(recordEditLock).where(lt(recordEditLock.expiresAt, nowIso)).run();
}

/**
 * Handles Acquire Record Edit Lock.
 */
export function acquireRecordEditLock(
  ctx: DbContext,
  target: LockTarget,
  identity: LockIdentity,
): { acquired: true; lock: RecordEditLockInfo } | { acquired: false; lock: RecordEditLockInfo } {
  const nowTs = Date.now();
  const nowIso = toIso(nowTs);
  const expiresIso = toIso(nowTs + LOCK_TTL_MS);

  return ctx.db.transaction((tx) => {
    tx.delete(recordEditLock).where(lt(recordEditLock.expiresAt, nowIso)).run();

    const existing = tx
      .select()
      .from(recordEditLock)
      .where(and(eq(recordEditLock.entityType, target.entityType), eq(recordEditLock.entityId, target.entityId)))
      .get();

    if (!existing) {
      const id = crypto.randomUUID();
      tx.insert(recordEditLock)
        .values({
          id,
          einsatzId: target.einsatzId,
          entityType: target.entityType,
          entityId: target.entityId,
          clientId: identity.clientId,
          computerName: identity.computerName,
          userName: identity.userName,
          acquiredAt: nowIso,
          heartbeatAt: nowIso,
          expiresAt: expiresIso,
        })
        .run();
      const inserted = tx.select().from(recordEditLock).where(eq(recordEditLock.id, id)).get();
      return { acquired: true as const, lock: toLockInfo(inserted!, identity.clientId) };
    }

    if (existing.clientId === identity.clientId) {
      tx.update(recordEditLock)
        .set({
          computerName: identity.computerName,
          userName: identity.userName,
          heartbeatAt: nowIso,
          expiresAt: expiresIso,
        })
        .where(eq(recordEditLock.id, existing.id))
        .run();
      const renewed = tx.select().from(recordEditLock).where(eq(recordEditLock.id, existing.id)).get();
      return { acquired: true as const, lock: toLockInfo(renewed!, identity.clientId) };
    }

    return { acquired: false as const, lock: toLockInfo(existing, identity.clientId) };
  });
}

/**
 * Handles Refresh Record Edit Lock.
 */
export function refreshRecordEditLock(
  ctx: DbContext,
  target: LockTarget,
  identity: LockIdentity,
): { refreshed: true; lock: RecordEditLockInfo } | { refreshed: false; lock: RecordEditLockInfo | null } {
  const nowTs = Date.now();
  const nowIso = toIso(nowTs);
  const expiresIso = toIso(nowTs + LOCK_TTL_MS);

  return ctx.db.transaction((tx) => {
    tx.delete(recordEditLock).where(lt(recordEditLock.expiresAt, nowIso)).run();
    const existing = tx
      .select()
      .from(recordEditLock)
      .where(and(eq(recordEditLock.entityType, target.entityType), eq(recordEditLock.entityId, target.entityId)))
      .get();
    if (!existing) {
      return { refreshed: false as const, lock: null };
    }
    if (existing.clientId !== identity.clientId) {
      return { refreshed: false as const, lock: toLockInfo(existing, identity.clientId) };
    }
    tx.update(recordEditLock)
      .set({
        computerName: identity.computerName,
        userName: identity.userName,
        heartbeatAt: nowIso,
        expiresAt: expiresIso,
      })
      .where(eq(recordEditLock.id, existing.id))
      .run();
    const updated = tx.select().from(recordEditLock).where(eq(recordEditLock.id, existing.id)).get();
    return { refreshed: true as const, lock: toLockInfo(updated!, identity.clientId) };
  });
}

/**
 * Handles Release Record Edit Lock.
 */
export function releaseRecordEditLock(ctx: DbContext, target: LockTarget, identity: LockIdentity): void {
  cleanupExpiredLocks(ctx, toIso(Date.now()));
  ctx.db
    .delete(recordEditLock)
    .where(
      and(
        eq(recordEditLock.entityType, target.entityType),
        eq(recordEditLock.entityId, target.entityId),
        eq(recordEditLock.clientId, identity.clientId),
      ),
    )
    .run();
}

/**
 * Handles Ensure Record Edit Lock Ownership.
 */
export function ensureRecordEditLockOwnership(
  ctx: DbContext,
  target: LockTarget,
  identity: LockIdentity,
): void {
  cleanupExpiredLocks(ctx, toIso(Date.now()));
  const existing = ctx.db
    .select()
    .from(recordEditLock)
    .where(and(eq(recordEditLock.entityType, target.entityType), eq(recordEditLock.entityId, target.entityId)))
    .get();
  if (!existing) {
    throw new Error('Datensatz ist nicht zur Bearbeitung gesperrt. Bitte Datensatz erneut öffnen.');
  }
  if (existing.clientId !== identity.clientId) {
    throw new Error(`Datensatz wird gerade von ${existing.computerName} (${existing.userName}) bearbeitet.`);
  }
}

/**
 * Handles List Record Edit Locks.
 */
export function listRecordEditLocks(
  ctx: DbContext,
  einsatzId: string,
  selfClientId: string,
): RecordEditLockInfo[] {
  const nowIso = toIso(Date.now());
  cleanupExpiredLocks(ctx, nowIso);
  const rows = ctx.db
    .select()
    .from(recordEditLock)
    .where(eq(recordEditLock.einsatzId, einsatzId))
    .all();
  return rows.map((row) => toLockInfo(row, selfClientId));
}

