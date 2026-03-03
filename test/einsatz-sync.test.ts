import { beforeEach, describe, expect, it, vi } from 'vitest';

type MessageHandler = (msg: Buffer, rinfo: { address: string; port: number }) => void;
type ErrorHandler = (error: Error) => void;

const hoisted = vi.hoisted(() => {
  let messageHandler: MessageHandler | null = null;
  let errorHandler: ErrorHandler | null = null;

  const socketMock = {
    on: vi.fn((event: string, handler: MessageHandler | ErrorHandler) => {
      if (event === 'message') {
        messageHandler = handler as MessageHandler;
      }
      if (event === 'error') {
        errorHandler = handler as ErrorHandler;
      }
      return socketMock;
    }),
    bind: vi.fn((port: number, callback: () => void) => {
      void port;
      callback();
    }),
    setBroadcast: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
  };

  return {
    createSocketMock: vi.fn(() => socketMock),
    socketMock,
    emitMessage: (msg: Buffer, address = '192.168.1.10', port = 41235) =>
      messageHandler?.(msg, { address, port }),
    emitError: (error: Error) => errorHandler?.(error),
  };
});

vi.mock('node:dgram', () => ({
  default: {
    createSocket: hoisted.createSocketMock,
  },
}));

vi.mock('../src/main/services/debug', () => ({
  debugSync: vi.fn(),
}));

import { EinsatzSyncService } from '../src/main/services/einsatz-sync';

describe('einsatz sync service', () => {
  beforeEach(() => {
    hoisted.createSocketMock.mockClear();
    hoisted.socketMock.on.mockClear();
    hoisted.socketMock.bind.mockClear();
    hoisted.socketMock.setBroadcast.mockClear();
    hoisted.socketMock.send.mockClear();
    hoisted.socketMock.close.mockClear();
  });

  it('starts udp listener and broadcasts local changes', () => {
    const onRemoteChange = vi.fn();
    const service = new EinsatzSyncService(onRemoteChange, 41235);
    service.start('/share/einsatz-a.s1control');

    expect(hoisted.createSocketMock).toHaveBeenCalledWith({ type: 'udp4', reuseAddr: true });
    expect(hoisted.socketMock.bind).toHaveBeenCalledWith(41235, expect.any(Function));
    expect(hoisted.socketMock.setBroadcast).toHaveBeenCalledWith(true);

    service.broadcastChange({
      einsatzId: 'einsatz-1',
      dbPath: '/share/einsatz-a.s1control',
      reason: 'update-einheit',
    });

    expect(hoisted.socketMock.send).toHaveBeenCalledTimes(1);
    const [wire, port, host] = hoisted.socketMock.send.mock.calls[0] as [Buffer, number, string];
    expect(port).toBe(41235);
    expect(host).toBe('255.255.255.255');
    const parsed = JSON.parse(wire.toString('utf8')) as { type: string; payload: { einsatzId: string } };
    expect(parsed.type).toBe('s1-einsatz-changed');
    expect(parsed.payload.einsatzId).toBe('einsatz-1');
  });

  it('forwards matching remote signals and ignores self or other db paths', () => {
    const onRemoteChange = vi.fn();
    const service = new EinsatzSyncService(onRemoteChange, 41235);
    service.start('/share/einsatz-a.s1control');

    service.broadcastChange({
      einsatzId: 'einsatz-1',
      dbPath: '/share/einsatz-a.s1control',
      reason: 'local-write',
    });
    const [localWire] = hoisted.socketMock.send.mock.calls[0] as [Buffer];
    const localPayload = JSON.parse(localWire.toString('utf8')) as {
      payload: { sourceClientId: string };
    };

    hoisted.emitMessage(localWire, '192.168.1.11', 41235);
    expect(onRemoteChange).not.toHaveBeenCalled();

    const remotePayload = {
      type: 's1-einsatz-changed',
      payload: {
        einsatzId: 'einsatz-1',
        dbPath: '/share/einsatz-a.s1control',
        sourceClientId: `${localPayload.payload.sourceClientId}-other`,
        changedAt: new Date().toISOString(),
        reason: 'update-fahrzeug',
      },
    };
    hoisted.emitMessage(Buffer.from(JSON.stringify(remotePayload), 'utf8'), '192.168.1.22', 41235);
    expect(onRemoteChange).toHaveBeenCalledTimes(1);

    const differentDb = {
      ...remotePayload,
      payload: {
        ...remotePayload.payload,
        einsatzId: 'einsatz-other',
        dbPath: '/share/einsatz-b.s1control',
      },
    };
    hoisted.emitMessage(Buffer.from(JSON.stringify(differentDb), 'utf8'), '192.168.1.22', 41235);
    expect(onRemoteChange).toHaveBeenCalledTimes(1);
  });

  it('handles invalid messages and stops cleanly', () => {
    const onRemoteChange = vi.fn();
    const service = new EinsatzSyncService(onRemoteChange, 41235);
    service.start('/share/einsatz-a.s1control');

    hoisted.emitMessage(Buffer.from('{invalid', 'utf8'), '192.168.1.30', 41235);
    expect(onRemoteChange).not.toHaveBeenCalled();

    hoisted.emitError(new Error('udp-failed'));
    service.stop();
    expect(hoisted.socketMock.close).toHaveBeenCalledTimes(1);
  });

  it('accepts remote change by einsatzId when db paths differ across mounts', () => {
    const onRemoteChange = vi.fn();
    const service = new EinsatzSyncService(onRemoteChange, 41235);
    service.start('/Volumes/share/hochwasser-1.s1control');
    service.setContext({
      dbPath: '/Volumes/share/hochwasser-1.s1control',
      einsatzId: 'einsatz-42',
    });

    service.broadcastChange({
      einsatzId: 'einsatz-42',
      dbPath: '/Volumes/share/hochwasser-1.s1control',
      reason: 'seed-self-id',
    });
    const [localWire] = hoisted.socketMock.send.mock.calls[0] as [Buffer];
    const localPayload = JSON.parse(localWire.toString('utf8')) as {
      payload: { sourceClientId: string };
    };

    const remotePayload = {
      type: 's1-einsatz-changed',
      payload: {
        einsatzId: 'einsatz-42',
        dbPath: 'Z:\\share\\hochwasser-1.s1control',
        sourceClientId: `${localPayload.payload.sourceClientId}-peer`,
        changedAt: new Date().toISOString(),
        reason: 'update-einheit',
      },
    };
    hoisted.emitMessage(Buffer.from(JSON.stringify(remotePayload), 'utf8'), '192.168.1.22', 41235);
    expect(onRemoteChange).toHaveBeenCalledTimes(1);
  });
});
