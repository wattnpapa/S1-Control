/**
 * Eine erzeugte Datei: ihr Pfad und die Knöpfe „Öffnen“, „Ordner zeigen“ und
 * bei HTML „Drucken“.
 *
 * Vorher nannten die Ausgaben nur den Pfad — und der Bediener musste die
 * Datei im Explorer suchen, um sie auszudrucken. Die Knöpfe gehen über den
 * Ruf `ausgabeZeigen` an die Schale; welche Datei geöffnet werden darf,
 * entscheidet dort der Main, nicht diese Komponente.
 *
 * **In der Web-Schale fehlen die Knöpfe.** Sie liefert keine Dateien des
 * Shares aus, und ein „Öffnen“ auf dem Server hülfe dem Browser nicht. Die
 * Schale sagt das über `umgebung.dateienZeigen`; der Pfad bleibt stehen.
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
  const melde = useLaden((zustand) => zustand.melde);
  const istHtml = pfad.toLowerCase().endsWith(".html");

  function zeige(wie: Zeigeart): void {
    if (akteId === undefined) return;
    void rufe({ art: "ausgabeZeigen", akteId, pfad, wie }).catch((fehler: unknown) => {
      melde("warnung", fehler instanceof Error ? fehler.message : String(fehler));
    });
  }

  return (
    <div className="ausgabedatei" role="status">
      <span className="hinweistext">
        {vorsatz}: {pfad}
        {zusatz === undefined ? "" : ` (${zusatz})`}
      </span>
      {kannZeigen && (
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
