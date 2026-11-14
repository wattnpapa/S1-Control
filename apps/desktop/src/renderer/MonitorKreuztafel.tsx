/**
 * Die Kreuztabelle Abschnitt × Organisation auf dem Monitor (Sachgebiet 1,
 * Taste 9): je Abschnitt eine Zeile, je Organisation eine Spalte, in der
 * Zelle die Ist-Köpfe. Darunter die Gesamtzeile (Spaltensummen = Tafel
 * „Organisationen", Gesamt = Kopfband) und abgesetzt die Erwarteten je
 * Organisation — nie in der Summe.
 *
 * Gerechnet wird nichts: Zeilen, Spalten und Zellen kommen fertig aus
 * `projektion.staerketafel` (`abschnitte`, `organisationen`, `kreuz`).
 */

import type { Staerketafel, Staerketafelzeile } from "@s1/domaene";

import { Fuss, OhneZahlen, tafelgrad, type Ansichtseigenschaften } from "./Monitoransichten.js";

/** Zeichen einer Zeile: Abschnittsname plus sechs je Zahlenspalte. */
function zeichen(spalten: number): number {
  return 24 + 7 * (spalten + 1);
}

function Zahl({ wert, plus = false, klasse }: { readonly wert: number; readonly plus?: boolean; readonly klasse?: string }): React.JSX.Element {
  if (wert === 0) return <td className={`${klasse ?? ""} monitorleise`.trim()}>—</td>;
  return <td className={klasse}>{plus ? `+${String(wert)}` : wert}</td>;
}

function Abschnittszeile({ z, tafel }: { readonly z: Staerketafelzeile; readonly tafel: Staerketafel }): React.JSX.Element {
  const zellen = tafel.kreuz[z.schluessel] ?? {};
  return (
    <tr>
      <th scope="row" style={z.tiefe > 0 ? { paddingLeft: `${String(0.5 + z.tiefe * 1.2)}em` } : undefined}>
        {z.name}
      </th>
      {tafel.organisationen.map((o) => (
        <Zahl key={o.schluessel} wert={zellen[o.schluessel] ?? 0} />
      ))}
      <Zahl wert={z.gesamt} klasse="trenner" />
    </tr>
  );
}

/** Taste 9 — Ist-Köpfe je Abschnitt und Organisation. */
export function MonitorKreuztafel(e: Ansichtseigenschaften): React.JSX.Element {
  const titel = "Abschnitt × Organisation";
  const tafel = e.staerketafel?.tafel;
  if (tafel === undefined) return <OhneZahlen titel={titel} e={e} hinweis="Noch keine Stärke" />;
  if (tafel.abschnitte.length === 0 || tafel.organisationen.length === 0) {
    return <OhneZahlen titel={titel} e={e} hinweis="Noch keine Kräfte in den Abschnitten" />;
  }
  const grad = tafelgrad(e.mass, zeichen(tafel.organisationen.length), tafel.abschnitte.length + 3);
  return (
    <section className="monitor monitortafel" aria-label={`Monitor ${titel}`}>
      <p className="monitorbeschriftung">Stärke je Abschnitt und Organisation · Köpfe vor Ort</p>
      <table style={{ fontSize: `${String(grad)}px` }}>
        <thead>
          <tr>
            <th scope="col">Abschnitt</th>
            {tafel.organisationen.map((o) => (
              <th key={o.schluessel} scope="col">
                {o.name}
              </th>
            ))}
            <th scope="col" className="trenner">Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {tafel.abschnitte.map((z) => (
            <Abschnittszeile key={z.schluessel} z={z} tafel={tafel} />
          ))}
          <tr className="summe">
            <th scope="row">Gesamt</th>
            {tafel.organisationen.map((o) => (
              <td key={o.schluessel}>{o.gesamt}</td>
            ))}
            <td className="trenner">{tafel.gesamt.gesamt}</td>
          </tr>
          <tr className="anmarsch">
            <th scope="row">Erwartet</th>
            {tafel.organisationen.map((o) => (
              <Zahl key={o.schluessel} wert={o.erwartet} plus />
            ))}
            <Zahl wert={tafel.gesamt.erwartet} plus klasse="trenner" />
          </tr>
        </tbody>
      </table>
      <Fuss lagebild={e.lagebild} jetzt={e.jetzt} zusatz={`${e.zeit} · Ist-Stärke, Erwartete nicht in der Summe${e.fusszusatz ?? ""}`} />
    </section>
  );
}
