import crypto from 'node:crypto';
import type { EinsatzWriteCtx } from '../../json-store/types';
import type { FahrzeugListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import { validateFahrzeugName, validateLinkedEinheitId } from './validations';

export function createFahrzeug(
  ctx: EinsatzWriteCtx,
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

  const einheit = ctx.einsatz.einheiten.find(
    (e) => e.id === input.aktuelleEinsatzEinheitId && e.einsatzId === input.einsatzId,
  );
  if (!einheit) {
    throw new AppError('Zugeordnete Einheit nicht gefunden', 'NOT_FOUND');
  }

  ctx.einsatz.fahrzeuge.push({
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    parentEinsatzFahrzeugId: null,
    aktuelleEinsatzEinheitId: einheit.id,
    aktuellerAbschnittId: einheit.aktuellerAbschnittId,
    name: input.name.trim(),
    kennzeichen: input.kennzeichen?.trim() || null,
    standardPiktogrammKey: 'mtw',
    funkrufname: normalizeOptionalText(input.funkrufname),
    stanKonform: input.stanKonform ?? null,
    sondergeraet: normalizeOptionalText(input.sondergeraet),
    nutzlast: normalizeOptionalText(input.nutzlast),
    status: input.status ?? 'AKTIV',
    erstellt: nowIso(),
    entfernt: null,
    version: 0,
  });
}

export function updateFahrzeug(
  ctx: EinsatzWriteCtx,
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

  const idx = ctx.einsatz.fahrzeuge.findIndex(
    (f) => f.id === input.fahrzeugId && f.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
  }

  const einheit = ctx.einsatz.einheiten.find(
    (e) => e.id === input.aktuelleEinsatzEinheitId && e.einsatzId === input.einsatzId,
  );
  if (!einheit) {
    throw new AppError('Zugeordnete Einheit nicht gefunden', 'NOT_FOUND');
  }

  const prev = ctx.einsatz.fahrzeuge[idx]!;
  ctx.einsatz.fahrzeuge[idx] = {
    ...prev,
    name: input.name.trim(),
    kennzeichen: input.kennzeichen?.trim() || null,
    aktuelleEinsatzEinheitId: einheit.id,
    aktuellerAbschnittId: einheit.aktuellerAbschnittId,
    funkrufname: normalizeOptionalText(input.funkrufname),
    stanKonform: input.stanKonform ?? null,
    sondergeraet: normalizeOptionalText(input.sondergeraet),
    nutzlast: normalizeOptionalText(input.nutzlast),
    status: input.status ?? 'AKTIV',
    version: prev.version + 1,
  };
}
