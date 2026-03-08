import { einheiten } from 'taktische-zeichen-core';
import type { OrganisationKey, TacticalSignConfig } from '../../../shared/types';

export interface TacticalSignCatalogItem {
  key: string;
  label: string;
  einheit: string;
  typ: NonNullable<TacticalSignConfig['typ']>;
  verwaltungsstufe?: string;
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
 * Maps one einheit enum entry to catalog item.
 */
function toCatalogItem(item: (typeof einheiten)[number]): TacticalSignCatalogItem {
  return {
    key: item.id,
    label: item.label,
    einheit: item.id,
    typ: item.id,
    verwaltungsstufe: undefined,
  };
}

/**
 * Handles Build Catalog For Organisation.
 * Core enum catalog is organisation-agnostic by design.
 */
export function buildCatalogForOrganisation(_organisation: OrganisationKey): TacticalSignCatalogItem[] {
  return einheiten
    .map(toCatalogItem)
    .sort((a, b) => a.label.localeCompare(b.label, 'de'));
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
