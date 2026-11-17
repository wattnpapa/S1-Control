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
 *
 * **Nachricht und Tagebuch hängen über die Kennung zusammen** (ETB P0-1):
 * „Im Tagebuch zeigen" an einer Nachricht filtert nach `nachrichtId` statt
 * nach dem Betreff, und eine Zeile mit Nachricht trägt „Nachricht öffnen".
 * Den gefilterten Ausschnitt holt diese Ansicht selbst (`tagebuchAnfordern`
 * mit `nachrichtId`), bei jedem neuen Zeigerstand; der allgemeine Filter des
 * Blattes bleibt davon unberührt.
 */

import { useEffect, useRef, useState } from "react";

import { datumText, projektion, uhrzeitText, type Tagebuchzeile } from "@s1/domaene";

import type { Tagebuchansicht } from "../kontrakt/index.js";
import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";
import { useNachrichtOeffnen } from "./Nachrichtenhinweise.js";
import { TagebuchEintrag } from "./TagebuchEintrag.js";

export interface TagebuchEigenschaften {
  /** Filter „nur diese Einheit“ — kommt aus der Auswahl in der Tabelle. */
  readonly einheitId: string | undefined;
  /** Beginnt auf die Auswahl beschränkt — so öffnet „Im Tagebuch zeigen“ das Blatt. */
  readonly aufAuswahl?: boolean;
  readonly abschnittId: string | undefined;
}

/**
 * Eine Suche, mit der das Tagebuch beim nächsten Aufschlagen beginnt — für
 * „Im Tagebuch zeigen" an einer Nachricht (KONZEPT-NACHRICHTEN.md §9): Die
 * Tagebuchzeile trägt Nummer, Absender und Betreff der Nachricht. Einmalig;
 * das Aufschlagen verbraucht sie.
 */
let anfangssuche = "";

export function tagebuchMitSuche(text: string): void {
  anfangssuche = text.trim();
}

function nimmAnfangssuche(): string {
  const text = anfangssuche;
  anfangssuche = "";
  return text;
}

/** Der Nachrichtenfilter des Tagebuchs: Kennung und der Name für die Fußzeile. */
export interface Tagebuchnachricht {
  readonly id: string;
  readonly name: string;
}

let anfangsnachricht: Tagebuchnachricht | undefined;

/**
 * „Im Tagebuch zeigen" an einer Nachricht (ETB P0-1): Das Tagebuch beginnt
 * beim nächsten Aufschlagen auf die Zeilen dieser Nachricht gefiltert —
 * über die Kennung, nicht über eine Suche. Einmalig wie die Anfangssuche.
 */
export function tagebuchMitNachricht(nachricht: Tagebuchnachricht): void {
  anfangsnachricht = nachricht;
}

function nimmAnfangsnachricht(): Tagebuchnachricht | undefined {
  const nachricht = anfangsnachricht;
  anfangsnachricht = undefined;
  return nachricht;
}

const NACHRICHT_SEITE = 100;

/** Der Ausschnitt einer Nachricht — eigener Ruf, frisch zu jedem Zeigerstand. */
function useNachrichtentagebuch(
  nachricht: Tagebuchnachricht | undefined,
  suche: string,
  nurRuecknahmen: boolean,
): Tagebuchansicht | undefined {
  const akteId = useLaden((z) => z.akteId);
  const lageZeiger = useLaden((z) => z.lagebild?.lageZeiger);
  const [ansicht, setzeAnsicht] = useState<Tagebuchansicht | undefined>(undefined);
  const id = nachricht?.id;
  useEffect(() => {
    if (akteId === undefined || id === undefined) {
      setzeAnsicht(undefined);
      return;
    }
    let gilt = true;
    rufe({
      art: "tagebuchAnfordern",
      akteId,
      nachrichtId: id,
      anzahl: NACHRICHT_SEITE,
      ...(suche === "" ? {} : { suche }),
      ...(nurRuecknahmen ? { nurRuecknahmen: true } : {}),
    })
      .then((antwort) => {
        if (gilt) setzeAnsicht(antwort);
      })
      .catch(() => {
        if (gilt) setzeAnsicht(undefined);
      });
    return () => {
      gilt = false;
    };
  }, [akteId, id, suche, nurRuecknahmen, lageZeiger]);
  return ansicht;
}

