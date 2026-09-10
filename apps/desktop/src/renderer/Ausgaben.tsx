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

  function erzeuge(
    ausgabe: "druck" | "status" | "auswertung" | "oldenburg",
    format: "html" | "pdf" | "xlsx",
  ): void {
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
      {/* Die Auswertung ist die einzige Ausgabe, die die Bereichszugehörigkeit
          als Attribut führt — erst damit lässt sich filtern und
          weiterrechnen (M4.2, `excel-domaenenmodell.md` §4.4). */}
      <button type="button" onClick={() => { erzeuge("auswertung", "xlsx"); }}>
        Auswertung als XLSX
      </button>
      {/* Der Oldenburger Block (M4.2) ist derselbe Bestand in der
          Spaltenordnung der Vorlage — zum Einfügen in die gewohnte Excel.
          Er steht neben der Auswertung und nicht an ihrer Stelle: Die eine
          ist unsere Ausgabe, der andere der Übergabeweg. */}
      <button type="button" onClick={() => { erzeuge("oldenburg", "xlsx"); }}>
        Oldenburger Block als XLSX
      </button>
      {/* Der HTML-Monitor (M4.3) ist keine einmalige Ausgabe, sondern eine
          Datei, die sich fortschreibt — deshalb ein Schalter und kein Knopf.
          Nicht zu verwechseln mit dem Stärke-Monitor aus M3.5: Der ist ein
          Fenster dieser Anwendung, dieser hier eine Datei für ein fremdes
          Gerät. */}
      <label className="schalter">
        <input
          type="checkbox"
          checked={laden.htmlMonitor !== undefined}
          onChange={(e) => {
            void laden.schalteHtmlMonitor(e.target.checked, false, organisation);
          }}
        />
        HTML-Monitor für ein zweites Gerät
      </label>
      {laden.htmlMonitor !== undefined && (
        <p className="hinweistext">Monitorseite: {laden.htmlMonitor}</p>
      )}
      {meldung !== undefined && (
        <p role="status" className="hinweistext">
          Geschrieben: {meldung}
        </p>
      )}
    </section>
  );
}
