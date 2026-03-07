import { compareVersions, normalizeVersion } from './updater-versioning';
import { isOfflineLikeError } from './updater-network-errors';
import type { UpdaterState } from '../../shared/types';
import { debugSync } from './debug';

const GITHUB_CHECK_TIMEOUT_MS = 8000;

interface GitHubCheckParams {
  owner: string;
  repo: string;
  reason: string;
  resolveDisplayVersion: () => string;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
}

function githubLatestReleaseUrl(owner: string, repo: string): string {
  return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
}

function githubLatestReleasesPageUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/releases/latest`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function githubDualTimeoutMessage(owner: string, repo: string): string {
  return `Update-Check Zeitüberschreitung (GitHub API: ${githubLatestReleaseUrl(owner, repo)}; GitHub Releases: ${githubLatestReleasesPageUrl(owner, repo)}).`;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GITHUB_CHECK_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Loads latest release payload from GitHub with timeout.
 */
async function fetchLatestRelease(owner: string, repo: string): Promise<{ tag_name?: string; name?: string }> {
  const endpoint = githubLatestReleaseUrl(owner, repo);
  const response = await fetchWithTimeout(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'S1-Control-Updater',
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub Update-Check fehlgeschlagen (${response.status})`);
  }
  return (await response.json()) as { tag_name?: string; name?: string };
}

/**
 * Resolves latest release version from GitHub releases web page.
 */
async function fetchLatestReleaseFromWeb(owner: string, repo: string): Promise<string> {
  const endpoint = githubLatestReleasesPageUrl(owner, repo);
  const response = await fetchWithTimeout(endpoint, {
    headers: { 'User-Agent': 'S1-Control-Updater' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`GitHub Releases-Seite nicht erreichbar (${response.status})`);
  }
  const resolvedUrl = response.url || endpoint;
  const match = resolvedUrl.match(/\/releases\/tag\/([^/?#]+)/i);
  if (!match?.[1]) {
    throw new Error('GitHub Releases-Seite enthält keine auflösbare Versions-Weiterleitung.');
  }
  return normalizeVersion(decodeURIComponent(match[1]));
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
  if (isAbortError(error)) {
    params.setState({
      stage: 'error',
      message: githubDualTimeoutMessage(params.owner, params.repo),
    });
    return;
  }
  const message = toErrorMessage(error);
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
  const startedAt = Date.now();
  const apiPromise = (async () => {
    const apiStartedAt = Date.now();
    const payload = await fetchLatestRelease(params.owner, params.repo);
    const latestVersion = normalizeVersion(payload.tag_name || payload.name || '');
    if (!latestVersion) {
      throw new Error('GitHub API enthält keine verwertbare Versionskennung.');
    }
    debugSync('updater', 'github-api-ok', { ms: Date.now() - apiStartedAt, latestVersion });
    return latestVersion;
  })();

  const webPromise = (async () => {
    const webStartedAt = Date.now();
    const latestVersion = await fetchLatestReleaseFromWeb(params.owner, params.repo);
    debugSync('updater', 'github-web-ok', { ms: Date.now() - webStartedAt, latestVersion });
    return latestVersion;
  })();

  try {
    const latestVersion = await Promise.any([apiPromise, webPromise]);
    debugSync('updater', 'github-check-ok', { ms: Date.now() - startedAt, latestVersion });
    applyVersionState(params, latestVersion);
  } catch (error) {
    const aggregate = error as AggregateError;
    const causes = Array.isArray(aggregate.errors) ? aggregate.errors : [error];
    const messages = causes.map((cause) => toErrorMessage(cause));
    const apiMessage = messages[0] ?? 'unbekannt';
    const webMessage = messages[1] ?? 'unbekannt';
    if (isOfflineLikeError(apiMessage) && isOfflineLikeError(webMessage)) {
      params.setState({ stage: 'idle' });
      return;
    }
    if (causes.some((cause) => isAbortError(cause))) {
      debugSync('updater', 'github-check-timeout', { ms: Date.now() - startedAt, apiMessage, webMessage });
      applyGitHubCheckError(params, new Error(githubDualTimeoutMessage(params.owner, params.repo)));
      return;
    }
    debugSync('updater', 'github-check-error', { ms: Date.now() - startedAt, apiMessage, webMessage });
    applyGitHubCheckError(params, new Error(`GitHub-Check fehlgeschlagen. API: ${apiMessage} | Releases: ${webMessage}`));
  }
}
