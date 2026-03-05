/**
 * Normalizes release versions by trimming and removing leading v.
 */
export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, '');
}

/**
 * Checks whether version matches semver format.
 */
export function isSemverVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(version.trim());
}

/**
 * Checks whether version matches build version format.
 */
export function isBuildVersion(version: string): boolean {
  return /^\d{4}\.\d{2}\.\d{2}\.\d{2}\.\d{2}$/.test(version.trim());
}

/**
 * Checks whether updater error indicates version-format issues.
 */
export function isVersionFormatError(message: string): boolean {
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
 * Checks whether updater error indicates missing published releases.
 */
export function isNoPublishedVersionsError(message: string): boolean {
  return message.toLowerCase().includes('no published versions on github');
}

/**
 * Parses build-version date to UTC timestamp.
 */
export function parseBuildVersionDate(version: string): number | null {
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
 * Parses semver-like date build to UTC timestamp.
 */
export function parseSemverDate(version: string): number | null {
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
 * Compares semantic versions using major/minor/patch.
 */
export function compareSemver(current: string, latest: string): number {
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
 * Compares build versions based on parsed UTC timestamp.
 */
export function compareBuildVersions(current: string, latest: string): number | null {
  const currentDate = parseBuildVersionDate(current);
  const latestDate = parseBuildVersionDate(latest);
  if (!currentDate || !latestDate) {
    return null;
  }
  if (currentDate < latestDate) return -1;
  if (currentDate > latestDate) return 1;
  return 0;
}

/**
 * Compares supported current/latest versions.
 */
export function compareVersions(current: string, latest: string): number | null {
  const compareStrategies = [
    tryCompareSemver,
    tryCompareBuildVersion,
    tryCompareSemverToBuildVersion,
  ];
  for (const strategy of compareStrategies) {
    const compared = strategy(current, latest);
    if (compared !== null) {
      return compared;
    }
  }
  return null;
}

/**
 * Attempts semver comparison.
 */
function tryCompareSemver(current: string, latest: string): number | null {
  if (!isSemverVersion(current) || !isSemverVersion(latest)) {
    return null;
  }
  return compareSemver(current, latest);
}

/**
 * Attempts build-version comparison.
 */
function tryCompareBuildVersion(current: string, latest: string): number | null {
  if (!isBuildVersion(current) || !isBuildVersion(latest)) {
    return null;
  }
  return compareBuildVersions(current, latest);
}

/**
 * Attempts semver->build date comparison.
 */
function tryCompareSemverToBuildVersion(current: string, latest: string): number | null {
  if (!isSemverVersion(current) || !isBuildVersion(latest)) {
    return null;
  }
  const currentDate = parseSemverDate(current);
  const latestDate = parseBuildVersionDate(latest);
  if (currentDate === null || latestDate === null) {
    return null;
  }
  if (currentDate < latestDate) return -1;
  if (currentDate > latestDate) return 1;
  return 0;
}

/**
 * Converts internal version to display representation.
 */
export function toDisplayVersion(version: string): string {
  const normalized = normalizeVersion(version);
  const parsed = parseSemverDate(normalized);
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
