/**
 * „Vom Papier nachtragen“ in der Nachrichtenmaske (Audit Fernmelder P2-3,
 * P2-9; KONZEPT-NACHRICHTEN.md §6 „Papier-Rückfall“).
 *
 * Nach einem Ausfall liegen Vordrucke auf dem Tisch, deren Zeiten,
 * Handzeichen und Nummer längst feststehen. Zwei Dinge standen dem Nachtrag
 * im Weg:
 *
 * - **„jetzt“ als Vorbelegung** (P2-3): Abfassungszeit, Aufnahme und Quittung
 *   standen mit der Wanduhr da; wer eine Zeit übersah, schrieb die Uhrzeit des
 *   Nachtrags ins Betriebsbuch. Im Nachtrag sind die Zeiten leer, mit dem
 *   Platzhalter „vom Blatt“, und eine alte Zeit ist kein Hinweis wert.
 * - **Vier Masken für einen Ausgang** (P2-9): Verfassen, Annehmen, Befördern,
 *   Nachweisen. Hier stehen für einen Ausgang Annahme (Uhrzeit, Hdz),
 *   Beförderung (Mittel, Datum/Uhrzeit, Hdz, Gegenstelle) und Nummer im
 *   selben Vordruck, und „Nachtragen“ schreibt alles in einem Zug.
 *
 * Geschrieben wird `NachrichtVerfasst` mit der Nummer als Folgewert
 * (`nachrichtenfolge.nachweis`). Seit dem zweiten Durchlauf kennt der Kontrakt
 * auch `annahme` und `befoerderung` als Folgewerte der Anlage
 * (`nachrichtAufnehmen(anlage, { …, annahme, befoerderung })`); der Worker
 * schreibt sie in derselben Warteschlange, die Beförderung samt ihren Folgen
 * (Kopien, Kontakt). {@link nachtragFolge} liefert die Werte dafür.
 *
 * Keine Plausibilitätssperre für alte Zeiten: Papier geht vor (§6).
 */

import { NACHRICHT_MITTEL, projektion, type Nachweisvermerk } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import type { Nachrichtenfolge } from "../kontrakt/fmzschritte.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { nummerAusEingabe, nummerWarnung } from "./fmzformate.js";
import { handzeichenPflicht, zeitAusEingabe } from "./nachrichtenformate.js";
import { GEGENSTELLE_BESCHRIFTUNG, GEGENSTELLE_HILFE } from "./gegenstellentext.js";

/** Der Platzhalter der leeren Zeitfelder im Nachtrag. */
export const PLATZHALTER_VOM_BLATT = "vom Blatt";

/** Der Satz, wenn der zweite Schritt (die Beförderung) nicht geschrieben wurde. */
/** Die Vermerke der FmZ eines Ausgangs vom Blatt, wie getippt. */
export interface Nachtragswerte {
  readonly annahmeZeit: string;
  readonly annahmeHz: string;
  readonly mittel: string;
  readonly befoerderungZeit: string;
  readonly befoerderungHz: string;
  readonly gegenstelle: string;
  readonly nummer: string;
}

/** Leer bis auf das Mittel: Nichts aus der Wanduhr (§6 „Papier-Rückfall“). */
export function nachtragVorlage(naechsteNummer?: number): Nachtragswerte {
  return { annahmeZeit: "", annahmeHz: "", mittel: "FUNK", befoerderungZeit: "", befoerderungHz: "", gegenstelle: "", nummer: naechsteNummer === undefined ? "" : String(naechsteNummer) };
}

/** Ein Vermerk aus Zeit und Handzeichen — `undefined`, wenn die Zeit leer ist. */
function vermerkAus(zeit: string, hz: string, jetzt: Date): { readonly zeitpunkt: string; readonly handzeichen: string } | undefined {
  const zeitpunkt = zeitAusEingabe(zeit, jetzt);
  return zeitpunkt === undefined ? undefined : { zeitpunkt, handzeichen: hz.trim() };
}

/** Was vor „Nachtragen“ fehlt; leere Vermerke sind erlaubt (nicht alles steht auf jedem Blatt). */
export function nachtragfehler(werte: Nachtragswerte, jetzt: Date = new Date()): readonly string[] {
  const fehler: string[] = [];
  const pruefe = (zeit: string, hz: string, name: string): void => {
    if (zeit.trim() === "") return;
    if (zeitAusEingabe(zeit, jetzt) === undefined) fehler.push(`Zeit der ${name} lesbar eintragen`);
    else if (handzeichenPflicht(hz) !== undefined) fehler.push(`Handzeichen der ${name} eintragen (zwei bis vier Zeichen)`);
  };
  pruefe(werte.annahmeZeit, werte.annahmeHz, "Annahme");
  pruefe(werte.befoerderungZeit, werte.befoerderungHz, "Beförderung");
  if (werte.nummer.trim() !== "" && nummerAusEingabe(werte.nummer) === undefined) fehler.push("Nummer als ganze Zahl ab 1 eintragen oder leer lassen");
  return fehler;
}

/** Die Nummer als Folgewert der Anlage, mit Zeit und Handzeichen der Annahme (sonst der Beförderung). */
export function nachtragNachweis(werte: Nachtragswerte, jetzt: Date = new Date()): Nachweisvermerk | undefined {
  const nummer = nummerAusEingabe(werte.nummer);
  const vermerk = vermerkAus(werte.annahmeZeit, werte.annahmeHz, jetzt) ?? vermerkAus(werte.befoerderungZeit, werte.befoerderungHz, jetzt);
  return nummer === undefined || vermerk === undefined ? undefined : { nummer, ...vermerk };
}

