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
  private canDownloadInApp = false;

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
    this.canDownloadInApp = false;

    try {
      if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured()) {
        await this.checkGitHubReleaseVersion();
        return;
      }

      const result = await autoUpdater.checkForUpdates();
      this.canDownloadInApp = true;
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
      if (this.isVersionFormatError(message)) {
        await this.checkGitHubReleaseVersion();
        return;
      }
      this.setState({ stage: 'error', message });
    }
  }

  public async downloadUpdate(): Promise<void> {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured() || !this.canDownloadInApp) {
      this.setState({
        stage: 'unsupported',
        message: 'In-App-Download nicht verfügbar. Bitte über die Release-Seite aktualisieren.',
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

      const compare = this.compareVersions(currentVersion, latestVersion);
      if (compare === null) {
        this.setState({
          stage: 'not-available',
          latestVersion,
          message: 'Versionsvergleich nicht eindeutig möglich.',
        });
        return;
      }

      if (compare < 0) {
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

  private isVersionFormatError(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('semver') || lower.includes('version') || lower.includes('invalid version');
  }

  private isNatoVersionTag(version: string): boolean {
    return /^\d{2}\d{2}\d{2}[a-z]{3}\d{2}$/i.test(version.trim());
  }

  private compareVersions(current: string, latest: string): number | null {
    if (this.isSemverVersion(current) && this.isSemverVersion(latest)) {
      return this.compareSemver(current, latest);
    }
    if (this.isNatoVersionTag(current) && this.isNatoVersionTag(latest)) {
      return this.compareNatoTags(current, latest);
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

  private compareNatoTags(current: string, latest: string): number | null {
    const currentDate = this.parseNatoTag(current);
    const latestDate = this.parseNatoTag(latest);
    if (!currentDate || !latestDate) {
      return null;
    }
    if (currentDate < latestDate) return -1;
    if (currentDate > latestDate) return 1;
    return 0;
  }

  private parseNatoTag(version: string): number | null {
    const match = /^(\d{2})(\d{2})(\d{2})([a-z]{3})(\d{2})$/i.exec(version.trim());
    if (!match) {
      return null;
    }

    const dd = Number(match[1]);
    const hh = Number(match[2]);
    const mm = Number(match[3]);
    const mon = (match[4] ?? '').toLowerCase();
    const yy = Number(match[5]);
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const month = months[mon];
    if (month === undefined) {
      return null;
    }

    const year = 2000 + yy;
    const timestamp = Date.UTC(year, month, dd, hh, mm, 0, 0);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    const check = new Date(timestamp);
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month ||
      check.getUTCDate() !== dd ||
      check.getUTCHours() !== hh ||
      check.getUTCMinutes() !== mm
    ) {
      return null;
    }
    return timestamp;
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
