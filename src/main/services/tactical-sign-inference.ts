import config from 'taktische-zeichen/config.json';
import type { OrganisationKey, TacticalSignConfig, TacticalSignMeta } from '../../shared/types';
import { TACTICAL_SIGN_ALIASES, THW_SHORTCODE_RULES, type ThwShortcodeRule } from './tactical-sign-aliases';

const RULE_VERSION = 1;
const AUTO_THRESHOLD = 0.6;

interface SetSymbol {
  name?: string;
  unit?: string;
  denominator?: string;
  variants?: Record<string, string>;
}

interface SetDefinition {
  name?: string;
  symbols?: SetSymbol[];
}

export interface TacticalSignCatalogItem {
  key: string;
  label: string;
  unit: string;
  typ: 'none' | 'platoon' | 'group' | 'squad' | 'zugtrupp';
  denominator?: string;
}

interface RankedCatalogItem extends TacticalSignCatalogItem {
  normalizedLabel: string;
  tokens: string[];
  aliasTokens: string[];
  score: number;
}

interface ShortcodeInference {
  rule: ThwShortcodeRule;
  confidence: number;
}

export interface TacticalInferenceResult {
  config: TacticalSignConfig;
  confidence: number;
  matchedKey?: string;
  matchedLabel?: string;
}

const SETS = ((config as { sets?: SetDefinition[] }).sets ?? []).filter((set) => Array.isArray(set.symbols));

/**
 * Handles Normalize Text.
 */
function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Handles Tokenize.
 */
function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Handles Typ From Variant.
 */
function typFromVariant(variant: string): 'none' | 'platoon' | 'group' | 'squad' | 'zugtrupp' {
  if (variant === 'platoon') return 'platoon';
  if (variant === 'group') return 'group';
  if (variant === 'squad') return 'squad';
  if (variant === 'zugtrupp') return 'zugtrupp';
  return 'none';
}

/**
 * Handles Infer Typ By Name.
 */
function inferTypByName(
  name: string,
  fallback: 'none' | 'platoon' | 'group' | 'squad' | 'zugtrupp',
): 'none' | 'platoon' | 'group' | 'squad' | 'zugtrupp' {
  const normalized = normalizeText(name);
  if (!normalized) return fallback;
  if (normalized.includes('fachzug') || normalized.includes('technischer zug')) return 'platoon';
  if (normalized.includes('zugtrupp')) return 'zugtrupp';
  if (normalized.includes('trupp')) return 'squad';
  if (normalized.includes('gruppe') || normalized.includes('fgr')) return 'group';
  return fallback;
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
 * Handles Set Names For Organisation.
 */
function setNamesForOrganisation(organisation: OrganisationKey): string[] {
  if (organisation === 'THW') return ['THW Einheiten'];
  if (organisation === 'FEUERWEHR') return ['Feuerwehr Einheiten'];
  if (
    organisation === 'DRK' ||
    organisation === 'ASB' ||
    organisation === 'JOHANNITER' ||
    organisation === 'MALTESER' ||
    organisation === 'DLRG' ||
    organisation === 'BERGWACHT' ||
    organisation === 'MHD' ||
    organisation === 'RETTUNGSDIENST_KOMMUNAL'
  ) {
    return ['Rettungswesen Einheiten'];
  }
  return ['THW Einheiten', 'Feuerwehr Einheiten', 'Rettungswesen Einheiten', 'Führungsstellen'];
}

/**
 * Handles Get Alias Tokens.
 */
function getAliasTokens(key: string): string[] {
  const alias = TACTICAL_SIGN_ALIASES.find((item) => item.key === key);
  if (!alias) return [];
  return alias.aliases.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0);
}

/**
 * Handles Build Catalog For Organisation.
 */
