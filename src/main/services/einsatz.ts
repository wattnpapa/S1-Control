import crypto from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type { DbContext } from '../db/connection';
import {
  einsatz,
  einsatzAbschnitt,
  einsatzEinheit,
  einsatzFahrzeug,
  einsatzCommandLog,
  stammdatenEinheit,
  stammdatenFahrzeug,
} from '../db/schema';
import type {
  AbschnittDetails,
  AbschnittNode,
  EinsatzListItem,
  EinheitListItem,
  FahrzeugListItem,
  OrganisationKey,
} from '../../shared/types';
import { AppError } from './errors';

function nowIso(): string {
  return new Date().toISOString();
}

function parseTaktisch(taktisch: string | null, fallbackGesamt: number): [number, number, number, number] {
  if (!taktisch) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return [0, 0, safe, safe];
  }
  const parts = taktisch.split('/').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
    const safe = Math.max(0, Math.round(fallbackGesamt));
    return [0, 0, safe, safe];
  }
  const fuehrung = Math.round(parts[0] ?? 0);
  const unterfuehrung = Math.round(parts[1] ?? 0);
  const mannschaft = Math.round(parts[2] ?? 0);
  const gesamt = Math.round(parts[3] ?? fuehrung + unterfuehrung + mannschaft);
  return [fuehrung, unterfuehrung, mannschaft, gesamt];
}

function formatTaktisch(f: number, uf: number, m: number): string {
  const gesamt = f + uf + m;
  return `${f}/${uf}/${m}/${gesamt}`;
}

const ORGANISATIONS: OrganisationKey[] = [
  'THW',
  'FEUERWEHR',
  'POLIZEI',
  'BUNDESWEHR',
  'REGIE',
  'DRK',
  'ASB',
  'JOHANNITER',
  'MALTESER',
  'DLRG',
  'BERGWACHT',
  'MHD',
  'RETTUNGSDIENST_KOMMUNAL',
  'SONSTIGE',
];

export function listEinsaetze(ctx: DbContext): EinsatzListItem[] {
  return ctx.db.select().from(einsatz).orderBy(desc(einsatz.start)).all();
}

export function createEinsatz(ctx: DbContext, input: { name: string; fuestName: string }): EinsatzListItem {
  const created = {
    id: crypto.randomUUID(),
    name: input.name,
    fuestName: input.fuestName,
    start: nowIso(),
    end: null,
    status: 'AKTIV' as const,
  };

  ctx.db.transaction((tx) => {
    tx.insert(einsatz).values(created).run();
    tx.insert(einsatzAbschnitt)
      .values({
        id: crypto.randomUUID(),
        einsatzId: created.id,
        name: input.fuestName,
        parentId: null,
        systemTyp: 'FUEST',
      })
      .run();
  });

  return created;
}

export function archiveEinsatz(ctx: DbContext, einsatzId: string): void {
  const updated = ctx.db
    .update(einsatz)
    .set({ status: 'ARCHIVIERT', end: nowIso() })
    .where(eq(einsatz.id, einsatzId))
    .run();

  if (!updated.changes) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
}

export function ensureNotArchived(ctx: DbContext, einsatzId: string): void {
  const row = ctx.db.select({ status: einsatz.status }).from(einsatz).where(eq(einsatz.id, einsatzId)).get();
  if (!row) {
    throw new AppError('Einsatz nicht gefunden', 'NOT_FOUND');
  }
  if (row.status === 'ARCHIVIERT') {
    throw new AppError('Einsatz ist archiviert und nur lesbar', 'ARCHIVED');
  }
}

export function listAbschnitte(ctx: DbContext, einsatzId: string): AbschnittNode[] {
  return ctx.db
    .select()
    .from(einsatzAbschnitt)
    .where(eq(einsatzAbschnitt.einsatzId, einsatzId))
    .all();
}

export function createAbschnitt(
  ctx: DbContext,
  input: { einsatzId: string; name: string; parentId?: string | null; systemTyp: AbschnittNode['systemTyp'] },
): AbschnittNode {
  ensureNotArchived(ctx, input.einsatzId);

  const item: AbschnittNode = {
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    name: input.name,
    parentId: input.parentId ?? null,
    systemTyp: input.systemTyp,
  };

  ctx.db.insert(einsatzAbschnitt).values(item).run();
  return item;
}

