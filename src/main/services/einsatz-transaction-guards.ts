import type { OrganisationKey } from '../../shared/types';
import type { EinsatzWriteCtx } from '../json-store/types';
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

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function ensureNotArchived(ctx: EinsatzWriteCtx, einsatzId: string): void {
  if (ctx.einsatz.einsatz.id !== einsatzId) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
  if (ctx.einsatz.einsatz.status === 'ARCHIVIERT') {
    throw new AppError('Einsatz ist archiviert und nur lesbar', 'ARCHIVED');
  }
}
