import type { OrganisationKey } from '@shared/types';
import { useEffect, useState } from 'react';
import { inferVehicleTacticalUnit } from '@renderer/utils/tactical-vehicle';
import { buildFallbackVehicleSignDataUrl } from '@renderer/utils/tactical-sign-fallback';

interface TaktischesZeichenFahrzeugProps {
  organisation: OrganisationKey | null;
  name?: string | null;
  funkrufname?: string | null;
}

const vehicleCache = new Map<string, string>();

/**
 * Handles Taktisches Zeichen Fahrzeug.
 */
export function TaktischesZeichenFahrzeug(props: TaktischesZeichenFahrzeugProps): JSX.Element {
  const organisation = props.organisation ?? 'SONSTIGE';
  const inferredUnit = inferVehicleTacticalUnit(organisation, {
    name: props.name,
    funkrufname: props.funkrufname,
  });
  const cacheKey = `${organisation}:${inferredUnit}`;
  const [src, setSrc] = useState<string>(vehicleCache.get(cacheKey) ?? buildFallbackVehicleSignDataUrl(organisation));

  useEffect(() => {
    let cancelled = false;
    const cached = vehicleCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const dataUrl = await window.api.getTacticalVehicleSvg({ organisation, unit: inferredUnit });
        if (cancelled) return;
        vehicleCache.set(cacheKey, dataUrl);
        setSrc(dataUrl);
      } catch {
        if (cancelled) return;
        const fallback = buildFallbackVehicleSignDataUrl(organisation);
        vehicleCache.set(cacheKey, fallback);
        setSrc(fallback);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, inferredUnit, organisation]);

  return (
    <span className="tactical-sign-badge">
      <img src={src} alt="Taktisches Zeichen Fahrzeug" className="tactical-sign" />
    </span>
  );
}
