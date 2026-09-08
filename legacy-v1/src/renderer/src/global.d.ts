import type { RendererApi } from '../../shared/ipc';
import type { EinsatzChangedSignal } from '../../shared/types';

declare global {
  interface Window {
    api: RendererApi;
    updaterEvents: {
      onStateChanged: (callback: (state: unknown) => void) => () => void;
    };
    strengthDisplayEvents: {
      onStateChanged: (callback: (state: unknown) => void) => () => void;
    };
    appEvents: {
      onPendingOpenFile: (callback: (dbPath: string) => void) => () => void;
      onDebugSyncLog: (callback: (line: string) => void) => () => void;
      onEinsatzChanged: (callback: (signal: EinsatzChangedSignal) => void) => () => void;
    };
  }
}

export {};
