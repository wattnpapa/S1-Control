import crypto from 'node:crypto';
import type { EinsatzWriteCtx, JsonEinheit } from '../../json-store/types';
import type { EinheitListItem } from '../../../shared/types';
import { AppError } from '../errors';
import { ensureNotArchived, normalizeOptionalText, nowIso } from '../einsatz-transaction-guards';
import {
  defaultTacticalSignConfigJson,
  resolveManualTacticalSignConfigJson,
  resolveUpdatedTacticalSignConfigJson,
} from './tactical-sign-config';
import { formatTaktisch, parseTaktisch, validateTacticalStrength } from './tactical-strength';
import { validateOrganisation, validateSplitName, validateSplitStrength } from './validations';

export function createEinheit(
  ctx: EinsatzWriteCtx,
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

  const entry: JsonEinheit = {
    id: crypto.randomUUID(),
    einsatzId: input.einsatzId,
    stammdatenEinheitId: input.stammdatenEinheitId ?? null,
    parentEinsatzEinheitId: null,
    nameImEinsatz: input.nameImEinsatz,
    organisation: input.organisation,
    aktuelleStaerke: input.aktuelleStaerke,
    aktuelleStaerkeTaktisch: input.aktuelleStaerkeTaktisch ?? null,
    tacticalSignConfigJson:
      input.tacticalSignConfigJson === undefined
        ? defaultTacticalSignConfigJson(input.organisation, input.nameImEinsatz)
        : resolveManualTacticalSignConfigJson(
            input.tacticalSignConfigJson,
            input.nameImEinsatz,
            input.organisation,
          ),
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
    version: 0,
  };
  ctx.einsatz.einheiten.push(entry);
}

export function updateEinheit(
  ctx: EinsatzWriteCtx,
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

  const idx = ctx.einsatz.einheiten.findIndex(
    (e) => e.id === input.einheitId && e.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Einheit nicht gefunden', 'NOT_FOUND');
  }
  const prev = ctx.einsatz.einheiten[idx]!;
  const nextTacticalSignConfigJson = resolveUpdatedTacticalSignConfigJson(prev.tacticalSignConfigJson, {
    tacticalSignConfigJson: input.tacticalSignConfigJson,
    nameImEinsatz: input.nameImEinsatz,
    organisation: input.organisation,
  });
  ctx.einsatz.einheiten[idx] = {
    ...prev,
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
    version: prev.version + 1,
  };
}

export function splitEinheit(
  ctx: EinsatzWriteCtx,
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

  const idx = ctx.einsatz.einheiten.findIndex(
    (e) => e.id === input.sourceEinheitId && e.einsatzId === input.einsatzId,
  );
  if (idx === -1) {
    throw new AppError('Quell-Einheit nicht gefunden', 'NOT_FOUND');
  }
  const source = ctx.einsatz.einheiten[idx]!;

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

  ctx.einsatz.einheiten[idx] = {
    ...source,
    aktuelleStaerke: newSourceGesamt,
    aktuelleStaerkeTaktisch: formatTaktisch(newSourceF, newSourceUf, newSourceM),
  };

  const organisation = input.organisation ?? (source.organisation as EinheitListItem['organisation']);
  validateOrganisation(organisation);

  ctx.einsatz.einheiten.push({
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
    grFuehrerName: null,
    ovName: null,
    ovTelefon: null,
    ovFax: null,
    rbName: null,
    rbTelefon: null,
    rbFax: null,
    lvName: null,
    lvTelefon: null,
    lvFax: null,
    bemerkung: null,
    vegetarierVorhanden: null,
    erreichbarkeiten: null,
    aktuellerAbschnittId: source.aktuellerAbschnittId,
    status: input.status ?? source.status,
    erstellt: nowIso(),
    aufgeloest: null,
    version: 0,
  });
}
