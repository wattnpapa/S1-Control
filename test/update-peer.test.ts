import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { decodePeerMessage, selectBestOffers, UpdatePeerService } from '../src/main/services/update-peer';
import type { PeerOffer } from '../src/shared/types';

describe('update-peer service helpers', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('decodes valid wire messages and rejects invalid payloads', () => {
    const valid = Buffer.from(
      JSON.stringify({
        type: 's1-update-query',
        payload: {
          requestId: 'req-1',
          versionWanted: '2026.03.01.00.01',
          platform: 'darwin',
          arch: 'arm64',
          channel: 'latest',
        },
      }),
      'utf8',
    );
    const parsed = decodePeerMessage(valid);
    expect(parsed?.type).toBe('s1-update-query');

    const invalid = decodePeerMessage(Buffer.from('{not-json', 'utf8'));
    expect(invalid).toBeNull();
  });

  it('sorts peer offers by freshness and then RTT', () => {
    const offers: PeerOffer[] = [
      {
        peerId: 'b',
        host: '10.0.0.2',
        httpPort: 45000,
        version: '2026.03.01.00.01',
        artifactName: 'S1-Control.zip',
        sha512: 'abc',
        size: 123,
        freshnessTs: '2026-03-01T00:00:00.000Z',
        rttMs: 80,
      },
      {
        peerId: 'a',
        host: '10.0.0.1',
        httpPort: 45001,
        version: '2026.03.01.00.01',
        artifactName: 'S1-Control.zip',
        sha512: 'abc',
        size: 123,
        freshnessTs: '2026-03-01T00:00:10.000Z',
        rttMs: 120,
      },
      {
        peerId: 'c',
        host: '10.0.0.3',
        httpPort: 45002,
        version: '2026.03.01.00.01',
        artifactName: 'S1-Control.zip',
        sha512: 'abc',
        size: 123,
        freshnessTs: '2026-03-01T00:00:10.000Z',
        rttMs: 20,
      },
    ];

    const sorted = selectBestOffers(offers);
    expect(sorted.map((entry) => entry.peerId)).toEqual(['c', 'a', 'b']);
  });

  it('verifies sha512 file checksum', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 's1-peer-test-'));
    tempDirs.push(dir);
    const filePath = path.join(dir, 'artifact.bin');
    const content = 'hello-peer-update';
    fs.writeFileSync(filePath, content, 'utf8');

    const expected = crypto.createHash('sha512').update(content).digest('base64');
    expect(UpdatePeerService.verifyFileSha512(filePath, expected)).toBe(true);
    expect(UpdatePeerService.verifyFileSha512(filePath, 'invalid')).toBe(false);
  });
});
