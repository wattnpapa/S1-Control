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
  releaseEinheitLock: (einsatzId: string, einheitId: string) => Promise<unknown>;
  acquireFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<boolean>;
  releaseFahrzeugLock: (einsatzId: string, fahrzeugId: string) => Promise<unknown>;
  refreshCurrentEinsatz: (options?: { includeFullOverview?: boolean }) => Promise<void>;
  withBusy: (fn: () => Promise<void>) => Promise<void>;
}

interface StrengthValidationInput {
  fuehrungRaw: string;
  unterfuehrungRaw: string;
  mannschaftRaw: string;
  errorMessage: string;
}

/** Obergrenze je Feld: darüber liegt fast immer ein Zahlendreher. */
const PLAUSIBEL_MAX = 999;

/**
 * Liest ein Stärkefeld.
 *
 * Ein leeres Feld ist keine Null: `Number('')` ergibt 0 und würde eine
 * vergessene Eingabe still als "keine Kräfte" übernehmen.
 */
function leseZahl(rohwert: string): number | null {
  const getrimmt = rohwert.trim();
  if (getrimmt === '') {
    return null;
  }
  const wert = Number(getrimmt);
  if (!Number.isInteger(wert) || wert < 0 || wert > PLAUSIBEL_MAX) {
    return null;
  }
  return wert;
}

/**
 * Parses tactical strength fields and validates numeric, non-negative values.
 */
export function parseAndValidateStrength(
  setError: (message: string | null) => void,
  input: StrengthValidationInput,
): { fuehrung: number; unterfuehrung: number; mannschaft: number; gesamt: number } | null {
  const fuehrung = leseZahl(input.fuehrungRaw);
  const unterfuehrung = leseZahl(input.unterfuehrungRaw);
  const mannschaft = leseZahl(input.mannschaftRaw);
  if (fuehrung === null || unterfuehrung === null || mannschaft === null) {
    setError(
      `${input.errorMessage} Bitte ganze Zahlen von 0 bis ${PLAUSIBEL_MAX} in allen drei Feldern eintragen.`,
    );
    return null;
  }
  return { fuehrung, unterfuehrung, mannschaft, gesamt: fuehrung + unterfuehrung + mannschaft };
}
