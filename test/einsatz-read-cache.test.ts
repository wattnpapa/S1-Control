import { describe, expect, it, vi } from 'vitest';
import { EinsatzReadCache } from '../src/main/services/einsatz-read-cache';
import type { AbschnittDetails, AbschnittNode } from '../src/shared/types';

function dbCtx(path: string) {
  return { path } as { path: string };
}

describe('einsatz read cache', () => {
  it('caches abschnitte/details/batch per db+einsatz key and respects ttl', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-21T10:00:00.000Z'));

    const cache = new EinsatzReadCache();
    const ctx = dbCtx('/tmp/a.s1control');

    const abschnitte: AbschnittNode[] = [
      { id: 'a1', einsatzId: 'e1', parentId: null, name: 'FüSt', systemTyp: 'FUEST' },
    ];
    const details: AbschnittDetails = { einheiten: [], fahrzeuge: [] };
    const batch: Record<string, AbschnittDetails> = { a1: details };

    const loadAbs = vi.fn(() => abschnitte);
    const loadDet = vi.fn(() => details);
    const loadBatch = vi.fn(() => batch);

    expect(cache.getAbschnitte(ctx, 'e1', loadAbs)).toEqual(abschnitte);
    expect(cache.getAbschnittDetails(ctx, 'e1', 'a1', loadDet)).toEqual(details);
    expect(cache.getAbschnittDetailsBatch(ctx, 'e1', loadBatch)).toEqual(batch);

    expect(cache.getAbschnitte(ctx, 'e1', loadAbs)).toEqual(abschnitte);
    expect(cache.getAbschnittDetails(ctx, 'e1', 'a1', loadDet)).toEqual(details);
    expect(cache.getAbschnittDetailsBatch(ctx, 'e1', loadBatch)).toEqual(batch);

    expect(loadAbs).toHaveBeenCalledTimes(1);
    expect(loadDet).toHaveBeenCalledTimes(1);
    expect(loadBatch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1501);

    expect(cache.getAbschnitte(ctx, 'e1', loadAbs)).toEqual(abschnitte);
    expect(cache.getAbschnittDetails(ctx, 'e1', 'a1', loadDet)).toEqual(details);
    expect(cache.getAbschnittDetailsBatch(ctx, 'e1', loadBatch)).toEqual(batch);

    expect(loadAbs).toHaveBeenCalledTimes(2);
    expect(loadDet).toHaveBeenCalledTimes(2);
    expect(loadBatch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('invalidates per einsatz and clears whole cache', () => {
    const cache = new EinsatzReadCache();
    const ctxA = dbCtx('/tmp/a.s1control');
    const ctxB = dbCtx('/tmp/b.s1control');

    const loadAAbs = vi.fn(() => [{ id: 'a1', einsatzId: 'e1', parentId: null, name: 'A', systemTyp: 'NORMAL' }] satisfies AbschnittNode[]);
    const loadADet = vi.fn(() => ({ einheiten: [], fahrzeuge: [] }) satisfies AbschnittDetails);
    const loadABatch = vi.fn(() => ({ a1: { einheiten: [], fahrzeuge: [] } }) satisfies Record<string, AbschnittDetails>);

    const loadBAbs = vi.fn(() => [{ id: 'b1', einsatzId: 'e2', parentId: null, name: 'B', systemTyp: 'NORMAL' }] satisfies AbschnittNode[]);

    cache.getAbschnitte(ctxA, 'e1', loadAAbs);
    cache.getAbschnittDetails(ctxA, 'e1', 'a1', loadADet);
    cache.getAbschnittDetailsBatch(ctxA, 'e1', loadABatch);
    cache.getAbschnitte(ctxB, 'e2', loadBAbs);

    cache.invalidateEinsatz(ctxA, 'e1');

    cache.getAbschnitte(ctxA, 'e1', loadAAbs);
    cache.getAbschnittDetails(ctxA, 'e1', 'a1', loadADet);
    cache.getAbschnittDetailsBatch(ctxA, 'e1', loadABatch);
    cache.getAbschnitte(ctxB, 'e2', loadBAbs);

    expect(loadAAbs).toHaveBeenCalledTimes(2);
    expect(loadADet).toHaveBeenCalledTimes(2);
    expect(loadABatch).toHaveBeenCalledTimes(2);
    expect(loadBAbs).toHaveBeenCalledTimes(1);

    cache.clearAll();

    cache.getAbschnitte(ctxA, 'e1', loadAAbs);
    cache.getAbschnitte(ctxB, 'e2', loadBAbs);

    expect(loadAAbs).toHaveBeenCalledTimes(3);
    expect(loadBAbs).toHaveBeenCalledTimes(2);
  });
});
