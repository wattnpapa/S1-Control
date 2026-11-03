/**
 * Das Fenster des Arbeitsplatzes (M2.2).
 *
 * Es ist das Gerüst und nicht das Lagebild: Einstellungen, Einsatzauswahl,
 * Fehlerbild, Hinweisliste, Statuszeile. Die Tabellen, Masken und der
 * Abschnittsbaum kommen mit M3; was hier steht, ist der Rahmen, in den sie
 * hineinwachsen.
 */

import { useEffect, useMemo, useState } from "react";

import { bruecke } from "./bruecke.js";
import { Diagnose } from "./Diagnose.js";
import { Auswahl } from "./Einsatzauswahl.js";
import { Funkplan } from "./Funkplan.js";
import { Hilfe } from "./Hilfe.js";
import { Kopfband } from "./Kopfband.js";
import { Kosten } from "./Kosten.js";
import { Programmversorgung } from "./Programmversorgung.js";
import { gehoertZurLage, type Blatt } from "./blaetter.js";
import { Lage } from "./Lage.js";
import { Einstiegszeile } from "./Einstiegszeile.js";
import { Meldekopf } from "./Meldekopf.js";
import { Programmstand } from "./Programmstand.js";
import { Eingangsblatt, Fuehrungsblatt } from "./Sammelblaetter.js";
import { useLaden } from "./laden.js";
import { Statuszeile } from "./Statuszeile.js";
import { Verbindungsbanner } from "./Verbindungsbanner.js";
import { Versorgung } from "./Versorgung.js";
import { useVerbindungsstatus } from "./useVerbindungsstatus.js";
import { useBrowserNavigation } from "./navigation.js";
import { ladeMerker, loescheMerker, merkeStand, speichereMerker } from "./sitzung.js";
import { KuerzelAktiv, useKuerzel } from "./tastatur.js";
import { aufschlagAus, blattort, VORGABE_UNTERWAHL, type Aufschlag, type Unterwahl } from "./unterblaetter.js";
import { wiederoeffneZuletzt } from "./wiederoeffnen.js";

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

/**
 * Blatt und Unteransicht aus dem Merker des Reloads — nur, wenn es das Blatt
 * noch gibt. Ein Merker von vor E3 (`anforderungen`, `fueorg`) landet im
 * Blatt, das die Ansicht heute trägt (`unterblaetter.ts`).
 */
function blattAusMerker(): Aufschlag {
  return aufschlagAus(ladeMerker()?.blatt) ?? { blatt: "lage" };
}

/** Blatt und Unteransicht dieses Fensters; ein Aufschlag setzt beides zugleich. */
function useBlattwahl(): {
  readonly blatt: Blatt;
  readonly unterwahl: Unterwahl;
  readonly schlageAuf: (aufschlag: Aufschlag) => void;
  readonly setzeBlatt: (blatt: Blatt) => void;
  readonly setzeUnterwahl: (teil: Partial<Unterwahl>) => void;
} {
  const [anfang] = useState(blattAusMerker);
  const [blatt, setzeBlatt] = useState<Blatt>(anfang.blatt);
  const [unterwahl, setzeWahl] = useState<Unterwahl>({ ...VORGABE_UNTERWAHL, ...anfang.unterwahl });
  const setzeUnterwahl = (teil: Partial<Unterwahl>): void => {
    setzeWahl((bisher) => ({ ...bisher, ...teil }));
  };
  return {
    blatt,
    unterwahl,
    setzeBlatt,
    setzeUnterwahl,
    schlageAuf: (aufschlag) => {
      setzeBlatt(aufschlag.blatt);
      if (aufschlag.unterwahl !== undefined) setzeUnterwahl(aufschlag.unterwahl);
    },
  };
}

