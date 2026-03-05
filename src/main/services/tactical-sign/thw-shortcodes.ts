import { THW_SHORTCODE_RULES, type ThwShortcodeRule } from '../tactical-sign-aliases';

export interface ShortcodeInference {
  rule: ThwShortcodeRule;
  confidence: number;
}

interface NormalizedNameContext {
  normalizedName: string;
  nameTokens: Set<string>;
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
 * Handles Build Context.
 */
function buildContext(nameImEinsatz: string): NormalizedNameContext | null {
  const normalizedName = normalizeText(nameImEinsatz);
  const nameTokens = new Set(tokenize(nameImEinsatz));
  if (!normalizedName || nameTokens.size === 0) {
    return null;
  }
  return { normalizedName, nameTokens };
}

/**
 * Handles Is Composite Zug Prefix.
 */
function detectCompositeZug(context: NormalizedNameContext): { isTechnischerZug: boolean; isFachzug: boolean } {
  return {
    isTechnischerZug: hasAnyPattern(context.normalizedName, context.nameTokens, ['tz', 'technischer zug']),
    isFachzug: hasAnyPattern(context.normalizedName, context.nameTokens, ['fz', 'fachzug']),
  };
}

/**
 * Handles Infer FZ FK.
 */
function inferFachzugFk(context: NormalizedNameContext): ShortcodeInference | null {
  if (
    !hasAnyPattern(context.normalizedName, context.nameTokens, [
      'fz fk',
      'fachzug fuhrung kommunikation',
      'fachzug fuehrung kommunikation',
      'fuhrung kommunikation',
    ])
  ) {
    return null;
  }
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

/**
 * Handles Infer FZ Log.
 */
function inferFachzugLog(context: NormalizedNameContext): ShortcodeInference | null {
  if (
    !hasAnyPattern(context.normalizedName, context.nameTokens, [
      'fz log',
      'fachzug log',
      'fachzug logistik',
      'logistikzug',
    ])
  ) {
    return null;
  }
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

/**
 * Handles Infer TZ With Group.
 */
function inferTechnischerZugGroup(context: NormalizedNameContext): ShortcodeInference | null {
  const groupCandidates = THW_SHORTCODE_RULES.filter((rule) => rule.typ === 'group');
  for (const rule of groupCandidates) {
    if (hasAnyPattern(context.normalizedName, context.nameTokens, [rule.unit, rule.label, ...rule.patterns])) {
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
  return null;
}

/**
 * Handles Infer THW Shortcode.
 */
export function inferThwShortcode(nameImEinsatz: string): ShortcodeInference | null {
  const context = buildContext(nameImEinsatz);
  if (!context) {
    return null;
  }

  let best: ShortcodeInference | null = null;
  for (const rule of THW_SHORTCODE_RULES) {
    const matchedPatterns = rule.patterns.filter((pattern) =>
      includesPattern(context.normalizedName, context.nameTokens, pattern),
    );
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
  const context = buildContext(nameImEinsatz);
  if (!context) {
    return null;
  }

  const { isTechnischerZug, isFachzug } = detectCompositeZug(context);
  if (!isTechnischerZug && !isFachzug) {
    return null;
  }

  if (isFachzug) {
    const fzFk = inferFachzugFk(context);
    if (fzFk) {
      return fzFk;
    }

    const fzLog = inferFachzugLog(context);
    if (fzLog) {
      return fzLog;
    }
  }

  if (isTechnischerZug) {
    const tzGroup = inferTechnischerZugGroup(context);
    if (tzGroup) {
      return tzGroup;
    }
  }

  return null;
}
