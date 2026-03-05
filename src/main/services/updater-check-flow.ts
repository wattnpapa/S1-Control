import { checkGitHubReleaseVersion } from './updater-github-check';
import { isOfflineLikeError } from './updater-network-errors';
import {
  isNoPublishedVersionsError,
  isVersionFormatError,
} from './updater-versioning';
import type { UpdaterState } from '../../shared/types';

interface UpdaterCheckContext {
  autoUpdaterEnabled: boolean;
  autoUpdaterInitError: string | null;
  isAutoUpdaterConfigured: boolean;
}

interface GitHubFallbackParams {
  owner: string;
  repo: string;
  reason: string;
  resolveDisplayVersion: () => string;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
}

/**
 * Resolves whether update checks must use GitHub fallback.
 */
export function resolveGitHubFallbackReason(context: UpdaterCheckContext): string | null {
  if (!context.autoUpdaterEnabled) {
    return context.autoUpdaterInitError
      ? `Auto-Updater ist im aktuellen Build nicht aktiv (${context.autoUpdaterInitError}).`
      : 'Auto-Updater ist im aktuellen Build nicht aktiv.';
  }
  if (!context.isAutoUpdaterConfigured) {
    return '`app-update.yml` fehlt. In-App-Download ist daher nicht möglich.';
  }
  return null;
}

/**
 * Runs GitHub fallback update check.
 */
export async function runGitHubFallback(params: GitHubFallbackParams): Promise<void> {
  await checkGitHubReleaseVersion({
    owner: params.owner,
    repo: params.repo,
    reason: params.reason,
    resolveDisplayVersion: params.resolveDisplayVersion,
    setState: params.setState,
  });
}

interface HandleUpdateCheckErrorParams {
  error: unknown;
  runGitHubFallback: (reason: string) => Promise<void>;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
}

/**
 * Handles updater-check errors and applies fallback behavior.
 */
export async function handleUpdateCheckError(params: HandleUpdateCheckErrorParams): Promise<void> {
  const message = params.error instanceof Error ? params.error.message : String(params.error);
  if (isNoPublishedVersionsError(message)) {
    await params.runGitHubFallback('Noch keine veröffentlichte Release-Metadaten für In-App-Download verfügbar.');
    return;
  }
  if (isOfflineLikeError(message)) {
    params.setState({ stage: 'idle' });
    return;
  }
  if (isVersionFormatError(message)) {
    await params.runGitHubFallback(`In-App-Download nicht möglich: ${message}`);
    return;
  }
  params.setState({ stage: 'error', message });
}
