/**
 * Die gemeinsame Listentafel des Monitors: Kopf, Zeilen, „+N weitere" und
 * Fuß — für Warteschlange, Lageticker, Aufträge, Sofortbedarf und „Funk still".
 *
 * Die Schrift kommt aus der Spaltenbreite (je Spalte der längste Eintrag) und
 * der Zeilenzahl, damit nichts übersteht (AGENTS.md §9). Eine Warnzeile trägt
 * ⚠ vor der ersten Zelle, nicht nur Bernstein. Passen nicht alle Zeilen,
 * nennt die letzte den Rest.
 */

import { Fuss, OhneZahlen, tafelgrad, type Ansichtseigenschaften } from "./Monitoransichten.js";

export interface Listenspalte {
  readonly titel: string;
  /** Linksbündiger Text statt rechtsbündiger Zahl. */
  readonly text?: boolean;
  /** Gedämpft (Zusatzangaben). */
  readonly leise?: boolean;
}

export interface Listenzeile {
  readonly schluessel: string;
  readonly zellen: readonly string[];
  readonly warn?: boolean;
  /** Eine Gruppenzeile (etwa der Abschnitt), über die ganze Breite. */
  readonly gruppe?: boolean;
}

/** Zeilen, die bei dieser Fensterhöhe noch lesbar passen (mindestens 6). */
export function listenplatz(hoehe: number): number {
  return Math.max(6, Math.floor(hoehe / 70));
}

/** Zeichen der Tafelbreite: je Spalte der längste Eintrag, dazu der Zellabstand. */
export function listenzeichen(spalten: readonly Listenspalte[], zeilen: readonly Listenzeile[]): number {
  const breiten = spalten.map((s, i) => Math.max(s.titel.length, ...zeilen.filter((z) => z.gruppe !== true).map((z) => (z.zellen[i] ?? "").length + (i === 0 && z.warn === true ? 2 : 0))));
  return breiten.reduce((a, b) => a + b, 0) + spalten.length * 3;
}

function Zeile({ z, spalten }: { readonly z: Listenzeile; readonly spalten: readonly Listenspalte[] }): React.JSX.Element {
  if (z.gruppe === true) {
    return (
      <tr className="anmarsch">
        <th scope="rowgroup" colSpan={spalten.length} className="text">
          {z.zellen[0]}
        </th>
      </tr>
    );
  }
  return (
    <tr className={z.warn === true ? "monitorwarn" : undefined}>
      {spalten.map((s, i) => (
        <td key={s.titel} className={[s.text === true ? "text" : "", s.leise === true && z.warn !== true ? "monitorleise" : ""].filter((k) => k !== "").join(" ") || undefined}>
          {i === 0 && z.warn === true ? "⚠ " : ""}
          {z.zellen[i] ?? ""}
        </td>
      ))}
    </tr>
  );
}

export function Listentafel(props: {
  readonly e: Ansichtseigenschaften;
  readonly titel: string;
  readonly beschriftung: string;
  readonly spalten: readonly Listenspalte[];
  readonly zeilen: readonly Listenzeile[] | undefined;
  readonly leer: string;
  readonly zusatz?: string;
}): React.JSX.Element {
  const { e, titel, beschriftung, spalten, zeilen, leer, zusatz } = props;
  if (zeilen === undefined) return <OhneZahlen titel={titel} e={e} hinweis="Wird geladen …" />;
  if (zeilen.length === 0) return <OhneZahlen titel={titel} e={e} hinweis={leer} />;
  const platz = listenplatz(e.mass.hoehe);
  const sichtbar = zeilen.slice(0, platz);
  const rest = zeilen.length - sichtbar.length;
  const grad = tafelgrad(e.mass, listenzeichen(spalten, sichtbar), sichtbar.length + (rest > 0 ? 2 : 1));
  return (
    <section className="monitor monitortafel" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">{beschriftung}</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            {spalten.map((s) => (
              <th key={s.titel} scope="col" className={s.text === true ? "text" : undefined}>
                {s.titel}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sichtbar.map((z) => (
            <Zeile key={z.schluessel} z={z} spalten={spalten} />
          ))}
          {rest > 0 && (
            <tr className="anmarsch">
              <td colSpan={spalten.length} className="text">
                +{rest} weitere
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit}${zusatz === undefined || zusatz === "" ? "" : ` · ${zusatz}`}${e.fusszusatz ?? ""}`} />
    </section>
  );
}
