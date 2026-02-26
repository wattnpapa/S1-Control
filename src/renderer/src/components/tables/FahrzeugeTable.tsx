import type { FahrzeugListItem } from '@shared/types';
import { faArrowsUpDownLeftRight, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';

interface FahrzeugeTableProps {
  fahrzeuge: FahrzeugListItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}

export function FahrzeugeTable(props: FahrzeugeTableProps): JSX.Element {
  return (
    <>
      <h2>Fahrzeuge im Abschnitt</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Kennzeichen</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {props.fahrzeuge.map((item) => (
            <tr key={item.id}>
              <td className="tactical-sign-cell">
                <TaktischesZeichenFahrzeug organisation={item.organisation} />
              </td>
              <td>{item.name}</td>
              <td>{item.kennzeichen || '-'}</td>
              <td>{item.status}</td>
              <td>
                <ActionIconButton
                  label="Verschieben"
                  icon={faArrowsUpDownLeftRight}
                  onClick={() => props.onMove(item.id)}
                  disabled={props.isArchived}
                />
                <ActionIconButton
                  label="Bearbeiten"
                  icon={faPenToSquare}
                  onClick={() => props.onEdit(item.id)}
                  disabled={props.isArchived}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
