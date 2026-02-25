import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
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
});

