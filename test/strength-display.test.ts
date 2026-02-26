import { describe, expect, it, vi } from 'vitest';
import { IPC_CHANNEL } from '../src/shared/ipc';

const hoisted = vi.hoisted(() => ({
  createdWindows: [] as Array<{
    options: Record<string, unknown>;
    handlers: Record<string, () => void>;
    webHandlers: Record<string, () => void>;
    webContents: { send: ReturnType<typeof vi.fn>; on: (event: string, cb: () => void) => void };
    isDestroyed: () => boolean;
    show: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    loadURL: ReturnType<typeof vi.fn>;
  }>,
  mockScreen: {
    getPrimaryDisplay: vi.fn(() => ({ id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } })),
    getAllDisplays: vi.fn(() => [
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { id: 2, bounds: { x: 1920, y: 0, width: 1600, height: 900 } },
    ]),
  },
}));

vi.mock('electron', () => {
  return {
    screen: hoisted.mockScreen,
    BrowserWindow: vi.fn((options: Record<string, unknown>) => {
      let destroyed = false;
      const handlers: Record<string, () => void> = {};
      const webHandlers: Record<string, () => void> = {};
      const webContents = {
        send: vi.fn(),
        on: (event: string, cb: () => void) => {
          webHandlers[event] = cb;
        },
      };
      const win = {
        options,
        handlers,
        webHandlers,
        webContents,
        isDestroyed: () => destroyed,
        show: vi.fn(),
        focus: vi.fn(),
        close: vi.fn(() => {
          destroyed = true;
          handlers.closed?.();
        }),
        loadURL: vi.fn(async () => undefined),
        on: (event: string, cb: () => void) => {
          handlers[event] = cb;
        },
      };
      hoisted.createdWindows.push(win);
      return win;
    }),
  };
});

import { StrengthDisplayService } from '../src/main/services/strength-display';

describe('strength display service', () => {
  it('opens fullscreen window on external display and pushes state', async () => {
    const service = new StrengthDisplayService(() => 'file:///index.html');
    await service.openWindow();

    expect(hoisted.createdWindows).toHaveLength(1);
    const win = hoisted.createdWindows[0]!;
    expect(win.options.x).toBe(1920);
    expect(win.options.width).toBe(1600);
    expect(win.loadURL).toHaveBeenCalledWith('file:///index.html?display=strength');

    win.webHandlers['did-finish-load']?.();
    expect(win.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED,
      service.getState(),
    );

    service.setState({ taktischeStaerke: '1/2/3//6' });
    expect(win.webContents.send).toHaveBeenCalledWith(
      IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED,
      { taktischeStaerke: '1/2/3//6' },
    );
  });

  it('reuses existing window, focuses it, and closes cleanly', async () => {
    hoisted.createdWindows.length = 0;
    const service = new StrengthDisplayService(() => 'file:///index.html?foo=1');
    await service.openWindow();
    await service.openWindow();

    expect(hoisted.createdWindows).toHaveLength(1);
    const win = hoisted.createdWindows[0]!;
    expect(win.show).toHaveBeenCalled();
    expect(win.focus).toHaveBeenCalled();
    expect(win.loadURL).toHaveBeenCalledWith('file:///index.html?foo=1&display=strength');

    service.closeWindow();
    expect(win.close).toHaveBeenCalled();
  });
});
