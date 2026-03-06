import type { OrganisationKey } from '@shared/types';
import { useEffect, useState } from 'react';
import { buildFallbackVehicleSignDataUrl } from '@renderer/utils/tactical-sign-fallback';
import { getVehicleSignSrc, prewarmVehicleSigns } from '@renderer/app/tactical-sign-cache';

interface TaktischesZeichenFahrzeugProps {
  organisation: OrganisationKey | null;
  name?: string | null;
  funkrufname?: string | null;
}

/**
 * Handles Taktisches Zeichen Fahrzeug.
 */
export function TaktischesZeichenFahrzeug(props: TaktischesZeichenFahrzeugProps): JSX.Element {
  const organisation = props.organisation ?? 'SONSTIGE';
  const cacheKey = `${organisation}:${props.name ?? ''}:${props.funkrufname ?? ''}`;
  const [src, setSrc] = useState<string>(buildFallbackVehicleSignDataUrl(organisation));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const dataUrl = await getVehicleSignSrc({
        organisation: props.organisation,
        name: props.name,
        funkrufname: props.funkrufname,
      });
      if (cancelled) {
        return;
      }
      setSrc(dataUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, organisation, props.funkrufname, props.name, props.organisation]);

  useEffect(() => {
    prewarmVehicleSigns([
      {
        organisation: props.organisation,
        name: props.name,
        funkrufname: props.funkrufname,
      },
    ]);
  }, [cacheKey, props.funkrufname, props.name, props.organisation]);

  return (
    <span className="tactical-sign-badge">
      <img src={src} alt="Taktisches Zeichen Fahrzeug" className="tactical-sign" />
    </span>
  );
}
