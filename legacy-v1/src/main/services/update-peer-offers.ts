import { detectPrimaryIp } from './update-peer-protocol';
import type { PeerOffer, PeerArtifact } from '../../shared/types';
import type { PeerOfferWireMessage, PeerQueryMessage } from './update-peer-protocol';

/**
 * Returns true when an artifact matches a query.
 */
export function matchesPeerQuery(artifact: PeerArtifact, query: PeerQueryMessage): boolean {
  return (
    (query.versionWanted === '*' || artifact.version === query.versionWanted) &&
    artifact.platform === query.platform &&
    artifact.arch === query.arch &&
    artifact.channel === query.channel
  );
}

/**
 * Builds outgoing wire payload for an artifact offer.
 */
export function buildPeerOfferWireMessage(params: {
  requestId: string;
  peerId: string;
  httpPort: number;
  artifact: PeerArtifact;
  startedAt: number;
}): PeerOfferWireMessage {
  return {
    requestId: params.requestId,
    peerId: params.peerId,
    host: detectPrimaryIp(),
    httpPort: params.httpPort,
    version: params.artifact.version,
    artifactName: params.artifact.artifactName,
    sha512: params.artifact.sha512,
    size: params.artifact.size,
    freshnessTs: params.artifact.freshnessTs,
    uptimeMs: Date.now() - params.startedAt,
  };
}

/**
 * Converts a wire offer to internal offer format.
 */
export function toPeerOffer(payload: PeerOfferWireMessage, startedAt: number): PeerOffer {
  return {
    peerId: payload.peerId,
    host: payload.host,
    httpPort: payload.httpPort,
    version: payload.version,
    artifactName: payload.artifactName,
    sha512: payload.sha512,
    size: payload.size,
    freshnessTs: payload.freshnessTs,
    rttMs: Date.now() - startedAt,
  };
}
