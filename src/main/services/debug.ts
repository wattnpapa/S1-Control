type DebugMeta = Record<string, unknown> | undefined;
type DebugListener = (line: string) => void;
const MAX_LOG_LINES = 400;
const logLines: string[] = [];
const listeners = new Set<DebugListener>();

/**
 * Handles Should Enable Debug.
 */
function shouldEnableDebug(): boolean {
  const value = process.env.S1_DEBUG_SYNC?.trim().toLowerCase();
  if (!value) {
    return true;
  }
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

const ENABLED = shouldEnableDebug();

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
  if (!ENABLED) {
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
