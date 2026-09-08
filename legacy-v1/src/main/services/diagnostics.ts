const DEFAULT_SYNC_DEBUG_ENABLED = false;
const DEFAULT_SYNC_DEBUG_RATE_LIMIT_MS = 250;

const MAX_TRACKED_KEYS = 2048;

const lastSyncDebugByKey = new Map<string, number>();

/**
 * Reads a boolean env flag with a safe default.
 */
function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) {
    return fallback;
  }
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

/**
 * Reads a positive number from env with fallback.
 */
function readPositiveNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const SYNC_DEBUG_ENABLED = readBooleanEnv('S1_DEBUG_SYNC', DEFAULT_SYNC_DEBUG_ENABLED);
const SYNC_DEBUG_RATE_LIMIT_MS = readPositiveNumberEnv('S1_DEBUG_SYNC_MIN_INTERVAL_MS', DEFAULT_SYNC_DEBUG_RATE_LIMIT_MS);

/**
 * Returns whether sync diagnostics are enabled.
 */
export function isSyncDebugEnabled(): boolean {
  return SYNC_DEBUG_ENABLED;
}

/**
 * Applies per-key rate limiting to sync debug lines.
 */
export function shouldEmitSyncDebug(scope: string, message: string, nowTs = Date.now()): boolean {
  if (SYNC_DEBUG_RATE_LIMIT_MS <= 0) {
    return true;
  }
  const key = `${scope}:${message}`;
  const lastTs = lastSyncDebugByKey.get(key);
  if (lastTs !== undefined && nowTs - lastTs < SYNC_DEBUG_RATE_LIMIT_MS) {
    return false;
  }
  lastSyncDebugByKey.set(key, nowTs);
  if (lastSyncDebugByKey.size > MAX_TRACKED_KEYS) {
    const oldestKey = lastSyncDebugByKey.keys().next().value;
    if (oldestKey) {
      lastSyncDebugByKey.delete(oldestKey);
    }
  }
  return true;
}
