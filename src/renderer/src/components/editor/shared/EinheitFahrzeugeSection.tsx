import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';
import type { FahrzeugOverviewItem } from '@renderer/types/ui';
import type { OrganisationKey } from '@shared/types';
import type { Dispatch, JSX, SetStateAction } from 'react';

/**
 * Handles mutable form state for an inline Fahrzeug row.
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

interface EinheitFahrzeugeSectionProps {
  organisation: OrganisationKey;
  einheitId: string;
  fahrzeuge: FahrzeugOverviewItem[];
  editFahrzeuge: Record<string, FahrzeugDraft>;
  setEditFahrzeuge: Dispatch<SetStateAction<Record<string, FahrzeugDraft>>>;
  newFahrzeug: FahrzeugDraft;
  setNewFahrzeug: Dispatch<SetStateAction<FahrzeugDraft>>;
  busy: boolean;
  isArchived: boolean;
  onCreateFahrzeug: (input: FahrzeugDraft) => Promise<void>;
  onUpdateFahrzeug: (input: FahrzeugDraft & { fahrzeugId: string }) => Promise<void>;
}

interface FahrzeugRowBaseProps {
  organisation: OrganisationKey;
  row: FahrzeugDraft;
  updateRow: (next: FahrzeugDraft) => void;
}

interface ExistingFahrzeugRowProps extends FahrzeugRowBaseProps {
  rowId: string;
  busy: boolean;
  isArchived: boolean;
  onUpdateFahrzeug: (input: FahrzeugDraft & { fahrzeugId: string }) => Promise<void>;
}

interface NewFahrzeugRowProps extends FahrzeugRowBaseProps {
  busy: boolean;
  isArchived: boolean;
  onCreateFahrzeug: (input: FahrzeugDraft) => Promise<void>;
  onReset: () => void;
}

const EMPTY_VEHICLE_DRAFT: FahrzeugDraft = {
  name: '',
  kennzeichen: '',
  status: 'AKTIV',
  funkrufname: '',
  stanKonform: 'UNBEKANNT',
  sondergeraet: '',
  nutzlast: '',
};

/**
 * Renders editable vehicle cells shared by edit/new rows.
 */
function FahrzeugCommonCells({ organisation, row, updateRow }: FahrzeugRowBaseProps): JSX.Element {
  return (
    <>
      <td className="tactical-sign-cell compact-sign-cell">
        <TaktischesZeichenFahrzeug organisation={organisation} name={row.name} funkrufname={row.funkrufname} />
      </td>
      <td><input value={row.name} onChange={(event) => updateRow({ ...row, name: event.target.value })} /></td>
      <td><input value={row.kennzeichen} onChange={(event) => updateRow({ ...row, kennzeichen: event.target.value })} /></td>
      <td><input value={row.funkrufname} onChange={(event) => updateRow({ ...row, funkrufname: event.target.value })} /></td>
      <td>
        <select
          value={row.stanKonform}
          onChange={(event) => updateRow({ ...row, stanKonform: event.target.value as FahrzeugDraft['stanKonform'] })}
        >
          <option value="UNBEKANNT">unbekannt</option>
          <option value="JA">ja</option>
          <option value="NEIN">nein</option>
        </select>
      </td>
      <td><input value={row.sondergeraet} onChange={(event) => updateRow({ ...row, sondergeraet: event.target.value })} /></td>
      <td><input value={row.nutzlast} onChange={(event) => updateRow({ ...row, nutzlast: event.target.value })} /></td>
      <td>
        <select
          value={row.status}
          onChange={(event) => updateRow({ ...row, status: event.target.value as FahrzeugDraft['status'] })}
        >
          <option value="AKTIV">AKTIV</option>
          <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
          <option value="AUSSER_BETRIEB">AUSSER BETRIEB</option>
        </select>
      </td>
    </>
  );
}

/**
 * Renders one persisted vehicle row.
 */
function ExistingFahrzeugRow(props: ExistingFahrzeugRowProps): JSX.Element {
  return (
    <tr>
      <FahrzeugCommonCells organisation={props.organisation} row={props.row} updateRow={props.updateRow} />
      <td className="inline-subtable-actions">
        <button
          onClick={() => void props.onUpdateFahrzeug({ fahrzeugId: props.rowId, ...props.row })}
          disabled={props.busy || props.isArchived}
        >
          Speichern
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders row for new vehicle creation.
 */
function NewFahrzeugRow(props: NewFahrzeugRowProps): JSX.Element {
  return (
    <tr>
      <FahrzeugCommonCells organisation={props.organisation} row={props.row} updateRow={props.updateRow} />
      <td className="inline-subtable-actions">
        <button
          onClick={async () => {
            await props.onCreateFahrzeug(props.row);
            props.onReset();
          }}
          disabled={props.busy || props.isArchived}
        >
          Hinzufügen
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders and edits Fahrzeuge assigned to the current Einheit.
 */
export function EinheitFahrzeugeSection(props: EinheitFahrzeugeSectionProps): JSX.Element {
  const assignedRows = props.fahrzeuge.filter((item) => item.aktuelleEinsatzEinheitId === props.einheitId);
  return (
    <>
      <tr>
        <th colSpan={4}>Fahrzeuge</th>
      </tr>
      <tr>
        <td colSpan={4}>
          <table className="inline-subtable">
            <thead>
              <tr>
                <th />
                <th>Name</th>
                <th>Kennzeichen</th>
                <th>FuRn</th>
                <th>STAN</th>
                <th>Sondergerät</th>
                <th>Nutzlast</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {assignedRows.map((item) => {
                const row = props.editFahrzeuge[item.id];
                if (!row) {
                  return null;
                }
                const updateRow = (next: FahrzeugDraft): void => {
                  props.setEditFahrzeuge((prev) => ({ ...prev, [item.id]: next }));
                };
                return (
                  <ExistingFahrzeugRow
                    key={item.id}
                    organisation={item.organisation}
                    rowId={item.id}
                    row={row}
                    updateRow={updateRow}
                    busy={props.busy}
                    isArchived={props.isArchived}
                    onUpdateFahrzeug={props.onUpdateFahrzeug}
                  />
                );
              })}
              <NewFahrzeugRow
                organisation={props.organisation}
                row={props.newFahrzeug}
                updateRow={(next) => props.setNewFahrzeug(next)}
                busy={props.busy}
                isArchived={props.isArchived}
                onCreateFahrzeug={props.onCreateFahrzeug}
                onReset={() => props.setNewFahrzeug(EMPTY_VEHICLE_DRAFT)}
              />
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}
