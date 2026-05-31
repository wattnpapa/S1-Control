import fs from 'node:fs';
import { debugSync } from '../services/debug';

const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_INTERVAL_MS = 50;
const LOCK_TIMEOUT_MS = 5_000;

interface LockInfo {
  pid: number;
  acquiredAt: number;
}

function lockPath(filePath: string): string {
  return filePath + '.lock';
}

function tryAcquire(lockFile: string): boolean {
  const info: LockInfo = { pid: process.pid, acquiredAt: Date.now() };
  try {
    fs.writeFileSync(lockFile, JSON.stringify(info), { flag: 'wx' });
    return true;
  } catch {
    try {
      const existing = JSON.parse(fs.readFileSync(lockFile, 'utf8')) as LockInfo;
      if (Date.now() - existing.acquiredAt > LOCK_STALE_MS) {
        debugSync('json-store', 'lock:stale-overwrite', { lockFile, existing });
        fs.writeFileSync(lockFile, JSON.stringify(info));
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }
}

export async function withFileLock<T>(filePath: string, fn: () => T | Promise<T>): Promise<T> {
  const lockFile = lockPath(filePath);
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  while (!tryAcquire(lockFile)) {
    if (Date.now() > deadline) {
      throw new Error(`Lock timeout for ${filePath}`);
    }
    await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_INTERVAL_MS));
  }
  try {
    return await fn();
  } finally {
    try {
      fs.unlinkSync(lockFile);
    } catch {
      /* ignore */
    }
  }
}
