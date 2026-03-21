import { beforeEach, describe, expect, it, vi } from 'vitest';
import https from 'node:https';
import type { EventEmitter } from 'node:events';

const hoisted = vi.hoisted(() => {
  let appVersion = '2026.2.25-16.38';
  const appMock = {
    getVersion: vi.fn(() => appVersion),
    getPath: vi.fn((name: string) => (name === 'userData' ? '/tmp/s1-test-userdata' : '/tmp')),
  };
  const existsSyncMock = vi.fn(() => false);
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const autoUpdaterMock = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    channel: '',
    allowPrerelease: true,
    setFeedURL: vi.fn(() => undefined),
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

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: hoisted.existsSyncMock,
  };
});

import { UpdaterService } from '../src/main/services/updater';
import {
  compareBuildVersions,
  compareSemver,
  compareVersions,
  isBuildVersion,
  isSemverVersion,
  isVersionFormatError,
  normalizeVersion,
  parseBuildVersionDate,
  parseSemverDate,
  toDisplayVersion,
} from '../src/main/services/updater-versioning';
import { isOfflineLikeError } from '../src/main/services/updater-network-errors';

function setupUpdaterDefaults(): void {
  beforeEach(() => {
    (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath = '/tmp';
    hoisted.setAppVersion('2026.2.25-16.38');
    hoisted.appMock.getVersion.mockImplementation(() => hoisted.getAppVersion());
    hoisted.existsSyncMock.mockReset();
    hoisted.existsSyncMock.mockReturnValue(false);
    hoisted.autoUpdaterMock.removeAllListeners();
    hoisted.autoUpdaterMock.autoDownload = true;
    hoisted.autoUpdaterMock.autoInstallOnAppQuit = true;
    hoisted.autoUpdaterMock.channel = '';
    hoisted.autoUpdaterMock.allowPrerelease = true;
    hoisted.autoUpdaterMock.checkForUpdates.mockReset();
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '0.0.0' } });
    hoisted.autoUpdaterMock.setFeedURL.mockReset();
    hoisted.autoUpdaterMock.downloadUpdate.mockReset();
    hoisted.autoUpdaterMock.downloadUpdate.mockResolvedValue(undefined);
    hoisted.autoUpdaterMock.quitAndInstall.mockReset();
    delete process.env.S1_UPDATER_IN_APP_TIMEOUT_MS;
    delete process.env.S1_UPDATER_CHECKING_TIMEOUT_MS;
    delete process.env.S1_UPDATER_GITHUB_TIMEOUT_MS;
    vi.unstubAllGlobals();
  });
}

describe('updater service - init and checks', () => {
  setupUpdaterDefaults();

  it('initializes and updates state from updater events', () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    const service = new UpdaterService((state) => states.push(state));

    expect(service.getState().currentVersion).toBe('2026.02.25.16.38');
    expect(hoisted.autoUpdaterMock.autoDownload).toBe(false);
    expect(hoisted.autoUpdaterMock.autoInstallOnAppQuit).toBe(false);
    expect(hoisted.autoUpdaterMock.channel).toBe('latest');
    expect(hoisted.autoUpdaterMock.allowPrerelease).toBe(false);

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
});

describe('updater service - github fallback checks', () => {
  setupUpdaterDefaults();
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

    const httpsRequestSpy = vi.spyOn(https, 'request').mockImplementation(
      ((_url, _options, _callback) => {
        const req = {
          setTimeout: vi.fn(),
          on: vi.fn((event: string, handler: (error: Error) => void) => {
            if (event === 'error') {
              queueMicrotask(() => handler(new Error('ENOTFOUND')));
            }
            return req as unknown as EventEmitter;
          }),
          end: vi.fn(),
          destroy: vi.fn(),
        };
        return req as unknown as ReturnType<typeof https.request>;
      }) as typeof https.request,
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('net::ERR_INTERNET_DISCONNECTED');
      }),
    );
    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({ stage: 'idle' });
    httpsRequestSpy.mockRestore();

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
      message:
        'GitHub-Check fehlgeschlagen. API: GitHub Update-Check fehlgeschlagen (500) | Releases: GitHub Releases-Seite nicht erreichbar (500)',
    });
  });

  it('falls back to releases page when GitHub API is unavailable', async () => {
    const states: Array<ReturnType<UpdaterService['getState']>> = [];
    const service = new UpdaterService((state) => states.push(state));
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          url: 'https://api.github.com/repos/wattnpapa/S1-Control/releases/latest',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          url: 'https://github.com/wattnpapa/S1-Control/releases/tag/2026.02.25.16.40',
        }),
    );

    await service.checkForUpdates();
    expect(states.at(-1)).toMatchObject({
      stage: 'available',
      latestVersion: '2026.02.25.16.40',
    });
  });
});

