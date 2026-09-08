import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/main/services/update-peer-protocol', () => ({
  detectPrimaryIp: vi.fn(() => '10.0.0.8'),
  nowIso: vi.fn(() => '2026-03-21T12:00:00.000Z'),
}));

import { createPeerHttpHandler } from '../src/main/services/update-peer-http-handler';
import type { PeerArtifact, PeerTransferStats } from '../src/shared/types';

class FakeStream extends EventEmitter {
  public constructor(private readonly body: Buffer, private readonly fail = false) {
    super();
  }

  public pipe(res: {
    end: (value?: unknown) => void;
    statusCode: number;
  }): void {
    if (this.fail) {
      this.emit('error', new Error('broken stream'));
      return;
    }
    res.end(this.body);
    this.emit('end');
  }
}

function makeRes() {
  const headers = new Map<string, string>();
  const res = {
    statusCode: 200,
    ended: false,
    body: undefined as unknown,
    setHeader: (key: string, value: string) => {
      headers.set(key.toLowerCase(), value);
    },
    end: (value?: unknown) => {
      res.ended = true;
      res.body = value;
    },
  };
  return { res, headers };
}

describe('update peer http handler', () => {
  it('returns 404 for invalid path or unknown artifact', () => {
    const handler = createPeerHttpHandler({
      artifacts: new Map(),
      peerId: 'peer-a',
      onTransferComplete: vi.fn(),
    });

    const wrong = makeRes();
    handler({ url: '/foo', method: 'GET' } as never, wrong.res as never);
    expect(wrong.res.statusCode).toBe(404);
    expect(wrong.res.ended).toBe(true);

    const missing = makeRes();
    handler({ url: '/update/not-there.zip', method: 'GET' } as never, missing.res as never);
    expect(missing.res.statusCode).toBe(404);
    expect(missing.res.ended).toBe(true);
  });

  it('serves head/get and emits transfer stats', () => {
    const artifact: PeerArtifact = {
      version: '2026.03.21.12.00',
      platform: 'darwin',
      arch: 'arm64',
      channel: 'latest',
      artifactName: 'artifact.zip',
      sha512: 'x',
      size: 4,
      filePath: '/tmp/artifact.zip',
      freshnessTs: '2026-03-21T12:00:00.000Z',
    };
    const stats: PeerTransferStats[] = [];
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'createReadStream').mockImplementation(
      () => new FakeStream(Buffer.from('test')) as unknown as fs.ReadStream,
    );

    const handler = createPeerHttpHandler({
      artifacts: new Map([[artifact.artifactName, artifact]]),
      peerId: 'peer-a',
      onTransferComplete: (entry) => stats.push(entry),
    });

    const head = makeRes();
    handler({ url: '/update/artifact.zip', method: 'HEAD' } as never, head.res as never);
    expect(head.res.statusCode).toBe(200);
    expect(head.headers.get('content-type')).toBe('application/octet-stream');
    expect(head.headers.get('content-length')).toBe('4');
    expect(head.res.ended).toBe(true);

    const get = makeRes();
    handler({ url: '/update/artifact.zip', method: 'GET' } as never, get.res as never);
    expect(get.res.statusCode).toBe(200);
    expect(String(get.res.body)).toBe('test');

    expect(stats).toHaveLength(1);
    expect(stats[0]).toMatchObject({
      direction: 'upload',
      peerId: 'peer-a',
      host: '10.0.0.8',
      artifactName: artifact.artifactName,
      bytes: artifact.size,
      ok: true,
      at: '2026-03-21T12:00:00.000Z',
    });
  });

  it('returns 500 when stream emits error', () => {
    const artifact: PeerArtifact = {
      version: '2026.03.21.12.00',
      platform: 'darwin',
      arch: 'arm64',
      channel: 'latest',
      artifactName: 'artifact.zip',
      sha512: 'x',
      size: 4,
      filePath: '/tmp/artifact.zip',
      freshnessTs: '2026-03-21T12:00:00.000Z',
    };
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'createReadStream').mockImplementation(
      () => new FakeStream(Buffer.from('test'), true) as unknown as fs.ReadStream,
    );

    const handler = createPeerHttpHandler({
      artifacts: new Map([[artifact.artifactName, artifact]]),
      peerId: 'peer-a',
      onTransferComplete: vi.fn(),
    });
    const res = makeRes();
    handler({ url: '/update/artifact.zip', method: 'GET' } as never, res.res as never);
    expect(res.res.statusCode).toBe(500);
    expect(res.res.ended).toBe(true);
  });
});
