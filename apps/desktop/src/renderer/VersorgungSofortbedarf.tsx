/**
 * Unteransicht „Sofortbedarf" (4f): die Erstmeldungen aus dem Bogen.
 *
 * Eingetroffen um, Verpflegung für n Personen, Diesel, Benzin, Gemisch,
 * Unterbringung und Ruhezeit, mit Summenzeile für die Liter. In S4.1 nur
 * lesend; „Als erledigt melden" je Feld kommt mit S4.4.
 */

import type { Sofortbedarfsliste } from "@s1/domaene";

import { kurzzeit } from "./versorgungstext.js";

function janein(wert: boolean): React.JSX.Element {
  return <span className={wert ? "marke-zustand warn" : "marke-zustand"}>{wert ? "ja" : "nein"}</span>;
}

export function VersorgungSofortbedarf({ liste }: { readonly liste: Sofortbedarfsliste }): React.JSX.Element {
  return (
    <div className="karte versorgungskarte">
      <h3>
        Sofortbedarf aus dem Erfassungsbogen <span className="leise">· {liste.zeilen.length} Einheiten mit Meldung</span>
      </h3>
      {liste.zeilen.length === 0 ? (
        <p className="hinweistext">Kein Bogen mit Sofortbedarf übernommen.</p>
      ) : (
        <table className="versorgungstabelle" aria-label="Sofortbedarf">
          <thead>
            <tr>
              <th scope="col">Einheit</th>
              <th scope="col">Bereich</th>
              <th scope="col" className="zahl">Eingetroffen</th>
              <th scope="col" className="zahl trenner">Verpfl. Pers.</th>
              <th scope="col" className="zahl trenner">Diesel l</th>
              <th scope="col" className="zahl">Benzin l</th>
              <th scope="col" className="zahl">Gemisch l</th>
              <th scope="col" className="trenner">Unterbringung</th>
              <th scope="col">Ruhezeit</th>
              <th scope="col" className="trenner">Stand Bogen</th>
            </tr>
          </thead>
          <tbody>
            {liste.zeilen.map((z) => (
              <tr key={z.einheitId}>
                <th scope="row">{z.einheit}</th>
                <td>{z.bereich}</td>
                <td className="zahl">{z.eingetroffenAm === undefined ? "—" : kurzzeit(z.eingetroffenAm)}</td>
                <td className="zahl trenner">{z.verpflegungPersonen}</td>
                <td className="zahl trenner">{z.dieselLiter}</td>
                <td className="zahl">{z.benzinLiter}</td>
                <td className="zahl">{z.gemischLiter}</td>
                <td className="trenner">{janein(z.unterbringung)}</td>
                <td>{janein(z.ruhezeit)}</td>
                <td className="trenner zahl">{z.stand === undefined ? "—" : kurzzeit(z.stand)}</td>
              </tr>
            ))}
            <tr className="summenzeile">
              <th scope="row" colSpan={3}>
                Summe
              </th>
              <td className="zahl trenner">{liste.summe.verpflegungPersonen}</td>
              <td className="zahl trenner">{liste.summe.dieselLiter}</td>
              <td className="zahl">{liste.summe.benzinLiter}</td>
              <td className="zahl">{liste.summe.gemischLiter}</td>
              <td className="trenner">{liste.summe.unterbringung} ja</td>
              <td>{liste.summe.ruhezeit} ja</td>
              <td className="trenner" />
            </tr>
          </tbody>
        </table>
      )}
      <p className="hinweistext">
        Der Sofortbedarf ist die Erstmeldung beim Eintreffen (Bogen), kein laufender Verbrauch. Die Abarbeitung je Feld
        folgt mit Schnitt S4.4.
      </p>
    </div>
  );
}
