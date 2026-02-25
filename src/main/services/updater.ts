import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { UpdaterState } from '../../shared/types';

const GITHUB_OWNER = process.env.S1_UPDATE_OWNER || 'wattnpapa';
const GITHUB_REPO = process.env.S1_UPDATE_REPO || 'S1-Control';

export class UpdaterService {
  private state: UpdaterState = { stage: 'idle', currentVersion: app.getVersion() };
  private autoUpdaterEnabled = false;

  private readonly notify: (state: UpdaterState) => void;

  public constructor(notify: (state: UpdaterState) => void) {
    this.notify = notify;
    this.configureAutoUpdater();
  }

  public getState(): UpdaterState {
    return this.state;
  }

  public async checkForUpdates(): Promise<void> {
    this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });

    try {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured() || !this.isSemverVersion(app.getVersion())) {
        await this.checkGitHubReleaseVersion();
        return;
      }
      const result = await autoUpdater.checkForUpdates();
      const latestVersion = result?.updateInfo?.version;
      if (latestVersion) {
        this.setState({ latestVersion });
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

  public async downloadUpdate(): Promise<void> {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured()) {
      this.setState({
        stage: 'unsupported',
        message: 'Update-Download ist nur in signierten Release-Builds verfügbar.',
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
        this.setState({ stage: 'available', latestVersion: info.version });
      });

      autoUpdater.on('update-not-available', () => {
        this.setState({ stage: 'not-available' });
      });

      autoUpdater.on('error', (error) => {
        const message = error.message || 'Update-Fehler';
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
        this.setState({ stage: 'downloaded', latestVersion: info.version, progressPercent: 100 });
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

  private async checkGitHubReleaseVersion(): Promise<void> {
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
      const currentVersion = this.normalizeVersion(app.getVersion());

      if (!latestVersion) {
        this.setState({ stage: 'not-available' });
        return;
      }

      if (latestVersion !== currentVersion) {
        this.setState({
          stage: 'available',
          latestVersion,
          message: 'Lokaler Build ohne Auto-Update-Datei. Download/Install manuell über GitHub Release.',
        });
      } else {
        this.setState({ stage: 'not-available', latestVersion });
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
    return /^\d+\.\d+\.\d+([-.+].+)?$/.test(version.trim());
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
      currentVersion: app.getVersion(),
    };
    this.notify(this.state);
  }
}