export function listAbschnittDetails(
  ctx: DbContext,
  einsatzId: string,
  abschnittId: string,
): AbschnittDetails {
  const einheitenRows = ctx.db
    .select({
      id: einsatzEinheit.id,
      parentEinsatzEinheitId: einsatzEinheit.parentEinsatzEinheitId,
      nameImEinsatz: einsatzEinheit.nameImEinsatz,
      organisation: einsatzEinheit.organisation,
      aktuelleStaerke: einsatzEinheit.aktuelleStaerke,
      aktuelleStaerkeTaktisch: einsatzEinheit.aktuelleStaerkeTaktisch,
      status: einsatzEinheit.status,
      piktogrammKey: sql<string | null>`coalesce(${stammdatenEinheit.standardPiktogrammKey}, null)`,
      aktuellerAbschnittId: einsatzEinheit.aktuellerAbschnittId,
    })
    .from(einsatzEinheit)
    .leftJoin(stammdatenEinheit, eq(einsatzEinheit.stammdatenEinheitId, stammdatenEinheit.id))
    .where(
      and(eq(einsatzEinheit.einsatzId, einsatzId), eq(einsatzEinheit.aktuellerAbschnittId, abschnittId)),
    )
    .all();

  const fahrzeugeRows = ctx.db
    .select({
      id: einsatzFahrzeug.id,
      name: sql<string>`coalesce(${stammdatenFahrzeug.name}, ${einsatzFahrzeug.id})`,
      kennzeichen: stammdatenFahrzeug.kennzeichen,
      status: einsatzFahrzeug.status,
      piktogrammKey: sql<string | null>`coalesce(${stammdatenFahrzeug.standardPiktogrammKey}, null)`,
      aktuelleEinsatzEinheitId: einsatzFahrzeug.aktuelleEinsatzEinheitId,
      aktuellerAbschnittId: einsatzFahrzeug.aktuellerAbschnittId,
    })
    .from(einsatzFahrzeug)
    .leftJoin(stammdatenFahrzeug, eq(einsatzFahrzeug.stammdatenFahrzeugId, stammdatenFahrzeug.id))
    .where(
      and(eq(einsatzFahrzeug.einsatzId, einsatzId), eq(einsatzFahrzeug.aktuellerAbschnittId, abschnittId)),
    )
    .all();

  const einheiten: EinheitListItem[] = einheitenRows.map((row) => ({
    ...row,
    status: row.status as EinheitListItem['status'],
  }));

  const fahrzeuge: FahrzeugListItem[] = fahrzeugeRows.map((row) => ({
    ...row,
    status: row.status as FahrzeugListItem['status'],
  }));

  return { einheiten, fahrzeuge };
}

export function createEinheit(
  ctx: DbContext,
  input: {
    einsatzId: string;
    nameImEinsatz: string;
    organisation: EinheitListItem['organisation'];
    aktuelleStaerke: number;
    aktuellerAbschnittId: string;
    status?: EinheitListItem['status'];
    aktuelleStaerkeTaktisch?: string;
    stammdatenEinheitId?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!ORGANISATIONS.includes(input.organisation)) {
    throw new AppError('Organisation ist ungueltig', 'VALIDATION');
  }
  if (input.aktuelleStaerke < 0) {
    throw new AppError('Staerke muss >= 0 sein', 'VALIDATION');
  }
  if (input.aktuelleStaerkeTaktisch) {
    const parts = input.aktuelleStaerkeTaktisch.split('/').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
      throw new AppError('Taktische Staerke ist ungueltig', 'VALIDATION');
    }
    const calculated = (parts[0] ?? 0) + (parts[1] ?? 0) + (parts[2] ?? 0);
    if ((parts[3] ?? 0) !== calculated || input.aktuelleStaerke !== calculated) {
      throw new AppError('Taktische Staerke und Gesamtstaerke sind inkonsistent', 'VALIDATION');
    }
  }

  ctx.db.insert(einsatzEinheit).values({
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    stammdatenEinheitId: input.stammdatenEinheitId,
    parentEinsatzEinheitId: null,
    nameImEinsatz: input.nameImEinsatz,
    organisation: input.organisation,
    aktuelleStaerke: input.aktuelleStaerke,
    aktuelleStaerkeTaktisch: input.aktuelleStaerkeTaktisch ?? null,
    aktuellerAbschnittId: input.aktuellerAbschnittId,
    status: input.status ?? 'AKTIV',
    erstellt: nowIso(),
    aufgeloest: null,
  }).run();
}

