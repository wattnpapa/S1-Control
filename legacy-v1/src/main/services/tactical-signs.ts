import { readFileSync } from 'node:fs';
import path from 'node:path';
import Handlebars from 'handlebars';
import {
  erzeugeTaktischesZeichen,
  einheiten,
  fachaufgaben,
  funktionen,
  grundzeichen,
  organisationen,
  symbole,
  verwaltungsstufen,
  type EinheitId,
  type FachaufgabeId,
  type FunktionId,
  type GrundzeichenId,
  type OrganisationId,
  type SymbolId,
  type TaktischesZeichen,
  type VerwaltungsstufeId,
} from 'taktische-zeichen-core';
import type { OrganisationKey, TacticalSignConfig } from '../../shared/types';

type PersonTemplateInput = {
  color_primary: string;
  color_secondary: string;
  stroke_color: string;
  color_text: string;
  organization: string;
  unit: string;
  platoon?: boolean;
  group?: boolean;
};

const personTemplatePath = path.join(
  path.dirname(require.resolve('taktische-zeichen/package.json')),
  'templates',
  'Person.svg',
);
const personTemplate = Handlebars.compile(readFileSync(personTemplatePath, 'utf8'));
const cache = new Map<string, string>();

const GRUNDZEICHEN_SET = new Set(grundzeichen.map((item) => item.id));
const ORGANISATION_SET = new Set(organisationen.map((item) => item.id));
const EINHEIT_SET = new Set(einheiten.map((item) => item.id));
const FACHAUFGABE_SET = new Set(fachaufgaben.map((item) => item.id));
const VERWALTUNGSSTUFE_SET = new Set(verwaltungsstufen.map((item) => item.id));
const FUNKTION_SET = new Set(funktionen.map((item) => item.id));
const SYMBOL_SET = new Set(symbole.map((item) => item.id));

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

const ORGANISATION_COLORS: Record<OrganisationKey, Pick<PersonTemplateInput, 'color_primary' | 'color_text'>> = {
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

const ORGANISATION_KEY_TO_CORE: Record<OrganisationKey, OrganisationId> = {
  THW: 'thw',
  FEUERWEHR: 'feuerwehr',
  POLIZEI: 'polizei',
  BUNDESWEHR: 'bundeswehr',
  REGIE: 'zivil',
  DRK: 'hilfsorganisation',
  ASB: 'hilfsorganisation',
  JOHANNITER: 'hilfsorganisation',
  MALTESER: 'hilfsorganisation',
  DLRG: 'hilfsorganisation',
  BERGWACHT: 'hilfsorganisation',
  MHD: 'hilfsorganisation',
  RETTUNGSDIENST_KOMMUNAL: 'hilfsorganisation',
  SONSTIGE: 'zivil',
};

const LEGACY_TYP_TO_EINHEIT: Record<string, EinheitId> = {
  group: 'gruppe',
  squad: 'trupp',
  platoon: 'zug',
  gruppe: 'gruppe',
  trupp: 'trupp',
  staffel: 'staffel',
  zug: 'zug',
  zugtrupp: 'zugtrupp',
  bereitschaft: 'bereitschaft',
  abteilung: 'abteilung',
  grossverband: 'grossverband',
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
function organisationColors(organisation: OrganisationKey): Pick<PersonTemplateInput, 'color_primary' | 'color_text'> {
  return ORGANISATION_COLORS[organisation] ?? ORGANISATION_COLORS.SONSTIGE;
}

/**
 * Returns enum value only when it exists in the provided set.
 */
function asEnum<T extends string>(value: string | undefined, allowed: Set<string>): T | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!allowed.has(normalized)) {
    return undefined;
  }
  return normalized as T;
}

/**
 * Normalizes legacy and current typ values to the core einheit enum.
 */
function typToEinheit(typ: TacticalSignConfig['typ']): EinheitId | undefined {
  if (!typ || typ === 'none') {
    return undefined;
  }
  return LEGACY_TYP_TO_EINHEIT[String(typ).toLowerCase()];
}

