import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatz, einsatzAbschnitt } from '../../db/schema';
import type { EinsatzListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { nowIso } from '../einsatz-transaction-guards';

/**
 * Creates an Einsatz with default FüSt section.
 */
export function createEinsatz(ctx: DbContext, input: { name: string; fuestName: string }): EinsatzListItem {
  const created: EinsatzListItem = {
    id: crypto.randomUUID(),
    name: input.name,
    fuestName: input.fuestName,
    start: nowIso(),
    end: null,
    status: 'AKTIV',
  };

  ctx.db.transaction((tx) => {
    tx.insert(einsatz).values(created).run();
    tx.insert(einsatzAbschnitt)
      .values({
        id: crypto.randomUUID(),
        einsatzId: created.id,
        name: input.fuestName,
        parentId: null,
        systemTyp: 'FUEST',
      })
      .run();
  });

  return created;
}

/**
 * Archives one Einsatz and sets end timestamp.
 */
export function archiveEinsatz(ctx: DbContext, einsatzId: string): void {
  const updated = ctx.db
    .update(einsatz)
    .set({ status: 'ARCHIVIERT', end: nowIso() })
    .where(eq(einsatz.id, einsatzId))
    .run();

  if (!updated.changes) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
}
