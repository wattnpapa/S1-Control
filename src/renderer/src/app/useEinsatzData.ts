import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AbschnittDetails, EinsatzListItem } from '@shared/types';
import type { FahrzeugOverviewItem, KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';
import { aggregateStaerkeUebersicht, type StaerkeUebersicht } from '@renderer/utils/staerke';
import { prewarmFormationSigns, prewarmVehicleSigns } from './tactical-sign-cache';

interface UseEinsatzDataProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  setEinsaetze: Dispatch<SetStateAction<EinsatzListItem[]>>;
  setAbschnitte: Dispatch<SetStateAction<Awaited<ReturnType<typeof window.api.listAbschnitte>>>>;
  setSelectedAbschnittId: Dispatch<SetStateAction<string>>;
  setDetails: Dispatch<SetStateAction<AbschnittDetails>>;
  setAllKraefte: Dispatch<SetStateAction<KraftOverviewItem[]>>;
  setAllFahrzeuge: Dispatch<SetStateAction<FahrzeugOverviewItem[]>>;
  setGesamtStaerke: Dispatch<SetStateAction<TacticalStrength>>;
  setStaerkeUebersicht: Dispatch<SetStateAction<StaerkeUebersicht>>;
  clearSelectedEinsatz: () => void;
  refreshEditLocks: (einsatzId: string) => Promise<void>;
  emptyDetails: AbschnittDetails;
  emptyStrength: TacticalStrength;
}

const PREWARM_LIMIT = 40;

/**
 * Encapsulates loading and refreshing Einsatz, Abschnitt, Kraft and Fahrzeug data.
 */
export function useEinsatzData(props: UseEinsatzDataProps) {
  const loadRevisionRef = useRef(0);
  // Always reflects the latest selectedAbschnittId without stale closure issues.
  const selectedAbschnittIdRef = useRef(props.selectedAbschnittId);
  selectedAbschnittIdRef.current = props.selectedAbschnittId;

  const loadEinsatz = useCallback(
    async (
      einsatzId: string,
      preferredAbschnittId?: string,
      options?: { waitForFullOverview?: boolean; includeFullOverview?: boolean },
    ) => {
      const revision = ++loadRevisionRef.current;
      // Lock list must not block open-flow on slow/shared filesystems.
      void props.refreshEditLocks(einsatzId).catch(() => {
        // ignore transient lock-list errors during initial load
      });
      const nextAbschnitte = await window.api.listAbschnitte(einsatzId);
      if (revision !== loadRevisionRef.current) {
        return;
      }
      props.setAbschnitte(nextAbschnitte);

      // Prefer the CURRENT selectedAbschnittId (user may have clicked while this ran),
      // fall back to preferredAbschnittId, then the first abschnitt.
      const currentAbschnittId = selectedAbschnittIdRef.current;
      const candidateId = currentAbschnittId || preferredAbschnittId || '';
      const effectiveAbschnittId =
        candidateId && nextAbschnitte.some((item) => item.id === candidateId)
          ? candidateId
          : nextAbschnitte[0]?.id || '';

      props.setSelectedAbschnittId(effectiveAbschnittId);
      if (effectiveAbschnittId) {
        const selectedDetails = await window.api.listAbschnittDetails(einsatzId, effectiveAbschnittId);
        if (revision !== loadRevisionRef.current) {
          return;
        }
        props.setDetails(selectedDetails);

        // Fast first paint: seed kraefte/fahrzeuge from selected section only.
        const selectedOnly = [selectedDetails];
        const selectedAbschnittMeta = nextAbschnitte.filter((item) => item.id === effectiveAbschnittId);
        const quickKraefte = mapAllKraefte(selectedOnly, selectedAbschnittMeta);
        const quickFahrzeuge = mapAllFahrzeuge(selectedOnly, selectedAbschnittMeta, quickKraefte);
        // Nur als erster Aufbau, solange noch nichts da ist. Im laufenden
        // Betrieb darf die Gesamtliste nicht auf den gewählten Abschnitt
        // zusammenschrumpfen — das ergäbe ein falsches Lagebild.
        props.setAllKraefte((prev) => (prev.length === 0 ? quickKraefte : prev));
        props.setAllFahrzeuge((prev) => (prev.length === 0 ? quickFahrzeuge : prev));
        // Do NOT set gesamtStaerke here — it must always reflect ALL sections.
      } else {
        props.setDetails(props.emptyDetails);
        props.setAllKraefte([]);
        props.setAllFahrzeuge([]);
      }

      const loadFullOverview = async () => {
        const allDetails = await loadAllAbschnittDetails(einsatzId, nextAbschnitte);
        if (revision !== loadRevisionRef.current) {
          return;
        }
        const nextAllKraefte = mapAllKraefte(allDetails, nextAbschnitte);
        const nextAllFahrzeuge = mapAllFahrzeuge(allDetails, nextAbschnitte, nextAllKraefte);
        props.setAllKraefte(nextAllKraefte);
        props.setAllFahrzeuge(nextAllFahrzeuge);
        scheduleSignPrewarm(nextAllKraefte, nextAllFahrzeuge);
        applyStaerke(props, allDetails, nextAbschnitte);
      };
      // Always run loadFullOverview (at minimum for gesamtStaerke correctness).
      const includeFullOverview = options?.includeFullOverview ?? true;
      if (!includeFullOverview) {
        // Der Stapel wird ohnehin für die Stärke geladen; die Gesamtlisten
        // daraus mitzusetzen kostet nichts und verhindert, dass Kräfte-,
        // Fahrzeug- und Führungsansicht auf einem Abschnitt hängenbleiben.
        void (async () => {
          const allDetails = await loadAllAbschnittDetails(einsatzId, nextAbschnitte);
          if (revision !== loadRevisionRef.current) return;
          const nextAllKraefte = mapAllKraefte(allDetails, nextAbschnitte);
          props.setAllKraefte(nextAllKraefte);
          props.setAllFahrzeuge(mapAllFahrzeuge(allDetails, nextAbschnitte, nextAllKraefte));
          applyStaerke(props, allDetails, nextAbschnitte);
        })();
        return;
      }
      if (options?.waitForFullOverview) {
        await loadFullOverview();
      } else {
        // Keep non-initial refreshes responsive by loading full overview in background.
        void loadFullOverview();
      }
    },
    [props],
  );

  // Refs keep the latest values without recreating the callback on every render.
  // This prevents useAppBootstrap from re-firing after every state update.
  const selectedEinsatzIdRef = useRef(props.selectedEinsatzId);
  selectedEinsatzIdRef.current = props.selectedEinsatzId;
  const clearSelectedEinsatzRef = useRef(props.clearSelectedEinsatz);
  clearSelectedEinsatzRef.current = props.clearSelectedEinsatz;

  const refreshEinsaetze = useCallback(async () => {
    const next = await window.api.listEinsaetze();
    props.setEinsaetze(next);

    const currentId = selectedEinsatzIdRef.current;
    if (currentId && next.length > 0 && !next.some((item) => item.id === currentId)) {
      clearSelectedEinsatzRef.current();
    }

    return next;
  }, [props.setEinsaetze, selectedEinsatzIdRef, clearSelectedEinsatzRef]);

  const refreshAll = useCallback(async () => {
    await refreshEinsaetze();
    if (props.selectedEinsatzId) {
      await loadEinsatz(props.selectedEinsatzId, props.selectedAbschnittId);
    }
  }, [loadEinsatz, props.selectedAbschnittId, props.selectedEinsatzId, refreshEinsaetze]);

  const refreshCurrentEinsatz = useCallback(
    async (options?: { includeFullOverview?: boolean }) => {
      if (!props.selectedEinsatzId) {
        return;
      }
      await loadEinsatz(props.selectedEinsatzId, props.selectedAbschnittId, {
        includeFullOverview: options?.includeFullOverview ?? false,
      });
    },
    [loadEinsatz, props.selectedAbschnittId, props.selectedEinsatzId],
  );

  return {
    loadEinsatz,
    refreshEinsaetze,
    refreshAll,
    refreshCurrentEinsatz,
  };
}

