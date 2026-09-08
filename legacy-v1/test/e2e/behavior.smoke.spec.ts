import fs from 'node:fs';
import path from 'node:path';
import { test, expect, _electron as electron, type Page } from '@playwright/test';

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

async function clickIfVisible(page: Page, label: string): Promise<boolean> {
  const button = page.locator(`button:has-text("${label}")`).first();
  if (await button.isVisible({ timeout: 800 }).catch(() => false)) {
    try {
      await button.scrollIntoViewIfNeeded();
      await button.click({ timeout: 1_500 });
    } catch {
      try {
        await button.click({ timeout: 1_500, force: true });
      } catch {
        return false;
      }
    }
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

test('sichtbarer smoke-clickthrough', async () => {
  test.setTimeout(120_000);

  if (!fs.existsSync(DIST_MAIN)) {
    throw new Error(
      `dist-electron/main.js fehlt. Bitte zuerst bauen: npm run build:renderer && npm run build:main`,
    );
  }

  const app = await electron.launch(
    fs.existsSync(PACKAGED_EXECUTABLE)
      ? {
          executablePath: PACKAGED_EXECUTABLE,
          args: [],
          cwd: ROOT_DIR,
          timeout: 45_000,
          slowMo: Number(process.env.E2E_SLOWMO ?? '0'),
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
          slowMo: Number(process.env.E2E_SLOWMO ?? '0'),
          env: {
            ...process.env,
            CI: '1',
            S1_OPEN_DEVTOOLS: '0',
          },
        },
  );

  try {
    const page = await Promise.race([
      app.firstWindow(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Hauptfenster wurde nicht rechtzeitig geöffnet')), 25_000),
      ),
    ]);
    await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1_000);

    let clicked = 0;
    for (const label of [
      'Stärke-Monitor öffnen',
      'Monitor schließen',
      'Einheit anlegen',
      'Auf Updates prüfen',
      'DevTools öffnen',
    ]) {
      if (await clickIfVisible(page, label)) {
        clicked += 1;
      }
    }

    expect(clicked).toBeGreaterThan(0);

    const alive = await page.evaluate(() => document.readyState);
    expect(alive).toBe('complete');
  } finally {
    await Promise.race([app.close(), new Promise((resolve) => setTimeout(resolve, 2_000))]);
    const child = app.process();
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }
});
