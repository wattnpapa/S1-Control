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

function normalizeOptionalText(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

function defaultTacticalSignConfigJson(
  organisation: EinheitListItem['organisation'],
  nameImEinsatz: string,
): string {
  return JSON.stringify({
    grundform: 'taktische_formation',
    fachaufgabe: 'keine',
    organisation,
    einheit: 'keine',
    verwaltungsstufe: 'keine',
    symbol: 'keines',
    text: '',
    name: nameImEinsatz,
    organisationsname: organisation,
    unit: '',
  });
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

function validateAbschnittParent(
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
      .where(eq(einsatzAbschnitt.id, cursor))
      .get();
    cursor = next?.parentId ?? null;
  }
}

export function updateAbschnitt(
  ctx: DbContext,
  input: { einsatzId: string; abschnittId: string; name: string; parentId?: string | null; systemTyp: AbschnittNode['systemTyp'] },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  const current = ctx.db
    .select({ id: einsatzAbschnitt.id })
    .from(einsatzAbschnitt)
    .where(and(eq(einsatzAbschnitt.id, input.abschnittId), eq(einsatzAbschnitt.einsatzId, input.einsatzId)))
    .get();
  if (!current) {
    throw new AppError('Abschnitt nicht gefunden', 'NOT_FOUND');
  }

  const nextParentId = input.parentId ?? null;
  validateAbschnittParent(ctx, {
    einsatzId: input.einsatzId,
    abschnittId: input.abschnittId,
    parentId: nextParentId,
  });

  ctx.db
    .update(einsatzAbschnitt)
    .set({
      name: input.name,
      parentId: nextParentId,
      systemTyp: input.systemTyp,
    })
    .where(eq(einsatzAbschnitt.id, input.abschnittId))
    .run();
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
      tacticalSignConfigJson: einsatzEinheit.tacticalSignConfigJson,
      aktuellerAbschnittId: einsatzEinheit.aktuellerAbschnittId,
      grFuehrerName: einsatzEinheit.grFuehrerName,
      ovName: einsatzEinheit.ovName,
      ovTelefon: einsatzEinheit.ovTelefon,
      ovFax: einsatzEinheit.ovFax,
      rbName: einsatzEinheit.rbName,
      rbTelefon: einsatzEinheit.rbTelefon,
      rbFax: einsatzEinheit.rbFax,
      lvName: einsatzEinheit.lvName,
      lvTelefon: einsatzEinheit.lvTelefon,
      lvFax: einsatzEinheit.lvFax,
      bemerkung: einsatzEinheit.bemerkung,
      vegetarierVorhanden: einsatzEinheit.vegetarierVorhanden,
      erreichbarkeiten: einsatzEinheit.erreichbarkeiten,
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
      organisation: einsatzEinheit.organisation,
      aktuelleEinsatzEinheitId: einsatzFahrzeug.aktuelleEinsatzEinheitId,
      aktuellerAbschnittId: einsatzFahrzeug.aktuellerAbschnittId,
      funkrufname: einsatzFahrzeug.funkrufname,
      stanKonform: einsatzFahrzeug.stanKonform,
      sondergeraet: einsatzFahrzeug.sondergeraet,
      nutzlast: einsatzFahrzeug.nutzlast,
    })
    .from(einsatzFahrzeug)
    .leftJoin(stammdatenFahrzeug, eq(einsatzFahrzeug.stammdatenFahrzeugId, stammdatenFahrzeug.id))
    .leftJoin(einsatzEinheit, eq(einsatzFahrzeug.aktuelleEinsatzEinheitId, einsatzEinheit.id))
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
    organisation: (row.organisation as FahrzeugListItem['organisation']) ?? null,
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
    tacticalSignConfigJson?: string;
    grFuehrerName?: string;
    ovName?: string;
    ovTelefon?: string;
    ovFax?: string;
    rbName?: string;
    rbTelefon?: string;
    rbFax?: string;
    lvName?: string;
    lvTelefon?: string;
    lvFax?: string;
    bemerkung?: string;
    vegetarierVorhanden?: boolean | null;
    erreichbarkeiten?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!ORGANISATIONS.includes(input.organisation)) {
    throw new AppError('Organisation ist ungültig', 'VALIDATION');
  }
  if (input.aktuelleStaerke < 0) {
    throw new AppError('Stärke muss >= 0 sein', 'VALIDATION');
  }
  if (input.aktuelleStaerkeTaktisch) {
    const parts = input.aktuelleStaerkeTaktisch.split('/').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
      throw new AppError('Taktische Stärke ist ungültig', 'VALIDATION');
    }
    const calculated = (parts[0] ?? 0) + (parts[1] ?? 0) + (parts[2] ?? 0);
    if ((parts[3] ?? 0) !== calculated || input.aktuelleStaerke !== calculated) {
      throw new AppError('Taktische Stärke und Gesamtstärke sind inkonsistent', 'VALIDATION');
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
    tacticalSignConfigJson:
      input.tacticalSignConfigJson ?? defaultTacticalSignConfigJson(input.organisation, input.nameImEinsatz),
    grFuehrerName: normalizeOptionalText(input.grFuehrerName),
    ovName: normalizeOptionalText(input.ovName),
    ovTelefon: normalizeOptionalText(input.ovTelefon),
    ovFax: normalizeOptionalText(input.ovFax),
    rbName: normalizeOptionalText(input.rbName),
    rbTelefon: normalizeOptionalText(input.rbTelefon),
    rbFax: normalizeOptionalText(input.rbFax),
    lvName: normalizeOptionalText(input.lvName),
    lvTelefon: normalizeOptionalText(input.lvTelefon),
    lvFax: normalizeOptionalText(input.lvFax),
    bemerkung: normalizeOptionalText(input.bemerkung),
    vegetarierVorhanden: input.vegetarierVorhanden ?? null,
    erreichbarkeiten: normalizeOptionalText(input.erreichbarkeiten),
    aktuellerAbschnittId: input.aktuellerAbschnittId,
    status: input.status ?? 'AKTIV',
    erstellt: nowIso(),
    aufgeloest: null,
  }).run();
}

