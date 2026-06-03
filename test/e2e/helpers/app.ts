import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';

const ROOT_DIR = process.cwd();
const DIST_MAIN = path.join(ROOT_DIR, 'dist-electron', 'main.js');

export interface AppContext {
  app: ElectronApplication;
  page: Page;
  dataDir: string;
  cleanup: () => Promise<void>;
}

/**
 * Starts the Electron app with an isolated temp data directory.
 * Waits until the renderer is fully loaded.
 */
export async function launchApp(slowMo = 0): Promise<AppContext> {
  if (!fs.existsSync(DIST_MAIN)) {
    throw new Error(
      `dist-electron/main.js fehlt. Zuerst bauen:\n  npm run build:renderer && npm run build:main`,
    );
  }

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-e2e-'));

  const app = await electron.launch({
    args: ['.'],
    cwd: ROOT_DIR,
    timeout: 30_000,
    slowMo,
    env: {
      ...process.env,
      CI: '1',
      S1_OPEN_DEVTOOLS: '0',
      S1_E2E_DATA_DIR: dataDir,
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
  // Give React time to hydrate
  await page.waitForTimeout(800);

  const cleanup = async () => {
    try {
      await Promise.race([app.close(), new Promise((r) => setTimeout(r, 3_000))]);
    } finally {
      const proc = app.process();
      if (proc && !proc.killed) proc.kill('SIGTERM');
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  };

  return { app, page, dataDir, cleanup };
}

/**
 * Clicks a button by its visible text, waits briefly for UI to settle.
 */
export async function clickButton(page: Page, label: string, timeout = 5_000): Promise<void> {
  const btn = page.locator(`button:has-text("${label}")`).first();
  await btn.waitFor({ state: 'visible', timeout });
  await btn.click();
  await page.waitForTimeout(300);
}

/**
 * Fills an input by placeholder or label, clears first.
 */
export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector).first();
  await input.waitFor({ state: 'visible', timeout: 5_000 });
  await input.clear();
  await input.fill(value);
}

/**
 * Confirms a native macOS/Linux file-save dialog by typing a full path.
 * Sends the path via keyboard shortcut (Cmd+Shift+G on macOS).
 */
export async function confirmSaveDialog(page: Page, filePath: string): Promise<void> {
  await page.waitForTimeout(600);
  // macOS: open "Go to folder" sheet in the dialog
  await page.keyboard.press('Meta+Shift+g');
  await page.waitForTimeout(400);
  await page.keyboard.type(filePath, { delay: 20 });
  await page.keyboard.press('Return');
  await page.waitForTimeout(300);
  // Confirm the save dialog itself
  await page.keyboard.press('Return');
  await page.waitForTimeout(800);
}

/**
 * Waits until an element with the given text is visible.
 */
export async function waitForText(page: Page, text: string, timeout = 8_000): Promise<void> {
  await page.locator(`text=${text}`).first().waitFor({ state: 'visible', timeout });
}

/**
 * Reads the STÄRKE value from the top bar (e.g. "0/2/16/18").
 */
export async function readStaerke(page: Page): Promise<string> {
  const el = page.locator('.staerke-display, [data-testid="staerke"], .header-staerke').first();
  try {
    return (await el.textContent({ timeout: 3_000 })) ?? '';
  } catch {
    // Fallback: find the header text that matches the strength pattern
    const header = await page.locator('text=/\\d+\\/\\d+\\/\\d+\\/\\d+/').first().textContent({ timeout: 3_000 }).catch(() => '');
    return header ?? '';
  }
}
