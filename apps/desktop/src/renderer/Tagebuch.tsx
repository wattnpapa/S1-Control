/**
 * Die Einsatztagebuch-Ansicht (M3.3).
 *
 * §5.9.1 legt fest, was sie zeigt: **jedes** fachliche Ereignis, mit Akteur,
 * Rechner, Zeit und einem lesbaren Satz aus `vorher`/`neu`. Nicht die
 * getippten Einträge allein — die sind der Zusatz, nicht die Quelle.
 *
 * **Sie zeigt einen Ausschnitt und filtert im Worker.** Ein Einsatz führt bis
 * zu 50.000 Ereignisse (§2.6); die Ansicht holt hundert Zeilen und nennt
 * darunter, wie viele der Filter trifft. Die Sätze entstehen dabei erst beim
 * Ruf, mit den Namen, die **jetzt** gelten — ein Tagebuch, das den Namen von
 * damals zeigte, hinge davon ab, wann dieser Arbeitsplatz die Zeile gebaut
 * hat.
 *
 * **Zwei Zeiten, und sie werden nicht vermischt** (§2.6): Die Spalte „Zeit"
 * zeigt die Wanduhr des schreibenden Rechners; wo eine Art eine fachliche
 * Zeit trägt (§2.5), steht sie daneben. Geordnet wird nach keiner von beiden,
 * sondern nach HLC — das entscheidet der Worker.
 */

import { useEffect, useRef, useState } from "react";

import type { Tagebuchzeile } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { Hilfemarke } from "./Hilfemarke.js";
import { TagebuchEintrag } from "./TagebuchEintrag.js";

export interface TagebuchEigenschaften {
  /** Filter „nur diese Einheit“ — kommt aus der Auswahl in der Tabelle. */
  readonly einheitId: string | undefined;
  readonly abschnittId: string | undefined;
}

export function Tagebuch({ einheitId, abschnittId }: TagebuchEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [suche, setzeSuche] = useState("");
  const [nurRuecknahmen, setzeNurRuecknahmen] = useState(false);
  // Standard „Alle“: Wer das Tagebuch aufschlägt, soll das ganze Tagebuch sehen,
  // nicht unbemerkt einen Ausschnitt (zwei statt elf Einträge).
  const [aufBezug, setzeAufBezug] = useState(false);
  const [eintragOffen, setzeEintragOffen] = useState(false);
  const gesamtOhneFilter = useRef<number | undefined>(undefined);

  const setzeTagebuchfilter = laden.setzeTagebuchfilter;
  const akteId = laden.akteId;
  useEffect(() => {
    if (akteId === undefined) return;
    void setzeTagebuchfilter({
      ...(aufBezug && einheitId !== undefined ? { einheitId } : {}),
      ...(aufBezug && einheitId === undefined && abschnittId !== undefined ? { abschnittId } : {}),
      ...(suche === "" ? {} : { suche }),
      ...(nurRuecknahmen ? { nurRuecknahmen: true } : {}),
    });
  }, [akteId, einheitId, abschnittId, suche, nurRuecknahmen, aufBezug, setzeTagebuchfilter]);

  const zeilen = laden.tagebuch?.zeilen ?? [];
  const gesamtzahl = laden.tagebuch?.gesamtzahl ?? 0;
  const bezugGewaehlt = einheitId !== undefined || abschnittId !== undefined;
  const filter = [
    ...(aufBezug && bezugGewaehlt ? ["Auswahl"] : []),
    ...(suche.trim() === "" ? [] : [`Suche „${suche.trim()}“`]),
    ...(nurRuecknahmen ? ["nur Rücknahmen und Berichtigungen"] : []),
  ];
  if (filter.length === 0 && laden.tagebuch !== undefined) gesamtOhneFilter.current = gesamtzahl;
  const fusszeile = tagebuchfusszeile(zeilen.length, gesamtzahl, filter, gesamtOhneFilter.current);
  const alleAnzeigen = (): void => {
    setzeSuche("");
    setzeNurRuecknahmen(false);
    setzeAufBezug(false);
  };

  return (
    <section aria-label="Einsatztagebuch" className="tagebuch">
      <div className="tagebuchkopf">
        <h2>Einsatztagebuch <Hilfemarke kennung="tagebuch" /></h2>
        <label className="suchfeld">
          Suche
          <input
            value={suche}
            onChange={(e) => {
              setzeSuche(e.target.value);
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setzeEintragOffen(true);
          }}
        >
          Eintrag hinzufügen
        </button>
        <label className="schalter">
          <input
            type="checkbox"
            checked={aufBezug}
            onChange={(e) => {
              setzeAufBezug(e.target.checked);
            }}
          />
          Auf die Auswahl beschränken
        </label>
        <label className="schalter">
          <input
            type="checkbox"
            checked={nurRuecknahmen}
            onChange={(e) => {
              setzeNurRuecknahmen(e.target.checked);
            }}
          />
          Nur Rücknahmen und Berichtigungen
        </label>
      </div>

      <div className="tabellenrahmen">
        <table>
          <thead>
            <tr>
              <th scope="col" title="Wann der Eintrag am Rechner geschrieben wurde">Erfasst</th>
              <th scope="col" title="Fachliche Zeit: wann es geschah (z. B. die Funkzeit)">Zeit der Meldung</th>
              <th scope="col">Vorgang</th>
              <th scope="col">Akteur</th>
              <th scope="col">Rechner</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <Tagebuchreihe key={zeile.ereignisId} zeile={zeile} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="tabellenfuss">
        {fusszeile}
        {filter.length > 0 && (
          <>
            {" "}
            <button type="button" onClick={alleAnzeigen}>
              Alle anzeigen
            </button>
          </>
        )}
      </p>

      {eintragOffen && (
        <TagebuchEintrag
          aufSchliessen={() => {
            setzeEintragOffen(false);
          }}
        />
      )}
    </section>
  );
}

