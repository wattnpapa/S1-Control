import { prettyOrganisation } from '@renderer/constants/organisation';
import type { KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';
import { parseTaktischeStaerke, toTaktischeStaerke } from '@renderer/utils/tactical';
import type { AbschnittNode, OrganisationKey } from '@shared/types';

interface FuehrungsstrukturViewProps {
  abschnitte: AbschnittNode[];
  kraefte: KraftOverviewItem[];
}

export function FuehrungsstrukturView(props: FuehrungsstrukturViewProps): JSX.Element {
  const byParent = new Map<string | null, AbschnittNode[]>();
  for (const abschnitt of props.abschnitte) {
    const list = byParent.get(abschnitt.parentId) ?? [];
    list.push(abschnitt);
    byParent.set(abschnitt.parentId, list);
  }

  const kraefteByAbschnitt = new Map<string, KraftOverviewItem[]>();
  for (const kraft of props.kraefte) {
    const list = kraefteByAbschnitt.get(kraft.aktuellerAbschnittId) ?? [];
    list.push(kraft);
    kraefteByAbschnitt.set(kraft.aktuellerAbschnittId, list);
  }

  const cache = new Map<string, { taktisch: TacticalStrength; organisations: Map<OrganisationKey, number> }>();

  const collectStats = (
    abschnittId: string,
  ): { taktisch: TacticalStrength; organisations: Map<OrganisationKey, number> } => {
    const cached = cache.get(abschnittId);
    if (cached) {
      return cached;
    }

    const result: { taktisch: TacticalStrength; organisations: Map<OrganisationKey, number> } = {
      taktisch: { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 },
      organisations: new Map<OrganisationKey, number>(),
    };

    const direct = kraefteByAbschnitt.get(abschnittId) ?? [];
    for (const kraft of direct) {
      const p = parseTaktischeStaerke(kraft.aktuelleStaerkeTaktisch, kraft.aktuelleStaerke);
      result.taktisch.fuehrung += p.fuehrung;
      result.taktisch.unterfuehrung += p.unterfuehrung;
      result.taktisch.mannschaft += p.mannschaft;
      result.taktisch.gesamt += p.gesamt;
      result.organisations.set(kraft.organisation, (result.organisations.get(kraft.organisation) ?? 0) + 1);
    }

    for (const child of byParent.get(abschnittId) ?? []) {
      const childStats = collectStats(child.id);
      result.taktisch.fuehrung += childStats.taktisch.fuehrung;
      result.taktisch.unterfuehrung += childStats.taktisch.unterfuehrung;
      result.taktisch.mannschaft += childStats.taktisch.mannschaft;
      result.taktisch.gesamt += childStats.taktisch.gesamt;

      for (const [org, count] of childStats.organisations.entries()) {
        result.organisations.set(org, (result.organisations.get(org) ?? 0) + count);
      }
    }

    cache.set(abschnittId, result);
    return result;
  };

  const renderNodes = (parentId: string | null): JSX.Element | null => {
    const nodes = byParent.get(parentId) ?? [];
    if (nodes.length === 0) {
      return null;
    }

    return (
      <div className="fuehrung-level">
        {nodes.map((node) => {
          const stats = collectStats(node.id);
          const organisations = Array.from(stats.organisations.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

          return (
            <div key={node.id} className="fuehrung-node-wrap">
              <article className="fuehrung-node">
                <header>
                  <h3>{node.name}</h3>
                  <span>{node.systemTyp}</span>
                </header>
                <p>
                  Fuehrungsstaerke: <strong>{toTaktischeStaerke(stats.taktisch)}</strong>
                </p>
                <p>
                  Einheiten gesamt: <strong>{stats.taktisch.gesamt}</strong>
                </p>
                <div className="org-chips">
                  {organisations.length > 0 ? (
                    organisations.map(([org, count]) => (
                      <span key={org} className="org-chip">
                        {prettyOrganisation(org)} ({count})
                      </span>
                    ))
                  ) : (
                    <span className="org-chip">Keine Einheiten</span>
                  )}
                </div>
              </article>
              {renderNodes(node.id)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="fuehrung-view">
      <h2>Fuehrungsstruktur und Organisation</h2>
      <p>Hierarchische Sicht auf Abschnitte mit aggregierter Fuehrungsstaerke und Organisationen.</p>
      {renderNodes(null)}
    </div>
  );
}
