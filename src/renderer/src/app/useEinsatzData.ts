import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AbschnittDetails, EinsatzListItem } from '@shared/types';
import type { FahrzeugOverviewItem, KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';
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

  const loadEinsatz = useCallback(
    async (
      einsatzId: string,
      preferredAbschnittId?: string,
      options?: { waitForFullOverview?: boolean },
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

      const effectiveAbschnittId =
        preferredAbschnittId && nextAbschnitte.some((item) => item.id === preferredAbschnittId)
          ? preferredAbschnittId
          : nextAbschnitte[0]?.id || '';

      props.setSelectedAbschnittId(effectiveAbschnittId);
      if (effectiveAbschnittId) {
        const selectedDetails = await window.api.listAbschnittDetails(einsatzId, effectiveAbschnittId);
        if (revision !== loadRevisionRef.current) {
          return;
        }
        props.setDetails(selectedDetails);

        // Fast first paint: seed overview from selected section.
        const selectedOnly = [selectedDetails];
        const selectedAbschnittMeta = nextAbschnitte.filter((item) => item.id === effectiveAbschnittId);
        const quickKraefte = mapAllKraefte(selectedOnly, selectedAbschnittMeta);
        const quickFahrzeuge = mapAllFahrzeuge(selectedOnly, selectedAbschnittMeta, quickKraefte);
        props.setAllKraefte(quickKraefte);
        props.setAllFahrzeuge(quickFahrzeuge);
        props.setGesamtStaerke(aggregateTacticalStrength(selectedOnly, selectedAbschnittMeta, props.emptyStrength));
      } else {
        props.setDetails(props.emptyDetails);
        props.setAllKraefte([]);
        props.setAllFahrzeuge([]);
        props.setGesamtStaerke({ ...props.emptyStrength });
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
        props.setGesamtStaerke(aggregateTacticalStrength(allDetails, nextAbschnitte, props.emptyStrength));
      };
      if (options?.waitForFullOverview) {
        await loadFullOverview();
      } else {
        // Keep non-initial refreshes responsive by loading full overview in background.
        void loadFullOverview();
      }
    },
    [props],
  );

  const refreshEinsaetze = useCallback(async () => {
    const next = await window.api.listEinsaetze();
    props.setEinsaetze(next);

    if (props.selectedEinsatzId && !next.some((item) => item.id === props.selectedEinsatzId)) {
      props.clearSelectedEinsatz();
    }

    return next;
  }, [props]);

  const refreshAll = useCallback(async () => {
    await refreshEinsaetze();
    if (props.selectedEinsatzId) {
      await loadEinsatz(props.selectedEinsatzId, props.selectedAbschnittId);
    }
  }, [loadEinsatz, props.selectedAbschnittId, props.selectedEinsatzId, refreshEinsaetze]);

  return {
    loadEinsatz,
    refreshEinsaetze,
    refreshAll,
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
 * Aggregates tactical strength while excluding ANFAHRT sections.
 */
function aggregateTacticalStrength(
  allDetails: AbschnittDetails[],
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
  emptyStrength: TacticalStrength,
): TacticalStrength {
  return allDetails.reduce<TacticalStrength>(
    (sum, detail, index) => {
      if (abschnitte[index]?.systemTyp === 'ANFAHRT') {
        return sum;
      }
      for (const einheit of detail.einheiten) {
        const parsed = parseTaktischeStaerke(einheit.aktuelleStaerkeTaktisch, einheit.aktuelleStaerke);
        sum.fuehrung += parsed.fuehrung;
        sum.unterfuehrung += parsed.unterfuehrung;
        sum.mannschaft += parsed.mannschaft;
        sum.gesamt += parsed.gesamt;
      }
      return sum;
    },
    { ...emptyStrength },
  );
}
