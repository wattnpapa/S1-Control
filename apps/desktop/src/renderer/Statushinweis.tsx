/**
 * Ein Hinweis der Statuszeile, der sich per Tipp erklärt.
 *
 * Symbol **und** Wort, nicht nur Farbe (⚠ Warnung, ✖ Fehler); ein Tooltip
 * reicht nicht, denn er erscheint auf dem Handy nie. Der Knopf ist ein echter
 * Knopf (Tastatur, Handschuh: mindestens 44 px hoch), die Erklärung steht als
 * Absatz darunter.
 */

export interface StatushinweisEigenschaften {
  readonly kennung: string;
  readonly ton: "warnung" | "fehler";
  readonly text: string;
  readonly offen: boolean;
  readonly umschalten: () => void;
}

export function Statushinweis({ kennung, ton, text, offen, umschalten }: StatushinweisEigenschaften): React.JSX.Element {
  return (
    <button
      type="button"
      className={`statushinweis ${ton}`}
      aria-expanded={offen}
      aria-controls={`statuserklaerung-${kennung}`}
      onClick={umschalten}
      style={{
        minHeight: 44,
        padding: "0 6px",
        background: "none",
        border: "none",
        font: "inherit",
        fontWeight: 600,
        color: "inherit",
        cursor: "pointer",
        textDecoration: "underline dotted",
      }}
    >
      {ton === "fehler" ? "✖" : "⚠"} {text}
    </button>
  );
}

export function Statuserklaerung({ kennung, text }: { readonly kennung: string; readonly text: string }): React.JSX.Element {
  return (
    <p id={`statuserklaerung-${kennung}`} role="note" style={{ flexBasis: "100%", margin: "2px 0 8px", lineHeight: 1.4 }}>
      {text}
    </p>
  );
}
