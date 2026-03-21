import type {
  CreateEinheitForm,
  EditEinheitForm,
  FahrzeugOverviewItem,
  KraftOverviewItem,
  SplitEinheitForm,
} from '@renderer/types/ui';
import type { EinheitHelfer } from '@shared/types';
import type { Dispatch, SetStateAction } from 'react';

export type HelferInput = {
  name: string;
  rolle: 'FUEHRER' | 'UNTERFUEHRER' | 'HELFER';
  geschlecht: 'MAENNLICH' | 'WEIBLICH';
  anzahl: number;
  funktion: string;
  telefon: string;
  erreichbarkeit: string;
  vegetarisch: boolean;
  bemerkung: string;
};

export type EinheitFahrzeugInput = {
  fahrzeugId?: string;
  name: string;
  kennzeichen: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  funkrufname: string;
  stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
  sondergeraet: string;
  nutzlast: string;
};

export interface UseEinheitActionsProps {
  selectedEinsatzId: string;
  selectedAbschnittId: string;
  isArchived: boolean;
  allKraefte: KraftOverviewItem[];
  allFahrzeuge: FahrzeugOverviewItem[];
  createEinheitForm: CreateEinheitForm;
  editEinheitForm: EditEinheitForm;
  splitEinheitForm: SplitEinheitForm;
  editEinheitHelfer: EinheitHelfer[];
  setError: (message: string | null) => void;
  setCreateEinheitForm: Dispatch<SetStateAction<CreateEinheitForm>>;
  setEditEinheitForm: Dispatch<SetStateAction<EditEinheitForm>>;
  setSplitEinheitForm: Dispatch<SetStateAction<SplitEinheitForm>>;
  setEditEinheitHelfer: Dispatch<SetStateAction<EinheitHelfer[]>>;
  setShowCreateEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditEinheitDialog: Dispatch<SetStateAction<boolean>>;
  setShowEditFahrzeugDialog: Dispatch<SetStateAction<boolean>>;
  setShowSplitEinheitDialog: Dispatch<SetStateAction<boolean>>;
  closeEditEinheitDialog: () => void;
  closeEditFahrzeugDialog: () => void;
  acquireEinheitLock: (einsatzId: string, einheitId: string) => Promise<boolean>;
  releaseEinheitLock: (einsatzId: string, einheitId: string) => Promise<boolean>;
  acquireFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<boolean>;
  releaseFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<boolean>;
  refreshCurrentEinsatz: (options?: { includeFullOverview?: boolean }) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

interface StrengthValidationInput {
  fuehrungRaw: string;
  unterfuehrungRaw: string;
  mannschaftRaw: string;
  errorMessage: string;
}

/**
 * Parses tactical strength fields and validates numeric, non-negative values.
 */
export function parseAndValidateStrength(
  setError: (message: string | null) => void,
  input: StrengthValidationInput,
): { fuehrung: number; unterfuehrung: number; mannschaft: number; gesamt: number } | null {
  const fuehrung = Number(input.fuehrungRaw);
  const unterfuehrung = Number(input.unterfuehrungRaw);
  const mannschaft = Number(input.mannschaftRaw);
  if ([fuehrung, unterfuehrung, mannschaft].some((value) => Number.isNaN(value) || value < 0)) {
    setError(input.errorMessage);
    return null;
  }
  return { fuehrung, unterfuehrung, mannschaft, gesamt: fuehrung + unterfuehrung + mannschaft };
}
