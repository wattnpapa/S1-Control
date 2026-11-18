/**
 * Die beiden Teile des Vordrucks, die die Maske nur in bestimmten Lagen
 * freischaltet (KONZEPT-NACHRICHTEN.md §5, §6, Schnitt N2).
 *
 * - **Oben** (Feld 1 bis 6) der Aufnahmevermerk: Nimmt die FmZ einen Eingang
 *   auf, trägt sie Mittel, Datum/Uhrzeit, Handzeichen, Gegenstelle und die
 *   Nummer der Nachweisung ein. Die Nummer ist mit der nächsten vorbelegt und
 *   darf leer bleiben (Entscheidung 2); eine schon vergebene wird gewarnt,
 *   nicht gesperrt (§9).
 * - **Unten** (Feld 18 bis 20) der Laufzettel: Steht kein Sichter in der
 *   Präsenz, verteilt, wer aufnimmt; die Gesprächsnotiz verteilt ihr
 *   Verfasser selbst (§5 „Ersatzsichter", „Gesprächsnotiz"). S2 ist rot
 *   vorbelegt, nicht erzwungen — wie im Laufzettel des Sichters.
 *
 * Nach den Audits vom 2026-11-17: Die Anschrift ist im Laufzettel als grüne
 * Hauptempfängerkopie vorbelegt, S2 bleibt rot (Sachgebietsleiter P1-3,
 * Fernmelder P1-4); ohne grüne Kopie warnt der Laufzettel. Die Felder des
 * oberen Teils tragen die Tabulatorfolge der Aufnahme (Fernmelder P1-2):
 * Mittel, Uhrzeit, Gegenstelle, dann Absender, Anschrift, Vorrang, Betreff,
 * Inhalt und der Knopf. Zweite Runde (R2-FM P1-1): Handzeichen, Nr. und der
 * Laufzettel gehören dazu (`aufnahmefolge.ts`), das Mittel trägt den
 * Startfokus statt des Schalters „Vom Papier nachtragen“ (R2-FM P2-2).
 *
 * Geschrieben wird hier nichts: Die Werte gehen mit „Aufnehmen" oder
 * „Aufgeben" als Folgen der Anlage an den Worker (`nachrichtAufnehmen`).
 */

import { NACHRICHT_MITTEL, datumZeitGruppe, projektion, type Sichtungsvermerk } from "@s1/domaene";

import { AUFNAHMEFOLGE, aufnahmeplatz } from "./aufnahmefolge.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung, type Aufnahmewerte } from "./fmzformate.js";
import { handzeichenPflicht, zeitAusEingabe } from "./nachrichtenformate.js";
import { VERTEILER_VORBELEGUNG, Verteilermatrix, hauptempfaengerWarnung, type Verteilerwahl } from "./Verteilerraster.js";
import { GEGENSTELLE_BESCHRIFTUNG, GEGENSTELLE_HILFE } from "./gegenstellentext.js";

export interface AufnahmeEigenschaften {
  readonly werte: Aufnahmewerte;
  readonly aufAenderung: (werte: Aufnahmewerte) => void;
  readonly vergebeneNummern: readonly number[] | undefined;
  /** Additiv (Fernmelder P2-3): im Nachtrag vom Papier „vom Blatt“ im leeren Zeitfeld. */
  readonly platzhalter?: string | undefined;
}

/** Der obere Teil zum Ausfüllen — nur für die FmZ beim Aufnehmen eines Eingangs. */
export function Aufnahmeteil({ werte, aufAenderung, vergebeneNummern, platzhalter }: AufnahmeEigenschaften): React.JSX.Element {
  const setze = (feld: keyof Aufnahmewerte, wert: string): void => aufAenderung({ ...werte, [feld]: wert });
  const warnung = nummerWarnung(nummerAusEingabe(werte.nummer), vergebeneNummern);
  return (
    <fieldset className="vordruckteil" aria-label="Aufnahmevermerk der Fernmeldezentrale">
      <legend>Fernmeldezentrale · Aufnahme</legend>
      <div className="vordruckzeile">
        <label>
          Mittel
          <select value={werte.mittel} data-tabfolge={AUFNAHMEFOLGE.mittel} data-startfokus="" onChange={(e) => setze("mittel", e.target.value)}>
            {NACHRICHT_MITTEL.map((m) => (
              <option key={m} value={m}>
                {projektion.mittelWort(m)}
              </option>
            ))}
          </select>
        </label>
        <Dtgfeld beschriftung="Aufnahme" wert={werte.zeit} tabfolge={AUFNAHMEFOLGE.zeit} aufAenderung={(wert) => setze("zeit", wert)} platzhalter={platzhalter} nachtrag={platzhalter !== undefined} />
        <label>
          Handzeichen
          {/* R2-FM P1-1: Handzeichen und Nr. gehören in die Folge der Aufnahme. */}
          <input value={werte.handzeichen} maxLength={4} data-tabfolge={AUFNAHMEFOLGE.handzeichen} onChange={(e) => setze("handzeichen", e.target.value)} />
        </label>
      </div>
      <div className="vordruckzeile">
        <label>
          {GEGENSTELLE_BESCHRIFTUNG}
          <input value={werte.gegenstelle} title={GEGENSTELLE_HILFE} data-tabfolge={AUFNAHMEFOLGE.gegenstelle} placeholder="z. B. Heros Wildeshausen" onChange={(e) => setze("gegenstelle", e.target.value)} />
        </label>
        <label>
          Nr.
          <input value={werte.nummer} inputMode="numeric" className="mono" data-tabfolge={AUFNAHMEFOLGE.nummer} placeholder={platzhalter} title={platzhalter === undefined ? "Vorbelegt mit der nächsten Nummer; leer lassen, wenn die Nummer später vergeben wird" : "Die Nummer vom Blatt; im Nachtrag nicht vorbelegt (R2-LdF P3-7)"} onChange={(e) => setze("nummer", e.target.value)} />
        </label>
      </div>
      {warnung !== undefined && (
        <p className="warnung" role="alert">
          {warnung}
        </p>
      )}
    </fieldset>
  );
}

