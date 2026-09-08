import type { DbContext } from '../db/connection';

export function resolveHelferEinheitId(ctx: DbContext, helferId: string): string {
  const helfer = ctx.einsatz.helfer.find((h) => h.id === helferId);
  if (!helfer) {
    throw new Error('Helfer nicht gefunden.');
  }
  return helfer.einsatzEinheitId;
}
