import type { EinheitListItem } from '../../../shared/types';
import {
  ensureTacticalSignConfigSource,
  inferTacticalSignConfig,
  parseTacticalSignConfigJson,
  toTacticalSignConfigJson,
} from '../tactical-sign-inference';
import { AppError } from '../errors';

/**
 * Builds a default tactical sign config json from inference.
 */
export function defaultTacticalSignConfigJson(
  organisation: EinheitListItem['organisation'],
  nameImEinsatz: string,
): string {
  return toTacticalSignConfigJson(inferTacticalSignConfig(nameImEinsatz, organisation).config);
}

/**
 * Validates and stores manual tactical sign config json.
 */
export function resolveManualTacticalSignConfigJson(
  tacticalSignConfigJson: string,
  nameImEinsatz: string,
  organisation: EinheitListItem['organisation'],
): string {
  const parsed = parseTacticalSignConfigJson(tacticalSignConfigJson);
  if (!parsed) {
    throw new AppError('Taktisches Zeichen ist ungültig', 'VALIDATION');
  }
  const source = parsed.meta?.source === 'auto' ? 'auto' : 'manual';
  return toTacticalSignConfigJson(ensureTacticalSignConfigSource(parsed, source, nameImEinsatz, organisation));
}

/**
 * Resolves updated tactical sign config depending on existing source mode.
 */
export function resolveUpdatedTacticalSignConfigJson(
  existingJson: string | null,
  input: {
    tacticalSignConfigJson?: string;
    nameImEinsatz: string;
    organisation: EinheitListItem['organisation'];
  },
): string {
  if (input.tacticalSignConfigJson !== undefined) {
    return resolveManualTacticalSignConfigJson(
      input.tacticalSignConfigJson,
      input.nameImEinsatz,
      input.organisation,
    );
  }

  const existing = parseTacticalSignConfigJson(existingJson);
  const existingSource = existing?.meta?.source ?? 'auto';
  if (existing && existingSource === 'manual') {
    const preservedName = existing.name ?? input.nameImEinsatz;
    const preservedOrganisation =
      (existing.organisation as EinheitListItem['organisation'] | undefined) ?? input.organisation;
    return toTacticalSignConfigJson(
      ensureTacticalSignConfigSource(existing, 'manual', preservedName, preservedOrganisation),
    );
  }

  return toTacticalSignConfigJson(inferTacticalSignConfig(input.nameImEinsatz, input.organisation).config);
}