describe('updater service - auto updater interaction', () => {
  setupUpdaterDefaults();
  it('uses electron-updater path when config exists and version is semver', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '1.2.4' } });
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(hoisted.autoUpdaterMock.checkForUpdates).toHaveBeenCalledTimes(1);
    expect(service.getState()).toMatchObject({ latestVersion: '1.2.4' });
  });

  it('does not keep checking stage when updater returns without follow-up events', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockResolvedValue({ updateInfo: { version: '1.2.3' } });
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(service.getState().stage).toBe('not-available');
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

  it('stores server version when updater reports not-available', () => {
    const service = new UpdaterService(() => undefined);
    hoisted.autoUpdaterMock.emit('update-not-available', { version: '1.2.3' });
    expect(service.getState()).toMatchObject({
      stage: 'not-available',
      latestVersion: '1.2.3',
    });
  });

  it('handles updater check errors from electron-updater path', async () => {
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockRejectedValue(new Error('boom'));
    const service = new UpdaterService(() => undefined);

    await service.checkForUpdates();
    expect(service.getState()).toMatchObject({ stage: 'error', message: 'boom' });
  });

  it('times out hanging in-app update checks', async () => {
    vi.useFakeTimers();
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockReturnValue(new Promise(() => undefined));
    const service = new UpdaterService(() => undefined);

    const run = service.checkForUpdates();
    await vi.advanceTimersByTimeAsync(12_100);
    await run;

    expect(service.getState()).toMatchObject({
      stage: 'error',
      message: 'In-App Update-Check Zeitüberschreitung (URL: https://github.com/wattnpapa/S1-Control/releases/latest/download).',
    });
    vi.useRealTimers();
  });

  it('supports configurable in-app timeout for deterministic tests', async () => {
    vi.useFakeTimers();
    process.env.S1_UPDATER_IN_APP_TIMEOUT_MS = '25';
    hoisted.setAppVersion('1.2.3');
    hoisted.existsSyncMock.mockReturnValue(true);
    hoisted.autoUpdaterMock.checkForUpdates.mockReturnValue(new Promise(() => undefined));
    const service = new UpdaterService(() => undefined);

    const run = service.checkForUpdates();
    await vi.advanceTimersByTimeAsync(30);
    await run;

    expect(service.getState()).toMatchObject({
      stage: 'error',
      message: 'In-App Update-Check Zeitüberschreitung (URL: https://github.com/wattnpapa/S1-Control/releases/latest/download).',
    });
    vi.useRealTimers();
  });
});

