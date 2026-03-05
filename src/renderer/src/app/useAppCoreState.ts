import { useState } from 'react';
import { DEFAULT_UPDATER_STATE, EMPTY_DETAILS } from '@renderer/app/defaultState';
import type { FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import type { EinsatzListItem, SessionUser } from '@shared/types';

/**
 * Holds root-level application states shared across entry/workspace screens.
 */
export function useAppCoreState() {
  const [session, setSession] = useState<SessionUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dbPath, setDbPath] = useState('');
  const [lanPeerUpdatesEnabled, setLanPeerUpdatesEnabled] = useState(false);
  const [einsaetze, setEinsaetze] = useState<EinsatzListItem[]>([]);
  const [selectedEinsatzId, setSelectedEinsatzId] = useState('');
  const [abschnitte, setAbschnitte] = useState([] as Awaited<ReturnType<typeof window.api.listAbschnitte>>);
  const [details, setDetails] = useState(EMPTY_DETAILS);
  const [allKraefte, setAllKraefte] = useState<KraftOverviewItem[]>([]);
  const [allFahrzeuge, setAllFahrzeuge] = useState<FahrzeugOverviewItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updaterState, setUpdaterState] = useState(DEFAULT_UPDATER_STATE);

  return {
    session,
    setSession,
    authReady,
    setAuthReady,
    dbPath,
    setDbPath,
    lanPeerUpdatesEnabled,
    setLanPeerUpdatesEnabled,
    einsaetze,
    setEinsaetze,
    selectedEinsatzId,
    setSelectedEinsatzId,
    abschnitte,
    setAbschnitte,
    details,
    setDetails,
    allKraefte,
    setAllKraefte,
    allFahrzeuge,
    setAllFahrzeuge,
    error,
    setError,
    busy,
    setBusy,
    updaterState,
    setUpdaterState,
  };
}
