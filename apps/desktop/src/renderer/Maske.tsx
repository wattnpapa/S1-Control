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
 *
 * Additiv (Audit Fernmelder P2-8): Tab bleibt in der Maske, und beim
 * Schließen kehrt der Fokus zum auslösenden Element zurück
 * (`useFokusfalle.ts`).
 *
 * Additiv (Runde 2, R2-FaBe P3-4, R2-SGL P3-1, P3-2):
 * - Die Rückfrage beim Verwerfen steht **im festen Fuß** neben den Knöpfen
 *   (`fussfrage`), nicht darüber: Bei langem Vordruck lag sie hinter der
 *   Fußleiste, und nur der Knopftext wechselte still von „Abbrechen“ zu
 *   „Verwerfen“. Ebenso jede Rückfrage des Aufrufers (`fusszeile`), etwa
 *   „Dieselbe Nachricht … noch einmal aufgeben?“.
 * - Ein zweites Esc verwirft nicht mehr: Es nimmt die Frage zurück — oder
 *   schließt die Maske, wenn sie den Entwurf aufheben kann
 *   (`aufZurueckstellen`). Verworfen wird nur mit dem Knopf „Verwerfen“.
 * - Mit `aufZurueckstellen` sind „Abbrechen“ und „Verwerfen“ zwei Knöpfe:
 *   „Abbrechen“ schließt und behält den Entwurf, „Verwerfen“ löscht ihn nach
 *   Rückfrage.
 * - `enterBereit` (R2-FM P2-3): Ist es falsch, bestätigt Enter in einem
 *   einzeiligen Feld nicht; Knopf und Strg+Enter bleiben.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useLaden } from "./laden.js";
import { haltTab, useFokusRueckgabe } from "./useFokusfalle.js";
import { MELDUNG_UNKLAR } from "./verbindung.js";

/** Der Satz, der im Dialog steht, wenn der Einsatz keine Eingaben mehr annimmt. */
export const TEXT_NUR_LESEN = "Einsatz beendet – nur lesen";

/** Die Rückfrage beim Abbrechen, solange unklar ist, ob der letzte Versuch angekommen ist. */
export const TEXT_UNKLAR_VERWERFEN = "Unklar, ob gespeichert. Trotzdem verwerfen?";

/**
 * Die Rückfrage beim Abbrechen einer Maske mit getipptem Inhalt (Audit
 * Fernmelder P1-3, Sachgebietsleiter P1-5): Ein versehentliches Esc darf einen
 * Funkspruch, der nur einmal durchgegeben wird, nicht vernichten.
 */
export const TEXT_ENTWURF_VERWERFEN = "Entwurf verwerfen? „Verwerfen“ bestätigt; Esc oder Weitertippen behält ihn.";

/** Die Rückfrage, wenn die Maske den Entwurf aufheben kann (R2-FaBe P3-4): verworfen wird nur ausdrücklich. */
export const TEXT_ENTWURF_ENDGUELTIG = "Entwurf endgültig verwerfen? „Endgültig verwerfen“ löscht ihn; „Abbrechen“ oder Esc schließt und behält ihn.";

