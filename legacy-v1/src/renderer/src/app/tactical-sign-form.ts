import type { TacticalSignConfig } from '@shared/types';
import type { CreateEinheitForm } from '@renderer/types/ui';

/**
 * Normalizes legacy typ values for UI controls.
 */
function normalizeTyp(typ: TacticalSignConfig['typ']): NonNullable<TacticalSignConfig['typ']> {
  if (!typ) return 'none';
  if (typ === 'group') return 'gruppe';
  if (typ === 'squad') return 'trupp';
  if (typ === 'platoon') return 'zug';
  return typ;
}

/**
 * Parses a persisted tactical sign config into editor form fields.
 */
export function parseTacticalSignConfig(
  value: string | null | undefined,
): Pick<CreateEinheitForm, 'tacticalSignMode' | 'tacticalSignUnit' | 'tacticalSignTyp' | 'tacticalSignDenominator'> {
  if (!value) {
    return {
      tacticalSignMode: 'AUTO',
      tacticalSignUnit: '',
      tacticalSignTyp: 'none',
      tacticalSignDenominator: '',
    };
  }
  try {
    const parsed = JSON.parse(value) as TacticalSignConfig;
    const source = parsed.meta?.source === 'manual' ? 'MANUELL' : 'AUTO';
    return {
      tacticalSignMode: source,
      tacticalSignUnit: parsed.einheit ?? '',
      tacticalSignTyp: normalizeTyp(parsed.typ),
      tacticalSignDenominator: parsed.verwaltungsstufe ?? '',
    };
  } catch {
    return {
      tacticalSignMode: 'AUTO',
      tacticalSignUnit: '',
      tacticalSignTyp: 'none',
      tacticalSignDenominator: '',
    };
  }
}

/**
 * Builds the persisted tactical sign config JSON from the editor form.
 */
export function buildTacticalSignConfigJson(
  input: Pick<
    CreateEinheitForm,
    | 'nameImEinsatz'
    | 'organisation'
    | 'tacticalSignMode'
    | 'tacticalSignUnit'
    | 'tacticalSignTyp'
    | 'tacticalSignDenominator'
  >,
): string {
  const isManual = input.tacticalSignMode === 'MANUELL';
  const config: TacticalSignConfig = {
    grundzeichen: 'taktische-formation',
    organisation: input.organisation,
    einheit: input.tacticalSignUnit.trim() || undefined,
    typ: normalizeTyp(input.tacticalSignTyp),
    verwaltungsstufe: input.tacticalSignDenominator.trim() || undefined,
    text: '',
    name: input.nameImEinsatz,
    organisationName: input.organisation,
    meta: {
      source: isManual ? 'manual' : 'auto',
      rawName: input.nameImEinsatz,
      updatedAt: new Date().toISOString(),
    },
  };
  return JSON.stringify(config);
}
