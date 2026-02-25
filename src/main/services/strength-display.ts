import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipc';
import type { StrengthDisplayState } from '../../shared/types';

const DEFAULT_STATE: StrengthDisplayState = {
  taktischeStaerke: '0/0/0//0',
};

export class StrengthDisplayService {
  private window: BrowserWindow | null = null;

  private state: StrengthDisplayState = { ...DEFAULT_STATE };

  private readonly resolveRendererUrl: () => string;

  public constructor(resolveRendererUrl: () => string) {
    this.resolveRendererUrl = resolveRendererUrl;
  }

  public getState(): StrengthDisplayState {
    return this.state;
  }

  public setState(next: StrengthDisplayState): void {
    this.state = next;
    this.pushState();
  }

  public async openWindow(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      this.pushState();
      return;
    }

    const displays = screen.getAllDisplays();
    const external = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);
    const target = external ?? screen.getPrimaryDisplay();

    this.window = new BrowserWindow({
      x: target.bounds.x,
      y: target.bounds.y,
      width: target.bounds.width,
      height: target.bounds.height,
      autoHideMenuBar: true,
      fullscreen: true,
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    this.window.on('closed', () => {
      this.window = null;
    });

    this.window.webContents.on('did-finish-load', () => {
      this.pushState();
    });

    const baseUrl = this.resolveRendererUrl();
    const url = baseUrl.includes('?') ? `${baseUrl}&display=strength` : `${baseUrl}?display=strength`;
    await this.window.loadURL(url);
  }

  public closeWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
      this.window = null;
    }
  }

  private pushState(): void {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }
    this.window.webContents.send(IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED, this.state);
  }
}