export function Arbeitsplatz(): React.JSX.Element {
  const laden = useLaden();
  const jetzt = useJetzt();
  const verbindung = useVerbindungsstatus();
  const [hilfeOffen, setzeHilfeOffen] = useState(false);
  // Welches Blatt aufgeschlagen ist, ist eine Sache **dieses Fensters**: Zwei
  // Arbeitsplätze am selben Einsatz sehen verschiedene Blätter, und beim
  // Schließen der Akte ist die Frage hinfällig.
  // Nach einem Reload steht das zuletzt aufgeschlagene Blatt wieder oben.
  // Die Unteransicht von „Eingang" und „Führungsstelle" ebenso.
  const { blatt, unterwahl, schlageAuf, setzeBlatt, setzeUnterwahl } = useBlattwahl();
  const ort = blattort(blatt, unterwahl);
  const einsatzId = laden.lagebild?.einsatzId;
  const einsatzStatus = laden.lagebild?.einsatzStatus ?? "AKTIV";
  const einheiten = laden.lagebild?.einheiten;

  // Merker für den Reload: zuletzt geöffneter Einsatz und Blatt samt Unteransicht.
  useEffect(() => {
    if (laden.akteId !== undefined && einsatzId !== undefined) speichereMerker(einsatzId, ort);
  }, [laden.akteId, einsatzId, ort]);

  // Zuletzt gesehener Stand für die Einsatzliste (nur Anzeige).
  useEffect(() => {
    if (laden.akteId === undefined || einsatzId === undefined || einheiten === undefined) return;
    merkeStand(einsatzId, { status: einsatzStatus, einheiten, genutzt: Date.now() });
  }, [laden.akteId, einsatzId, einsatzStatus, einheiten]);

  const zurueckZurAuswahl = (): void => {
    loescheMerker();
    void laden.schliesseEinsatz();
  };
  useBrowserNavigation({
    aktiv: laden.umgebung?.plattform === "web" && laden.akteId !== undefined,
    blatt,
    waehleBlatt: (neu) => {
      const aufschlag = aufschlagAus(neu);
      if (aufschlag !== undefined) schlageAuf(aufschlag);
    },
    zurueckZurAuswahl,
  });

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
    void useLaden.getState().starte().then(wiederoeffneZuletzt);
    return abmelden;
  }, []);

  return (
    <div className="arbeitsplatz">
      <Kopfband
        lagebild={laden.lagebild}
        jetzt={jetzt}
        theme={laden.einstellungen.theme ?? "standard"}
        waehleTheme={(gewaehlt) => void laden.waehleTheme(gewaehlt)}
        // Aus dem Fenstermenü öffnet „Hilfe“ und schaltet nicht um: Wer den
        // Eintrag wählt, will die Hilfe sehen. Strg+H schaltet weiter um.
        aufHilfe={() => {
          setzeHilfeOffen(true);
        }}
        zurueckZurAuswahl={
          laden.akteId === undefined ? undefined : zurueckZurAuswahl
        }
        angemeldet={laden.umgebung?.anmeldung === true}
        {...(laden.akteId !== undefined && laden.einstellungen.betriebsart !== "meldekopf"
          ? { blatt, waehleBlatt: setzeBlatt, offeneMeldungen: laden.eingangskorb?.offen ?? 0 }
          : {})}
      />

      <Verbindungsbanner />

      {/* Ein Satz je Blatt beim ersten Aufschlagen, statt einer Hilfemarke
          an jeder Karte (Entwurf „Entlastung", 3.6). */}
      {laden.akteId !== undefined && laden.einstellungen.betriebsart !== "meldekopf" && <Einstiegszeile ort={ort} />}

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
              <KuerzelAktiv.Provider value={gehoertZurLage(blatt)}>
                <Lage blatt={gehoertZurLage(blatt) ? blatt : "lage"} aufBlatt={setzeBlatt} />
              </KuerzelAktiv.Provider>
            </div>
            {blatt === "eingang" && (
              <Eingangsblatt
                gewaehlt={unterwahl.eingang}
                aufWahl={(eingang) => {
                  setzeUnterwahl({ eingang });
                }}
              />
            )}
            {blatt === "fuest" && (
              <Fuehrungsblatt
                gewaehlt={unterwahl.fuest}
                aufWahl={(fuest) => {
                  setzeUnterwahl({ fuest });
                }}
              />
            )}
            {blatt === "funkplan" && <Funkplan />}
            {blatt === "versorgung" && <Versorgung />}
            {blatt === "kosten" && <Kosten />}
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

      <Statuszeile lagebild={laden.lagebild} jetzt={jetzt} verbindung={verbindung} />
    </div>
  );
}
