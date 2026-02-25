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

export function prettyOrganisation(org: OrganisationKey): string {
  const found = ORGANISATION_OPTIONS.find((o) => o.value === org);
  return found?.label ?? org;
}

export function organisationColor(org: OrganisationKey): string {
  switch (org) {
    case 'THW':
      return '#003399';
    case 'FEUERWEHR':
      return '#d61a1f';
    case 'POLIZEI':
      return '#13a538';
    case 'BUNDESWEHR':
      return '#7a6230';
    case 'REGIE':
      return '#5e6675';
    case 'DRK':
      return '#c20f1f';
    case 'ASB':
      return '#1a4c9b';
    case 'JOHANNITER':
      return '#d91c27';
    case 'MALTESER':
      return '#df2026';
    case 'DLRG':
      return '#1d4b99';
    case 'BERGWACHT':
      return '#3b7c3f';
    case 'MHD':
      return '#1b418f';
    case 'RETTUNGSDIENST_KOMMUNAL':
      return '#e6931b';
    case 'SONSTIGE':
      return '#4b5566';
    default:
      return '#4b5566';
  }
}
