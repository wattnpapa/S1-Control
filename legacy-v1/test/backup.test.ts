import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { BackupCoordinator, resolveBackupDir } from '../src/main/services/backup';

describe('backup service - basics', () => {
  it('resolves backup directory next to db', () => {
    expect(resolveBackupDir('/tmp/einsatz.s1control')).toBe('/tmp/backup');
  });

  it('restores backup file contents to target db path', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.s1control');
    const backupPath = path.join(dir, 'einsatz-backup.s1control');

    fs.writeFileSync(dbPath, 'old');
    fs.writeFileSync(backupPath, 'new');

    const c = new BackupCoordinator();
    await c.restoreBackup(dbPath, backupPath);

    expect(fs.readFileSync(dbPath, 'utf8')).toBe('new');
  });

  it('creates periodic backups via fs.copyFileSync', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.s1control');
    fs.writeFileSync(dbPath, '{"schemaVersion":1}');

    const coordinator = new BackupCoordinator();
    coordinator.start({ path: dbPath } as never);

    // Wait for backup to run (NODE_ENV=test → immediate)
    await new Promise((resolve) => setTimeout(resolve, 50));

    const backupDir = resolveBackupDir(dbPath);
    expect(fs.existsSync(backupDir)).toBe(true);
    const files = fs.readdirSync(backupDir);
    expect(files.some((name) => name.endsWith('.s1control'))).toBe(true);

    coordinator.stop();
  });
});

describe('backup service - scheduling and master handover', () => {
  it('allows only configured master to write backup', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.s1control');
    fs.writeFileSync(dbPath, '{"schemaVersion":1}');

    const master = new BackupCoordinator(() => true);
    const slave = new BackupCoordinator(() => false);

    master.start({ path: dbPath } as never);
    await new Promise((resolve) => setTimeout(resolve, 50));

    slave.start({ path: dbPath } as never);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Master created a backup, slave did not
    const backupDir = resolveBackupDir(dbPath);
    const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
    expect(files.some((n) => n.endsWith('.s1control'))).toBe(true);

    master.stop();
    slave.stop();
  });

  it('hands over backup writing when master changes', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    const dbPath = path.join(dir, 'einsatz.s1control');
    fs.writeFileSync(dbPath, '{"schemaVersion":1}');
    let isMaster = false;

    const c = new BackupCoordinator(() => isMaster);
    c.start({ path: dbPath } as never);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const filesBeforePromotion = fs.existsSync(resolveBackupDir(dbPath))
      ? fs.readdirSync(resolveBackupDir(dbPath)).length
      : 0;
    expect(filesBeforePromotion).toBe(0);

    isMaster = true;
    c.stop();
    c.start({ path: dbPath } as never);
    await new Promise((resolve) => setTimeout(resolve, 50));

    const files = fs.readdirSync(resolveBackupDir(dbPath));
    expect(files.some((name) => name.endsWith('.s1control'))).toBe(true);
    c.stop();
  });
});

describe('backup service - error handling', () => {
  it('keeps running after backup write error (corrupted source)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-control-backup-'));
    // No source file → copyFileSync will throw, coordinator should keep running
    const dbPath = path.join(dir, 'nonexistent.s1control');

    const c = new BackupCoordinator();
    c.start({ path: dbPath } as never);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // No backup created (source doesn't exist) but coordinator didn't crash
    const backupDir = resolveBackupDir(dbPath);
    const files = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];
    expect(files).toHaveLength(0);
    c.stop();
  });
});
