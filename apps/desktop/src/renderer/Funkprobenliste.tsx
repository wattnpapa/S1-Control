/**
 * Die Sicht „Funkproben" des Blattes „Funkplan" (KONZEPT-FUNKPLAN.md §5,
 * Option 5b): die Funkproben als Zeitfolge, jüngste zuerst, mit Einheit,
 * Rufgruppe, Ergebnis, Grund und wer sie eingetragen hat.
 *
 * Die Folge rechnet Ring 2 aus dem Ereignisstrom (`projektion.funkprobenfolge`)
 * und schneidet der Worker mit der Suche zu; hier wird nur gezeigt. Eine
 * zurückgenommene Probe bleibt blass stehen, wie im Tagebuch: Sie ist
 * geschehen und wurde zurückgenommen, beides gehört in die Spur.
 */

import { projektion, zeitpunktText, type Funkprobenzeile } from "@s1/domaene";

const SPALTEN = ["Funkzeit", "Einheit", "Rufgruppe", "Ergebnis", "Grund", "Eingetragen von"] as const;

function Ergebnis({ z }: { readonly z: Funkprobenzeile }): React.JSX.Element {
  return z.ergebnis === "KONTAKT" ? <span className="marke-zustand ok">Kontakt</span> : <span className="marke-zustand warn">kein Kontakt</span>;
}

function Zeile({ z }: { readonly z: Funkprobenzeile }): React.JSX.Element {
  return (
    <tr className={z.zurueckgenommen ? "blass" : undefined}>
      <td className="mono" title={zeitpunktText(z.zeitpunkt)}>
        {projektion.uhrzeitKurz(z.zeitpunkt)}
      </td>
      <th scope="row">
        {z.einheit}
        {z.zurueckgenommen && <span className="leise"> (zurückgenommen)</span>}
      </th>
      <td className="mono">{z.rufgruppe ?? <span className="leise">—</span>}</td>
      <td>
        <Ergebnis z={z} />
      </td>
      <td className="leise">{z.grund ?? "—"}</td>
      <td className="leise">{z.akteur}</td>
    </tr>
  );
}

export function Funkprobenliste({ funkproben }: { readonly funkproben: readonly Funkprobenzeile[] }): React.JSX.Element {
  const ohne = funkproben.filter((z) => z.ergebnis === "KEIN_KONTAKT" && !z.zurueckgenommen).length;
  return (
    <section className="karte funkkarte zuordnungskarte" aria-label="Funkproben">
      <h3>
        Funkproben <span className="leise">· {funkproben.length} · jüngste zuerst{ohne > 0 ? ` · ${String(ohne)} ohne Kontakt` : ""}</span>
      </h3>
      {funkproben.length === 0 ? (
        <p className="hinweistext">Noch keine Funkprobe eingetragen. Einheit in „Je Rufgruppe“ markieren, dann „Funkprobe eintragen“ (Strg+P).</p>
      ) : (
        <div className="tabellenrahmen">
          <table className="funktabelle funkproben" aria-label="Funkproben als Zeitfolge">
            <thead>
              <tr>
                {SPALTEN.map((s) => (
                  <th key={s} scope="col">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funkproben.map((z) => (
                <Zeile key={z.ereignisId} z={z} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hinweistext">
        Die jüngsten {projektion.FUNKPROBEN_GRENZE} Proben nach Funkzeit. Eine Probe „kein Kontakt“ setzt den letzten Kontakt nicht zurück; sie steht in
        der Zuordnung daneben, bis wieder Kontakt war.
      </p>
    </section>
  );
}
