import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DbContext } from '../db/connection';

const FIVE_MINUTES = 5 * 60 * 1000;
const STALE_LOCK_MS = 12 * 60 * 1000;

function nowStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function resolveBackupDir(dbPath: string): string {
  return path.join(path.dirname(dbPath), 'backup');
}

function lockFilePathForDb(dbPath: string): string {
  const base = path.basename(dbPath, path.extname(dbPath));
  return path.join(resolveBackupDir(dbPath), `${base}.backup.lock`);
}

export class BackupCoordinator {
  private interval: NodeJS.Timeout | null = null;

  private lockedFd: number | null = null;

  private lockPath: string | null = null;

  private activeDbPath: string | null = null;

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.releaseLock();
    this.activeDbPath = null;
  }

  public start(ctx: DbContext): void {
    this.stop();
    this.activeDbPath = ctx.path;
    this.interval = setInterval(() => {
      void this.runOnce(ctx);
    }, FIVE_MINUTES);
    void this.runOnce(ctx);
  }

  public async restoreBackup(dbPath: string, backupFilePath: string): Promise<void> {
    this.stop();
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.rmSync(walPath, { force: true });
    }
    if (fs.existsSync(shmPath)) {
      fs.rmSync(shmPath, { force: true });
    }
    fs.copyFileSync(backupFilePath, dbPath);
  }

  private async runOnce(ctx: DbContext): Promise<void> {
    if (this.activeDbPath !== ctx.path) {
      return;
    }
    if (!this.acquireLock(ctx.path)) {
      return;
    }

    const backupDir = resolveBackupDir(ctx.path);
    fs.mkdirSync(backupDir, { recursive: true });
    const baseName = path.basename(ctx.path, path.extname(ctx.path));
    const target = path.join(backupDir, `${baseName}-${nowStamp()}.sqlite`);

    try {
      await ctx.sqlite.backup(target);
      if (this.lockPath) {
        const now = new Date();
        fs.utimesSync(this.lockPath, now, now);
      }
    } catch {
      // best effort backup in background
    }
  }

  private acquireLock(dbPath: string): boolean {
    const lockPath = lockFilePathForDb(dbPath);
    this.lockPath = lockPath;
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });

    if (this.lockedFd !== null) {
      return true;
    }

    try {
      this.lockedFd = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(
        this.lockedFd,
        JSON.stringify({ pid: process.pid, host: os.hostname(), since: new Date().toISOString() }),
      );
      return true;
    } catch {
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > STALE_LOCK_MS) {
          fs.rmSync(lockPath, { force: true });
          this.lockedFd = fs.openSync(lockPath, 'wx');
          fs.writeFileSync(
            this.lockedFd,
            JSON.stringify({ pid: process.pid, host: os.hostname(), since: new Date().toISOString() }),
          );
          return true;
        }
      } catch {
        return false;
      }
      return false;
    }
  }

  private releaseLock(): void {
    if (this.lockedFd !== null) {
      try {
        fs.closeSync(this.lockedFd);
      } catch {
        // noop
      }
      this.lockedFd = null;
    }
    if (this.lockPath) {
      try {
        fs.rmSync(this.lockPath, { force: true });
      } catch {
        // noop
      }
      this.lockPath = null;
    }
  }
}
