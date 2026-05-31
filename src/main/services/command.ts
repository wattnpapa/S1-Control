import crypto from 'node:crypto';
import type { DbContext } from '../db/connection';
import type { SessionUser } from '../../shared/types';
import { AppError } from './errors';
import { ensureNotArchived } from './einsatz';

function nowIso(): string {
  return new Date().toISOString();
}

interface MoveEinheitPayload {
  einheitId: string;
  vonAbschnittId: string;
  nachAbschnittId: string;
  kommentar?: string;
}

interface MoveFahrzeugPayload {
  fahrzeugId: string;
  vonAbschnittId: string;
  nachAbschnittId: string;
}

export function moveEinheit(
  ctx: DbContext,
  input: { einsatzId: string; einheitId: string; nachAbschnittId: string; kommentar?: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);

  const einheit = ctx.einsatz.einheiten.find(
    (e) => e.id === input.einheitId && e.einsatzId === input.einsatzId,
  );
  if (!einheit) {
    throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
  }
  if (einheit.aktuellerAbschnittId === input.nachAbschnittId) {
    return;
  }

  const vonAbschnittId = einheit.aktuellerAbschnittId;
  einheit.aktuellerAbschnittId = input.nachAbschnittId;

  ctx.einsatz.einheitBewegungen.push({
    id: crypto.randomUUID(),
    einsatzEinheitId: einheit.id,
    vonAbschnittId,
    nachAbschnittId: input.nachAbschnittId,
    zeitpunkt: nowIso(),
    benutzer: user.name,
    kommentar: input.kommentar ?? null,
  });

  const payload: MoveEinheitPayload = {
    einheitId: einheit.id,
    vonAbschnittId,
    nachAbschnittId: input.nachAbschnittId,
    kommentar: input.kommentar,
  };
  ctx.einsatz.commandLog.push({
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    benutzerId: user.id,
    commandTyp: 'MOVE_EINHEIT',
    payloadJson: JSON.stringify(payload),
    timestamp: nowIso(),
    undone: false,
  });
}

export function moveFahrzeug(
  ctx: DbContext,
  input: { einsatzId: string; fahrzeugId: string; nachAbschnittId: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);

  const fahrzeug = ctx.einsatz.fahrzeuge.find(
    (f) => f.id === input.fahrzeugId && f.einsatzId === input.einsatzId,
  );
  if (!fahrzeug) {
    throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
  }
  if (!fahrzeug.aktuellerAbschnittId) {
    throw new AppError('Fahrzeug hat keinen aktuellen Abschnitt', 'INVALID_STATE');
  }
  if (fahrzeug.aktuellerAbschnittId === input.nachAbschnittId) {
    return;
  }

  const vonAbschnittId = fahrzeug.aktuellerAbschnittId;
  fahrzeug.aktuellerAbschnittId = input.nachAbschnittId;

  ctx.einsatz.fahrzeugBewegungen.push({
    id: crypto.randomUUID(),
    einsatzFahrzeugId: fahrzeug.id,
    vonAbschnittId,
    nachAbschnittId: input.nachAbschnittId,
    zeitpunkt: nowIso(),
    benutzer: user.name,
  });

  const payload: MoveFahrzeugPayload = {
    fahrzeugId: fahrzeug.id,
    vonAbschnittId,
    nachAbschnittId: input.nachAbschnittId,
  };
  ctx.einsatz.commandLog.push({
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    benutzerId: user.id,
    commandTyp: 'MOVE_FAHRZEUG',
    payloadJson: JSON.stringify(payload),
    timestamp: nowIso(),
    undone: false,
  });
}

export function undoLastCommand(ctx: DbContext, einsatzId: string, user: SessionUser): boolean {
  ensureNotArchived(ctx, einsatzId);

  const command = [...ctx.einsatz.commandLog]
    .filter((c) => c.einsatzId === einsatzId && !c.undone)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

  if (!command) {
    return false;
  }

  if (command.commandTyp === 'MOVE_EINHEIT') {
    const payload = JSON.parse(command.payloadJson) as MoveEinheitPayload;
    const einheit = ctx.einsatz.einheiten.find((e) => e.id === payload.einheitId);
    if (einheit) {
      einheit.aktuellerAbschnittId = payload.vonAbschnittId;
    }
    ctx.einsatz.einheitBewegungen.push({
      id: crypto.randomUUID(),
      einsatzEinheitId: payload.einheitId,
      vonAbschnittId: payload.nachAbschnittId,
      nachAbschnittId: payload.vonAbschnittId,
      zeitpunkt: nowIso(),
      benutzer: `${user.name} (undo)`,
      kommentar: 'Undo MOVE_EINHEIT',
    });
  } else if (command.commandTyp === 'MOVE_FAHRZEUG') {
    const payload = JSON.parse(command.payloadJson) as MoveFahrzeugPayload;
    const fahrzeug = ctx.einsatz.fahrzeuge.find((f) => f.id === payload.fahrzeugId);
    if (fahrzeug) {
      fahrzeug.aktuellerAbschnittId = payload.vonAbschnittId;
    }
    ctx.einsatz.fahrzeugBewegungen.push({
      id: crypto.randomUUID(),
      einsatzFahrzeugId: payload.fahrzeugId,
      vonAbschnittId: payload.nachAbschnittId,
      nachAbschnittId: payload.vonAbschnittId,
      zeitpunkt: nowIso(),
      benutzer: `${user.name} (undo)`,
    });
  } else {
    throw new AppError('Undo für diesen Command-Typ noch nicht implementiert', 'UNSUPPORTED');
  }

  command.undone = true;
  return true;
}
