import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  return {
    networkInterfacesMock: vi.fn(() => ({})),
  };
});

vi.mock('node:os', () => ({
  default: {
    networkInterfaces: hoisted.networkInterfacesMock,
  },
}));

import {
  DISCOVERY_PORT,
  broadcastQuery,
  detectPrimaryIp,
  encodeWireMessage,
  parseWireMessage,
} from '../src/main/services/update-peer-protocol';

describe('update-peer protocol', () => {
  beforeEach(() => {
    hoisted.networkInterfacesMock.mockReset();
  });

  it('encodes and parses valid wire messages', () => {
    const encoded = encodeWireMessage({
      type: 's1-update-query',
      payload: {
        requestId: 'req-1',
        versionWanted: '1.2.3',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      },
    });
    const parsed = parseWireMessage(Buffer.from(encoded, 'utf8'));
    expect(parsed?.type).toBe('s1-update-query');
  });

  it('rejects malformed wire messages', () => {
    expect(parseWireMessage(Buffer.from('{kaputt', 'utf8'))).toBeNull();
    expect(parseWireMessage(Buffer.from(JSON.stringify({ type: 'x' }), 'utf8'))).toBeNull();
  });

  it('detects first non-internal IPv4 address', () => {
    hoisted.networkInterfacesMock.mockReturnValue({
      en0: [
        { family: 'IPv4', internal: true, address: '127.0.0.1' },
        { family: 'IPv4', internal: false, address: '192.168.178.12' },
      ],
    });
    expect(detectPrimaryIp()).toBe('192.168.178.12');
  });

  it('falls back to loopback if no external IPv4 exists', () => {
    hoisted.networkInterfacesMock.mockReturnValue({
      lo0: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
    });
    expect(detectPrimaryIp()).toBe('127.0.0.1');
  });

  it('broadcasts encoded query to discovery port', () => {
    const send = vi.fn();
    const socket = { send } as unknown as { send: (payload: string, port: number, host: string) => void };

    broadcastQuery(socket as never, {
      type: 's1-update-query',
      payload: {
        requestId: 'req-1',
        versionWanted: '*',
        platform: 'darwin',
        arch: 'arm64',
        channel: 'latest',
      },
    });

    const [payload, port, host] = send.mock.calls[0] as [string, number, string];
    expect(typeof payload).toBe('string');
    expect(port).toBe(DISCOVERY_PORT);
    expect(host).toBe('255.255.255.255');
  });
});
