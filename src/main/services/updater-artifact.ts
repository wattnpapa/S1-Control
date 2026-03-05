import os from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';
import type { UpdateArtifactMeta } from '../../shared/types';
import { normalizeVersion } from './updater-versioning';

/**
 * Builds artifact metadata from updater info payload.
 */
export function toArtifactMeta(
  info: { version?: string; files?: Array<{ url?: string; sha512?: string; size?: number }> } | undefined,
): UpdateArtifactMeta | null {
  const version = info?.version ? normalizeVersion(info.version) : '';
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

/**
 * Resolves downloaded artifact path from known cache locations.
 */
export function resolveDownloadedArtifactPath(
  artifactName: string | undefined,
  downloadedFile: string | undefined,
  updateCacheDir: string,
  userDataDir: string,
): string | null {
  if (downloadedFile && existsSync(downloadedFile)) {
    return downloadedFile;
  }
  if (!artifactName) {
    return null;
  }
  const candidates = [
    path.join(updateCacheDir, artifactName),
    path.join(userDataDir, 'pending', artifactName),
    path.join(os.tmpdir(), artifactName),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}
