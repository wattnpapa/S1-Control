/**
 * Die Werkzeugzeile des Blattes „Funkplan" (Option 5b): Umschalter der drei
 * Sichten, „Rufgruppe anlegen" (Strg+N), „Funkprobe eintragen" (Strg+P) und
 * „kein Kontakt …" für die markierte Einheit, die Schwelle „kein Kontakt",
 * die Suche (Strg+F) und der Funkplan als Ausgabe.
 *
 * **Die Schwelle steht hier und nicht bei den Kostenparametern.** Sie ist ein
 * Parameter des Einsatzes wie diese (Entscheidung 4), aber eingestellt wird
 * sie dort, wo sie wirkt — wie die Mahlzeitenregel im Blatt „Versorgung" und
 * nicht im Blatt „Kosten". Die Vermeldezentrale sieht die Bernsteinmarken und
 * stellt die Schwelle daneben ein.
 */

import type { Funkteilnehmer } from "@s1/domaene";

import { funkSchwelleSetzen } from "../kontrakt/funkschritte.js";
import type { Funksicht } from "./Funkzuordnung.js";
import { hinweisAusErgebnis } from "./Anlegeversuch.js";
import { useLaden } from "./laden.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { Versorgungsausgabe } from "./Versorgungsausgabe.js";

export const SICHTEN: readonly { readonly schluessel: Funksicht; readonly titel: string }[] = [
  { schluessel: "rufgruppe", titel: "Je Rufgruppe" },
  { schluessel: "bereich", titel: "Je Bereich" },
  { schluessel: "funkproben", titel: "Funkproben" },
];

/** Die Schwellen zur Wahl, in Minuten; eine anders gesetzte steht zusätzlich in der Liste. */
export const SCHWELLEN = [15, 30, 45, 60, 90, 120, 180, 240] as const;

/** „Schwelle 60 min" — schreibt `FunkParameterGesetzt` mit der gezeigten Schwelle als Vorher-Wert. */
function Funkschwelle({ schwelleMinuten, nurLesen }: { readonly schwelleMinuten: number; readonly nurLesen: boolean }): React.JSX.Element {
  const einsatzId = useLaden((z) => z.lagebild?.einsatzId);
  const bediene = useLaden((z) => z.bediene);
  const melde = useLaden((z) => z.melde);
  const wahl = [...new Set<number>([...SCHWELLEN, schwelleMinuten])].sort((a, b) => a - b);
  const setze = (neu: number): void => {
    const entwurf = einsatzId === undefined ? undefined : funkSchwelleSetzen(einsatzId, schwelleMinuten, neu);
    if (entwurf === undefined) return;
    void bediene(entwurf).then((ergebnis) => {
      const hinweis = hinweisAusErgebnis(ergebnis);
      if (hinweis !== undefined) melde("warnung", `Schwelle „kein Kontakt“: ${hinweis}`);
    });
  };
  return (
    <label className="funkschwelle" title="Ab wann eine Einheit ohne Kontakt Bernstein wird — gilt für alle Arbeitsplätze">
      Schwelle{" "}
      <select aria-label="Schwelle „kein Kontakt“ in Minuten" value={schwelleMinuten} disabled={nurLesen} onChange={(e) => setze(Number(e.target.value))}>
        {wahl.map((minuten) => (
          <option key={minuten} value={minuten}>
            {minuten} min
          </option>
        ))}
      </select>
    </label>
  );
}

export interface WerkzeugzeileEigenschaften {
  readonly sicht: Funksicht;
  readonly aufSicht: (sicht: Funksicht) => void;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  /** Fehlt im beendeten Einsatz: Dann gibt es nichts anzulegen. */
  readonly aufAnlegen: (() => void) | undefined;
  /** Die markierte Einheit der Zuordnung — Ziel der Funkprobe; ohne sie sind die Knöpfe gesperrt. */
  readonly markiert: Funkteilnehmer | undefined;
  readonly aufKontakt: () => void;
  readonly aufKeinKontakt: () => void;
  /** Fehlt, solange der Plan nicht geladen ist. */
  readonly schwelleMinuten: number | undefined;
  readonly nurLesen: boolean;
}

/** „Funkprobe eintragen" und „kein Kontakt …" für die markierte Einheit. */
function Funkprobenknoepfe(props: WerkzeugzeileEigenschaften): React.JSX.Element | null {
  if (props.nurLesen) return null;
  const ohne = props.markiert === undefined;
  const fuer = ohne ? "Erst eine Einheit in der Zuordnung markieren" : `für ${props.markiert.einheit}`;
  return (
    <>
      <button type="button" disabled={ohne} onClick={props.aufKontakt} title={`Funkprobe „Kontakt“ ${fuer} · ${kuerzelText(kuerzel("funkprobe") as never)}`}>
        Funkprobe eintragen
      </button>
      <button type="button" disabled={ohne} onClick={props.aufKeinKontakt} title={`Funkprobe ohne Kontakt ${fuer}; fragt nach dem Grund`}>
        kein Kontakt …
      </button>
    </>
  );
}

/** Umschalter, „Rufgruppe anlegen", Funkprobe, Schwelle, Suche und die Ausgabe. */
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
        <button type="button" className="haupt" onClick={props.aufAnlegen} title={kuerzelText(kuerzel("anlegen") as never)}>
          Rufgruppe anlegen
        </button>
      )}
      <Funkprobenknoepfe {...props} />
      {props.schwelleMinuten !== undefined && <Funkschwelle schwelleMinuten={props.schwelleMinuten} nurLesen={props.nurLesen} />}
      <input
        id="funkplansuche"
        type="search"
        className="funksuche"
        aria-label="Suche nach Einheit, Funkrufname, Rufgruppe oder Funkhinweis"
        placeholder={`Suchen … ${kuerzelText(kuerzel("suchen") as never)}`}
        value={props.suche}
        onChange={(e) => props.aufSuche(e.target.value)}
      />
      <span className="werkzeugrechts">
        <Versorgungsausgabe ausgabe="funkplan" titel="Funkplan" />
      </span>
    </div>
  );
}