describe('updater service - fallback and install', () => {
  setupUpdaterDefaults();
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

  it('times out hanging github fallback checks', async () => {
    vi.useFakeTimers();
    hoisted.existsSyncMock.mockReturnValue(false);
    const service = new UpdaterService(() => undefined);
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const run = service.checkForUpdates();
    await vi.advanceTimersByTimeAsync(12_100);
    await run;

    expect(service.getState()).toMatchObject({
      stage: 'error',
      message:
        'Update-Check Zeitüberschreitung (GitHub API: https://api.github.com/repos/wattnpapa/S1-Control/releases/latest; GitHub Releases: https://github.com/wattnpapa/S1-Control/releases/latest).',
    });
    vi.useRealTimers();
  });

  it('supports configurable github timeout for deterministic tests', async () => {
    vi.useFakeTimers();
    process.env.S1_UPDATER_IN_APP_TIMEOUT_MS = '40';
    process.env.S1_UPDATER_GITHUB_TIMEOUT_MS = '40';
    hoisted.existsSyncMock.mockReturnValue(false);
    const service = new UpdaterService(() => undefined);
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const run = service.checkForUpdates();
    await vi.advanceTimersByTimeAsync(60);
    await run;

    expect(service.getState()).toMatchObject({
      stage: 'error',
      message:
        'Update-Check Zeitüberschreitung (GitHub API: https://api.github.com/repos/wattnpapa/S1-Control/releases/latest; GitHub Releases: https://github.com/wattnpapa/S1-Control/releases/latest).',
    });
    vi.useRealTimers();
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
});

describe('updater service - runtime fallback paths', () => {
  setupUpdaterDefaults();
  it('uses environment display version when provided', () => {
    process.env.S1_APP_VERSION = '2026.02.26.23.59';
    const service = new UpdaterService(() => undefined);
    expect(service.getState().currentVersion).toBe('2026.02.26.23.59');
    delete process.env.S1_APP_VERSION;
  });

  it('falls back when electron-updater API is unavailable', async () => {
    hoisted.setAppVersion('1.2.3');
    const originalCheck = hoisted.autoUpdaterMock.checkForUpdates;
    // simulate broken runtime where API is missing
    (hoisted.autoUpdaterMock as unknown as { checkForUpdates?: unknown }).checkForUpdates = undefined;

    try {
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
    } finally {
      (hoisted.autoUpdaterMock as unknown as { checkForUpdates?: unknown }).checkForUpdates = originalCheck;
    }
  });

  it('handles auto-updater init exceptions', () => {
    const originalOn = hoisted.autoUpdaterMock.on;
    try {
      hoisted.autoUpdaterMock.on = vi.fn(() => {
        throw new Error('listener registration failed');
      }) as never;

      const states: Array<ReturnType<UpdaterService['getState']>> = [];
      new UpdaterService((state) => states.push(state));
      expect(states.at(-1)).toMatchObject({
        stage: 'idle',
        message: 'Auto-Updater deaktiviert: listener registration failed',
      });
    } finally {
      hoisted.autoUpdaterMock.on = originalOn;
    }
  });
});

describe('updater service - internal helpers', () => {
  setupUpdaterDefaults();
  it('covers internal version helpers for semver/build/date comparison', () => {
    expect(normalizeVersion('v1.2.3')).toBe('1.2.3');
    expect(isSemverVersion('1.2.3')).toBe(true);
    expect(isSemverVersion('2026.02.25.16.40')).toBe(false);
    expect(isBuildVersion('2026.02.25.16.40')).toBe(true);
    expect(isBuildVersion('2026.2.25.16.40')).toBe(false);

    expect(compareSemver('1.2.3', '1.2.4')).toBe(-1);
    expect(compareSemver('1.2.4', '1.2.3')).toBe(1);
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);

    expect(compareBuildVersions('2026.02.25.16.38', '2026.02.25.16.40')).toBe(-1);
    expect(compareBuildVersions('2026.02.25.16.40', '2026.02.25.16.38')).toBe(1);
    expect(compareBuildVersions('2026.02.25.16.40', '2026.02.25.16.40')).toBe(0);
    expect(compareBuildVersions('x', '2026.02.25.16.40')).toBeNull();

    expect(compareVersions('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersions('2026.02.25.16.38', '2026.02.25.16.40')).toBe(-1);
    expect(compareVersions('2026.2.25-16.38', '2026.02.25.16.40')).toBe(-1);
    expect(compareVersions('weird', '2026.02.25.16.40')).toBeNull();

    expect(parseBuildVersionDate('2026.02.25.16.40')).not.toBeNull();
    expect(parseBuildVersionDate('2026.13.25.16.40')).toBeNull();
    expect(parseBuildVersionDate('nope')).toBeNull();
    expect(parseSemverDate('2026.2.25-16.38')).not.toBeNull();
    expect(parseSemverDate('1.2.3')).toBeNull();

    expect(toDisplayVersion('2026.2.25-16.38')).toBe('2026.02.25.16.38');
    expect(toDisplayVersion('v1.2.3')).toBe('1.2.3');

    expect(isVersionFormatError('invalid version')).toBe(true);
    expect(isVersionFormatError('ok')).toBe(false);
    expect(isOfflineLikeError('ENOTFOUND github.com')).toBe(true);
    expect(isOfflineLikeError('some unknown failure')).toBe(false);
  });
});
