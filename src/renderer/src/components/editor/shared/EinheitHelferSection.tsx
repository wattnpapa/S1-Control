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
              {props.helfer.map((row) => {
                const edit = props.editRows[row.id];
                if (!edit) {
                  return null;
                }

                return (
                  <tr key={row.id}>
                    <td>
                      <select
                        value={edit.rolle}
                        onChange={(e) =>
                          props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, rolle: e.target.value as HelferRolle } }))
                        }
                      >
                        <option value="FUEHRER">Führer</option>
                        <option value="UNTERFUEHRER">Unterführer</option>
                        <option value="HELFER">Helfer</option>
                      </select>
                    </td>
                    <td>
                      <div className="gender-toggle-group" role="group" aria-label="Geschlecht">
                        <button
                          type="button"
                          className={`gender-toggle ${edit.geschlecht === 'MAENNLICH' ? 'active' : ''}`}
                          onClick={() => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, geschlecht: 'MAENNLICH' } }))}
                          title="Männlich"
                        >
                          <FontAwesomeIcon icon={faMars} />
                        </button>
                        <button
                          type="button"
                          className={`gender-toggle ${edit.geschlecht === 'WEIBLICH' ? 'active' : ''}`}
                          onClick={() => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, geschlecht: 'WEIBLICH' } }))}
                          title="Weiblich"
                        >
                          <FontAwesomeIcon icon={faVenus} />
                        </button>
                      </div>
                    </td>
                    <td className="helper-name-cell">
                      <TaktischesZeichenPerson organisation={props.organisation} rolle={edit.rolle} />
                      <input
                        value={edit.name}
                        onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))}
                        placeholder="optional"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={edit.anzahl}
                        onChange={(e) =>
                          props.setEditRows((prev) => ({
                            ...prev,
                            [row.id]: { ...edit, anzahl: Math.max(1, Math.round(Number(e.target.value) || 1)) },
                          }))
                        }
                      />
                    </td>
                    <td><input value={edit.funktion} onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, funktion: e.target.value } }))} /></td>
                    <td><input value={edit.telefon} onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, telefon: e.target.value } }))} /></td>
                    <td><input value={edit.erreichbarkeit} onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, erreichbarkeit: e.target.value } }))} /></td>
                    <td>
                      <input
                        type="checkbox"
                        checked={edit.vegetarisch}
                        onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, vegetarisch: e.target.checked } }))}
                      />
                    </td>
                    <td><input value={edit.bemerkung} onChange={(e) => props.setEditRows((prev) => ({ ...prev, [row.id]: { ...edit, bemerkung: e.target.value } }))} /></td>
                    <td className="inline-subtable-actions">
                      <button
                        onClick={() =>
                          void props.onUpdateHelfer({
                            helferId: row.id,
                            ...edit,
                          })
                        }
                        disabled={props.busy || props.isArchived}
                      >
                        Speichern
                      </button>
                      <button onClick={() => void props.onDeleteHelfer(row.id)} disabled={props.busy || props.isArchived}>
                        Löschen
                      </button>
                    </td>
                  </tr>
                );
              })}
              {Object.entries(props.autoRows).map(([autoKey, row]) => (
                <tr key={autoKey}>
                  <td>
                    <select
                      value={row.rolle}
                      onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, rolle: e.target.value as HelferRolle } }))}
                    >
                      <option value="FUEHRER">Führer</option>
                      <option value="UNTERFUEHRER">Unterführer</option>
                      <option value="HELFER">Helfer</option>
                    </select>
                  </td>
                  <td>
                    <div className="gender-toggle-group" role="group" aria-label="Geschlecht">
                      <button
                        type="button"
                        className={`gender-toggle ${row.geschlecht === 'MAENNLICH' ? 'active' : ''}`}
                        onClick={() => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, geschlecht: 'MAENNLICH' } }))}
                        title="Männlich"
                      >
                        <FontAwesomeIcon icon={faMars} />
                      </button>
                      <button
                        type="button"
                        className={`gender-toggle ${row.geschlecht === 'WEIBLICH' ? 'active' : ''}`}
                        onClick={() => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, geschlecht: 'WEIBLICH' } }))}
                        title="Weiblich"
                      >
                        <FontAwesomeIcon icon={faVenus} />
                      </button>
                    </div>
                  </td>
                  <td className="helper-name-cell">
                    <TaktischesZeichenPerson organisation={props.organisation} rolle={row.rolle} />
                    <input
                      value={row.name}
                      onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, name: e.target.value } }))}
                      placeholder="optional"
                    />
                  </td>
                  <td>
                    <input type="number" min={1} value={1} readOnly />
                  </td>
                  <td><input value={row.funktion} onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, funktion: e.target.value } }))} /></td>
                  <td><input value={row.telefon} onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, telefon: e.target.value } }))} /></td>
                  <td><input value={row.erreichbarkeit} onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, erreichbarkeit: e.target.value } }))} /></td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.vegetarisch}
                      onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, vegetarisch: e.target.checked } }))}
                    />
                  </td>
                  <td><input value={row.bemerkung} onChange={(e) => props.setAutoRows((prev) => ({ ...prev, [autoKey]: { ...row, bemerkung: e.target.value } }))} /></td>
                  <td className="inline-subtable-actions">
                    <button onClick={() => void props.onCreateHelfer({ ...row, anzahl: 1 })} disabled={props.busy || props.isArchived}>
                      Hinzufügen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}
