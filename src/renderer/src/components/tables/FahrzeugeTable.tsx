import type { FahrzeugListItem } from '@shared/types';
import { iconPath } from '@renderer/utils/assets';

interface FahrzeugeTableProps {
  fahrzeuge: FahrzeugListItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
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
              <td>
                <img src={iconPath('fahrzeug', item.piktogrammKey)} alt="fahrzeug" className="icon" />
              </td>
              <td>{item.name}</td>
              <td>{item.kennzeichen || '-'}</td>
              <td>{item.status}</td>
              <td>
                <button onClick={() => props.onMove(item.id)} disabled={props.isArchived}>
                  Verschieben
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
