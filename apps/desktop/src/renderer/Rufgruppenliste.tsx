/**
 * Die Karte „Rufgruppen" des Blattes „Funkplan" (Option 5b, links).
 *
 * Eine Zeile je Gruppe mit Betriebsart als Marke, Name in Mono, Zweck und
 * abhörendem Platz, Zahl der Teilnehmer; aufgelöste blass am Ende, wie die
 * Projektion sie ordnet. Darunter ein Kasten mit den Feldern der gewählten
 * Gruppe und den Knöpfen Bearbeiten (Strg+E) und Auflösen; eine aufgelöste
 * Gruppe lässt sich wiederherstellen.
 *
 * Auflösen fragt den Grund (Pflicht, §2.4) und setzt niemanden um: Die
 * Teilnehmer stehen danach als „ohne Rufgruppe", bis jemand sie umsetzt
 * (Entscheidung 9).
 */

import type { Rufgruppenkarte } from "@s1/domaene";

import { Betriebsartmarke } from "./Funkmarken.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { einheitenText, uhrzeitText } from "./versorgungstext.js";
import { rufgruppeAufgeloest, rufgruppeWiederhergestellt } from "../kontrakt/funkschritte.js";

export interface RufgruppenlisteEigenschaften {
  readonly rufgruppen: readonly Rufgruppenkarte[];
  readonly gewaehlt: Rufgruppenkarte | undefined;
  readonly nurLesen: boolean;
  readonly aufWahl: (rufgruppeId: string) => void;
  readonly aufBearbeiten: (karte: Rufgruppenkarte) => void;
}

/** „5 TMO · 1 DMO" — die geltenden Gruppen je Betriebsart, in der Reihenfolge der Liste. */
export function betriebsartenText(rufgruppen: readonly Rufgruppenkarte[]): string {
  const zahl = new Map<string, number>();
  for (const r of rufgruppen) if (!r.aufgeloest) zahl.set(r.betriebsart, (zahl.get(r.betriebsart) ?? 0) + 1);
  return [...zahl].map(([art, n]) => `${String(n)} ${art === "ANALOG" ? "Analog" : art}`).join(" · ");
}

function zweckText(r: Rufgruppenkarte): string {
  if (r.aufgeloest) return `aufgelöst${r.aufgeloestAm === undefined ? "" : ` ${uhrzeitText(r.aufgeloestAm)}`}`;
  const teile = [r.zweck, r.gateway === undefined ? undefined : `Gateway ${r.gateway}`, r.hoert];
  return teile.filter((t): t is string => t !== undefined).join(" · ") || "—";
}

function Kasten({ r }: { readonly r: Rufgruppenkarte }): React.JSX.Element {
  const felder: readonly (readonly [string, string | undefined])[] = [
    ["Betrieb", r.betriebsart === "ANALOG" ? "Analog" : r.betriebsart],
    ["Zweck", r.zweck],
    ["hört mit", r.hoert],
    ["Gateway", r.gateway],
    ["Bereich", r.bereich],
    ["Bemerkung", r.bemerkung],
  ];
  return (
    <div className="funkkasten" role="group" aria-label={`Gewählte Rufgruppe ${r.name}`}>
      <p className="funkkastentitel">
        {r.name} · {r.aufgeloest ? "aufgelöst" : "gewählt"}
      </p>
      <dl>
        {felder.map(([titel, wert]) => (
          <div key={titel}>
            <dt>{titel}</dt>
            <dd>{wert ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function Rufgruppenliste(props: RufgruppenlisteEigenschaften): React.JSX.Element {
  const { rufgruppen, gewaehlt, nurLesen } = props;
  const abfrage = useGrundabfrage();
  const bediene = useLaden((z) => z.bediene);
  const geltend = rufgruppen.filter((r) => !r.aufgeloest).length;
  const loeseAuf = (r: Rufgruppenkarte): void => {
    abfrage.frage({
      titel: `Rufgruppe „${r.name}“ auflösen`,
      erlaeuterung: `${einheitenText(r.teilnehmer.length)} stehen danach als „ohne Rufgruppe“ und müssen von Hand umgesetzt werden.`,
      bestaetigungstext: "Auflösen",
      aufGrund: (grund) => bediene(rufgruppeAufgeloest(r.rufgruppeId, grund)),
    });
  };
  return (
    <section className="karte funkkarte rufgruppenkarte" aria-label="Rufgruppen">
      <h3>
        Rufgruppen <span className="leise">· {geltend}{geltend > 0 ? ` · ${betriebsartenText(rufgruppen)}` : ""}</span>
      </h3>
      {rufgruppen.length === 0 ? (
        <p className="hinweistext">Noch keine Rufgruppe angelegt.</p>
      ) : (
        <table className="funktabelle" aria-label="Liste der Rufgruppen">
          <thead>
            <tr>
              <th scope="col">Betrieb</th>
              <th scope="col">Name</th>
              <th scope="col">Zweck · hört</th>
              <th scope="col" className="zahl">Einh.</th>
            </tr>
          </thead>
          <tbody>
            {rufgruppen.map((r) => (
              <tr
                key={r.rufgruppeId}
                className={[r.rufgruppeId === gewaehlt?.rufgruppeId ? "gewaehlt" : "", r.aufgeloest ? "blass" : ""].join(" ").trim() || undefined}
                aria-selected={r.rufgruppeId === gewaehlt?.rufgruppeId}
                onClick={() => props.aufWahl(r.rufgruppeId)}
                onDoubleClick={() => props.aufBearbeiten(r)}
              >
                <td>
                  <Betriebsartmarke betriebsart={r.betriebsart} />
                </td>
                <th scope="row" className="mono">
                  {r.name}
                </th>
                <td className="leise">{zweckText(r)}</td>
                <td className="zahl">{r.teilnehmer.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {gewaehlt !== undefined && <Kasten r={gewaehlt} />}
      {gewaehlt !== undefined && !nurLesen && (
        <p className="kartenknoepfe">
          {gewaehlt.aufgeloest ? (
            <button type="button" onClick={() => void bediene(rufgruppeWiederhergestellt(gewaehlt.rufgruppeId))}>
              Wiederherstellen
            </button>
          ) : (
            <>
              <button type="button" onClick={() => props.aufBearbeiten(gewaehlt)} title={kuerzelText(kuerzel("entfernen") as never)}>
                Bearbeiten {kuerzelText(kuerzel("entfernen") as never)}
              </button>
              <button type="button" onClick={() => loeseAuf(gewaehlt)}>
                Auflösen …
              </button>
            </>
          )}
        </p>
      )}
      <p className="hinweistext">
        Anlegen, Ändern und Auflösen stehen im Tagebuch und lassen sich zurücknehmen. Auflösen braucht einen Grund und setzt die Teilnehmer nicht von selbst um.
      </p>
      {abfrage.maske}
    </section>
  );
}
