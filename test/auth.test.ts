import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { benutzer } from '../src/main/db/schema';
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
    try {
      ensureDefaultAdmin(ctx);
      ensureDefaultAdmin(ctx);

      const rows = ctx.db.select().from(benutzer).where(eq(benutzer.name, 'admin')).all();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.aktiv).toBe(true);
    } finally {
      ctx.sqlite.close();
    }
  });

  describe('login', () => {
    let ctx = createTestDb('s1-control-auth-login-');

    beforeEach(() => {
      ctx.sqlite.close();
      ctx = createTestDb('s1-control-auth-login-');
    });

    it('returns session user for valid credentials', () => {
      ctx.db
        .insert(benutzer)
        .values({
          id: crypto.randomUUID(),
          name: 's1',
          rolle: 'S1',
          passwortHash: hashPassword('pw'),
          aktiv: true,
        })
        .run();

      const session = login(ctx, 's1', 'pw');
      expect(session.name).toBe('s1');
      expect(session.rolle).toBe('S1');
    });

    it('fails for inactive user', () => {
      ctx.db
        .insert(benutzer)
        .values({
          id: crypto.randomUUID(),
          name: 'viewer',
          rolle: 'VIEWER',
          passwortHash: hashPassword('pw'),
          aktiv: false,
        })
        .run();

      expect(() => login(ctx, 'viewer', 'pw')).toThrow(AppError);
    });

    it('fails for wrong password', () => {
      ctx.db
        .insert(benutzer)
        .values({
          id: crypto.randomUUID(),
          name: 'admin2',
          rolle: 'ADMIN',
          passwortHash: hashPassword('pw'),
          aktiv: true,
        })
        .run();

      expect(() => login(ctx, 'admin2', 'bad')).toThrow('Passwort ist ungültig');
    });
  });
});

