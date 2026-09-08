import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const appMock = {
    getVersion: vi.fn(() => '0.1.0'),
    setVersion: vi.fn(() => undefined),
    setAboutPanelOptions: vi.fn(() => undefined),
  };
  return { appMock };
});

vi.mock('electron', () => ({
  app: hoisted.appMock,
}));

import { resolveAppVersionLabel, setupVersionMetadata, withVersion } from '../src/main/services/app-version';

describe('app-version service', () => {
  const originalAppVersion = process.env.S1_APP_VERSION;
  const originalSemver = process.env.S1_APP_SEMVER;

  beforeEach(() => {
    if (originalAppVersion === undefined) {
      delete process.env.S1_APP_VERSION;
    } else {
      process.env.S1_APP_VERSION = originalAppVersion;
    }
    if (originalSemver === undefined) {
      delete process.env.S1_APP_SEMVER;
    } else {
      process.env.S1_APP_SEMVER = originalSemver;
    }
    hoisted.appMock.getVersion.mockReset();
    hoisted.appMock.getVersion.mockReturnValue('0.1.0');
    hoisted.appMock.setVersion.mockReset();
    hoisted.appMock.setAboutPanelOptions.mockReset();
    vi.useRealTimers();
  });

  it('prefers explicit S1_APP_VERSION', () => {
    process.env.S1_APP_VERSION = '2026.03.05.21.30';
    expect(resolveAppVersionLabel()).toBe('2026.03.05.21.30');
  });

  it('maps semver timestamp into build-version format', () => {
    process.env.S1_APP_SEMVER = '2026.3.5-7.8';
    expect(resolveAppVersionLabel()).toBe('2026.03.05.07.08');
  });

  it('falls back to semver string for non-default non-mappable version', () => {
    hoisted.appMock.getVersion.mockReturnValue('1.2.3');
    expect(resolveAppVersionLabel()).toBe('1.2.3');
  });

  it('falls back to generated UTC build-version when only default app version exists', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T21:14:00.000Z'));
    expect(resolveAppVersionLabel()).toBe('2026.03.05.21.14');
  });

  it('prefixes details with version', () => {
    process.env.S1_APP_VERSION = '2026.03.05.21.30';
    expect(withVersion('boom')).toBe('Version: 2026.03.05.21.30\n\nboom');
  });

  it('applies about metadata and semver override', () => {
    process.env.S1_APP_SEMVER = '2026.3.5-7.8';
    const label = setupVersionMetadata();

    expect(label).toBe('2026.03.05.07.08');
    expect(hoisted.appMock.setVersion).toHaveBeenCalledWith('2026.3.5-7.8');
    expect(hoisted.appMock.setAboutPanelOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationName: 'S1-Control',
        applicationVersion: '2026.03.05.07.08',
        version: '2026.03.05.07.08',
      }),
    );
  });
});
