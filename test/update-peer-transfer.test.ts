import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PeerOffer } from '../src/shared/types';

const hoisted = vi.hoisted(() => ({
  debugMock: vi.fn(),
}));

vi.mock('../src/main/services/debug', () => ({
  debugSync: hoisted.debugMock,
}));

vi.mock('../src/main/services/update-peer-protocol', () => ({
  nowIso: vi.fn(() => '2026-03-21T15:00:00.000Z'),
}));

import { downloadPeerFile, nextPeerBlockTimestamp } from '../src/main/services/update-peer-transfer';

function makeOffer(): PeerOffer {
  return {
    peerId: 'peer-a',
    host: '10.0.0.11',
    httpPort: 41235,
    version: '2026.03.21.15.00',
    artifactName: 'S1-Control.zip',
    sha512: 'sha',
    size: 10,
    freshnessTs: '2026-03-21T15:00:00.000Z',
    rttMs: 15,
  };
}

function toBody(chunks: Buffer[]): ReadableStream<Uint8Array> {
  const iter = async function* (): AsyncGenerator<Buffer> {
    for (const chunk of chunks) {
      yield chunk;
    }
  };
  return {
    [Symbol.asyncIterator]: iter,
  } as unknown as ReadableStream<Uint8Array>;
}

describe('update peer transfer', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    hoisted.debugMock.mockReset();
  });

  it('downloads file, validates hash and reports progress', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-peer-transfer-'));
    tempDirs.push(dir);
    const targetPath = path.join(dir, 'S1-Control.zip');
    const c1 = Buffer.from('hello');
    const c2 = Buffer.from('world');
    const expectedSha512 = crypto
      .createHash('sha512')
      .update(Buffer.concat([c1, c2]))
      .digest('base64');

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: toBody([c1, c2]),
      headers: new Headers({ 'content-length': String(c1.length + c2.length) }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const written: Buffer[] = [];
    vi.spyOn(fs, 'createWriteStream').mockImplementation(
      () =>
        ({
          write: (chunk: Buffer) => {
            written.push(Buffer.from(chunk));
            return true;
          },
          end: () => undefined,
        }) as unknown as fs.WriteStream,
    );

    const progress: Array<[number, number]> = [];
    const result = await downloadPeerFile({
      offer: makeOffer(),
      targetPath,
      expectedSha512,
      onProgress: (transferred, total) => progress.push([transferred, total]),
    });

    expect(result.targetPath).toBe(targetPath);
    expect(Buffer.concat(written).toString('utf8')).toBe('helloworld');
    expect(result.stats).toMatchObject({
      direction: 'download',
      peerId: 'peer-a',
      host: '10.0.0.11',
      artifactName: 'S1-Control.zip',
      bytes: 10,
      ok: true,
      at: '2026-03-21T15:00:00.000Z',
    });
    expect(progress).toEqual([
      [5, 10],
      [10, 10],
    ]);
    expect(hoisted.debugMock).toHaveBeenCalledWith('peer-download', 'ok', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.0.0.11:41235/update/S1-Control.zip',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('throws for blocked peer and reports temporary block helper timestamp', async () => {
    const now = Date.now();
    const blockedUntil = now + 60_000;
    await expect(
      downloadPeerFile({
        offer: makeOffer(),
        targetPath: '/tmp/not-used.zip',
        expectedSha512: 'x',
        blockedUntil,
      }),
    ).rejects.toThrow('Peer peer-a ist temporär gesperrt.');
    expect(nextPeerBlockTimestamp()).toBeGreaterThan(now);
  });

  it('throws on non-ok response and includes peerStats', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        body: null,
        headers: new Headers(),
      })),
    );

    await expect(
      downloadPeerFile({
        offer: makeOffer(),
        targetPath: '/tmp/nope.zip',
        expectedSha512: 'x',
      }),
    ).rejects.toMatchObject({
      message: 'Peer-Download fehlgeschlagen (503)',
      peerStats: expect.objectContaining({
        ok: false,
        artifactName: 'S1-Control.zip',
      }),
    });
    expect(hoisted.debugMock).toHaveBeenCalledWith('peer-download', 'failed', expect.any(Object));
  });

  it('removes file and throws on sha mismatch', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-peer-transfer-'));
    tempDirs.push(dir);
    const targetPath = path.join(dir, 'S1-Control.zip');
    const body = Buffer.from('payload');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        body: toBody([body]),
        headers: new Headers({ 'content-length': String(body.length) }),
      })),
    );

    const rmSpy = vi.spyOn(fs, 'rmSync').mockImplementation(() => undefined);
    vi.spyOn(fs, 'createWriteStream').mockImplementation(
      () =>
        ({
          write: () => true,
          end: () => undefined,
        }) as unknown as fs.WriteStream,
    );

    await expect(
      downloadPeerFile({
        offer: makeOffer(),
        targetPath,
        expectedSha512: 'wrong-hash',
      }),
    ).rejects.toThrow('SHA512-Prüfung für Peer-Download fehlgeschlagen');
    expect(rmSpy).toHaveBeenCalledWith(targetPath, { force: true });
  });
});
