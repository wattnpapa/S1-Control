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
 * Geschrieben wird hier nichts: Die Werte gehen mit „Aufnehmen" oder
 * „Aufgeben" als Folgen der Anlage an den Worker (`nachrichtAufnehmen`).
 */

import { NACHRICHT_MITTEL, datumZeitGruppe, projektion, type Sichtungsvermerk } from "@s1/domaene";

import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung, type Aufnahmewerte } from "./fmzformate.js";
import { VERTEILER_VORBELEGUNG, Verteilermatrix, type Verteilerwahl } from "./Laufzettel.js";
import { zeitAusEingabe } from "./nachrichtenformate.js";

export interface AufnahmeEigenschaften {
  readonly werte: Aufnahmewerte;
  readonly aufAenderung: (werte: Aufnahmewerte) => void;
  readonly vergebeneNummern: readonly number[] | undefined;
}

/** Der obere Teil zum Ausfüllen — nur für die FmZ beim Aufnehmen eines Eingangs. */
export function Aufnahmeteil({ werte, aufAenderung, vergebeneNummern }: AufnahmeEigenschaften): React.JSX.Element {
  const setze = (feld: keyof Aufnahmewerte, wert: string): void => aufAenderung({ ...werte, [feld]: wert });
  const warnung = nummerWarnung(nummerAusEingabe(werte.nummer), vergebeneNummern);
  return (
    <fieldset className="vordruckteil" aria-label="Aufnahmevermerk der Fernmeldezentrale">
      <legend>Fernmeldezentrale · Aufnahme</legend>
      <div className="vordruckzeile">
        <label>
          Mittel
          <select value={werte.mittel} onChange={(e) => setze("mittel", e.target.value)}>
            {NACHRICHT_MITTEL.map((m) => (
              <option key={m} value={m}>
                {projektion.mittelWort(m)}
              </option>
            ))}
          </select>
        </label>
        <Dtgfeld beschriftung="Aufnahme" wert={werte.zeit} aufAenderung={(wert) => setze("zeit", wert)} />
        <label>
          Handzeichen
          <input value={werte.handzeichen} maxLength={20} onChange={(e) => setze("handzeichen", e.target.value)} />
        </label>
      </div>
      <div className="vordruckzeile">
        <label>
          Gegenstelle
          <input value={werte.gegenstelle} placeholder="z. B. Heros Wildeshausen" onChange={(e) => setze("gegenstelle", e.target.value)} />
        </label>
        <label>
          Nr. (E)
          <input value={werte.nummer} inputMode="numeric" className="mono" title="Vorbelegt mit der nächsten Nummer; leer lassen, wenn die Nummer später vergeben wird" onChange={(e) => setze("nummer", e.target.value)} />
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
  if (zeitpunkt === undefined || werte.handzeichen.trim() === "") return undefined;
  const vermerke = werte.vermerke.trim();
  return { zeitpunkt, handzeichen: werte.handzeichen.trim(), verteiler: werte.verteiler.map((e) => ({ ...e })), ...(vermerke === "" ? {} : { vermerke }) };
}

export interface VerteilEigenschaften {
  readonly werte: Verteilwerte;
  readonly aufAenderung: (werte: Verteilwerte) => void;
  /** Der Satz über dem Laufzettel: warum hier verteilt wird. */
  readonly grund: string;
}

/** Der untere Teil zum Ausfüllen — Ersatzsichter und Gesprächsnotiz. */
export function Verteilteil({ werte, aufAenderung, grund }: VerteilEigenschaften): React.JSX.Element {
  return (
    <fieldset className="vordruckteil laufzettel" aria-label="Laufzettel">
      <legend>Laufzettel</legend>
      <p className="hinweistext">{grund}</p>
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Quittung" wert={werte.quittung} aufAenderung={(quittung) => aufAenderung({ ...werte, quittung })} />
        <label>
          Handzeichen
          <input value={werte.handzeichen} maxLength={20} onChange={(e) => aufAenderung({ ...werte, handzeichen: e.target.value })} />
        </label>
      </div>
      <Verteilermatrix verteiler={werte.verteiler} aufAenderung={(verteiler) => aufAenderung({ ...werte, verteiler })} />
      <label>
        Vermerke
        <textarea rows={2} value={werte.vermerke} onChange={(e) => aufAenderung({ ...werte, vermerke: e.target.value })} />
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
