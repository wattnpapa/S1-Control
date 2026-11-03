/**
 * Klappmenüs — ein Baustein für jedes Menü des Fensters (Entwurf
 * „Entlastung", Leitsatz 3, Option 6e).
 *
 * Drei Formen, eine Bedienung:
 *
 *  * {@link Klappmenue}: ein Knopf mit `aria-haspopup="menu"`, darunter die
 *    Liste. Das Fenstermenü „⋯", „Einheit anlegen ▾", „Spalten ▾" und das
 *    „⋯" an der gewählten Baumzeile.
 *  * {@link Kontextmenue}: dieselbe Liste an der Mausposition, geöffnet per
 *    Rechtsklick auf eine Zeile. Am Körper eingehängt, damit kein
 *    Tabellenrahmen mit `overflow` sie abschneidet.
 *  * {@link Menueliste}: die Liste selbst mit `role="menu"`. Beim Öffnen
 *    steht der Fokus auf dem ersten Eintrag; Pfeiltasten, Pos1 und Ende
 *    wandern, Esc schließt.
 *
 * **Esc schließt nur das Menü.** Die Taste geht nicht weiter an die Kürzel
 * des Fensters: Sonst höbe dasselbe Esc, das ein Kontextmenü schließt, auch
 * die Auswahl auf, für die es geöffnet wurde. Ein Tipp daneben schließt über
 * {@link useDraussenSchliessen}, wie Zählregel und Bildschirmwahl.
 *
 * **Ein Renderer-Element und kein natives Menü.** Electron hätte eines, die
 * Web-Schale nicht; zwei Menüs mit zwei Bedienungen wären genau die Drift,
 * die der Entwurf vermeiden soll.
 */

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useDraussenSchliessen } from "./useDraussenSchliessen.js";

const EINTRAG = "[role^='menuitem']";

/** Führt einen Eintrag aus und schließt dabei das Menü. */
export type Waehle = (tue: () => void) => () => void;

/** Pfeiltasten, Pos1 und Ende wandern zwischen den Einträgen; am Ende geht es oben weiter. */
export function wandere(liste: HTMLElement, taste: string): boolean {
  const eintraege = Array.from(liste.querySelectorAll<HTMLElement>(EINTRAG));
  if (eintraege.length === 0) return false;
  const hier = eintraege.indexOf(document.activeElement as HTMLElement);
  const ziel: Record<string, number> = {
    ArrowDown: (hier + 1) % eintraege.length,
    ArrowUp: (hier - 1 + eintraege.length) % eintraege.length,
    Home: 0,
    End: eintraege.length - 1,
  };
  const stelle = ziel[taste];
  if (stelle === undefined) return false;
  eintraege[stelle]?.focus();
  return true;
}

export interface MenuelisteEigenschaften {
  /** Der Name der Liste für Vorleseprogramme (`aria-label`). */
  readonly beschriftung: string;
  readonly id?: string | undefined;
  /** Zusätzliche Klasse neben `klappmenueliste`. */
  readonly klasse?: string | undefined;
  readonly aufEsc: () => void;
  readonly children: ReactNode;
}

/** Die Liste `role="menu"` — Fokus auf den ersten Eintrag, Tastatur, Esc. */
export function Menueliste({ beschriftung, id, klasse, aufEsc, children }: MenuelisteEigenschaften): React.JSX.Element {
  const liste = useRef<HTMLDivElement>(null);
  // Beim Öffnen steht der Fokus auf dem ersten Eintrag (WAI-ARIA, Menü-Knopf):
  // Wer mit der Tastatur kommt, kann sofort mit den Pfeilen wandern.
  useLayoutEffect(() => {
    liste.current?.querySelector<HTMLElement>(EINTRAG)?.focus();
  }, []);
  return (
    <div
      ref={liste}
      id={id}
      role="menu"
      aria-label={beschriftung}
      className={klasse === undefined ? "klappmenueliste" : `klappmenueliste ${klasse}`}
      onKeyDown={(ereignis) => {
        if (ereignis.key === "Escape") {
          ereignis.preventDefault();
          ereignis.stopPropagation();
          aufEsc();
          return;
        }
        if (liste.current !== null && wandere(liste.current, ereignis.key)) ereignis.preventDefault();
      }}
    >
      {children}
    </div>
  );
}

export interface MenueeintragEigenschaften {
  readonly text: string;
  /** Rechts in Mono: das Kürzel oder ein kurzer Zusatz („immer"). */
  readonly kurz?: string | undefined;
  readonly titel?: string | undefined;
  /** Warum der Eintrag gerade nicht geht. Er steht dann grau da, mit dem Grund im Titel. */
  readonly sperre?: string | undefined;
  /** Folgenreich (Entfernen, Auflösen): rote Marke. */
  readonly rot?: boolean | undefined;
  readonly aufWahl: () => void;
}

/**
 * Ein Eintrag. Gesperrt heißt `aria-disabled` und nicht `disabled`: Der
 * Eintrag bleibt mit den Pfeiltasten erreichbar, und der Grund im Titel
 * erscheint auch dort, wo ein Browser einem gesperrten Knopf keinen Tooltip
 * gönnt.
 */
export function Menueeintrag({ text, kurz, titel, sperre, rot, aufWahl }: MenueeintragEigenschaften): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      className={rot === true ? "rot" : undefined}
      aria-disabled={sperre === undefined ? undefined : true}
      title={sperre ?? titel}
      onClick={sperre === undefined ? aufWahl : undefined}
    >
      {text}
      {kurz !== undefined && (
        <span className="kurz" aria-hidden="true">
          {kurz}
        </span>
      )}
    </button>
  );
}

