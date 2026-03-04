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
 * Handles Build Catalog For Organisation.
 */
export function buildCatalogForOrganisation(organisation: OrganisationKey): TacticalSignCatalogItem[] {
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
 * Handles Filter Catalog For Query.
 */
export function filterCatalogForQuery(items: TacticalSignCatalogItem[], query?: string): TacticalSignCatalogItem[] {
  const normalizedQuery = normalizeText(query ?? '');
  if (!normalizedQuery) {
    return items;
  }
  return items.filter((item) => normalizeText(item.label).includes(normalizedQuery));
}
