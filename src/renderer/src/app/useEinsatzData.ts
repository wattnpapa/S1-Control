import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AbschnittDetails, EinsatzListItem } from '@shared/types';
import type { FahrzeugOverviewItem, KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';
import { parseTaktischeStaerke } from '@renderer/utils/tactical';

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

      const allDetails = await Promise.all(
        nextAbschnitte.map((abschnitt) => window.api.listAbschnittDetails(einsatzId, abschnitt.id)),
      );

      const nextAllKraefte = allDetails.flatMap((detail, index) => {
        const abschnittName = nextAbschnitte[index]?.name ?? 'Unbekannt';
        return detail.einheiten.map((einheit) => ({ ...einheit, abschnittName }));
      });
      props.setAllKraefte(nextAllKraefte);

      const einheitNameById = new Map(nextAllKraefte.map((einheit) => [einheit.id, einheit.nameImEinsatz]));
      const einheitOrgById = new Map(nextAllKraefte.map((einheit) => [einheit.id, einheit.organisation]));
      const nextAllFahrzeuge = allDetails.flatMap((detail, index) => {
        const abschnittName = nextAbschnitte[index]?.name ?? 'Unbekannt';
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
      props.setAllFahrzeuge(nextAllFahrzeuge);

      const total = allDetails.reduce<TacticalStrength>(
        (sum, detail, index) => {
          const abschnitt = nextAbschnitte[index];
          if (abschnitt?.systemTyp === 'ANFAHRT') {
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
        { ...props.emptyStrength },
      );
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
