/**
 * Die Maske — der Rahmen jeder Eingabe (M3.6).
 *
 * Sie gibt es, damit „Enter bestätigt, Escape bricht ab" **einmal** gebaut
 * wird und nicht in jeder Maske erneut. Die DoD von M3.6 verlangt es für
 * „alle Masken"; eine Konvention, die an sechs Stellen von Hand wiederholt
 * wird, gilt nach der vierten Stelle für fünf.
 *
 * Sie ist ein `<form>` und kein `<div>` mit Tastenhörer: Ein Formular macht
 * Enter von sich aus zum Bestätigen, der Bildschirmleser kündigt es als
 * Formular an, und der erste Knopf ist ohne Zutun der Bestätigungsknopf.
 * Escape kommt hinzu, weil ein Formular es nicht kennt.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export interface MaskeEigenschaften {
  readonly titel: string;
  /** Wird bei Enter und beim Bestätigungsknopf gerufen. */
  readonly aufBestaetigen: () => void;
  /** Wird bei Escape und beim Abbrechen-Knopf gerufen. */
  readonly aufAbbrechen: () => void;
  readonly bestaetigungstext?: string;
  /** Sperrt den Bestätigungsknopf, solange die Eingabe unvollständig ist. */
  readonly bereit?: boolean;
  /**
   * Der Inhalt der Maske.
   *
   * Heißt als einziges Feld dieses Projekts englisch: React vergibt den Namen
   * `children` für den Inhalt zwischen den Marken, und ein deutscher Name
   * zwänge jede Maske dazu, ihren Inhalt als Attribut zu übergeben.
   */
  readonly children: ReactNode;
}

export function Maske({
  titel,
  aufBestaetigen,
  aufAbbrechen,
  bestaetigungstext = "Übernehmen",
  bereit = true,
  children,
}: MaskeEigenschaften): React.JSX.Element {
  const formular = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Der Fokus springt in das erste Feld. Ohne das müsste der Bediener nach
    // jedem Öffnen zur Maus greifen — bei einer Führungsstelle, die im
    // Minutentakt Meldungen aufnimmt, ist das der teuerste Handgriff.
    const erstes = formular.current?.querySelector<HTMLElement>("input, select, textarea");
    erstes?.focus();
  }, []);

  // Die Maske wird an `document.body` gehaengt und nicht dort gezeichnet, wo
  // sie im Baum steht. Sonst entscheidet die Reihenfolge im Dokument, wer
  // oben liegt: Die Maske des Abschnittsbaums stuende vor der
  // Einheitentabelle, und deren klebender Spaltenkopf — `position: sticky` —
  // legte sich ueber sie. Ein Portal nimmt die Maske aus dieser Ordnung
  // heraus, der Grund darunter gibt ihr den Stapelplatz.
  return createPortal(
    <div className="maskengrund">
      <form
        ref={formular}
        className="maske"
        aria-label={titel}
        onSubmit={(ereignis) => {
          ereignis.preventDefault();
          if (bereit) aufBestaetigen();
        }}
        onKeyDown={(ereignis) => {
          if (ereignis.key !== "Escape") return;
          // Der Druck bleibt in der Maske: Ein Escape, das durchfällt, hebt
          // draußen die Auswahl auf — und der Bediener steht danach vor einer
          // geschlossenen Maske und einer leeren Tabelle.
          ereignis.stopPropagation();
          ereignis.preventDefault();
          aufAbbrechen();
        }}
      >
        <h3>{titel}</h3>
        {children}
        <div className="maskenknoepfe">
          <button type="submit" disabled={!bereit}>
            {bestaetigungstext}
          </button>
          <button type="button" onClick={aufAbbrechen}>
            Abbrechen
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
