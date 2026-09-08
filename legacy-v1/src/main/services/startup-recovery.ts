import type { UpdaterState } from '../../shared/types';

const UPDATE_OWNER = process.env.S1_UPDATE_OWNER || 'wattnpapa';
const UPDATE_REPO = process.env.S1_UPDATE_REPO || 'S1-Control';
const RELEASES_URL = `https://github.com/${UPDATE_OWNER}/${UPDATE_REPO}/releases/latest`;

interface StartupRecoveryUpdater {
  checkForUpdates: () => Promise<void>;
  getState: () => UpdaterState;
}

interface StartupRecoveryDeps {
  updater: StartupRecoveryUpdater;
  withVersion: (message: string) => string;
  showErrorBox: (title: string, content: string) => void;
  showMessageBox: (options: {
    type: 'warning';
    title: string;
    message: string;
    detail: string;
    buttons: [string, string];
    defaultId: number;
    cancelId: number;
  }) => Promise<{ response: number }>;
  openExternal: (url: string) => Promise<void>;
}

/**
 * Formats startup failure payload into a readable message.
 */
function toStartupErrorMessage(error: unknown): string {
  return error instanceof Error ? error.stack || error.message : String(error);
}

/**
 * Builds a user-facing fallback update text.
 */
function buildUpdateHint(state: UpdaterState): string {
  if (state.stage === 'available') {
    const latest = state.latestVersion ? ` (${state.latestVersion})` : '';
    return `Ein Update ist verfügbar${latest}. Öffne die Release-Seite, um die stabile Version zu installieren.`;
  }
  if (state.stage === 'error' && state.message) {
    return `Update-Check konnte nicht abgeschlossen werden: ${state.message}\nDu kannst trotzdem die Release-Seite öffnen.`;
  }
  return 'Die Anwendung konnte nicht normal starten. Du kannst jetzt die Release-Seite öffnen und eine neue Version installieren.';
}

/**
 * Runs emergency startup recovery and ensures update path remains reachable.
 */
export async function runStartupRecovery(error: unknown, deps: StartupRecoveryDeps): Promise<void> {
  deps.showErrorBox('Startfehler', deps.withVersion(toStartupErrorMessage(error)));

  try {
    await deps.updater.checkForUpdates();
  } catch {
    // Keep fallback path available even when update check fails.
  }

  const result = await deps.showMessageBox({
    type: 'warning',
    title: 'Wiederherstellung',
    message: 'Start fehlgeschlagen',
    detail: buildUpdateHint(deps.updater.getState()),
    buttons: ['Release-Seite öffnen', 'Schließen'],
    defaultId: 0,
    cancelId: 1,
  });
  if (result.response !== 0) {
    return;
  }
  try {
    await deps.openExternal(RELEASES_URL);
  } catch {
    // Ignore to avoid secondary crash loops.
  }
}
