/**
 * Der mittlere Teil der Nachrichtenmaske (Feld 7 bis 17): Kästchenzeile,
 * Anschrift, Ruf-Nr., Betreff, Inhalt, Absender, Abfassungszeit, Zeichen und
 * Funktion — herausgelöst aus `Nachrichtenmaske.tsx`, damit jene Datei unter
 * der Strukturgrenze bleibt (AGENTS.md §6). Verhalten wie vorher; neu nach
 * der zweiten Audit-Runde (2026-11-17):
 *
 * - **Tabulatorfolge** (R2-FM P1-1): Bei der Aufnahme führen alle Felder
 *   ihren Platz (`aufnahmefolge.ts`), auch Abfassungszeit, Zeichen und
 *   Funktion, die vorher nur mit der Maus erreichbar waren.
 * - **Startfokus** (R2-FM P2-2, R2-SGL P2-3): Die Anschrift (beim Verfassen)
 *   trägt `data-startfokus`; vorher stand der Fokus auf „Vom Papier
 *   nachtragen“, und das erste Leerzeichen schaltete den Nachtrag ein.
 * - **Tooltips** (R2-FaBe P1-1/P1-2): Spruch/Durchsage, Sofort/Blitz,
 *   Übermittlungswunsch, Abfassungszeit und Gesprächsnotiz sagen in einem
 *   Satz, was sie bedeuten. Wer den Vordruck nicht kennt, riet bisher.
 * - **Abfassungszeit im Eingang** (R2-FM P2-3, alt FM P2-3): Sie ist die
 *   Zeit des Absenders; das Feld ist leer mit Platzhalter „laut Spruch“.
 * - **Gesprächspartner** (R2-FaBe P1-5): Bei gesetzter Gesprächsnotiz heißt
 *   die Anschrift so — man hält ein Gespräch fest, man schreibt niemandem.
 */

import { NACHRICHT_MITTEL, projektion } from "@s1/domaene";

import { aufnahmeplatz } from "./aufnahmefolge.js";
import { Dtgfeld } from "./Dtgfeld.js";
import { ZEILEN_VORDRUCK, inhaltszeilen, type Maskenwerte } from "./nachrichtenformate.js";
import { PLATZHALTER_VOM_BLATT } from "./Papiernachtrag.js";

export type Setze = <K extends keyof Maskenwerte>(feld: K, wert: Maskenwerte[K]) => void;

/** Die Sätze der Tooltips (R2-FaBe P1-1/P1-2). */
export const ERKLAERUNG = {
  uebermittlungswunsch: "Wie soll die Nachricht hinausgehen? Das Mittel wählt die Fernmeldezentrale; Ihr Wunsch steht auf dem Vordruck.",
  SPRUCH: "Spruch: an eine Gegenstelle gerichtet, die den Empfang quittiert.",
  DURCHSAGE: "Durchsage: an mehrere Gegenstellen zugleich, ohne Einzelquittung.",
  SOFORT: "Vorrang Sofort: wird vor allen einfachen Nachrichten befördert. Sparsam nutzen – nur, wenn es eilt.",
  BLITZ: "Vorrang Blitz: höchster Vorrang, vor allem anderen befördert, mit Ton beim Empfänger. Nur bei Gefahr im Verzug.",
  gespraechsnotiz:
    "Gesprächsnotiz: ein Gespräch, das Sie selbst geführt haben (Telefon, persönlich). Es geht nicht an die Fernmeldezentrale; Sie bestimmen, wer es bearbeitet (grün) und wer Bescheid wissen soll (blau).",
  datumZeitGruppe: "Datum-Zeit-Gruppe: Tag, Stunde, Minute, Monat, Jahr – „171045nov26“ ist der 17. November 2026, 10:45 Uhr; „1045“ genügt für heute.",
} as const;

/** Der Platzhalter der Abfassungszeit im Eingang (R2-FM P2-3): Sie steht im Spruch, nicht auf der Uhr. */
export const PLATZHALTER_LAUT_SPRUCH = "laut Spruch";

function Kaestchenzeile({ werte, setze, tabfolge }: { readonly werte: Maskenwerte; readonly setze: Setze; readonly tabfolge: boolean }): React.JSX.Element {
  const vorrang = (stufe: "SOFORT" | "BLITZ"): React.JSX.Element => (
    <label className="kaestchen" title={ERKLAERUNG[stufe]}>
      <input type="checkbox" data-tabfolge={aufnahmeplatz(tabfolge, stufe)} checked={werte.vorrang === stufe} onChange={(e) => setze("vorrang", e.target.checked ? stufe : "")} />
      {stufe === "SOFORT" ? "Sofort" : "Blitz"}
    </label>
  );
  return (
    <div className="kaestchenzeile" role="group" aria-label="Übermittlungswunsch, Art und Vorrang">
      <label title={ERKLAERUNG.uebermittlungswunsch}>
        Übermittlungswunsch
        <select value={werte.uebermittlungswunsch} onChange={(e) => setze("uebermittlungswunsch", e.target.value)}>
          <option value="">—</option>
          {NACHRICHT_MITTEL.map((m) => (
            <option key={m} value={m}>
              {projektion.mittelWort(m)}
            </option>
          ))}
        </select>
      </label>
      {(["SPRUCH", "DURCHSAGE"] as const).map((art) => (
        <label key={art} className="kaestchen" title={ERKLAERUNG[art]}>
          <input type="checkbox" checked={werte.art === art} onChange={(e) => setze("art", e.target.checked ? art : "")} />
          {art === "SPRUCH" ? "Spruch" : "Durchsage"}
        </label>
      ))}
      {vorrang("SOFORT")}
      {vorrang("BLITZ")}
      <label className="kaestchen" title={ERKLAERUNG.gespraechsnotiz}>
        <input type="checkbox" checked={werte.gespraechsnotiz} onChange={(e) => setze("gespraechsnotiz", e.target.checked)} />
        Gesprächsnotiz
      </label>
    </div>
  );
}

