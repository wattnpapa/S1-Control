import type { RendererApi } from '../../shared/ipc';

declare global {
  interface Window {
    api: RendererApi;
    updaterEvents: {
      onStateChanged: (callback: (state: unknown) => void) => () => void;
    };
    strengthDisplayEvents: {
      onStateChanged: (callback: (state: unknown) => void) => () => void;
    };
  }
}

export {};
