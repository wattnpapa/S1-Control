import type { CreateEinheitForm, EditEinheitForm, EditFahrzeugForm, FahrzeugOverviewItem, KraftOverviewItem } from '@renderer/types/ui';
import type { AbschnittNode, EinheitHelfer, HelferGeschlecht, HelferRolle } from '@shared/types';

/**
 * Draft row state for inline helper editing.
 */
export interface HelferDraft {
  name: string;
  rolle: HelferRolle;
  geschlecht: HelferGeschlecht;
  anzahl: number;
  funktion: string;
  telefon: string;
  erreichbarkeit: string;
  vegetarisch: boolean;
  bemerkung: string;
}

/**
 * Draft row state for inline vehicle editing.
 */
export interface FahrzeugDraft {
  name: string;
  kennzeichen: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  funkrufname: string;
  stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
  sondergeraet: string;
  nutzlast: string;
}

/**
 * Props for inline existing unit editor.
 */
export interface InlineEinheitEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditEinheitForm;
  onChange: (next: EditEinheitForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
  helfer: EinheitHelfer[];
  onCreateHelfer: (input: {
    name: string;
    rolle: HelferRolle;
    geschlecht: HelferGeschlecht;
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onUpdateHelfer: (input: {
    helferId: string;
    name: string;
    rolle: HelferRolle;
    geschlecht: HelferGeschlecht;
    anzahl: number;
    funktion: string;
    telefon: string;
    erreichbarkeit: string;
    vegetarisch: boolean;
    bemerkung: string;
  }) => Promise<void>;
  onDeleteHelfer: (helferId: string) => Promise<void>;
  fahrzeuge: FahrzeugOverviewItem[];
  onCreateFahrzeug: (input: {
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
  onUpdateFahrzeug: (input: {
    fahrzeugId: string;
    name: string;
    kennzeichen: string;
    status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
    funkrufname: string;
    stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
    sondergeraet: string;
    nutzlast: string;
  }) => Promise<void>;
}

/**
 * Props for inline create unit editor.
 */
export interface InlineCreateEinheitEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: CreateEinheitForm;
  abschnitte: AbschnittNode[];
  onChange: (next: CreateEinheitForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

/**
 * Props for inline vehicle editor.
 */
export interface InlineFahrzeugEditorProps {
  visible: boolean;
  busy: boolean;
  isArchived: boolean;
  form: EditFahrzeugForm;
  allKraefte: KraftOverviewItem[];
  onChange: (next: EditFahrzeugForm) => void;
  onSubmit: () => void;
  onCancel: () => void;
}
