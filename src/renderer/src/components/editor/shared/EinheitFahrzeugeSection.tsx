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

/**
 * Renders and edits Fahrzeuge assigned to the current Einheit.
 */
export function EinheitFahrzeugeSection(props: EinheitFahrzeugeSectionProps): JSX.Element {
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
              {props.fahrzeuge
                .filter((item) => item.aktuelleEinsatzEinheitId === props.einheitId)
                .map((row) => {
                  const edit = props.editFahrzeuge[row.id];
                  if (!edit) {
                    return null;
                  }

                  return (
                    <tr key={row.id}>
                      <td className="tactical-sign-cell compact-sign-cell">
                        <TaktischesZeichenFahrzeug
                          organisation={row.organisation}
                          name={edit.name}
                          funkrufname={edit.funkrufname}
                        />
                      </td>
                      <td>
                        <input
                          value={edit.name}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, name: e.target.value } }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={edit.kennzeichen}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, kennzeichen: e.target.value } }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={edit.funkrufname}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, funkrufname: e.target.value } }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={edit.stanKonform}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({
                              ...prev,
                              [row.id]: { ...edit, stanKonform: e.target.value as FahrzeugDraft['stanKonform'] },
                            }))
                          }
                        >
                          <option value="UNBEKANNT">unbekannt</option>
                          <option value="JA">ja</option>
                          <option value="NEIN">nein</option>
                        </select>
                      </td>
                      <td>
                        <input
                          value={edit.sondergeraet}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, sondergeraet: e.target.value } }))
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={edit.nutzlast}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({ ...prev, [row.id]: { ...edit, nutzlast: e.target.value } }))
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={edit.status}
                          onChange={(e) =>
                            props.setEditFahrzeuge((prev) => ({
                              ...prev,
                              [row.id]: { ...edit, status: e.target.value as FahrzeugDraft['status'] },
                            }))
                          }
                        >
                          <option value="AKTIV">AKTIV</option>
                          <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                          <option value="AUSSER_BETRIEB">AUSSER BETRIEB</option>
                        </select>
                      </td>
                      <td className="inline-subtable-actions">
                        <button
                          onClick={() =>
                            void props.onUpdateFahrzeug({
                              fahrzeugId: row.id,
                              ...edit,
                            })
                          }
                          disabled={props.busy || props.isArchived}
                        >
                          Speichern
                        </button>
                      </td>
                    </tr>
                  );
                })}
              <tr>
                <td className="tactical-sign-cell compact-sign-cell">
                  <TaktischesZeichenFahrzeug
                    organisation={props.organisation}
                    name={props.newFahrzeug.name}
                    funkrufname={props.newFahrzeug.funkrufname}
                  />
                </td>
                <td>
                  <input
                    value={props.newFahrzeug.name}
                    onChange={(e) => props.setNewFahrzeug((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Neues Fahrzeug"
                  />
                </td>
                <td>
                  <input
                    value={props.newFahrzeug.kennzeichen}
                    onChange={(e) => props.setNewFahrzeug((prev) => ({ ...prev, kennzeichen: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={props.newFahrzeug.funkrufname}
                    onChange={(e) => props.setNewFahrzeug((prev) => ({ ...prev, funkrufname: e.target.value }))}
                  />
                </td>
                <td>
                  <select
                    value={props.newFahrzeug.stanKonform}
                    onChange={(e) =>
                      props.setNewFahrzeug((prev) => ({ ...prev, stanKonform: e.target.value as FahrzeugDraft['stanKonform'] }))
                    }
                  >
                    <option value="UNBEKANNT">unbekannt</option>
                    <option value="JA">ja</option>
                    <option value="NEIN">nein</option>
                  </select>
                </td>
                <td>
                  <input
                    value={props.newFahrzeug.sondergeraet}
                    onChange={(e) => props.setNewFahrzeug((prev) => ({ ...prev, sondergeraet: e.target.value }))}
                  />
                </td>
                <td>
                  <input
                    value={props.newFahrzeug.nutzlast}
                    onChange={(e) => props.setNewFahrzeug((prev) => ({ ...prev, nutzlast: e.target.value }))}
                  />
                </td>
                <td>
                  <select
                    value={props.newFahrzeug.status}
                    onChange={(e) =>
                      props.setNewFahrzeug((prev) => ({ ...prev, status: e.target.value as FahrzeugDraft['status'] }))
                    }
                  >
                    <option value="AKTIV">AKTIV</option>
                    <option value="IN_BEREITSTELLUNG">IN_BEREITSTELLUNG</option>
                    <option value="AUSSER_BETRIEB">AUSSER BETRIEB</option>
                  </select>
                </td>
                <td className="inline-subtable-actions">
                  <button
                    onClick={async () => {
                      await props.onCreateFahrzeug(props.newFahrzeug);
                      props.setNewFahrzeug({
                        name: '',
                        kennzeichen: '',
                        status: 'AKTIV',
                        funkrufname: '',
                        stanKonform: 'UNBEKANNT',
                        sondergeraet: '',
                        nutzlast: '',
                      });
                    }}
                    disabled={props.busy || props.isArchived}
                  >
                    Hinzufügen
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </>
  );
}
