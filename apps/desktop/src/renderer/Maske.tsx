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

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useLaden } from "./laden.js";

/** Der Satz, der im Dialog steht, wenn der Einsatz keine Eingaben mehr annimmt. */
export const TEXT_NUR_LESEN = "Einsatz beendet – nur lesen";

export interface MaskeEigenschaften {
  readonly titel: string;
  /**
   * Wird bei Enter und beim Bestätigungsknopf gerufen.
   *
   * Gibt der Aufrufer ein Versprechen zurück, bleibt der Knopf bis zu dessen
   * Ende gesperrt — sonst legt ein zweiter Druck denselben Vorgang ein
   * zweites Mal an.
   */
  readonly aufBestaetigen: () => void | Promise<unknown>;
  /** Wird bei Escape und beim Abbrechen-Knopf gerufen. */
  readonly aufAbbrechen: () => void;
  readonly bestaetigungstext?: string;
  /** Sperrt den Bestätigungsknopf, solange die Eingabe unvollständig ist. */
  readonly bereit?: boolean;
  /**
   * Nur der Bestätigungsknopf bestätigt, nicht Enter in einem Feld.
   *
   * Für Vorgänge, die alle Arbeitsplätze treffen: Ein Enter im vorbelegten
   * Zeitfeld darf sie nicht auslösen.
   */
  readonly nurKnopf?: boolean;
  /**
   * Die Maske darf auch im beendeten Einsatz bestätigen (Wiedereröffnen,
   * Archivieren). Sonst sperrt sie dort und sagt es im Dialog.
   */
  readonly trotzSperre?: boolean;
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
  nurKnopf = false,
  trotzSperre = false,
  children,
}: MaskeEigenschaften): React.JSX.Element {
  const formular = useRef<HTMLFormElement>(null);
  const [laeuft, setzeLaeuft] = useState(false);
  const [abweisung, setzeAbweisung] = useState<string | undefined>(undefined);
  const status = useLaden((zustand) => zustand.lagebild?.einsatzStatus ?? "AKTIV");
  const gesperrt = status !== "AKTIV" && !trotzSperre;

  // Ein zweiter Druck auf Bestätigen — oder ein zweites Enter — darf den
  // Vorgang nicht wiederholen. Beim Anlegen entstünden sonst zwei Einheiten
  // mit verschiedenen Kennungen, beim Verschieben zwei Bewegungen.
  const bestaetigen = (): void => {
    if (!bereit || laeuft || gesperrt) return;
    const davor = hoechsteHinweisnummer();
    const ergebnis = aufBestaetigen();
    if (!(ergebnis instanceof Promise)) return;
    setzeLaeuft(true);
    void ergebnis.finally(() => {
      // Bleibt die Maske nach einem Fehlschlag offen, ist sie wieder bedienbar.
      if (!formular.current?.isConnected) return;
      setzeLaeuft(false);
      // Die Ablehnung steht auch im Hinweise-Kasten — aber der liegt hinter
      // der Abdunkelung. Wer die Maske bedient, muss sie hier lesen.
      setzeAbweisung(neuesterHinweis(davor));
    });
  };

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
          if (!nurKnopf) bestaetigen();
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
        {gesperrt && (
          <p className="hinweistext" role="alert">
            {TEXT_NUR_LESEN}. Eingaben werden nicht gespeichert.
          </p>
        )}
        {abweisung !== undefined && !gesperrt && <p className="hinweistext" role="alert">{abweisung}</p>}
        <div className="maskenknoepfe">
          <button
            type={nurKnopf ? "button" : "submit"}
            disabled={!bereit || laeuft || gesperrt}
            onClick={nurKnopf ? bestaetigen : undefined}
          >
            {laeuft ? "…" : bestaetigungstext}
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

function hoechsteHinweisnummer(): number {
  return useLaden.getState().hinweise.reduce((m, h) => Math.max(m, h.nummer), 0);
}

/** Die jüngste Warnung oder Störung, die seit `davor` gemeldet wurde. */
function neuesterHinweis(davor: number): string | undefined {
  const neue = useLaden.getState().hinweise.filter((h) => h.nummer > davor && h.stufe !== "info");
  return neue.at(-1)?.text;
}
