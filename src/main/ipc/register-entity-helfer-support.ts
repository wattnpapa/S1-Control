import { eq } from 'drizzle-orm';
import { einsatzEinheitHelfer } from '../db/schema';
import type { DbContext } from '../db/connection';

/**
 * Resolves the parent unit id for a helper record.
 */
export function resolveHelferEinheitId(ctx: DbContext, helferId: string): string {
  const helfer = ctx.db
    .select({ einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId })
    .from(einsatzEinheitHelfer)
    .where(eq(einsatzEinheitHelfer.id, helferId))
    .get();
  if (!helfer) {
    throw new Error('Helfer nicht gefunden.');
  }
  return helfer.einsatzEinheitId;
}
