import { and, desc, eq, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { DbContext } from '../db/connection';
import {
  einsatz,
  einsatzAbschnitt,
  einsatzEinheit,
  einsatzEinheitHelfer,
  einsatzFahrzeug,
  einsatzCommandLog,
  stammdatenEinheit,
  stammdatenFahrzeug,
} from '../db/schema';
import type {
  AbschnittDetails,
  AbschnittNode,
  EinsatzListItem,
  EinheitHelfer,
  EinheitListItem,
  FahrzeugListItem,
} from '../../shared/types';

/**
 * Lists all Einsaetze ordered by start descending.
 */
export function listEinsaetze(ctx: DbContext): EinsatzListItem[] {
  return ctx.db.select().from(einsatz).orderBy(desc(einsatz.start)).all();
}

/**
 * Lists all Abschnitte for one Einsatz.
 */
export function listAbschnitte(ctx: DbContext, einsatzId: string): AbschnittNode[] {
  return ctx.db
    .select()
    .from(einsatzAbschnitt)
    .where(eq(einsatzAbschnitt.einsatzId, einsatzId))
    .all();
}

/**
 * Lists Einheiten and Fahrzeuge for one Abschnitt.
 */
export function listAbschnittDetails(
  ctx: DbContext,
  einsatzId: string,
  abschnittId: string,
): AbschnittDetails {
  const einheitenRows = selectEinheitenRows(
    ctx,
    and(eq(einsatzEinheit.einsatzId, einsatzId), eq(einsatzEinheit.aktuellerAbschnittId, abschnittId)),
  );
  const fahrzeugeRows = selectFahrzeugeRows(
    ctx,
    and(eq(einsatzFahrzeug.einsatzId, einsatzId), eq(einsatzFahrzeug.aktuellerAbschnittId, abschnittId)),
  );

  const einheiten = mapEinheitenRows(einheitenRows);
  const fahrzeuge = mapFahrzeugeRows(fahrzeugeRows);

  return { einheiten, fahrzeuge };
}

/**
 * Lists Abschnitt details for all sections of one Einsatz in a single DB pass.
 */
export function listAbschnittDetailsBatch(
  ctx: DbContext,
  einsatzId: string,
): Record<string, AbschnittDetails> {
  const einheitenRows = selectEinheitenRows(ctx, eq(einsatzEinheit.einsatzId, einsatzId));
  const fahrzeugeRows = selectFahrzeugeRows(ctx, eq(einsatzFahrzeug.einsatzId, einsatzId));
  const grouped: Record<string, AbschnittDetails> = {};

  for (const row of mapEinheitenRows(einheitenRows)) {
    const abschnittId = row.aktuellerAbschnittId;
    if (!grouped[abschnittId]) {
      grouped[abschnittId] = { einheiten: [], fahrzeuge: [] };
    }
    grouped[abschnittId].einheiten.push(row);
  }

  for (const row of mapFahrzeugeRows(fahrzeugeRows)) {
    const abschnittId = row.aktuellerAbschnittId;
    if (!grouped[abschnittId]) {
      grouped[abschnittId] = { einheiten: [], fahrzeuge: [] };
    }
    grouped[abschnittId].fahrzeuge.push(row);
  }

  return grouped;
}

function selectEinheitenRows(ctx: DbContext, whereClause: SQL<unknown>) {
  return ctx.db
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
    .where(whereClause)
    .all();
}

type EinheitRow = ReturnType<typeof selectEinheitenRows>[number];

function selectFahrzeugeRows(ctx: DbContext, whereClause: SQL<unknown>) {
  return ctx.db
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
    .where(whereClause)
    .all();
}

type FahrzeugRow = ReturnType<typeof selectFahrzeugeRows>[number];

function mapEinheitenRows(rows: EinheitRow[]): EinheitListItem[] {
  return rows.map((row) => ({
    ...row,
    status: row.status ?? 'AKTIV',
  }));
}

function mapFahrzeugeRows(rows: FahrzeugRow[]): FahrzeugListItem[] {
  return rows.map((row) => ({
    ...row,
    status: row.status ?? 'AKTIV',
    organisation: row.organisation ?? null,
  }));
}

/**
 * Lists all helper entries for one EinsatzEinheit.
 */
export function listEinheitHelfer(ctx: DbContext, einheitId: string): EinheitHelfer[] {
  return ctx.db
    .select({
      id: einsatzEinheitHelfer.id,
      einsatzId: einsatzEinheitHelfer.einsatzId,
      einsatzEinheitId: einsatzEinheitHelfer.einsatzEinheitId,
      name: einsatzEinheitHelfer.name,
      rolle: einsatzEinheitHelfer.rolle as EinheitHelfer['rolle'],
      geschlecht: einsatzEinheitHelfer.geschlecht as EinheitHelfer['geschlecht'],
      anzahl: einsatzEinheitHelfer.anzahl,
      funktion: einsatzEinheitHelfer.funktion,
      telefon: einsatzEinheitHelfer.telefon,
      erreichbarkeit: einsatzEinheitHelfer.erreichbarkeit,
      vegetarisch: einsatzEinheitHelfer.vegetarisch,
      bemerkung: einsatzEinheitHelfer.bemerkung,
    })
    .from(einsatzEinheitHelfer)
    .where(eq(einsatzEinheitHelfer.einsatzEinheitId, einheitId))
    .orderBy(einsatzEinheitHelfer.name)
    .all();
}

/**
 * Returns whether there is an undoable command for the Einsatz.
 */
export function hasUndoableCommand(ctx: DbContext, einsatzId: string): boolean {
  const row = ctx.db
    .select({ id: einsatzCommandLog.id })
    .from(einsatzCommandLog)
    .where(and(eq(einsatzCommandLog.einsatzId, einsatzId), eq(einsatzCommandLog.undone, false)))
    .orderBy(desc(einsatzCommandLog.timestamp))
    .get();
  return Boolean(row);
}
