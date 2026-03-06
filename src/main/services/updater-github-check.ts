import { compareVersions, normalizeVersion } from './updater-versioning';
import { isOfflineLikeError } from './updater-network-errors';
import type { UpdaterState } from '../../shared/types';

const GITHUB_CHECK_TIMEOUT_MS = 12000;
const GITHUB_TIMEOUT_MESSAGE = 'Update-Check Zeitüberschreitung (GitHub).';

interface GitHubCheckParams {
  owner: string;
  repo: string;
  reason: string;
  resolveDisplayVersion: () => string;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
}

/**
 * Loads latest release payload from GitHub with timeout.
 */
async function fetchLatestRelease(owner: string, repo: string): Promise<{ tag_name?: string; name?: string }> {
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_CHECK_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'S1-Control-Updater',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!response.ok) {
    throw new Error(`GitHub Update-Check fehlgeschlagen (${response.status})`);
  }
  return (await response.json()) as { tag_name?: string; name?: string };
}

/**
 * Applies updater state by comparing local and remote versions.
 */
function applyVersionState(params: GitHubCheckParams, latestVersion: string): void {
  if (!latestVersion) {
    params.setState({
      stage: 'not-available',
      source: 'github-release',
      inAppDownloadSupported: false,
      inAppDownloadReason: params.reason,
    });
    return;
  }

  const compare = compareVersions(params.resolveDisplayVersion(), latestVersion);
  if (compare === null) {
    params.setState({
      stage: 'not-available',
      latestVersion,
      message: 'Versionsvergleich nicht eindeutig möglich.',
      source: 'github-release',
      inAppDownloadSupported: false,
      inAppDownloadReason: params.reason,
    });
    return;
  }

  params.setState({
    stage: compare < 0 ? 'available' : 'not-available',
    latestVersion,
    message: compare < 0 ? params.reason : undefined,
    source: 'github-release',
    inAppDownloadSupported: false,
    inAppDownloadReason: params.reason,
  });
}

/**
 * Maps GitHub-check errors to updater state.
 */
function applyGitHubCheckError(params: GitHubCheckParams, error: unknown): void {
  if (error instanceof Error && error.name === 'AbortError') {
    params.setState({ stage: 'error', message: GITHUB_TIMEOUT_MESSAGE });
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  if (isOfflineLikeError(message)) {
    params.setState({ stage: 'idle' });
    return;
  }
  params.setState({ stage: 'error', message });
}

/**
 * Checks GitHub releases and updates updater state via callback.
 */
export async function checkGitHubReleaseVersion(params: GitHubCheckParams): Promise<void> {
  try {
    const payload = await fetchLatestRelease(params.owner, params.repo);
    const latestVersion = normalizeVersion(payload.tag_name || payload.name || '');
    applyVersionState(params, latestVersion);
  } catch (error) {
    applyGitHubCheckError(params, error);
  }
}
