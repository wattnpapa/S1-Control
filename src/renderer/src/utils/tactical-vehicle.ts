import type { OrganisationKey } from '@shared/types';

interface VehicleInferenceRule {
  unit: string;
  patterns: string[];
}

const THW_VEHICLE_RULES: VehicleInferenceRule[] = [
  { unit: 'BRmG', patterns: ['brmg', 'bergungsraumgerat', 'bergungsraeumgeraet', 'radlader', 'bagger', 'kompaktlader'] },
  { unit: 'Bus', patterns: ['bus'] },
  { unit: 'DUKW', patterns: ['dukw', 'amphibienfahrzeug'] },
  { unit: 'FmKW', patterns: ['fmkw', 'fernmeldekraftwagen'] },
  { unit: 'FüKomKW', patterns: ['fukomkw', 'fuekomkw', 'fuhrungskommunikationskraftwagen', 'fuehrungskommunikationskraftwagen'] },
  { unit: 'FüKW', patterns: ['fukw', 'fuekw', 'fuhrungskraftwagen', 'fuehrungskraftwagen'] },
  { unit: 'Gabelstapler', patterns: ['gabelstapler'] },
  { unit: 'GKW I', patterns: ['gkw i', 'gkw1', 'gkwi', 'geratekraftwagen i', 'geraetekraftwagen i'] },
  { unit: 'GKW II', patterns: ['gkw ii', 'gkw2', 'gkwii', 'geratekraftwagen ii', 'geraetekraftwagen ii'] },
  { unit: 'Häg', patterns: ['hag', 'haeg', 'hagg', 'hagglunds', 'haegglunds'] },
  { unit: 'LKW-K', patterns: ['lkw k', 'lkw-k', 'lkw kipper', 'dreiseitenkipper'] },
  { unit: 'LKW Lbw', patterns: ['lkw lbw', 'lkw-lbw', 'ladebordwand'] },
  { unit: 'LKW Lkr', patterns: ['lkw lkr', 'lkw-lkr', 'ladekran'] },
  { unit: 'MastKW', patterns: ['mastkw', 'mast kraftwagen', 'funkmastfahrzeug'] },
  { unit: 'MLW I', patterns: ['mlw i', 'mlw 1', 'mlw1', 'mlwi'] },
  { unit: 'MLW II', patterns: ['mlw ii', 'mlw 2', 'mlw2', 'mlwii'] },
  { unit: 'MLW III', patterns: ['mlw iii', 'mlw 3', 'mlw3', 'mlwiii'] },
  { unit: 'MLW IV', patterns: ['mlw iv', 'mlw 4', 'mlw4', 'mlwiv'] },
  { unit: 'MLW V', patterns: ['mlw v', 'mlw 5', 'mlw5', 'mlwv'] },
  { unit: 'MLW', patterns: ['mlw', 'mannschaftslastwagen'] },
  { unit: 'MTW', patterns: ['mtw', 'mannschaftstransportwagen'] },
  { unit: 'MzKW', patterns: ['mzkw', 'mehrzweckkraftwagen'] },
  { unit: 'Pkw gl', patterns: ['pkw gl', 'pkw-gl', 'pkw gelandegangig', 'pkw gelaendegaengig', 'gelandegangig'] },
  { unit: 'Pkw Kombi', patterns: ['pkw kombi', 'kombi'] },
  { unit: 'Pkw', patterns: ['pkw', 'personenkraftwagen'] },
  { unit: 'WLF', patterns: ['wlf', 'wechselladefahrzeug'] },
];

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
 * Handles Includes Pattern.
 */
function includesPattern(normalized: string, pattern: string): boolean {
  const normalizedPattern = normalizeText(pattern);
  if (!normalizedPattern) {
    return false;
  }
  return normalized.includes(normalizedPattern);
}

/**
 * Handles Match Score.
 */
function matchScore(normalized: string, patterns: string[]): number {
  let best = 0;
  for (const pattern of patterns) {
    if (!includesPattern(normalized, pattern)) {
      continue;
    }
    const length = normalizeText(pattern).length;
    if (length > best) {
      best = length;
    }
  }
  return best;
}

/**
 * Handles Infer Vehicle Tactical Unit.
 */
export function inferVehicleTacticalUnit(
  organisation: OrganisationKey | null,
  input: { name?: string | null; funkrufname?: string | null },
): string {
  if (organisation !== 'THW') {
    return '';
  }
  const source = `${input.name ?? ''} ${input.funkrufname ?? ''}`.trim();
  const normalized = normalizeText(source);
  if (!normalized) {
    return '';
  }
  let matched: VehicleInferenceRule | null = null;
  let bestScore = 0;
  for (const rule of THW_VEHICLE_RULES) {
    const score = matchScore(normalized, rule.patterns);
    if (score <= 0) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      matched = rule;
    }
  }
  return matched?.unit ?? '';
}
