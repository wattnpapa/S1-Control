import path from 'node:path';
import { dialog } from 'electron';
import { openDatabaseWithRetry } from '../db/connection';
import { ensureDefaultAdmin, ensureSessionUserRecord } from '../services/auth';
import { resolveBackupDir } from '../services/backup';
import { createEinsatzDbFileName } from '../services/einsatz-files';
import type { SessionUser } from '../../shared/types';
import type { RegistrarCommon } from './register-support';

const EINSATZ_FILE_FILTERS = [
  { name: 'S1-Control Einsatzdatei', extensions: ['s1control'] },
  { name: 'Legacy SQLite', extensions: ['sqlite'] },
];

/**
 * Returns supported file filters for einsatz DB dialogs.
 */
export function getEinsatzFileFilters(): Array<{ name: string; extensions: string[] }> {
  return EINSATZ_FILE_FILTERS;
}

/**
 * Normalizes selected einsatz file path with default extension.
 */
export function normalizeEinsatzFilePath(selected: string): string {
  return selected.toLowerCase().endsWith('.s1control') || selected.toLowerCase().endsWith('.sqlite')
    ? selected
    : `${selected}.s1control`;
}

/**
 * Opens file-dialog for existing einsatz database selection.
 */
export async function showOpenEinsatzDialog(baseDir: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Einsatz-Datei öffnen',
    defaultPath: baseDir,
    filters: getEinsatzFileFilters(),
    properties: ['openFile'],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

/**
 * Opens save-dialog for creating a new einsatz database file.
 */
export async function showCreateEinsatzDialog(baseDir: string, einsatzName: string): Promise<string | null> {
  const saveResult = await dialog.showSaveDialog({
    title: 'Einsatz-Datei speichern',
    defaultPath: path.join(baseDir, createEinsatzDbFileName(einsatzName)),
    filters: getEinsatzFileFilters(),
  });
  return saveResult.canceled || !saveResult.filePath ? null : normalizeEinsatzFilePath(saveResult.filePath);
}

/**
 * Opens backup file chooser dialog for an einsatz.
 */
export async function showRestoreBackupDialog(dbPath: string): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Backup laden',
    defaultPath: resolveBackupDir(dbPath),
    filters: getEinsatzFileFilters(),
    properties: ['openFile'],
  });
  return result.canceled ? null : (result.filePaths[0] ?? null);
}

/**
 * Reopens DB context after backup restore and rebinds services.
 */
export function reopenDbContextAfterRestore(
  common: RegistrarCommon,
  dbPath: string,
  einsatzId: string,
  user: SessionUser,
): void {
  const activeContext = common.state.getDbContext();
  activeContext.sqlite.close();
  const nextContext = openDatabaseWithRetry(dbPath);
  ensureDefaultAdmin(nextContext);
  const dbUser = ensureSessionUserRecord(nextContext, user);
  common.state.setSessionUser(dbUser);
  common.state.setDbContext(nextContext);
  if (common.state.clientHeartbeatEnabled && !common.state.perfSafeMode) {
    common.state.clientPresence.start(nextContext);
  }
  common.state.einsatzSync.setContext({ dbPath: nextContext.path, einsatzId });
  if (!common.state.perfSafeMode) {
    common.state.backupCoordinator.start(nextContext);
  }
}
