/**
 * Der Stärke-Monitor (M3.5) — das Zweitfenster.
 *
 * 05-UMSETZUNGSPLAN.md nennt für M3.5 fünf Stücke: „Zweitfenster,
 * Monitorwahl, dynamische Schrift, Gesamtstärke und NATO-Zeit, Push aus dem
 * Worker“. Diese Datei ist ausschliesslich das **Bild** darin. Wo das Fenster
 * aufgeht, auf welchem Bildschirm es steht und wie das Lagebild dorthin
 * kommt, weiss sie nicht — und das ist Absicht:
 *
 *  * Der Push ist keine Erfindung dieses Fensters. Das Lagebild kommt als
 *    Projektion aus dem Worker (KONZEPT-EREIGNISSE.md §3.1: der Fachzustand
 *    wird gefaltet, nicht in der Oberfläche gerechnet) und läuft über
 *    denselben Delta-Weg wie die Statuszeile. Der Monitor bekommt das
 *    fertige Bild als Eigenschaft und faltet nichts.
 *  * Eine Komponente, die selbst an der Fensterverwaltung hinge, wäre in
 *    jsdom nicht prüfbar. So ist sie eine Abbildung von Eigenschaften auf
 *    Anzeige und ausserdem an jeder Stelle wiederverwendbar — im
 *    Zweitfenster wie in einer künftigen HTML-Ausgabe.
 *
 * **`jetzt` wird übergeben**, aus demselben Grund wie in `Statuszeile.tsx`:
 * Eine Komponente, die `Date.now()` ruft, ist nicht prüfbar — „vor 8 s“ und
 * die NATO-Zeit hingen dann an der Laufzeit des Tests. Der Aufrufer gibt die
 * Uhr, und im Betrieb tickt sie im Fenster.
 */

import { useEffect, useState } from "react";

import { alter } from "./Statuszeile.js";
import { natoZeit, schriftgroesse, staerketext } from "./monitorZahlen.js";
import type { Lagebild } from "../kontrakt/index.js";

export interface MonitorEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
  /**
   * Der Zonenbuchstabe der Datum-Zeit-Gruppe; Vorbelegung `A` (MEZ, UTC+1).
   *
   * Er steht hier und nicht in der Komponente, weil ihn die Führungsstelle
   * festlegt und nicht der Rechner — die Begründung im Langen steht bei
   * {@link natoZeit}.
   */
  readonly zone?: string;
}

/** Die Fenstermasse in Pixeln — die einzige Grösse, die der Monitor selbst misst. */
interface Fenstermass {
  readonly breite: number;
  readonly hoehe: number;
}

function messeFenster(): Fenstermass {
  return { breite: window.innerWidth, hoehe: window.innerHeight };
}

/**
 * Die Fenstergrösse als Zustand, fortgeschrieben am `resize`-Ereignis.
 *
 * Der Monitor ist das einzige Fenster dieses Programms, dessen Schriftgrad
 * von seiner Grösse abhängt: Er wird auf einen fremden Bildschirm geschoben,
 * dessen Auflösung niemand vorher kennt. Deshalb wird gemessen statt geraten.
 *
 * Gemessen wird nur das Fenster — die Zeile selbst wird **nicht** ausgemessen
 * (Begründung bei {@link schriftgroesse}). Und der Hörer wird beim Abräumen
 * wieder abgemeldet: Ein Zweitfenster geht auf und zu, und ein Hörer, der
 * das überlebt, schreibt in eine abgeräumte Komponente.
 */
function useFenstermass(): Fenstermass {
  const [mass, setzeMass] = useState<Fenstermass>(messeFenster);

  useEffect(() => {
    function miss(): void {
      setzeMass(messeFenster());
    }
    // Einmal sofort: Zwischen dem ersten Zeichnen und diesem Effekt kann das
    // Fenster schon auf dem Zweitbildschirm gelandet sein.
    miss();
    window.addEventListener("resize", miss);
    return () => {
      window.removeEventListener("resize", miss);
    };
  }, []);

  return mass;
}

export function Monitor({ lagebild, jetzt, zone = "A" }: MonitorEigenschaften): React.JSX.Element {
  const mass = useFenstermass();
  const zeit = natoZeit(jetzt, zone);

  if (lagebild === undefined) {
    // Ruhig und ohne Zahl: Ein Monitor, der „0/0/0 = 0“ zeigt, behauptet, es
    // sei niemand im Einsatz. Ohne geöffnete Akte weiss er aber gar nichts —
    // das ist ein Unterschied, und er gehört ausgesprochen. Die Uhr bleibt
    // stehen: Sie ist die einzige Auskunft, die auch ohne Akte gilt.
    return (
      <section className="monitor monitorruhig" aria-label="Stärke-Monitor">
        <p className="monitorhinweis">Kein Einsatz geöffnet</p>
        <p className="monitorzeit">{zeit}</p>
      </section>
    );
  }

  const text = staerketext(lagebild.gesamtstaerke);
  const grad = schriftgroesse(text.length, mass.breite, mass.hoehe);

  return (
    <section className="monitor" aria-label="Stärke-Monitor">
      {/* Die Beschriftung steht über der Zahl und in der Reihenfolge der
          Spalten AJ/AK/AL/AM des Blatts Stärke: Wer aus fünf Metern liest,
          soll nicht raten müssen, welche der drei Zahlen die Führer sind. */}
      <p className="monitorbeschriftung">Fü / UFü / He = Gesamt</p>
      <p className="monitorstaerke" style={{ fontSize: `${String(grad)}px` }}>
        {text}
      </p>
      <p className="monitorzeit">{zeit}</p>
      <p className="monitorfuss">
        <span className="monitoreinsatz">{lagebild.einsatzName}</span>
        {" · "}
        {/* Dieselbe Auskunft wie in der Statuszeile, und dieselbe Funktion:
            `alter` ist importiert und nicht nachgebaut. Zwei Fassungen
            derselben Angabe wären zwei Gelegenheiten, verschieden zu runden —
            und der Monitor steht neben dem Arbeitsplatz an der Wand. */}
        <span className="monitorstand" title={lagebild.standHlc}>
          Stand:{" "}
          {lagebild.standWanduhr === "" ? "keine Ereignisse" : alter(lagebild.standWanduhr, jetzt)}
        </span>
      </p>
    </section>
  );
}
