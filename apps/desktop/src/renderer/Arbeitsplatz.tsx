/**
 * Das Fenster des Arbeitsplatzes (M2.2).
 *
 * Es ist das Gerüst und nicht das Lagebild: Einstellungen, Einsatzauswahl,
 * Fehlerbild, Hinweisliste, Statuszeile. Die Tabellen, Masken und der
 * Abschnittsbaum kommen mit M3; was hier steht, ist der Rahmen, in den sie
 * hineinwachsen.
 */

import { useEffect, useState } from "react";

import { bruecke } from "./bruecke.js";
import { Lage } from "./Lage.js";
import { useLaden } from "./laden.js";
import { Statuszeile } from "./Statuszeile.js";

/**
 * Die Uhr des Fensters — sie tickt, damit „vor 8 s" auch dann altert, wenn
 * nichts eintrifft.
 *
 * Eine Sekunde ist fein genug: Die Statuszeile rundet ohnehin, und ein
 * schnellerer Takt zeichnete das Fenster ohne sichtbaren Unterschied neu.
 */
function useJetzt(): number {
  const [jetzt, setzeJetzt] = useState(() => Date.now());
  useEffect(() => {
    const zeitgeber = setInterval(() => setzeJetzt(Date.now()), 1000);
    return () => clearInterval(zeitgeber);
  }, []);
  return jetzt;
}

export function Arbeitsplatz(): React.JSX.Element {
  const laden = useLaden();
  const jetzt = useJetzt();

  useEffect(() => {
    // Der Hörer wird **vor** dem Start eingehängt: Das erste volle Lagebild
    // kommt unmittelbar nach dem Öffnen einer Akte, und ein Hörer, der danach
    // einhängt, verpasste genau die Mitteilung, auf der alle Deltas aufbauen.
    const abmelden = bruecke().aufMitteilung((mitteilung) => {
      useLaden.getState().nimmMitteilung(mitteilung);
    });
    // Über `getState` und nicht über `laden`: Der Effekt soll genau einmal
    // laufen, und `laden` ändert sich bei jeder Zustandsänderung. Ein erneuter
    // Lauf hängte einen zweiten Hörer ein, und der Store bekäme danach jede
    // Mitteilung doppelt.
    void useLaden.getState().starte();
    return abmelden;
  }, []);

  return (
    <div className="arbeitsplatz">
      <header>
        <h1>S1-Control</h1>
        {laden.umgebung !== undefined && (
          <span className="umgebung">
            {laden.umgebung.rechnername} · {laden.umgebung.clientId.slice(0, 8)} ·{" "}
            {laden.umgebung.programmversion}
          </span>
        )}
      </header>

      {laden.fehler !== undefined && (
        <div role="alert" className="fehlerbild">
          <span>{laden.fehler}</span>
          <button type="button" onClick={() => laden.loescheFehler()}>
            Verstanden
          </button>
        </div>
      )}

      <main>
        {laden.akteId === undefined ? <Auswahl /> : <Lage />}

        {laden.hinweise.length > 0 && (
          <section aria-label="Hinweise" className="hinweise">
            <h2>Hinweise</h2>
            <ul>
              {laden.hinweise.map((hinweis) => (
                <li key={hinweis.nummer} className={hinweis.stufe}>
                  {hinweis.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <Statuszeile lagebild={laden.lagebild} jetzt={jetzt} />
    </div>
  );
}

/** Einstellungen und Einsatzauswahl — das, was vor dem ersten Einsatz zu tun ist. */
function Auswahl(): React.JSX.Element {
  const laden = useLaden();
  const [share, setzeShare] = useState(laden.einstellungen.sharePfad);
  const [name, setzeName] = useState(laden.einstellungen.anzeigename);
  const [neuerEinsatz, setzeNeuerEinsatz] = useState("");

  // Die Felder folgen den geladenen Einstellungen, solange niemand tippt.
  useEffect(() => {
    setzeShare(laden.einstellungen.sharePfad);
    setzeName(laden.einstellungen.anzeigename);
  }, [laden.einstellungen]);

  return (
    <>
      <section aria-label="Einstellungen">
        <h2>Einstellungen</h2>
        <label>
          Share-Pfad
          <input value={share} onChange={(e) => setzeShare(e.target.value)} />
        </label>
        <label>
          Anzeigename
          <input value={name} onChange={(e) => setzeName(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={laden.beschaeftigt}
          onClick={() => void laden.setzeEinstellungen({ sharePfad: share, anzeigename: name })}
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
          <ul>
            {laden.einsaetze.map((einsatz) => (
              <li key={einsatz.ordner}>
                <button type="button" onClick={() => void laden.oeffneEinsatz(einsatz.ordner)}>
                  {einsatz.name} ({einsatz.datum})
                </button>
              </li>
            ))}
          </ul>
        )}
        <label>
          Neuer Einsatz
          <input value={neuerEinsatz} onChange={(e) => setzeNeuerEinsatz(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={neuerEinsatz.trim().length === 0 || laden.beschaeftigt}
          onClick={() => {
            void laden.legeEinsatzAn(neuerEinsatz.trim(), new Date().toISOString().slice(0, 10));
            setzeNeuerEinsatz("");
          }}
        >
          Anlegen
        </button>
      </section>
    </>
  );
}
