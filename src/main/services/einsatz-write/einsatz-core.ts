import crypto from 'node:crypto';
import type { EinsatzWriteCtx } from '../../json-store/types';
import type { EinsatzListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { nowIso } from '../einsatz-transaction-guards';

export function createEinsatz(ctx: EinsatzWriteCtx, input: { name: string; fuestName: string }): EinsatzListItem {
  const created: EinsatzListItem = {
    id: crypto.randomUUID(),
    name: input.name,
    fuestName: input.fuestName,
    start: nowIso(),
    end: null,
    status: 'AKTIV',
  };
  ctx.einsatz.einsatz = { ...created, uebergeordneteFuestName: null };
  ctx.einsatz.abschnitte.push({
    id: crypto.randomUUID(),
    einsatzId: created.id,
    name: input.fuestName,
    parentId: null,
    systemTyp: 'FUEST',
    version: 0,
  });
  return created;
}

export function archiveEinsatz(ctx: EinsatzWriteCtx, einsatzId: string): void {
  if (ctx.einsatz.einsatz.id !== einsatzId) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
  ctx.einsatz.einsatz.status = 'ARCHIVIERT';
  ctx.einsatz.einsatz.end = nowIso();
}
