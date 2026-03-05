import { and, eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatzAbschnitt } from '../../db/schema';
import type { EinheitListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ORGANISATIONS } from '../einsatz-transaction-guards';

/**
 * Validates organisation key against allowed list.
 */
export function validateOrganisation(organisation: EinheitListItem['organisation']): void {
  if (!ORGANISATIONS.includes(organisation)) {
    throw new AppError('Organisation ist ungültig', 'VALIDATION');
  }
}

/**
 * Validates parent selection of an Abschnitt.
 */
export function validateAbschnittParent(
  ctx: DbContext,
  input: { einsatzId: string; abschnittId: string; parentId: string | null },
): void {
  if (!input.parentId) {
    return;
  }
  if (input.parentId === input.abschnittId) {
    throw new AppError('Abschnitt kann nicht sein eigener Parent sein', 'VALIDATION');
  }

  const parent = ctx.db
    .select({ id: einsatzAbschnitt.id, parentId: einsatzAbschnitt.parentId, einsatzId: einsatzAbschnitt.einsatzId })
    .from(einsatzAbschnitt)
    .where(eq(einsatzAbschnitt.id, input.parentId))
    .get();
  if (!parent || parent.einsatzId !== input.einsatzId) {
    throw new AppError('Parent-Abschnitt nicht gefunden', 'NOT_FOUND');
  }

  let cursor: string | null = parent.parentId;
  while (cursor) {
    if (cursor === input.abschnittId) {
      throw new AppError('Parent-Abschnitt würde einen Zyklus erzeugen', 'VALIDATION');
    }
    const next = ctx.db
      .select({ parentId: einsatzAbschnitt.parentId })
      .from(einsatzAbschnitt)
      .where(and(eq(einsatzAbschnitt.id, cursor), eq(einsatzAbschnitt.einsatzId, input.einsatzId)))
      .get();
    cursor = next?.parentId ?? null;
  }
}

/**
 * Validates helper role enum.
 */
export function validateHelferRolle(rolle: string): void {
  if (!['FUEHRER', 'UNTERFUEHRER', 'HELFER'].includes(rolle)) {
    throw new AppError('Rolle des Helfers ist ungültig', 'VALIDATION');
  }
}

/**
 * Validates helper gender enum.
 */
export function validateHelferGeschlecht(geschlecht: string): void {
  if (!['MAENNLICH', 'WEIBLICH'].includes(geschlecht)) {
    throw new AppError('Geschlecht des Helfers ist ungültig', 'VALIDATION');
  }
}

/**
 * Validates required linked unit id.
 */
export function validateLinkedEinheitId(aktuelleEinsatzEinheitId: string): void {
  if (!aktuelleEinsatzEinheitId) {
    throw new AppError('Zugeordnete Einheit ist erforderlich', 'VALIDATION');
  }
}

/**
 * Validates vehicle name.
 */
export function validateFahrzeugName(name: string): void {
  if (!name.trim()) {
    throw new AppError('Fahrzeugname ist erforderlich', 'VALIDATION');
  }
}

/**
 * Validates split strength values.
 */
export function validateSplitStrength(fuehrung: number, unterfuehrung: number, mannschaft: number): void {
  if (fuehrung < 0 || unterfuehrung < 0 || mannschaft < 0) {
    throw new AppError('Split-Stärke muss >= 0 sein', 'VALIDATION');
  }
}

/**
 * Validates non-empty split target name.
 */
export function validateSplitName(nameImEinsatz: string): void {
  if (!nameImEinsatz.trim()) {
    throw new AppError('Name der Teileinheit ist erforderlich', 'VALIDATION');
  }
}
