import { isSyncDebugEnabled, shouldEmitSyncDebug } from './diagnostics';

type DebugMeta = Record<string, unknown> | undefined;
type DebugListener = (line: string) => void;
const MAX_LOG_LINES = 400;
const logLines: string[] = [];
const listeners = new Set<DebugListener>();

/**
 * Handles Safe Json.
 */
function safeJson(meta: DebugMeta): string {
  if (!meta) {
    return '';
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' {"meta":"unserializable"}';
  }
}

/**
 * Handles Debug Sync.
 */
export function debugSync(scope: string, message: string, meta?: DebugMeta): void {
  if (!isSyncDebugEnabled() || !shouldEmitSyncDebug(scope, message)) {
    return;
  }
  const ts = new Date().toISOString();
  const line = `[S1-DEBUG][${ts}][${scope}] ${message}${safeJson(meta)}`;
  logLines.push(line);
  if (logLines.length > MAX_LOG_LINES) {
    logLines.splice(0, logLines.length - MAX_LOG_LINES);
  }
  console.log(line);
  for (const listener of listeners) {
    listener(line);
  }
}

/**
 * Handles Get Debug Sync Log Lines.
 */
export function getDebugSyncLogLines(): string[] {
  return [...logLines];
}

/**
 * Handles On Debug Sync Log.
 */
export function onDebugSyncLog(listener: DebugListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
