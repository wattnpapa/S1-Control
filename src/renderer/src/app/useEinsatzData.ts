import { useCallback } from 'react';
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

/**
 * Encapsulates loading and refreshing Einsatz, Abschnitt, Kraft and Fahrzeug data.
 */
export function useEinsatzData(props: UseEinsatzDataProps) {
  const loadEinsatz = useCallback(
    async (einsatzId: string, preferredAbschnittId?: string) => {
      await props.refreshEditLocks(einsatzId);
      const nextAbschnitte = await window.api.listAbschnitte(einsatzId);
      props.setAbschnitte(nextAbschnitte);

      const allDetails = await loadAllAbschnittDetails(einsatzId, nextAbschnitte);
      const nextAllKraefte = mapAllKraefte(allDetails, nextAbschnitte);
      props.setAllKraefte(nextAllKraefte);

      const nextAllFahrzeuge = mapAllFahrzeuge(allDetails, nextAbschnitte, nextAllKraefte);
      props.setAllFahrzeuge(nextAllFahrzeuge);
      prewarmFormationSigns(
        nextAllKraefte.map((item) => ({
          organisation: item.organisation,
          tacticalSignConfigJson: item.tacticalSignConfigJson,
        })),
      );
      prewarmVehicleSigns(
        nextAllFahrzeuge.map((item) => ({
          organisation: item.organisation,
          name: item.name,
          funkrufname: item.funkrufname,
        })),
      );
      const total = aggregateTacticalStrength(allDetails, nextAbschnitte, props.emptyStrength);
      props.setGesamtStaerke(total);

      const effectiveAbschnittId =
        preferredAbschnittId && nextAbschnitte.some((item) => item.id === preferredAbschnittId)
          ? preferredAbschnittId
          : nextAbschnitte[0]?.id || '';

      props.setSelectedAbschnittId(effectiveAbschnittId);
      if (effectiveAbschnittId) {
        props.setDetails(await window.api.listAbschnittDetails(einsatzId, effectiveAbschnittId));
      } else {
        props.setDetails(props.emptyDetails);
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
 * Loads all section detail payloads for an operation.
 */
async function loadAllAbschnittDetails(
  einsatzId: string,
  abschnitte: Awaited<ReturnType<typeof window.api.listAbschnitte>>,
): Promise<AbschnittDetails[]> {
  return Promise.all(abschnitte.map((abschnitt) => window.api.listAbschnittDetails(einsatzId, abschnitt.id)));
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
