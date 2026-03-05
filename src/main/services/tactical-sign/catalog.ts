import config from 'taktische-zeichen/config.json';
import type { OrganisationKey } from '../../../shared/types';

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

const SETS = ((config as { sets?: SetDefinition[] }).sets ?? []).filter((set) => Array.isArray(set.symbols));
const RETTUNGSWESEN_ORGANISATIONS = new Set<OrganisationKey>([
  'DRK',
  'ASB',
  'JOHANNITER',
  'MALTESER',
  'DLRG',
  'BERGWACHT',
  'MHD',
  'RETTUNGSDIENST_KOMMUNAL',
]);
const DEFAULT_SET_NAMES = ['THW Einheiten', 'Feuerwehr Einheiten', 'Rettungswesen Einheiten', 'Führungsstellen'];

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
 * Handles Set Names For Organisation.
 */
function setNamesForOrganisation(organisation: OrganisationKey): string[] {
  if (organisation === 'THW') {
    return ['THW Einheiten'];
  }
  if (organisation === 'FEUERWEHR') {
    return ['Feuerwehr Einheiten'];
  }
  if (RETTUNGSWESEN_ORGANISATIONS.has(organisation)) {
    return ['Rettungswesen Einheiten'];
  }
  return DEFAULT_SET_NAMES;
}

/**
 * Creates catalog item for an unversioned symbol.
 */
function createBaseItem(label: string, symbol: SetSymbol): TacticalSignCatalogItem {
  return {
    key: normalizeText(label).replace(/\s+/g, '-'),
    label,
    unit: symbol.unit?.trim() ?? '',
    typ: inferTypByName(label, 'none'),
    denominator: symbol.denominator?.trim() || undefined,
  };
}

/**
 * Creates catalog item for a variant symbol entry.
 */
function createVariantItem(label: string, symbol: SetSymbol, variantKey: string, variantLabel: string): TacticalSignCatalogItem {
  return {
    key: normalizeText(`${label}-${variantKey}`).replace(/\s+/g, '-'),
    label: variantLabel,
    unit: symbol.unit?.trim() ?? '',
    typ: inferTypByName(variantLabel, typFromVariant(variantKey)),
    denominator: symbol.denominator?.trim() || undefined,
  };
}

/**
 * Converts one symbol definition into catalog items.
 */
function buildItemsForSymbol(symbol: SetSymbol): TacticalSignCatalogItem[] {
  const label = symbol.name?.trim();
  if (!label) {
    return [];
  }

  const variants = Object.entries(symbol.variants ?? {});
  if (variants.length === 0) {
    return [createBaseItem(label, symbol)];
  }

  return variants
    .map(([variantKey, variantLabel]) => {
      const normalizedVariantLabel = variantLabel.trim();
      if (!normalizedVariantLabel) {
        return null;
      }
      return createVariantItem(label, symbol, variantKey, normalizedVariantLabel);
    })
    .filter((item): item is TacticalSignCatalogItem => Boolean(item));
}

/**
 * Returns deduplicated and sorted catalog items.
 */
function dedupeAndSort(items: TacticalSignCatalogItem[]): TacticalSignCatalogItem[] {
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
 * Handles Build Catalog For Organisation.
 */
export function buildCatalogForOrganisation(organisation: OrganisationKey): TacticalSignCatalogItem[] {
  const setNames = new Set(setNamesForOrganisation(organisation));
  const items = SETS
    .filter((set) => setNames.has(set.name ?? ''))
    .flatMap((set) => (set.symbols ?? []).flatMap((symbol) => buildItemsForSymbol(symbol)));
  return dedupeAndSort(items);
}

/**
 * Handles Filter Catalog For Query.
 */
export function filterCatalogForQuery(items: TacticalSignCatalogItem[], query?: string): TacticalSignCatalogItem[] {
  const normalizedQuery = normalizeText(query ?? '');
  if (!normalizedQuery) {
    return items;
  }
  return items.filter((item) => normalizeText(item.label).includes(normalizedQuery));
}
