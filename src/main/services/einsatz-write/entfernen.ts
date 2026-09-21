import crypto from 'node:crypto';
import type { DbContext } from '../../db/connection';
import type { JsonAbschnitt } from '../../json-store/types';
import type { SessionUser } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived } from '../einsatz';

/**
 * Nutzlast für das Zurücknehmen eines Entfernens.
 */
export interface RemovePayload {
  entityTyp: 'EINHEIT' | 'FAHRZEUG' | 'ABSCHNITT';
  entityId: string;
  name: string;
  /** Vollständiger Datensatz eines entfernten Abschnitts, für die Rücknahme. */
  abschnitt?: JsonAbschnitt;
}

function nowIso(): string {
  return new Date().toISOString();
}

function protokolliere(
  ctx: DbContext,
  einsatzId: string,
  user: SessionUser,
  payload: RemovePayload,
): void {
  ctx.einsatz.commandLog.push({
    id: crypto.randomUUID(),
    einsatzId,
    benutzerId: user.id,
    commandTyp: 'REMOVE_ENTITY',
    payloadJson: JSON.stringify(payload),
    timestamp: nowIso(),
    undone: false,
  });
}

/**
 * Nimmt eine Einheit aus dem Einsatz. Der Datensatz bleibt mit Zeitstempel
 * erhalten, damit die Einsatzdokumentation vollständig bleibt.
 */
export function removeEinheit(
  ctx: DbContext,
  input: { einsatzId: string; einheitId: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const einheit = ctx.einsatz.einheiten.find(
    (e) => e.id === input.einheitId && e.einsatzId === input.einsatzId,
  );
  if (!einheit) {
    throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
  }
  if (einheit.aufgeloest) {
    return;
  }
  const gebundeneFahrzeuge = ctx.einsatz.fahrzeuge.filter(
    (f) => f.aktuelleEinsatzEinheitId === einheit.id && !f.entfernt,
  );
  if (gebundeneFahrzeuge.length > 0) {
    throw new AppError(
      `Der Einheit sind noch ${gebundeneFahrzeuge.length} Fahrzeug(e) zugeordnet. ` +
        'Bitte diese zuerst einer anderen Einheit zuordnen oder entfernen.',
      'INVALID_STATE',
    );
  }
  einheit.aufgeloest = nowIso();
  protokolliere(ctx, input.einsatzId, user, {
    entityTyp: 'EINHEIT',
    entityId: einheit.id,
    name: einheit.nameImEinsatz,
  });
}

/**
 * Nimmt ein Fahrzeug aus dem Einsatz.
 */
export function removeFahrzeug(
  ctx: DbContext,
  input: { einsatzId: string; fahrzeugId: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const fahrzeug = ctx.einsatz.fahrzeuge.find(
    (f) => f.id === input.fahrzeugId && f.einsatzId === input.einsatzId,
  );
  if (!fahrzeug) {
    throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
  }
  if (fahrzeug.entfernt) {
    return;
  }
  fahrzeug.entfernt = nowIso();
  protokolliere(ctx, input.einsatzId, user, {
    entityTyp: 'FAHRZEUG',
    entityId: fahrzeug.id,
    name: fahrzeug.name,
  });
}

/**
 * Löscht einen Abschnitt, sofern er weder Kräfte noch Unterabschnitte trägt.
 */
export function removeAbschnitt(
  ctx: DbContext,
  input: { einsatzId: string; abschnittId: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const abschnitt = ctx.einsatz.abschnitte.find(
    (a) => a.id === input.abschnittId && a.einsatzId === input.einsatzId,
  );
  if (!abschnitt) {
    throw new AppError('Abschnitt nicht gefunden', 'NOT_FOUND');
  }
  const kinder = ctx.einsatz.abschnitte.filter((a) => a.parentId === abschnitt.id);
  if (kinder.length > 0) {
    throw new AppError(
      `Der Abschnitt hat noch ${kinder.length} Unterabschnitt(e) und kann nicht entfernt werden.`,
      'INVALID_STATE',
    );
  }
  const einheiten = ctx.einsatz.einheiten.filter(
    (e) => e.aktuellerAbschnittId === abschnitt.id && !e.aufgeloest,
  );
  const fahrzeuge = ctx.einsatz.fahrzeuge.filter(
    (f) => f.aktuellerAbschnittId === abschnitt.id && !f.entfernt,
  );
  if (einheiten.length > 0 || fahrzeuge.length > 0) {
    throw new AppError(
      `Im Abschnitt stehen noch ${einheiten.length} Einheit(en) und ${fahrzeuge.length} Fahrzeug(e). ` +
        'Bitte diese zuerst verschieben.',
      'INVALID_STATE',
    );
  }
  ctx.einsatz.abschnitte = ctx.einsatz.abschnitte.filter((a) => a.id !== abschnitt.id);
  protokolliere(ctx, input.einsatzId, user, {
    entityTyp: 'ABSCHNITT',
    entityId: abschnitt.id,
    name: abschnitt.name,
    abschnitt: { ...abschnitt },
  });
}
