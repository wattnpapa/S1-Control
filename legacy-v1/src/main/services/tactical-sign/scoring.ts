import { TACTICAL_SIGN_ALIASES } from '../tactical-sign-aliases';
import type { TacticalSignCatalogItem } from './catalog';

interface RankedCatalogItem extends TacticalSignCatalogItem {
  normalizedLabel: string;
  tokens: string[];
  aliasTokens: string[];
  score: number;
}

export interface ScoredCatalogItem extends TacticalSignCatalogItem {
  score: number;
}

/**
 * Handles Normalize Text.
 */
export function normalizeText(value: string): string {
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
export function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [];
  }
  return normalized.split(/\s+/).filter((token) => token.length > 0);
}

/**
 * Handles Get Alias Tokens.
 */
function getAliasTokens(key: string): string[] {
  const alias = TACTICAL_SIGN_ALIASES.find((item) => item.key === key);
  if (!alias) {
    return [];
  }
  return alias.aliases.map((entry) => normalizeText(entry)).filter((entry) => entry.length > 0);
}

/**
 * Handles Score Candidate.
 */
function scoreCandidate(name: string, candidate: RankedCatalogItem): number {
  const normalizedName = normalizeText(name);
  const nameTokens = new Set(tokenize(name));
  if (!normalizedName || nameTokens.size === 0) {
    return 0;
  }

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
 * Handles Rank Catalog Candidates.
 */
export function rankCatalogCandidates(name: string, catalog: TacticalSignCatalogItem[]): ScoredCatalogItem[] {
  return catalog
    .map(toRankedCandidate)
    .map((candidate) => ({ ...candidate, score: scoreCandidate(name, candidate) }))
    .sort((a, b) => b.score - a.score);
}
