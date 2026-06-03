import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const bddConfig = defineBddConfig({
  features: 'test/e2e/features/**/*.feature',
  steps: 'test/e2e/steps/**/*.ts',
  language: 'de',
});

export default defineConfig({
  testDir: bddConfig.outputDir,
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'test-results/e2e-html' }],
  ],
});
