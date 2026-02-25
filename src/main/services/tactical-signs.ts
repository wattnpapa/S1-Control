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
const template = Handlebars.compile(readFileSync(templatePath, 'utf8'));
const vehicleTemplate = Handlebars.compile(readFileSync(vehicleTemplatePath, 'utf8'));
const cache = new Map<string, string>();

function organisationShortName(organisation: OrganisationKey): string {
  switch (organisation) {
    case 'FEUERWEHR':
      return 'FW';
    case 'POLIZEI':
      return 'POL';
    case 'BUNDESWEHR':
      return 'BW';
    case 'DRK':
      return 'DRK';
    case 'ASB':
      return 'ASB';
    case 'JOHANNITER':
      return 'JUH';
    case 'MALTESER':
      return 'MHD';
    case 'DLRG':
      return 'DLRG';
    case 'BERGWACHT':
      return 'BWacht';
    case 'RETTUNGSDIENST_KOMMUNAL':
      return 'RD';
    case 'SONSTIGE':
      return 'ORG';
    default:
      return organisation;
  }
}

function organisationColors(organisation: OrganisationKey): Pick<TemplateInput, 'color_primary' | 'color_text'> {
  switch (organisation) {
    case 'THW':
      return { color_primary: '#003399', color_text: '#FFFFFF' };
    case 'FEUERWEHR':
      return { color_primary: '#d61a1f', color_text: '#FFFFFF' };
    case 'POLIZEI':
      return { color_primary: '#13a538', color_text: '#FFFFFF' };
    case 'BUNDESWEHR':
      return { color_primary: '#7a6230', color_text: '#FFFFFF' };
    case 'REGIE':
      return { color_primary: '#5e6675', color_text: '#FFFFFF' };
    case 'DRK':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'ASB':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'JOHANNITER':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'MALTESER':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'DLRG':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'BERGWACHT':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'MHD':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'RETTUNGSDIENST_KOMMUNAL':
      return { color_primary: '#FFFFFF', color_text: '#000000' };
    case 'SONSTIGE':
      return { color_primary: '#4b5566', color_text: '#FFFFFF' };
    default:
      return { color_primary: '#4b5566', color_text: '#FFFFFF' };
  }
}

function normalizeType(type: unknown): NonNullable<TacticalSignConfig['typ']> | 'none' {
  if (type === 'group' || type === 'squad' || type === 'zugtrupp') {
    return type;
  }
  // Für den aktuellen MVP nur "einfache Einheit" ohne Führungsstärke-Punkte anzeigen.
  return 'none';
}

function normalizeConfig(config: TacticalSignConfig | null | undefined): TacticalSignConfig {
  if (!config) {
    return {};
  }
  return config;
}

function parseConfig(config: TacticalSignConfig | null): TacticalSignConfig {
  return normalizeConfig(config);
}

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

export function getTacticalVehicleSvgDataUrl(organisation: OrganisationKey): string {
  const cacheKey = `vehicle:${organisation}`;
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
    unit: '',
    two_wheels: true,
  });
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}
