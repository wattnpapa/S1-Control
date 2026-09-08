import { TaktischesZeichenPerson } from '@renderer/components/common/TaktischesZeichenPerson';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMars, faVenus } from '@fortawesome/free-solid-svg-icons';
import type { EinheitHelfer, HelferGeschlecht, HelferRolle, OrganisationKey } from '@shared/types';
import type { Dispatch, JSX, SetStateAction } from 'react';

/**
 * Handles mutable form state for a helper row.
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

interface EinheitHelferSectionProps {
  organisation: OrganisationKey;
  helfer: EinheitHelfer[];
  editRows: Record<string, HelferDraft>;
  setEditRows: Dispatch<SetStateAction<Record<string, HelferDraft>>>;
  autoRows: Record<string, HelferDraft>;
  setAutoRows: Dispatch<SetStateAction<Record<string, HelferDraft>>>;
  busy: boolean;
  isArchived: boolean;
  onCreateHelfer: (input: HelferDraft) => Promise<void>;
  onUpdateHelfer: (input: HelferDraft & { helferId: string }) => Promise<void>;
  onDeleteHelfer: (helferId: string) => Promise<void>;
}

interface GeschlechtToggleProps {
  geschlecht: HelferGeschlecht;
  onChange: (value: HelferGeschlecht) => void;
}

interface HelferRowBaseProps {
  organisation: OrganisationKey;
  row: HelferDraft;
  updateRow: (next: HelferDraft) => void;
}

interface ExistingHelferRowProps extends HelferRowBaseProps {
  rowId: string;
  busy: boolean;
  isArchived: boolean;
  onUpdateHelfer: (input: HelferDraft & { helferId: string }) => Promise<void>;
  onDeleteHelfer: (helferId: string) => Promise<void>;
}

interface NewHelferRowProps extends HelferRowBaseProps {
  rowKey: string;
  busy: boolean;
  isArchived: boolean;
  onCreateHelfer: (input: HelferDraft) => Promise<void>;
}

/**
 * Renders role options.
 */
function HelferRolleSelect({ value, onChange }: { value: HelferRolle; onChange: (value: HelferRolle) => void }): JSX.Element {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value as HelferRolle)}>
      <option value="FUEHRER">Führer</option>
      <option value="UNTERFUEHRER">Unterführer</option>
      <option value="HELFER">Helfer</option>
    </select>
  );
}

/**
 * Renders compact gender buttons.
 */
function GeschlechtToggle({ geschlecht, onChange }: GeschlechtToggleProps): JSX.Element {
  return (
    <div className="gender-toggle-group" role="group" aria-label="Geschlecht">
      <button
        type="button"
        className={`gender-toggle ${geschlecht === 'MAENNLICH' ? 'active' : ''}`}
        onClick={() => onChange('MAENNLICH')}
        title="Männlich"
      >
        <FontAwesomeIcon icon={faMars} />
      </button>
      <button
        type="button"
        className={`gender-toggle ${geschlecht === 'WEIBLICH' ? 'active' : ''}`}
        onClick={() => onChange('WEIBLICH')}
        title="Weiblich"
      >
        <FontAwesomeIcon icon={faVenus} />
      </button>
    </div>
  );
}

/**
 * Renders shared editable helper cells.
 */
