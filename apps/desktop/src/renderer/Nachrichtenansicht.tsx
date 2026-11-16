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
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import type { Nachrichtenzeile } from "@s1/domaene";

import { laufwort } from "./Nachrichtenliste.js";
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
  const nummer = zeile.nummer === undefined ? zeile.richtungKurz : `${zeile.richtungKurz} ${String(zeile.nummer)}`;
  return createPortal(
    <div className="maskengrund">
      <div
        className="maske vordruck"
        role="dialog"
        aria-label={`Nachricht ${nummer}`}
        onKeyDown={(ereignis) => {
          if (ereignis.key !== "Escape") return;
          ereignis.stopPropagation();
          ereignis.preventDefault();
          aufSchliessen();
        }}
      >
        <h3>
          Nachricht {nummer} <small className="leise">· {laufwort(zeile.laufzustand)}</small>
        </h3>
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
