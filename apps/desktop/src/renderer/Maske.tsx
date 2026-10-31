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
import { MELDUNG_UNKLAR } from "./verbindung.js";

/** Der Satz, der im Dialog steht, wenn der Einsatz keine Eingaben mehr annimmt. */
export const TEXT_NUR_LESEN = "Einsatz beendet – nur lesen";

/** Die Rückfrage beim Abbrechen, solange unklar ist, ob der letzte Versuch angekommen ist. */
export const TEXT_UNKLAR_VERWERFEN = "Unklar, ob gespeichert. Trotzdem verwerfen?";

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
   * Der Grund, solange `bereit` falsch ist („Abschnitt wählen“). Er steht
   * **sichtbar** neben dem Knopf: ein Tooltip fehlt auf dem Touchgerät.
   */
  readonly bereitGrund?: string;
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
   * Wohin der Fokus beim Öffnen springt: ins erste Feld (Standard) oder auf
   * „Abbrechen“. Für Rückfragen mit vorbelegtem Feld, bei denen die Tastatur
   * nicht aufgehen und nichts Folgenreiches vorgewählt sein soll.
   */
  readonly startfokus?: "feld" | "abbrechen";
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
  bereitGrund,
  nurKnopf = false,
  trotzSperre = false,
  startfokus = "feld",
  children,
}: MaskeEigenschaften): React.JSX.Element {
  const formular = useRef<HTMLFormElement>(null);
  const [laeuft, setzeLaeuft] = useState(false);
  // Zusätzlich zum Zustand ein Merker, der **sofort** gilt: Zwei Klicks im
  // selben Takt sehen sonst beide `laeuft === false` und lösen zweimal aus.
  const laeuftSofort = useRef(false);
  const [abweisung, setzeAbweisung] = useState<string | undefined>(undefined);
  const [unklar, setzeUnklar] = useState(false);
  const [verwerfenFrage, setzeVerwerfenFrage] = useState(false);
  const status = useLaden((zustand) => zustand.lagebild?.einsatzStatus ?? "AKTIV");
  const gesperrt = status !== "AKTIV" && !trotzSperre;

  // Ein zweiter Druck auf Bestätigen — oder ein zweites Enter — darf den
  // Vorgang nicht wiederholen. Beim Anlegen entstünden sonst zwei Einheiten
  // mit verschiedenen Kennungen, beim Verschieben zwei Bewegungen.
  const bestaetigen = (): void => {
    if (!bereit || laeuftSofort.current || gesperrt) return;
    const davor = hoechsteHinweisnummer();
    setzeVerwerfenFrage(false);
    const ergebnis = aufBestaetigen();
    if (!(ergebnis instanceof Promise)) return;
    laeuftSofort.current = true;
    setzeLaeuft(true);
    void ergebnis.finally(() => {
      laeuftSofort.current = false;
      // Bleibt die Maske nach einem Fehlschlag offen, ist sie wieder bedienbar.
      if (!formular.current?.isConnected) return;
      setzeLaeuft(false);
      setzeUnklar(useLaden.getState().fehler === MELDUNG_UNKLAR);
      // Die Ablehnung steht auch im Hinweise-Kasten — aber der liegt hinter
      // der Abdunkelung. Wer die Maske bedient, muss sie hier lesen.
      setzeAbweisung(neuesterHinweis(davor));
    });
  };

  // Nach „Unklar, ob gespeichert“ verwirft Abbrechen nicht still: Erst die
  // Rückfrage, dann bleibt die Warnung als Hinweis in der Leiste stehen.
  const abbrechen = (): void => {
    if (unklar && !verwerfenFrage) {
      setzeVerwerfenFrage(true);
      return;
    }
    if (unklar) useLaden.getState().melde("warnung", `${titel}: Unklar, ob gespeichert – bitte Liste prüfen.`);
    aufAbbrechen();
  };

  useEffect(() => {
    // Der Fokus springt in das erste Feld. Ohne das müsste der Bediener nach
    // jedem Öffnen zur Maus greifen — bei einer Führungsstelle, die im
    // Minutentakt Meldungen aufnimmt, ist das der teuerste Handgriff.
    const ziel = startfokus === "abbrechen" ? "button.abbrechen" : "input, select, textarea";
    formular.current?.querySelector<HTMLElement>(ziel)?.focus();
  }, [startfokus]);

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
          abbrechen();
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
        {verwerfenFrage && (
          <p className="warnung" role="alert">
            {TEXT_UNKLAR_VERWERFEN}
          </p>
        )}
        <div className="maskenknoepfe">
          <button
            type={nurKnopf ? "button" : "submit"}
            className="haupt"
            disabled={!bereit || laeuft || gesperrt}
            aria-busy={laeuft}
            onClick={nurKnopf ? bestaetigen : undefined}
          >
            {laeuft ? "…" : bestaetigungstext}
          </button>
          <button type="button" className="abbrechen" onClick={abbrechen}>
            {verwerfenFrage ? "Trotzdem verwerfen" : "Abbrechen"}
          </button>
          {!bereit && !gesperrt && bereitGrund !== undefined && (
            <span className="hinweistext bereitgrund" data-testid="bereitgrund">
              {bereitGrund}
            </span>
          )}
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
