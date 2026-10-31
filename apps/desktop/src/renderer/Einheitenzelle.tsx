/**
 * Eine Zelle der Einheitentabelle — anzeigend oder bearbeitend.
 *
 * Textzellen: Enter schreibt, Escape verwirft, der Verlust des Fokus schreibt
 * ebenfalls (M3.6) — die Regel der Excel.
 *
 * **Auswahlzellen** (Status, Organisation, Schicht …) folgen einer anderen
 * Regel: Eine Auswahl wird erst mit Enter oder dem Knopf „Übernehmen“
 * geschrieben; Escape, „Abbrechen“ und Wegklicken verwerfen. Ein Status gilt
 * sofort für alle Arbeitsplätze, und ein Antippen daneben darf keinen
 * Statuswechsel auslösen.
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { statusTon, spaltenwertTitel, zeitpunktText, type Spalte, type Tabellenzeile } from "@s1/domaene";

import { TEXT_NUR_LESEN } from "./Maske.js";
import { Zellmarken } from "./Ressourcenmarken.js";

/** Zahlenspalten stehen rechts: Wer Stärken vergleicht, liest Spalten. */
export function istZahl(spalte: Spalte): boolean {
  return spalte.art === "zahl" || spalte.schluessel === "gesamt" || spalte.schluessel === "staerke";
}

export interface ZelleEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalte: Spalte;
  readonly bearbeitet: boolean;
  /** Einsatz beendet oder archiviert: Anzeige ja, Bearbeiten nein. */
  readonly gesperrt?: boolean;
  /** Die Regel, gegen die die Eingabe verstößt; die Zelle zeigt sie unter dem Feld. */
  readonly fehler?: string;
  /** Keine Verbindung: der Grund; „Übernehmen“ ist gesperrt, der Text bleibt stehen. */
  readonly sperre?: string;
  readonly aufBearbeiten: () => void;
  readonly aufFertig: (eingabe: string) => void;
  readonly aufAbbrechen: () => void;
}

export function Zelle(eigenschaften: ZelleEigenschaften): React.JSX.Element {
  const { zeile, spalte, bearbeitet } = eigenschaften;
  const zelle = zeile.zellen[spalte.schluessel];
  if (zelle === undefined) return <td />;
  if (bearbeitet && spalte.schreibt !== undefined && eigenschaften.gesperrt !== true) {
    const start = spalte.art === "auswahl" ? (typeof zelle.wert === "string" ? zelle.wert : "") : zelle.text;
    return spalte.art === "auswahl" ? (
      <Auswahlzelle {...eigenschaften} start={start} />
    ) : (
      <Eingabezelle {...eigenschaften} start={start} />
    );
  }
  return <Anzeigezelle {...eigenschaften} />;
}

function Anzeigezelle({ zeile, spalte, gesperrt, aufBearbeiten }: ZelleEigenschaften): React.JSX.Element {
  const zelle = zeile.zellen[spalte.schluessel];
  if (zelle === undefined) return <td />;
  const titel = zelle.umstritten
    ? "An diesem Feld hängt ein Konflikthinweis: Ein anderer Arbeitsplatz hat es zuletzt anders gesehen (§3.8)."
    : (zelle.wanduhr ?? "");
  const schreibbar = spalte.schreibt !== undefined;
  const gesperrtHier = schreibbar && gesperrt === true;
  const ton = statusTon(typeof zelle.wert === "string" ? zelle.wert : "");
  return (
    <td
      className={[
        zelle.umstritten ? "umstritten" : "",
        schreibbar ? "" : "berechnet",
        istZahl(spalte) ? "zahl" : "",
        spalte.schluessel === "bezeichnung" ? "namensspalte" : "",
        spalte.schluessel === "status" ? "statusspalte" : "",
      ]
        .filter((klasse) => klasse !== "")
        .join(" ")}
      title={titel}
      onDoubleClick={schreibbar && !gesperrtHier ? aufBearbeiten : undefined}
    >
      {spalte.schluessel === "status" && zelle.text !== "" ? (
        schreibbar ? (
          // Ein Chip, der bedienbar aussieht, ist bedienbar: ein Tipp öffnet die Auswahl.
          <button
            type="button"
            className={`marke-zustand statuschip ${ton}`}
            disabled={gesperrtHier}
            title={gesperrtHier ? TEXT_NUR_LESEN : "Status ändern"}
            aria-label={
              gesperrtHier ? `Status ${zelle.text} – ${TEXT_NUR_LESEN}` : `Status ändern, aktuell ${zelle.text}`
            }
            onClick={(ereignis) => {
              ereignis.stopPropagation();
              aufBearbeiten();
            }}
          >
            {zelle.text}
          </button>
        ) : (
          <span className={`marke-zustand ${ton}`}>{zelle.text}</span>
        )
      ) : (
        zelle.text
      )}
      <Zellmarken zeile={zeile} spalte={spalte} />
      {zelle.umstritten && <span aria-label="Konflikthinweis"> ⚠</span>}
    </td>
  );
}

