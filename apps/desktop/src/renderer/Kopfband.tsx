/**
 * Das Kopfband (Entwurf „Entlastung", 3.1, Optionen 6b und 6d).
 *
 * **Zwei Zeilen statt vier.** Zeile 1 trägt links die Marke und den
 * **Einsatznamen** mit der Führungsstelle darunter, in der Mitte Ist-Stärke
 * und taktische Zeit in der Größe, die man aus zwei Metern liest, rechts die
 * Zustandsmarke und das Fenstermenü „⋯". Zeile 2 trägt die Reiter.
 *
 * Was bis Runde 6 hier stand und jetzt woanders steht:
 *
 *  * „‹ Einsatzauswahl" — als „Einsatz schließen" im Fenstermenü;
 *  * die Zustandszeile — sie sagte Stand, Share und Arbeitsplätze ein
 *    zweites Mal; das tut die Statuszeile am Fuß, oben bleibt die
 *    Zustandsmarke mit der Ausführung im Tooltip;
 *  * Hilfeknopf, Themenschalter, Abmelden — im Fenstermenü;
 *  * der Reiter „Diagnose" — im Fenstermenü; sie ist kein Blatt des
 *    Betriebs, sondern das, was man liest, wenn etwas klemmt.
 *
 * Seit E3 trägt Zeile 2 die Reiter des **Profils** und „Mehr ▾" für den
 * Rest (`Reiterzeile.tsx`).
 *
 * Das Wortbild „S1-Control" wird klein: Was der Bediener wissen muss, ist
 * der Einsatz, nicht das Programm. Ohne Einsatz steht es als Überschrift.
 * Die Stärke steht nur hier (Leitsatz 4: jede Zahl einmal); die Statuszeile
 * führt sie nicht mehr.
 */

import type { Lagebild, Profil, Theme } from "../kontrakt/index.js";
import type { Blatt } from "./blaetter.js";
import { Fenstermenue } from "./Fenstermenue.js";
import { taktischeZeit } from "./formate.js";
import { Reiterzeile } from "./Reiterzeile.js";
import { Staerkekennzahl } from "./Staerkekennzahl.js";
import { Zustandsmarke, abschlussText } from "./Zustandsmarke.js";

export interface KopfbandEigenschaften {
  readonly lagebild: Lagebild | undefined;
  readonly jetzt: number;
  readonly theme: Theme;
  waehleTheme(theme: Theme): void;
  /** Die Tastenkarte — sie gehört zum Fenster und nicht zu einer Ansicht. */
  aufHilfe(): void;
  /** Der Weg zurück — fehlt er, ist kein Einsatz offen und das Menü führt ihn nicht. */
  zurueckZurAuswahl?: (() => void) | undefined;
  /** Das aufgeschlagene Blatt; ohne offenen Einsatz entfällt die Reiterzeile. */
  blatt?: Blatt | undefined;
  waehleBlatt?: ((blatt: Blatt) => void) | undefined;
  /** Wie viele Meldungen im Eingangskorb offen sind — 0 zeigt keine Marke. */
  offeneMeldungen?: number | undefined;
  /** Läuft die Web-Schale hinter der Anmeldung (ADR-006)? Dann steht „Abmelden“ im Menü. */
  angemeldet?: boolean | undefined;
  /** Das Profil des Arbeitsplatzes — es wählt die Reiter im Band; ohne Angabe Führungsstelle. */
  profil?: Profil | undefined;
}

/** „FüSt OV Oldenburg · S1-Control“ — der Name aus den Stammdaten, wenn es ihn gibt. */
export function fuestZeile(lagebild: Lagebild): string {
  const name = (lagebild.stammdaten?.fuestName ?? "").trim();
  if (name === "") return "S1-Control";
  // Die Stammdaten tragen den Namen mal mit, mal ohne „FüSt“ davor.
  return `${/^füst\b/iu.test(name) ? name : `FüSt ${name}`} · S1-Control`;
}

/**
 * Der Einsatz als Überschrift. Ein beendeter oder archivierter Einsatz steht
 * so darunter, dass ihn niemand für den laufenden hält: Wer schreiben will,
 * erfährt vorher, warum es nicht geht (die Sperre selbst liegt im Worker).
 */
function Einsatztitel({ lagebild }: { readonly lagebild: Lagebild | undefined }): React.JSX.Element {
  if (lagebild === undefined) {
    return (
      <div className="einsatztitel">
        <h1>S1-Control</h1>
        <span className="untertitel">Einsatzführung für die Führungsstelle</span>
      </div>
    );
  }
  const abschluss = abschlussText(lagebild);
  return (
    <div className="einsatztitel">
      <h1>{lagebild.einsatzName === "" ? "S1-Control" : lagebild.einsatzName}</h1>
      <span className="untertitel">
        {fuestZeile(lagebild)}
        {abschluss !== "" && (
          <>
            {" · "}
            <strong className="abgeschlossen">{abschluss}</strong>
          </>
        )}
      </span>
    </div>
  );
}

export function Kopfband({
  lagebild,
  jetzt,
  theme,
  waehleTheme,
  aufHilfe,
  zurueckZurAuswahl,
  blatt,
  waehleBlatt,
  offeneMeldungen = 0,
  angemeldet = false,
  profil,
}: KopfbandEigenschaften): React.JSX.Element {
  return (
    <header className="kopfband">
      <div className="zeile">
        <span className="marke" aria-hidden="true">
          THW
        </span>
        <Einsatztitel lagebild={lagebild} />

        <Staerkekennzahl lagebild={lagebild} />
        <span className="kennzahl">
          <span className="label">Zeit</span>
          <span className="wert">{taktischeZeit(jetzt)}</span>
        </span>

        <Zustandsmarke lagebild={lagebild} jetzt={jetzt} />
        <Fenstermenue
          theme={theme}
          waehleTheme={waehleTheme}
          aufHilfe={aufHilfe}
          zurueckZurAuswahl={zurueckZurAuswahl}
          aufDiagnose={waehleBlatt === undefined ? undefined : () => waehleBlatt("diagnose")}
          angemeldet={angemeldet}
        />
      </div>

      {/* Die Reiter stehen im Kopfband und nicht über dem Tagebuch: Sie
          führen die **ganze** Ansicht und nicht ein Nebenblatt unter der
          Lage. Damit trägt die Arbeitsfläche zu jedem Zeitpunkt eine Sache
          statt sechs untereinander. */}
      {blatt !== undefined && waehleBlatt !== undefined && (
        <Reiterzeile blatt={blatt} waehleBlatt={waehleBlatt} offeneMeldungen={offeneMeldungen} profil={profil} />
      )}
    </header>
  );
}
