/**
 * Ein taktisches Zeichen aus dem importierten Zeichensatz.
 *
 * Die Datei kommt unverändert aus jonas-koeritz/Taktische-Zeichen
 * (`apps/desktop/assets/tz/`, erzeugt von `bau/zeichen-importieren.mjs`).
 * Sie wird **inline** gesetzt, damit die mitgelieferte Roboto Slab greift;
 * die Größe steuert der Aufrufer, das SVG selbst trägt seine `viewBox`.
 *
 * **`dangerouslySetInnerHTML` an genau dieser Stelle.** Der Inhalt ist keine
 * Eingabe und kein Inhalt der Akte: Er liegt als Datei im Paket und wird zur
 * Bauzeit eingebunden. Ein Zeichen über `<img>` verlöre die Schrift, ein
 * nachgebautes SVG die Norm.
 *
 * **Geladen wird beim ersten Zeigen.** Bis die Datei da ist, steht die
 * Bedeutung als Wort — meist ein Bildlauf lang, denn die Dateien sind klein
 * und liegen neben dem Programm. Beim zweiten Mal ist das Zeichen im
 * Speicher und sofort da.
 */

import { useEffect, useState } from "react";

import { ladeZeichen, titelVon, zeichenAusSpeicher } from "./zeichensatz.js";

export interface ZeichenEigenschaften {
  /** `Führungsstellen/EAL`, `Einrichtungen/Meldekopf` — Ordner und Dateiname. */
  readonly kennung: string;
  /**
   * Was das Zeichen bedeutet; für Vorleseprogramme und `title`.
   *
   * Fehlt sie, nimmt die Ansicht den Titel aus dem Verzeichnis — der steht im
   * SVG und ist die Bedeutung, die der Zeichensatz selbst nennt.
   */
  readonly bedeutung?: string | undefined;
  readonly breite: number;
  /**
   * Ein engerer Ausschnitt der Zeichenfläche, etwa `"0 56 256 176"`.
   *
   * Die Zeichenfläche ist immer 256×256, das Zeichen selbst nimmt sie selten
   * ganz ein: Unter einer Führungsstellen-Flagge stünde sonst ein Drittel
   * Leerraum, und die Harke würde doppelt so hoch wie nötig. Der Ausschnitt
   * verschiebt nichts und skaliert nichts — er schneidet nur den Rand weg.
   */
  readonly ausschnitt?: string | undefined;
}

/**
 * Lädt ein Zeichen und gibt es zurück, sobald es da ist.
 *
 * Der erste Rückgabewert kommt aus dem Speicher: Wer dasselbe Zeichen ein
 * zweites Mal zeigt — und das ist in einer Tabelle mit vierzig Zeilen die
 * Regel —, bekommt es ohne Umweg und ohne Flackern.
 */
export function useZeichen(kennung: string): string | undefined {
  const [inhalt, setzeInhalt] = useState(() => zeichenAusSpeicher(kennung));

  useEffect(() => {
    const vorhanden = zeichenAusSpeicher(kennung);
    if (vorhanden !== undefined) {
      setzeInhalt(vorhanden);
      return;
    }
    let gilt = true;
    void ladeZeichen(kennung).then((geladen) => {
      // `gilt` fängt den Fall, dass die Zeile inzwischen ein anderes Zeichen
      // zeigt: Eine Antwort auf eine überholte Frage darf nichts überschreiben.
      if (gilt) setzeInhalt(geladen);
    });
    return () => {
      gilt = false;
    };
  }, [kennung]);

  return inhalt;
}

export function Zeichen({
  kennung,
  bedeutung,
  breite,
  ausschnitt,
}: ZeichenEigenschaften): React.JSX.Element {
  const roh = useZeichen(kennung);
  const beschriftung = bedeutung ?? titelVon(kennung) ?? kennung;
  const inhalt =
    roh === undefined || ausschnitt === undefined
      ? roh
      : roh.replace(/viewBox="[^"]*"/i, `viewBox="${ausschnitt}"`);

  if (inhalt === undefined) {
    // Noch nicht geladen oder gar nicht im Satz: Der Platz bleibt, die
    // Bedeutung steht da. Nichts verschwindet stillschweigend.
    return (
      <span
        className="tz tz-fehlt"
        style={{ width: breite }}
        title={`${beschriftung} (${kennung})`}
      >
        {beschriftung}
      </span>
    );
  }

  return (
    <span
      className="tz"
      style={{ width: breite }}
      role="img"
      aria-label={beschriftung}
      title={beschriftung}
      dangerouslySetInnerHTML={{ __html: inhalt }}
    />
  );
}
