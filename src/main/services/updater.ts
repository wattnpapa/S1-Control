import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { UpdaterState } from '../../shared/types';

const GITHUB_OWNER = process.env.S1_UPDATE_OWNER || 'wattnpapa';
const GITHUB_REPO = process.env.S1_UPDATE_REPO || 'S1-Control';

export class UpdaterService {
  private state: UpdaterState = {
    stage: 'idle',
    currentVersion: app.getVersion(),
    source: 'github-release',
    inAppDownloadSupported: false,
    inAppDownloadReason: 'Noch nicht geprüft.',
  };
  private autoUpdaterEnabled = false;
  private canDownloadInApp = false;

  private readonly notify: (state: UpdaterState) => void;

  public constructor(notify: (state: UpdaterState) => void) {
    this.state.currentVersion = this.resolveDisplayVersion();
    this.notify = notify;
    this.configureAutoUpdater();
  }

  public getState(): UpdaterState {
    return this.state;
  }

  public async checkForUpdates(): Promise<void> {
    this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
    this.canDownloadInApp = false;

    try {
      if (!this.autoUpdaterEnabled) {
        await this.checkGitHubReleaseVersion('Auto-Updater ist im aktuellen Build nicht aktiv.');
        return;
      }

      if (!this.isAutoUpdaterConfigured()) {
        await this.checkGitHubReleaseVersion('`app-update.yml` fehlt. In-App-Download ist daher nicht möglich.');
        return;
      }

      const result = await autoUpdater.checkForUpdates();
      this.canDownloadInApp = true;
      const latestVersion = result?.updateInfo?.version;
      if (latestVersion) {
        this.setState({
          latestVersion: this.toDisplayVersion(latestVersion),
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'In-App-Download ist verfügbar.',
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.isNoPublishedVersionsError(message)) {
        await this.checkGitHubReleaseVersion(
          'Noch keine veröffentlichte Release-Metadaten für In-App-Download verfügbar.',
        );
        return;
      }
      if (this.isOfflineLikeError(message)) {
        this.setState({ stage: 'idle' });
        return;
      }
      if (this.isVersionFormatError(message)) {
        await this.checkGitHubReleaseVersion(
          `In-App-Download nicht möglich: ${message}`,
        );
        return;
      }
      this.setState({ stage: 'error', message });
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured() || !this.canDownloadInApp) {
      this.setState({
        stage: 'unsupported',
        source: 'github-release',
        inAppDownloadSupported: false,
        message: this.state.inAppDownloadReason ?? 'In-App-Download nicht verfügbar. Bitte über die Release-Seite aktualisieren.',
      });
      return;
    }
    await autoUpdater.downloadUpdate();
  }

  public installDownloadedUpdate(): void {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured()) {
      return;
    }
    autoUpdater.quitAndInstall();
  }

  private configureAutoUpdater(): void {
    try {
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;

      autoUpdater.on('checking-for-update', () => {
        this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
      });

      autoUpdater.on('update-available', (info) => {
        this.setState({
          stage: 'available',
          latestVersion: this.toDisplayVersion(info.version),
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'In-App-Download ist verfügbar.',
        });
      });

      autoUpdater.on('update-not-available', () => {
        this.setState({
          stage: 'not-available',
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'In-App-Download ist verfügbar.',
        });
      });

      autoUpdater.on('error', (error) => {
        const message = error.message || 'Update-Fehler';
        if (this.isNoPublishedVersionsError(message)) {
          this.setState({
            stage: 'not-available',
            source: 'github-release',
            inAppDownloadSupported: false,
            inAppDownloadReason: 'Noch keine veröffentlichte Release-Metadaten für In-App-Download verfügbar.',
          });
          return;
        }
        if (this.isOfflineLikeError(message)) {
          // Offlinebetrieb: kein Fehlerbanner erzwingen.
          this.setState({ stage: 'idle' });
          return;
        }
        this.setState({ stage: 'error', message });
      });

      autoUpdater.on('download-progress', (progress) => {
        this.setState({
          stage: 'downloading',
          progressPercent: progress.percent,
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        this.setState({
          stage: 'downloaded',
          latestVersion: this.toDisplayVersion(info.version),
          progressPercent: 100,
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'Update wurde in der App heruntergeladen.',
        });
      });

      this.autoUpdaterEnabled = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.autoUpdaterEnabled = false;
      this.setState({
        stage: 'idle',
        message: `Auto-Updater deaktiviert: ${message}`,
      });
    }
  }

  private isAutoUpdaterConfigured(): boolean {
    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!existsSync(updateConfigPath)) {
      return false;
    }

    return true;
  }

  private async checkGitHubReleaseVersion(reason: string): Promise<void> {
    const endpoint = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

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
      const latestVersion = this.normalizeVersion(payload.tag_name || payload.name || '');
      const currentVersion = this.resolveDisplayVersion();

      if (!latestVersion) {
        this.setState({
          stage: 'not-available',
          source: 'github-release',
          inAppDownloadSupported: false,
          inAppDownloadReason: reason,
        });
        return;
      }

      const compare = this.compareVersions(currentVersion, latestVersion);
      if (compare === null) {
        this.setState({
          stage: 'not-available',
          latestVersion,
          message: 'Versionsvergleich nicht eindeutig möglich.',
          source: 'github-release',
          inAppDownloadSupported: false,
          inAppDownloadReason: reason,
        });
        return;
      }

      if (compare < 0) {
        this.setState({
          stage: 'available',
          latestVersion,
          message: reason,
          source: 'github-release',
          inAppDownloadSupported: false,
          inAppDownloadReason: reason,
        });
      } else {
        this.setState({
          stage: 'not-available',
          latestVersion,
          source: 'github-release',
          inAppDownloadSupported: false,
          inAppDownloadReason: reason,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (this.isOfflineLikeError(message)) {
        this.setState({ stage: 'idle' });
        return;
      }
      this.setState({ stage: 'error', message });
    }
  }

  private normalizeVersion(version: string): string {
    return version.trim().replace(/^v/i, '');
  }

  private isSemverVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version.trim());
  }

  private isVersionFormatError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('semver') ||
      lower.includes('invalid version') ||
      lower.includes('not a valid semver') ||
      lower.includes('is not valid semver') ||
      lower.includes('version is not valid')
    );
  }

