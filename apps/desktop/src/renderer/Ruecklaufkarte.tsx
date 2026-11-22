/**
 * Die Karte „Rücklauf“ in der Sicht „Sichter“, Umschalter „gesichtet“ (Stab-Review 2026-11-22,
 * Sichter): je Stelle, was grün verteilt und noch nicht erledigt ist.
 *
 * Nach dem Sichten sagte die Liste nur noch „verteilt“. Ein Blitz lag 20
 * Minuten ungelesen bei S3. Hier sieht der Sichter, wo eine Kopie liegen
 * bleibt, mit Wartezeit seit der Sichtung, das Dringendste zuerst. Die Zahlen
 * kommen aus `projektion.ruecklauf` über die ganze Nachweisung.
 */

import type { Ruecklaufkopie, Ruecklaufzeile } from "@s1/domaene";

import { stellenname, vorrangwort } from "./nachrichtenformate.js";

/** Höchstens so viele Nachrichten je Stelle; der Rest steht als Zahl. */
const JE_STELLE = 3;

export function warteminuten(seit: string | undefined, jetzt: string | undefined): number | undefined {
  if (seit === undefined || jetzt === undefined) return undefined;
  const minuten = Math.floor((Date.parse(jetzt) - Date.parse(seit)) / 60_000);
  return Number.isNaN(minuten) || minuten < 0 ? undefined : minuten;
}

interface RuecklaufkarteEigenschaften {
  readonly zeilen: readonly Ruecklaufzeile[];
  readonly jetzt: string | undefined;
  readonly aufWahl: (nachrichtId: string) => void;
}

export function Ruecklaufkarte({ zeilen, jetzt, aufWahl }: RuecklaufkarteEigenschaften): React.JSX.Element {
  return (
    <section aria-label="Rücklauf" className="karte ruecklauf">
      <h3>Rücklauf</h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Jede grüne Kopie ist erledigt.</p>
      ) : (
        <>
          <p className="hinweistext">Grün verteilt und noch nicht erledigt, je Stelle; das Dringendste zuerst.</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Stelle</th>
                <th scope="col">offen</th>
                <th scope="col">ungelesen</th>
                <th scope="col">Nachrichten</th>
              </tr>
            </thead>
            <tbody>
              {zeilen.map((zeile) => (
                <tr key={zeile.stelle}>
                  <th scope="row">{stellenname(zeile.stelle)}</th>
                  <td className="zahl">{zeile.kopien.length}</td>
                  <td className="zahl">{zeile.ungelesen === 0 ? "–" : <span className="marke-zustand warn">{zeile.ungelesen}</span>}</td>
                  <td>
                    {zeile.kopien.slice(0, JE_STELLE).map((kopie) => (
                      <Kopie key={kopie.nachrichtId} kopie={kopie} jetzt={jetzt} aufWahl={aufWahl} />
                    ))}
                    {zeile.kopien.length > JE_STELLE && <span className="hinweistext"> und {zeile.kopien.length - JE_STELLE} weitere</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function Kopie({ kopie, jetzt, aufWahl }: { kopie: Ruecklaufkopie; jetzt: string | undefined; aufWahl: (id: string) => void }): React.JSX.Element {
  const vorrang = vorrangwort(kopie);
  const minuten = warteminuten(kopie.seit, jetzt);
  return (
    <button type="button" className="ruecklaufkopie" onClick={() => aufWahl(kopie.nachrichtId)}>
      {vorrang !== "" && <span className={`marke-zustand ${kopie.vorrangstufe === 0 ? "fehler" : "warn"}`}>{vorrang}</span>} {kopie.kennzeichen} {kopie.betreff}
      {minuten !== undefined && ` · ${String(minuten)} min`}
      {!kopie.gelesen && " · ungelesen"}
    </button>
  );
}
