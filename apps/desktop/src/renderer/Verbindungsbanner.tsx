/**
 * Der Hinweis über der Lage, solange die Verbindung zum Dienst fehlt.
 *
 * Er steht fest unter dem Kopfband und nicht in der Hinweisliste am Seitenende
 * (auf dem Handy erst nach langem Scrollen zu sehen) und sagt die praktische
 * Folge: Die Anzeige ist veraltet, Eingaben werden nicht gespeichert. Nach der
 * Wiederverbindung steht kurz die Bestätigung, dann verschwindet er.
 */

import { useCallback, useEffect, useState } from "react";

import { unterbrochenText, useVerbindung } from "./verbindung.js";
import { useVerbindungsabgleich } from "./verbindungsabgleich.js";
import { useVerbindungsstatus } from "./useVerbindungsstatus.js";

/**
 * Meldet die Höhe des Banners als `--bannerhoehe` an die Seite: Ein Dialog
 * rückt damit unter das Banner, das dann fest über ihm steht (`index.html`).
 */
function useBannerhoehe(): (knoten: HTMLElement | null) => void {
  return useCallback((knoten: HTMLElement | null) => {
    const wurzel = document.documentElement.style;
    if (knoten === null) {
      wurzel.removeProperty("--bannerhoehe");
      return;
    }
    const setze = (): void => wurzel.setProperty("--bannerhoehe", `${String(knoten.offsetHeight)}px`);
    setze();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(setze).observe(knoten);
  }, []);
}

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
  const meldeHoehe = useBannerhoehe();

  useEffect(() => {
    if (wiederverbundenUm === undefined) return undefined;
    setzeBestaetigung(true);
    const zeitgeber = setTimeout(() => setzeBestaetigung(false), BESTAETIGUNG_MS);
    return () => clearTimeout(zeitgeber);
  }, [wiederverbundenUm]);

  if (status.zustand === "unterbrochen") {
    return (
      <div ref={meldeHoehe} role="alert" className="verbindungsbanner" style={stil(status.stufe === "rot" ? "err" : "warn")}>
        <strong>{status.stufe === "rot" ? "✖" : "⚠"} {unterbrochenText(status.seitMs)}.</strong>{" "}
        Die Anzeige ist veraltet, Eingaben werden nicht gespeichert und sind gesperrt. Es wird automatisch neu
        verbunden; offene Formulare behalten ihre Eingaben.
      </div>
    );
  }
  if (bestaetigung && status.zustand === "verbunden") {
    return (
      <div ref={meldeHoehe} role="status" className="verbindungsbanner" style={stil("ok")}>
        ✓ Wieder verbunden – Daten wurden neu geladen.
      </div>
    );
  }
  return null;
}
