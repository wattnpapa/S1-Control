import type { OrganisationKey } from '@shared/types';
import type { CSSProperties } from 'react';
import { organisationColor, prettyOrganisation } from '@renderer/constants/organisation';
import { tacticalFormationPath } from '@renderer/utils/taktische-zeichen';

interface TaktischesZeichenEinheitProps {
  organisation: OrganisationKey;
}

export function TaktischesZeichenEinheit(props: TaktischesZeichenEinheitProps): JSX.Element {
  const color = organisationColor(props.organisation);
  return (
    <span className="tactical-sign-badge" style={{ '--org-color': color } as CSSProperties}>
      <img
        src={tacticalFormationPath(props.organisation)}
        alt={`Taktisches Zeichen ${prettyOrganisation(props.organisation)}`}
        className="tactical-sign"
      />
    </span>
  );
}
