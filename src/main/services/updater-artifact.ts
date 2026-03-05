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
  const normalizedVersion = resolveNormalizedVersion(info?.version);
  const firstFile = resolveFirstFile(info);
  const artifactName = toArtifactName(firstFile?.url);
  const sha512 = firstFile?.sha512 ?? '';
  if (!hasRequiredArtifactFields(normalizedVersion, artifactName, sha512)) {
    return null;
  }
  return {
    version: normalizedVersion,
    platform: process.platform,
    arch: process.arch,
    channel: 'latest',
    artifactName,
    sha512,
    size: Number(firstFile?.size ?? 0),
  };
}

/**
 * Normalizes release version if provided.
 */
function resolveNormalizedVersion(version: string | undefined): string {
  return version ? normalizeVersion(version) : '';
}

/**
 * Returns the first updater artifact file entry.
 */
function resolveFirstFile(
  info: { files?: Array<{ url?: string; sha512?: string; size?: number }> } | undefined,
): { url?: string; sha512?: string; size?: number } | undefined {
  return info?.files?.[0];
}

/**
 * Converts update file url to artifact name.
 */
function toArtifactName(fileUrl: string | undefined): string {
  if (!fileUrl) {
    return '';
  }
  return path.basename(fileUrl.split('?')[0] || '');
}

/**
 * Validates required artifact metadata fields.
 */
function hasRequiredArtifactFields(version: string, artifactName: string, sha512: string): boolean {
  return Boolean(version && artifactName && sha512);
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

/**
 * Represents validated update artifact metadata.
 */
export type UpdateArtifactMeta = NonNullable<ReturnType<typeof toArtifactMeta>>;
