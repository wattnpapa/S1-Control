/**
 * Die Stärketafeln des Sachgebiets 1 auf dem Monitor: Ist-Stärke je
 * Abschnitt und je Organisation (Gruppe S1).
 *
 * Gleiche Regeln wie die Tafel „Bereiche · Schichten": Schrift aus
 * `tafelgrad`, Beschriftung oben, Gesamtzeile fett, Einsatz und Stand im
 * Fuß. Gerechnet wird nichts — die Zahlen kommen fertig aus
 * `projektion.staerketafel` über den Ruf `staerketafelAnfordern`. Die
 * Gesamtzeile ist dieselbe Ist-Stärke wie im Kopfband; Erwartete stehen in
 * einer eigenen Spalte und nie in der Summe.
 */

import type { Staerketafel, Staerketafelzeile } from "@s1/domaene";

import { Fuss, OhneZahlen, tafelgrad, type Ansichtseigenschaften } from "./Monitoransichten.js";

/** Zeichen einer Zeile: Name, vier Zahlen und „+123" samt Zellabstand. */
const ZEICHEN_JE_ZEILE = 50;

function Erwartetzelle({ koepfe }: { readonly koepfe: number }): React.JSX.Element {
  return koepfe > 0 ? <td className="trenner">+{koepfe}</td> : <td className="trenner monitorleise">—</td>;
}

function Staerkezeile({ z, klasse }: { readonly z: Staerketafelzeile; readonly klasse?: string }): React.JSX.Element {
  const anmarsch = klasse === "anmarsch";
  return (
    <tr className={klasse}>
      <th scope="row" style={z.tiefe > 0 ? { paddingLeft: `${String(0.5 + z.tiefe * 1.2)}em` } : undefined}>
        {z.name}
      </th>
      <td>{z.staerke.fuehrer}</td>
      <td>{z.staerke.unterfuehrer}</td>
      <td>{z.staerke.mannschaft}</td>
      <td className="trenner">{z.gesamt}</td>
      {anmarsch ? <td className="trenner">—</td> : <Erwartetzelle koepfe={z.erwartet} />}
    </tr>
  );
}

interface Tafelangaben {
  readonly titel: string;
  readonly beschriftung: string;
  readonly kopf: string;
  readonly zeilen: (tafel: Staerketafel) => readonly Staerketafelzeile[];
  readonly mitAnmarsch: boolean;
  readonly leer: string;
}

function Staerkebild({ e, a }: { readonly e: Ansichtseigenschaften; readonly a: Tafelangaben }): React.JSX.Element {
  const tafel = e.staerketafel?.tafel;
  if (tafel === undefined) return <OhneZahlen titel={a.titel} e={e} hinweis="Noch keine Stärke" />;
  const zeilen = a.zeilen(tafel);
  if (zeilen.length === 0) return <OhneZahlen titel={a.titel} e={e} hinweis={a.leer} />;
  const zeigeAnmarsch = a.mitAnmarsch && tafel.anmarsch.gesamt > 0;
  const grad = tafelgrad(e.mass, ZEICHEN_JE_ZEILE, zeilen.length + (zeigeAnmarsch ? 3 : 2));
  return (
    <section className="monitor monitortafel" aria-label={`Monitor ${a.titel}`}>
      <p className="monitorbeschriftung">{a.beschriftung}</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">{a.kopf}</th>
            <th scope="col">Fü</th>
            <th scope="col">UFü</th>
            <th scope="col">He</th>
            <th scope="col" className="trenner">Gesamt</th>
            <th scope="col" className="trenner">Erwartet</th>
          </tr>
        </thead>
        <tbody>
          {zeilen.map((z) => (
            <Staerkezeile key={z.schluessel} z={z} />
          ))}
          <Staerkezeile z={tafel.gesamt} klasse="summe" />
          {zeigeAnmarsch && <Staerkezeile z={tafel.anmarsch} klasse="anmarsch" />}
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit} · Ist-Stärke, Erwartete nicht in der Summe${e.fusszusatz ?? ""}`} />
    </section>
  );
}

const ABSCHNITTE: Tafelangaben = {
  titel: "Abschnitte",
  beschriftung: "Stärke je Abschnitt · Fü / UFü / He = Gesamt",
  kopf: "Abschnitt",
  zeilen: (t) => t.abschnitte,
  mitAnmarsch: true,
  leer: "Noch keine Kräfte in den Abschnitten",
};

const ORGANISATIONEN: Tafelangaben = {
  titel: "Organisationen",
  beschriftung: "Stärke je Organisation · Fü / UFü / He = Gesamt",
  kopf: "Organisation",
  zeilen: (t) => t.organisationen,
  mitAnmarsch: false,
  leer: "Noch keine Kräfte erfasst",
};

/** S1 — Ist-Stärke je Abschnitt, Unterabschnitte eingerückt, Anmarsch abgesetzt. */
export function MonitorAbschnitte(e: Ansichtseigenschaften): React.JSX.Element {
  return <Staerkebild e={e} a={ABSCHNITTE} />;
}

/** S1 — Ist-Stärke je Organisation, Erwartete daneben. */
export function MonitorOrganisationen(e: Ansichtseigenschaften): React.JSX.Element {
  return <Staerkebild e={e} a={ORGANISATIONEN} />;
}