function HelferCommonCells({ organisation, row, updateRow }: HelferRowBaseProps): JSX.Element {
  return (
    <>
      <td>
        <HelferRolleSelect value={row.rolle} onChange={(rolle) => updateRow({ ...row, rolle })} />
      </td>
      <td>
        <GeschlechtToggle geschlecht={row.geschlecht} onChange={(geschlecht) => updateRow({ ...row, geschlecht })} />
      </td>
      <td className="helper-name-cell">
        <TaktischesZeichenPerson organisation={organisation} rolle={row.rolle} />
        <input
          value={row.name}
          onChange={(event) => updateRow({ ...row, name: event.target.value })}
          placeholder="optional"
        />
      </td>
      <td>
        <input
          type="number"
          min={1}
          value={row.anzahl}
          onChange={(event) => {
            const value = Math.max(1, Math.round(Number(event.target.value) || 1));
            updateRow({ ...row, anzahl: value });
          }}
        />
      </td>
      <td><input value={row.funktion} onChange={(event) => updateRow({ ...row, funktion: event.target.value })} /></td>
      <td><input value={row.telefon} onChange={(event) => updateRow({ ...row, telefon: event.target.value })} /></td>
      <td><input value={row.erreichbarkeit} onChange={(event) => updateRow({ ...row, erreichbarkeit: event.target.value })} /></td>
      <td>
        <input
          type="checkbox"
          checked={row.vegetarisch}
          onChange={(event) => updateRow({ ...row, vegetarisch: event.target.checked })}
        />
      </td>
      <td><input value={row.bemerkung} onChange={(event) => updateRow({ ...row, bemerkung: event.target.value })} /></td>
    </>
  );
}

/**
 * Renders one persisted helper row.
 */
function ExistingHelferRow(props: ExistingHelferRowProps): JSX.Element {
  return (
    <tr>
      <HelferCommonCells organisation={props.organisation} row={props.row} updateRow={props.updateRow} />
      <td className="inline-subtable-actions">
        <button
          onClick={() => void props.onUpdateHelfer({ helferId: props.rowId, ...props.row })}
          disabled={props.busy || props.isArchived}
        >
          Speichern
        </button>
        <button onClick={() => void props.onDeleteHelfer(props.rowId)} disabled={props.busy || props.isArchived}>
          Löschen
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders one automatically generated helper row.
 */
function NewHelferRow(props: NewHelferRowProps): JSX.Element {
  return (
    <tr key={props.rowKey}>
      <HelferCommonCells organisation={props.organisation} row={props.row} updateRow={props.updateRow} />
      <td className="inline-subtable-actions">
        <button onClick={() => void props.onCreateHelfer({ ...props.row, anzahl: 1 })} disabled={props.busy || props.isArchived}>
          Hinzufügen
        </button>
      </td>
    </tr>
  );
}

/**
 * Renders and edits Helfer rows for the current Einheit.
 */
export function EinheitHelferSection(props: EinheitHelferSectionProps): JSX.Element {
  return (
    <>
      <tr>
        <th colSpan={4}>Helfer</th>
      </tr>
      <tr>
        <td colSpan={4}>
          <table className="inline-subtable">
            <thead>
              <tr>
                <th>Typ</th>
                <th>G</th>
                <th>Name</th>
                <th>Anzahl</th>
                <th>Funktion</th>
                <th>Telefon</th>
                <th>Erreichbarkeit</th>
                <th>Vegetarisch</th>
                <th>Bemerkung</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {props.helfer.map((item) => {
                const row = props.editRows[item.id];
                if (!row) {
                  return null;
                }
                const updateRow = (next: HelferDraft): void => {
                  props.setEditRows((prev) => ({ ...prev, [item.id]: next }));
                };
                return (
                  <ExistingHelferRow
                    key={item.id}
                    organisation={props.organisation}
                    rowId={item.id}
                    row={row}
                    updateRow={updateRow}
                    busy={props.busy}
                    isArchived={props.isArchived}
                    onUpdateHelfer={props.onUpdateHelfer}
                    onDeleteHelfer={props.onDeleteHelfer}
                  />
                );
              })}
              {Object.entries(props.autoRows).map(([rowKey, row]) => {
                const updateRow = (next: HelferDraft): void => {
                  props.setAutoRows((prev) => ({ ...prev, [rowKey]: next }));
                };
                return (
                  <NewHelferRow
                    key={rowKey}
                    rowKey={rowKey}
                    organisation={props.organisation}
                    row={row}
                    updateRow={updateRow}
                    busy={props.busy}
                    isArchived={props.isArchived}
                    onCreateHelfer={props.onCreateHelfer}
                  />
                );
              })}
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}
