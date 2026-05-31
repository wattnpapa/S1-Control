import crypto from 'node:crypto';
import type { EinsatzWriteCtx } from '../../json-store/types';
import type { AbschnittNode } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived } from '../einsatz-transaction-guards';
import { validateAbschnittParent } from './validations';

export function createAbschnitt(
  ctx: EinsatzWriteCtx,
  input: { einsatzId: string; name: string; parentId?: string | null; systemTyp: AbschnittNode['systemTyp'] },
): AbschnittNode {
  ensureNotArchived(ctx, input.einsatzId);
  const item: AbschnittNode = {
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    name: input.name,
    parentId: input.parentId ?? null,
    systemTyp: input.systemTyp,
  };
  ctx.einsatz.abschnitte.push({
    id: item.id,
    einsatzId: item.einsatzId,
    name: item.name,
    parentId: item.parentId,
    systemTyp: item.systemTyp,
    version: 0,
  });
  return item;
}

export function updateAbschnitt(
  ctx: EinsatzWriteCtx,
  input: {
    einsatzId: string;
    abschnittId: string;
    name: string;
    parentId?: string | null;
    systemTyp: AbschnittNode['systemTyp'];
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const idx = ctx.einsatz.abschnitte.findIndex(
    (a) => a.id === input.abschnittId && a.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Abschnitt nicht gefunden', 'NOT_FOUND');
  }
  const nextParentId = input.parentId ?? null;
  validateAbschnittParent(ctx, {
    einsatzId: input.einsatzId,
    abschnittId: input.abschnittId,
    parentId: nextParentId,
  });
  const prev = ctx.einsatz.abschnitte[idx]!;
  ctx.einsatz.abschnitte[idx] = {
    ...prev,
    name: input.name,
    parentId: nextParentId,
    systemTyp: input.systemTyp,
    version: prev.version + 1,
  };
}
