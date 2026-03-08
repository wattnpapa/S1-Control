const fs = require('node:fs');
const path = require('node:path');
const { _electron: electron } = require('@playwright/test');

const ROOT_DIR = process.cwd();
const DIST_MAIN = path.join(ROOT_DIR, 'dist-electron', 'main.js');
const PACKAGED_EXECUTABLE = path.join(
  ROOT_DIR,
  'dist',
  'mac-arm64',
  'S1-Control.app',
  'Contents',
  'MacOS',
  'S1-Control',
);
const SAMPLE_COUNT = Number(process.env.S1_DEVTOOLS_SLO_SAMPLES ?? '8');
const SLO_P95_MS = Number(process.env.S1_DEVTOOLS_SLO_MAX_P95_MS ?? '500');

function percentile95(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

function extractDevToolsLatencies(lines) {
  return lines
    .filter((line) => line.includes('[devtools] open:visible'))
    .map((line) => {
      const jsonStart = line.indexOf('{');
      if (jsonStart < 0) {
        return null;
      }
      try {
        const payload = JSON.parse(line.slice(jsonStart));
        return typeof payload.latencyMs === 'number' ? payload.latencyMs : null;
      } catch {
        return null;
      }
    })
    .filter((value) => typeof value === 'number');
}

async function main() {
  if (!fs.existsSync(DIST_MAIN)) {
    throw new Error(
      'dist-electron/main.js fehlt. Bitte zuerst bauen: npm run build:renderer && npm run build:main',
    );
  }

  const launchOptions = fs.existsSync(PACKAGED_EXECUTABLE)
    ? {
        executablePath: PACKAGED_EXECUTABLE,
        args: [],
        cwd: ROOT_DIR,
        timeout: 45_000,
        env: {
          ...process.env,
          CI: '1',
          S1_OPEN_DEVTOOLS: '0',
          S1_DEBUG_SYNC: '1',
          S1_DEBUG_SYNC_MIN_INTERVAL_MS: '0',
        },
      }
    : {
        args: ['.'],
        cwd: ROOT_DIR,
        timeout: 45_000,
        env: {
          ...process.env,
          CI: '1',
          S1_OPEN_DEVTOOLS: '0',
          S1_DEBUG_SYNC: '1',
          S1_DEBUG_SYNC_MIN_INTERVAL_MS: '0',
        },
      };

  const app = await electron.launch(launchOptions);
  try {
    const page = await Promise.race([
      app.firstWindow(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Hauptfenster wurde nicht rechtzeitig geöffnet')), 25_000);
      }),
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(500);

    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      await page.evaluate(async () => {
        const typedWindow = window;
        if (!typedWindow.api?.openMainDevTools) {
          throw new Error('window.api.openMainDevTools ist nicht verfügbar');
        }
        await typedWindow.api.openMainDevTools();
      });
      await page.waitForTimeout(120);
    }

    const lines = await page.evaluate(async () => {
      const typedWindow = window;
      return typedWindow.api?.getDebugSyncLogLines ? await typedWindow.api.getDebugSyncLogLines() : [];
    });
    const latencies = extractDevToolsLatencies(lines);
    if (latencies.length === 0) {
      throw new Error('Keine DevTools-Latenzwerte gefunden (debug logs leer).');
    }
    const p95 = percentile95(latencies);
    if (p95 === null) {
      throw new Error('p95 konnte nicht berechnet werden.');
    }

    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const avg = Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
    console.log(
      `[SLO][devtools] samples=${latencies.length} min=${min}ms avg=${avg}ms p95=${p95}ms max=${max}ms threshold=${SLO_P95_MS}ms`,
    );
    if (p95 > SLO_P95_MS) {
      throw new Error(`DevTools-SLO verletzt: p95=${p95}ms > ${SLO_P95_MS}ms`);
    }
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    const child = app.process();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(`[SLO][devtools] FEHLER: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