interface TextfeldEigenschaften {
  readonly titel: string;
  readonly feld: "anschrift" | "rufnummer" | "betreff" | "absender" | "zeichen" | "funktion";
  readonly werte: Maskenwerte;
  readonly setze: Setze;
  readonly liste?: string;
  readonly tabfolge?: number | undefined;
  /** Additiv (R2-FM P2-2): das Feld, in dem die Maske beginnt. */
  readonly startfokus?: boolean;
}

function Textfeld({ titel, feld, werte, setze, liste, tabfolge, startfokus = false }: TextfeldEigenschaften): React.JSX.Element {
  return (
    <label>
      {titel}
      <input value={werte[feld]} list={liste} data-tabfolge={tabfolge} {...(startfokus ? { "data-startfokus": "" } : {})} onChange={(e) => setze(feld, e.target.value)} />
    </label>
  );
}

function Inhaltsfeld({ werte, setze, tabfolge }: { readonly werte: Maskenwerte; readonly setze: Setze; readonly tabfolge?: number | undefined }): React.JSX.Element {
  const zeilen = inhaltszeilen(werte.inhalt);
  const ueber = zeilen > ZEILEN_VORDRUCK;
  return (
    <div className="vordruckinhalt">
      <label>
        Inhalt
        <textarea rows={ZEILEN_VORDRUCK} value={werte.inhalt} data-tabfolge={tabfolge} title="Strg+Enter bestätigt die Maske" onChange={(e) => setze("inhalt", e.target.value)} />
      </label>
      <span className={ueber ? "zeilenzaehler warn" : "zeilenzaehler"} role="status">
        {zeilen} von {ZEILEN_VORDRUCK} Zeilen
        {ueber && " – der Ausdruck bekommt ein Folgeblatt; gekürzt wird nichts."}
      </span>
    </div>
  );
}

export interface MittelteilEigenschaften {
  readonly werte: Maskenwerte;
  readonly setze: Setze;
  readonly anschriften: readonly string[];
  /** Die Maske führt die Tabulatorfolge der Aufnahme (`aufnahmefolge.ts`). */
  readonly tabfolge: boolean;
  /** Additiv (Fernmelder P2-3): Nachtrag vom Papier — „vom Blatt“ statt „jetzt“. */
  readonly nachtrag?: boolean;
}

/** Platzhalter und Hilfe der Abfassungszeit: vom Blatt, laut Spruch (Eingang) oder die Beispielgruppe. */
function abfassung(nachtrag: boolean, eingang: boolean): { readonly platzhalter: string | undefined; readonly hilfe: string | undefined } {
  if (nachtrag) return { platzhalter: PLATZHALTER_VOM_BLATT, hilfe: undefined };
  if (eingang) return { platzhalter: PLATZHALTER_LAUT_SPRUCH, hilfe: "Die Abfassungszeit des Absenders laut Spruch; leer lassen, wenn der Spruch keine nennt" };
  return { platzhalter: undefined, hilfe: undefined };
}

export function Mittelteil({ werte, setze, anschriften, tabfolge, nachtrag = false }: MittelteilEigenschaften): React.JSX.Element {
  const a = abfassung(nachtrag, werte.richtung === "EINGANG" && !werte.gespraechsnotiz);
  return (
    <fieldset className="vordruckteil" aria-label="Nachricht">
      <legend>Nachricht</legend>
      <Kaestchenzeile werte={werte} setze={setze} tabfolge={tabfolge} />
      <div className="vordruckzeile">
        {/* Beim Verfassen beginnt die Maske in der Anschrift (R2-SGL P2-3); bei der Aufnahme im Mittel. */}
        <Textfeld titel={werte.gespraechsnotiz ? "Gesprächspartner" : "Anschrift"} feld="anschrift" werte={werte} setze={setze} liste="nachrichtenanschriften" tabfolge={aufnahmeplatz(tabfolge, "anschrift")} startfokus={!tabfolge} />
        <Textfeld titel="Ruf-Nr." feld="rufnummer" werte={werte} setze={setze} />
      </div>
      <datalist id="nachrichtenanschriften">
        {anschriften.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <Textfeld titel="Betreff" feld="betreff" werte={werte} setze={setze} tabfolge={aufnahmeplatz(tabfolge, "betreff")} />
      <Inhaltsfeld werte={werte} setze={setze} tabfolge={aufnahmeplatz(tabfolge, "inhalt")} />
      <div className="vordruckzeile">
        <Textfeld titel="Absender" feld="absender" werte={werte} setze={setze} liste="nachrichtenanschriften" tabfolge={aufnahmeplatz(tabfolge, "absender")} />
        <Dtgfeld
          beschriftung="Abfassungszeit"
          wert={werte.abfassungszeit}
          aufAenderung={(wert) => setze("abfassungszeit", wert)}
          tabfolge={aufnahmeplatz(tabfolge, "abfassungszeit")}
          platzhalter={a.platzhalter}
          hilfe={a.hilfe}
          erklaerung={ERKLAERUNG.datumZeitGruppe}
          nachtrag={nachtrag}
        />
      </div>
      <div className="vordruckzeile">
        <Textfeld titel="Zeichen" feld="zeichen" werte={werte} setze={setze} tabfolge={aufnahmeplatz(tabfolge, "zeichen")} />
        <Textfeld titel="Funktion" feld="funktion" werte={werte} setze={setze} tabfolge={aufnahmeplatz(tabfolge, "funktion")} />
      </div>
    </fieldset>
  );
}
