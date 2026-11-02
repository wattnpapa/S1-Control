/**
 * Unteransicht „Bereiche · Schichten" (KONZEPT-S4.md §5.4): das
 * Logistikblatt am Bildschirm.
 *
 * Dieselbe Rechnung wie das Blatt „Log" auf Papier (`projektion.logistikblatt`),
 * ohne jede Änderung, mit Live-Aktualisierung über den Zeiger des Lagebilds.
 * Die Fußnote zu „Männl." steht auch hier, wörtlich aus der Ausgabe — sie
 * kommt mit der Ansicht aus dem Worker, der `@s1/ausgaben` kennt.
 */

import { projektion, type Logistikblatt, type Logistikzeile } from "@s1/domaene";

const SCHICHT_KOPF: Readonly<Record<string, string>> = { FRUEH: "Früh", SPAET: "Spät", TAG: "Tag", NACHT: "Nacht" };

function Zeile({ zeile, klasse }: { readonly zeile: Logistikzeile; readonly klasse?: string }): React.JSX.Element {
  return (
    <tr className={klasse}>
      <th scope="row">{zeile.name}</th>
      {projektion.LOG_SCHICHTEN.map((s) => (
        <td key={s} className="zahl">
          {zeile.jeSchicht[s] ?? 0}
        </td>
      ))}
      <td className="zahl trenner">{zeile.gesamt}</td>
      <td className="zahl trenner">{zeile.maennlich}</td>
      <td className="zahl">{zeile.weiblich}</td>
      <td className="zahl">{zeile.divers}</td>
      <td className="zahl trenner">{zeile.vegetarisch}</td>
      <td className="zahl">{zeile.vegan}</td>
      <td className="zahl trenner">{zeile.uebernachtung.m}</td>
      <td className="zahl">{zeile.uebernachtung.w}</td>
      <td className="zahl">{zeile.uebernachtung.d}</td>
    </tr>
  );
}

export function VersorgungBereiche({
  blatt,
  fussnote,
}: {
  readonly blatt: Logistikblatt;
  readonly fussnote: string;
}): React.JSX.Element {
  return (
    <div className="karte versorgungskarte">
      <h3>
        Bereiche · Schichten <span className="leise">· Logistikblatt, live</span>
      </h3>
      <div className="tabellenrahmen">
        <table className="versorgungstabelle" aria-label="Logistikblatt">
          <thead>
            <tr>
              <th scope="col">Bereich</th>
              {projektion.LOG_SCHICHTEN.map((s) => (
                <th key={s} scope="col" className="zahl">
                  {SCHICHT_KOPF[s]}
                </th>
              ))}
              <th scope="col" className="zahl trenner">Summe</th>
              <th scope="col" className="zahl trenner" title={projektion.LOG_MAENNLICH}>
                Männl.*
              </th>
              <th scope="col" className="zahl">Weibl.</th>
              <th scope="col" className="zahl">Div.</th>
              <th scope="col" className="zahl trenner">Veg.</th>
              <th scope="col" className="zahl">Vegan</th>
              <th scope="col" className="zahl trenner">ÜN m</th>
              <th scope="col" className="zahl">ÜN w</th>
              <th scope="col" className="zahl">ÜN d</th>
            </tr>
          </thead>
          <tbody>
            {blatt.zeilen.map((zeile) => (
              <Zeile key={zeile.abschnittId} zeile={zeile} />
            ))}
            <Zeile zeile={blatt.gesamt} klasse="summenzeile" />
            <Zeile zeile={blatt.angefordert} klasse="anmarschzeile" />
          </tbody>
        </table>
      </div>
      <p className="hinweistext">* {fussnote}</p>
    </div>
  );
}
