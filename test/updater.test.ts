import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  let appVersion = '2026.2.25-16.38';
  const appMock = {
    getVersion: vi.fn(() => appVersion),
  };
  const existsSyncMock = vi.fn(() => false);
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const autoUpdaterMock = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn(async () => ({ updateInfo: { version: '0.0.0' } })),
    downloadUpdate: vi.fn(async () => undefined),
    quitAndInstall: vi.fn(() => undefined),
    on: (event: string, callback: (...args: unknown[]) => void) => {
      const list = listeners.get(event) ?? [];
      list.push(callback);
      listeners.set(event, list);
      return autoUpdaterMock;
    },
    emit: (event: string, ...args: unknown[]) => {
      const list = listeners.get(event) ?? [];
      for (const callback of list) {
        callback(...args);
      }
    },
    removeAllListeners: () => listeners.clear(),
  };
  return {
    getAppVersion: () => appVersion,
    setAppVersion: (value: string) => {
      appVersion = value;
    },
    appMock,
    existsSyncMock,
    autoUpdaterMock,
  };
});

vi.mock('electron', () => ({
  app: hoisted.appMock,
}));

vi.mock('electron-updater', () => ({
  autoUpdater: hoisted.autoUpdaterMock,
}));

vi.mock('node:fs', () => ({
  existsSync: hoisted.existsSyncMock,
}));

import { UpdaterService } from '../src/main/services/updater';

