import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const windows: Array<{ webContents: { send: ReturnType<typeof vi.fn> } }> = [];
  const BrowserWindowMock = vi.fn().mockImplementation(() => {
    const win = {
      loadURL: vi.fn(async () => undefined),
      webContents: {
        send: vi.fn(),
      },
    };
    windows.push(win);
    return win;
  }) as unknown as {
    new (...args: unknown[]): { loadURL: (url: string) => Promise<void>; webContents: { send: (channel: string, payload: unknown) => void } };
    getAllWindows: () => Array<{ webContents: { send: ReturnType<typeof vi.fn> } }>;
  };

  BrowserWindowMock.getAllWindows = vi.fn(() => windows);
  return { BrowserWindowMock, windows };
});

vi.mock('electron', () => ({
  BrowserWindow: hoisted.BrowserWindowMock,
}));

import { broadcastToAllWindows, createMainWindow, resolveRendererUrl } from '../src/main/services/main-window';

describe('main-window service', () => {
  const originalDevUrl = process.env.VITE_DEV_SERVER_URL;

  beforeEach(() => {
    if (originalDevUrl === undefined) {
      delete process.env.VITE_DEV_SERVER_URL;
    } else {
      process.env.VITE_DEV_SERVER_URL = originalDevUrl;
    }
    hoisted.BrowserWindowMock.mockClear();
    (hoisted.BrowserWindowMock.getAllWindows as unknown as ReturnType<typeof vi.fn>).mockClear();
    hoisted.windows.length = 0;
  });

  it('returns dev server url when configured', () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    expect(resolveRendererUrl()).toBe('http://localhost:5173');
  });

  it('returns file url in production mode', () => {
    const url = resolveRendererUrl();
    expect(url.startsWith('file://')).toBe(true);
    expect(url).toContain('dist-renderer/index.html');
  });

  it('creates window with preload and loads renderer url', async () => {
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
    await createMainWindow();

    expect(hoisted.BrowserWindowMock).toHaveBeenCalledTimes(1);
    const firstCall = hoisted.BrowserWindowMock.mock.calls[0]?.[0] as { webPreferences?: { preload?: string } };
    expect(firstCall.webPreferences?.preload).toContain('preload.js');

    const created = hoisted.windows[0] as { loadURL: ReturnType<typeof vi.fn> };
    expect(created.loadURL).toHaveBeenCalledWith('http://localhost:5173');
  });

  it('broadcasts payload to all open windows', () => {
    hoisted.windows.push(
      { webContents: { send: vi.fn() } },
      { webContents: { send: vi.fn() } },
    );
    broadcastToAllWindows('test:channel', { ok: true });

    expect(hoisted.windows[0]?.webContents.send).toHaveBeenCalledWith('test:channel', { ok: true });
    expect(hoisted.windows[1]?.webContents.send).toHaveBeenCalledWith('test:channel', { ok: true });
  });
});
