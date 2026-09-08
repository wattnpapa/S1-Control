#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { _electron: electron } = require('playwright');

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

async function clickIfVisible(page, label) {
  const button = page.locator(`button:has-text("${label}")`).first();
  const visible = await button.isVisible({ timeout: 800 }).catch(() => false);
  if (!visible) {
    return false;
  }
  try {
    await button.scrollIntoViewIfNeeded();
    await button.click({ timeout: 1500 });
  } catch {
    await button.click({ timeout: 1500, force: true }).catch(() => {});
  }
  await page.waitForTimeout(400);
  return true;
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
      }
    : {
        args: ['.'],
        cwd: ROOT_DIR,
      };

  const app = await electron.launch({
    ...launchOptions,
    timeout: 45000,
    slowMo: Number(process.env.E2E_SLOWMO || '250'),
    env: {
      ...process.env,
      CI: '1',
      S1_OPEN_DEVTOOLS: '0',
    },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(800);

    const actions = [
      'Stärke-Monitor öffnen',
      'Monitor schließen',
      'Einheit anlegen',
      'Auf Updates prüfen',
      'DevTools öffnen',
    ];

    let clicked = 0;
    for (const label of actions) {
      if (await clickIfVisible(page, label)) {
        console.log(`[e2e-live] clicked: ${label}`);
        clicked += 1;
      }
    }

    if (clicked < 1) {
      throw new Error('Kein klickbarer Ziel-Button gefunden.');
    }

    await page
      .screenshot({ path: path.join(ROOT_DIR, 'test-results', 'e2e-live-smoke.png'), timeout: 5000 })
      .catch(() => {});
    console.log(`[e2e-live] ok, clicked=${clicked}`);
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 2000))]);
    const child = app.process();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
}

main().catch((error) => {
  console.error(`[e2e-live] failed: ${error?.message || String(error)}`);
  process.exit(1);
});
