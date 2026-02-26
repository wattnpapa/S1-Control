import type { FahrzeugOverviewItem } from '@renderer/types/ui';
import { faArrowsUpDownLeftRight, faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import { ActionIconButton } from '@renderer/components/common/ActionIconButton';
import { TaktischesZeichenFahrzeug } from '@renderer/components/common/TaktischesZeichenFahrzeug';

interface FahrzeugeOverviewTableProps {
  fahrzeuge: FahrzeugOverviewItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
  onEdit: (id: string) => void;
}

export function FahrzeugeOverviewTable(props: FahrzeugeOverviewTableProps): JSX.Element {
  return (
    <>
      <h2>Alle Fahrzeuge im Einsatz</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Kennzeichen</th>
            <th>Zugeordnete Einheit</th>
            <th>Abschnitt</th>
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
              <td>{item.einheitName}</td>
              <td>{item.abschnittName}</td>
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
