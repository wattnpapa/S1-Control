/**
 * Eine Versorgungsausgabe (S4) als PDF und als HTML, danach die erzeugte
 * Datei mit „Öffnen" — derselbe Weg wie im Blatt „Ausgaben". Im Browser
 * gibt es kein PDF (ADR-005); dort steht nur HTML.
 *
 * Das Blatt „Funkplan" nimmt denselben Weg für seinen Funkplan; ein
 * zweiter mit anderem Namen wäre dieselbe Komponente zweimal. Seit Runde 6
 * (Entwurf „Entlastung", 3.7) stehen die Ausgaben nicht mehr als Knöpfe in
 * der Werkzeugzeile, sondern im Menü „⋯": {@link useAusgabe} hält
 * Erzeugen und Pfad, {@link Ausgabeeintraege} zeichnet die zwei Einträge,
 * {@link Ausgabepfad} die erzeugte Datei neben dem Menü.
 */

import { useState } from "react";

import { Ausgabedatei } from "./Ausgabedatei.js";
import { Menueeintrag, type Waehle } from "./Klappmenue.js";
import { useLaden } from "./laden.js";

export type Versorgungsausgabeart = "belegung" | "bestellliste" | "vorausschau" | "kraftstoff" | "funkplan";

export interface Ausgabebedienung {
  readonly erzeuge: (format: "pdf" | "html") => void;
  /** Die zuletzt erzeugte Datei, bis zum nächsten Erzeugen. */
  readonly pfad: string | undefined;
  /** Im Browser gibt es kein PDF. */
  readonly imBrowser: boolean;
}

export function useAusgabe(ausgabe: Versorgungsausgabeart): Ausgabebedienung {
  const erzeugeAusgabe = useLaden((z) => z.erzeugeAusgabe);
  const imBrowser = useLaden((z) => z.umgebung?.plattform === "web");
  const [pfad, setzePfad] = useState<string | undefined>(undefined);
  const erzeuge = (format: "pdf" | "html"): void => {
    setzePfad(undefined);
    void erzeugeAusgabe(ausgabe, format).then((ergebnis) => {
      if (ergebnis !== undefined) setzePfad(ergebnis.pfad);
    });
  };
  return { erzeuge, pfad, imBrowser };
}

/** „Funkplan als PDF" und „Funkplan als HTML" als Einträge eines Menüs. */
export function Ausgabeeintraege({
  titel,
  bedienung,
  waehle,
}: {
  readonly titel: string;
  readonly bedienung: Ausgabebedienung;
  readonly waehle: Waehle;
}): React.JSX.Element {
  return (
    <>
      {!bedienung.imBrowser && <Menueeintrag text={`${titel} als PDF`} aufWahl={waehle(() => { bedienung.erzeuge("pdf"); })} />}
      <Menueeintrag
        text={`${titel} als HTML`}
        titel="Zum Drucken im Browser oder zum Weitergeben"
        aufWahl={waehle(() => { bedienung.erzeuge("html"); })}
      />
    </>
  );
}

/** Die erzeugte Datei neben dem Menü, mit „Öffnen". */
export function Ausgabepfad({ bedienung }: { readonly bedienung: Ausgabebedienung }): React.JSX.Element | null {
  return bedienung.pfad === undefined ? null : <Ausgabedatei pfad={bedienung.pfad} vorsatz="Geschrieben" />;
}
