/**
 * Das Fenster des Arbeitsplatzes (M2.2).
 *
 * Es ist das Gerüst und nicht das Lagebild: Einstellungen, Einsatzauswahl,
 * Fehlerbild, Hinweisliste, Statuszeile. Die Tabellen, Masken und der
 * Abschnittsbaum kommen mit M3; was hier steht, ist der Rahmen, in den sie
 * hineinwachsen.
 */

import { useEffect, useMemo, useState } from "react";

import { Anforderungen } from "./Anforderungen.js";
import { bruecke } from "./bruecke.js";
import { Diagnose } from "./Diagnose.js";
import { Eingangskorb } from "./Eingangskorb.js";
import { Fuehrungsorganisation } from "./Fuehrungsorganisation.js";
import { Fuehrungsstelle } from "./Fuehrungsstelle.js";
import { Hilfe } from "./Hilfe.js";
import { Kopfband } from "./Kopfband.js";
import { Kosten } from "./Kosten.js";
import { Programmversorgung } from "./Programmversorgung.js";
import { gehoertZurLage, type Blatt } from "./blaetter.js";
import { Lage } from "./Lage.js";
import { Meldekopf } from "./Meldekopf.js";
import { Programmstand } from "./Programmstand.js";
import { useLaden } from "./laden.js";
import { Staerkeband } from "./Staerkeband.js";
import { Statuszeile } from "./Statuszeile.js";
import { useKuerzel } from "./tastatur.js";

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
  const [hilfeOffen, setzeHilfeOffen] = useState(false);
  // Welches Blatt aufgeschlagen ist, ist eine Sache **dieses Fensters**: Zwei
  // Arbeitsplätze am selben Einsatz sehen verschiedene Blätter, und beim
  // Schließen der Akte ist die Frage hinfällig.
  const [blatt, setzeBlatt] = useState<Blatt>("lage");

  // Strg+H, wie in der Excel (m_makroFunktionen). Das Kürzel wird hier
  // angemeldet und nicht in einer Ansicht: Die Hilfe gehört zum Fenster und
  // ist aus jeder Maske erreichbar.
  useKuerzel(
    useMemo(
      () => ({
        hilfe: () => {
          setzeHilfeOffen((bisher) => !bisher);
        },
      }),
      [],
    ),
  );

  useEffect(() => {
    // Das Theme hängt am Wurzelelement und nicht an dieser Komponente: Die
    // Marken unter `:root` gelten auch für Masken, Nebenblätter und das
    // Monitorfenster, die ausserhalb dieses Baums gezeichnet werden.
    document.documentElement.dataset["theme"] = laden.einstellungen.theme ?? "standard";
  }, [laden.einstellungen.theme]);

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
      <Kopfband
        lagebild={laden.lagebild}
        jetzt={jetzt}
        theme={laden.einstellungen.theme ?? "standard"}
        waehleTheme={(gewaehlt) => void laden.waehleTheme(gewaehlt)}
        aufHilfe={() => {
          setzeHilfeOffen((bisher) => !bisher);
        }}
        zurueckZurAuswahl={
          laden.akteId === undefined ? undefined : () => void laden.schliesseEinsatz()
        }
        {...(laden.akteId !== undefined && laden.einstellungen.betriebsart !== "meldekopf"
          ? { blatt, waehleBlatt: setzeBlatt, offeneMeldungen: laden.eingangskorb?.offen ?? 0 }
          : {})}
      />

      {laden.lagebild !== undefined && <Staerkeband lagebild={laden.lagebild} />}

      {laden.fehler !== undefined && (
        <div role="alert" className="fehlerbild">
          <span>{laden.fehler}</span>
          <button type="button" onClick={() => laden.loescheFehler()}>
            Verstanden
          </button>
        </div>
      )}

      <main>
        {hilfeOffen && (
          <Hilfe
            aufSchliessen={() => {
              setzeHilfeOffen(false);
            }}
          />
        )}
        <Programmstand />

        {/* Die Betriebsart entscheidet, was hier steht (M6.4). Ein Meldekopf
            nimmt Bögen auf und quittiert sie; ein Lagebild führt er nicht.
            Dieselbe Akte, dieselben Ereignisse — ein anderer Zuschnitt. */}
        {laden.akteId === undefined ? (
          <Auswahl />
        ) : laden.einstellungen.betriebsart === "meldekopf" ? (
          <Meldekopf />
        ) : (
          // Ein Blatt zur Zeit. Die Lage bleibt dabei **eingehängt**, auch
          // wenn ein anderes Blatt oben liegt: Sie hält die Auswahl von
          // Abschnitt und Einheit, auf die Ausgaben und Tagebuch sich
          // beziehen, und die soll ein Blick in die Kosten nicht löschen.
          <>
            <div hidden={!gehoertZurLage(blatt)}>
              <Lage blatt={gehoertZurLage(blatt) ? blatt : "lage"} />
            </div>
            {blatt === "eingang" && <Eingangskorb />}
            {blatt === "anforderungen" && <Anforderungen />}
            {blatt === "fuest" && <Fuehrungsstelle />}
            {blatt === "kosten" && <Kosten />}
            {blatt === "fueorg" && <Fuehrungsorganisation />}
            {blatt === "diagnose" && (
              <>
                <Diagnose />
                <Programmversorgung />
              </>
            )}
          </>
        )}

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
