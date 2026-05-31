import type { EinsatzWriteCtx } from '../../json-store/types';
import type { EinheitListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ORGANISATIONS } from '../einsatz-transaction-guards';

export function validateOrganisation(organisation: EinheitListItem['organisation']): void {
  if (!ORGANISATIONS.includes(organisation)) {
    throw new AppError('Organisation ist ungültig', 'VALIDATION');
  }
}

export function validateAbschnittParent(
  ctx: EinsatzWriteCtx,
  input: { einsatzId: string; abschnittId: string; parentId: string | null },
): void {
  if (!input.parentId) {
    return;
  }
  if (input.parentId === input.abschnittId) {
    throw new AppError('Abschnitt kann nicht sein eigener Parent sein', 'VALIDATION');
  }
  const abschnitte = ctx.einsatz.abschnitte;
  const parent = abschnitte.find((a) => a.id === input.parentId);
  if (!parent || parent.einsatzId !== input.einsatzId) {
    throw new AppError('Parent-Abschnitt nicht gefunden', 'NOT_FOUND');
  }
  let cursor: string | null = parent.parentId;
  while (cursor) {
    if (cursor === input.abschnittId) {
      throw new AppError('Parent-Abschnitt würde einen Zyklus erzeugen', 'VALIDATION');
    }
    const next = abschnitte.find((a) => a.id === cursor && a.einsatzId === input.einsatzId);
    cursor = next?.parentId ?? null;
  }
}

export function validateHelferRolle(rolle: string): void {
  if (!['FUEHRER', 'UNTERFUEHRER', 'HELFER'].includes(rolle)) {
    throw new AppError('Rolle des Helfers ist ungültig', 'VALIDATION');
  }
}

export function validateHelferGeschlecht(geschlecht: string): void {
  if (!['MAENNLICH', 'WEIBLICH'].includes(geschlecht)) {
    throw new AppError('Geschlecht des Helfers ist ungültig', 'VALIDATION');
  }
}

export function validateLinkedEinheitId(aktuelleEinsatzEinheitId: string): void {
  if (!aktuelleEinsatzEinheitId) {
    throw new AppError('Zugeordnete Einheit ist erforderlich', 'VALIDATION');
  }
}

export function validateFahrzeugName(name: string): void {
  if (!name.trim()) {
    throw new AppError('Fahrzeugname ist erforderlich', 'VALIDATION');
  }
}

export function validateSplitStrength(fuehrung: number, unterfuehrung: number, mannschaft: number): void {
  if (fuehrung < 0 || unterfuehrung < 0 || mannschaft < 0) {
    throw new AppError('Split-Stärke muss >= 0 sein', 'VALIDATION');
  }
}

export function validateSplitName(nameImEinsatz: string): void {
  if (!nameImEinsatz.trim()) {
    throw new AppError('Name der Teileinheit ist erforderlich', 'VALIDATION');
  }
}
