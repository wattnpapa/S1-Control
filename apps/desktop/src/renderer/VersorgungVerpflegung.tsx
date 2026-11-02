/**
 * Unteransicht „Verpflegung" (4d): der Mahlzeitenplan des Tages je Bereich.
 *
 * Eine Zeile je Bereich, Spalten je Mahlzeit mit ihrer Ausgabezeit, dazu
 * vegetarisch und vegan; Summenzeile, Anmarsch abgesetzt darunter mit der
 * Marke „nicht enthalten". Die Bestellkarte kommt mit S4.3.
 */

import type { Mahlzeitenplan, Planzeile } from "@s1/domaene";

import { mahlzeitText } from "./versorgungstext.js";

function Zeile({ zeile, plan, klasse }: { readonly zeile: Planzeile; readonly plan: Mahlzeitenplan; readonly klasse?: string }): React.JSX.Element {
  return (
    <tr className={klasse}>
      <th scope="row">
        {zeile.bereich}
        {klasse === "anmarschzeile" && <span className="marke-zustand warn">nicht enthalten</span>}
      </th>
      {plan.regel.map((r) => (
        <td key={r.mahlzeit} className="zahl">
          {zeile.jeMahlzeit[r.mahlzeit]}
        </td>
      ))}
      <td className="zahl trenner">{zeile.vegetarisch}</td>
      <td className="zahl">{zeile.vegan}</td>
    </tr>
  );
}

export function VersorgungVerpflegung({
  plan,
  regeltext,
}: {
  readonly plan: Mahlzeitenplan;
  readonly regeltext: string;
}): React.JSX.Element {
  return (
    <div className="karte versorgungskarte">
      <h3>
        Mahlzeitenplan <span className="leise">· {plan.zeilen.length} Bereiche · Ausgabezeiten aus der Mahlzeitenregel</span>
      </h3>
      {plan.zeilen.length === 0 ? (
        <p className="hinweistext">In den Einsatzbereichen ist noch keine Einheit erfasst.</p>
      ) : (
        <table className="versorgungstabelle" aria-label="Mahlzeitenplan">
          <thead>
            <tr>
              <th scope="col">Bereich</th>
              {plan.regel.map((r) => (
                <th key={r.mahlzeit} scope="col" className="zahl">
                  {mahlzeitText(r.mahlzeit)} {r.uhrzeit}
                </th>
              ))}
              <th scope="col" className="zahl trenner">Veg.</th>
              <th scope="col" className="zahl">Vegan</th>
            </tr>
          </thead>
          <tbody>
            {plan.zeilen.map((zeile) => (
              <Zeile key={zeile.abschnittId} zeile={zeile} plan={plan} />
            ))}
            <Zeile zeile={plan.summe} plan={plan} klasse="summenzeile" />
            {plan.anmarsch.koepfe > 0 && <Zeile zeile={plan.anmarsch} plan={plan} klasse="anmarschzeile" />}
          </tbody>
        </table>
      )}
      <p className="hinweistext">Mahlzeitenregel (Vorbelegung): {regeltext}.</p>
    </div>
  );
}
