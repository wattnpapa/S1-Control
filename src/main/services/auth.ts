import crypto from 'node:crypto';
import type { DbContext } from '../db/connection';
import type { BenutzerRolle, SessionUser } from '../../shared/types';
import type { SystemJsonFile } from '../json-store/types';
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
  ensureDefaultAdminInSystem(ctx.system);
}

export function ensureDefaultAdminInSystem(system: SystemJsonFile): void {
  if (system.benutzer.some((b) => b.name === 'admin')) {
    return;
  }
  system.benutzer.push({
    id: crypto.randomUUID(),
    name: 'admin',
    rolle: 'ADMIN',
    passwortHash: hashPassword('admin'),
    aktiv: true,
  });
}

export function login(ctx: DbContext, name: string, passwort: string): SessionUser {
  const row = ctx.system.benutzer.find((b) => b.name === name);
  if (!row || !row.aktiv) {
    throw new AppError('Benutzer nicht gefunden oder deaktiviert', 'AUTH_FAILED');
  }
  if (!verifyPassword(passwort, row.passwortHash)) {
    throw new AppError('Passwort ist ungültig', 'AUTH_FAILED');
  }
  return { id: row.id, name: row.name, rolle: row.rolle as BenutzerRolle };
}

export function ensureSessionUserRecord(ctx: DbContext, user: SessionUser): SessionUser {
  return ensureSessionUserInSystem(ctx.system, user);
}

export function ensureSessionUserInSystem(system: SystemJsonFile, user: SessionUser): SessionUser {
  const byId = system.benutzer.find((b) => b.id === user.id);
  if (byId) {
    return user;
  }
  const byName = system.benutzer.find((b) => b.name === user.name);
  if (byName) {
    return { id: byName.id, name: byName.name, rolle: byName.rolle as BenutzerRolle };
  }
  system.benutzer.push({
    id: user.id,
    name: user.name,
    rolle: user.rolle,
    passwortHash: hashPassword(crypto.randomUUID()),
    aktiv: true,
  });
  return user;
}