interface FeldEigenschaften extends ZelleEigenschaften {
  readonly start: string;
}

function Eingabezelle({ spalte, start, fehler, aufFertig, aufAbbrechen }: FeldEigenschaften): React.JSX.Element {
  const [eingabe, setzeEingabe] = useState(start);
  /** Escape setzt sie, damit der Blur des verschwindenden Feldes nicht doch schreibt. */
  const verworfen = useRef(false);
  return (
    <td className="bearbeitet">
      <input
        autoFocus
        value={eingabe}
        aria-label={spalte.kopf}
        aria-invalid={fehler !== undefined}
        onChange={(e) => {
          setzeEingabe(e.target.value);
        }}
        onBlur={() => {
          if (!verworfen.current) aufFertig(eingabe);
        }}
        onKeyDown={(ereignis) => {
          if (ereignis.key === "Enter") {
            ereignis.preventDefault();
            aufFertig(eingabe);
          }
          if (ereignis.key === "Escape") {
            ereignis.preventDefault();
            ereignis.stopPropagation();
            verworfen.current = true;
            aufAbbrechen();
          }
          // Strg+D schreibt „jetzt“ in ein Zeitfeld — das Kürzel der Excel.
          if (spalte.art === "zeitpunkt" && (ereignis.ctrlKey || ereignis.metaKey) && ereignis.key.toLowerCase() === "d") {
            ereignis.preventDefault();
            setzeEingabe(zeitpunktText(new Date().toISOString()));
          }
        }}
      />
      {fehler !== undefined && <span className="feldfehler">{fehler}</span>}
    </td>
  );
}

/** Schmale Anzeige (Handy): Die Auswahl öffnet als Blatt am unteren Bildrand. */
const SCHMAL = "(max-width: 700px)";

function istSchmal(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(SCHMAL).matches;
}

/** Text, wenn neben das Blatt getippt wurde: Die Wahl ist nicht übernommen. */
export const TEXT_NICHT_UEBERNOMMEN = "Nicht übernommen – bitte „Übernehmen“ oder „Abbrechen“ tippen.";

/**
 * Die Auswahl mit ausdrücklicher Bestätigung. Die Knöpfe nehmen dem Feld den
 * Fokus nicht (`onMouseDown` verhindert den Blur), sonst würde der Tipp auf
 * „Übernehmen“ zuerst als Wegklicken verwerfen.
 *
 * Am Desktop steht die Auswahl in der Zelle (Enter/Esc, Wegklicken verwirft).
 * Auf dem Handy liegt sie als Blatt über der ganzen Breite am unteren Rand,
 * unabhängig von der Scrollposition der Tabelle; ein Tipp daneben verwirft
 * nicht stumm, sondern meldet „Nicht übernommen“ und lässt das Blatt stehen.
 */