export function updateEinheit(
  ctx: DbContext,
  input: {
    einsatzId: string;
    einheitId: string;
    nameImEinsatz: string;
    organisation: EinheitListItem['organisation'];
    aktuelleStaerke: number;
    status?: EinheitListItem['status'];
    aktuelleStaerkeTaktisch?: string;
    tacticalSignConfigJson?: string;
    grFuehrerName?: string;
    ovName?: string;
    ovTelefon?: string;
    ovFax?: string;
    rbName?: string;
    rbTelefon?: string;
    rbFax?: string;
    lvName?: string;
    lvTelefon?: string;
    lvFax?: string;
    bemerkung?: string;
    vegetarierVorhanden?: boolean | null;
    erreichbarkeiten?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!ORGANISATIONS.includes(input.organisation)) {
    throw new AppError('Organisation ist ungültig', 'VALIDATION');
  }
  if (input.aktuelleStaerke < 0) {
    throw new AppError('Stärke muss >= 0 sein', 'VALIDATION');
  }
  if (input.aktuelleStaerkeTaktisch) {
    const parts = input.aktuelleStaerkeTaktisch.split('/').map((p) => Number(p));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0)) {
      throw new AppError('Taktische Stärke ist ungültig', 'VALIDATION');
    }
    const calculated = (parts[0] ?? 0) + (parts[1] ?? 0) + (parts[2] ?? 0);
    if ((parts[3] ?? 0) !== calculated || input.aktuelleStaerke !== calculated) {
      throw new AppError('Taktische Stärke und Gesamtstärke sind inkonsistent', 'VALIDATION');
    }
  }

  const row = ctx.db
    .select({ id: einsatzEinheit.id })
    .from(einsatzEinheit)
    .where(and(eq(einsatzEinheit.id, input.einheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
    .get();
  if (!row) {
    throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
  }

  ctx.db
    .update(einsatzEinheit)
    .set({
      nameImEinsatz: input.nameImEinsatz,
      organisation: input.organisation,
      aktuelleStaerke: input.aktuelleStaerke,
      aktuelleStaerkeTaktisch: input.aktuelleStaerkeTaktisch ?? null,
      status: input.status ?? 'AKTIV',
      ...(input.tacticalSignConfigJson === undefined
        ? {}
        : { tacticalSignConfigJson: input.tacticalSignConfigJson }),
      grFuehrerName: normalizeOptionalText(input.grFuehrerName),
      ovName: normalizeOptionalText(input.ovName),
      ovTelefon: normalizeOptionalText(input.ovTelefon),
      ovFax: normalizeOptionalText(input.ovFax),
      rbName: normalizeOptionalText(input.rbName),
      rbTelefon: normalizeOptionalText(input.rbTelefon),
      rbFax: normalizeOptionalText(input.rbFax),
      lvName: normalizeOptionalText(input.lvName),
      lvTelefon: normalizeOptionalText(input.lvTelefon),
      lvFax: normalizeOptionalText(input.lvFax),
      bemerkung: normalizeOptionalText(input.bemerkung),
      vegetarierVorhanden: input.vegetarierVorhanden ?? null,
      erreichbarkeiten: normalizeOptionalText(input.erreichbarkeiten),
    })
    .where(eq(einsatzEinheit.id, input.einheitId))
    .run();
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
    funkrufname?: string;
    stanKonform?: boolean | null;
    sondergeraet?: string;
    nutzlast?: string;
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
        funkrufname: normalizeOptionalText(input.funkrufname),
        stanKonform: input.stanKonform ?? null,
        sondergeraet: normalizeOptionalText(input.sondergeraet),
        nutzlast: normalizeOptionalText(input.nutzlast),
        status: input.status ?? 'AKTIV',
        erstellt: nowIso(),
        entfernt: null,
      })
      .run();
  });
}