function buildCatalogForOrganisation(organisation: OrganisationKey): TacticalSignCatalogItem[] {
  const setNames = new Set(setNamesForOrganisation(organisation));
  const items: TacticalSignCatalogItem[] = [];

  for (const set of SETS) {
    const setName = set.name ?? '';
    if (!setNames.has(setName)) continue;
    for (const symbol of set.symbols ?? []) {
      const label = symbol.name?.trim();
      if (!label) continue;
      const variants = symbol.variants ?? {};
      const variantEntries = Object.entries(variants);
      if (variantEntries.length === 0) {
        items.push({
          key: normalizeText(label).replace(/\s+/g, '-'),
          label,
          unit: symbol.unit?.trim() ?? '',
          typ: inferTypByName(label, 'none'),
          denominator: symbol.denominator?.trim() || undefined,
        });
        continue;
      }

      for (const [variantKey, variantLabel] of variantEntries) {
        const normalizedVariantLabel = variantLabel.trim();
        if (!normalizedVariantLabel) continue;
        items.push({
          key: normalizeText(`${label}-${variantKey}`).replace(/\s+/g, '-'),
          label: normalizedVariantLabel,
          unit: symbol.unit?.trim() ?? '',
          typ: inferTypByName(normalizedVariantLabel, typFromVariant(variantKey)),
          denominator: symbol.denominator?.trim() || undefined,
        });
      }
    }
  }

  const dedup = new Map<string, TacticalSignCatalogItem>();
  for (const item of items) {
    const key = `${normalizeText(item.label)}|${item.unit}|${item.typ}|${item.denominator ?? ''}`;
    if (!dedup.has(key)) {
      dedup.set(key, item);
    }
  }
  return [...dedup.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

/**
 * Handles Score Candidate.
 */
function scoreCandidate(name: string, candidate: RankedCatalogItem): number {
  const normalizedName = normalizeText(name);
  const nameTokens = new Set(tokenize(name));
  if (!normalizedName || nameTokens.size === 0) return 0;

  let score = 0;
  if (normalizedName.includes(candidate.normalizedLabel)) {
    score += 0.55;
  }
  if (candidate.unit && normalizedName.includes(normalizeText(candidate.unit))) {
    score += 0.25;
  }

  const overlapping = candidate.tokens.filter((token) => nameTokens.has(token)).length;
  if (candidate.tokens.length > 0) {
    score += (overlapping / candidate.tokens.length) * 0.25;
  }

  const aliasHit = candidate.aliasTokens.some((alias) => alias.length > 0 && normalizedName.includes(alias));
  if (aliasHit) {
    score += 0.3;
  }

  return Math.min(1, score);
}

/**
 * Handles Includes Pattern.
 */
function includesPattern(normalizedName: string, nameTokens: Set<string>, pattern: string): boolean {
  const normalizedPattern = normalizeText(pattern);
  if (!normalizedPattern) {
    return false;
  }
  if (normalizedPattern.includes(' ')) {
    return normalizedName.includes(normalizedPattern);
  }
  return nameTokens.has(normalizedPattern);
}

/**
 * Handles Infer THW Shortcode.
 */
function inferThwShortcode(nameImEinsatz: string): ShortcodeInference | null {
  const normalizedName = normalizeText(nameImEinsatz);
  const nameTokens = new Set(tokenize(nameImEinsatz));
  if (!normalizedName || nameTokens.size === 0) {
    return null;
  }

  let best: ShortcodeInference | null = null;
  for (const rule of THW_SHORTCODE_RULES) {
    const matchedPatterns = rule.patterns.filter((pattern) => includesPattern(normalizedName, nameTokens, pattern));
    if (matchedPatterns.length === 0) {
      continue;
    }
    const score = Math.min(1, 0.72 + matchedPatterns.length * 0.08);
    if (!best || score > best.confidence) {
      best = { rule, confidence: score };
    }
  }
  return best;
}

/**
 * Handles Has Any Pattern.
 */
function hasAnyPattern(normalizedName: string, nameTokens: Set<string>, patterns: string[]): boolean {
  return patterns.some((pattern) => includesPattern(normalizedName, nameTokens, pattern));
}

/**
 * Handles Infer THW Composite Zug.
 */
function inferThwCompositeZug(nameImEinsatz: string): ShortcodeInference | null {
  const normalizedName = normalizeText(nameImEinsatz);
  const nameTokens = new Set(tokenize(nameImEinsatz));
  if (!normalizedName || nameTokens.size === 0) {
    return null;
  }

  const isTechnischerZug = hasAnyPattern(normalizedName, nameTokens, ['tz', 'technischer zug']);
  const isFachzug = hasAnyPattern(normalizedName, nameTokens, ['fz', 'fachzug']);
  if (!isTechnischerZug && !isFachzug) {
    return null;
  }

  if (
    isFachzug &&
    hasAnyPattern(normalizedName, nameTokens, [
      'fz fk',
      'fachzug fuhrung kommunikation',
      'fachzug fuehrung kommunikation',
      'fuhrung kommunikation',
    ])
  ) {
    return {
      rule: {
        unit: 'FZ-FK',
        label: 'Fachzug Führung und Kommunikation',
        typ: 'platoon',
        patterns: [],
      },
      confidence: 0.9,
    };
  }

  if (
    isFachzug &&
    hasAnyPattern(normalizedName, nameTokens, [
      'fz log',
      'fachzug log',
      'fachzug logistik',
      'logistikzug',
    ])
  ) {
    return {
      rule: {
        unit: 'FZ-Log',
        label: 'Fachzug Logistik',
        typ: 'platoon',
        patterns: [],
      },
      confidence: 0.9,
    };
  }

  if (isTechnischerZug) {
    const groupCandidates = THW_SHORTCODE_RULES.filter((rule) => rule.typ === 'group');
    for (const rule of groupCandidates) {
      if (hasAnyPattern(normalizedName, nameTokens, [rule.unit, rule.label, ...rule.patterns])) {
        return {
          rule: {
            unit: `TZ-${rule.unit}`,
            label: `Technischer Zug mit Fachgruppe ${rule.label}`,
            typ: 'platoon',
            patterns: [],
          },
          confidence: 0.88,
        };
      }
    }
  }

  return null;
}

/**
 * Handles To Ranked Candidate.
 */
function toRankedCandidate(item: TacticalSignCatalogItem): RankedCatalogItem {
  return {
    ...item,
    normalizedLabel: normalizeText(item.label),
    tokens: tokenize(item.label),
    aliasTokens: getAliasTokens(item.key),
    score: 0,
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

  const catalog = buildCatalogForOrganisation(organisation).map(toRankedCandidate);
  const ranked = catalog
    .map((candidate) => ({ ...candidate, score: scoreCandidate(nameImEinsatz, candidate) }))
    .sort((a, b) => b.score - a.score);
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
  const list = buildCatalogForOrganisation(organisation);
  const normalizedQuery = normalizeText(query ?? '');
  if (!normalizedQuery) {
    return list;
  }
  return list.filter((item) => normalizeText(item.label).includes(normalizedQuery));
}
