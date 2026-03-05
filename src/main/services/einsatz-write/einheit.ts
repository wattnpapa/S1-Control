import crypto from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DbContext } from '../../db/connection';
import { einsatzEinheit } from '../../db/schema';
import type { EinheitListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import { defaultTacticalSignConfigJson, resolveManualTacticalSignConfigJson, resolveUpdatedTacticalSignConfigJson } from './tactical-sign-config';
import { formatTaktisch, parseTaktisch, validateTacticalStrength } from './tactical-strength';
import { validateOrganisation, validateSplitName, validateSplitStrength } from './validations';

/**
 * Creates one Einheit in one Abschnitt.
 */
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
  validateOrganisation(input.organisation);
  validateTacticalStrength(input.aktuelleStaerke, input.aktuelleStaerkeTaktisch);

  ctx.db
    .insert(einsatzEinheit)
    .values({
      id: crypto.randomUUID(),
      einsatzId: input.einsatzId,
      stammdatenEinheitId: input.stammdatenEinheitId,
      parentEinsatzEinheitId: null,
      nameImEinsatz: input.nameImEinsatz,
      organisation: input.organisation,
      aktuelleStaerke: input.aktuelleStaerke,
      aktuelleStaerkeTaktisch: input.aktuelleStaerkeTaktisch ?? null,
      tacticalSignConfigJson:
        input.tacticalSignConfigJson === undefined
          ? defaultTacticalSignConfigJson(input.organisation, input.nameImEinsatz)
          : resolveManualTacticalSignConfigJson(input.tacticalSignConfigJson, input.nameImEinsatz, input.organisation),
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
    })
    .run();
}

/**
 * Updates one Einheit.
 */
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
  validateOrganisation(input.organisation);
  validateTacticalStrength(input.aktuelleStaerke, input.aktuelleStaerkeTaktisch);

  const row = ctx.db
    .select({
      id: einsatzEinheit.id,
      tacticalSignConfigJson: einsatzEinheit.tacticalSignConfigJson,
    })
    .from(einsatzEinheit)
    .where(and(eq(einsatzEinheit.id, input.einheitId), eq(einsatzEinheit.einsatzId, input.einsatzId)))
    .get();
  if (!row) {
    throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
  }

  const nextTacticalSignConfigJson = resolveUpdatedTacticalSignConfigJson(row.tacticalSignConfigJson, {
    tacticalSignConfigJson: input.tacticalSignConfigJson,
    nameImEinsatz: input.nameImEinsatz,
    organisation: input.organisation,
  });

  ctx.db
    .update(einsatzEinheit)
    .set({
      nameImEinsatz: input.nameImEinsatz,
      organisation: input.organisation,
      aktuelleStaerke: input.aktuelleStaerke,
      aktuelleStaerkeTaktisch: input.aktuelleStaerkeTaktisch ?? null,
      status: input.status ?? 'AKTIV',
      tacticalSignConfigJson: nextTacticalSignConfigJson,
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

/**
 * Splits one source unit into a new child unit and reduces source strength.
 */
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
  validateSplitName(input.nameImEinsatz);
  validateSplitStrength(input.fuehrung, input.unterfuehrung, input.mannschaft);

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
    validateOrganisation(organisation);

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
          input.tacticalSignConfigJson === undefined
            ? resolveUpdatedTacticalSignConfigJson(source.tacticalSignConfigJson, {
                nameImEinsatz: input.nameImEinsatz.trim(),
                organisation,
              })
            : resolveManualTacticalSignConfigJson(input.tacticalSignConfigJson, input.nameImEinsatz.trim(), organisation),
        aktuellerAbschnittId: source.aktuellerAbschnittId,
        status: input.status ?? source.status,
        erstellt: nowIso(),
        aufgeloest: null,
      })
      .run();
  });
}
