/**
 * Unteransicht „Verpflegung" (4d): der Mahlzeitenplan des Tages je Bereich
 * und rechts die Bestellung der nächsten Mahlzeit.
 *
 * Eine Zeile je Bereich, Spalten je Mahlzeit mit ihrer Ausgabezeit, dazu
 * vegetarisch, vegan und die Ausgabestelle (Doppelklick wählt, Enter
 * schreibt, Esc verwirft; ohne Wahl gilt die Vorbelegung LOGISTIK).
 * Summenzeile, Anmarsch abgesetzt darunter mit „nicht enthalten".
 */

import { useState } from "react";

import type { Ausgabestellenzeile, Mahlzeitenplan, Planzeile, Versorgungsblatt } from "@s1/domaene";

import { Bestellkarte } from "./Bestellkarte.js";
import { useLaden } from "./laden.js";
import { useNurLesen } from "./Nurlesen.js";
import { mahlzeitText } from "./versorgungstext.js";
import { abschnittAusgabestelle } from "../kontrakt/versorgungsschritte.js";

function Ausgabestellenzelle({ zeile, stellen }: { readonly zeile: Planzeile; readonly stellen: readonly Ausgabestellenzeile[] }): React.JSX.Element {
  const nurLesen = useNurLesen();
  const bediene = useLaden((z) => z.bediene);
  const [offen, setzeOffen] = useState(false);
  const gesetzt = zeile.ausgabestelle?.vorbelegt === false ? zeile.ausgabestelle.id : undefined;
  const [wahl, setzeWahl] = useState(gesetzt ?? "");
  const text = zeile.ausgabestelle === undefined ? "—" : `${zeile.ausgabestelle.name}${zeile.ausgabestelle.vorbelegt ? " (Vorbelegung)" : ""}`;
  if (!offen || nurLesen) {
    return (
      <td
        className="bearbeitbar trenner"
        tabIndex={nurLesen ? undefined : 0}
        title={nurLesen ? undefined : "Doppelklick oder Enter: Ausgabestelle wählen"}
        onDoubleClick={() => setzeOffen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setzeOffen(true);
        }}
      >
        {text}
      </td>
    );
  }
  const schreibe = (): void => {
    setzeOffen(false);
    if (wahl === (gesetzt ?? "")) return;
    void bediene(abschnittAusgabestelle(zeile.abschnittId, gesetzt ?? null, wahl === "" ? null : wahl));
  };
  return (
    <td className="bearbeitbar offen trenner">
      <select
        aria-label={`Ausgabestelle für ${zeile.bereich}`}
        autoFocus
        value={wahl}
        onChange={(e) => setzeWahl(e.target.value)}
        onBlur={() => setzeOffen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            schreibe();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setzeOffen(false);
          }
        }}
      >
        <option value="">— Vorbelegung —</option>
        {stellen.map((a) => (
          <option key={a.ausgabestelleId} value={a.ausgabestelleId}>
            {a.name}
          </option>
        ))}
      </select>
    </td>
  );
}

function Zeile(props: {
  readonly zeile: Planzeile;
  readonly plan: Mahlzeitenplan;
  readonly stellen?: readonly Ausgabestellenzeile[];
  readonly klasse?: string;
}): React.JSX.Element {
  const { zeile, plan, klasse } = props;
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
      {props.stellen === undefined ? <td className="trenner" /> : <Ausgabestellenzelle zeile={zeile} stellen={props.stellen} />}
    </tr>
  );
}

export function VersorgungVerpflegung({ blatt, jetzt }: { readonly blatt: Versorgungsblatt; readonly jetzt: number }): React.JSX.Element {
  const plan = blatt.plan;
  return (
    <div className="verpflegungsflaeche">
      <section className="karte versorgungskarte" aria-label="Mahlzeitenplan">
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
                <th scope="col" className="trenner">Ausgabestelle</th>
              </tr>
            </thead>
            <tbody>
              {plan.zeilen.map((zeile) => (
                <Zeile key={zeile.abschnittId} zeile={zeile} plan={plan} stellen={blatt.ausgabestellen} />
              ))}
              <Zeile zeile={plan.summe} plan={plan} klasse="summenzeile" />
              {plan.anmarsch.koepfe > 0 && <Zeile zeile={plan.anmarsch} plan={plan} klasse="anmarschzeile" />}
            </tbody>
          </table>
        )}
        <p className="hinweistext">
          Mahlzeitenregel{blatt.regelVorbelegung ? " (Vorbelegung)" : ""}: {blatt.regeltext}. Doppelklick auf die
          Ausgabestelle wählt sie, Enter schreibt, Esc verwirft. Weitere Kostformen kennt der Bogen nicht (Entscheidung 3).
        </p>
      </section>
      <Bestellkarte blatt={blatt} jetzt={jetzt} />
    </div>
  );
}
