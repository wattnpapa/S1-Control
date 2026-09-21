import fs from 'node:fs';
import path from 'node:path';
import type { DbContext } from '../db/connection';

const FIVE_MINUTES = 5 * 60 * 1000;
const BACKUP_LOOP_MS = 10 * 1000;
const INITIAL_BACKUP_DELAY_MS = 60 * 1000;

function initialBackupDelayMs(): number {
  return process.env.NODE_ENV === 'test' ? 0 : INITIAL_BACKUP_DELAY_MS;
}

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

  private letzteSicherung: { zeitpunkt: string; pfad: string } | null = null;

  private letzterFehler: string | null = null;

  constructor(private readonly canWriteBackup: () => boolean = () => true) {}

  /**
   * Zustand der Sicherungen für die Anzeige: ohne ihn bleibt ein
   * gescheitertes Backup unbemerkt, bis es gebraucht wird.
   */
  public zustand(): { letzteSicherung: string | null; pfad: string | null; fehler: string | null } {
    return {
      letzteSicherung: this.letzteSicherung?.zeitpunkt ?? null,
      pfad: this.letzteSicherung?.pfad ?? null,
      fehler: this.letzterFehler,
    };
  }

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
    const initialDelay = initialBackupDelayMs();
    this.lastBackupAt = Date.now() - (FIVE_MINUTES - initialDelay);
    this.interval = setInterval(() => {
      void this.runOnce(ctx);
    }, BACKUP_LOOP_MS);
    if (initialDelay === 0) {
      void this.runOnce(ctx);
    }
  }

  /**
   * Spielt eine Sicherung ein. Der Stand, der dabei ersetzt wird, wird zuvor
   * selbst gesichert — sonst wäre er unwiederbringlich verloren.
   *
   * @returns Pfad der Sicherung des ersetzten Standes, falls angelegt.
   */
  public async restoreBackup(
    dbPath: string,
    backupFilePath: string,
  ): Promise<string | null> {
    this.stop();
    const safetyCopy = this.backupCurrentState(dbPath);
    fs.copyFileSync(backupFilePath, dbPath);
    return safetyCopy;
  }

  /**
   * Legt eine Sicherung des aktuellen Standes an, bevor er überschrieben wird.
   */
  public backupCurrentState(
    dbPath: string,
    suffix = 'vor-wiederherstellung',
  ): string | null {
    if (!fs.existsSync(dbPath)) {
      return null;
    }
    try {
      const backupDir = resolveBackupDir(dbPath);
      fs.mkdirSync(backupDir, { recursive: true });
      const baseName = path.basename(dbPath, path.extname(dbPath));
      const target = path.join(
        backupDir,
        `${baseName}-${nowStamp()}-${suffix}.s1control`,
      );
      fs.copyFileSync(dbPath, target);
      return target;
    } catch {
      return null;
    }
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
    const target = path.join(backupDir, `${baseName}-${nowStamp()}.s1control`);

    try {
      fs.copyFileSync(ctx.path, target);
      this.lastBackupAt = now;
      this.letzteSicherung = { zeitpunkt: new Date(now).toISOString(), pfad: target };
      this.letzterFehler = null;
    } catch (error) {
      // Der Fehler darf nicht stillschweigend liegen bleiben.
      this.letzterFehler = error instanceof Error ? error.message : String(error);
    }
  }
}
