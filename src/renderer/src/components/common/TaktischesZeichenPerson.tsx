import type { HelferRolle, OrganisationKey } from '@shared/types';
import { useEffect, useState } from 'react';

interface TaktischesZeichenPersonProps {
  organisation: OrganisationKey;
  rolle: HelferRolle;
}

const personCache = new Map<string, string>();

export function TaktischesZeichenPerson(props: TaktischesZeichenPersonProps): JSX.Element {
  const cacheKey = `${props.organisation}:${props.rolle}`;
  const [src, setSrc] = useState<string>(personCache.get(cacheKey) ?? '');

  useEffect(() => {
    let cancelled = false;
    const cached = personCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      try {
        const dataUrl = await window.api.getTacticalPersonSvg({
          organisation: props.organisation,
          rolle: props.rolle,
        });
        if (cancelled) return;
        personCache.set(cacheKey, dataUrl);
        setSrc(dataUrl);
      } catch {
        if (cancelled) return;
        setSrc('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, props.organisation, props.rolle]);

  return (
    <span className="helper-sign-badge">
      {src ? <img src={src} alt="Rollenzeichen" className="helper-sign" /> : <span className="helper-sign-fallback">P</span>}
    </span>
  );
}