export function createFahrzeug(
  ctx: DbContext,
  input: {
    einsatzId: string;
    name: string;
    aktuelleEinsatzEinheitId: string;
    status?: FahrzeugListItem['status'];
    kennzeichen?: string;
    stammdatenFahrzeugId?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!input.aktuelleEinsatzEinheitId) {
    throw new AppError('Zugeordnete Einheit ist erforderlich', 'VALIDATION');
  }

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
        status: input.status ?? 'AKTIV',
        erstellt: nowIso(),
        entfernt: null,
      })
      .run();
  });
}

export function splitEinheit(
  ctx: DbContext,
  input: {
    einsatzId: string;
    sourceEinheitId: string;
    nameImEinsatz: string;
    organisation?: EinheitListItem['organisation'];
    fuehrung: number;
    unterfuehrung: number;
    mannschaft: number;
    status?: EinheitListItem['status'];
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!input.nameImEinsatz.trim()) {
    throw new AppError('Name der Teileinheit ist erforderlich', 'VALIDATION');
  }
  if (input.fuehrung < 0 || input.unterfuehrung < 0 || input.mannschaft < 0) {
    throw new AppError('Split-Staerke muss >= 0 sein', 'VALIDATION');
  }

  ctx.db.transaction((tx) => {
    const source = tx
      .select()
      .from(einsatzEinheit)
      .where(and(eq(einsatzEinheit.id, input.sourceEinheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
      .get();

    if (!source) {
      throw new AppError('Quell-Einheit nicht gefunden', 'NOT_FOUND');
    }

    const splitGesamt = input.fuehrung + input.unterfuehrung + input.mannschaft;
    if (splitGesamt <= 0) {
      throw new AppError('Split-Staerke muss groesser 0 sein', 'VALIDATION');
    }

    const [srcF, srcUf, srcM] = parseTaktisch(source.aktuelleStaerkeTaktisch, source.aktuelleStaerke);
    if (input.fuehrung > srcF || input.unterfuehrung > srcUf || input.mannschaft > srcM) {
      throw new AppError('Split uebersteigt verfuegbare Teilstaerken der Quell-Einheit', 'VALIDATION');
    }

    const newSourceF = srcF - input.fuehrung;
    const newSourceUf = srcUf - input.unterfuehrung;
    const newSourceM = srcM - input.mannschaft;
    const newSourceGesamt = newSourceF + newSourceUf + newSourceM;

    tx.update(einsatzEinheit)
      .set({
        aktuelleStaerke: newSourceGesamt,
        aktuelleStaerkeTaktisch: formatTaktisch(newSourceF, newSourceUf, newSourceM),
      })
      .where(eq(einsatzEinheit.id, source.id))
      .run();

    const organisation = input.organisation ?? (source.organisation as EinheitListItem['organisation']);
    if (!ORGANISATIONS.includes(organisation)) {
      throw new AppError('Organisation ist ungueltig', 'VALIDATION');
    }

    tx.insert(einsatzEinheit)
      .values({
        id: crypto.randomUUID(),
        einsatzId: source.einsatzId,
        stammdatenEinheitId: source.stammdatenEinheitId,
        parentEinsatzEinheitId: source.id,
        nameImEinsatz: input.nameImEinsatz.trim(),
        organisation,
        aktuelleStaerke: splitGesamt,
        aktuelleStaerkeTaktisch: formatTaktisch(input.fuehrung, input.unterfuehrung, input.mannschaft),
        aktuellerAbschnittId: source.aktuellerAbschnittId,
        status: input.status ?? source.status,
        erstellt: nowIso(),
        aufgeloest: null,
      })
      .run();
  });
}

export function hasUndoableCommand(ctx: DbContext, einsatzId: string): boolean {
  const row = ctx.db
    .select({ id: einsatzCommandLog.id })
    .from(einsatzCommandLog)
    .where(and(eq(einsatzCommandLog.einsatzId, einsatzId), eq(einsatzCommandLog.undone, false)))
    .orderBy(desc(einsatzCommandLog.timestamp))
    .get();
  return Boolean(row);
}
