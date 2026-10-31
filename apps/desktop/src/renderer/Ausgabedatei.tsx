/**
 * Eine erzeugte Datei: ihr Pfad und die Knöpfe „Öffnen“, „Ordner zeigen“ und
 * bei HTML „Drucken“.
 *
 * Vorher nannten die Ausgaben nur den Pfad — und der Bediener musste die
 * Datei im Explorer suchen, um sie auszudrucken. Die Knöpfe gehen über den
 * Ruf `ausgabeZeigen` an die Schale; welche Datei geöffnet werden darf,
 * entscheidet dort der Main, nicht diese Komponente.
 *
 * **In der Web-Schale geht es über den Browser.** Ein „Öffnen“ auf dem Server
 * hülfe nicht; stattdessen liefert der Web-Dienst die Datei per
 * `GET ausgabe?pfad=…` (`web/ausgaberoute.ts`). „Öffnen“ zeigt sie im neuen
 * Reiter, „Herunterladen“ speichert sie, „Drucken“ ruft `window.print()` auf
 * der geöffneten HTML-Seite — die Papier-Rückfallebene auch vom Handy aus.
 */

import { rufe } from "./bruecke.js";
import { useLaden } from "./laden.js";

type Zeigeart = "oeffnen" | "ordner" | "drucken";

export interface AusgabedateiEigenschaften {
  readonly pfad: string;
  /** Der Text vor dem Pfad, etwa „Geschrieben“. */
  readonly vorsatz: string;
  /** Was hinter dem Pfad steht — die Größe, eine Zahl, ein Befund. */
  readonly zusatz?: string;
}

export function Ausgabedatei({ pfad, vorsatz, zusatz }: AusgabedateiEigenschaften): React.JSX.Element {
  const akteId = useLaden((zustand) => zustand.akteId);
  const kannZeigen = useLaden((zustand) => zustand.umgebung?.dateienZeigen === true);
  const imBrowser = useLaden((zustand) => zustand.umgebung?.plattform === "web");
  const melde = useLaden((zustand) => zustand.melde);
  const istHtml = pfad.toLowerCase().endsWith(".html");
  // Relativ, wie die Brücke es für `ruf` erklärt: Die Schale kann unter einem Unterpfad liegen.
  const adresse = `ausgabe?pfad=${encodeURIComponent(pfad)}`;

  function imBrowserZeigen(drucken: boolean): void {
    const fenster = window.open(adresse, "_blank");
    if (fenster === null) {
      melde("warnung", "Der Browser hat das neue Fenster blockiert. Pop-ups für diese Seite erlauben.");
      return;
    }
    if (drucken) fenster.addEventListener("load", () => { fenster.print(); });
  }

  function zeige(wie: Zeigeart): void {
    if (akteId === undefined) return;
    void rufe({ art: "ausgabeZeigen", akteId, pfad, wie }).catch((fehler: unknown) => {
      melde("warnung", fehler instanceof Error ? fehler.message : String(fehler));
    });
  }

  // Im Browser ist der Serverpfad für den Leser ohne Wert (und verrät Interna):
  // Dort steht nur der Dateiname.
  const anzeige = imBrowser ? (pfad.split(/[\\/]/).pop() ?? pfad) : pfad;

  return (
    <div className="ausgabedatei" role="status">
      <span className="hinweistext">
        {vorsatz}: {anzeige}
        {zusatz === undefined ? "" : ` (${zusatz})`}
      </span>
      {imBrowser && (
        <span className="ausgabeknoepfe">
          <button type="button" onClick={() => { imBrowserZeigen(false); }}>
            Öffnen
          </button>
          <a className="knopf" href={`${adresse}&laden=1`} download>
            Herunterladen
          </a>
          {istHtml && (
            <button type="button" onClick={() => { imBrowserZeigen(true); }}>
              Drucken
            </button>
          )}
        </span>
      )}
      {kannZeigen && !imBrowser && (
        <span className="ausgabeknoepfe">
          <button type="button" onClick={() => { zeige("oeffnen"); }}>
            Öffnen
          </button>
          <button type="button" onClick={() => { zeige("ordner"); }}>
            Ordner zeigen
          </button>
          {istHtml && (
            <button type="button" onClick={() => { zeige("drucken"); }}>
              Drucken
            </button>
          )}
        </span>
      )}
    </div>
  );
}
