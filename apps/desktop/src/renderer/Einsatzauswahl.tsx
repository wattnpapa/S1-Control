/**
 * Einstellungen und Einsatzauswahl — das, was vor dem ersten Einsatz zu tun ist.
 *
 * Aus `Arbeitsplatz.tsx` herausgelöst; die Einsatzliste selbst (Status,
 * letzte Änderung, Einheiten) steht in `Einsatzliste.tsx`.
 */

import { useEffect, useState } from "react";

import { Einsatzliste } from "./Einsatzliste.js";
import { useLaden } from "./laden.js";

export function Auswahl(): React.JSX.Element {
  const laden = useLaden();
  const [share, setzeShare] = useState(laden.einstellungen.sharePfad);
  const [name, setzeName] = useState(laden.einstellungen.anzeigename);
  const [neuerEinsatz, setzeNeuerEinsatz] = useState("");
  const [betriebsart, setzeBetriebsart] = useState(
    laden.einstellungen.betriebsart ?? "fuehrungsstelle",
  );
  // Im Browser gibt der Dienst den Share vor (ADR-005) — er hat ihn eingehängt,
  // und ein Bediener könnte ihn ohnehin nicht auf ein anderes Verzeichnis des
  // Servers umstellen. Das Feld zeigt ihn deshalb nur.
  const shareFest = laden.umgebung?.plattform === "web";

  // Die Felder folgen den geladenen Einstellungen, solange niemand tippt.
  useEffect(() => {
    setzeShare(laden.einstellungen.sharePfad);
    setzeName(laden.einstellungen.anzeigename);
    setzeBetriebsart(laden.einstellungen.betriebsart ?? "fuehrungsstelle");
  }, [laden.einstellungen]);

  return (
    <>
      <section aria-label="Einstellungen">
        <h2>Einstellungen</h2>
        <label>
          Share-Pfad
          {shareFest ? (
            <output className="hinweistext">{share} (vom Dienst vorgegeben)</output>
          ) : (
            <input value={share} onChange={(e) => setzeShare(e.target.value)} />
          )}
        </label>
        <label>
          Anzeigename
          <input value={name} onChange={(e) => setzeName(e.target.value)} />
        </label>
        <label>
          Betriebsart
          <select
            value={betriebsart}
            onChange={(e) => {
              setzeBetriebsart(e.target.value as "fuehrungsstelle" | "meldekopf");
            }}
          >
            <option value="fuehrungsstelle">Führungsstelle</option>
            <option value="meldekopf">Meldekopf</option>
          </select>
        </label>
        {betriebsart === "meldekopf" && (
          <p className="hinweistext">
            Der Meldekopf sieht Scanner, Eingangskorb und Bündeldatei — kein Lagebild. Er schreibt
            in dieselbe Akte auf demselben Share; die Betriebsart ist ein Zuschnitt der Oberfläche
            und kein Recht.
          </p>
        )}
        <button
          type="button"
          disabled={laden.beschaeftigt}
          onClick={() =>
            void laden.setzeEinstellungen({
              sharePfad: share,
              anzeigename: name,
              betriebsart,
              // Das Erscheinungsbild gehört dem Schalter im Kopfband; diese
              // Maske reicht es durch, statt es auf den Stand beim Öffnen
              // zurückzudrehen.
              ...(laden.einstellungen.theme === undefined
                ? {}
                : { theme: laden.einstellungen.theme }),
            })
          }
        >
          Übernehmen
        </button>
      </section>

      <section aria-label="Einsätze">
        <h2>Einsätze</h2>
        {laden.einsaetze.length === 0 ? (
          <p className="hinweistext">
            {laden.einstellungen.sharePfad === ""
              ? "Zuerst den Share-Pfad eintragen."
              : "Unter diesem Pfad liegt noch kein Einsatz."}
          </p>
        ) : (
          <Einsatzliste einsaetze={laden.einsaetze} aufOeffnen={(ordner) => void laden.oeffneEinsatz(ordner)} />
        )}
        <label>
          Neuer Einsatz
          <input value={neuerEinsatz} onChange={(e) => setzeNeuerEinsatz(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={neuerEinsatz.trim().length === 0 || laden.beschaeftigt}
          onClick={() => {
            // Das Feld wird erst geleert, wenn der Einsatz angelegt ist: Bei „existiert bereits“
            // soll der Name stehen bleiben, damit er sich ändern lässt.
            void laden
              .legeEinsatzAn(neuerEinsatz.trim(), new Date().toISOString().slice(0, 10))
              .then(() => {
                if (useLaden.getState().akteId !== undefined) setzeNeuerEinsatz("");
              });
          }}
        >
          Anlegen
        </button>
      </section>
    </>
  );
}