/**
 * Annahme, Beförderung und Nummer vom Blatt als Folgewerte der Anlage
 * (Fernmelder P2-9): ein Bedienschritt statt zwei. Ohne eigene Annahme
 * gelten Zeit und Hdz der Beförderung (LdF P0-1); was leer ist, fehlt.
 */
export function nachtragFolge(werte: Nachtragswerte, jetzt: Date = new Date()): Pick<Nachrichtenfolge, "annahme" | "befoerderung" | "nachweis"> {
  const befoerderung = vermerkAus(werte.befoerderungZeit, werte.befoerderungHz, jetzt);
  const annahme = vermerkAus(werte.annahmeZeit, werte.annahmeHz, jetzt) ?? befoerderung;
  const nachweis = nachtragNachweis(werte, jetzt);
  const gegenstelle = werte.gegenstelle.trim();
  return {
    ...(annahme === undefined ? {} : { annahme }),
    ...(befoerderung === undefined ? {} : { befoerderung: { mittel: werte.mittel, ...befoerderung, ...(gegenstelle === "" ? {} : { gegenstelle }) } }),
    ...(nachweis === undefined ? {} : { nachweis }),
  };
}

/**
 * Der `grund` nach „Trotzdem“ am Entwurf (R2-SGL P1-2, Entscheidung 13). Das Kennzeichen des
 * Papier-Nachtrags (`nachrichtenfolge.nachtrag: true`) setzt `nachrichtAufnehmen` selbst, wenn die
 * Folge `nachtrag: true` trägt; der Worker schreibt dann „nachgetragen vom Papier“ ins Tagebuch.
 */
export function mitGrund(entwurf: Entwurf, grund: string | undefined): Entwurf {
  return grund === undefined ? entwurf : { ...entwurf, grund };
}

/** Der Schalter über dem Vordruck — für FmZ und Verfasser (Fernmelder P2-3). */
export function Nachtragsschalter({ an, aufAn }: { readonly an: boolean; readonly aufAn: (an: boolean) => void }): React.JSX.Element {
  return (
    <label className="kaestchen nachtragsschalter" title="Zeiten, Handzeichen und Nummer vom Papiervordruck übernehmen, nicht aus der Uhr">
      <input type="checkbox" checked={an} onChange={(e) => aufAn(e.target.checked)} />
      Vom Papier nachtragen
    </label>
  );
}

export interface NachtragsteilEigenschaften {
  readonly werte: Nachtragswerte;
  readonly aufAenderung: (werte: Nachtragswerte) => void;
  readonly vergebeneNummern?: readonly number[] | undefined;
}

function Hdzfeld({ wert, aufAenderung, name }: { readonly wert: string; readonly aufAenderung: (wert: string) => void; readonly name: string }): React.JSX.Element {
  return (
    <label>
      Hdz {name}
      <input value={wert} maxLength={4} placeholder={PLATZHALTER_VOM_BLATT} onChange={(e) => aufAenderung(e.target.value)} />
    </label>
  );
}

/** Der obere Teil eines Ausgangs vom Blatt: Annahme, Beförderung, Nummer in einem Zug (Fernmelder P2-9). */
export function Nachtragsteil({ werte, aufAenderung, vergebeneNummern }: NachtragsteilEigenschaften): React.JSX.Element {
  const setze = (feld: keyof Nachtragswerte) => (wert: string): void => aufAenderung({ ...werte, [feld]: wert });
  const warnung = nummerWarnung(nummerAusEingabe(werte.nummer), vergebeneNummern);
  return (
    <fieldset className="vordruckteil" aria-label="Vermerke der Fernmeldezentrale vom Blatt">
      <legend>Fernmeldezentrale · vom Blatt</legend>
      <div className="vordruckzeile">
        <Dtgfeld beschriftung="Annahme" wert={werte.annahmeZeit} aufAenderung={setze("annahmeZeit")} platzhalter={PLATZHALTER_VOM_BLATT} nachtrag />
        <Hdzfeld name="Annahme" wert={werte.annahmeHz} aufAenderung={setze("annahmeHz")} />
      </div>
      <div className="vordruckzeile">
        <label>
          Mittel
          <select value={werte.mittel} onChange={(e) => setze("mittel")(e.target.value)}>
            {NACHRICHT_MITTEL.map((m) => (
              <option key={m} value={m}>
                {projektion.mittelWort(m)}
              </option>
            ))}
          </select>
        </label>
        <Dtgfeld beschriftung="Beförderung" wert={werte.befoerderungZeit} aufAenderung={setze("befoerderungZeit")} platzhalter={PLATZHALTER_VOM_BLATT} nachtrag />
        <Hdzfeld name="Beförderung" wert={werte.befoerderungHz} aufAenderung={setze("befoerderungHz")} />
      </div>
      <div className="vordruckzeile">
        <label>
          {GEGENSTELLE_BESCHRIFTUNG}
          <input value={werte.gegenstelle} title={GEGENSTELLE_HILFE} placeholder={PLATZHALTER_VOM_BLATT} onChange={(e) => setze("gegenstelle")(e.target.value)} />
        </label>
        <label>
          Nr.
          <input value={werte.nummer} inputMode="numeric" className="mono" placeholder={PLATZHALTER_VOM_BLATT} onChange={(e) => setze("nummer")(e.target.value)} />
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

