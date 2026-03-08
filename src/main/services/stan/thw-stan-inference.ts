import type { OrganisationKey, ThwStanPresetSuggestion } from '../../../shared/types';
import stanData from './thw-stan-2025.generated.json';

interface RawStanEntry {
  id: string;
  title: string;
  sourceFile?: string;
  strength: ThwStanPresetSuggestion['strength'];
  vehicles: string[];
  tacticalSign?: ThwStanPresetSuggestion['tacticalSign'];
  vehicleTacticalSigns?: ThwStanPresetSuggestion['vehicleTacticalSigns'];
}

const EXCLUDED_IDS = new Set(['vorbemerkung', 'anschreiben-stan']);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value: string): Set<string> {
  const normalized = normalize(value);
  if (!normalized) {
    return new Set();
  }
  return new Set(normalized.split(/\s+/).filter((part) => part.length > 0));
}

function entryKeywords(entry: RawStanEntry): Set<string> {
  const tokens = new Set<string>();
  for (const token of tokenize(entry.title)) {
    tokens.add(token);
  }
  if (entry.sourceFile) {
    for (const token of tokenize(entry.sourceFile)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function entryScore(queryTokens: Set<string>, entry: RawStanEntry): number {
  if (queryTokens.size === 0) {
    return 0;
  }
  const keywords = entryKeywords(entry);
  if (keywords.size === 0) {
    return 0;
  }
  let hits = 0;
  for (const token of queryTokens) {
    if (keywords.has(token)) {
      hits += 1;
    }
  }
  const overlapScore = hits / queryTokens.size;
  const directIdBoost = keywords.has(normalize(entry.id).replace(/\s+/g, '')) ? 0.1 : 0;
  return Math.min(1, overlapScore + directIdBoost);
}

function buildSuggestions(): RawStanEntry[] {
  const raw = (stanData as { entries?: RawStanEntry[] }).entries ?? [];
  return raw.filter((entry) => !EXCLUDED_IDS.has(entry.id));
}

const ALL_STAN_ENTRIES = buildSuggestions();

function heuristicStrength(title: string): ThwStanPresetSuggestion['strength'] {
  const normalized = normalize(title);
  if (normalized.includes('ztr')) {
    return { fuehrung: 1, unterfuehrung: 2, mannschaft: 6, gesamt: 9 };
  }
  if (normalized.includes(' tr ')) {
    return { fuehrung: 0, unterfuehrung: 1, mannschaft: 2, gesamt: 3 };
  }
  if (normalized.includes('tz') || normalized.includes('fachzug') || normalized.includes('fz ')) {
    return { fuehrung: 1, unterfuehrung: 4, mannschaft: 20, gesamt: 25 };
  }
  if (normalized.includes('stab')) {
    return { fuehrung: 1, unterfuehrung: 3, mannschaft: 10, gesamt: 14 };
  }
  return { fuehrung: 0, unterfuehrung: 2, mannschaft: 7, gesamt: 9 };
}

function heuristicVehicles(title: string): string[] {
  const normalized = normalize(title);
  if (normalized.includes('ztr fk')) {
    return ['FüKomKW', 'FüKW'];
  }
  if (normalized.includes('f ') || normalized === 'f') {
    return ['FüKW', 'FmKW'];
  }
  if (normalized.includes('k ') || normalized === 'k') {
    return ['FmKW', 'MastKW'];
  }
  if (normalized.includes('log mw')) {
    return ['MLW IV', 'LKW Lbw'];
  }
  if (normalized.includes('log v')) {
    return ['LKW Lbw', 'MTW'];
  }
  if (normalized.includes('ztr log')) {
    return ['MTW'];
  }
  if (normalized.includes('brb')) {
    return ['LKW-K', 'MzKW'];
  }
  if (normalized.includes('r ') || normalized.startsWith('r ')) {
    return ['GKW I', 'LKW-K'];
  }
  if (normalized.includes('w ') || normalized.startsWith('w ')) {
    return ['MzKW', 'GKW I'];
  }
  return ['GKW I', 'MTW'];
}

function heuristicTacticalSign(title: string): NonNullable<ThwStanPresetSuggestion['tacticalSign']> {
  const normalized = normalize(title);
  const denominatorMatch = title.match(/\(([ABC])\)\)?$/i);
  let unit = title.replace(/[()]/g, '').trim();
  if (normalized.includes('ztr')) {
    unit = 'ZTr';
  } else if (normalized.includes('fgr k')) {
    unit = 'K';
  } else if (normalized.includes('fgr f')) {
    unit = 'F';
  } else if (normalized.includes('fgr r')) {
    unit = 'R';
  } else if (normalized.includes('fgr w')) {
    unit = 'W';
  }
  const typ: NonNullable<NonNullable<ThwStanPresetSuggestion['tacticalSign']>['typ']> =
    normalized.includes('ztr') ? 'zugtrupp' : normalized.includes('tr ') ? 'trupp' : 'gruppe';
  return {
    grundform: 'taktische-formation',
    fachaufgabe: '',
    organisation: 'THW',
    einheit: unit,
    symbol: '',
    text: title,
    name: title,
    organisationsname: 'THW',
    typ,
    verwaltungsstufe: denominatorMatch ? denominatorMatch[1].toUpperCase() : '',
  };
}

function heuristicVehicleSigns(vehicles: string[]): NonNullable<ThwStanPresetSuggestion['vehicleTacticalSigns']> {
  return vehicles.map((name) => {
    const isTrailer = /anh[aä]nger/i.test(name);
    const signUnit = name.trim();
    return {
      grundform: isTrailer ? 'anhaenger' : 'fahrzeug',
      fachaufgabe: '',
      organisation: 'THW',
      einheit: signUnit,
      verwaltungsstufe: '',
      symbol: '',
      text: name,
      name,
      organisationsname: 'THW',
      typ: 'none',
    };
  });
}

/**
 * Finds the best matching THW STAN preset for a free-text unit name.
 */
export function inferThwStanPreset(
  organisation: OrganisationKey,
  nameImEinsatz: string,
): ThwStanPresetSuggestion | null {
  if (organisation !== 'THW') {
    return null;
  }
  const queryTokens = tokenize(nameImEinsatz);
  if (queryTokens.size === 0) {
    return null;
  }

  let best: RawStanEntry | null = null;
  let bestScore = 0;
  for (const entry of ALL_STAN_ENTRIES) {
    const score = entryScore(queryTokens, entry);
    if (score <= bestScore) {
      continue;
    }
    best = entry;
    bestScore = score;
  }
  if (!best || bestScore < 0.45) {
    return null;
  }
  return {
    id: best.id,
    title: best.title,
    sourceFile: best.sourceFile,
    confidence: bestScore,
    strength: best.strength ?? heuristicStrength(best.title),
    vehicles: best.vehicles.length > 0 ? best.vehicles : heuristicVehicles(best.title),
    tacticalSign: best.tacticalSign ?? heuristicTacticalSign(best.title),
    vehicleTacticalSigns:
      best.vehicleTacticalSigns && best.vehicleTacticalSigns.length > 0
        ? best.vehicleTacticalSigns
        : heuristicVehicleSigns(best.vehicles.length > 0 ? best.vehicles : heuristicVehicles(best.title)),
  };
}
