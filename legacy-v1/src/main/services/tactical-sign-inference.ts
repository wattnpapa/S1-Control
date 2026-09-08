import type { OrganisationKey, TacticalSignConfig, TacticalSignMeta } from '../../shared/types';
import {
  buildCatalogForOrganisation,
  filterCatalogForQuery,
  type TacticalSignCatalogItem,
} from './tactical-sign/catalog';
import { normalizeText, rankCatalogCandidates } from './tactical-sign/scoring';
import { inferThwCompositeZug, inferThwShortcode } from './tactical-sign/thw-shortcodes';

const RULE_VERSION = 1;
const AUTO_THRESHOLD = 0.6;

export interface TacticalInferenceResult {
  config: TacticalSignConfig;
  confidence: number;
  matchedKey?: string;
  matchedLabel?: string;
}

type InferenceMatch = {
  confidence: number;
  matchedKey?: string;
  matchedLabel?: string;
  einheit?: string;
  typ?: TacticalSignConfig['typ'];
  verwaltungsstufe?: string;
};

/**
 * Normalizes legacy typ values to current doku enums.
 */
function normalizeTyp(typ: TacticalSignConfig['typ']): TacticalSignConfig['typ'] {
  if (!typ) {
    return 'none';
  }
  if (typ === 'group') return 'gruppe';
  if (typ === 'squad') return 'trupp';
  if (typ === 'platoon') return 'zug';
  return typ;
}

/**
 * Handles Build Meta.
 */
function buildMeta(input: {
  source: 'auto' | 'manual';
  rawName: string;
  confidence?: number;
  matchedKey?: string;
  matchedLabel?: string;
}): TacticalSignMeta {
  return {
    source: input.source,
    rawName: input.rawName,
    confidence: input.confidence,
    matchedKey: input.matchedKey,
    matchedLabel: input.matchedLabel,
    ruleVersion: RULE_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Builds common base config for inferred signs.
 */
function buildDefaultConfig(nameImEinsatz: string, organisation: OrganisationKey): TacticalSignConfig {
  return {
    grundzeichen: 'taktische-formation',
    organisation,
    einheit: '',
    verwaltungsstufe: undefined,
    text: '',
    name: nameImEinsatz,
    organisationName: organisation,
  };
}

/**
 * Creates result payload for tactical inference.
 */
function buildInferenceResult(
  nameImEinsatz: string,
  organisation: OrganisationKey,
  match: InferenceMatch,
): TacticalInferenceResult {
  return {
    confidence: match.confidence,
    matchedKey: match.matchedKey,
    matchedLabel: match.matchedLabel,
    config: {
      ...buildDefaultConfig(nameImEinsatz, organisation),
      einheit: match.einheit ?? '',
      typ: normalizeTyp(match.typ),
      verwaltungsstufe: match.verwaltungsstufe || undefined,
      meta: buildMeta({
        source: 'auto',
        rawName: nameImEinsatz,
        confidence: match.confidence,
        matchedKey: match.matchedKey,
        matchedLabel: match.matchedLabel,
      }),
    },
  };
}

/**
 * Applies THW-specific shorthand inference rules.
 */
function inferThwSpecific(nameImEinsatz: string): InferenceMatch | null {
  const composite = inferThwCompositeZug(nameImEinsatz);
  if (composite) {
    return {
      confidence: composite.confidence,
      matchedKey: `thw-zug-${normalizeText(composite.rule.unit).replace(/\s+/g, '-')}`,
      matchedLabel: composite.rule.label,
      einheit: composite.rule.unit,
      typ: composite.rule.typ,
    };
  }

  const shortcode = inferThwShortcode(nameImEinsatz);
  if (!shortcode) {
    return null;
  }
  return {
    confidence: shortcode.confidence,
    matchedKey: `thw-shortcode-${normalizeText(shortcode.rule.unit).replace(/\s+/g, '-')}`,
    matchedLabel: shortcode.rule.label,
    einheit: shortcode.rule.unit,
    typ: shortcode.rule.typ,
  };
}

/**
 * Infers tactical sign from configured catalog entries.
 */
function inferFromCatalog(nameImEinsatz: string, organisation: OrganisationKey): InferenceMatch {
  const ranked = rankCatalogCandidates(nameImEinsatz, buildCatalogForOrganisation(organisation));
  const best = ranked[0];
  const confidence = best?.score ?? 0;
  if (!best || confidence < AUTO_THRESHOLD) {
    return { confidence };
  }
  return {
    confidence,
    matchedKey: best.key,
    matchedLabel: best.label,
    einheit: best.einheit,
    typ: best.typ,
    verwaltungsstufe: best.verwaltungsstufe,
  };
}

/**
 * Handles Infer Tactical Sign Config.
 */
export function inferTacticalSignConfig(nameImEinsatz: string, organisation: OrganisationKey): TacticalInferenceResult {
  if (organisation === 'THW') {
    const thwMatch = inferThwSpecific(nameImEinsatz);
    if (thwMatch) {
      return buildInferenceResult(nameImEinsatz, organisation, thwMatch);
    }
  }
  return buildInferenceResult(nameImEinsatz, organisation, inferFromCatalog(nameImEinsatz, organisation));
}

/**
 * Handles To Json Config String.
 */
export function toTacticalSignConfigJson(configInput: TacticalSignConfig): string {
  const config: TacticalSignConfig = {
    grundzeichen: 'taktische-formation',
    einheit: '',
    verwaltungsstufe: undefined,
    text: '',
    ...configInput,
    typ: normalizeTyp(configInput.typ),
  };
  return JSON.stringify(config);
}

/**
 * Handles Parse Tactical Sign Config Json.
 */
export function parseTacticalSignConfigJson(value: string | null | undefined): TacticalSignConfig | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as TacticalSignConfig;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Handles Ensure Tactical Sign Config Source.
 */
export function ensureTacticalSignConfigSource(
  config: TacticalSignConfig,
  source: 'auto' | 'manual',
  fallbackName: string,
  fallbackOrganisation: OrganisationKey,
): TacticalSignConfig {
  const base: TacticalSignConfig = {
    grundzeichen: 'taktische-formation',
    organisation: fallbackOrganisation,
    einheit: '',
    verwaltungsstufe: undefined,
    text: '',
    name: fallbackName,
    organisationName: fallbackOrganisation,
    typ: 'none',
    ...config,
  };
  base.typ = normalizeTyp(base.typ);
  base.meta = buildMeta({
    source,
    rawName: base.name ?? fallbackName,
    confidence: source === 'manual' ? undefined : base.meta?.confidence,
    matchedKey: source === 'manual' ? undefined : base.meta?.matchedKey,
    matchedLabel: source === 'manual' ? undefined : base.meta?.matchedLabel,
  });
  return base;
}

/**
 * Handles List Tactical Sign Catalog.
 */
export function listTacticalSignCatalog(
  organisation: OrganisationKey,
  query?: string,
): TacticalSignCatalogItem[] {
  return filterCatalogForQuery(buildCatalogForOrganisation(organisation), query);
}
