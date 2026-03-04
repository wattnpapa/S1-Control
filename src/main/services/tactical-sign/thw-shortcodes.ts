import { THW_SHORTCODE_RULES, type ThwShortcodeRule } from '../tactical-sign-aliases';

export interface ShortcodeInference {
  rule: ThwShortcodeRule;
  confidence: number;
}

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
 * Handles Has Any Pattern.
 */
function hasAnyPattern(normalizedName: string, nameTokens: Set<string>, patterns: string[]): boolean {
  return patterns.some((pattern) => includesPattern(normalizedName, nameTokens, pattern));
}

/**
 * Handles Infer THW Shortcode.
 */
export function inferThwShortcode(nameImEinsatz: string): ShortcodeInference | null {
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
 * Handles Infer THW Composite Zug.
 */
export function inferThwCompositeZug(nameImEinsatz: string): ShortcodeInference | null {
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
