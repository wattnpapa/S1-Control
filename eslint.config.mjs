import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import eslintConfigPrettier from 'eslint-config-prettier';
import sonarjs from 'eslint-plugin-sonarjs';

export default tseslint.config(
  {
    ignores: ['dist-electron/**', 'dist-renderer/**', 'node_modules/**', 'scripts/**', 'eslint.config.mjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      sonarjs,
    },
    rules: {
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],
      'max-params': ['warn', 4],
      'sonarjs/cognitive-complexity': ['warn', 15],
      'sonarjs/max-switch-cases': ['warn', 10],
      'sonarjs/no-identical-functions': 'warn',
    },
  },
  {
    files: ['src/renderer/src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.renderer.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/main/**/*.ts', 'src/shared/**/*.ts', 'test/**/*.ts', 'drizzle.config.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.main.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // Testfälle bleiben lesbar, aber Limits sind weicher als im Produktivcode.
      'max-lines': ['warn', { max: 1200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 20],
    },
  },
  eslintConfigPrettier,
);
