/**
 * „Nachweisung ausgeben“ mit Zeitraum (R2-LdF P2-6) — aus `Nachweisung.tsx`
 * herausgelöst und um zwei Zeitfelder „von“ und „bis“ ergänzt.
 *
 * Die Schichtübergabe um 08:00 und 20:00 braucht den Ausschnitt der Schicht;
 * die Ausgabe nahm `von`/`bis` (Kontrakt, LdF P2-5), die Oberfläche bot sie
 * nicht an, und nach zwölf Stunden kam immer die ganze Nachweisung. Beide
 * Felder lesen Datum-Zeit-Gruppe oder Funkzeit wie jedes Zeitfeld des
 * Vordrucks („0800“, „180800nov26“); leer heißt „ohne Grenze“. Ein unlesbares
 * Feld sperrt den Knopf und sagt es.
 *
 * Geschrieben wird über den Ruf `ausgabeErzeugen` wie bei allen Ausgaben;
 * danach steht die Datei mit „Öffnen“ daneben (`Ausgabedatei`).
 */

import { useState } from "react";

import { Ausgabedatei } from "./Ausgabedatei.js";
import { rufe } from "./bruecke.js";
import { Klappmenue, Menueeintrag } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { zeitAusEingabe } from "./nachrichtenformate.js";

export interface Zeitraum {
  readonly von?: string;
  readonly bis?: string;
}

/** Der Zeitraum aus den Feldern; `string` ist der Satz, was nicht lesbar ist. */
export function zeitraumAus(von: string, bis: string, jetzt: Date = new Date()): Zeitraum | string {
  const a = von.trim() === "" ? undefined : zeitAusEingabe(von, jetzt);
  const b = bis.trim() === "" ? undefined : zeitAusEingabe(bis, jetzt);
  if (von.trim() !== "" && a === undefined) return "„von“ lesbar eintragen, etwa „0800“";
  if (bis.trim() !== "" && b === undefined) return "„bis“ lesbar eintragen, etwa „2000“";
  if (a !== undefined && b !== undefined && Date.parse(a) > Date.parse(b)) return "„von“ liegt nach „bis“";
  return { ...(a === undefined ? {} : { von: a }), ...(b === undefined ? {} : { bis: b }) };
}

/** Schreibt die Nachweisung im Zeitraum; der Pfad oder `undefined` mit Hinweis. */
async function erzeuge(format: "pdf" | "html", zeitraum: Zeitraum): Promise<string | undefined> {
  const akteId = useLaden.getState().akteId;
  if (akteId === undefined) return undefined;
  try {
    const ergebnis = await rufe({ art: "ausgabeErzeugen", akteId, ausgabe: "nachweisung", format, ...zeitraum });
    return ergebnis.pfad;
  } catch (fehler) {
    useLaden.getState().melde("warnung", `Nachweisung nicht geschrieben: ${fehler instanceof Error ? fehler.message : String(fehler)}`);
    return undefined;
  }
}

/** Zwei Zeitfelder und das Menü „Nachweisung als PDF/HTML“, daneben die erzeugte Datei. */
export function Nachweisungsausgabe(): React.JSX.Element {
  const imBrowser = useLaden((z) => z.umgebung?.plattform === "web");
  const [von, setzeVon] = useState("");
  const [bis, setzeBis] = useState("");
  const [pfad, setzePfad] = useState<string | undefined>(undefined);
  const zeitraum = zeitraumAus(von, bis);
  const fehler = typeof zeitraum === "string" ? zeitraum : undefined;
  const los = (format: "pdf" | "html"): void => {
    if (typeof zeitraum === "string") return;
    setzePfad(undefined);
    void erzeuge(format, zeitraum).then(setzePfad);
  };
  return (
    <span className="nachweisungsausgabe">
      <label title="Beginn des Ausschnitts, etwa der Schichtbeginn; leer: von Anfang an">
        von
        <input className="mono zeitfeld" value={von} size={11} placeholder="z. B. 0800" onChange={(e) => setzeVon(e.target.value)} />
      </label>
      <label title="Ende des Ausschnitts; leer: bis jetzt">
        bis
        <input className="mono zeitfeld" value={bis} size={11} placeholder="z. B. 2000" onChange={(e) => setzeBis(e.target.value)} />
      </label>
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "Nachweisung ausgeben", klasse: "", beschriftung: "Nachweisung ausgeben", titel: fehler ?? "Die Nachweisung als Ausdruck (A4 hoch) in den Ordner „ausgaben“", gesperrt: fehler !== undefined }}
        menue={{ beschriftung: "Nachweisung ausgeben", id: "nachweisungsmenue" }}
        inhalt={(waehle) => (
          <>
            {!imBrowser && <Menueeintrag text="Nachweisung als PDF" aufWahl={waehle(() => los("pdf"))} />}
            <Menueeintrag text="Nachweisung als HTML" titel="Zum Drucken im Browser oder zum Weitergeben" aufWahl={waehle(() => los("html"))} />
          </>
        )}
      />
      {fehler !== undefined && <span className="hinweistext">{fehler}</span>}
      {pfad !== undefined && <Ausgabedatei pfad={pfad} vorsatz="Geschrieben" />}
    </span>
  );
}
