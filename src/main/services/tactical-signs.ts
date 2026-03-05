import { readFileSync } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import type { OrganisationKey, TacticalSignConfig } from '../../shared/types';

type TemplateInput = {
  color_primary: string;
  color_secondary: string;
  stroke_color: string;
  color_text: string;
  organization: string;
  unit: string;
  denominator?: string;
  stroke_width?: number;
  platoon?: boolean;
  group?: boolean;
  squad?: boolean;
  zugtrupp?: boolean;
};

const templatePath = path.join(
  path.dirname(require.resolve('taktische-zeichen/package.json')),
  'templates',
  'Einheit.svg',
);
const vehicleTemplatePath = path.join(
  path.dirname(require.resolve('taktische-zeichen/package.json')),
  'templates',
  'Fahrzeug.svg',
);
const personTemplatePath = path.join(
  path.dirname(require.resolve('taktische-zeichen/package.json')),
  'templates',
  'Person.svg',
);
const template = Handlebars.compile(readFileSync(templatePath, 'utf8'));
const vehicleTemplate = Handlebars.compile(readFileSync(vehicleTemplatePath, 'utf8'));
const personTemplate = Handlebars.compile(readFileSync(personTemplatePath, 'utf8'));
const cache = new Map<string, string>();

const ORGANISATION_SHORT_NAMES: Partial<Record<OrganisationKey, string>> = {
  FEUERWEHR: 'FW',
  POLIZEI: 'POL',
  BUNDESWEHR: 'BW',
  DRK: 'DRK',
  ASB: 'ASB',
  JOHANNITER: 'JUH',
  MALTESER: 'MHD',
  DLRG: 'DLRG',
  BERGWACHT: 'BWacht',
  RETTUNGSDIENST_KOMMUNAL: 'RD',
  SONSTIGE: 'ORG',
};

const ORGANISATION_COLORS: Record<OrganisationKey, Pick<TemplateInput, 'color_primary' | 'color_text'>> = {
  THW: { color_primary: '#003399', color_text: '#FFFFFF' },
  FEUERWEHR: { color_primary: '#d61a1f', color_text: '#FFFFFF' },
  POLIZEI: { color_primary: '#13a538', color_text: '#FFFFFF' },
  BUNDESWEHR: { color_primary: '#7a6230', color_text: '#FFFFFF' },
  REGIE: { color_primary: '#f39200', color_text: '#000000' },
  DRK: { color_primary: '#FFFFFF', color_text: '#000000' },
  ASB: { color_primary: '#FFFFFF', color_text: '#000000' },
  JOHANNITER: { color_primary: '#FFFFFF', color_text: '#000000' },
  MALTESER: { color_primary: '#FFFFFF', color_text: '#000000' },
  DLRG: { color_primary: '#FFFFFF', color_text: '#000000' },
  BERGWACHT: { color_primary: '#FFFFFF', color_text: '#000000' },
  MHD: { color_primary: '#FFFFFF', color_text: '#000000' },
  RETTUNGSDIENST_KOMMUNAL: { color_primary: '#FFFFFF', color_text: '#000000' },
  SONSTIGE: { color_primary: '#4b5566', color_text: '#FFFFFF' },
};

/**
 * Handles Organisation Short Name.
 */
function organisationShortName(organisation: OrganisationKey): string {
  return ORGANISATION_SHORT_NAMES[organisation] ?? organisation;
}

/**
 * Handles Organisation Colors.
 */
function organisationColors(organisation: OrganisationKey): Pick<TemplateInput, 'color_primary' | 'color_text'> {
  return ORGANISATION_COLORS[organisation] ?? ORGANISATION_COLORS.SONSTIGE;
}

/**
 * Handles Normalize Type.
 */
function normalizeType(type: unknown): NonNullable<TacticalSignConfig['typ']> | 'none' {
  if (type === 'platoon' || type === 'group' || type === 'squad' || type === 'zugtrupp' || type === 'none') {
    return type;
  }
  // Für den aktuellen MVP nur "einfache Einheit" ohne Führungsstärke-Punkte anzeigen.
  return 'none';
}

/**
 * Handles Normalize Config.
 */
function normalizeConfig(config: TacticalSignConfig | null | undefined): TacticalSignConfig {
  if (!config) {
    return {};
  }
  return config;
}

/**
 * Handles Parse Config.
 */
function parseConfig(config: TacticalSignConfig | null): TacticalSignConfig {
  return normalizeConfig(config);
}

/**
 * Handles Get Tactical Formation Svg Data Url.
 */
export function getTacticalFormationSvgDataUrl(
  organisation: OrganisationKey,
  tacticalSignConfig: TacticalSignConfig | null,
): string {
  const config = parseConfig(tacticalSignConfig);
  const cacheKey = `${organisation}:${JSON.stringify(config)}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const colors = organisationColors(organisation);
  const typ = normalizeType(config.typ);
  const organisationName = config.organisationsname?.trim() || organisationShortName(organisation);
  const unit = config.unit?.trim() || '';
  const denominator = config.denominator?.trim() || undefined;
  const strokeWidth =
    typeof config.strokeWidth === 'number' && Number.isFinite(config.strokeWidth) ? config.strokeWidth : undefined;

  const flags: Pick<TemplateInput, 'platoon' | 'group' | 'squad' | 'zugtrupp'> = {
    platoon: typ === 'platoon',
    group: typ === 'group',
    squad: typ === 'squad',
    zugtrupp: typ === 'zugtrupp',
  };

  const svg = template({
    color_primary: colors.color_primary,
    color_secondary: '#FFFFFF',
    stroke_color: '#000000',
    color_text: colors.color_text,
    organization: organisationName,
    unit,
    denominator,
    stroke_width: strokeWidth,
    ...flags,
  });
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Handles Get Tactical Vehicle Svg Data Url.
 */
export function getTacticalVehicleSvgDataUrl(organisation: OrganisationKey, unit?: string): string {
  const normalizedUnit = unit?.trim() ?? '';
  const cacheKey = `vehicle:${organisation}:${normalizedUnit}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const colors = organisationColors(organisation);
  const svg = vehicleTemplate({
    color_primary: colors.color_primary,
    color_secondary: '#FFFFFF',
    stroke_color: '#000000',
    color_text: colors.color_text,
    organization: organisationShortName(organisation),
    unit: normalizedUnit,
    two_wheels: true,
  });
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Handles Get Tactical Person Svg Data Url.
 */
export function getTacticalPersonSvgDataUrl(
  organisation: OrganisationKey,
  rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER',
): string {
  const cacheKey = `person:${organisation}:${rolle}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const colors = organisationColors(organisation);
  const flags: Pick<TemplateInput, 'platoon' | 'group' | 'squad' | 'zugtrupp'> = {
    platoon: rolle === 'FUEHRER',
    group: rolle === 'UNTERFUEHRER',
    squad: false,
    zugtrupp: false,
  };

  const svg = personTemplate({
    color_primary: colors.color_primary,
    color_secondary: '#FFFFFF',
    stroke_color: '#000000',
    color_text: colors.color_text,
    organization: organisationShortName(organisation),
    unit: '',
    ...flags,
  });
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}
