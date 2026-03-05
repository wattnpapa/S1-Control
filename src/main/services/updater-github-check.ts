import { compareVersions, normalizeVersion } from './updater-versioning';
import { isOfflineLikeError } from './updater-network-errors';
import type { UpdaterState } from '../../shared/types';

/**
 * Checks GitHub releases and updates updater state via callback.
 */
export async function checkGitHubReleaseVersion(params: {
  owner: string;
  repo: string;
  reason: string;
  resolveDisplayVersion: () => string;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
}): Promise<void> {
  const endpoint = `https://api.github.com/repos/${params.owner}/${params.repo}/releases/latest`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'S1-Control-Updater',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub Update-Check fehlgeschlagen (${response.status})`);
    }

    const payload = (await response.json()) as { tag_name?: string; name?: string };
    const latestVersion = normalizeVersion(payload.tag_name || payload.name || '');
    const currentVersion = params.resolveDisplayVersion();

    if (!latestVersion) {
      params.setState({
        stage: 'not-available',
        source: 'github-release',
        inAppDownloadSupported: false,
        inAppDownloadReason: params.reason,
      });
      return;
    }

    const compare = compareVersions(currentVersion, latestVersion);
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

    if (compare < 0) {
      params.setState({
        stage: 'available',
        latestVersion,
        message: params.reason,
        source: 'github-release',
        inAppDownloadSupported: false,
        inAppDownloadReason: params.reason,
      });
      return;
    }

    params.setState({
      stage: 'not-available',
      latestVersion,
      source: 'github-release',
      inAppDownloadSupported: false,
      inAppDownloadReason: params.reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isOfflineLikeError(message)) {
      params.setState({ stage: 'idle' });
      return;
    }
    params.setState({ stage: 'error', message });
  }
}
