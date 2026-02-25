import type { OrganisationKey, TacticalSignConfig } from '@shared/types';
import { useEffect, useState } from 'react';
import { prettyOrganisation } from '@renderer/constants/organisation';

interface TaktischesZeichenEinheitProps {
  organisation: OrganisationKey;
  tacticalSignConfigJson?: string | null;
}

const iconCache = new Map<string, string>();

export function TaktischesZeichenEinheit(props: TaktischesZeichenEinheitProps): JSX.Element {
  const cacheKey = `${props.organisation}:${props.tacticalSignConfigJson ?? ''}`;
  const [src, setSrc] = useState<string>(iconCache.get(cacheKey) ?? '');

  useEffect(() => {
    let cancelled = false;
    const cached = iconCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return () => {
        cancelled = true;
      };
    }

    let tacticalSignConfig: TacticalSignConfig | null = null;
    if (props.tacticalSignConfigJson) {
      try {
        tacticalSignConfig = JSON.parse(props.tacticalSignConfigJson);
      } catch {
        tacticalSignConfig = null;
      }
    }

    void (async () => {
      try {
        const dataUrl = await window.api.getTacticalFormationSvg({
          organisation: props.organisation,
          tacticalSignConfig,
        });
        if (cancelled) return;
        iconCache.set(cacheKey, dataUrl);
        setSrc(dataUrl);
      } catch {
        if (cancelled) return;
        setSrc('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, props.organisation, props.tacticalSignConfigJson]);

  return (
    <span className="tactical-sign-badge">
      {src ? (
        <img src={src} alt={`Taktisches Zeichen ${prettyOrganisation(props.organisation)}`} className="tactical-sign" />
      ) : (
        <span className="tactical-sign-fallback">{prettyOrganisation(props.organisation).slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  );
}
