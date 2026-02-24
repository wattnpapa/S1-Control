import type { FahrzeugOverviewItem } from '@renderer/types/ui';
import { iconPath } from '@renderer/utils/assets';

interface FahrzeugeOverviewTableProps {
  fahrzeuge: FahrzeugOverviewItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
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
              <td>
                <img src={iconPath('fahrzeug', item.piktogrammKey)} alt="fahrzeug" className="icon" />
              </td>
              <td>{item.name}</td>
              <td>{item.kennzeichen || '-'}</td>
              <td>{item.einheitName}</td>
              <td>{item.abschnittName}</td>
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
