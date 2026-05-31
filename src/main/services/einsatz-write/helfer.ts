import crypto from 'node:crypto';
import type { EinsatzWriteCtx } from '../../json-store/types';
import type { EinheitHelfer } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import { validateHelferGeschlecht, validateHelferRolle } from './validations';

export function createEinheitHelfer(
  ctx: EinsatzWriteCtx,
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

  const einheit = ctx.einsatz.einheiten.find(
    (e) => e.id === input.einsatzEinheitId && e.einsatzId === input.einsatzId,
  );
  if (!einheit) {
    throw new AppError('Einheit für Helfer nicht gefunden', 'NOT_FOUND');
  }

  const now = nowIso();
  ctx.einsatz.helfer.push({
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
  });
}

export function updateEinheitHelfer(
  ctx: EinsatzWriteCtx,
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

  const idx = ctx.einsatz.helfer.findIndex(
    (h) => h.id === input.helferId && h.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Helfer nicht gefunden', 'NOT_FOUND');
  }
  const prev = ctx.einsatz.helfer[idx]!;
  ctx.einsatz.helfer[idx] = {
    ...prev,
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
  };
}

export function deleteEinheitHelfer(
  ctx: EinsatzWriteCtx,
  input: { einsatzId: string; helferId: string },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const idx = ctx.einsatz.helfer.findIndex(
    (h) => h.id === input.helferId && h.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Helfer nicht gefunden', 'NOT_FOUND');
  }
  ctx.einsatz.helfer.splice(idx, 1);
}
