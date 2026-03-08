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
const SAMPLE_COUNT = Number(process.env.S1_EINSATZ_OPEN_SLO_SAMPLES ?? '6');
const SLO_P95_MS = Number(process.env.S1_EINSATZ_OPEN_SLO_MAX_P95_MS ?? '1500');

function percentile95(values) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}

async function launchApp() {
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
        },
      };
  return electron.launch(launchOptions);
}

async function runOneSample() {
  const app = await launchApp();
  try {
    const page = await Promise.race([
      app.firstWindow(),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Hauptfenster wurde nicht rechtzeitig geöffnet')), 25_000);
      }),
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(300);

    const einsaetze = await page.evaluate(async () => {
      const typedWindow = window;
      return typedWindow.api?.listEinsaetze ? await typedWindow.api.listEinsaetze() : [];
    });
    if (!Array.isArray(einsaetze) || einsaetze.length === 0 || !einsaetze[0]?.id) {
      throw new Error('Keine Einsätze verfügbar für SLO-Messung.');
    }

    const targetId = einsaetze[0].id;
    const startedAt = Date.now();
    await page.evaluate(async (einsatzId) => {
      const typedWindow = window;
      if (!typedWindow.api?.openEinsatz) {
        throw new Error('window.api.openEinsatz ist nicht verfügbar');
      }
      await typedWindow.api.openEinsatz(einsatzId);
    }, targetId);
    await page.locator('h2:has-text("Einsatz Übersicht")').first().waitFor({ state: 'visible', timeout: 20_000 });
    return Date.now() - startedAt;
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    const child = app.process();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

async function main() {
  if (!fs.existsSync(DIST_MAIN)) {
    throw new Error(
      'dist-electron/main.js fehlt. Bitte zuerst bauen: npm run build:renderer && npm run build:main',
    );
  }

  const latencies = [];
  for (let i = 0; i < SAMPLE_COUNT; i += 1) {
    const latency = await runOneSample();
    latencies.push(latency);
    console.log(`[SLO][einsatz-open] sample=${i + 1}/${SAMPLE_COUNT} latency=${latency}ms`);
  }

  const p95 = percentile95(latencies);
  if (p95 === null) {
    throw new Error('p95 konnte nicht berechnet werden.');
  }
  const max = Math.max(...latencies);
  const min = Math.min(...latencies);
  const avg = Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
  console.log(
    `[SLO][einsatz-open] samples=${latencies.length} min=${min}ms avg=${avg}ms p95=${p95}ms max=${max}ms threshold=${SLO_P95_MS}ms`,
  );
  if (p95 > SLO_P95_MS) {
    throw new Error(`Einsatz-Open-SLO verletzt: p95=${p95}ms > ${SLO_P95_MS}ms`);
  }
}

main().catch((error) => {
  console.error(`[SLO][einsatz-open] FEHLER: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
