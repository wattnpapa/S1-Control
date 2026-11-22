/**
 * Das Blatt „Übersicht“: Kräfte nach Status je Abschnitt und alle Aufträge.
 *
 * Gefordert im Stab-Review vom 22.11.2026 (docs/audits/stab): Der Leiter
 * Stab, der Leiter Führungsstelle, S1 und S3 mussten Stärke, Status und
 * Aufträge aus drei Blättern und den Untertabellen jeder einzelnen Einheit
 * zusammensuchen. Hier steht beides auf einer Seite, zum Lesen und für den
 * Lagevortrag; bearbeitet wird weiter im Blatt S1.
 *
 * Die Zahlen sind Köpfe, nicht Einheiten, und jede Abschnittszeile zählt ihre
 * Unterabschnitte mit, wie der Abschnittsbaum. „Erwartet“ (angefordert,
 * Anmarsch, Rufbereitschaft) steht daneben und nie in der Summe.
 */

import { useState } from "react";

import { projektion, zeitpunktText, type Auftragsuebersichtzeile, type Kraeftezeile } from "@s1/domaene";

import { Einsatzzeitentabelle } from "./Einsatzzeitentabelle.js";
import { useLaden } from "./laden.js";
import { useStabsuebersicht } from "./useStabsuebersicht.js";

const { KRAEFTESPALTEN, kraeftespaltenTitel } = projektion;

export function Stabsuebersicht(): React.JSX.Element {
  const akteId = useLaden((zustand) => zustand.akteId);
  const lageZeiger = useLaden((zustand) => zustand.lagebild?.lageZeiger);
  const ansicht = useStabsuebersicht(akteId, lageZeiger);

  return (
    <section aria-label="Übersicht" className="stabsuebersicht">
      <h2>Übersicht</h2>
      {ansicht === undefined ? (
        <p className="hinweistext">Wird geladen …</p>
      ) : (
        <>
          <Kraeftetabelle
            zeilen={ansicht.uebersicht.kraefte}
            gesamt={ansicht.uebersicht.gesamt}
            anmarsch={ansicht.uebersicht.anmarsch}
          />
          <Auftragstabelle zeilen={ansicht.uebersicht.auftraege} />
          <Einsatzzeitentabelle zeilen={ansicht.uebersicht.einsatzzeiten} kommen={ansicht.uebersicht.kommen} />
        </>
      )}
    </section>
  );
}

interface KraeftetabelleEigenschaften {
  readonly zeilen: readonly Kraeftezeile[];
  readonly gesamt: Kraeftezeile;
  readonly anmarsch: number;
}

function Kraeftetabelle({ zeilen, gesamt, anmarsch }: KraeftetabelleEigenschaften): React.JSX.Element {
  return (
    <section aria-label="Kräfte nach Status" className="karte">
      <h3>Kräfte nach Status</h3>
      <p className="hinweistext">Köpfe je Abschnitt einschließlich Unterabschnitte. „Erwartet“ zählt nicht in die Summe.</p>
      {zeilen.length === 0 ? (
        <p>Noch keine Kräfte vor Ort.</p>
      ) : (
        <div className="tabellenrahmen">
          <table className="zahlentabelle">
            <thead>
              <tr>
                <th scope="col">Abschnitt</th>
                {KRAEFTESPALTEN.map((spalte) => (
                  <th key={spalte} scope="col">{kraeftespaltenTitel(spalte)}</th>
                ))}
                <th scope="col">Gesamt</th>
                <th scope="col">erwartet</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((zeile) => (
                <Kraeftereihe key={zeile.abschnittId} zeile={zeile} />
              ))}
            </tbody>
            <tfoot>
              <Kraeftereihe zeile={gesamt} fuss />
            </tfoot>
          </table>
        </div>
      )}
      {anmarsch > 0 && <p className="hinweistext">Davon in „Angefordert / Anmarsch“ und im Eingang: {anmarsch} erwartet.</p>}
    </section>
  );
}

function Kraeftereihe({ zeile, fuss = false }: { zeile: Kraeftezeile; fuss?: boolean }): React.JSX.Element {
  return (
    <tr className={fuss ? "summenzeile" : undefined}>
      <th scope="row" style={{ paddingLeft: `${String(0.3 + zeile.tiefe * 1.1)}rem` }}>
        {zeile.name}
      </th>
      {KRAEFTESPALTEN.map((spalte) => (
        <td key={spalte} className="zahl">{zeile.je[spalte] === 0 ? "–" : zeile.je[spalte]}</td>
      ))}
      <td className="zahl"><strong>{zeile.gesamt}</strong></td>
      <td className="zahl">{zeile.erwartet === 0 ? "–" : zeile.erwartet}</td>
    </tr>
  );
}

function Auftragstabelle({ zeilen }: { zeilen: readonly Auftragsuebersichtzeile[] }): React.JSX.Element {
  const [alle, setzeAlle] = useState(false);
  const offen = zeilen.filter((zeile) => zeile.offen);
  const sichtbar = alle ? zeilen : offen;
  return (
    <section aria-label="Aufträge" className="karte">
      <h3>Aufträge</h3>
      <label className="schalter">
        <input
          type="checkbox"
          checked={alle}
          onChange={(e) => {
            setzeAlle(e.target.checked);
          }}
        />
        Erledigte zeigen ({zeilen.length - offen.length})
      </label>
      <p className="hinweistext">{offen.length === 1 ? "1 offener Auftrag" : `${String(offen.length)} offene Aufträge`}, aller Einheiten.</p>
      {sichtbar.length > 0 && (
        <div className="tabellenrahmen">
          <table>
            <thead>
              <tr>
                <th scope="col">Auftrag</th>
                <th scope="col">Einheit</th>
                <th scope="col">Abschnitt</th>
                <th scope="col">Beginn</th>
                <th scope="col">Erledigt</th>
              </tr>
            </thead>
            <tbody>
              {sichtbar.map((zeile) => (
                <tr key={zeile.auftragId} className={zeile.offen ? undefined : "erledigt"}>
                  <td>{zeile.text}</td>
                  <td>{zeile.einheit === "" ? "–" : zeile.einheit}</td>
                  <td>{zeile.abschnitt === "" ? "–" : zeile.abschnitt}</td>
                  <td>{zeitpunktText(zeile.von) || "–"}</td>
                  <td>{zeile.offen ? "offen" : zeitpunktText(zeile.bis)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