/** Der Satz, wenn Enter in einem Feld nicht bestätigt (R2-FM P2-3). */
export const TEXT_ENTER_GESPERRT = "Enter speichert erst, wenn alles Nötige eingetragen ist – sonst den Knopf oder Strg+Enter.";

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
  readonly startfokus?: "feld" | "abbrechen" | "bestaetigen";
  /**
   * Additiv: Die Maske hat getippten Inhalt. Dann fragen Esc und „Abbrechen“
   * erst nach, und der Entwurf bleibt bis zum ausdrücklichen Verwerfen stehen
   * (Audit Fernmelder P1-3, Sachgebietsleiter P1-5).
   */
  readonly geaendert?: boolean;
  /**
   * Additiv (R2-FaBe P3-4, R2-SGL P3-2): schließt die Maske und behält den
   * Entwurf. Ist er gesetzt, schließt „Abbrechen“ mit getipptem Inhalt ohne
   * zu verwerfen, und ein eigener Knopf „Verwerfen“ löscht nach Rückfrage.
   */
  readonly aufZurueckstellen?: (() => void) | undefined;
  /** Additiv (R2-SGL P3-1): eine Rückfrage des Aufrufers im festen Fuß neben den Knöpfen. */
  readonly fusszeile?: ReactNode;
  /** Additiv (R2-FM P2-3): falsch, solange Enter in einem einzeiligen Feld nicht bestätigen soll. */
  readonly enterBereit?: boolean;
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
  geaendert = false,
  aufZurueckstellen,
  fusszeile,
  enterBereit = true,
  children,
}: MaskeEigenschaften): React.JSX.Element {
  const formular = useRef<HTMLFormElement>(null);
  // Fernmelder P2-8: das auslösende Element merken und beim Schließen zurückfokussieren.
  useFokusRueckgabe();
  const [laeuft, setzeLaeuft] = useState(false);
  // Zusätzlich zum Zustand ein Merker, der **sofort** gilt: Zwei Klicks im
  // selben Takt sehen sonst beide `laeuft === false` und lösen zweimal aus.
  const laeuftSofort = useRef(false);
  const [abweisung, setzeAbweisung] = useState<string | undefined>(undefined);
  const [unklar, setzeUnklar] = useState(false);
  const [verwerfenFrage, setzeVerwerfenFrage] = useState(false);
  const [enterHinweis, setzeEnterHinweis] = useState(false);
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
  // Mit getipptem Inhalt ebenso: erst fragen, dann verwerfen (Fernmelder P1-3).
  const verwerfen = (): void => {
    if ((unklar || geaendert) && !verwerfenFrage) {
      setzeVerwerfenFrage(true);
      return;
    }
    if (unklar) useLaden.getState().melde("warnung", `${titel}: Unklar, ob gespeichert – bitte Liste prüfen.`);
    aufAbbrechen();
  };
  // R2-FaBe P3-4: Mit Entwurfsspeicher schließt „Abbrechen“, ohne zu verwerfen.
  const zurueckstellbar = aufZurueckstellen !== undefined && geaendert && !unklar;
  const abbrechen = (): void => {
    if (zurueckstellbar) aufZurueckstellen();
    else verwerfen();
  };
  // R2-SGL P3-2: Das erste Esc fragt, das zweite verwirft nicht, sondern schließt (mit Entwurf) oder nimmt die Frage zurück.
  const escape = (): void => {
    if (!(unklar || geaendert)) {
      aufAbbrechen();
      return;
    }
    if (!verwerfenFrage) {
      setzeVerwerfenFrage(true);
      return;
    }
    setzeVerwerfenFrage(false);
    if (zurueckstellbar) aufZurueckstellen();
  };

  useEffect(() => {
    // Der Fokus springt in das erste Feld. Ohne das müsste der Bediener nach
    // jedem Öffnen zur Maus greifen — bei einer Führungsstelle, die im
    // Minutentakt Meldungen aufnimmt, ist das der teuerste Handgriff.
    // „bestaetigen“: eine vollständige Vorbelegung (Stellenabfrage nach dem Neuladen) bestätigt ein Klick oder Enter.
    const ziel = startfokus === "abbrechen" ? "button.abbrechen" : startfokus === "bestaetigen" ? ".maskenknoepfe button.haupt:not(:disabled)" : "input, select, textarea";
    // Additiv (R2-FM P2-2, R2-SGL P2-3): Ein Feld mit `data-startfokus` geht vor — in der
    // Nachrichtenmaske die Anschrift bzw. das Mittel, nicht der Schalter „Vom Papier nachtragen“.
    const markiert = startfokus === "feld" ? formular.current?.querySelector<HTMLElement>("[data-startfokus]:not(:disabled)") : null;
    (markiert ?? formular.current?.querySelector<HTMLElement>(ziel))?.focus();
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
          // Strg+Enter bestätigt aus jedem Feld, auch aus dem mehrzeiligen
          // Inhalt, in dem Enter den Zeilenumbruch behält (Fernmelder P1-2).
          if (ereignis.key === "Enter" && (ereignis.ctrlKey || ereignis.metaKey)) {
            ereignis.preventDefault();
            bestaetigen();
            return;
          }
          // R2-FM P2-3: Ein Enter im Betreff schrieb einen halben Funkspruch. Ohne `enterBereit`
          // löst Enter in einem einzeiligen Feld nichts aus; der Satz steht im Fuß.
          if (ereignis.key === "Enter" && !enterBereit && enterImFeld(ereignis.target)) {
            ereignis.preventDefault();
            setzeEnterHinweis(true);
            return;
          }
          if (ereignis.key === "Tab" && springeTabfolge(ereignis.target, ereignis.shiftKey, formular.current)) {
            ereignis.preventDefault();
            return;
          }
          // Die Fokusfalle (Fernmelder P2-8): Am Rand springt Tab innerhalb der Maske.
          if (ereignis.key === "Tab" && haltTab(ereignis.target, ereignis.shiftKey, formular.current)) {
            ereignis.preventDefault();
            return;
          }
          if (ereignis.key !== "Escape") return;
          // Der Druck bleibt in der Maske: Ein Escape, das durchfällt, hebt
          // draußen die Auswahl auf — und der Bediener steht danach vor einer
          // geschlossenen Maske und einer leeren Tabelle.
          ereignis.stopPropagation();
          ereignis.preventDefault();
          escape();
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
          {/* R2-SGL P3-1, R2-FaBe P3-4: Rückfragen im festen Fuß, neben den Knöpfen, die sie beantworten. */}
          {fusszeile}
          {verwerfenFrage && (
            <p className="warnung fussfrage" role="alert">
              {unklar ? TEXT_UNKLAR_VERWERFEN : zurueckstellbar ? TEXT_ENTWURF_ENDGUELTIG : TEXT_ENTWURF_VERWERFEN}
            </p>
          )}
          {enterHinweis && !enterBereit && <p className="hinweistext fussfrage">{TEXT_ENTER_GESPERRT}</p>}
          <button
            type={nurKnopf ? "button" : "submit"}
            className="haupt"
            disabled={!bereit || laeuft || gesperrt}
            aria-busy={laeuft}
            onClick={nurKnopf ? bestaetigen : undefined}
          >
            {laeuft ? "…" : bestaetigungstext}
          </button>
          <button type="button" className="abbrechen" title={zurueckstellbar ? "Schließen; der Entwurf bleibt bis zum nächsten Öffnen" : undefined} onClick={abbrechen}>
            {zurueckstellbar ? "Abbrechen" : verwerfenFrage ? (unklar ? "Trotzdem verwerfen" : "Verwerfen") : "Abbrechen"}
          </button>
          {zurueckstellbar && (
            <button type="button" className="verwerfen" title="Den Entwurf löschen; fragt einmal nach" onClick={verwerfen}>
              {verwerfenFrage ? "Endgültig verwerfen" : "Verwerfen"}
            </button>
          )}
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

/**
 * Eine eigene Tabulatorfolge für Masken, deren Felder auf dem Vordruck in
 * anderer Ordnung stehen, als der Fernmelder sie füllt (Audit Fernmelder
 * P1-2): Felder mit `data-tabfolge="n"` springen mit Tab zum nächsten n, das
 * letzte zum Hauptknopf. Felder ohne die Marke behalten die Folge des
 * Dokuments; ein positiver `tabIndex` hätte die ganze Seite umsortiert.
 */
export function springeTabfolge(ziel: EventTarget, rueckwaerts: boolean, wurzel: HTMLFormElement | null): boolean {
  if (wurzel === null || !(ziel instanceof HTMLElement)) return false;
  const glieder = [...wurzel.querySelectorAll<HTMLElement>("[data-tabfolge]")]
    .filter((e) => !(e as HTMLInputElement).disabled)
    .sort((a, b) => Number(a.dataset["tabfolge"]) - Number(b.dataset["tabfolge"]));
  const haupt = wurzel.querySelector<HTMLButtonElement>(".maskenknoepfe button.haupt");
  const folge: HTMLElement[] = haupt === null || haupt.disabled ? glieder : [...glieder, haupt];
  const stelle = folge.indexOf(ziel);
  if (glieder.length === 0 || stelle < 0) return false;
  const naechstes = folge[stelle + (rueckwaerts ? -1 : 1)];
  if (naechstes === undefined) return false;
  naechstes.focus();
  return true;
}

/** Ein einzeiliges Eingabefeld (kein Kästchen, kein Knopf, kein Textbereich): Dort löst Enter das Formular aus. */
function enterImFeld(ziel: EventTarget): boolean {
  return ziel instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(ziel.type);
}

function hoechsteHinweisnummer(): number {
  return useLaden.getState().hinweise.reduce((m, h) => Math.max(m, h.nummer), 0);
}

/** Die jüngste Warnung oder Störung, die seit `davor` gemeldet wurde. */
function neuesterHinweis(davor: number): string | undefined {
  const neue = useLaden.getState().hinweise.filter((h) => h.nummer > davor && h.stufe !== "info");
  return neue.at(-1)?.text;
}
