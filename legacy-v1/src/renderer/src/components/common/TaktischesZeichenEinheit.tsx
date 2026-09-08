import type { OrganisationKey } from '@shared/types';
import { useEffect, useState } from 'react';
import { prettyOrganisation } from '@renderer/constants/organisation';
import { buildFallbackFormationSignDataUrl } from '@renderer/utils/tactical-sign-fallback';
import { getFormationSignSrc, toFormationCacheKey } from '@renderer/app/tactical-sign-cache';

interface TaktischesZeichenEinheitProps {
  organisation: OrganisationKey;
  tacticalSignConfigJson?: string | null;
}

/**
 * Handles Taktisches Zeichen Einheit.
 */
export function TaktischesZeichenEinheit(props: TaktischesZeichenEinheitProps): JSX.Element {
  const cacheKey = toFormationCacheKey({
    organisation: props.organisation,
    tacticalSignConfigJson: props.tacticalSignConfigJson,
  });
  const [src, setSrc] = useState<string>(buildFallbackFormationSignDataUrl(props.organisation));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const dataUrl = await getFormationSignSrc({
        organisation: props.organisation,
        tacticalSignConfigJson: props.tacticalSignConfigJson,
      });
      if (cancelled) {
        return;
      }
      setSrc(dataUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, props.organisation, props.tacticalSignConfigJson]);

  return (
    <span className="tactical-sign-badge">
      <img src={src} alt={`Taktisches Zeichen ${prettyOrganisation(props.organisation)}`} className="tactical-sign" />
    </span>
  );
}
