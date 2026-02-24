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
