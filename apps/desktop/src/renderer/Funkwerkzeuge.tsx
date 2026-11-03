/**
 * Die Werkzeugzeile des Blattes „Funkplan" (Option 5b, seit Runde 6 nach
 * Option 6f): Umschalter der drei Sichten, der Hauptknopf „Rufgruppe
 * anlegen" (Strg+N), die Suche (Strg+F) und das Menü „⋯" mit der Schwelle
 * „kein Kontakt" und dem Funkplan als Ausdruck.
 *
 * „Funkprobe eintragen" und „kein Kontakt …" stehen nicht mehr hier,
 * sondern in der Auswahlleiste der gewählten Einheit (`Funkauswahl.tsx`):
 * Eine Funkprobe gilt einer Einheit (Entwurf „Entlastung", 3.7).
 *
 * **Die Schwelle steht im Blatt und nicht bei den Kostenparametern.** Sie
 * ist ein Parameter des Einsatzes wie diese (Entscheidung 4), aber
 * eingestellt wird sie dort, wo sie wirkt — wie die Mahlzeitenregel im
 * Blatt „Versorgung". Gewählt wird sie im Menü „⋯" wie das
 * Erscheinungsbild im Fenstermenü: eine Gruppe mit Häkchen am geltenden
 * Wert.
 */

import { funkSchwelleSetzen } from "../kontrakt/funkschritte.js";
import type { Funksicht } from "./Funkzuordnung.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { Klappmenue, type Waehle } from "./Klappmenue.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { Ausgabeeintraege, Ausgabepfad, useAusgabe } from "./Versorgungsausgabe.js";

export const SICHTEN: readonly { readonly schluessel: Funksicht; readonly titel: string }[] = [
  { schluessel: "rufgruppe", titel: "Je Rufgruppe" },
  { schluessel: "bereich", titel: "Je Bereich" },
  { schluessel: "funkproben", titel: "Funkproben" },
];

/** Die Schwellen zur Wahl, in Minuten; eine anders gesetzte steht zusätzlich in der Liste. */
export const SCHWELLEN = [15, 30, 45, 60, 90, 120, 180, 240] as const;

/** Schreibt `FunkParameterGesetzt` mit der gezeigten Schwelle als Vorher-Wert. */
function useSchwelleSetzen(schwelleMinuten: number): (neu: number) => void {
  const einsatzId = useLaden((z) => z.lagebild?.einsatzId);
  const bediene = useLaden((z) => z.bediene);
  const melde = useLaden((z) => z.melde);
  return (neu) => {
    if (neu === schwelleMinuten) return;
    const entwurf = einsatzId === undefined ? undefined : funkSchwelleSetzen(einsatzId, schwelleMinuten, neu);
    if (entwurf === undefined) return;
    void bediene(entwurf).then((ergebnis) => {
      const hinweis = hinweisAusErgebnis(ergebnis);
      if (hinweis !== undefined) melde("warnung", `Schwelle „kein Kontakt“: ${hinweis}`);
    });
  };
}

interface SchwellenwahlEigenschaften {
  readonly schwelleMinuten: number;
  readonly nurLesen: boolean;
  readonly waehle: Waehle;
}

/** „Schwelle „kein Kontakt": 60 min" als Gruppe im Menü, Häkchen am geltenden Wert. */
function Schwellenwahl({ schwelleMinuten, nurLesen, waehle }: SchwellenwahlEigenschaften): React.JSX.Element {
  const setze = useSchwelleSetzen(schwelleMinuten);
  const wahl = [...new Set<number>([...SCHWELLEN, schwelleMinuten])].sort((a, b) => a - b);
  return (
    <div role="group" aria-label="Schwelle „kein Kontakt“ in Minuten">
      <span className="titel" aria-hidden="true" title="Ab wann eine Einheit ohne Kontakt Bernstein wird — gilt für alle Arbeitsplätze">
        Schwelle „kein Kontakt“: {schwelleMinuten} min
      </span>
      {wahl.map((minuten) => (
        <button
          key={minuten}
          type="button"
          role="menuitemradio"
          aria-checked={minuten === schwelleMinuten}
          aria-disabled={nurLesen ? true : undefined}
          title={nurLesen ? TEXT_NUR_LESEN : "Gilt für alle Arbeitsplätze"}
          onClick={nurLesen ? undefined : waehle(() => { setze(minuten); })}
        >
          {minuten} min
        </button>
      ))}
    </div>
  );
}

/** Das Menü „⋯" rechts: Schwelle und Ausdruck, daneben die erzeugte Datei. */
function Funkmenue({ schwelleMinuten, nurLesen }: { readonly schwelleMinuten: number | undefined; readonly nurLesen: boolean }): React.JSX.Element {
  const ausgabe = useAusgabe("funkplan");
  const schwelle = schwelleMinuten === undefined ? "" : `Schwelle ${String(schwelleMinuten)} min, `;
  return (
    <>
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "⋯", klasse: "menueknopf", beschriftung: "Weitere Schritte im Funkplan", titel: `${schwelle}Funkplan als Ausdruck` }}
        menue={{ beschriftung: "Funkplan", id: "funkplanmenue" }}
        inhalt={(waehle) => (
          <>
            {schwelleMinuten !== undefined && <Schwellenwahl schwelleMinuten={schwelleMinuten} nurLesen={nurLesen} waehle={waehle} />}
            {schwelleMinuten !== undefined && <hr />}
            <span className="titel" aria-hidden="true">
              Ausdruck
            </span>
            <Ausgabeeintraege titel="Funkplan" bedienung={ausgabe} waehle={waehle} />
          </>
        )}
      />
      <Ausgabepfad bedienung={ausgabe} />
    </>
  );
}

export interface WerkzeugzeileEigenschaften {
  readonly sicht: Funksicht;
  readonly aufSicht: (sicht: Funksicht) => void;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  /** Fehlt im beendeten Einsatz: Dann gibt es nichts anzulegen. */
  readonly aufAnlegen: (() => void) | undefined;
  /** Fehlt, solange der Plan nicht geladen ist. */
  readonly schwelleMinuten: number | undefined;
  readonly nurLesen: boolean;
}

/** Umschalter, „Rufgruppe anlegen", Suche und „⋯". */
export function Werkzeugzeile(props: WerkzeugzeileEigenschaften): React.JSX.Element {
  return (
    <div className="werkzeugzeile">
      <div className="umschalter" role="group" aria-label="Sicht">
        {SICHTEN.map((eintrag) => (
          <button key={eintrag.schluessel} type="button" aria-pressed={props.sicht === eintrag.schluessel} onClick={() => props.aufSicht(eintrag.schluessel)}>
            {eintrag.titel}
          </button>
        ))}
      </div>
      {props.aufAnlegen !== undefined && (
        <button type="button" className="haupt" onClick={props.aufAnlegen} title={`Neue Rufgruppe anlegen (${kuerzelText(kuerzel("anlegen") as never)})`}>
          Rufgruppe anlegen
        </button>
      )}
      <span className="werkzeugrechts">
        <input
          id="funkplansuche"
          type="search"
          className="funksuche"
          aria-label="Suche nach Einheit, Funkrufname, Rufgruppe oder Funkhinweis"
          placeholder={`Suchen … ${kuerzelText(kuerzel("suchen") as never)}`}
          value={props.suche}
          onChange={(e) => props.aufSuche(e.target.value)}
        />
        <Funkmenue schwelleMinuten={props.schwelleMinuten} nurLesen={props.nurLesen} />
      </span>
    </div>
  );
}
