import type {
  AbschnittNode,
  EinheitListItem,
  FahrzeugListItem,
  OrganisationKey,
} from '@shared/types';

export interface MoveDialogState {
  type: 'einheit' | 'fahrzeug';
  id: string;
}

export type WorkspaceView =
  | 'einsatz'
  | 'fuehrung'
  | 'kraefte'
  | 'fahrzeuge'
  | 'einstellungen';

export interface CreateAbschnittForm {
  name: string;
  systemTyp: AbschnittNode['systemTyp'];
  parentId: string;
}

export interface CreateEinheitForm {
  nameImEinsatz: string;
  organisation: OrganisationKey;
  fuehrung: string;
  unterfuehrung: string;
  mannschaft: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
  abschnittId: string;
  grFuehrerName: string;
  ovName: string;
  ovTelefon: string;
  ovFax: string;
  rbName: string;
  rbTelefon: string;
  rbFax: string;
  lvName: string;
  lvTelefon: string;
  lvFax: string;
  bemerkung: string;
  vegetarierVorhanden: boolean;
  erreichbarkeiten: string;
}

export interface CreateFahrzeugForm {
  name: string;
  kennzeichen: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  einheitId: string;
  funkrufname: string;
  stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
  sondergeraet: string;
  nutzlast: string;
}

export interface EditAbschnittForm {
  abschnittId: string;
  name: string;
  systemTyp: AbschnittNode['systemTyp'];
  parentId: string;
}

export interface EditEinheitForm {
  einheitId: string;
  nameImEinsatz: string;
  organisation: OrganisationKey;
  fuehrung: string;
  unterfuehrung: string;
  mannschaft: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
  grFuehrerName: string;
  ovName: string;
  ovTelefon: string;
  ovFax: string;
  rbName: string;
  rbTelefon: string;
  rbFax: string;
  lvName: string;
  lvTelefon: string;
  lvFax: string;
  bemerkung: string;
  vegetarierVorhanden: boolean;
  erreichbarkeiten: string;
}

export interface EditFahrzeugForm {
  fahrzeugId: string;
  name: string;
  kennzeichen: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'AUSSER_BETRIEB';
  einheitId: string;
  funkrufname: string;
  stanKonform: 'JA' | 'NEIN' | 'UNBEKANNT';
  sondergeraet: string;
  nutzlast: string;
}

export interface SplitEinheitForm {
  sourceEinheitId: string;
  nameImEinsatz: string;
  organisation: OrganisationKey;
  fuehrung: string;
  unterfuehrung: string;
  mannschaft: string;
  status: 'AKTIV' | 'IN_BEREITSTELLUNG' | 'ABGEMELDET';
}

export interface TacticalStrength {
  fuehrung: number;
  unterfuehrung: number;
  mannschaft: number;
  gesamt: number;
}

export interface KraftOverviewItem extends EinheitListItem {
  abschnittName: string;
}

export interface FahrzeugOverviewItem extends FahrzeugListItem {
  abschnittName: string;
  einheitName: string;
}
