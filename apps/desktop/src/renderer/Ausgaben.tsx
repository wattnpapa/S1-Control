/**
 * Die Kernausgaben in der Oberfläche (M4.1).
 *
 * Vier Knöpfe: Druck und Status, je als HTML und als PDF. Mehr braucht es
 * nicht — in der Excel sind es zwei Blätter und die Drucktaste.
 *
 * **Der Pfad wird genannt.** Ein „fertig“ ohne Pfad zwingt den Bediener, die
 * Datei zu suchen; sie liegt im Ordner `ausgaben\` des Einsatzes auf dem
 * Share (KONZEPT-SPEICHER.md §1.4), und der ist im Zweifel drei Klicks weit
 * weg.
 */

import { useState } from "react";

import { ORGANISATIONEN } from "@s1/domaene";

import { useLaden } from "./laden.js";

export function Ausgaben(): React.JSX.Element {
  const laden = useLaden();
  const [organisation, setzeOrganisation] = useState("THW");
  const [meldung, setzeMeldung] = useState<string | undefined>(undefined);

  function erzeuge(ausgabe: "druck" | "status", format: "html" | "pdf"): void {
    setzeMeldung(undefined);
    void (async () => {
      const ergebnis = await laden.erzeugeAusgabe(
        ausgabe,
        format,
        ausgabe === "druck" ? organisation : undefined,
      );
      if (ergebnis === undefined) return;
      setzeMeldung(`${ergebnis.pfad} (${String(ergebnis.bytes)} Bytes)`);
    })();
  }

  return (
    <section aria-label="Ausgaben" className="ausgaben">
      <h2>Ausgaben</h2>
      <label className="schalter">
        Davon Stärke
        <select
          value={organisation}
          onChange={(e) => {
            setzeOrganisation(e.target.value);
          }}
        >
          {ORGANISATIONEN.map((eintrag) => (
            <option key={eintrag} value={eintrag}>
              {eintrag}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={() => { erzeuge("druck", "pdf"); }}>
        Druck als PDF
      </button>
      <button type="button" onClick={() => { erzeuge("druck", "html"); }}>
        Druck als HTML
      </button>
      <button type="button" onClick={() => { erzeuge("status", "pdf"); }}>
        Status als PDF
      </button>
      <button type="button" onClick={() => { erzeuge("status", "html"); }}>
        Status als HTML
      </button>
      {meldung !== undefined && (
        <p role="status" className="hinweistext">
          Geschrieben: {meldung}
        </p>
      )}
    </section>
  );
}
