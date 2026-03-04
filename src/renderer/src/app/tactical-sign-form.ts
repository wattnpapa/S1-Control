import type { TacticalSignConfig } from '@shared/types';
import type { CreateEinheitForm } from '@renderer/types/ui';

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
      tacticalSignUnit: parsed.unit ?? '',
      tacticalSignTyp: parsed.typ ?? 'none',
      tacticalSignDenominator: parsed.denominator ?? '',
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
    grundform: 'taktische_formation',
    fachaufgabe: 'keine',
    organisation: input.organisation,
    einheit: 'keine',
    verwaltungsstufe: 'keine',
    symbol: 'keines',
    text: '',
    name: input.nameImEinsatz,
    organisationsname: input.organisation,
    unit: input.tacticalSignUnit.trim(),
    typ: input.tacticalSignTyp,
    denominator: input.tacticalSignDenominator.trim() || undefined,
    meta: {
      source: isManual ? 'manual' : 'auto',
      rawName: input.nameImEinsatz,
      updatedAt: new Date().toISOString(),
    },
  };
  return JSON.stringify(config);
}
