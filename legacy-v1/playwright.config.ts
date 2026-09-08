import { defineConfig } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';

export default defineConfig({
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'e2e-report' }],
  ],
  projects: [
    {
      name: 'e2e',
      ...defineBddProject({
        // Feature files and steps live in e2e/ — separate from Vitest tests in test/
        features: 'e2e/features/**/*.feature',
        steps: 'e2e/steps/**/*.ts',
        language: 'de',
      }),
    },
  ],
});
