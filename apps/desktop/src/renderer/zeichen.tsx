/**
 * Ein taktisches Zeichen aus dem importierten Zeichensatz.
 *
 * Die Datei kommt unverändert aus jonas-koeritz/Taktische-Zeichen
 * (`apps/desktop/assets/tz/`, erzeugt von `bau/zeichen-importieren.mjs`).
 * Sie wird **inline** gesetzt, damit die mitgelieferte Roboto Slab greift;
 * die Größe steuert der Aufrufer, das SVG selbst trägt seine `viewBox`.
 *
 * **`dangerouslySetInnerHTML` an genau dieser Stelle.** Der Inhalt ist keine
 * Eingabe und kein Inhalt der Akte: Er wird zur Bauzeit aus dem Repository
 * eingebunden und liegt im Bündel wie jede andere Quelle. Ein Zeichen über
 * `<img>` verlöre die Schrift, ein nachgebautes SVG die Norm.
 */

import { zeichenSvg } from "./zeichensatz.js";

export interface ZeichenEigenschaften {
  /** `Führungsstellen/EAL`, `Einrichtungen/Meldekopf` — Ordner und Dateiname. */
  readonly kennung: string;
  /** Was das Zeichen bedeutet; für Vorleseprogramme und `title`. */
  readonly bedeutung: string;
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

export function Zeichen({
  kennung,
  bedeutung,
  breite,
  ausschnitt,
}: ZeichenEigenschaften): React.JSX.Element {
  const roh = zeichenSvg(kennung);
  const inhalt =
    roh === undefined || ausschnitt === undefined
      ? roh
      : roh.replace(/viewBox="[^"]*"/i, `viewBox="${ausschnitt}"`);

  if (inhalt === undefined) {
    // Ein Zeichen, das der Satz nicht (mehr) kennt: Der Platz bleibt, die
    // Bedeutung steht da. Nichts verschwindet stillschweigend.
    return (
      <span className="tz tz-fehlt" style={{ width: breite }} title={`${bedeutung} (${kennung})`}>
        {bedeutung}
      </span>
    );
  }

  return (
    <span
      className="tz"
      style={{ width: breite }}
      role="img"
      aria-label={bedeutung}
      title={bedeutung}
      dangerouslySetInnerHTML={{ __html: inhalt }}
    />
  );
}
