import { prettyOrganisation } from '@renderer/constants/organisation';
import type { KraftOverviewItem, TacticalStrength } from '@renderer/types/ui';
import { parseTaktischeStaerke, toTaktischeStaerke } from '@renderer/utils/tactical';
import type { AbschnittNode, OrganisationKey } from '@shared/types';
import type { JSX } from 'react';

interface FuehrungsstrukturViewProps {
  abschnitte: AbschnittNode[];
  kraefte: KraftOverviewItem[];
}

interface NodeStats {
  taktisch: TacticalStrength;
  organisations: Map<OrganisationKey, number>;
}

interface TreeIndexes {
  byId: Map<string, AbschnittNode>;
  byParent: Map<string | null, AbschnittNode[]>;
  kraefteByAbschnitt: Map<string, KraftOverviewItem[]>;
}

const SYSTEM_TYP_LABELS: Record<AbschnittNode['systemTyp'], string> = {
  FUEST: 'FüSt',
  ANFAHRT: 'Anfahrt',
  LOGISTIK: 'Logistik',
  BEREITSTELLUNGSRAUM: 'Bereitstellungsraum',
  NORMAL: 'Abschnitt',
};

/**
 * Builds lookup maps for hierarchy and force assignment.
 */
function buildIndexes(abschnitte: AbschnittNode[], kraefte: KraftOverviewItem[]): TreeIndexes {
  const byId = new Map(abschnitte.map((item) => [item.id, item]));
  const byParent = new Map<string | null, AbschnittNode[]>();
  for (const abschnitt of abschnitte) {
    byParent.set(abschnitt.parentId, [...(byParent.get(abschnitt.parentId) ?? []), abschnitt]);
  }
  const kraefteByAbschnitt = new Map<string, KraftOverviewItem[]>();
  for (const kraft of kraefte) {
    kraefteByAbschnitt.set(kraft.aktuellerAbschnittId, [...(kraefteByAbschnitt.get(kraft.aktuellerAbschnittId) ?? []), kraft]);
  }
  return { byId, byParent, kraefteByAbschnitt };
}

/**
 * Creates recursive stats collector with memoization.
 */
function createStatsCollector(indexes: TreeIndexes): (abschnittId: string) => NodeStats {
  const cache = new Map<string, NodeStats>();
  const collectStats = (abschnittId: string): NodeStats => {
    const cached = cache.get(abschnittId);
    if (cached) {
      return cached;
    }
    const result: NodeStats = {
      taktisch: { fuehrung: 0, unterfuehrung: 0, mannschaft: 0, gesamt: 0 },
      organisations: new Map<OrganisationKey, number>(),
    };

    const abschnitt = indexes.byId.get(abschnittId);
    if (abschnitt?.systemTyp !== 'ANFAHRT') {
      addDirectStats(result, indexes.kraefteByAbschnitt.get(abschnittId) ?? []);
    }
    for (const child of indexes.byParent.get(abschnittId) ?? []) {
      addChildStats(result, collectStats(child.id));
    }

    cache.set(abschnittId, result);
    return result;
  };
  return collectStats;
}

/**
 * Adds direct unit stats to accumulated node stats.
 */
function addDirectStats(target: NodeStats, kraefte: KraftOverviewItem[]): void {
  for (const kraft of kraefte) {
    const parsed = parseTaktischeStaerke(kraft.aktuelleStaerkeTaktisch, kraft.aktuelleStaerke);
    target.taktisch.fuehrung += parsed.fuehrung;
    target.taktisch.unterfuehrung += parsed.unterfuehrung;
    target.taktisch.mannschaft += parsed.mannschaft;
    target.taktisch.gesamt += parsed.gesamt;
    target.organisations.set(kraft.organisation, (target.organisations.get(kraft.organisation) ?? 0) + 1);
  }
}

/**
 * Adds child subtree stats to parent stats.
 */
function addChildStats(target: NodeStats, child: NodeStats): void {
  target.taktisch.fuehrung += child.taktisch.fuehrung;
  target.taktisch.unterfuehrung += child.taktisch.unterfuehrung;
  target.taktisch.mannschaft += child.taktisch.mannschaft;
  target.taktisch.gesamt += child.taktisch.gesamt;
  for (const [org, count] of child.organisations.entries()) {
    target.organisations.set(org, (target.organisations.get(org) ?? 0) + count);
  }
}

/**
 * Returns top organization chips for one node.
 */
function topOrganisations(organisations: Map<OrganisationKey, number>): Array<[OrganisationKey, number]> {
  return Array.from(organisations.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
}

/**
 * Renders organization chip list.
 */
function OrganisationChips({ organisations }: { organisations: Array<[OrganisationKey, number]> }): JSX.Element {
  if (organisations.length === 0) {
    return <span className="org-chip">Keine Einheiten</span>;
  }
  return (
    <>
      {organisations.map(([org, count]) => (
        <span key={org} className="org-chip">
          {prettyOrganisation(org)} ({count})
        </span>
      ))}
    </>
  );
}

/**
 * Renders one hierarchy node with stats.
 */
function HierarchyNode({
  node,
  stats,
}: {
  node: AbschnittNode;
  stats: NodeStats;
}): JSX.Element {
  return (
    <div className="fuehr-org-node">
      <article className={`fuehr-org-card ${node.systemTyp === 'FUEST' ? 'is-command' : ''}`}>
        <div className="fuehr-org-sign">{SYSTEM_TYP_LABELS[node.systemTyp]}</div>
        <div className="fuehr-org-body">
          <header>
            <h3>{node.name}</h3>
            <span>{node.systemTyp}</span>
          </header>
          <p>
            Führungsstärke: <strong>{toTaktischeStaerke(stats.taktisch)}</strong>
          </p>
          <p>
            Einheiten gesamt: <strong>{stats.taktisch.gesamt}</strong>
          </p>
          <div className="org-chips">
            <OrganisationChips organisations={topOrganisations(stats.organisations)} />
          </div>
        </div>
      </article>
    </div>
  );
}

/**
 * Renders one hierarchy branch recursively.
 */
function HierarchyBranch({
  parentId,
  byParent,
  collectStats,
}: {
  parentId: string | null;
  byParent: TreeIndexes['byParent'];
  collectStats: (abschnittId: string) => NodeStats;
}): JSX.Element | null {
  const nodes = byParent.get(parentId) ?? [];
  if (nodes.length === 0) {
    return null;
  }
  return (
    <div className="fuehr-org-children">
      {nodes.map((node) => {
        const children = byParent.get(node.id) ?? [];
        return (
          <div key={node.id} className="fuehr-org-child">
            <HierarchyNode node={node} stats={collectStats(node.id)} />
            {children.length > 0 ? (
              <div className="fuehr-org-branch">
                <div className="fuehr-org-branch-down" />
                <HierarchyBranch parentId={node.id} byParent={byParent} collectStats={collectStats} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Handles Fuehrungsstruktur View.
 */
export function FuehrungsstrukturView(props: FuehrungsstrukturViewProps): JSX.Element {
  const indexes = buildIndexes(props.abschnitte, props.kraefte);
  const collectStats = createStatsCollector(indexes);
  return (
    <div className="fuehrung-view">
      <h2>Führungsstruktur und Organisation</h2>
      <div className="fuehr-org-canvas">
        <HierarchyBranch parentId={null} byParent={indexes.byParent} collectStats={collectStats} />
      </div>
    </div>
  );
}