export function Tagebuch({ einheitId, abschnittId, aufAuswahl = false }: TagebuchEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [suche, setzeSuche] = useState(nimmAnfangssuche);
  const [nurRuecknahmen, setzeNurRuecknahmen] = useState(false);
  // Standard „Alle“: Wer das Tagebuch aufschlägt, soll das ganze Tagebuch sehen,
  // nicht unbemerkt einen Ausschnitt (zwei statt elf Einträge).
  // Ausnahme: „Im Tagebuch zeigen“ an einer Einheit will genau deren Einträge.
  const [aufBezug, setzeAufBezug] = useState(aufAuswahl);
  const [eintragOffen, setzeEintragOffen] = useState(false);
  const [nachricht, setzeNachricht] = useState(nimmAnfangsnachricht);
  const nachrichtentagebuch = useNachrichtentagebuch(nachricht, suche, nurRuecknahmen);
  const nachrichtOeffnen = useNachrichtOeffnen();
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

  // Mit Nachrichtenfilter gilt der eigene Ausschnitt (ETB P0-1), sonst der des Blattes.
  const quelle = nachricht === undefined ? laden.tagebuch : nachrichtentagebuch;
  const zeilen = quelle?.zeilen ?? [];
  const gesamtzahl = quelle?.gesamtzahl ?? 0;
  const bezugGewaehlt = einheitId !== undefined || abschnittId !== undefined;
  const filter = [
    ...(nachricht === undefined ? [] : [nachricht.name]),
    ...(aufBezug && bezugGewaehlt && nachricht === undefined ? ["Auswahl"] : []),
    ...(suche.trim() === "" ? [] : [`Suche „${suche.trim()}“`]),
    ...(nurRuecknahmen ? ["nur Rücknahmen und Berichtigungen"] : []),
  ];
  if (filter.length === 0 && laden.tagebuch !== undefined) gesamtOhneFilter.current = gesamtzahl;
  const fusszeile = tagebuchfusszeile(zeilen.length, gesamtzahl, filter, gesamtOhneFilter.current);
  const alleAnzeigen = (): void => {
    setzeSuche("");
    setzeNurRuecknahmen(false);
    setzeAufBezug(false);
    setzeNachricht(undefined);
  };

  return (
    <section aria-label="Einsatztagebuch" className="tagebuch">
      <div className="tagebuchkopf">
        <h2>Einsatztagebuch</h2>
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
              {/* R2-ETB P1-2: die laufende Nummer wie im Druck und als ETB-Nr. in Feld 20 des Vordrucks. */}
              <th scope="col" title="Laufende Nummer der Zeile, wie im gedruckten Tagebuch und als ETB-Nr. auf dem Vordruck">Nr.</th>
              <th scope="col" title="Wann der Eintrag am Rechner geschrieben wurde">Erfasst</th>
              <th scope="col" title="Fachliche Zeit: wann es geschah – bei Funk die Funkzeit, bei Nachrichten die Zeit des Vermerks oder der Abfassung (Audit ETB P3-1)">Fachzeit</th>
              <th scope="col" title="Nummer der Nachricht zur Zeit des Eintrags (E/A und Nachweisungsnummer)">Nachricht</th>
              <th scope="col">Vorgang</th>
              <th scope="col">Akteur</th>
              <th scope="col">Rechner</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <Tagebuchreihe key={zeile.ereignisId} zeile={zeile} aufNachricht={nachrichtOeffnen.oeffne} />
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
          nachricht={nachricht}
          aufSchliessen={() => {
            setzeEintragOffen(false);
          }}
        />
      )}
      {nachrichtOeffnen.anzeige}
    </section>
  );
}

/** Der Grund, sofern der Satz ihn nicht schon nennt (das Zurückziehen einer Nachricht tut es, ETB P0-2). */
export function grundzusatz(zeile: Pick<Tagebuchzeile, "satz" | "grund">): string {
  if (zeile.grund === undefined || zeile.grund === "" || zeile.satz.includes(zeile.grund)) return "";
  return ` — Grund: ${zeile.grund}`;
}

/** Eine Zeile des Tagebuchs; Rücknahmen und Berichtigungen sind gekennzeichnet. */
function Tagebuchreihe({
  zeile,
  aufNachricht,
}: {
  readonly zeile: Tagebuchzeile;
  readonly aufNachricht: (nachrichtId: string) => void;
}): React.JSX.Element {
  const nachrichtId = zeile.nachrichtId;
  return (
    <tr
      className={
        zeile.undoOf !== undefined
          ? "ruecknahme"
          : zeile.korrekturVon !== undefined || zeile.berichtigung === true
            ? "berichtigung"
            : ""
      }
    >
      <td className="zahl">{zeile.laufendeNummer === undefined ? "" : String(zeile.laufendeNummer)}</td>
      <td title={`HLC ${zeile.hlcText}`}>{uhrzeit(zeile.wanduhr)}</td>
      <td>{zeile.zeitpunkt === undefined ? "" : uhrzeit(zeile.zeitpunkt)}</td>
      <td>{zeile.nachrichtNummer ?? ""}</td>
      <td className="satz">
        {zeile.satz}
        {grundzusatz(zeile)}
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
        {/* ETB P0-2: Berichtigung oder Rücknahme an einer Nachricht (neue Nummer, Nachsichtung, zurückgezogen). */}
        {zeile.berichtigung === true && zeile.korrekturVon === undefined && zeile.undoOf === undefined && (
          <span className="marke" title="Berichtigung oder Rücknahme an einer Nachricht">
            {" "}
            Berichtigung
          </span>
        )}
        {nachrichtId !== undefined && (
          <>
            {" "}
            <button
              type="button"
              className="symbolknopf"
              aria-label="Nachricht öffnen"
              title={zeile.nachrichtNummer === undefined ? "Nachricht öffnen" : `Nachricht ${zeile.nachrichtNummer} öffnen`}
              onClick={() => aufNachricht(nachrichtId)}
            >
              ✉
            </button>
          </>
        )}
      </td>
      {/* ETB P1-7: Stelle und Handzeichen, wo das Ereignis sie trägt, statt „Arbeitsplatz“; der Anzeigename im Tooltip. */}
      <td title={zeile.akteur}>{projektion.akteurText(zeile)}</td>
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
  // SGL P3-16, ETB P2-1: in der Anzeigezone Europe/Berlin wie die Datum-Zeit-Gruppe, nicht in der Browserzeit.
  const datum = datumText(zeitpunkt);
  if (datum === "") return "unbekannt";
  return `${datum.slice(0, 6)} ${uhrzeitText(zeitpunkt, true)}`;
}