  private isBuildVersion(version: string): boolean {
    return /^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(version.trim());
  }

  private isNoPublishedVersionsError(message: string): boolean {
    return message.toLowerCase().includes('no published versions on github');
  }

  private compareVersions(current: string, latest: string): number | null {
    if (this.isSemverVersion(current) && this.isSemverVersion(latest)) {
      return this.compareSemver(current, latest);
    }
    if (this.isBuildVersion(current) && this.isBuildVersion(latest)) {
      return this.compareBuildVersions(current, latest);
    }
    if (this.isSemverVersion(current) && this.isBuildVersion(latest)) {
      const currentDate = this.parseSemverDate(current);
      const latestDate = this.parseBuildVersionDate(latest);
      if (currentDate === null || latestDate === null) {
        return null;
      }
      if (currentDate < latestDate) return -1;
      if (currentDate > latestDate) return 1;
      return 0;
    }
    return null;
  }

  private compareSemver(current: string, latest: string): number {
    const toParts = (value: string) =>
      value
        .split(/[.-]/)
        .slice(0, 3)
        .map((part) => Number(part));

    const currentParts = toParts(current);
    const latestParts = toParts(latest);

    for (let i = 0; i < 3; i += 1) {
      const a = currentParts[i] ?? 0;
      const b = latestParts[i] ?? 0;
      if (a < b) return -1;
      if (a > b) return 1;
    }
    return 0;
  }

  private compareBuildVersions(current: string, latest: string): number | null {
    const currentDate = this.parseBuildVersionDate(current);
    const latestDate = this.parseBuildVersionDate(latest);
    if (!currentDate || !latestDate) {
      return null;
    }
    if (currentDate < latestDate) return -1;
    if (currentDate > latestDate) return 1;
    return 0;
  }

  private parseBuildVersionDate(version: string): number | null {
    const match = /^(\d{4})\.(\d{2})\.(\d{2})\.(\d{2})\.(\d{2})$/.exec(version.trim());
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const timestamp = Date.UTC(year, month, day, hour, minute, 0, 0);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    const check = new Date(timestamp);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month ||
      check.getUTCDate() !== day ||
      check.getUTCHours() !== hour ||
      check.getUTCMinutes() !== minute
    ) {
      return null;
    }
    return timestamp;
  }

  private parseSemverDate(version: string): number | null {
    const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})$/.exec(version.trim());
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const timestamp = Date.UTC(year, month, day, hour, minute, 0, 0);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    return timestamp;
  }

  private resolveDisplayVersion(): string {
    const envVersion = process.env.S1_APP_VERSION?.trim();
    if (envVersion) {
      return envVersion;
    }
    return this.toDisplayVersion(app.getVersion());
  }

  private toDisplayVersion(version: string): string {
    const normalized = this.normalizeVersion(version);
    const parsed = this.parseSemverDate(normalized);
    if (parsed === null) {
      return normalized;
    }
    const date = new Date(parsed);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hour = String(date.getUTCHours()).padStart(2, '0');
    const minute = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}.${month}.${day}.${hour}.${minute}`;
  }

  private isOfflineLikeError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('internet_disconnected') ||
      lower.includes('net::err_internet_disconnected') ||
      lower.includes('enotfound') ||
      lower.includes('eai_again') ||
      lower.includes('etimedout') ||
      lower.includes('econnrefused') ||
      lower.includes('ehostunreach') ||
      lower.includes('network')
    );
  }

  private setState(next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>): void {
    this.state = {
      ...this.state,
      ...next,
      currentVersion: this.resolveDisplayVersion(),
    };
    this.notify(this.state);
  }
}
