/**
 * Eine Nachricht als Ganzes im Vordrucklayout, mit Laufzettel — nur lesen
 * (KONZEPT-NACHRICHTEN.md §6).
 *
 * Sie öffnet mit „Lesen" an einer Zeile. Die Kenntnisnahme schreibt das Blatt,
 * nicht diese Ansicht: Sie zeigt, was sie bekommt, und schließt mit Esc oder
 * „Schließen".
 *
 * Schnitt N3: darunter die „Vorschau" des Vordrucks, wie er gedruckt wird
 * (Entscheidung 4, Vorbelegung aufgeklappt), und „Als Vordruck drucken", das
 * das PDF aus `@s1/ausgaben` im Ordner „ausgaben\nachrichten" ablegt (§7).
 *
 * Additiv (SGL P0-1): Der Kopf nennt den feinen Stand („angenommen (FmZ)",
 * „befördert"), die Marke „ohne Nummer" und den Vermerk der FmZ mit Zeit,
 * Handzeichen und Mittel. Die Ansicht öffnet auch aus dem Tagebuch
 * („Nachricht öffnen", ETB P0-1).
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { FmzTeil, LaufzettelAnzeige, NachrichtenteilAnzeige } from "./Vordruckteile.js";
import { Vordruckvorschau } from "./Vordruckvorschau.js";

export interface NachrichtenansichtEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly aufSchliessen: () => void;
  /** Additiv (N3): „Als Vordruck drucken" und die Zeile mit der erzeugten Datei. */
  readonly aufVordruck?: (() => void) | undefined;
  readonly vordruckanzeige?: React.ReactNode;
}

export function Nachrichtenansicht({ zeile, aufSchliessen, aufVordruck, vordruckanzeige }: NachrichtenansichtEigenschaften): React.JSX.Element {
  const knopf = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    knopf.current?.focus();
  }, []);
  // Escape am Dokument und nicht am Dialog: Ein Klick auf den Vordrucktext
  // nimmt den Fokus aus dem Dialog, und ein Hörer am Dialog hörte dann nichts
  // mehr — Escape täte nach dem ersten Klick ins Leere.
  useEffect(() => {
    const aufTaste = (ereignis: KeyboardEvent): void => {
      if (ereignis.key !== "Escape") return;
      ereignis.preventDefault();
      aufSchliessen();
    };
    document.addEventListener("keydown", aufTaste);
    return () => document.removeEventListener("keydown", aufTaste);
  }, [aufSchliessen]);
  const nummer = zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
  const stand = projektion.standDerZeile(zeile);
  return createPortal(
    <div className="maskengrund">
      <div
        className="maske vordruck"
        role="dialog"
        aria-label={`Nachricht ${nummer}`}
      >
        {/* Der Schließen-Knopf auch oben: Bei langem Vordruck mit Vorschau stünde
            der untere erst nach dem Scrollen im Bild. */}
        <div className="ansichtkopf" style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
          <h3>
            Nachricht {nummer} <small className="leise">· {projektion.laufstandWort(stand.laufstand)}</small>
            {stand.ohneNummer && <span className="marke"> ohne Nummer</span>}
          </h3>
          <button type="button" aria-label="Fenster schließen" title="Schließen (Esc)" onClick={aufSchliessen}>
            ×
          </button>
        </div>
        {zeile.fmzVermerkText !== undefined && <p className="leise">FmZ: {zeile.fmzVermerkText}</p>}
        <FmzTeil zeile={zeile} />
        <NachrichtenteilAnzeige zeile={zeile} />
        <LaufzettelAnzeige zeile={zeile} />
        <Vordruckvorschau ort="ansicht" quelle={{ art: "zeile", zeile }} />
        {vordruckanzeige}
        <div className="maskenknoepfe">
          {aufVordruck !== undefined && (
            <button type="button" title="Den Nachrichtenvordruck als PDF im Ordner „ausgaben“ ablegen" onClick={aufVordruck}>
              Als Vordruck drucken
            </button>
          )}
          <button ref={knopf} type="button" className="haupt" onClick={aufSchliessen}>
            Schließen
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
