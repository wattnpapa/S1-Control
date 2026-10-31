/**
 * Der Hinweis über der Lage, solange die Verbindung zum Dienst fehlt.
 *
 * Er steht fest unter dem Kopfband und nicht in der Hinweisliste am Seitenende
 * (auf dem Handy erst nach langem Scrollen zu sehen) und sagt die praktische
 * Folge: Die Anzeige ist veraltet, Eingaben werden nicht gespeichert. Nach der
 * Wiederverbindung steht kurz die Bestätigung, dann verschwindet er.
 */

import { useEffect, useState } from "react";

import { unterbrochenText, useVerbindung } from "./verbindung.js";
import { useVerbindungsabgleich } from "./verbindungsabgleich.js";
import { useVerbindungsstatus } from "./useVerbindungsstatus.js";

/**
 * Inline statt im Stylesheet: Die Seite (`index.html`) gehört dem Gesamtentwurf,
 * der Hinweis nutzt nur dessen Farbmarken.
 */
function stil(art: "warn" | "err" | "ok"): React.CSSProperties {
  return {
    margin: "14px 14px 0",
    padding: "9px 13px",
    background: `var(--${art}-bg)`,
    border: `var(--rahmenbreite, 1px) solid var(--${art}-linie)`,
    color: `var(--${art}-text)`,
  };
}

/** So lange steht „Wieder verbunden" nach der Rückkehr. */
export const BESTAETIGUNG_MS = 6000;

export function Verbindungsbanner(): React.JSX.Element | null {
  useVerbindungsabgleich();
  const status = useVerbindungsstatus();
  const wiederverbundenUm = useVerbindung((z) => z.wiederverbundenUm);
  const [bestaetigung, setzeBestaetigung] = useState(false);

  useEffect(() => {
    if (wiederverbundenUm === undefined) return undefined;
    setzeBestaetigung(true);
    const zeitgeber = setTimeout(() => setzeBestaetigung(false), BESTAETIGUNG_MS);
    return () => clearTimeout(zeitgeber);
  }, [wiederverbundenUm]);

  if (status.zustand === "unterbrochen") {
    return (
      <div role="alert" className="verbindungsbanner" style={stil(status.stufe === "rot" ? "err" : "warn")}>
        <strong>{status.stufe === "rot" ? "✖" : "⚠"} {unterbrochenText(status.seitMs)}.</strong>{" "}
        Die Anzeige ist veraltet, Eingaben werden nicht gespeichert und sind gesperrt. Es wird automatisch neu
        verbunden; offene Formulare behalten ihre Eingaben.
      </div>
    );
  }
  if (bestaetigung && status.zustand === "verbunden") {
    return (
      <div role="status" className="verbindungsbanner" style={stil("ok")}>
        ✓ Wieder verbunden – Daten wurden neu geladen.
      </div>
    );
  }
  return null;
}
