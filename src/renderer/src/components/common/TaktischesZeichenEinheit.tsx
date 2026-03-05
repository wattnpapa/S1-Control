import type { OrganisationKey, TacticalSignConfig } from '@shared/types';
import { useEffect, useState } from 'react';
import { prettyOrganisation } from '@renderer/constants/organisation';
import { buildFallbackFormationSignDataUrl } from '@renderer/utils/tactical-sign-fallback';

interface TaktischesZeichenEinheitProps {
  organisation: OrganisationKey;
  tacticalSignConfigJson?: string | null;
}

const iconCache = new Map<string, string>();

/**
 * Handles Taktisches Zeichen Einheit.
 */
export function TaktischesZeichenEinheit(props: TaktischesZeichenEinheitProps): JSX.Element {
  const cacheKey = `${props.organisation}:${props.tacticalSignConfigJson ?? ''}`;
  const [src, setSrc] = useState<string>(iconCache.get(cacheKey) ?? buildFallbackFormationSignDataUrl(props.organisation));

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
        const fallback = buildFallbackFormationSignDataUrl(props.organisation);
        iconCache.set(cacheKey, fallback);
        setSrc(fallback);
      }
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