export function updateFahrzeug(
  ctx: DbContext,
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
  if (!input.aktuelleEinsatzEinheitId) {
    throw new AppError('Zugeordnete Einheit ist erforderlich', 'VALIDATION');
  }
  if (!input.name.trim()) {
    throw new AppError('Fahrzeugname ist erforderlich', 'VALIDATION');
  }

  ctx.db.transaction((tx) => {
    const fahrzeug = tx
      .select({
        id: einsatzFahrzeug.id,
        stammdatenFahrzeugId: einsatzFahrzeug.stammdatenFahrzeugId,
      })
      .from(einsatzFahrzeug)
      .where(and(eq(einsatzFahrzeug.id, input.fahrzeugId), eq(einsatzFahrzeug.einsatzId, input.einsatzId)))
      .get();
    if (!fahrzeug) {
      throw new AppError('Fahrzeug nicht gefunden', 'NOT_FOUND');
    }

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

    const stammdatenId = fahrzeug.stammdatenFahrzeugId ?? crypto.randomUUID();
    if (!fahrzeug.stammdatenFahrzeugId) {
      tx.insert(stammdatenFahrzeug)
        .values({
          id: stammdatenId,
          name: input.name.trim(),
          kennzeichen: input.kennzeichen?.trim() || null,
          standardPiktogrammKey: 'mtw',
          stammdatenEinheitId: null,
        })
        .run();

      tx.update(einsatzFahrzeug)
        .set({ stammdatenFahrzeugId: stammdatenId })
        .where(eq(einsatzFahrzeug.id, input.fahrzeugId))
        .run();
    } else {
      tx.update(stammdatenFahrzeug)
        .set({
          name: input.name.trim(),
          kennzeichen: input.kennzeichen?.trim() || null,
        })
        .where(eq(stammdatenFahrzeug.id, stammdatenId))
        .run();
    }

    tx.update(einsatzFahrzeug)
      .set({
        aktuelleEinsatzEinheitId: einheit.id,
        aktuellerAbschnittId: einheit.aktuellerAbschnittId,
        funkrufname: normalizeOptionalText(input.funkrufname),
        stanKonform: input.stanKonform ?? null,
        sondergeraet: normalizeOptionalText(input.sondergeraet),
        nutzlast: normalizeOptionalText(input.nutzlast),
        status: input.status ?? 'AKTIV',
      })
      .where(eq(einsatzFahrzeug.id, input.fahrzeugId))
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
    tacticalSignConfigJson?: string;
  },
): void {
  ensureNotArchived(ctx, input.einsatzId);
  if (!input.nameImEinsatz.trim()) {
    throw new AppError('Name der Teileinheit ist erforderlich', 'VALIDATION');
  }
  if (input.fuehrung < 0 || input.unterfuehrung < 0 || input.mannschaft < 0) {
    throw new AppError('Split-Stärke muss >= 0 sein', 'VALIDATION');
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
      throw new AppError('Split-Stärke muss größer 0 sein', 'VALIDATION');
    }

    const [srcF, srcUf, srcM] = parseTaktisch(source.aktuelleStaerkeTaktisch, source.aktuelleStaerke);
    if (input.fuehrung > srcF || input.unterfuehrung > srcUf || input.mannschaft > srcM) {
      throw new AppError('Split übersteigt verfügbare Teilstärken der Quell-Einheit', 'VALIDATION');
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
      throw new AppError('Organisation ist ungültig', 'VALIDATION');
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
        tacticalSignConfigJson:
          input.tacticalSignConfigJson ??
          source.tacticalSignConfigJson ??
          defaultTacticalSignConfigJson(organisation, input.nameImEinsatz.trim()),
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
