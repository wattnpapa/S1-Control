import fs from 'node:fs';
import http from 'node:http';
import { nowIso } from './update-peer-protocol';

export interface LocalFeedInput {
  platform: string;
  version: string;
  artifactName: string;
  sha512: string;
  size: number;
  filePath: string;
}

export interface LocalFeedHandle {
  feedUrl: string;
  close: () => Promise<void>;
}

/**
 * Creates a local one-shot update feed server for electron-updater consumption.
 */
export function createLocalFeedServer(metadata: LocalFeedInput): Promise<LocalFeedHandle> {
  const channelFile = resolveChannelFile(metadata.platform);
  const yml = buildFeedYaml(metadata);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const reqPath = decodeURIComponent(req.url.split('?')[0] || '/');
      if (reqPath === `/${channelFile}`) {
        res.setHeader('content-type', 'text/yaml; charset=utf-8');
        res.end(yml);
        return;
      }
      if (reqPath === `/${metadata.artifactName}`) {
        const stream = fs.createReadStream(metadata.filePath);
        stream.on('error', () => {
          res.statusCode = 500;
          res.end();
        });
        stream.pipe(res);
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Lokaler Feed-Port konnte nicht ermittelt werden'));
        return;
      }
      resolve({
        feedUrl: `http://127.0.0.1:${addr.port}`,
        close: async () =>
          new Promise<void>((closeResolve) => {
            server.close(() => closeResolve());
          }),
      });
    });
  });
}

/**
 * Resolves updater channel file name by runtime platform.
 */
function resolveChannelFile(platform: string): string {
  if (platform === 'darwin') return 'latest-mac.yml';
  if (platform === 'linux') return 'latest-linux.yml';
  return 'latest.yml';
}

/**
 * Generates channel metadata YAML content.
 */
function buildFeedYaml(metadata: LocalFeedInput): string {
  return [
    `version: ${metadata.version}`,
    `path: ${metadata.artifactName}`,
    `sha512: ${metadata.sha512}`,
    'files:',
    `  - url: ${metadata.artifactName}`,
    `    sha512: ${metadata.sha512}`,
    `    size: ${metadata.size}`,
    `releaseDate: ${nowIso()}`,
  ].join('\n');
}
