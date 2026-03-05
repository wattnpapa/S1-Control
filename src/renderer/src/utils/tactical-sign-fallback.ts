import type { OrganisationKey } from '@shared/types';

const ORG_SHORT: Partial<Record<OrganisationKey, string>> = {
  THW: 'THW',
  FEUERWEHR: 'FW',
  POLIZEI: 'POL',
  BUNDESWEHR: 'BW',
  REGIE: 'REG',
  DRK: 'DRK',
  ASB: 'ASB',
  JOHANNITER: 'JOH',
  MALTESER: 'MHD',
  DLRG: 'DLRG',
  BERGWACHT: 'BW',
  MHD: 'MHD',
  RETTUNGSDIENST_KOMMUNAL: 'RD',
  SONSTIGE: 'ORG',
};

/**
 * Encodes a raw SVG string as a data URL.
 */
function toDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

/**
 * Returns short organization label used in fallback signs.
 */
function organisationShortLabel(organisation: OrganisationKey): string {
  return ORG_SHORT[organisation] ?? 'ORG';
}

/**
 * Builds a compact fallback unit sign.
 */
export function buildFallbackFormationSignDataUrl(organisation: OrganisationKey): string {
  const org = organisationShortLabel(organisation);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28" viewBox="0 0 40 28">
  <rect x="1" y="1" width="38" height="26" rx="2" fill="#ffffff" stroke="#1f2937" stroke-width="1.5"/>
  <text x="20" y="18" font-size="10" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">${org}</text>
</svg>`;
  return toDataUrl(svg.trim());
}

/**
 * Builds a compact fallback vehicle sign.
 */
export function buildFallbackVehicleSignDataUrl(organisation: OrganisationKey): string {
  const org = organisationShortLabel(organisation);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28" viewBox="0 0 40 28">
  <rect x="1" y="5" width="38" height="16" rx="2" fill="#ffffff" stroke="#1f2937" stroke-width="1.5"/>
  <circle cx="10" cy="23" r="3" fill="#1f2937"/>
  <circle cx="30" cy="23" r="3" fill="#1f2937"/>
  <text x="20" y="16" font-size="9" text-anchor="middle" fill="#1f2937" font-family="Arial, sans-serif">${org}</text>
</svg>`;
  return toDataUrl(svg.trim());
}
