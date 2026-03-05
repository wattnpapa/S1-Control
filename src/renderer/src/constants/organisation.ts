import type { OrganisationKey } from '@shared/types';

export const ORGANISATION_OPTIONS: Array<{ value: OrganisationKey; label: string }> = [
  { value: 'THW', label: 'THW' },
  { value: 'FEUERWEHR', label: 'Feuerwehr' },
  { value: 'POLIZEI', label: 'Polizei' },
  { value: 'BUNDESWEHR', label: 'Bundeswehr' },
  { value: 'REGIE', label: 'Regie' },
  { value: 'DRK', label: 'DRK' },
  { value: 'ASB', label: 'ASB' },
  { value: 'JOHANNITER', label: 'Johanniter' },
  { value: 'MALTESER', label: 'Malteser' },
  { value: 'DLRG', label: 'DLRG' },
  { value: 'BERGWACHT', label: 'Bergwacht' },
  { value: 'MHD', label: 'MHD' },
  { value: 'RETTUNGSDIENST_KOMMUNAL', label: 'Rettungsdienst kommunal' },
  { value: 'SONSTIGE', label: 'Sonstige' },
];

const ORGANISATION_COLORS: Record<OrganisationKey, string> = {
  THW: '#003399',
  FEUERWEHR: '#d61a1f',
  POLIZEI: '#13a538',
  BUNDESWEHR: '#7a6230',
  REGIE: '#5e6675',
  DRK: '#c20f1f',
  ASB: '#1a4c9b',
  JOHANNITER: '#d91c27',
  MALTESER: '#df2026',
  DLRG: '#1d4b99',
  BERGWACHT: '#3b7c3f',
  MHD: '#1b418f',
  RETTUNGSDIENST_KOMMUNAL: '#e6931b',
  SONSTIGE: '#4b5566',
};

/**
 * Handles Pretty Organisation.
 */
export function prettyOrganisation(org: OrganisationKey): string {
  const found = ORGANISATION_OPTIONS.find((o) => o.value === org);
  return found?.label ?? org;
}

/**
 * Handles Organisation Color.
 */
export function organisationColor(org: OrganisationKey): string {
  return ORGANISATION_COLORS[org] ?? ORGANISATION_COLORS.SONSTIGE;
}
