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

import { useRef, useState } from "react";

import { statusTon, spaltenwertTitel, zeitpunktText, type Spalte, type Tabellenzeile } from "@s1/domaene";

import { Zellmarken } from "./Ressourcenmarken.js";

/** Zahlenspalten stehen rechts: Wer Stärken vergleicht, liest Spalten. */
export function istZahl(spalte: Spalte): boolean {
  return spalte.art === "zahl" || spalte.schluessel === "gesamt" || spalte.schluessel === "staerke";
}

export interface ZelleEigenschaften {
  readonly zeile: Tabellenzeile;
  readonly spalte: Spalte;
  readonly bearbeitet: boolean;
  /** Die Regel, gegen die die Eingabe verstößt; die Zelle zeigt sie unter dem Feld. */
  readonly fehler?: string;
  readonly aufBearbeiten: () => void;
  readonly aufFertig: (eingabe: string) => void;
  readonly aufAbbrechen: () => void;
}

export function Zelle(eigenschaften: ZelleEigenschaften): React.JSX.Element {
  const { zeile, spalte, bearbeitet } = eigenschaften;
  const zelle = zeile.zellen[spalte.schluessel];
  if (zelle === undefined) return <td />;
  if (bearbeitet && spalte.schreibt !== undefined) {
    const start = spalte.art === "auswahl" ? (typeof zelle.wert === "string" ? zelle.wert : "") : zelle.text;
    return spalte.art === "auswahl" ? (
      <Auswahlzelle {...eigenschaften} start={start} />
    ) : (
      <Eingabezelle {...eigenschaften} start={start} />
    );
  }
  return <Anzeigezelle {...eigenschaften} />;
}

function Anzeigezelle({ zeile, spalte, aufBearbeiten }: ZelleEigenschaften): React.JSX.Element {
  const zelle = zeile.zellen[spalte.schluessel];
  if (zelle === undefined) return <td />;
  const titel = zelle.umstritten
    ? "An diesem Feld hängt ein Konflikthinweis: Ein anderer Arbeitsplatz hat es zuletzt anders gesehen (§3.8)."
    : (zelle.wanduhr ?? "");
  const schreibbar = spalte.schreibt !== undefined;
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
      onDoubleClick={schreibbar ? aufBearbeiten : undefined}
    >
      {spalte.schluessel === "status" && zelle.text !== "" ? (
        schreibbar ? (
          // Ein Chip, der bedienbar aussieht, ist bedienbar: ein Tipp öffnet die Auswahl.
          <button
            type="button"
            className={`marke-zustand statuschip ${ton}`}
            title="Status ändern"
            aria-label={`Status ändern, aktuell ${zelle.text}`}
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

/**
 * Die Auswahl mit ausdrücklicher Bestätigung. Die Knöpfe nehmen dem Feld den
 * Fokus nicht (`onMouseDown` verhindert den Blur), sonst würde der Tipp auf
 * „Übernehmen“ zuerst als Wegklicken verwerfen.
 */
function Auswahlzelle({ spalte, start, aufFertig, aufAbbrechen }: FeldEigenschaften): React.JSX.Element {
  const [auswahl, setzeAuswahl] = useState(start);
  const behalteFokus = (ereignis: React.SyntheticEvent): void => {
    ereignis.preventDefault();
  };
  return (
    <td
      className="bearbeitet auswahlzelle"
      onBlur={(ereignis) => {
        // Fokus bleibt in der Zelle (Select <-> Knöpfe): nichts verwerfen.
        if (ereignis.currentTarget.contains(ereignis.relatedTarget as Node | null)) return;
        aufAbbrechen();
      }}
    >
      <select
        autoFocus
        value={auswahl}
        aria-label={spalte.kopf}
        onChange={(e) => {
          setzeAuswahl(e.target.value);
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
      <span className="auswahlknoepfe">
        <button
          type="button"
          className="haupt"
          title="Übernehmen (Enter)"
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
    </td>
  );
}
