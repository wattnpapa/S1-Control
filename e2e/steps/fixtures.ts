import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test as base } from 'playwright-bdd';
import type { Page } from '@playwright/test';
import { _electron as electron, type ElectronApplication } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const ROOT_DIR = process.cwd();

export type AppFixture = {
  app: ElectronApplication;
  page: Page;
  dataDir: string;
};

/** Playwright-Fixture: startet die App für jeden Test frisch mit eigenem Daten-Verzeichnis. */
export const test = base.extend<AppFixture>({
  dataDir: [
    async (_fixtures, use) => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-e2e-'));
      await use(dir);
      fs.rmSync(dir, { recursive: true, force: true });
    },
    { scope: 'test' },
  ],

  app: [
    async ({ dataDir }, use) => {
      const app = await electron.launch({
        args: ['.'],
        cwd: ROOT_DIR,
        timeout: 30_000,
        slowMo: Number(process.env.E2E_SLOWMO ?? '0'),
        env: {
          ...process.env,
          CI: '1',
          S1_OPEN_DEVTOOLS: '0',
          S1_DB_PATH: dataDir,
        },
      });
      await use(app);
      try {
        await Promise.race([app.close(), new Promise((r) => setTimeout(r, 3_000))]);
      } finally {
        try {
          const proc = app.process();
          if (proc && !proc.killed) proc.kill('SIGTERM');
        } catch {
          // app already exited
        }
      }
    },
    { scope: 'test' },
  ],

  page: [
    async ({ app }, use) => {
      const page = await app.firstWindow();
      await page.waitForLoadState('domcontentloaded', { timeout: 15_000 });
      await page.waitForTimeout(800);
      await use(page);
    },
    { scope: 'test' },
  ],
});

export const { Given, When, Then, Before, After } = createBdd(test);
