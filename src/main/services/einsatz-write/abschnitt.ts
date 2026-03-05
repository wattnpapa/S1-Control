import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatzAbschnitt } from '../../db/schema';
import type { AbschnittNode } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived } from '../einsatz-transaction-guards';
import { validateAbschnittParent } from './validations';

/**
 * Creates one Abschnitt under an Einsatz.
 */
export function createAbschnitt(
  ctx: DbContext,
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

  ctx.db.insert(einsatzAbschnitt).values(item).run();
  return item;
}

/**
 * Updates one Abschnitt record.
 */
export function updateAbschnitt(
  ctx: DbContext,
  input: {
    einsatzId: string;
    abschnittId: string;
    name: string;
    parentId?: string | null;
    systemTyp: AbschnittNode['systemTyp'];
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const current = ctx.db
    .select({ id: einsatzAbschnitt.id })
    .from(einsatzAbschnitt)
    .where(and(eq(einsatzAbschnitt.id, input.abschnittId), eq(einsatzAbschnitt.einsatzId, input.einsatzId)))
    .get();
  if (!current) {
    throw new AppError('Abschnitt nicht gefunden', 'NOT_FOUND');
  }

  const nextParentId = input.parentId ?? null;
  validateAbschnittParent(ctx, {
    einsatzId: input.einsatzId,
    abschnittId: input.abschnittId,
    parentId: nextParentId,
  });

  ctx.db
    .update(einsatzAbschnitt)
    .set({
      name: input.name,
      parentId: nextParentId,
      systemTyp: input.systemTyp,
    })
    .where(eq(einsatzAbschnitt.id, input.abschnittId))
    .run();
}