/**
 * Resolves organisation from config or app domain.
 */
function resolveOrganisationId(config: TacticalSignConfig, organisation: OrganisationKey): OrganisationId {
  return asEnum<OrganisationId>(config.organisation, ORGANISATION_SET) ?? ORGANISATION_KEY_TO_CORE[organisation];
}

/**
 * Resolves core enum values from a tactical config.
 */
function toCoreSignSpec(
  organisation: OrganisationKey,
  tacticalSignConfig: TacticalSignConfig | null,
  defaultGrundzeichen: GrundzeichenId,
): TaktischesZeichen {
  const config = tacticalSignConfig ?? {};
  const grundzeichenId =
    asEnum<GrundzeichenId>(config.grundzeichen ?? config.grundform, GRUNDZEICHEN_SET) ?? defaultGrundzeichen;
  const organisationId = resolveOrganisationId(config, organisation);
  const einheitId = asEnum<EinheitId>(config.einheit, EINHEIT_SET) ?? typToEinheit(config.typ);
  const fachaufgabeId = asEnum<FachaufgabeId>(config.fachaufgabe, FACHAUFGABE_SET);
  const verwaltungsstufeId = asEnum<VerwaltungsstufeId>(config.verwaltungsstufe, VERWALTUNGSSTUFE_SET);
  const funktionId = asEnum<FunktionId>(config.funktion, FUNKTION_SET);
  const symbolId = asEnum<SymbolId>(config.symbol, SYMBOL_SET);

  return {
    grundzeichen: grundzeichenId,
    organisation: organisationId,
    fachaufgabe: fachaufgabeId,
    einheit: einheitId,
    verwaltungsstufe: verwaltungsstufeId,
    funktion: funktionId,
    symbol: symbolId,
    text: config.text || undefined,
    typ: config.typ && config.typ !== 'none' ? config.typ : undefined,
    name: config.name || undefined,
    organisationName: config.organisationName || config.organisationsname || organisationShortName(organisation),
    farbe: organisationColors(organisation).color_primary,
  };
}

/**
 * Encodes core SVG image without using core dataUrl getter (it logs full SVG content).
 */
function toDataUrl(spec: TaktischesZeichen): string {
  const svg = erzeugeTaktischesZeichen(spec).toString();
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

/**
 * Handles Get Tactical Formation Svg Data Url.
 */
export function getTacticalFormationSvgDataUrl(
  organisation: OrganisationKey,
  tacticalSignConfig: TacticalSignConfig | null,
): string {
  const config = tacticalSignConfig ?? {};
  const cacheKey = `${organisation}:${JSON.stringify(config)}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    return existing;
  }
  const dataUrl = toDataUrl(toCoreSignSpec(organisation, config, 'taktische-formation'));
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}

/**
 * Handles Get Tactical Vehicle Svg Data Url.
 */
export function getTacticalVehicleSvgDataUrl(organisation: OrganisationKey, einheit?: string): string {
  const normalizedEinheit = einheit?.trim() ?? '';
  const cacheKey = `vehicle:${organisation}:${normalizedEinheit}`;
  const existing = cache.get(cacheKey);
  if (existing) {
    return existing;
  }
  const organisationId = ORGANISATION_KEY_TO_CORE[organisation];
  const dataUrl = toDataUrl({
    grundzeichen: 'kraftfahrzeug-landgebunden',
    organisation: organisationId,
    text: normalizedEinheit || undefined,
    organisationName: organisationShortName(organisation),
    farbe: organisationColors(organisation).color_primary,
  });
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
  const svg = personTemplate({
    color_primary: colors.color_primary,
    color_secondary: '#FFFFFF',
    stroke_color: '#000000',
    color_text: colors.color_text,
    organization: organisationShortName(organisation),
    unit: '',
    platoon: rolle === 'FUEHRER',
    group: rolle === 'UNTERFUEHRER',
  });
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
  cache.set(cacheKey, dataUrl);
  return dataUrl;
}
