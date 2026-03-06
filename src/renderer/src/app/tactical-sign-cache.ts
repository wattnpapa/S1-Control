import type { OrganisationKey, TacticalSignConfig } from '@shared/types';
import { inferVehicleTacticalUnit } from '@renderer/utils/tactical-vehicle';
import { buildFallbackFormationSignDataUrl, buildFallbackVehicleSignDataUrl } from '@renderer/utils/tactical-sign-fallback';

interface FormationSignInput {
  organisation: OrganisationKey;
  tacticalSignConfigJson?: string | null;
}

interface VehicleSignInput {
  organisation: OrganisationKey | null;
  name?: string | null;
  funkrufname?: string | null;
}

const formationCache = new Map<string, string>();
const formationPending = new Map<string, Promise<string>>();
const vehicleCache = new Map<string, string>();
const vehiclePending = new Map<string, Promise<string>>();

/**
 * Builds stable cache key for formation signs.
 */
export function toFormationCacheKey(input: FormationSignInput): string {
  return `${input.organisation}:${input.tacticalSignConfigJson ?? ''}`;
}

/**
 * Builds stable cache key and normalized vehicle sign payload.
 */
function toVehiclePayload(input: VehicleSignInput): { cacheKey: string; organisation: OrganisationKey; unit: string } {
  const organisation = input.organisation ?? 'SONSTIGE';
  const unit = inferVehicleTacticalUnit(organisation, { name: input.name, funkrufname: input.funkrufname });
  return { cacheKey: `${organisation}:${unit}`, organisation, unit };
}

/**
 * Parses optional tactical sign json safely.
 */
function parseTacticalConfig(value?: string | null): TacticalSignConfig | null {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as TacticalSignConfig;
  } catch {
    return null;
  }
}

/**
 * Resolves one formation sign and dedupes concurrent fetches.
 */
export async function getFormationSignSrc(input: FormationSignInput): Promise<string> {
  const cacheKey = toFormationCacheKey(input);
  const cached = formationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const pending = formationPending.get(cacheKey);
  if (pending) {
    return pending;
  }
  const fallback = buildFallbackFormationSignDataUrl(input.organisation);
  const request = window.api
    .getTacticalFormationSvg({
      organisation: input.organisation,
      tacticalSignConfig: parseTacticalConfig(input.tacticalSignConfigJson),
    })
    .catch(() => fallback)
    .then((src) => {
      formationCache.set(cacheKey, src);
      return src;
    })
    .finally(() => {
      formationPending.delete(cacheKey);
    });
  formationPending.set(cacheKey, request);
  return request;
}

/**
 * Resolves one vehicle sign and dedupes concurrent fetches.
 */
export async function getVehicleSignSrc(input: VehicleSignInput): Promise<string> {
  const payload = toVehiclePayload(input);
  const cached = vehicleCache.get(payload.cacheKey);
  if (cached) {
    return cached;
  }
  const pending = vehiclePending.get(payload.cacheKey);
  if (pending) {
    return pending;
  }
  const fallback = buildFallbackVehicleSignDataUrl(payload.organisation);
  const request = window.api
    .getTacticalVehicleSvg({ organisation: payload.organisation, unit: payload.unit })
    .catch(() => fallback)
    .then((src) => {
      vehicleCache.set(payload.cacheKey, src);
      return src;
    })
    .finally(() => {
      vehiclePending.delete(payload.cacheKey);
    });
  vehiclePending.set(payload.cacheKey, request);
  return request;
}

/**
 * Preloads visible formation signs with one batch IPC call.
 */
export function prewarmFormationSigns(inputs: FormationSignInput[]): void {
  const unique = new Map<string, FormationSignInput>();
  for (const input of inputs) {
    unique.set(toFormationCacheKey(input), input);
  }
  const batch = Array.from(unique.entries()).filter(([key]) => !formationCache.has(key) && !formationPending.has(key));
  if (batch.length === 0) {
    return;
  }
  const batchPromise = window.api.getTacticalFormationSvgs(
    batch.map(([cacheKey, input]) => ({
      cacheKey,
      organisation: input.organisation,
      tacticalSignConfig: parseTacticalConfig(input.tacticalSignConfigJson),
    })),
  );
  for (const [cacheKey, input] of batch) {
    const fallback = buildFallbackFormationSignDataUrl(input.organisation);
    const request = batchPromise
      .then((result) => result[cacheKey] ?? fallback)
      .catch(() => fallback)
      .then((src) => {
        formationCache.set(cacheKey, src);
        return src;
      })
      .finally(() => {
        formationPending.delete(cacheKey);
      });
    formationPending.set(cacheKey, request);
  }
}

/**
 * Preloads visible vehicle signs with one batch IPC call.
 */
export function prewarmVehicleSigns(inputs: VehicleSignInput[]): void {
  const unique = new Map<string, { organisation: OrganisationKey; unit: string }>();
  for (const input of inputs) {
    const payload = toVehiclePayload(input);
    unique.set(payload.cacheKey, { organisation: payload.organisation, unit: payload.unit });
  }
  const batch = Array.from(unique.entries()).filter(([key]) => !vehicleCache.has(key) && !vehiclePending.has(key));
  if (batch.length === 0) {
    return;
  }
  const batchPromise = window.api.getTacticalVehicleSvgs(
    batch.map(([cacheKey, payload]) => ({
      cacheKey,
      organisation: payload.organisation,
      unit: payload.unit,
    })),
  );
  for (const [cacheKey, payload] of batch) {
    const fallback = buildFallbackVehicleSignDataUrl(payload.organisation);
    const request = batchPromise
      .then((result) => result[cacheKey] ?? fallback)
      .catch(() => fallback)
      .then((src) => {
        vehicleCache.set(cacheKey, src);
        return src;
      })
      .finally(() => {
        vehiclePending.delete(cacheKey);
      });
    vehiclePending.set(cacheKey, request);
  }
}