/** Eine Zeile des Tagebuchs; Rücknahmen und Berichtigungen sind gekennzeichnet. */
function Tagebuchreihe({ zeile }: { readonly zeile: Tagebuchzeile }): React.JSX.Element {
  return (
    <tr
      className={
        zeile.undoOf !== undefined
          ? "ruecknahme"
          : zeile.korrekturVon !== undefined
            ? "berichtigung"
            : ""
      }
    >
      <td title={`HLC ${zeile.hlcText}`}>{uhrzeit(zeile.wanduhr)}</td>
      <td>{zeile.zeitpunkt === undefined ? "" : uhrzeit(zeile.zeitpunkt)}</td>
      <td className="satz">
        {zeile.satz}
        {zeile.grund === undefined ? "" : ` — Grund: ${zeile.grund}`}
        {/* §6 U1: Eine Kompensation ist ein gewöhnliches Ereignis.
            Sie ist trotzdem gekennzeichnet, weil im Tagebuch beide
            Zeilen stehen bleiben (U4) und sonst niemand erkennt,
            welche die andere zurücknimmt. */}
        {zeile.undoOf !== undefined && (
          <span className="marke" title={`nimmt ${zeile.undoOf} zurück`}>
            {" "}
            Rücknahme
          </span>
        )}
        {zeile.korrekturVon !== undefined && (
          <span className="marke" title={`berichtigt ${zeile.korrekturVon}`}>
            {" "}
            Berichtigung
          </span>
        )}
      </td>
      <td>{zeile.akteur}</td>
      <td>{zeile.rechner}</td>
    </tr>
  );
}

/**
 * Die Zeile unter der Liste: wie viele Einträge zu sehen sind und, wenn ein
 * Filter wirkt, welcher — damit niemand einen Ausschnitt für das ganze
 * Tagebuch hält.
 */
export function tagebuchfusszeile(
  gezeigt: number,
  treffer: number,
  filter: readonly string[],
  insgesamt: number | undefined,
): string {
  // Die Liste zeigt höchstens einen Ausschnitt der Treffer (die neuesten).
  const ausschnitt = gezeigt < treffer ? `, die neuesten ${String(gezeigt)} stehen in der Liste` : "";
  if (filter.length === 0) {
    return gezeigt < treffer ? `${String(gezeigt)} von ${String(treffer)} Einträgen` : `${String(treffer)} Einträge`;
  }
  const zaehlung =
    insgesamt !== undefined && insgesamt > treffer
      ? `${String(treffer)} von ${String(insgesamt)} Einträgen`
      : `${String(treffer)} Einträge`;
  const leer = treffer === 0 ? " — für diesen Filter gibt es keinen Eintrag" : "";
  return `${zaehlung} (Filter: ${filter.join(", ")})${ausschnitt}${leer}`;
}

/**
 * „10.09. 14:30:07" — Datum und Uhrzeit, wie sie in einem Tagebuch stehen.
 *
 * Ohne Jahr und ohne Zeitzone: Ein Einsatz dauert Stunden bis Tage, und
 * das Jahr in jeder der 50.000 Zeilen wäre Rauschen. Die Zeitzone ist die
 * des Fensters — die Wanduhr ist ohnehin nur Anzeige und nie Ordnung (§2.6).
 * Ein unlesbarer Zeitpunkt wird als solcher gezeigt und nicht geraten.
 */
export function uhrzeit(zeitpunkt: string): string {
  const wert = Date.parse(zeitpunkt);
  if (Number.isNaN(wert)) return "unbekannt";
  const datum = new Date(wert);
  const zwei = (zahl: number): string => String(zahl).padStart(2, "0");
  return `${zwei(datum.getDate())}.${zwei(datum.getMonth() + 1)}. ${zwei(datum.getHours())}:${zwei(datum.getMinutes())}:${zwei(datum.getSeconds())}`;
}
