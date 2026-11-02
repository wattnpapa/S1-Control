/**
 * Die Knöpfe einer Versorgungsausgabe (S4): als PDF und als HTML, darunter
 * die erzeugte Datei mit „Öffnen" — derselbe Weg wie im Blatt „Ausgaben".
 * Im Browser gibt es kein PDF (ADR-005); dort steht nur HTML.
 */

import { useState } from "react";

import { Ausgabedatei } from "./Ausgabedatei.js";
import { useLaden } from "./laden.js";

export function Versorgungsausgabe({
  ausgabe,
  titel,
}: {
  readonly ausgabe: "belegung" | "bestellliste" | "vorausschau" | "kraftstoff";
  readonly titel: string;
}): React.JSX.Element {
  const erzeugeAusgabe = useLaden((z) => z.erzeugeAusgabe);
  const imBrowser = useLaden((z) => z.umgebung?.plattform === "web");
  const [pfad, setzePfad] = useState<string | undefined>(undefined);
  const erzeuge = (format: "pdf" | "html"): void => {
    setzePfad(undefined);
    void erzeugeAusgabe(ausgabe, format).then((ergebnis) => {
      if (ergebnis !== undefined) setzePfad(ergebnis.pfad);
    });
  };
  return (
    <span className="versorgungsausgabe">
      {!imBrowser && (
        <button type="button" onClick={() => erzeuge("pdf")}>
          {titel} als PDF
        </button>
      )}
      <button type="button" onClick={() => erzeuge("html")}>
        {titel} als HTML
      </button>
      {pfad !== undefined && <Ausgabedatei pfad={pfad} vorsatz="Geschrieben" />}
    </span>
  );
}
