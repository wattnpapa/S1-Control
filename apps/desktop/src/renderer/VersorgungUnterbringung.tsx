/**
 * Unteransicht „Unterbringung" (4e): die Einheiten mit Übernachtungsbedarf.
 *
 * Bedarf nach m/w/d (K6) aus „Unterbringung ja" im Bogen und den Personen
 * oder dem Override der Einheit, dazu die Ruhezeit als Ja/Nein
 * (Entscheidung 7). Die Unterkünfte und die Zuweisung kommen mit S4.2.
 */

import type { Unterbringungsbedarf } from "@s1/domaene";

import { schichtText } from "./versorgungstext.js";

export function VersorgungUnterbringung({ bedarf }: { readonly bedarf: Unterbringungsbedarf }): React.JSX.Element {
  return (
    <div className="karte versorgungskarte">
      <h3>
        Einheiten mit Übernachtungsbedarf{" "}
        <span className="leise">
          · {bedarf.summe.einheiten} Einheiten · {bedarf.summe.gesamt} Betten
        </span>
      </h3>
      {bedarf.zeilen.length === 0 ? (
        <p className="hinweistext">Keine Einheit meldet Übernachtungsbedarf.</p>
      ) : (
        <table className="versorgungstabelle" aria-label="Übernachtungsbedarf">
          <thead>
            <tr>
              <th scope="col">Einheit</th>
              <th scope="col">Bereich</th>
              <th scope="col">Schicht</th>
              <th scope="col" className="zahl trenner">ÜN m</th>
              <th scope="col" className="zahl">w</th>
              <th scope="col" className="zahl">d</th>
              <th scope="col" className="trenner">Ruhezeit</th>
              <th scope="col">Zustand</th>
            </tr>
          </thead>
          <tbody>
            {bedarf.zeilen.map((z) => (
              <tr key={z.einheitId} className={z.anmarsch ? "anmarschzeile" : undefined}>
                <th scope="row">{z.einheit}</th>
                <td>{z.bereich}</td>
                <td>{schichtText(z.schicht)}</td>
                <td className="zahl trenner">{z.m}</td>
                <td className="zahl">{z.w}</td>
                <td className="zahl">{z.d}</td>
                <td className="trenner">{z.ruhezeit ? "ja" : "—"}</td>
                <td>{z.anmarsch ? <span className="marke-zustand">Anmarsch</span> : <span className="marke-zustand">Bedarf</span>}</td>
              </tr>
            ))}
            <tr className="summenzeile">
              <th scope="row" colSpan={3}>
                Summe Einsatzbereiche
              </th>
              <td className="zahl trenner">{bedarf.summe.m}</td>
              <td className="zahl">{bedarf.summe.w}</td>
              <td className="zahl">{bedarf.summe.d}</td>
              <td className="trenner" colSpan={2}>
                {bedarf.anmarsch.einheiten > 0 ? `Anmarsch getrennt: ${String(bedarf.anmarsch.gesamt)} Betten` : ""}
              </td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="hinweistext">
        Bedarf (K6): „Unterbringung ja“ aus dem Bogen, Köpfe nach m/w/d aus den Personen oder dem Override der Einheit.
        Unterkünfte und Zuweisung folgen mit Schnitt S4.2.
      </p>
    </div>
  );
}
