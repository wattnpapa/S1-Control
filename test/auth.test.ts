import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../src/main/services/errors';
import { ensureDefaultAdmin, hashPassword, login, verifyPassword } from '../src/main/services/auth';
import { createTestDb } from './helpers/db';

describe('auth service', () => {
  it('hashes and verifies password', () => {
    const hashed = hashPassword('secret');
    expect(hashed.startsWith('scrypt$')).toBe(true);
    expect(verifyPassword('secret', hashed)).toBe(true);
    expect(verifyPassword('wrong', hashed)).toBe(false);
    expect(verifyPassword('secret', 'invalid-format')).toBe(false);
  });

  it('creates default admin only once', () => {
    const ctx = createTestDb('s1-control-auth-');
    ensureDefaultAdmin(ctx);
    ensureDefaultAdmin(ctx);

    const rows = ctx.system.benutzer.filter((b) => b.name === 'admin');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.aktiv).toBe(true);
  });

  describe('login', () => {
    let ctx = createTestDb('s1-control-auth-login-');

    beforeEach(() => {
      ctx = createTestDb('s1-control-auth-login-');
    });

    it('returns session user for valid credentials', () => {
      ctx.system.benutzer.push({
        id: crypto.randomUUID(),
        name: 's1',
        rolle: 'S1',
        passwortHash: hashPassword('pw'),
        aktiv: true,
      });

      const session = login(ctx, 's1', 'pw');
      expect(session.name).toBe('s1');
      expect(session.rolle).toBe('S1');
    });

    it('fails for inactive user', () => {
      ctx.system.benutzer.push({
        id: crypto.randomUUID(),
        name: 'viewer',
        rolle: 'VIEWER',
        passwortHash: hashPassword('pw'),
        aktiv: false,
      });

      expect(() => login(ctx, 'viewer', 'pw')).toThrow(AppError);
    });

    it('fails for wrong password', () => {
      ctx.system.benutzer.push({
        id: crypto.randomUUID(),
        name: 'admin2',
        rolle: 'ADMIN',
        passwortHash: hashPassword('pw'),
        aktiv: true,
      });

      expect(() => login(ctx, 'admin2', 'bad')).toThrow('Passwort ist ungültig');
    });
  });
});