export interface MenuehakenEigenschaften extends Omit<MenueeintragEigenschaften, "rot"> {
  readonly an: boolean;
}

/**
 * Ein Eintrag zum An- und Abhaken (`menuitemcheckbox`). Er schließt das Menü
 * nicht: Wer Spalten zuschaltet, schaltet selten nur eine.
 */
export function Menuehaken({ text, kurz, titel, sperre, an, aufWahl }: MenuehakenEigenschaften): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={an}
      aria-disabled={sperre === undefined ? undefined : true}
      title={sperre ?? titel}
      onClick={sperre === undefined ? aufWahl : undefined}
    >
      {text}
      {kurz !== undefined && (
        <span className="kurz" aria-hidden="true">
          {kurz}
        </span>
      )}
    </button>
  );
}

export interface Knopfangaben {
  readonly inhalt: ReactNode;
  readonly klasse?: string | undefined;
  /** `aria-label`, wenn der Inhalt kein Wort ist („⋯"). */
  readonly beschriftung?: string | undefined;
  readonly titel?: string | undefined;
  readonly gesperrt?: boolean | undefined;
}

export interface KlappmenueEigenschaften {
  readonly knopf: Knopfangaben;
  readonly menue: { readonly beschriftung: string; readonly id: string; readonly klasse?: string };
  /** Klasse der Hülle um Knopf und Liste. */
  readonly huelle?: string;
  readonly inhalt: (waehle: Waehle) => ReactNode;
  /** Was neben der Liste in der Hülle hängt (die Bildschirmwahl des Fenstermenüs). */
  readonly dazu?: ReactNode;
}

/** Ein Knopf, der eine Liste aufklappt. */
export function Klappmenue({ knopf, menue, huelle, inhalt, dazu }: KlappmenueEigenschaften): React.JSX.Element {
  const [offen, setzeOffen] = useState(false);
  const knopfRef = useRef<HTMLButtonElement>(null);
  const schliesse = useCallback(() => {
    setzeOffen(false);
  }, []);
  const huelleRef = useDraussenSchliessen<HTMLDivElement>(offen, schliesse);
  const waehle: Waehle = (tue) => () => {
    setzeOffen(false);
    tue();
  };
  return (
    <div ref={huelleRef} className={huelle === undefined ? "klappmenue" : `klappmenue ${huelle}`}>
      <button
        ref={knopfRef}
        type="button"
        className={knopf.klasse}
        aria-haspopup="menu"
        aria-expanded={offen}
        aria-controls={offen ? menue.id : undefined}
        aria-label={knopf.beschriftung}
        title={knopf.titel}
        disabled={knopf.gesperrt}
        onClick={() => {
          setzeOffen(!offen);
        }}
      >
        {knopf.inhalt}
      </button>
      {offen && (
        <Menueliste
          beschriftung={menue.beschriftung}
          id={menue.id}
          klasse={menue.klasse}
          aufEsc={() => {
            setzeOffen(false);
            knopfRef.current?.focus();
          }}
        >
          {inhalt(waehle)}
        </Menueliste>
      )}
      {dazu}
    </div>
  );
}

/** Wo ein Kontextmenü aufgeht: die Mausposition im Fenster. */
export interface Kontextort {
  readonly x: number;
  readonly y: number;
}

export interface KontextmenueEigenschaften {
  readonly ort: Kontextort;
  readonly beschriftung: string;
  readonly aufSchliessen: () => void;
  readonly inhalt: (waehle: Waehle) => ReactNode;
}

/** Hält das Menü im Fenster: Ein Rechtsklick am Rand soll es nicht hinausschieben. */
function imFenster(knoten: HTMLElement, ort: Kontextort): void {
  const mass = knoten.getBoundingClientRect();
  const x = Math.max(8, Math.min(ort.x, window.innerWidth - mass.width - 8));
  const y = Math.max(8, Math.min(ort.y, window.innerHeight - mass.height - 8));
  knoten.style.setProperty("--menue-x", `${String(x)}px`);
  knoten.style.setProperty("--menue-y", `${String(y)}px`);
}

/**
 * Das Kontextmenü an der Mausposition. Die Lage steht in zwei Marken
 * (`--menue-x`, `--menue-y`) und nicht als `left`/`top`: So legt
 * `index.html` es auf schmalen Bildschirmen an den unteren Rand, ohne eine
 * Inline-Angabe überstimmen zu müssen.
 */
export function Kontextmenue({ ort, beschriftung, aufSchliessen, inhalt }: KontextmenueEigenschaften): React.JSX.Element {
  const huelle = useDraussenSchliessen<HTMLDivElement>(true, aufSchliessen);
  useLayoutEffect(() => {
    if (huelle.current !== null) imFenster(huelle.current, ort);
  }, [huelle, ort]);
  const waehle: Waehle = (tue) => () => {
    aufSchliessen();
    tue();
  };
  const stil = { "--menue-x": `${String(ort.x)}px`, "--menue-y": `${String(ort.y)}px` } as CSSProperties;
  return createPortal(
    <div ref={huelle} className="kontextmenue" style={stil}>
      <Menueliste beschriftung={beschriftung} aufEsc={aufSchliessen}>
        {inhalt(waehle)}
      </Menueliste>
    </div>,
    document.body,
  );
}
