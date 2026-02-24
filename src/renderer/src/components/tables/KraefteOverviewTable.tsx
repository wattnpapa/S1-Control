import { prettyOrganisation } from '@renderer/constants/organisation';
import type { KraftOverviewItem } from '@renderer/types/ui';
import { iconPath } from '@renderer/utils/assets';

interface KraefteOverviewTableProps {
  einheiten: KraftOverviewItem[];
  isArchived: boolean;
  onMove: (id: string) => void;
  onSplit: (id: string) => void;
}

export function KraefteOverviewTable(props: KraefteOverviewTableProps): JSX.Element {
  const nameById = new Map(props.einheiten.map((e) => [e.id, e.nameImEinsatz]));

  return (
    <>
      <h2>Alle Kraefte im Einsatz</h2>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Organisation</th>
            <th>Abschnitt</th>
            <th>Staerke (taktisch)</th>
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
              <td>{item.abschnittName}</td>
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
