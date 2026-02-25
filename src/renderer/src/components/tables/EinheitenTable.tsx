import type { EinheitListItem } from '@shared/types';
import { prettyOrganisation } from '@renderer/constants/organisation';
import { iconPath } from '@renderer/utils/assets';

interface EinheitenTableProps {
  einheiten: EinheitListItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
  onSplit: (id: string) => void;
}

export function EinheitenTable(props: EinheitenTableProps): JSX.Element {
  const nameById = new Map(props.einheiten.map((e) => [e.id, e.nameImEinsatz]));

  return (
    <>
      <h2>Einheiten im Abschnitt</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Organisation</th>
            <th>Stärke (taktisch)</th>
            <th>Status</th>
            <th>Aktion</th>
          </tr>
        </thead>
        <tbody>
          {props.einheiten.map((item) => (
            <tr key={item.id} className={item.parentEinsatzEinheitId ? 'split-row' : undefined}>
              <td>
                <img src={iconPath('einheit', item.piktogrammKey)} alt="einheit" className="icon" />
              </td>
              <td>
                <div className={item.parentEinsatzEinheitId ? 'split-name' : undefined}>
                  <span>{item.nameImEinsatz}</span>
                  {item.parentEinsatzEinheitId && (
                    <span className="split-badge">
                      Split von {nameById.get(item.parentEinsatzEinheitId) ?? item.parentEinsatzEinheitId}
                    </span>
                  )}
                </div>
              </td>
              <td>{prettyOrganisation(item.organisation)}</td>
              <td>{item.aktuelleStaerkeTaktisch ?? `0/0/${item.aktuelleStaerke}/${item.aktuelleStaerke}`}</td>
              <td>{item.status}</td>
              <td>
                <button onClick={() => props.onMove(item.id)} disabled={props.isArchived}>
                  Verschieben
                </button>
                <button onClick={() => props.onSplit(item.id)} disabled={props.isArchived}>
                  Splitten
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
