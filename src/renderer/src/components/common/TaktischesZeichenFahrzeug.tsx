import type { OrganisationKey } from '@shared/types';
import { useEffect, useState } from 'react';

interface TaktischesZeichenFahrzeugProps {
  organisation: OrganisationKey | null;
}

const vehicleCache = new Map<OrganisationKey, string>();

export function TaktischesZeichenFahrzeug(props: TaktischesZeichenFahrzeugProps): JSX.Element {
  const organisation = props.organisation ?? 'SONSTIGE';
  const [src, setSrc] = useState<string>(vehicleCache.get(organisation) ?? '');

  useEffect(() => {
    let cancelled = false;
    const cached = vehicleCache.get(organisation);
    if (cached) {
      setSrc(cached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const dataUrl = await window.api.getTacticalVehicleSvg({ organisation });
        if (cancelled) return;
        vehicleCache.set(organisation, dataUrl);
        setSrc(dataUrl);
      } catch {
        if (cancelled) return;
        setSrc('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organisation]);

  return (
    <span className="tactical-sign-badge">
      {src ? <img src={src} alt="Taktisches Zeichen Fahrzeug" className="tactical-sign" /> : <span className="tactical-sign-fallback">KFZ</span>}
    </span>
  );
}