describe('updater service', () => {
  beforeEach(() => {
    (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath = '/tmp';
    hoisted.setAppVersion('2026.2.25-16.38');
    hoisted.appMock.getVersion.mockImplementation(() => hoisted.getAppVersion());
    hoisted.existsSyncMock.mockReset();
    hoisted.existsSyncMock.mockReturnValue(false);
    hoisted.autoUpdaterMock.removeAllListeners();
    hoisted.autoUpdaterMock.autoDownload = true;
    hoisted.autoUpdaterMock.autoInstallOnAppQuit = true;
    hoisted.autoUpdaterMock.checkForUpdates.mockReset();
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '0.0.0' } });
    hoisted.autoUpdaterMock.downloadUpdate.mockReset();
    hoisted.autoUpdaterMock.downloadUpdate.mockResolvedValue(undefined);
    hoisted.autoUpdaterMock.quitAndInstall.mockReset();
    vi.unstubAllGlobals();
  });

  it('initializes and updates state from updater events', () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    const service = new UpdaterService((state) => states.push(state));

    expect(service.getState().currentVersion).toBe('2026.02.25.16.38');
    expect(hoisted.autoUpdaterMock.autoDownload).toBe(false);
    expect(hoisted.autoUpdaterMock.autoInstallOnAppQuit).toBe(false);

    hoisted.autoUpdaterMock.emit('update-not-available');
    hoisted.autoUpdaterMock.emit('update-available', { version: '2026.2.25-16.40' });
    hoisted.autoUpdaterMock.emit('download-progress', { percent: 42 });
    hoisted.autoUpdaterMock.emit('update-downloaded', { version: '2026.2.25-16.40' });

    expect(states.at(-1)).toMatchObject({
      stage: 'downloaded',
      latestVersion: '2026.02.25.16.40',
      progressPercent: 100,
      currentVersion: '2026.02.25.16.38',
    });
  });

  it('falls back to GitHub check and reports available only when remote is newer', async () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    const service = new UpdaterService((state) => states.push(state));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: '2026.02.25.16.40' }),
      })),
    );

    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({
      stage: 'available',
      latestVersion: '2026.02.25.16.40',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: '2026.02.25.16.26' }),
      })),
    );

    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({
      stage: 'not-available',
      latestVersion: '2026.02.25.16.26',
    });
  });

  it('handles compare mismatches and offline/network errors in GitHub fallback', async () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    const service = new UpdaterService((state) => states.push(state));

    hoisted.setAppVersion('v-next');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: '2026.02.25.16.26' }),
      })),
    );
    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({
      stage: 'not-available',
      message: 'Versionsvergleich nicht eindeutig möglich.',
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('net::ERR_INTERNET_DISCONNECTED');
      }),
    );
    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({ stage: 'idle' });

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 500,
      })),
    );
    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({
      stage: 'error',
      message: 'GitHub Update-Check fehlgeschlagen (500)',
    });
  });

  it('uses electron-updater path when config exists and version is semver', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '1.2.4' } });
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(hoisted.autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(service.getState()).toMatchObject({ latestVersion: '1.2.4' });
  });

  it('supports download/install only when auto-updater is configured', async () => {
    const service = new UpdaterService(() => undefined);

    await service.downloadUpdate();
    expect(hoisted.autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
    expect(service.getState().stage).toBe('unsupported');

    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '1.2.4' } });
    await service.checkForUpdates();
    await service.downloadUpdate();
    expect(hoisted.autoUpdaterMock.downloadUpdate).toHaveBeenCalledTimes(1);

    service.installDownloadedUpdate();
    expect(hoisted.autoUpdaterMock.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('maps updater error events to idle (offline) and error (other)', () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    new UpdaterService((state) => states.push(state));

    hoisted.autoUpdaterMock.emit('error', { message: 'ENOTFOUND github.com' });
    expect(states.at(-1)).toMatchObject({ stage: 'idle' });

    hoisted.autoUpdaterMock.emit('error', { message: 'kaputt' });
    expect(states.at(-1)).toMatchObject({ stage: 'error', message: 'kaputt' });
  });

  it('handles updater check errors from electron-updater path', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockRejectedValue(new Error('boom'));
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({ stage: 'error', message: 'boom' });
  });

  it('uses github fallback with clear reason when app-update.yml is missing', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(false);
    const service = new UpdaterService(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: '1.2.4' }),
      })),
    );

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({
      stage: 'available',
      source: 'github-release',
      inAppDownloadSupported: false,
    });
    expect(service.getState().inAppDownloadReason).toContain('app-update.yml');
  });

  it('falls back to github when updater returns invalid version format', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockRejectedValue(new Error('invalid version'));
    const service = new UpdaterService(() => undefined);

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ tag_name: '1.2.4' }),
      })),
    );

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({
      stage: 'available',
      source: 'github-release',
      inAppDownloadSupported: false,
    });
  });

  it('marks not-available when github response has no release version', async () => {
    hoisted.existsSyncMock.mockReturnValue(false);
    const service = new UpdaterService(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({}),
      })),
    );

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({
      stage: 'not-available',
      source: 'github-release',
      inAppDownloadSupported: false,
    });
  });

  it('marks idle on offline updater-check error in electron-updater path', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockRejectedValue(new Error('net::ERR_INTERNET_DISCONNECTED'));
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({ stage: 'idle' });
  });

  it('does not install when auto-updater is not configured', () => {
    const service = new UpdaterService(() => undefined);
    service.installDownloadedUpdate();
    expect(hoisted.autoUpdaterMock.quitAndInstall).not.toHaveBeenCalled();
  });

  it('sets unsupported state on download when updater was not checked', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    const service = new UpdaterService(() => undefined);

    await service.downloadUpdate();
    expect(service.getState()).toMatchObject({ stage: 'unsupported' });
    expect(hoisted.autoUpdaterMock.downloadUpdate).not.toHaveBeenCalled();
  });

  it('covers internal version helpers for semver/build/date comparison', () => {
    const service = new UpdaterService(() => undefined) as never as {
      normalizeVersion: (v: string) => string;
      isSemverVersion: (v: string) => boolean;
      isBuildVersion: (v: string) => boolean;
      compareVersions: (a: string, b: string) => number | null;
      compareSemver: (a: string, b: string) => number;
      compareBuildVersions: (a: string, b: string) => number | null;
      parseBuildVersionDate: (v: string) => number | null;
      parseSemverDate: (v: string) => number | null;
      toDisplayVersion: (v: string) => string;
      isVersionFormatError: (v: string) => boolean;
      isOfflineLikeError: (v: string) => boolean;
    };

    expect(service.normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(service.isSemverVersion('1.2.3')).toBe(true);
    expect(service.isSemverVersion('2026.02.25.16.40')).toBe(false);
    expect(service.isBuildVersion('2026.02.25.16.40')).toBe(true);
    expect(service.isBuildVersion('2026.2.25.16.40')).toBe(false);

    expect(service.compareSemver('1.2.3', '1.2.4')).toBe(-1);
    expect(service.compareSemver('1.2.4', '1.2.3')).toBe(1);
    expect(service.compareSemver('1.2.3', '1.2.3')).toBe(0);

    expect(service.compareBuildVersions('2026.02.25.16.38', '2026.02.25.16.40')).toBe(-1);
    expect(service.compareBuildVersions('2026.02.25.16.40', '2026.02.25.16.38')).toBe(1);
    expect(service.compareBuildVersions('2026.02.25.16.40', '2026.02.25.16.40')).toBe(0);
    expect(service.compareBuildVersions('x', '2026.02.25.16.40')).toBeNull();

    expect(service.compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(service.compareVersions('2026.02.25.16.38', '2026.02.25.16.40')).toBe(-1);
    expect(service.compareVersions('2026.2.25-16.38', '2026.02.25.16.40')).toBe(-1);
    expect(service.compareVersions('weird', '2026.02.25.16.40')).toBeNull();

    expect(service.parseBuildVersionDate('2026.02.25.16.40')).not.toBeNull();
    expect(service.parseBuildVersionDate('2026.13.25.16.40')).toBeNull();
    expect(service.parseBuildVersionDate('nope')).toBeNull();
    expect(service.parseSemverDate('2026.2.25-16.38')).not.toBeNull();
    expect(service.parseSemverDate('1.2.3')).toBeNull();

    expect(service.toDisplayVersion('2026.2.25-16.38')).toBe('2026.02.25.16.38');
    expect(service.toDisplayVersion('v1.2.3')).toBe('1.2.3');

    expect(service.isVersionFormatError('invalid version')).toBe(true);
    expect(service.isVersionFormatError('ok')).toBe(false);
    expect(service.isOfflineLikeError('ENOTFOUND github.com')).toBe(true);
    expect(service.isOfflineLikeError('some unknown failure')).toBe(false);
  });
});
