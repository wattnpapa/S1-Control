import type { OrganisationKey } from '@shared/types';

export function tacticalFormationPath(org: OrganisationKey): string {
  switch (org) {
    case 'THW':
      return 'taktische-zeichen/einheit/thw-technischer-zug.svg';
    case 'FEUERWEHR':
      return 'taktische-zeichen/einheit/feuerwehr-loeschzug.svg';
    case 'POLIZEI':
      return 'taktische-zeichen/einheit/polizei-einheit.svg';
    case 'BUNDESWEHR':
      return 'taktische-zeichen/einheit/bundeswehr-einheit.svg';
    default:
      return 'taktische-zeichen/einheit/rettungswesen-einsatzeinheit.svg';
  }
}
