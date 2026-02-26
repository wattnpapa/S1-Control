import fs from 'node:fs';
import path from 'node:path';
import type { DbContext } from '../db/connection';

const FIVE_MINUTES = 5 * 60 * 1000;
const BACKUP_LOOP_MS = 10 * 1000;

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

export class BackupCoordinator {
  private interval: NodeJS.Timeout | null = null;

  private activeDbPath: string | null = null;

  private lastBackupAt = 0;

  constructor(private readonly canWriteBackup: () => boolean = () => true) {}

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.activeDbPath = null;
    this.lastBackupAt = 0;
  }

  public start(ctx: DbContext): void {
    this.stop();
    this.activeDbPath = ctx.path;
    this.lastBackupAt = 0;
    this.interval = setInterval(() => {
      void this.runOnce(ctx);
    }, BACKUP_LOOP_MS);
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
    if (!this.canWriteBackup()) {
      return;
    }
    const now = Date.now();
    if (now - this.lastBackupAt < FIVE_MINUTES) {
      return;
    }

    const backupDir = resolveBackupDir(ctx.path);
    fs.mkdirSync(backupDir, { recursive: true });
    const baseName = path.basename(ctx.path, path.extname(ctx.path));
    const target = path.join(backupDir, `${baseName}-${nowStamp()}.sqlite`);

    try {
      await ctx.sqlite.backup(target);
      this.lastBackupAt = now;
    } catch {
      // best effort backup in background
    }
  }
}
