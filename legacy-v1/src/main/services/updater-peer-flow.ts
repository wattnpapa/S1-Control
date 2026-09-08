import path from 'node:path';
import crypto from 'node:crypto';
import { autoUpdater } from 'electron-updater';
import type { PeerArtifact, UpdaterState } from '../../shared/types';
import type { UpdatePeerService } from './update-peer';
import { selectBestOffers } from './update-peer';
import type { UpdateArtifactMeta } from './updater-artifact';
import { debugSync } from './debug';

/**
 * Tries LAN peer download first and switches to local feed install.
 */
export async function tryPeerFirstDownload(params: {
  peerService: UpdatePeerService;
  pendingArtifact: UpdateArtifactMeta;
  updateCacheDir: string;
  genericFeedUrl: string;
  setState: (next: Partial<UpdaterState> & Pick<UpdaterState, 'stage'> | Partial<UpdaterState>) => void;
  nowIso: () => string;
}): Promise<boolean> {
  params.setState({
    stage: 'downloading',
    peerModeStage: 'discovering',
    downloadSource: 'peer-lan',
    message: 'Suche Update-Peer im lokalen Netzwerk ...',
  });

  const offers = await params.peerService.queryPeersForVersion({
    requestId: crypto.randomUUID(),
    versionWanted: params.pendingArtifact.version,
    platform: params.pendingArtifact.platform,
    arch: params.pendingArtifact.arch,
    channel: params.pendingArtifact.channel,
  });
  if (offers.length === 0) {
    return false;
  }

  const sorted = selectBestOffers(offers);
  const maxTries = Math.min(2, sorted.length);
  for (let idx = 0; idx < maxTries; idx += 1) {
    const offer = sorted[idx]!;
    try {
      params.setState({
        stage: 'downloading',
        peerModeStage: 'downloading',
        downloadSource: 'peer-lan',
        peerHost: offer.host,
        message: `Quelle: LAN-Peer ${offer.host}`,
      });
      const targetPath = path.join(params.updateCacheDir, params.pendingArtifact.artifactName);
      await params.peerService.downloadFromPeer(
        offer,
        targetPath,
        params.pendingArtifact.sha512,
        (transferred, total) => {
          const percent = total > 0 ? (transferred / total) * 100 : 0;
          params.setState({
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
      params.setState({
        stage: 'downloading',
        peerModeStage: 'verifying',
        downloadSource: 'peer-lan',
        peerHost: offer.host,
        message: 'Peer-Download abgeschlossen, starte verifizierte Installation ...',
      });
      const artifact: PeerArtifact = {
        ...params.pendingArtifact,
        filePath: targetPath,
        freshnessTs: params.nowIso(),
      };
      params.peerService.announceLocalArtifacts([artifact]);
      await downloadViaLocalFeed(params.peerService, artifact, params.genericFeedUrl);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      debugSync('peer-download', 'candidate-failed', { offer, reason });
    }
  }
  return false;
}

/**
 * Uses local generic feed endpoint to perform signed updater install.
 */
async function downloadViaLocalFeed(
  peerService: UpdatePeerService,
  artifact: PeerArtifact,
  genericFeedUrl: string,
): Promise<void> {
  const localFeed = await peerService.createLocalFeedServer({
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
      maybeSetFeedUrl({ provider: 'generic', url: genericFeedUrl });
    }
  }
}
