import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { DbContext } from '../db/connection';
import { benutzer } from '../db/schema';
import type { BenutzerRolle, SessionUser } from '../../shared/types';
import { AppError } from './errors';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keylen: 64,
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    })
    .toString('hex');

  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const calculated = crypto
    .scryptSync(password, salt, SCRYPT_PARAMS.keylen, {
      N: SCRYPT_PARAMS.N,
      r: SCRYPT_PARAMS.r,
      p: SCRYPT_PARAMS.p,
    })
    .toString('hex');

  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

export function ensureDefaultAdmin(ctx: DbContext): void {
  const existing = ctx.db.select().from(benutzer).where(eq(benutzer.name, 'admin')).get();
  if (existing) {
    return;
  }

  ctx.db.insert(benutzer).values({
    id: crypto.randomUUID(),
    name: 'admin',
    rolle: 'ADMIN',
    passwortHash: hashPassword('admin'),
    aktiv: true,
  }).run();
}

export function login(ctx: DbContext, name: string, passwort: string): SessionUser {
  const row = ctx.db.select().from(benutzer).where(eq(benutzer.name, name)).get();

  if (!row || !row.aktiv) {
    throw new AppError('Benutzer nicht gefunden oder deaktiviert', 'AUTH_FAILED');
  }

  if (!verifyPassword(passwort, row.passwortHash)) {
    throw new AppError('Passwort ist ungueltig', 'AUTH_FAILED');
  }

  return {
    id: row.id,
    name: row.name,
    rolle: row.rolle as BenutzerRolle,
  };
}
