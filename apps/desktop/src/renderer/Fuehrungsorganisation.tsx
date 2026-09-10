/**
 * Die Führungsorganisation als Harke (Entwurf „Oberfläche", Option 3a).
 *
 * **Gezeichnet aus dem Abschnittsbaum, kein zweiter Editor.** Wer die Struktur
 * ändert, ändert sie im Baum (M3.1); dieses Blatt zeigt sie so, wie sie an der
 * Wand hängt, und gibt sie als PDF aus (`fueorg`, M8.3).
 *
 * **Warum je Ebene ein Grid und keine Flex-Reihe.** Der Querbalken muss genau
 * über den Mittelpunkten der äußeren Kinder beginnen und enden. In einem Grid
 * aus `n` gleichen Spalten liegt der erste Mittelpunkt bei `100 %/2n`, der
 * letzte ebenso weit vom rechten Rand — der Balken bekommt genau diesen
 * Rand. Abzweigstummel und Zeichen sitzen in **derselben** Zelle und beide
 * zentriert, ohne `transform`: Zwei getrennte Reihen oder ein
 * `translateX(-50%)` führen zwangsläufig zu versetzten Achsen.
 */

import { useEffect, useState } from "react";

import type { Baumknoten } from "@s1/domaene";

import { Hilfemarke } from "./Hilfemarke.js";
import { useLaden } from "./laden.js";
import { Einrichtungszeichen, Fuehrungszeichen } from "./zeichen.js";
import { harkenbild, knotenbreite, kurzform, langform, stummel } from "./harke.js";

type Beschriftung = "kurz" | "lang";

export function Fuehrungsorganisation(): React.JSX.Element {
  const laden = useLaden();
  const [beschriftung, setzeBeschriftung] = useState<Beschriftung>("kurz");
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);

  const holeBaum = laden.holeBaum;
  const akteId = laden.akteId;
  useEffect(() => {
    if (akteId !== undefined) void holeBaum();
  }, [akteId, holeBaum]);

  const bild = harkenbild(laden.baum?.baum ?? []);

  function alsPdf(): void {
    setzeMeldung(undefined);
    void (async () => {
      const ergebnis = await laden.erzeugeAusgabe("fueorg", "pdf", undefined);
      if (ergebnis === undefined) return;
      setzeMeldung(`${ergebnis.pfad} (${String(ergebnis.bytes)} Bytes)`);
    })();
  }

  return (
    <section aria-label="Führungsorganisation" className="fueorg">
      <div className="fueorgkopf">
        <h2>
          Führungsorganisation <Hilfemarke kennung="abschnitte" />
        </h2>
        <span className="hinweistext">
          Gezeichnet aus dem Abschnittsbaum. Angelegt, umgehängt und aufgelöst wird dort.
        </span>
        <div className="spaltengruppen" role="group" aria-label="Beschriftung">
          <button type="button" aria-pressed={beschriftung === "kurz"} onClick={() => { setzeBeschriftung("kurz"); }}>
            Kurzform
          </button>
          <button type="button" aria-pressed={beschriftung === "lang"} onClick={() => { setzeBeschriftung("lang"); }}>
            Ausgeschrieben
          </button>
        </div>
        <button type="button" className="haupt" onClick={alsPdf}>
          Als PDF (Lagekarte)
        </button>
      </div>

      {meldung !== undefined && <p className="hinweistext">Geschrieben: {meldung}</p>}

      <div className="fueorgflaeche">
        <div className="harke">
          {bild.fuehrung.length === 0 ? (
            <p className="hinweistext">
              Noch keine Führungsstruktur: Der Baum trägt nur Einrichtungen oder ist leer.
            </p>
          ) : (
            <Ebene knoten={bild.fuehrung} tiefe={0} beschriftung={beschriftung} />
          )}
        </div>

        <aside className="einrichtungen" aria-label="Einrichtungen neben der Harke">
          <h3>Einrichtungen (neben der Harke)</h3>
          {bild.einrichtungen.length === 0 ? (
            <p className="hinweistext">Keine.</p>
          ) : (
            <ul>
              {bild.einrichtungen.map((knoten) => (
                <li key={knoten.id}>
                  <Einrichtungszeichen
                    text={kurzform(knoten.typ, 0).slice(0, 1)}
                    bedeutung={langform(knoten.typ, 0)}
                    breite={74}
                  />
                  <span className="name">{knoten.name}</span>
                  <span className="unterschrift">{unterschrift(knoten)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}

/** „14 Einh. · 8/21/64" — dieselbe Schreibweise wie im Baum. */
function unterschrift(knoten: Baumknoten): string {
  const { fuehrer, unterfuehrer, mannschaft } = knoten.summenStaerke;
  return `${String(knoten.einheitenSumme)} Einh. · ${String(fuehrer)}/${String(unterfuehrer)}/${String(mannschaft)}`;
}

interface EbeneEigenschaften {
  readonly knoten: readonly Baumknoten[];
  readonly tiefe: number;
  readonly beschriftung: Beschriftung;
}

/** Eine Ebene der Harke: n gleiche Spalten, darüber der Querbalken. */
function Ebene({ knoten, tiefe, beschriftung }: EbeneEigenschaften): React.JSX.Element {
  const spalten = knoten.length;
  return (
    <>
      {tiefe > 0 && (
        <>
          <div className="stamm" style={{ height: stummel(tiefe - 1) }} />
          {/* Der Balken spannt von Mitte zu Mitte der äußeren Zellen. */}
          <div className="quer" style={{ margin: `0 calc(100% / ${String(2 * spalten)})` }} />
        </>
      )}
      <div className="reihe" style={{ gridTemplateColumns: `repeat(${String(spalten)}, 1fr)` }}>
        {knoten.map((eintrag) => (
          <div className="zelle" key={eintrag.id}>
            {tiefe > 0 && <div className="stamm" style={{ height: stummel(tiefe - 1) }} />}
            <Knoten knoten={eintrag} tiefe={tiefe} beschriftung={beschriftung} />
          </div>
        ))}
      </div>
    </>
  );
}

/** Ein Knoten: Zeichen, Bildunterschrift und darunter seine Kinder. */
function Knoten({
  knoten,
  tiefe,
  beschriftung,
}: {
  readonly knoten: Baumknoten;
  readonly tiefe: number;
  readonly beschriftung: Beschriftung;
}): React.JSX.Element {
  const kurz = kurzform(knoten.typ, tiefe);
  const lang = langform(knoten.typ, tiefe);
  const kinder = knoten.kinder.filter((kind) => kind.typ !== "ARCHIV");

  return (
    <div className={knoten.aufgeloestNach === undefined ? "knoten" : "knoten aufgeloest"}>
      <Fuehrungszeichen
        text={kurz}
        bedeutung={lang}
        breite={knotenbreite(tiefe)}
      />
      <div className="unterschrift" style={{ maxWidth: knotenbreite(tiefe) }}>
        <span className="name">{knoten.name}</span>
        <span className="zahlen">{unterschrift(knoten)}</span>
        {/* Ausgeschrieben steht **unter** dem Zeichen und nicht darin: In die
            Flagge passt „Untereinsatzabschnittsleitung" nicht, und ein
            Zeichen mit gequetschter Schrift ist keines mehr. */}
        {beschriftung === "lang" && <span className="typ">{lang}</span>}
      </div>
      {kinder.length > 0 && (
        <Ebene knoten={kinder} tiefe={tiefe + 1} beschriftung={beschriftung} />
      )}
    </div>
  );
}
