import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { BackupCoordinator, resolveBackupDir } from '../src/main/services/backup';

describe('backup service', () => {
  it('resolves backup directory next to db', () => {
    expect(resolveBackupDir('/tmp/einsatz.sqlite')).toBe('/tmp/backup');
  });

  it('restores backup file contents to target db path', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.sqlite');
    const backupPath = path.join(dir, 'einsatz-backup.sqlite');

    fs.writeFileSync(dbPath, 'old');
    fs.writeFileSync(backupPath, 'new');

    const c = new BackupCoordinator();
    await c.restoreBackup(dbPath, backupPath);

    expect(fs.readFileSync(dbPath, 'utf8')).toBe('new');
  });

  it('removes wal/shm files during restore', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.sqlite');
    const backupPath = path.join(dir, 'einsatz-backup.sqlite');
    const walPath = `${dbPath}-wal`;
    const shmPath = `${dbPath}-shm`;

    fs.writeFileSync(dbPath, 'old');
    fs.writeFileSync(backupPath, 'new');
    fs.writeFileSync(walPath, 'wal');
    fs.writeFileSync(shmPath, 'shm');

    const c = new BackupCoordinator();
    await c.restoreBackup(dbPath, backupPath);

    expect(fs.existsSync(walPath)).toBe(false);
    expect(fs.existsSync(shmPath)).toBe(false);
    expect(fs.readFileSync(dbPath, 'utf8')).toBe('new');
  });

  it('creates periodic backups and clears lock on stop', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.sqlite');
    fs.writeFileSync(dbPath, 'db');

    const backupMock = vi.fn(async (target: string) => {
      fs.writeFileSync(target, 'backup');
    });
    const coordinator = new BackupCoordinator();

    coordinator.start({
      path: dbPath,
      sqlite: { backup: backupMock },
    } as never);

    await new Promise((resolve) => setTimeout(resolve, 30));

    const backupDir = resolveBackupDir(dbPath);
    const files = fs.readdirSync(backupDir);
    expect(files.some((name) => name.endsWith('.sqlite'))).toBe(true);
    expect(files.some((name) => name.endsWith('.backup.lock'))).toBe(true);
    expect(backupMock).toHaveBeenCalled();

    coordinator.stop();
    const filesAfterStop = fs.readdirSync(backupDir);
    expect(filesAfterStop.some((name) => name.endsWith('.backup.lock'))).toBe(false);
  });

  it('allows only one backup writer per db lock', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.sqlite');
    fs.writeFileSync(dbPath, 'db');

    const backupA = vi.fn(async (target: string) => {
      fs.writeFileSync(target, 'backup-a');
    });
    const backupB = vi.fn(async (target: string) => {
      fs.writeFileSync(target, 'backup-b');
    });

    const a = new BackupCoordinator();
    const b = new BackupCoordinator();

    a.start({ path: dbPath, sqlite: { backup: backupA } } as never);
    await new Promise((resolve) => setTimeout(resolve, 30));

    b.start({ path: dbPath, sqlite: { backup: backupB } } as never);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(backupA).toHaveBeenCalled();
    expect(backupB).not.toHaveBeenCalled();

    a.stop();
    b.stop();
  });
});
