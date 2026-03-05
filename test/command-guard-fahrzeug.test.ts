import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { openDatabaseWithRetry } from '../src/main/db/connection';
import { einsatz, einsatzAbschnitt, einsatzCommandLog, einsatzFahrzeug } from '../src/main/db/schema';
import { moveFahrzeug } from '../src/main/services/command';
import { createDbPath } from './helpers/db';

const user = { id: crypto.randomUUID(), name: 'tester', rolle: 'S1' as const };

describe('command service - fahrzeug same abschnitt', () => {
  it('returns without changes when moving fahrzeug to same abschnitt', () => {
    const ctx = openDatabaseWithRetry(createDbPath());
    const einsatzId = crypto.randomUUID();
    const abschnittA = crypto.randomUUID();
    const fahrzeugId = crypto.randomUUID();

    ctx.db
      .insert(einsatz)
      .values({
        id: einsatzId,
        name: 'Same-Fahrzeug-Abschnitt',
        fuestName: 'FüSt',
        start: new Date().toISOString(),
        end: null,
        status: 'AKTIV',
        uebergeordneteFuestName: null,
      })
      .run();
    ctx.db
      .insert(einsatzAbschnitt)
      .values({ id: abschnittA, einsatzId, name: 'A', parentId: null, systemTyp: 'NORMAL' })
      .run();
    ctx.db
      .insert(einsatzFahrzeug)
      .values({
        id: fahrzeugId,
        einsatzId,
        stammdatenFahrzeugId: null,
        parentEinsatzFahrzeugId: null,
        aktuelleEinsatzEinheitId: null,
        aktuellerAbschnittId: abschnittA,
        status: 'AKTIV',
        erstellt: new Date().toISOString(),
        entfernt: null,
      })
      .run();

    moveFahrzeug(ctx, { einsatzId, fahrzeugId, nachAbschnittId: abschnittA }, user);
    const logs = ctx.db.select().from(einsatzCommandLog).where(eq(einsatzCommandLog.einsatzId, einsatzId)).all();
    expect(logs).toHaveLength(0);
    ctx.sqlite.close();
  });
});
