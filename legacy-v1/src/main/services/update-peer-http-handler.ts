import fs from 'node:fs';
import type http from 'node:http';
import { detectPrimaryIp, nowIso } from './update-peer-protocol';
import type { PeerArtifact, PeerTransferStats } from '../../shared/types';

interface CreatePeerHttpHandlerParams {
  artifacts: Map<string, PeerArtifact>;
  peerId: string;
  onTransferComplete: (stats: PeerTransferStats) => void;
}

/**
 * Creates an HTTP handler for serving peer update artifacts.
 */
export function createPeerHttpHandler(params: CreatePeerHttpHandlerParams) {
  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    const requestUrl = req.url ? decodeURIComponent(req.url) : '/';
    const artifactName = requestUrl.replace(/^\/update\//, '');
    const artifact = params.artifacts.get(artifactName);
    if (!requestUrl.startsWith('/update/') || !artifact || !fs.existsSync(artifact.filePath)) {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader('content-type', 'application/octet-stream');
    res.setHeader('content-length', String(artifact.size));
    if (req.method === 'HEAD') {
      res.statusCode = 200;
      res.end();
      return;
    }
    const started = Date.now();
    const stream = fs.createReadStream(artifact.filePath);
    stream.on('error', () => {
      res.statusCode = 500;
      res.end();
    });
    stream.on('end', () => {
      params.onTransferComplete({
        direction: 'upload',
        peerId: params.peerId,
        host: detectPrimaryIp(),
        artifactName,
        bytes: artifact.size,
        durationMs: Date.now() - started,
        at: nowIso(),
        ok: true,
      });
    });
    stream.pipe(res);
  };
}
