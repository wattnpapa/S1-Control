/**
 * „Einsatzzeiten und Ablösung“ im Blatt Übersicht (Stab-Review S1 FA-S1-2,
 * FA-S1-5, LtrFüSt F3, Fachberater FW FW-A1).
 *
 * Oben die Einheiten vor Ort: wer zuerst gehen muss, steht oben. Die Dauer
 * im Einsatz und die Marke an „verfügbar bis“ rechnet die gemeinsame
 * Minutenuhr, wie an der Einheitentabelle (K18). Darunter, was kommt:
 * angefordert, zugesagt, im Anmarsch.
 */

import { projektion, zeitpunktText, type Bewegung, type Einsatzzeitzeile } from "@s1/domaene";

import { useMinutenuhr } from "./Ressourcenmarken.js";

/** „5 h 20 min“ seit der Eintreffzeit; leer ohne Eintreffzeit oder in der Zukunft. */
export function dauerText(seit: string | undefined, jetzt: string): string {
  if (seit === undefined) return "";
  const minuten = Math.floor((Date.parse(jetzt) - Date.parse(seit)) / 60_000);
  if (Number.isNaN(minuten) || minuten < 0) return "";
  const stunden = Math.floor(minuten / 60);
  return stunden === 0 ? `${String(minuten)} min` : `${String(stunden)} h ${String(minuten % 60)} min`;
}

const ART: Readonly<Record<Bewegung["art"], string>> = {
  angefordert: "angefordert",
  zugesagt: "zugesagt",
  anmarsch: "im Anmarsch",
  verfuegbarBis: "verfügbar bis",
};

export function Einsatzzeitentabelle({ zeilen, kommen }: { zeilen: readonly Einsatzzeitzeile[]; kommen: readonly Bewegung[] }): React.JSX.Element {
  const jetzt = useMinutenuhr();
  return (
    <section aria-label="Einsatzzeiten und Ablösung" className="karte">
      <h3>Einsatzzeiten und Ablösung</h3>
      <p className="hinweistext">Einheiten vor Ort; wer zuerst gehen muss, steht oben.</p>
      {zeilen.length === 0 ? (
        <p>Noch keine Kräfte vor Ort.</p>
      ) : (
        <div className="tabellenrahmen">
          <table>
            <thead>
              <tr>
                <th scope="col">Einheit</th>
                <th scope="col">Abschnitt</th>
                <th scope="col">Status</th>
                <th scope="col">Eingetroffen</th>
                <th scope="col">Im Einsatz</th>
                <th scope="col">Verfügbar bis</th>
                <th scope="col">Ablösung</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((zeile) => (
                <Zeitzeile key={zeile.einheitId} zeile={zeile} jetzt={jetzt} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Kommende kommen={kommen} />
    </section>
  );
}

function Zeitzeile({ zeile, jetzt }: { zeile: Einsatzzeitzeile; jetzt: string }): React.JSX.Element {
  const frist = projektion.verfuegbarkeitsmarke(zeile.verfuegbarBis, jetzt);
  const dauer = dauerText(zeile.eingetroffenAm, jetzt);
  return (
    <tr>
      <th scope="row">{zeile.einheit}</th>
      <td>{zeile.abschnitt || "–"}</td>
      <td>{zeile.status || "–"}</td>
      <td>{zeitpunktText(zeile.eingetroffenAm) || "–"}</td>
      <td className="zahl">{dauer || "–"}</td>
      <td>
        {zeitpunktText(zeile.verfuegbarBis) || "–"}
        {frist !== undefined && <span className={`marke-zustand ${frist.ton}`}> {frist.text}</span>}
      </td>
      <td>
        {zeile.abloesung === undefined ? (
          "–"
        ) : (
          <>
            <span className={`marke-zustand ${zeile.abloesung.marke.ton}`}>{zeile.abloesung.marke.text}</span>
            {zeile.abloesung.durch !== "" && ` · ${zeile.abloesung.durch}`}
            {zeile.abloesung.zugesagtFuer !== "" && ` · für ${zeile.abloesung.zugesagtFuer}`}
          </>
        )}
      </td>
    </tr>
  );
}

function Kommende({ kommen }: { kommen: readonly Bewegung[] }): React.JSX.Element {
  if (kommen.length === 0) return <p className="hinweistext">Es ist nichts angefordert und niemand im Anmarsch.</p>;
  return (
    <>
      <h4>Es kommen</h4>
      <ul className="kommenliste">
        {kommen.map((b) => (
          <li key={b.schluessel}>
            <span className="marke-zustand ruhe">{ART[b.art]}</span> {b.name}
            {b.zeitpunkt !== undefined && b.art === "zugesagt" && ` · für ${zeitpunktText(b.zeitpunkt)}`}
            {b.zusatz !== undefined && <span className="hinweistext"> · {b.zusatz}</span>}
          </li>
        ))}
      </ul>
    </>
  );
}
