/**
 * Die taktischen Zeichen der Führungsharke (Entwurf „Oberfläche", Assets).
 *
 * **Inline und nicht als `<img>`.** Die Zeichen tragen ihre Beschriftung als
 * Text; in einem `<img src>` griffe die Schriftart des Fensters nicht, und ein
 * Zeichen mit fremder Schrift ist im Ausdruck ein anderes Zeichen. Die
 * Geometrie ist die der gelieferten Dateien unter `apps/desktop/assets/tz/`:
 * Zeichenfläche 256×256, Führungsstellen-Flagge `x=10 y=64 w=236 h=128` in
 * `#ffff00` mit 5 px schwarzem Rand und Mast, Einrichtungen als Kreis `r=64`.
 *
 * **Roboto Slab, mit Rückfall.** Die Vorlage setzt Roboto Slab Bold. Die
 * Anwendung läuft offline (02-ZIELBILD.md), eine Schrift von Google Fonts wäre
 * im Einsatz nicht da; bis sie im Paket liegt, trägt der Rückfall auf Georgia
 * das Zeichen. Die Form bleibt, die Serifen wechseln.
 */

const SCHRIFT = "'Roboto Slab', Georgia, serif";

export interface ZeichenEigenschaften {
  /** Die Beschriftung im Zeichen — `TEL`, `EAL`, `UEAL`, `M`. */
  readonly text: string;
  /** Was das Zeichen bedeutet; steht in `title` und für Vorleseprogramme. */
  readonly bedeutung: string;
  readonly breite: number;
}

/** Die Flagge einer Führungsstelle. */
export function Fuehrungszeichen({
  text,
  bedeutung,
  breite,
}: ZeichenEigenschaften): React.JSX.Element {
  return (
    // Der Ausschnitt endet unter dem Mast: Die Zeichenflaeche ist 256×256,
    // die Flagge nimmt davon nur die Mitte ein — ohne Beschnitt stuende unter
    // jedem Zeichen ein Drittel Leerraum, und die Harke wuerde doppelt so
    // hoch wie noetig.
    <svg
      viewBox="0 56 256 176"
      width={breite}
      height={(breite * 176) / 256}
      role="img"
      aria-label={bedeutung}
      className="tz"
    >
      <title>{bedeutung}</title>
      <rect x="10" y="64" width="236" height="128" fill="#ffff00" stroke="#000" strokeWidth="5" />
      <line x1="10" y1="194" x2="10" y2="225" stroke="#000" strokeWidth="5" />
      <text
        x="128"
        y="150"
        style={{ font: `bold 56px ${SCHRIFT}`, textAnchor: "middle" }}
        fill="#000"
      >
        {text}
      </text>
    </svg>
  );
}

/** Der Kreis einer Einrichtung — Meldekopf, Bereitstellungsraum, Versorgung. */
export function Einrichtungszeichen({
  text,
  bedeutung,
  breite,
}: ZeichenEigenschaften): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 256 256"
      width={breite}
      height={breite}
      role="img"
      aria-label={bedeutung}
      className="tz"
    >
      <title>{bedeutung}</title>
      <circle cx="128" cy="128" r="64" fill="#ffff00" stroke="#000" strokeWidth="5" />
      <text
        x="128"
        y="150"
        style={{ font: `bold 56px ${SCHRIFT}`, textAnchor: "middle" }}
        fill="#000"
      >
        {text}
      </text>
    </svg>
  );
}
