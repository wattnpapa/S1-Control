import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatzEinheit, einsatzFahrzeug, stammdatenFahrzeug } from '../../db/schema';
import type { FahrzeugListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import { validateFahrzeugName, validateLinkedEinheitId } from './validations';

/**
 * Creates one Fahrzeug assigned to an Einheit.
 */
export function createFahrzeug(
  ctx: DbContext,
  input: {
    einsatzId: string;
    name: string;
    aktuelleEinsatzEinheitId: string;
    status?: FahrzeugListItem['status'];
    kennzeichen?: string;
    stammdatenFahrzeugId?: string;
    funkrufname?: string;
    stanKonform?: boolean | null;
    sondergeraet?: string;
    nutzlast?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  validateLinkedEinheitId(input.aktuelleEinsatzEinheitId);

  ctx.db.transaction((tx) => {
    const einheit = tx
      .select({
        id: einsatzEinheit.id,
        aktuellerAbschnittId: einsatzEinheit.aktuellerAbschnittId,
      })
      .from(einsatzEinheit)
      .where(and(eq(einsatzEinheit.id, input.aktuelleEinsatzEinheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
      .get();
    if (!einheit) {
      throw new AppError('Zugeordnete Einheit nicht gefunden', 'NOT_FOUND');
    }

    let stammdatenFahrzeugId = input.stammdatenFahrzeugId;
    if (!stammdatenFahrzeugId) {
      stammdatenFahrzeugId = crypto.randomUUID();
      tx.insert(stammdatenFahrzeug)
        .values({
          id: stammdatenFahrzeugId,
          name: input.name,
          kennzeichen: input.kennzeichen,
          standardPiktogrammKey: 'mtw',
          stammdatenEinheitId: null,
        })
        .run();
    }

    tx.insert(einsatzFahrzeug)
      .values({
        id: crypto.randomUUID(),
        einsatzId: input.einsatzId,
        stammdatenFahrzeugId,
        parentEinsatzFahrzeugId: null,
        aktuelleEinsatzEinheitId: einheit.id,
        aktuellerAbschnittId: einheit.aktuellerAbschnittId,
        funkrufname: normalizeOptionalText(input.funkrufname),
        stanKonform: input.stanKonform ?? null,
        sondergeraet: normalizeOptionalText(input.sondergeraet),
        nutzlast: normalizeOptionalText(input.nutzlast),
        status: input.status ?? 'AKTIV',
        erstellt: nowIso(),
        entfernt: null,
      })
      .run();
  });
}

/**
 * Synchronizes fahrzeug master data row.
 */
function upsertFahrzeugStammdaten(
  tx: DbContext['db'],
  input: {
    fahrzeugId: string;
    existingStammdatenId: string | null;
    name: string;
    kennzeichen?: string;
  },
): string {
  const name = input.name.trim();
  const kennzeichen = input.kennzeichen?.trim() || null;
  const nextStammdatenId = input.existingStammdatenId ?? crypto.randomUUID();

  if (!input.existingStammdatenId) {
    tx.insert(stammdatenFahrzeug)
      .values({
        id: nextStammdatenId,
        name,
        kennzeichen,
        standardPiktogrammKey: 'mtw',
        stammdatenEinheitId: null,
      })
      .run();

    tx.update(einsatzFahrzeug)
      .set({ stammdatenFahrzeugId: nextStammdatenId })
      .where(eq(einsatzFahrzeug.id, input.fahrzeugId))
      .run();
    return nextStammdatenId;
  }

  tx.update(stammdatenFahrzeug)
    .set({
      name,
      kennzeichen,
    })
    .where(eq(stammdatenFahrzeug.id, nextStammdatenId))
    .run();
  return nextStammdatenId;
}

/**
 * Updates one Fahrzeug and keeps assignment in sync.
 */
export function updateFahrzeug(
  ctx: DbContext,
  input: {
    einsatzId: string;
    fahrzeugId: string;
    name: string;
    aktuelleEinsatzEinheitId: string;
    status?: FahrzeugListItem['status'];
    kennzeichen?: string;
    funkrufname?: string;
    stanKonform?: boolean | null;
    sondergeraet?: string;
    nutzlast?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  validateLinkedEinheitId(input.aktuelleEinsatzEinheitId);
  validateFahrzeugName(input.name);

  ctx.db.transaction((tx) => {
    const fahrzeug = tx
      .select({
        id: einsatzFahrzeug.id,
        stammdatenFahrzeugId: einsatzFahrzeug.stammdatenFahrzeugId,
      })
      .from(einsatzFahrzeug)
      .where(and(eq(einsatzFahrzeug.id, input.fahrzeugId), eq(einsatzFahrzeug.einsatzId, input.einsatzId)))
      .get();
    if (!fahrzeug) {
      throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
    }

    const einheit = tx
      .select({
        id: einsatzEinheit.id,
        aktuellerAbschnittId: einsatzEinheit.aktuellerAbschnittId,
      })
      .from(einsatzEinheit)
      .where(and(eq(einsatzEinheit.id, input.aktuelleEinsatzEinheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
      .get();
    if (!einheit) {
      throw new AppError('Zugeordnete Einheit nicht gefunden', 'NOT_FOUND');
    }

    upsertFahrzeugStammdaten(tx, {
      fahrzeugId: input.fahrzeugId,
      existingStammdatenId: fahrzeug.stammdatenFahrzeugId,
      name: input.name,
      kennzeichen: input.kennzeichen,
    });

    tx.update(einsatzFahrzeug)
      .set({
        aktuelleEinsatzEinheitId: einheit.id,
        aktuellerAbschnittId: einheit.aktuellerAbschnittId,
        funkrufname: normalizeOptionalText(input.funkrufname),
        stanKonform: input.stanKonform ?? null,
        sondergeraet: normalizeOptionalText(input.sondergeraet),
        nutzlast: normalizeOptionalText(input.nutzlast),
        status: input.status ?? 'AKTIV',
      })
      .where(eq(einsatzFahrzeug.id, input.fahrzeugId))
      .run();
  });
}
