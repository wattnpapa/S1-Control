import { eq } from 'drizzle-orm';
import type { OrganisationKey } from '../../shared/types';
import type { DbContext } from '../db/connection';
import { einsatz } from '../db/schema';
import { AppError } from './errors';

export const ORGANISATIONS: OrganisationKey[] = [
  'THW',
  'FEUERWEHR',
  'POLIZEI',
  'BUNDESWEHR',
  'REGIE',
  'DRK',
  'ASB',
  'JOHANNITER',
  'MALTESER',
  'DLRG',
  'BERGWACHT',
  'MHD',
  'RETTUNGSDIENST_KOMMUNAL',
  'SONSTIGE',
];

/**
 * Handles Now Iso.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Handles Normalize Optional Text.
 */
export function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Handles Ensure Not Archived.
 */
export function ensureNotArchived(ctx: DbContext, einsatzId: string): void {
  const row = ctx.db.select({ status: einsatz.status }).from(einsatz).where(eq(einsatz.id, einsatzId)).get();
  if (!row) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
  if (row.status === 'ARCHIVIERT') {
    throw new AppError('Einsatz ist archiviert und nur lesbar', 'ARCHIVED');
  }
}
