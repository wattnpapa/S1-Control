import type { AbschnittDetails, AbschnittNode } from '../../shared/types';
import type { DbContext } from '../db/connection';

const CACHE_TTL_MS = 1500;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Small in-memory read cache for hot einsatz overview queries.
 * Source of truth remains SQLite on disk.
 */
export class EinsatzReadCache {
  private abschnitteByKey = new Map<string, CacheEntry<AbschnittNode[]>>();

  private detailsByKey = new Map<string, CacheEntry<AbschnittDetails>>();

  private detailsBatchByKey = new Map<string, CacheEntry<Record<string, AbschnittDetails>>>();

  /**
   * Returns cached abschnitte or loads fresh value.
   */
  public getAbschnitte(
    ctx: DbContext,
    einsatzId: string,
    loader: () => AbschnittNode[],
  ): AbschnittNode[] {
    const key = this.makeEinsatzKey(ctx, einsatzId);
    const cached = this.abschnitteByKey.get(key);
    if (this.isFresh(cached)) {
      return cached.value;
    }
    const next = loader();
    this.abschnitteByKey.set(key, { value: next, expiresAt: Date.now() + CACHE_TTL_MS });
    return next;
  }

  /**
   * Returns cached section details or loads fresh value.
   */
  public getAbschnittDetails(
    ctx: DbContext,
    einsatzId: string,
    abschnittId: string,
    loader: () => AbschnittDetails,
  ): AbschnittDetails {
    const key = this.makeAbschnittKey(ctx, einsatzId, abschnittId);
    const cached = this.detailsByKey.get(key);
    if (this.isFresh(cached)) {
      return cached.value;
    }
    const next = loader();
    this.detailsByKey.set(key, { value: next, expiresAt: Date.now() + CACHE_TTL_MS });
    return next;
  }

  /**
   * Returns cached batch details or loads fresh value.
   */
  public getAbschnittDetailsBatch(
    ctx: DbContext,
    einsatzId: string,
    loader: () => Record<string, AbschnittDetails>,
  ): Record<string, AbschnittDetails> {
    const key = this.makeEinsatzKey(ctx, einsatzId);
    const cached = this.detailsBatchByKey.get(key);
    if (this.isFresh(cached)) {
      return cached.value;
    }
    const next = loader();
    this.detailsBatchByKey.set(key, { value: next, expiresAt: Date.now() + CACHE_TTL_MS });
    return next;
  }

  /**
   * Invalidates all cached reads for one einsatz.
   */
  public invalidateEinsatz(ctx: DbContext, einsatzId: string): void {
    const einsatzKeyPrefix = this.makeEinsatzKey(ctx, einsatzId);
    this.abschnitteByKey.delete(einsatzKeyPrefix);
    this.detailsBatchByKey.delete(einsatzKeyPrefix);
    for (const key of this.detailsByKey.keys()) {
      if (key.startsWith(`${einsatzKeyPrefix}:`)) {
        this.detailsByKey.delete(key);
      }
    }
  }

  /**
   * Clears all cache entries.
   */
  public clearAll(): void {
    this.abschnitteByKey.clear();
    this.detailsByKey.clear();
    this.detailsBatchByKey.clear();
  }

  private isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
    return Boolean(entry && entry.expiresAt > Date.now());
  }

  private makeEinsatzKey(ctx: DbContext, einsatzId: string): string {
    return `${ctx.path}:${einsatzId}`;
  }

  private makeAbschnittKey(ctx: DbContext, einsatzId: string, abschnittId: string): string {
    return `${this.makeEinsatzKey(ctx, einsatzId)}:${abschnittId}`;
  }
}

