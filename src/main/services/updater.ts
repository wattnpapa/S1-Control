import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { UpdaterState } from '../../shared/types';

export class UpdaterService {
  private state: UpdaterState = { stage: 'idle', currentVersion: app.getVersion() };

  private readonly notify: (state: UpdaterState) => void;

  public constructor(notify: (state: UpdaterState) => void) {
    this.notify = notify;
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
  }

  public getState(): UpdaterState {
    return this.state;
  }

  public async checkForUpdates(): Promise<void> {
    if (!this.isUpdateConfigured()) {
      return;
    }
    const result = await autoUpdater.checkForUpdates();
    const latestVersion = result?.updateInfo?.version;
    if (latestVersion) {
      this.setState({ latestVersion });
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (!this.isUpdateConfigured()) {
      return;
    }
    await autoUpdater.downloadUpdate();
  }

  public installDownloadedUpdate(): void {
    if (!this.isUpdateConfigured()) {
      return;
    }
    autoUpdater.quitAndInstall();
  }

  private isUpdateConfigured(): boolean {
    if (!app.isPackaged) {
      this.setState({ stage: 'unsupported', message: 'Auto-Update ist nur in einer Release-App verfügbar.' });
      return false;
    }

    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!existsSync(updateConfigPath)) {
      this.setState({
        stage: 'unsupported',
        message: 'Auto-Update ist in dieser Build-Variante nicht verfügbar (kein app-update.yml).',
      });
      return false;
    }

    return true;
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
