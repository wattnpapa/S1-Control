/**
 * Das Menü „Spalten ▾" im Kopf der Einheitenkarte (Entwurf „Entlastung",
 * 3.5, Option 6e).
 *
 * Es ersetzt die Reihe mit den Kontrollkästchen „Spalten:" und den
 * Umschalter „Gliederung" über der Tabelle: Was man einmal einstellt und
 * dann liest, gehört nicht in die Zeilen über der ersten Einheit. Was
 * eingestellt ist, steht trotzdem sichtbar da — klein rechts in der
 * Filterzeile (`spaltenzustand`).
 */

import { projektion } from "@s1/domaene";

import { GRUPPENTITEL } from "./Einheitenspalten.js";
import { Klappmenue, Menueeintrag, Menuehaken } from "./Klappmenue.js";
import type { Spaltenwahl } from "./useSpaltenwahl.js";

export function Spaltenmenue({ wahl }: { readonly wahl: Spaltenwahl }): React.JSX.Element {
  const { gliederung } = wahl;
  return (
    <Klappmenue
      huelle="spaltenmenue rechts"
      knopf={{
        inhalt: (
          <>
            Spalten <span aria-hidden="true">▾</span>
          </>
        ),
        titel: "Spaltengruppen, Gliederung nach Bereich, Stillgelegte",
      }}
      menue={{ beschriftung: "Spalten", id: "spaltenmenue" }}
      inhalt={(waehle) => (
        <>
          <span className="titel" role="presentation">
            Spaltengruppen
          </span>
          {projektion.SPALTENGRUPPEN.map((gruppe) => (
            <Menuehaken
              key={gruppe}
              text={GRUPPENTITEL[gruppe] ?? gruppe}
              an={wahl.gruppen.includes(gruppe)}
              {...(gruppe === "GRUNDDATEN"
                ? { kurz: "immer", sperre: "Ohne Bezeichnung und Status ist die Tabelle keine Lage" }
                : {})}
              aufWahl={() => {
                wahl.schalteGruppe(gruppe);
              }}
            />
          ))}
          <hr />
          <Menuehaken
            text="Gliederung nach Bereich"
            an={gliederung.an}
            titel="Kopfzeile mit Zwischensumme je Abschnitt, wie in der Stärketabelle auf Papier"
            aufWahl={() => {
              wahl.setzeGliederung({ ...gliederung, an: !gliederung.an });
            }}
          />
          {gliederung.an && (
            <Menuehaken
              text="Leere Bereiche ausblenden"
              an={gliederung.ohneLeere}
              aufWahl={() => {
                wahl.setzeGliederung({ ...gliederung, ohneLeere: !gliederung.ohneLeere });
              }}
            />
          )}
          <Menuehaken
            text="Stillgelegte zeigen"
            an={wahl.stillgelegte}
            titel="Entfernte und aufgegangene Einheiten durchgestrichen mitzeigen; sie zählen nicht"
            aufWahl={wahl.schalteStillgelegte}
          />
          <hr />
          <Menueeintrag
            text="Spalten zurücksetzen"
            titel="Grunddaten und Stärke, Gliederung wie vorgegeben, ohne Stillgelegte"
            aufWahl={waehle(wahl.setzeZurueck)}
          />
        </>
      )}
    />
  );
}
