/**
 * Die Karte „Arbeitsplätze der Fernmeldezentrale“ in der Sicht des LdF
 * (Stab-Review LdF-A1): je Platz besetzt von wem, zuletzt gesehen, offene
 * Zuteilungen mit der ältesten Wartezeit und die Rufgruppen, die er abhört.
 * Daraus entscheidet der LdF, wem er zuteilt und wo er umverteilt, wenn ein
 * Platz ausfällt. Die Zahlen kommen fertig aus `projektion.fmzPlaetze`.
 */

import type { Fmzplatz } from "@s1/domaene";

import { warteminuten } from "./Ruecklaufkarte.js";

function besetztText(platz: Fmzplatz, jetzt: string | undefined): string {
  if (platz.besetzt.length === 0) return "";
  return platz.besetzt
    .map((b) => {
      const vor = warteminuten(b.zuletzt, jetzt);
      const hz = b.handzeichen === undefined ? "" : ` (${b.handzeichen})`;
      return `${b.anzeigename}${hz}${vor === undefined || vor < 2 ? "" : ` · zuletzt vor ${String(vor)} min`}`;
    })
    .join(", ");
}

export function Fmzplaetzekarte({ plaetze, jetzt }: { plaetze: readonly Fmzplatz[]; jetzt: string | undefined }): React.JSX.Element {
  return (
    <section aria-label="Arbeitsplätze der Fernmeldezentrale" className="karte fmzplaetze">
      <h3>Arbeitsplätze der Fernmeldezentrale</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Platz</th>
            <th scope="col">Besetzt</th>
            <th scope="col">Zugeteilt</th>
            <th scope="col">Rufgruppen (hört)</th>
          </tr>
        </thead>
        <tbody>
          {plaetze.map((platz) => {
            const besetzt = besetztText(platz, jetzt);
            const wartet = warteminuten(platz.aeltesteSeit, jetzt);
            return (
              <tr key={platz.stelle}>
                <th scope="row">{platz.name}</th>
                <td>{besetzt === "" ? <span className="marke-zustand warn">nicht besetzt</span> : besetzt}</td>
                <td>
                  {platz.zugeteilt === 0
                    ? "–"
                    : `${String(platz.zugeteilt)} offen, ${String(platz.angenommen)} angenommen${wartet === undefined ? "" : ` · älteste ${String(wartet)} min`}`}
                  {platz.zugeteilt > 0 && besetzt === "" && <span className="marke-zustand fehler"> niemand da</span>}
                </td>
                <td>{platz.rufgruppen.length === 0 ? "–" : platz.rufgruppen.join(", ")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="hinweistext">„Rufgruppen“ liest das Feld „hört“ im Funkplan: Ein Platz hört eine Gruppe, wenn sein Name dort steht (etwa „Fm1“).</p>
    </section>
  );
}
