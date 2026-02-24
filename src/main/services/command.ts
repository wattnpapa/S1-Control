import crypto from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import type { DbContext } from '../db/connection';
import {
  einsatzCommandLog,
  einsatzEinheit,
  einsatzEinheitBewegung,
  einsatzFahrzeug,
  einsatzFahrzeugBewegung,
} from '../db/schema';
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

  ctx.db.transaction((tx) => {
    const einheit = tx
      .select()
      .from(einsatzEinheit)
      .where(and(eq(einsatzEinheit.id, input.einheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
      .get();

    if (!einheit) {
      throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
    }

    if (einheit.aktuellerAbschnittId === input.nachAbschnittId) {
      return;
    }

    tx.update(einsatzEinheit)
      .set({ aktuellerAbschnittId: input.nachAbschnittId })
      .where(eq(einsatzEinheit.id, input.einheitId))
      .run();

    tx.insert(einsatzEinheitBewegung)
      .values({
        id: crypto.randomUUID(),
        einsatzEinheitId: einheit.id,
        vonAbschnittId: einheit.aktuellerAbschnittId,
        nachAbschnittId: input.nachAbschnittId,
        zeitpunkt: nowIso(),
        benutzer: user.name,
        kommentar: input.kommentar ?? null,
      })
      .run();

    const payload: MoveEinheitPayload = {
      einheitId: einheit.id,
      vonAbschnittId: einheit.aktuellerAbschnittId,
      nachAbschnittId: input.nachAbschnittId,
      kommentar: input.kommentar,
    };

    tx.insert(einsatzCommandLog)
      .values({
        id: crypto.randomUUID(),
        einsatzId: input.einsatzId,
        benutzerId: user.id,
        commandTyp: 'MOVE_EINHEIT',
        payloadJson: JSON.stringify(payload),
        timestamp: nowIso(),
        undone: false,
      })
      .run();
  });
}

export function moveFahrzeug(
  ctx: DbContext,
  input: { einsatzId: string; fahrzeugId: string; nachAbschnittId: string },
  user: SessionUser,
): void {
  ensureNotArchived(ctx, input.einsatzId);

  ctx.db.transaction((tx) => {
    const fahrzeug = tx
      .select()
      .from(einsatzFahrzeug)
      .where(and(eq(einsatzFahrzeug.id, input.fahrzeugId), eq(einsatzFahrzeug.einsatzId, input.einsatzId)))
      .get();

    if (!fahrzeug) {
      throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
    }

    if (!fahrzeug.aktuellerAbschnittId) {
      throw new AppError('Fahrzeug hat keinen aktuellen Abschnitt', 'INVALID_STATE');
    }

    if (fahrzeug.aktuellerAbschnittId === input.nachAbschnittId) {
      return;
    }

    tx.update(einsatzFahrzeug)
      .set({ aktuellerAbschnittId: input.nachAbschnittId })
      .where(eq(einsatzFahrzeug.id, input.fahrzeugId))
      .run();

    tx.insert(einsatzFahrzeugBewegung)
      .values({
        id: crypto.randomUUID(),
        einsatzFahrzeugId: fahrzeug.id,
        vonAbschnittId: fahrzeug.aktuellerAbschnittId,
        nachAbschnittId: input.nachAbschnittId,
        zeitpunkt: nowIso(),
        benutzer: user.name,
      })
      .run();

    const payload: MoveFahrzeugPayload = {
      fahrzeugId: fahrzeug.id,
      vonAbschnittId: fahrzeug.aktuellerAbschnittId,
      nachAbschnittId: input.nachAbschnittId,
    };

    tx.insert(einsatzCommandLog)
      .values({
        id: crypto.randomUUID(),
        einsatzId: input.einsatzId,
        benutzerId: user.id,
        commandTyp: 'MOVE_FAHRZEUG',
        payloadJson: JSON.stringify(payload),
        timestamp: nowIso(),
        undone: false,
      })
      .run();
  });
}

export function undoLastCommand(ctx: DbContext, einsatzId: string, user: SessionUser): boolean {
  ensureNotArchived(ctx, einsatzId);

  return ctx.db.transaction((tx) => {
    const command = tx
      .select()
      .from(einsatzCommandLog)
      .where(and(eq(einsatzCommandLog.einsatzId, einsatzId), eq(einsatzCommandLog.undone, false)))
      .orderBy(desc(einsatzCommandLog.timestamp))
      .get();

    if (!command) {
      return false;
    }

    if (command.commandTyp === 'MOVE_EINHEIT') {
      const payload = JSON.parse(command.payloadJson) as MoveEinheitPayload;
      tx.update(einsatzEinheit)
        .set({ aktuellerAbschnittId: payload.vonAbschnittId })
        .where(eq(einsatzEinheit.id, payload.einheitId))
        .run();
      tx.insert(einsatzEinheitBewegung)
        .values({
          id: crypto.randomUUID(),
          einsatzEinheitId: payload.einheitId,
          vonAbschnittId: payload.nachAbschnittId,
          nachAbschnittId: payload.vonAbschnittId,
          zeitpunkt: nowIso(),
          benutzer: `${user.name} (undo)`,
          kommentar: 'Undo MOVE_EINHEIT',
        })
        .run();
    } else if (command.commandTyp === 'MOVE_FAHRZEUG') {
      const payload = JSON.parse(command.payloadJson) as MoveFahrzeugPayload;
      tx.update(einsatzFahrzeug)
        .set({ aktuellerAbschnittId: payload.vonAbschnittId })
        .where(eq(einsatzFahrzeug.id, payload.fahrzeugId))
        .run();
      tx.insert(einsatzFahrzeugBewegung)
        .values({
          id: crypto.randomUUID(),
          einsatzFahrzeugId: payload.fahrzeugId,
          vonAbschnittId: payload.nachAbschnittId,
          nachAbschnittId: payload.vonAbschnittId,
          zeitpunkt: nowIso(),
          benutzer: `${user.name} (undo)`,
        })
        .run();
    } else {
      throw new AppError('Undo fuer diesen Command-Typ noch nicht implementiert', 'UNSUPPORTED');
    }

    tx.update(einsatzCommandLog).set({ undone: true }).where(eq(einsatzCommandLog.id, command.id)).run();
    return true;
  });
}
