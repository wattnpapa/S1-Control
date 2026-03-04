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
 * Handles Infer Tactical Sign Config.
 */
export function inferTacticalSignConfig(nameImEinsatz: string, organisation: OrganisationKey): TacticalInferenceResult {
  if (organisation === 'THW') {
    const composite = inferThwCompositeZug(nameImEinsatz);
    if (composite) {
      const matchedKey = `thw-zug-${normalizeText(composite.rule.unit).replace(/\s+/g, '-')}`;
      return {
        confidence: composite.confidence,
        matchedKey,
        matchedLabel: composite.rule.label,
        config: {
          grundform: 'taktische_formation',
          fachaufgabe: 'keine',
          organisation,
          einheit: 'keine',
          verwaltungsstufe: 'keine',
          symbol: 'keines',
          text: '',
          name: nameImEinsatz,
          organisationsname: organisation,
          unit: composite.rule.unit,
          typ: composite.rule.typ,
          meta: buildMeta({
            source: 'auto',
            rawName: nameImEinsatz,
            confidence: composite.confidence,
            matchedKey,
            matchedLabel: composite.rule.label,
          }),
        },
      };
    }

    const thwShortcode = inferThwShortcode(nameImEinsatz);
    if (thwShortcode) {
      const matchedKey = `thw-shortcode-${normalizeText(thwShortcode.rule.unit).replace(/\s+/g, '-')}`;
      return {
        confidence: thwShortcode.confidence,
        matchedKey,
        matchedLabel: thwShortcode.rule.label,
        config: {
          grundform: 'taktische_formation',
          fachaufgabe: 'keine',
          organisation,
          einheit: 'keine',
          verwaltungsstufe: 'keine',
          symbol: 'keines',
          text: '',
          name: nameImEinsatz,
          organisationsname: organisation,
          unit: thwShortcode.rule.unit,
          typ: thwShortcode.rule.typ,
          meta: buildMeta({
            source: 'auto',
            rawName: nameImEinsatz,
            confidence: thwShortcode.confidence,
            matchedKey,
            matchedLabel: thwShortcode.rule.label,
          }),
        },
      };
    }
  }

  const catalog = buildCatalogForOrganisation(organisation);
  const ranked = rankCatalogCandidates(nameImEinsatz, catalog);
  const best = ranked[0];
  const confidence = best?.score ?? 0;

  if (!best || confidence < AUTO_THRESHOLD) {
    return {
      confidence,
      config: {
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
        typ: 'none',
        meta: buildMeta({
          source: 'auto',
          rawName: nameImEinsatz,
          confidence,
        }),
      },
    };
  }

  return {
    confidence,
    matchedKey: best.key,
    matchedLabel: best.label,
    config: {
      grundform: 'taktische_formation',
      fachaufgabe: 'keine',
      organisation,
      einheit: 'keine',
      verwaltungsstufe: 'keine',
      symbol: 'keines',
      text: '',
      name: nameImEinsatz,
      organisationsname: organisation,
      unit: best.unit,
      typ: best.typ,
      denominator: best.denominator,
      meta: buildMeta({
        source: 'auto',
        rawName: nameImEinsatz,
        confidence,
        matchedKey: best.key,
        matchedLabel: best.label,
      }),
    },
  };
}

/**
 * Handles To Json Config String.
 */
export function toTacticalSignConfigJson(configInput: TacticalSignConfig): string {
  const config: TacticalSignConfig = {
    grundform: 'taktische_formation',
    fachaufgabe: 'keine',
    einheit: 'keine',
    verwaltungsstufe: 'keine',
    symbol: 'keines',
    text: '',
    ...configInput,
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
    grundform: 'taktische_formation',
    fachaufgabe: 'keine',
    organisation: fallbackOrganisation,
    einheit: 'keine',
    verwaltungsstufe: 'keine',
    symbol: 'keines',
    text: '',
    name: fallbackName,
    organisationsname: fallbackOrganisation,
    typ: 'none',
    unit: '',
    ...config,
  };
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
