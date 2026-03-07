import path from 'node:path';
import { BrowserWindow, screen } from 'electron';
import { IPC_CHANNEL } from '../../shared/ipc';
import type { StrengthDisplayState } from '../../shared/types';
import { debugSync } from './debug';

const DEFAULT_STATE: StrengthDisplayState = {
  taktischeStaerke: '0/0/0//0',
};
const STRENGTH_DISPLAY_DIAGNOSTIC_STATIC = false;

export class StrengthDisplayService {
  private window: BrowserWindow | null = null;

  private state: StrengthDisplayState = { ...DEFAULT_STATE };

  private readonly resolveRendererUrl: () => string;

  private openStartedAt = 0;

  private loaded = false;

  private prewarmStartedAt = 0;

  /**
   * Creates an instance of this class.
   */
  public constructor(resolveRendererUrl: () => string) {
    this.resolveRendererUrl = resolveRendererUrl;
  }

  /**
   * Handles Get State.
   */
  public getState(): StrengthDisplayState {
    return this.state;
  }

  /**
   * Handles Set State.
   */
  public setState(next: StrengthDisplayState): void {
    this.state = next;
    this.pushState();
  }

  /**
   * Handles Open Window.
   */
  public async openWindow(): Promise<void> {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      this.pushState();
      return;
    }

    const target = this.getTargetDisplay();
    this.window = this.createWindow(target, true);
    this.openStartedAt = Date.now();
    this.loadStrengthRenderer(this.window, true);
  }

  /**
   * Prewarms the monitor renderer in the background so the first user-open is instant.
   */
  public prewarmWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      return;
    }
    this.prewarmStartedAt = Date.now();
    const target = this.getTargetDisplay();
    this.window = this.createWindow(target, false);
    this.loadStrengthRenderer(this.window, false);
  }

  /**
   * Returns monitor renderer/window health for diagnostics.
   */
  public getHealth(): {
    hasWindow: boolean;
    loaded: boolean;
    visible: boolean;
    prewarmMs?: number;
  } {
    const win = this.window;
    return {
      hasWindow: Boolean(win && !win.isDestroyed()),
      loaded: this.loaded,
      visible: Boolean(win && !win.isDestroyed() && win.isVisible()),
      prewarmMs: this.prewarmStartedAt > 0 ? Date.now() - this.prewarmStartedAt : undefined,
    };
  }

  /**
   * Handles Close Window.
   */
  public closeWindow(): void {
    if (this.window && !this.window.isDestroyed()) {
      const win = this.window;
      this.window = null;
      this.loaded = false;
      // Force immediate teardown to avoid delayed close caused by unload handlers.
      win.destroy();
    }
  }

  /**
   * Handles Push State.
   */
  private pushState(): void {
    if (!this.window || this.window.isDestroyed()) {
      return;
    }
    this.window.webContents.send(IPC_CHANNEL.STRENGTH_DISPLAY_STATE_CHANGED, this.state);
  }

  /**
   * Returns preferred target display.
   */
  private getTargetDisplay() {
    const displays = screen.getAllDisplays();
    const external = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);
    return external ?? screen.getPrimaryDisplay();
  }

  /**
   * Creates strength monitor browser window.
   */
  private createWindow(target: Electron.Display, show: boolean): BrowserWindow {
    const win = new BrowserWindow({
      x: target.bounds.x,
      y: target.bounds.y,
      width: target.bounds.width,
      height: target.bounds.height,
      autoHideMenuBar: true,
      // Avoid macOS fullscreen space transition delays (can cause long black screens).
      fullscreen: false,
      frame: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      show,
      backgroundColor: '#000000',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    win.on('closed', () => {
      this.window = null;
      this.loaded = false;
    });
    return win;
  }

  /**
   * Loads monitor renderer URL and optional splash/fallback pages.
   */
  private loadStrengthRenderer(win: BrowserWindow, showSplash: boolean): void {
    this.loaded = false;
    const target = this.getTargetDisplay();
    win.setBounds(target.bounds);
    if (showSplash) {
      win.show();
      win.focus();
    }

    if (showSplash) {
      const splashHtml = encodeURIComponent(
        '<!doctype html><html><body style="margin:0;display:grid;place-items:center;background:#000;color:#fff;font:26px -apple-system,Arial,sans-serif;">Stärke-Monitor wird geöffnet…</body></html>',
      );
      void win.loadURL(`data:text/html;charset=utf-8,${splashHtml}`);
    }

    if (STRENGTH_DISPLAY_DIAGNOSTIC_STATIC) {
      const diagnosticHtml = encodeURIComponent(
        '<!doctype html><html><body style="margin:0;display:grid;place-items:center;background:#000;color:#fff;font:30px -apple-system,Arial,sans-serif;">Diagnose-Modus: Fenster ohne Daten- und Renderer-Load</body></html>',
      );
      setTimeout(() => {
        if (win.isDestroyed()) {
          return;
        }
        void win.loadURL(`data:text/html;charset=utf-8,${diagnosticHtml}`);
      }, 0);
      return;
    }

    win.webContents.once('did-finish-load', () => {
      this.loaded = true;
      debugSync('strength-display', 'did-finish-load', {
        ms: this.openStartedAt > 0 ? Date.now() - this.openStartedAt : undefined,
        prewarmMs: this.prewarmStartedAt > 0 ? Date.now() - this.prewarmStartedAt : undefined,
      });
      if (showSplash) {
        win.show();
        win.focus();
      }
      this.pushState();
    });
    win.webContents.once(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL) => {
        debugSync('strength-display', 'did-fail-load', {
          errorCode,
          errorDescription,
          validatedURL,
        });
        if (win.isDestroyed()) {
          return;
        }
        const html = encodeURIComponent(
          `<!doctype html><html><body style="margin:0;background:#111;color:#fff;font:16px -apple-system,Arial;padding:24px;">
          <h2>Stärke-Monitor konnte nicht geladen werden</h2>
          <p>${errorDescription} (${errorCode})</p>
          <p style="word-break:break-all;opacity:.8">${validatedURL}</p>
          </body></html>`,
        );
        void win.loadURL(`data:text/html;charset=utf-8,${html}`);
      },
    );

    const parsedUrl = new URL(this.resolveRendererUrl());
    parsedUrl.searchParams.set('display', 'strength');
    const targetUrl = parsedUrl.toString();
    setTimeout(() => {
      if (win.isDestroyed()) {
        return;
      }
      void win.loadURL(targetUrl);
    }, 0);
  }
}