/** Der Laufzettel in der Maske, wie getippt. */
export interface Verteilwerte {
  readonly quittung: string;
  readonly handzeichen: string;
  readonly verteiler: readonly Verteilerwahl[];
  readonly vermerke: string;
}

export function verteilVorlage(handzeichen: string, jetzt: Date = new Date()): Verteilwerte {
  return { quittung: datumZeitGruppe(jetzt), handzeichen, verteiler: VERTEILER_VORBELEGUNG, vermerke: "" };
}

/** Die Sichtung aus dem Laufzettel der Maske; `undefined`, solange Zeit oder Handzeichen fehlen. */
export function sichtungAus(werte: Verteilwerte, jetzt: Date = new Date()): Sichtungsvermerk | undefined {
  const zeitpunkt = zeitAusEingabe(werte.quittung, jetzt);
  if (zeitpunkt === undefined || handzeichenPflicht(werte.handzeichen) !== undefined) return undefined;
  const vermerke = werte.vermerke.trim();
  return { zeitpunkt, handzeichen: werte.handzeichen.trim(), verteiler: werte.verteiler.map((e) => ({ ...e })), ...(vermerke === "" ? {} : { vermerke }) };
}

export interface VerteilEigenschaften {
  readonly werte: Verteilwerte;
  readonly aufAenderung: (werte: Verteilwerte) => void;
  /** Der Satz über dem Laufzettel: warum hier verteilt wird. */
  readonly grund: string;
  /** Additiv: die Anschrift — „S2“ als Anschrift ist ein Hauptempfänger (zweiter Durchlauf, Punkt 3). */
  readonly anschrift?: string;
  readonly eigeneFuest?: string | undefined;
  /** Additiv (Fernmelder P2-3): im Nachtrag vom Papier „vom Blatt“ im leeren Zeitfeld. */
  readonly platzhalter?: string | undefined;
  /** Additiv (R2-FM P1-1): Quittung, Handzeichen, Raster und Vermerke in der Folge der Aufnahme. */
  readonly tabfolge?: boolean;
}

/** Der untere Teil zum Ausfüllen — Ersatzsichter und Gesprächsnotiz. */
export function Verteilteil({ werte, aufAenderung, grund, anschrift, eigeneFuest, platzhalter, tabfolge = false }: VerteilEigenschaften): React.JSX.Element {
  const warnung = hauptempfaengerWarnung(werte.verteiler, anschrift, eigeneFuest);
  return (
    <fieldset className="vordruckteil laufzettel" aria-label="Laufzettel">
      <legend>Laufzettel</legend>
      <p className="hinweistext">{grund}</p>
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Quittung" wert={werte.quittung} tabfolge={aufnahmeplatz(tabfolge, "quittung")} aufAenderung={(quittung) => aufAenderung({ ...werte, quittung })} platzhalter={platzhalter} nachtrag={platzhalter !== undefined} />
        <label>
          Handzeichen
          <input value={werte.handzeichen} maxLength={4} data-tabfolge={aufnahmeplatz(tabfolge, "laufzettelHandzeichen")} onChange={(e) => aufAenderung({ ...werte, handzeichen: e.target.value })} />
        </label>
      </div>
      <Verteilermatrix verteiler={werte.verteiler} tabfolge={aufnahmeplatz(tabfolge, "raster")} aufAenderung={(verteiler) => aufAenderung({ ...werte, verteiler })} />
      {warnung !== undefined && <p className="warnung">{warnung}</p>}
      <label>
        Vermerke
        <textarea rows={2} value={werte.vermerke} data-tabfolge={aufnahmeplatz(tabfolge, "vermerke")} onChange={(e) => aufAenderung({ ...werte, vermerke: e.target.value })} />
      </label>
    </fieldset>
  );
}

/** Der Schalter der Gesprächsnotiz (§5): selbst verteilen oder an den Sichter. */
export function Verteilschalter({ selbst, aufSelbst, sichterDa }: { readonly selbst: boolean; readonly aufSelbst: (selbst: boolean) => void; readonly sichterDa: boolean }): React.JSX.Element {
  return (
    <div className="umschalter" role="group" aria-label="Verteilung der Gesprächsnotiz">
      <button type="button" aria-pressed={selbst} onClick={() => aufSelbst(true)}>
        Selbst verteilen
      </button>
      <button type="button" aria-pressed={!selbst} disabled={!sichterDa} title={sichterDa ? "Die Gesprächsnotiz läuft zum Sichter wie ein Eingang" : "Kein Sichter besetzt — wer aufgibt, verteilt selbst"} onClick={() => aufSelbst(false)}>
        An den Sichter
      </button>
    </div>
  );
}