/**
 * Defers tactical-sign prewarm and caps initial batch size to keep first interaction responsive.
 */
function scheduleSignPrewarm(
  kraefte: KraftOverviewItem[],
  fahrzeuge: FahrzeugOverviewItem[],
): void {
  setTimeout(() => {
    prewarmFormationSigns(
      kraefte.slice(0, PREWARM_LIMIT).map((item) => ({
        organisation: item.organisation,
        tacticalSignConfigJson: item.tacticalSignConfigJson,
      })),
    );
    prewarmVehicleSigns(
      fahrzeuge.slice(0, PREWARM_LIMIT).map((item) => ({
        organisation: item.organisation,
        name: item.name,
        funkrufname: item.funkrufname,
      })),
    );
  }, 250);
}

/**
 * Loads all section detail payloads for an operation.
 */
async function loadAllAbschnittDetails(
  einsatzId: string,
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
): Promise<AbschnittDetails[]> {
  const byAbschnittId = await window.api.listAbschnittDetailsBatch(einsatzId);
  return abschnitte.map((abschnitt) => byAbschnittId[abschnitt.id] ?? { einheiten: [], fahrzeuge: [] });
}

/**
 * Maps unit overview list from per-section details.
 */
function mapAllKraefte(
  allDetails: AbschnittDetails[],
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
): KraftOverviewItem[] {
  return allDetails.flatMap((detail, index) => {
    const abschnittName = abschnitte[index]?.name ?? 'Unbekannt';
    return detail.einheiten.map((einheit) => ({ ...einheit, abschnittName }));
  });
}

/**
 * Maps vehicle overview list and enriches it with Einheit-derived fields.
 */
function mapAllFahrzeuge(
  allDetails: AbschnittDetails[],
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
  kraefte: KraftOverviewItem[],
): FahrzeugOverviewItem[] {
  const einheitNameById = new Map(kraefte.map((einheit) => [einheit.id, einheit.nameImEinsatz]));
  const einheitOrgById = new Map(kraefte.map((einheit) => [einheit.id, einheit.organisation]));
  return allDetails.flatMap((detail, index) => {
    const abschnittName = abschnitte[index]?.name ?? 'Unbekannt';
    return detail.fahrzeuge.map((fahrzeug) => ({
      ...fahrzeug,
      abschnittName,
      organisation:
        fahrzeug.organisation ??
        (fahrzeug.aktuelleEinsatzEinheitId ? (einheitOrgById.get(fahrzeug.aktuelleEinsatzEinheitId) ?? null) : null),
      einheitName: fahrzeug.aktuelleEinsatzEinheitId
        ? (einheitNameById.get(fahrzeug.aktuelleEinsatzEinheitId) ?? 'Unbekannt')
        : '-',
    }));
  });
}

/**
 * Setzt gemeldete Stärke und ihre Aufschlüsselung aus allen Abschnitten.
 */
function applyStaerke(
  props: UseEinsatzDataProps,
  allDetails: AbschnittDetails[],
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
): void {
  const uebersicht = aggregateStaerkeUebersicht(
    allDetails,
    abschnitte.map((abschnitt) => abschnitt.systemTyp),
  );
  props.setStaerkeUebersicht(uebersicht);
  props.setGesamtStaerke(uebersicht.vorOrt);
}
