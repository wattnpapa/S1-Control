import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatzEinheit, einsatzEinheitHelfer } from '../../db/schema';
import type { EinheitHelfer } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import { validateHelferGeschlecht, validateHelferRolle } from './validations';

/**
 * Creates one helper row for an Einheit.
 */
export function createEinheitHelfer(
  ctx: DbContext,
  input: {
    einsatzId: string;
    einsatzEinheitId: string;
    name: string;
    rolle: EinheitHelfer['rolle'];
    geschlecht?: EinheitHelfer['geschlecht'];
    anzahl?: number;
    funktion?: string;
    telefon?: string;
    erreichbarkeit?: string;
    vegetarisch?: boolean;
    bemerkung?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const anzahl = Math.max(1, Math.round(input.anzahl ?? 1));
  validateHelferRolle(input.rolle);
  const geschlecht = input.geschlecht ?? 'MAENNLICH';
  validateHelferGeschlecht(geschlecht);

  const einheit = ctx.db
    .select({ id: einsatzEinheit.id })
    .from(einsatzEinheit)
    .where(and(eq(einsatzEinheit.id, input.einsatzEinheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
    .get();
  if (!einheit) {
    throw new AppError('Einheit für Helfer nicht gefunden', 'NOT_FOUND');
  }

  const now = nowIso();
  ctx.db
    .insert(einsatzEinheitHelfer)
    .values({
      id: crypto.randomUUID(),
      einsatzId: input.einsatzId,
      einsatzEinheitId: input.einsatzEinheitId,
      name: input.name.trim() || 'N.N.',
      rolle: input.rolle,
      geschlecht,
      anzahl,
      funktion: normalizeOptionalText(input.funktion),
      telefon: normalizeOptionalText(input.telefon),
      erreichbarkeit: normalizeOptionalText(input.erreichbarkeit),
      vegetarisch: input.vegetarisch ?? false,
      bemerkung: normalizeOptionalText(input.bemerkung),
      erstellt: now,
      aktualisiert: now,
    })
    .run();
}

/**
 * Updates one helper row for an Einheit.
 */
export function updateEinheitHelfer(
  ctx: DbContext,
  input: {
    einsatzId: string;
    helferId: string;
    name: string;
    rolle: EinheitHelfer['rolle'];
    geschlecht?: EinheitHelfer['geschlecht'];
    anzahl?: number;
    funktion?: string;
    telefon?: string;
    erreichbarkeit?: string;
    vegetarisch?: boolean;
    bemerkung?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const anzahl = Math.max(1, Math.round(input.anzahl ?? 1));
  validateHelferRolle(input.rolle);
  const geschlecht = input.geschlecht ?? 'MAENNLICH';
  validateHelferGeschlecht(geschlecht);

  const row = ctx.db
    .select({ id: einsatzEinheitHelfer.id })
    .from(einsatzEinheitHelfer)
    .where(and(eq(einsatzEinheitHelfer.id, input.helferId), eq(einsatzEinheitHelfer.einsatzId, input.einsatzId)))
    .get();
  if (!row) {
    throw new AppError('Helfer nicht gefunden', 'NOT_FOUND');
  }

  ctx.db
    .update(einsatzEinheitHelfer)
    .set({
      name: input.name.trim() || 'N.N.',
      rolle: input.rolle,
      geschlecht,
      anzahl,
      funktion: normalizeOptionalText(input.funktion),
      telefon: normalizeOptionalText(input.telefon),
      erreichbarkeit: normalizeOptionalText(input.erreichbarkeit),
      vegetarisch: input.vegetarisch ?? false,
      bemerkung: normalizeOptionalText(input.bemerkung),
      aktualisiert: nowIso(),
    })
    .where(eq(einsatzEinheitHelfer.id, input.helferId))
    .run();
}

/**
 * Deletes one helper row for an Einsatz.
 */
export function deleteEinheitHelfer(
  ctx: DbContext,
  input: { einsatzId: string; helferId: string },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const result = ctx.db
    .delete(einsatzEinheitHelfer)
    .where(and(eq(einsatzEinheitHelfer.id, input.helferId), eq(einsatzEinheitHelfer.einsatzId, input.einsatzId)))
    .run();
  if (!result.changes) {
    throw new AppError('Helfer nicht gefunden', 'NOT_FOUND');
  }
}
