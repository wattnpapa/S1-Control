/**
 * Fahrzeuge, Personen und Aufträge einer Einheit (M3.2).
 *
 * Die Excel führt beides als mehrzeiligen Freitext in den Spalten J und K
 * (`excel-domaenenmodell.md` §2). Dass hier Entitäten stehen und dort Text,
 * ist der eigentliche Fortschritt: Aus Text lässt sich keine Stückzahl
 * summieren und kein Fahrzeug einer anderen Einheit zuordnen.
 *
 * Sie werden **eigens geholt** und nicht mit jeder Tabellenzeile mitgeliefert
 * (M3.7): Eine Einheit mit vollständiger Personalerfassung führt bis zu
 * dreißig Personen, und 150 solcher Einheiten wären viertausend Datensätze
 * über die Prozessgrenze, um die einer einzigen aufgeklappten Zeile zu zeigen.
 */

import { useEffect } from "react";

import { useLaden } from "./laden.js";

export interface UntertabellenEigenschaften {
  readonly einheitId: string;
}

export function Untertabellen({ einheitId }: UntertabellenEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const holeUntertabelle = laden.holeUntertabelle;

  useEffect(() => {
    void holeUntertabelle(einheitId);
  }, [einheitId, holeUntertabelle]);

  const daten = laden.untertabelle?.einheitId === einheitId ? laden.untertabelle : undefined;
  if (daten === undefined) {
    return (
      <section aria-label="Untertabellen" className="untertabellen">
        <p className="hinweistext">Wird geladen …</p>
      </section>
    );
  }

  return (
    <section aria-label="Untertabellen" className="untertabellen">
      <div>
        <h3>Fahrzeuge</h3>
        {daten.fahrzeuge.length === 0 ? (
          <p className="hinweistext">Keine Fahrzeuge erfasst.</p>
        ) : (
          <ul>
            {daten.fahrzeuge.map((fahrzeug) => (
              // §5.4.5 gilt auch hier: Entfernen ist kein Löschen. Ein
              // entfernter Eintrag bleibt sichtbar — sonst ließe er sich nicht
              // wiederherstellen, weil ihn niemand mehr sieht.
              <li key={fahrzeug.id} className={fahrzeug.entfernt ? "entfernt" : ""}>
                {fahrzeug.typ}
                {fahrzeug.bezeichnung === "" ? "" : ` — ${fahrzeug.bezeichnung}`}
                {fahrzeug.kennzeichen === undefined ? "" : ` (${fahrzeug.kennzeichen})`}
                {fahrzeug.funkrufname === undefined ? "" : ` · ${fahrzeug.funkrufname}`}
                {fahrzeug.entfernt && " · entfernt"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3>Personen</h3>
        {daten.personen.length === 0 ? (
          <p className="hinweistext">Keine Personen erfasst — die Einheit meldet nur ihre Stärke.</p>
        ) : (
          <ul>
            {daten.personen.map((person) => (
              <li key={person.id} className={person.entfernt ? "entfernt" : ""}>
                {person.name}
                {person.rolle === undefined ? "" : ` · ${person.rolle}`}
                {person.entfernt && " · entfernt"}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3>Aufträge</h3>
        {daten.auftraege.length === 0 ? (
          <p className="hinweistext">Kein Auftrag erfasst.</p>
        ) : (
          <ul>
            {daten.auftraege.map((auftrag) => (
              <li key={auftrag.id} className={auftrag.beendet ? "beendet" : ""}>
                {auftrag.von === undefined ? "" : `${auftrag.von} `}
                {auftrag.bis === undefined ? "" : `– ${auftrag.bis} `}
                {auftrag.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
