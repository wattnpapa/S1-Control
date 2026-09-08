import { app } from 'electron';

/**
 * Converts a date into build-version format.
 */
function toBuildVersion(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  return `${year}.${month}.${day}.${hour}.${minute}`;
}

/**
 * Converts semver-like timestamp format to build-version.
 */
function fromSemverToBuildVersion(value: string): string | null {
  const match = /^(\d{4})\.(\d{1,2})\.(\d{1,2})-(\d{1,2})\.(\d{1,2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match;
  return `${year}.${month.padStart(2, '0')}.${day.padStart(2, '0')}.${hour.padStart(2, '0')}.${minute.padStart(2, '0')}`;
}

/**
 * Resolves user-facing application version label.
 */
export function resolveAppVersionLabel(): string {
  const envVersion = process.env.S1_APP_VERSION;
  if (envVersion) {
    return envVersion;
  }
  const semverVersion = process.env.S1_APP_SEMVER || app.getVersion();
  const mapped = fromSemverToBuildVersion(semverVersion);
  if (mapped) {
    return mapped;
  }
  if (semverVersion && semverVersion !== '0.1.0') {
    return semverVersion;
  }
  return toBuildVersion(new Date());
}

/**
 * Prefixes an error payload with current app version.
 */
export function withVersion(details: string): string {
  return `Version: ${resolveAppVersionLabel()}\n\n${details}`;
}

/**
 * Applies runtime metadata for app/about panel.
 */
export function setupVersionMetadata(): string {
  const envSemver = process.env.S1_APP_SEMVER;
  if (envSemver) {
    app.setVersion(envSemver);
  }
  const versionLabel = resolveAppVersionLabel();
  app.setAboutPanelOptions({
    applicationName: 'S1-Control',
    applicationVersion: versionLabel,
    version: versionLabel,
    copyright: `Copyright © ${new Date().getFullYear()} Johannes Rudolph`,
  });
  return versionLabel;
}
