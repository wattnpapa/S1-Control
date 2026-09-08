const MAX_DEBUG_SYNC_LOG_LINES = 400;
const MIN_MONITOR_SAMPLE_INTERVAL_MS = 250;

/**
 * Trims diagnostic log lines to a bounded list size.
 */
export function trimDebugSyncLogs(lines: string[]): string[] {
  return lines.slice(-MAX_DEBUG_SYNC_LOG_LINES);
}

/**
 * Appends one diagnostic line while enforcing max retained size.
 */
export function appendDebugSyncLogLine(prev: string[], line: string): string[] {
  return trimDebugSyncLogs([...prev, line]);
}

/**
 * Extracts monitor lines by predicate and applies shared time-based sampling.
 */
function selectMonitorLines(
  lines: string[],
  predicate: (line: string) => boolean,
  limit: number,
): string[] {
  const sampled: string[] = [];
  let lastTs = 0;
  for (const line of lines) {
    if (!predicate(line)) {
      continue;
    }
    const ts = parseDebugTimestamp(line);
    if (ts !== null && lastTs !== 0 && ts - lastTs < MIN_MONITOR_SAMPLE_INTERVAL_MS) {
      continue;
    }
    if (ts !== null) {
      lastTs = ts;
    }
    sampled.push(line);
  }
  return sampled.slice(-limit);
}

/**
 * Builds lines for the Einsatz broadcast monitor.
 */
export function selectBroadcastMonitorLogs(lines: string[]): string[] {
  return selectMonitorLines(
    lines,
    (line) => line.includes('[einsatz-sync] received') || line.includes('[einsatz-sync] remote-change'),
    120,
  );
}

/**
 * Builds lines for generic UDP diagnostics monitor.
 */
export function selectUdpDebugMonitorLogs(lines: string[]): string[] {
  return selectMonitorLines(
    lines,
    (line) => {
      const isUdpScope =
        line.includes('[einsatz-sync]') ||
        line.includes('[peer-service]') ||
        line.includes('[peer-discovery]') ||
        line.includes('[peer-offer]');
      if (!isUdpScope) {
        return false;
      }
      return (
        line.includes('udp-') ||
        line.includes('broadcast') ||
        line.includes('received') ||
        line.includes('query') ||
        line.includes('sent') ||
        line.includes('remote-change')
      );
    },
    250,
  );
}

/**
 * Parses ISO timestamp from debug line header.
 */
function parseDebugTimestamp(line: string): number | null {
  const match = line.match(/^\[S1-DEBUG\]\[([^\]]+)\]/);
  if (!match) {
    return null;
  }
  const parsed = Date.parse(match[1] || '');
  return Number.isFinite(parsed) ? parsed : null;
}
