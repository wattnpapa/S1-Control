import { app } from 'electron';
import { autoUpdater } from 'electron-updater';
import { existsSync } from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import path from 'node:path';
import type { PeerArtifact, PeerOffer, PeerUpdateStatus, UpdaterState } from '../../shared/types';
import { debugSync } from './debug';
import { UpdatePeerService, selectBestOffers } from './update-peer';

const GITHUB_OWNER = process.env.S1_UPDATE_OWNER || 'wattnpapa';
const GITHUB_REPO = process.env.S1_UPDATE_REPO || 'S1-Control';
const GENERIC_FEED_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download`;
const LAN_PEER_ENABLED = process.env.S1_UPDATER_LAN_PEER === '1';

interface UpdateArtifactMeta {
  version: string;
  platform: string;
  arch: string;
  channel: string;
  artifactName: string;
  sha512: string;
  size: number;
}

/**
 * Handles Now Iso.
 */
function nowIso(): string {
  return new Date().toISOString();
}

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
  private autoUpdaterInitError: string | null = null;
  private readonly peerEnabled = LAN_PEER_ENABLED;
  private readonly peerService: UpdatePeerService | null = null;
  private pendingArtifact: UpdateArtifactMeta | null = null;
  private lastPeerOffer: PeerOffer | null = null;
  private readonly updateCacheDir: string;

  private readonly notify: (state: UpdaterState) => void;

  /**
   * Creates an instance of this class.
   */
  public constructor(notify: (state: UpdaterState) => void) {
    this.state.currentVersion = this.resolveDisplayVersion();
    this.notify = notify;
    this.updateCacheDir = path.join(app.getPath('userData'), 'update-cache');
    if (this.peerEnabled) {
      this.peerService = new UpdatePeerService(this.updateCacheDir, true);
      this.peerService.startPeerServices();
      debugSync('peer-service', 'enabled', { cacheDir: this.updateCacheDir });
    }
    this.configureAutoUpdater();
  }

  /**
   * Handles Get State.
   */
  public getState(): UpdaterState {
    return this.state;
  }

  /**
   * Handles Get Peer Update Status.
   */
  public getPeerUpdateStatus(): PeerUpdateStatus {
    return (
      this.peerService?.getStatus() ?? {
        enabled: false,
        seederActive: false,
        discoveryPort: Number(process.env.S1_UPDATER_PEER_PORT || '41234'),
        httpPort: null,
        offeredArtifacts: [],
        lastTransfer: null,
      }
    );
  }

  /**
   * Handles Check For Updates.
   */
  public async checkForUpdates(): Promise<void> {
    this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
    this.canDownloadInApp = false;

    try {
      if (!this.autoUpdaterEnabled) {
        await this.checkGitHubReleaseVersion(
          this.autoUpdaterInitError
            ? `Auto-Updater ist im aktuellen Build nicht aktiv (${this.autoUpdaterInitError}).`
            : 'Auto-Updater ist im aktuellen Build nicht aktiv.',
        );
        return;
      }

      if (!this.isAutoUpdaterConfigured()) {
        await this.checkGitHubReleaseVersion('`app-update.yml` fehlt. In-App-Download ist daher nicht möglich.');
        return;
      }

      const result = await autoUpdater.checkForUpdates();
      this.canDownloadInApp = true;
      const latestVersion = result?.updateInfo?.version;
      this.pendingArtifact = this.toArtifactMeta(
        result?.updateInfo as { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> } | undefined,
      );
      if (latestVersion) {
        this.setState({
          latestVersion: this.toDisplayVersion(latestVersion),
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'In-App-Download ist verfügbar.',
          peerModeStage: 'idle',
          downloadSource: undefined,
          peerHost: undefined,
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

  /**
   * Handles Download Update.
   */
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
    if (this.peerEnabled && this.peerService) {
      const usedPeer = await this.tryPeerFirstDownload();
      if (usedPeer) {
        return;
      }
      this.setState({
        stage: 'downloading',
        peerModeStage: 'fallback',
        downloadSource: 'internet',
        message: 'Fallback: Internet-Download wird verwendet.',
      });
      debugSync('peer-fallback', 'internet-download');
    }
    await autoUpdater.downloadUpdate();
  }

  /**
   * Handles Install Downloaded Update.
   */
  public installDownloadedUpdate(): void {
    if (!this.autoUpdaterEnabled || !this.isAutoUpdaterConfigured()) {
      return;
    }
    autoUpdater.quitAndInstall();
  }

  /**
   * Handles Shutdown.
   */
  public shutdown(): void {
    this.peerService?.stopPeerServices();
  }

  /**
   * Handles Configure Auto Updater.
   */
  private configureAutoUpdater(): void {
    const hasCheckFn =
      typeof (autoUpdater as unknown as { checkForUpdates?: unknown }).checkForUpdates === 'function';
    if (!hasCheckFn) {
      this.autoUpdaterEnabled = false;
      this.autoUpdaterInitError = 'electron-updater API nicht verfügbar';
      return;
    }

    try {
      const updaterWithChannel = autoUpdater as unknown as {
        channel?: string;
        allowPrerelease?: boolean;
      };
      // Force stable metadata channel name regardless of app version format.
      updaterWithChannel.channel = 'latest';
      updaterWithChannel.allowPrerelease = false;

      const maybeSetFeedUrl = (autoUpdater as unknown as { setFeedURL?: (options: { provider: 'generic'; url: string }) => void })
        .setFeedURL;
      if (typeof maybeSetFeedUrl === 'function') {
        try {
          // Prefer bundled app-update.yml; setFeedURL can fail on some runtime combinations.
          maybeSetFeedUrl({ provider: 'generic', url: GENERIC_FEED_URL });
        } catch {
          // Ignore and continue with app-update.yml based configuration.
        }
      }
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = false;

      autoUpdater.on('checking-for-update', () => {
        this.setState({ stage: 'checking', lastCheckedAt: new Date().toISOString() });
      });

      autoUpdater.on('update-available', (info) => {
        this.pendingArtifact = this.toArtifactMeta(
          info as { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> },
        );
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
          progressTransferredBytes: progress.transferred,
          progressTotalBytes: progress.total,
          progressBytesPerSecond: progress.bytesPerSecond,
        });
      });

      autoUpdater.on('update-downloaded', (info) => {
        const localArtifact = this.resolveDownloadedArtifactPath(
          this.pendingArtifact?.artifactName,
          info as { downloadedFile?: string },
        );
        if (this.pendingArtifact && localArtifact) {
          this.peerService?.announceLocalArtifacts([
            {
              ...this.pendingArtifact,
              filePath: localArtifact,
              freshnessTs: nowIso(),
            },
          ]);
        }
        this.setState({
          stage: 'downloaded',
          latestVersion: this.toDisplayVersion(info.version),
          progressPercent: 100,
          progressTransferredBytes: this.state.progressTotalBytes ?? this.state.progressTransferredBytes,
          source: 'electron-updater',
          inAppDownloadSupported: true,
          inAppDownloadReason: 'Update wurde in der App heruntergeladen. Neustart wird ausgeführt.',
        });
        // Vorgabe: Nach abgeschlossenem Download ohne zusätzliche Rückfrage neu starten.
        setTimeout(() => {
          autoUpdater.quitAndInstall();
        }, 1800);
      });

      this.autoUpdaterEnabled = true;
      this.autoUpdaterInitError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.autoUpdaterEnabled = false;
      this.autoUpdaterInitError = message;
      this.setState({
        stage: 'idle',
        message: `Auto-Updater deaktiviert: ${message}`,
      });
    }
  }

  /**
   * Handles Is Auto Updater Configured.
   */
  private isAutoUpdaterConfigured(): boolean {
    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!existsSync(updateConfigPath)) {
      return false;
    }

    return true;
  }

  /**
   * Handles Check Git Hub Release Version.
   */
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

  /**
   * Handles Try Peer First Download.
   */
  private async tryPeerFirstDownload(): Promise<boolean> {
    if (!this.peerService || !this.pendingArtifact) {
      return false;
    }
    this.setState({
      stage: 'downloading',
      peerModeStage: 'discovering',
      downloadSource: 'peer-lan',
      message: 'Suche Update-Peer im lokalen Netzwerk ...',
    });
    const requestId = crypto.randomUUID();
    const offers = await this.peerService.queryPeersForVersion({
      requestId,
      versionWanted: this.pendingArtifact.version,
      platform: this.pendingArtifact.platform,
      arch: this.pendingArtifact.arch,
      channel: this.pendingArtifact.channel,
    });
    if (offers.length === 0) {
      return false;
    }
    const sorted = selectBestOffers(offers);
    const maxTries = Math.min(2, sorted.length);
    for (let idx = 0; idx < maxTries; idx += 1) {
      const offer = sorted[idx]!;
      try {
        this.lastPeerOffer = offer;
        this.setState({
          stage: 'downloading',
          peerModeStage: 'downloading',
          downloadSource: 'peer-lan',
          peerHost: offer.host,
          message: `Quelle: LAN-Peer ${offer.host}`,
        });
        const targetPath = path.join(this.updateCacheDir, this.pendingArtifact.artifactName);
        await this.peerService.downloadFromPeer(
          offer,
          targetPath,
          this.pendingArtifact.sha512,
          (transferred, total) => {
            const percent = total > 0 ? (transferred / total) * 100 : 0;
            this.setState({
              stage: 'downloading',
              peerModeStage: 'downloading',
              downloadSource: 'peer-lan',
              peerHost: offer.host,
              progressTransferredBytes: transferred,
              progressTotalBytes: total,
              progressPercent: percent,
            });
          },
        );
        this.setState({
          stage: 'downloading',
          peerModeStage: 'verifying',
          downloadSource: 'peer-lan',
          peerHost: offer.host,
          message: 'Peer-Download abgeschlossen, starte verifizierte Installation ...',
        });
        const artifact: PeerArtifact = {
          ...this.pendingArtifact,
          filePath: targetPath,
          freshnessTs: nowIso(),
        };
        this.peerService.announceLocalArtifacts([artifact]);
        await this.downloadViaLocalFeed(artifact);
        return true;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        debugSync('peer-download', 'candidate-failed', { offer, reason });
      }
    }
    return false;
  }

  /**
   * Handles Download Via Local Feed.
   */
  private async downloadViaLocalFeed(artifact: PeerArtifact): Promise<void> {
    if (!this.peerService) {
      throw new Error('Peer-Service nicht verfügbar');
    }
    const localFeed = await this.peerService.createLocalFeedServer({
      platform: artifact.platform,
      version: artifact.version,
      artifactName: artifact.artifactName,
      sha512: artifact.sha512,
      size: artifact.size,
      filePath: artifact.filePath,
    });
    const maybeSetFeedUrl = (autoUpdater as unknown as {
      setFeedURL?: (options: { provider: 'generic'; url: string }) => void;
    }).setFeedURL;
    try {
      if (typeof maybeSetFeedUrl === 'function') {
        maybeSetFeedUrl({ provider: 'generic', url: localFeed.feedUrl });
      }
      await autoUpdater.checkForUpdates();
      await autoUpdater.downloadUpdate();
    } finally {
      await localFeed.close();
      if (typeof maybeSetFeedUrl === 'function') {
        maybeSetFeedUrl({ provider: 'generic', url: GENERIC_FEED_URL });
      }
    }
  }

  private toArtifactMeta(
    info?: { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> },
  ): UpdateArtifactMeta | null {
    const version = info?.version ? this.normalizeVersion(info.version) : '';
    const file = info?.files?.[0];
    const fileUrl = file?.url ?? '';
    const artifactName = fileUrl ? path.basename(fileUrl.split('?')[0] || '') : '';
    const sha512 = file?.sha512 ?? '';
    if (!version || !artifactName || !sha512) {
      return null;
    }
    return {
      version,
      platform: process.platform,
      arch: process.arch,
      channel: 'latest',
      artifactName,
      sha512,
      size: Number(file?.size ?? 0),
    };
  }

  private resolveDownloadedArtifactPath(
    artifactName: string | undefined,
    info?: { downloadedFile?: string },
  ): string | null {
    const direct = info?.downloadedFile;
    if (direct && existsSync(direct)) {
      return direct;
    }
    if (!artifactName) {
      return null;
    }
    const candidates = [
      path.join(this.updateCacheDir, artifactName),
      path.join(app.getPath('userData'), 'pending', artifactName),
      path.join(os.tmpdir(), artifactName),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  /**
   * Handles Normalize Version.
   */
  private normalizeVersion(version: string): string {
    return version.trim().replace(/^v/i, '');
  }

  /**
   * Handles Is Semver Version.
   */
  private isSemverVersion(version: string): boolean {
    return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version.trim());
  }

  /**
   * Handles Is Version Format Error.
   */
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

  /**
   * Handles Is Build Version.
   */
  private isBuildVersion(version: string): boolean {
    return /^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(version.trim());
  }

  /**
   * Handles Is No Published Versions Error.
   */
  private isNoPublishedVersionsError(message: string): boolean {
    return message.toLowerCase().includes('no published versions on github');
  }

  /**
   * Handles Compare Versions.
   */
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

  /**
   * Handles Compare Semver.
   */
  private compareSemver(current: string, latest: string): number {
    /**
     * Handles To Parts.
     */
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

  /**
   * Handles Compare Build Versions.
   */
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

  /**
   * Handles Parse Build Version Date.
   */
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

  /**
   * Handles Parse Semver Date.
   */
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

  /**
   * Handles Resolve Display Version.
   */
  private resolveDisplayVersion(): string {
    const envVersion = process.env.S1_APP_VERSION?.trim();
    if (envVersion) {
      return envVersion;
    }
    return this.toDisplayVersion(app.getVersion());
  }

  /**
   * Handles To Display Version.
   */
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

  /**
   * Handles Is Offline Like Error.
   */
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

  /**
   * Handles Set State.
   */
  private setState(next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>): void {
    this.state = {
      ...this.state,
      ...next,
      currentVersion: this.resolveDisplayVersion(),
    };
    this.notify(this.state);
  }
}
