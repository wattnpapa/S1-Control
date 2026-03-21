import fs from 'node:fs';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/main/services/update-peer-protocol', () => ({
  nowIso: vi.fn(() => '2026-03-21T12:30:00.000Z'),
}));

import { createLocalFeedServer } from '../src/main/services/update-peer-feed';

type Req = { url?: string };
type Res = {
  statusCode: number;
  headers: Map<string, string>;
  body: unknown;
  setHeader: (key: string, value: string) => void;
  end: (value?: unknown) => void;
};

class FakeReadable extends EventEmitter {
  public constructor(private readonly payload: string, private readonly fail = false) {
    super();
  }

  public pipe(res: Res): void {
    if (this.fail) {
      this.emit('error', new Error('stream failed'));
      return;
    }
    res.end(this.payload);
  }
}

let result: Res;

describe('update peer local feed server', () => {
  it('serves channel yaml and artifact via handler', async () => {
    let handler: ((req: Req, res: Res) => void) | null = null;
    const listenSpy = vi.fn((_port: number, _host: string, cb: () => void) => cb());
    const closeSpy = vi.fn((cb?: () => void) => cb?.());

    vi.spyOn(http, 'createServer').mockImplementation(((fn: (req: Req, res: Res) => void) => {
      handler = fn;
      return {
        on: vi.fn(),
        listen: listenSpy,
        close: closeSpy,
        address: () => ({ port: 43210 }),
      } as unknown as http.Server;
    }) as typeof http.createServer);

    vi.spyOn(fs, 'createReadStream').mockImplementation(
      () => new FakeReadable('artifact-bytes') as unknown as fs.ReadStream,
    );

    const feed = await createLocalFeedServer({
      platform: 'darwin',
      version: '2026.03.21.12.30',
      artifactName: 'S1-Control.zip',
      sha512: 'sha-darwin',
      size: 11,
      filePath: '/tmp/S1-Control.zip',
    });

    expect(feed.feedUrl).toBe('http://127.0.0.1:43210');
    expect(handler).not.toBeNull();

    result = {
      statusCode: 200,
      headers: new Map(),
      body: undefined,
      setHeader: (key: string, value: string) => result.headers.set(key.toLowerCase(), value),
      end: (value?: unknown) => {
        result.body = value;
      },
    };
    handler?.({ url: '/latest-mac.yml?x=1' }, result);
    const yml = String(result.body ?? '');
    expect(result.headers.get('content-type')).toBe('text/yaml; charset=utf-8');
    expect(yml).toContain('version: 2026.03.21.12.30');
    expect(yml).toContain('path: S1-Control.zip');
    expect(yml).toContain('sha512: sha-darwin');
    expect(yml).toContain('releaseDate: 2026-03-21T12:30:00.000Z');

    result = {
      statusCode: 200,
      headers: new Map(),
      body: undefined,
      setHeader: (key: string, value: string) => result.headers.set(key.toLowerCase(), value),
      end: (value?: unknown) => {
        result.body = value;
      },
    };
    handler?.({ url: '/S1-Control.zip' }, result);
    expect(result.body).toBe('artifact-bytes');

    result = {
      statusCode: 200,
      headers: new Map(),
      body: undefined,
      setHeader: (key: string, value: string) => result.headers.set(key.toLowerCase(), value),
      end: (value?: unknown) => {
        result.body = value;
      },
    };
    handler?.({ url: '/missing' }, result);
    expect(result.statusCode).toBe(404);

    await feed.close();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('handles bad request and stream errors', async () => {
    let handler: ((req: Req, res: Res) => void) | null = null;
    vi.spyOn(http, 'createServer').mockImplementation(((fn: (req: Req, res: Res) => void) => {
      handler = fn;
      return {
        on: vi.fn(),
        listen: (_port: number, _host: string, cb: () => void) => cb(),
        close: (cb?: () => void) => cb?.(),
        address: () => ({ port: 43211 }),
      } as unknown as http.Server;
    }) as typeof http.createServer);

    vi.spyOn(fs, 'createReadStream').mockImplementation(
      () => new FakeReadable('x', true) as unknown as fs.ReadStream,
    );

    await createLocalFeedServer({
      platform: 'win32',
      version: '1.0.0',
      artifactName: 'S1-Control.zip',
      sha512: 'sha',
      size: 1,
      filePath: '/tmp/S1-Control.zip',
    });

    result = {
      statusCode: 200,
      headers: new Map(),
      body: undefined,
      setHeader: (key: string, value: string) => result.headers.set(key.toLowerCase(), value),
      end: (value?: unknown) => {
        result.body = value;
      },
    };
    handler?.({}, result);
    expect(result.statusCode).toBe(400);

    result = {
      statusCode: 200,
      headers: new Map(),
      body: undefined,
      setHeader: (key: string, value: string) => result.headers.set(key.toLowerCase(), value),
      end: (value?: unknown) => {
        result.body = value;
      },
    };
    handler?.({ url: '/S1-Control.zip' }, result);
    expect(result.statusCode).toBe(500);
  });
});
