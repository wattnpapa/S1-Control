/**
 * Was das Menü „Spalten ▾" einstellt (Entwurf „Entlastung", 3.5, Option 6e):
 * die Spaltengruppen, die Gliederung nach Bereich und ob Stillgelegte
 * mitgezeigt werden.
 *
 * **Die Gliederung gilt je Fall.** Ohne gewählten Abschnitt ist die Tabelle
 * die Stärketabelle des Einsatzes; mit gewähltem Abschnitt eine Liste seiner
 * Einheiten. Wer in einem Fall umschaltet, schaltet den anderen nicht mit,
 * und die Wahl bleibt für die Sitzung je Fall erhalten.
 *
 * Gemerkt wird nur in diesem Fenster: Die Wahl betrifft weder den Einsatz
 * noch einen anderen Arbeitsplatz.
 */

import { useState } from "react";

import { projektion, type Spaltengruppe } from "@s1/domaene";

import { GRUPPENTITEL } from "./Einheitenspalten.js";
import { GLIEDERUNG_AUS, type Gliederungswahl } from "./Tabellengliederung.js";

type Fall = "ohneAbschnitt" | "mitAbschnitt";

/**
 * Die Vorgabe der Gliederung je Fall: ohne gewählten Abschnitt nach Bereich
 * gegliedert, wie die Stärketabelle auf Papier (sie ersetzt die Spalte
 * Abschnitt), mit gewähltem Abschnitt flach (Entwurf „Entlastung", 3.5).
 */
export const VORGABE_GLIEDERUNG: Readonly<Record<Fall, Gliederungswahl>> = {
  ohneAbschnitt: { an: true, ohneLeere: false },
  mitAbschnitt: GLIEDERUNG_AUS,
};

export interface Spaltenwahl {
  readonly gruppen: readonly Spaltengruppe[];
  /** Die Gliederung des aktuellen Falls. */
  readonly gliederung: Gliederungswahl;
  readonly stillgelegte: boolean;
  schalteGruppe(gruppe: Spaltengruppe): void;
  setzeGliederung(wahl: Gliederungswahl): void;
  schalteStillgelegte(): void;
  /** Gruppen und Stillgelegte auf die Vorgabe, die Gliederung dieses Falls ebenso. */
  setzeZurueck(): void;
}

/** Schaltet einen Wert in einer Liste an oder ab. */
export function umgeschaltet<T>(liste: readonly T[], wert: T): readonly T[] {
  return liste.includes(wert) ? liste.filter((eintrag) => eintrag !== wert) : [...liste, wert];
}

export function useSpaltenwahl(mitAbschnitt: boolean): Spaltenwahl {
  const fall: Fall = mitAbschnitt ? "mitAbschnitt" : "ohneAbschnitt";
  const [gruppen, setzeGruppen] = useState<readonly Spaltengruppe[]>(projektion.SICHTBARE_GRUPPEN_VORBELEGUNG);
  const [gliederungen, setzeGliederungen] = useState(VORGABE_GLIEDERUNG);
  const [stillgelegte, setzeStillgelegte] = useState(false);
  return {
    gruppen,
    gliederung: gliederungen[fall],
    stillgelegte,
    schalteGruppe: (gruppe) => {
      // Die Grunddaten lassen sich nicht wegschalten: Eine Tabelle ohne
      // Bezeichnung und Status ist keine Lage.
      if (gruppe !== "GRUNDDATEN") setzeGruppen((bisher) => umgeschaltet(bisher, gruppe));
    },
    setzeGliederung: (wahl) => {
      setzeGliederungen((bisher) => ({ ...bisher, [fall]: wahl }));
    },
    schalteStillgelegte: () => {
      setzeStillgelegte((bisher) => !bisher);
    },
    setzeZurueck: () => {
      setzeGruppen(projektion.SICHTBARE_GRUPPEN_VORBELEGUNG);
      setzeGliederungen((bisher) => ({ ...bisher, [fall]: VORGABE_GLIEDERUNG[fall] }));
      setzeStillgelegte(false);
    },
  };
}

/** Kurz, was das Menü gerade eingestellt hat — für die Filterzeile. */
export function spaltenzustand(wahl: Pick<Spaltenwahl, "gruppen" | "gliederung" | "stillgelegte">): string {
  const titel = projektion.SPALTENGRUPPEN.filter((gruppe) => wahl.gruppen.includes(gruppe)).map(
    (gruppe) => GRUPPENTITEL[gruppe] ?? gruppe,
  );
  return [
    wahl.gliederung.an ? "Gliederung nach Bereich" : "",
    `Spalten ${titel.join(", ")}`,
    wahl.stillgelegte ? "mit Stillgelegten" : "",
  ]
    .filter((teil) => teil !== "")
    .join(" · ");
}
