import { describe, expect, test } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers/db';
import { createEinsatz } from '../src/main/services/einsatz';
import {
  acquireRecordEditLock,
  ensureRecordEditLockOwnership,
  listRecordEditLocks,
  refreshRecordEditLock,
  releaseRecordEditLock,
} from '../src/main/services/record-lock';
import { recordEditLock } from '../src/main/db/schema';

/**
 * Handles Build Identity.
 */
function buildIdentity(clientId: string, computerName: string) {
  return { clientId, computerName, userName: `user-${clientId}` };
}

describe('record lock service', () => {
  test('acquires, lists and releases own lock', () => {
    const ctx = createTestDb('record-lock-a-');
    const einsatz = createEinsatz(ctx, { name: 'Locktest', fuestName: 'FüSt 1' });
    const identity = buildIdentity('client-a', 'PC-A');

    const acquired = acquireRecordEditLock(
      ctx,
      { einsatzId: einsatz.id, entityType: 'EINHEIT', entityId: 'einheit-1' },
      identity,
    );
    expect(acquired.acquired).toBe(true);
    expect(acquired.lock.isSelf).toBe(true);

    const listed = listRecordEditLocks(ctx, einsatz.id, identity.clientId);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.entityId).toBe('einheit-1');

    releaseRecordEditLock(
      ctx,
      { einsatzId: einsatz.id, entityType: 'EINHEIT', entityId: 'einheit-1' },
      identity,
    );
    expect(listRecordEditLocks(ctx, einsatz.id, identity.clientId)).toHaveLength(0);
  });

  test('rejects lock acquisition for another client while active', () => {
    const ctx = createTestDb('record-lock-b-');
    const einsatz = createEinsatz(ctx, { name: 'Locktest', fuestName: 'FüSt 1' });
    const first = buildIdentity('client-a', 'PC-A');
    const second = buildIdentity('client-b', 'PC-B');

    acquireRecordEditLock(
      ctx,
      { einsatzId: einsatz.id, entityType: 'FAHRZEUG', entityId: 'fahrzeug-1' },
      first,
    );
    const secondTry = acquireRecordEditLock(
      ctx,
      { einsatzId: einsatz.id, entityType: 'FAHRZEUG', entityId: 'fahrzeug-1' },
      second,
    );

    expect(secondTry.acquired).toBe(false);
    expect(secondTry.lock.computerName).toBe('PC-A');
    expect(secondTry.lock.isSelf).toBe(false);
  });

  test('refreshes owner lock and rejects refresh from foreign client', () => {
    const ctx = createTestDb('record-lock-c-');
    const einsatz = createEinsatz(ctx, { name: 'Locktest', fuestName: 'FüSt 1' });
    const first = buildIdentity('client-a', 'PC-A');
    const second = buildIdentity('client-b', 'PC-B');
    const target = { einsatzId: einsatz.id, entityType: 'ABSCHNITT' as const, entityId: 'abschnitt-1' };

    acquireRecordEditLock(ctx, target, first);
    const refreshedOwner = refreshRecordEditLock(ctx, target, first);
    expect(refreshedOwner.refreshed).toBe(true);
    expect(refreshedOwner.lock?.isSelf).toBe(true);

    const refreshedForeign = refreshRecordEditLock(ctx, target, second);
    expect(refreshedForeign.refreshed).toBe(false);
    expect(refreshedForeign.lock?.computerName).toBe('PC-A');
  });

});

describe('record lock service - ownership and expiry', () => {
  test('enforces ownership checks for protected writes', () => {
    const ctx = createTestDb('record-lock-d-');
    const einsatz = createEinsatz(ctx, { name: 'Locktest', fuestName: 'FüSt 1' });
    const owner = buildIdentity('client-a', 'PC-A');
    const other = buildIdentity('client-b', 'PC-B');
    const target = { einsatzId: einsatz.id, entityType: 'EINHEIT' as const, entityId: 'einheit-1' };

    acquireRecordEditLock(ctx, target, owner);
    expect(() => ensureRecordEditLockOwnership(ctx, target, owner)).not.toThrow();
    expect(() => ensureRecordEditLockOwnership(ctx, target, other)).toThrow('Datensatz wird gerade');

    releaseRecordEditLock(ctx, target, owner);
    expect(() => ensureRecordEditLockOwnership(ctx, target, owner)).toThrow('Datensatz ist nicht zur Bearbeitung gesperrt');
  });

  test('cleans up expired locks and allows takeover', () => {
    const ctx = createTestDb('record-lock-e-');
    const einsatz = createEinsatz(ctx, { name: 'Locktest', fuestName: 'FüSt 1' });
    const owner = buildIdentity('client-a', 'PC-A');
    const other = buildIdentity('client-b', 'PC-B');
    const target = { einsatzId: einsatz.id, entityType: 'FAHRZEUG' as const, entityId: 'fahrzeug-2' };

    const acquired = acquireRecordEditLock(ctx, target, owner);
    ctx.db
      .update(recordEditLock)
      .set({ expiresAt: new Date(Date.now() - 60_000).toISOString() })
      .where(eq(recordEditLock.id, acquired.lock.id))
      .run();

    const takeover = acquireRecordEditLock(ctx, target, other);
    expect(takeover.acquired).toBe(true);
    expect(takeover.lock.computerName).toBe('PC-B');
  });
});
