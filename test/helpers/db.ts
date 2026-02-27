import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DbContext } from '../../src/main/db/connection';
import { openDatabaseWithRetry } from '../../src/main/db/connection';

export function createDbPath(prefix = 's1-control-test-'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  return path.join(dir, 'test.s1control');
}

export function createTestDb(prefix?: string): DbContext {
  return openDatabaseWithRetry(createDbPath(prefix));
}
