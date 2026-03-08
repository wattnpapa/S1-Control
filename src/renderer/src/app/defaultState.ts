import type { AbschnittDetails, EinheitHelfer, UpdaterState } from '@shared/types';
import type {
  CreateAbschnittForm,
  CreateEinheitForm,
  CreateFahrzeugForm,
  EditAbschnittForm,
  EditEinheitForm,
  EditFahrzeugForm,
  SplitEinheitForm,
  TacticalStrength,
} from '@renderer/types/ui';

/**
 * Provides empty Abschnitt details used before data loading.
 */
export const EMPTY_DETAILS: AbschnittDetails = { einheiten: [], fahrzeuge: [] };

/**
 * Provides empty tactical strength used before data loading.
 */
export const EMPTY_STRENGTH: TacticalStrength = { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 };

/**
 * Provides initial updater state.
 */
export const DEFAULT_UPDATER_STATE: UpdaterState = { stage: 'idle' };

/**
 * Provides initial form values for Abschnitt creation.
 */
export const DEFAULT_CREATE_ABSCHNITT_FORM: CreateAbschnittForm = {
  name: '',
  systemTyp: 'NORMAL',
  parentId: '',
};

/**
 * Provides initial form values for Abschnitt editing.
 */
export const DEFAULT_EDIT_ABSCHNITT_FORM: EditAbschnittForm = {
  abschnittId: '',
  name: '',
  systemTyp: 'NORMAL',
  parentId: '',
};

/**
 * Provides initial form values for Einheit creation.
 */
export const DEFAULT_CREATE_EINHEIT_FORM: CreateEinheitForm = {
  nameImEinsatz: '',
  organisation: 'THW',
  fuehrung: '0',
  unterfuehrung: '1',
  mannschaft: '8',
  status: 'AKTIV',
  abschnittId: '',
  grFuehrerName: '',
  ovName: '',
  ovTelefon: '',
  ovFax: '',
  rbName: '',
  rbTelefon: '',
  rbFax: '',
  lvName: '',
  lvTelefon: '',
  lvFax: '',
  bemerkung: '',
  vegetarierVorhanden: false,
  erreichbarkeiten: '',
  tacticalSignMode: 'AUTO',
  tacticalSignUnit: '',
  tacticalSignTyp: 'none',
  tacticalSignDenominator: '',
  stanPresetLabel: '',
  stanSuggestedVehicles: [],
};

/**
 * Provides initial form values for Einheit editing.
 */
export const DEFAULT_EDIT_EINHEIT_FORM: EditEinheitForm = {
  einheitId: '',
  nameImEinsatz: '',
  organisation: 'THW',
  fuehrung: '0',
  unterfuehrung: '0',
  mannschaft: '0',
  status: 'AKTIV',
  grFuehrerName: '',
  ovName: '',
  ovTelefon: '',
  ovFax: '',
  rbName: '',
  rbTelefon: '',
  rbFax: '',
  lvName: '',
  lvTelefon: '',
  lvFax: '',
  bemerkung: '',
  vegetarierVorhanden: false,
  erreichbarkeiten: '',
  tacticalSignMode: 'AUTO',
  tacticalSignUnit: '',
  tacticalSignTyp: 'none',
  tacticalSignDenominator: '',
};

/**
 * Provides initial form values for Einheit split.
 */
export const DEFAULT_SPLIT_EINHEIT_FORM: SplitEinheitForm = {
  sourceEinheitId: '',
  nameImEinsatz: '',
  organisation: 'THW',
  fuehrung: '0',
  unterfuehrung: '0',
  mannschaft: '1',
  status: 'AKTIV',
};

/**
 * Provides initial form values for Fahrzeug creation.
 */
export const DEFAULT_CREATE_FAHRZEUG_FORM: CreateFahrzeugForm = {
  name: '',
  kennzeichen: '',
  status: 'AKTIV',
  einheitId: '',
  funkrufname: '',
  stanKonform: 'UNBEKANNT',
  sondergeraet: '',
  nutzlast: '',
};

/**
 * Provides initial form values for Fahrzeug editing.
 */
export const DEFAULT_EDIT_FAHRZEUG_FORM: EditFahrzeugForm = {
  fahrzeugId: '',
  name: '',
  kennzeichen: '',
  status: 'AKTIV',
  einheitId: '',
  funkrufname: '',
  stanKonform: 'UNBEKANNT',
  sondergeraet: '',
  nutzlast: '',
};

/**
 * Provides empty helper list for Einheit editor state.
 */
export const EMPTY_EINHEIT_HELFER: EinheitHelfer[] = [];