function Auswahlzelle(eigenschaften: FeldEigenschaften): React.JSX.Element {
  const { spalte, start, zeile, aufFertig, aufAbbrechen } = eigenschaften;
  const [auswahl, setzeAuswahl] = useState(start);
  const [schmal] = useState(istSchmal);
  const [nichtUebernommen, setzeNichtUebernommen] = useState(false);
  const behalteFokus = (ereignis: React.SyntheticEvent): void => {
    ereignis.preventDefault();
  };
  const feld = (
    <select
      autoFocus
      value={auswahl}
      aria-label={spalte.kopf}
      onChange={(e) => {
        setzeAuswahl(e.target.value);
        setzeNichtUebernommen(false);
      }}
      onKeyDown={(ereignis) => {
        if (ereignis.key === "Enter") {
          ereignis.preventDefault();
          aufFertig(auswahl);
        }
        if (ereignis.key === "Escape") {
          ereignis.preventDefault();
          ereignis.stopPropagation();
          aufAbbrechen();
        }
      }}
    >
      <option value="">—</option>
      {(spalte.werte ?? []).map((wert) => (
        <option key={wert} value={wert}>
          {spaltenwertTitel(spalte.schluessel, wert)}
        </option>
      ))}
    </select>
  );
  const knoepfe = (
    <span className="auswahlknoepfe">
      <button
        type="button"
        className="haupt"
        disabled={eigenschaften.sperre !== undefined}
        title={eigenschaften.sperre ?? "Übernehmen (Enter)"}
        onMouseDown={behalteFokus}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
          aufFertig(auswahl);
        }}
      >
        Übernehmen
      </button>
      <button
        type="button"
        title="Abbrechen (Esc)"
        onMouseDown={behalteFokus}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
          aufAbbrechen();
        }}
      >
        Abbrechen
      </button>
    </span>
  );
  if (schmal) {
    return (
      <td className="bearbeitet">
        <Auswahlblatt
          titel={`${spalte.kopf} ändern: ${zeile.anzeige}`}
          hinweis={nichtUebernommen}
          aufDaneben={() => {
            setzeNichtUebernommen(true);
          }}
          aufAbbrechen={aufAbbrechen}
        >
          {feld}
          {knoepfe}
          {eigenschaften.fehler !== undefined && <span className="feldfehler">{eigenschaften.fehler}</span>}
        </Auswahlblatt>
      </td>
    );
  }
  return (
    <td
      className="bearbeitet auswahlzelle"
      onBlur={(ereignis) => {
        // Fokus bleibt in der Zelle (Select <-> Knöpfe): nichts verwerfen.
        if (ereignis.currentTarget.contains(ereignis.relatedTarget as Node | null)) return;
        aufAbbrechen();
      }}
    >
      {feld}
      {knoepfe}
      {eigenschaften.fehler !== undefined && <span className="feldfehler">{eigenschaften.fehler}</span>}
    </td>
  );
}

interface BlattEigenschaften {
  readonly titel: string;
  readonly hinweis: boolean;
  readonly aufDaneben: () => void;
  readonly aufAbbrechen: () => void;
  readonly children: React.ReactNode;
}

/** Das Blatt am unteren Bildrand; der Grund dahinter fängt Tipps daneben ab. */
function Auswahlblatt({ titel, hinweis, aufDaneben, aufAbbrechen, children }: BlattEigenschaften): React.JSX.Element {
  const blatt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Das Blatt steht über der Tabelle; Escape am Gerät mit Tastatur verwirft.
    const aufTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key === "Escape") aufAbbrechen();
    };
    document.addEventListener("keydown", aufTaste);
    return () => {
      document.removeEventListener("keydown", aufTaste);
    };
  }, [aufAbbrechen]);
  return createPortal(
    <div className="auswahlgrund" 
      onClick={(ereignis) => {
        ereignis.stopPropagation();
        aufDaneben();
      }}
      data-testid="auswahlgrund"
    >
      <div
        ref={blatt}
        className="auswahlblatt"
        role="dialog"
        aria-modal="true"
        aria-label={titel}
        onClick={(ereignis) => {
          ereignis.stopPropagation();
        }}
      >
        <strong className="auswahltitel">{titel}</strong>
        {children}
        {hinweis && (
          <p className="hinweistext auswahlhinweis" role="alert">
            {TEXT_NICHT_UEBERNOMMEN}
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}
