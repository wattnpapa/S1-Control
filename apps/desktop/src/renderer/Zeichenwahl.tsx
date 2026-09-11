/**
 * Die Wahl eines taktischen Zeichens aus dem gelieferten Satz.
 *
 * Der Satz hat knapp tausend Zeichen. Eine Liste, die alle zeigt, ist keine
 * Wahl, sondern ein Verzeichnis — gesucht wird deshalb über Titel und Kennung,
 * und die Kategorie schränkt vorher ein. Gezeigt wird eine begrenzte Zahl
 * Treffer; wer mehr braucht, tippt genauer.
 *
 * **Die Zeichen werden einzeln geladen.** Eine Kachelwand lädt so viele
 * Dateien, wie sie Kacheln hat, und keine mehr (`zeichensatz.ts`). Deshalb die
 * Schranke: Vierzig Kacheln sind vierzig kleine Dateien, tausend wären vier
 * Megabyte für einen Blick.
 */

import { useMemo, useState } from "react";

import { Zeichen } from "./zeichen.js";
import { kategorien, sucheZeichen, titelVon } from "./zeichensatz.js";

/** Wie viele Treffer die Kachelwand höchstens zeigt (siehe Kopfkommentar). */
const HOECHSTENS = 40;

export interface ZeichenwahlEigenschaften {
  /** Die gewählte Kennung; `undefined` heißt „dem Typ folgen". */
  readonly wert: string | undefined;
  readonly aufWahl: (kennung: string | undefined) => void;
  /**
   * Was steht, wenn nichts gewählt ist — etwa „Einsatzabschnittsleitung
   * (aus dem Typ)". Sie steht auf der ersten Kachel und macht sichtbar, wovon
   * die freie Wahl abweicht.
   */
  readonly abgeleitet?: string | undefined;
}

export function Zeichenwahl({
  wert,
  aufWahl,
  abgeleitet,
}: ZeichenwahlEigenschaften): React.JSX.Element {
  const [suche, setzeSuche] = useState("");
  const [kategorie, setzeKategorie] = useState("");

  const alleKategorien = useMemo(() => kategorien(), []);
  const treffer = useMemo(
    () =>
      sucheZeichen(suche, {
        hoechstens: HOECHSTENS,
        ...(kategorie === "" ? {} : { kategorie }),
      }),
    [suche, kategorie],
  );

  return (
    <div className="zeichenwahl">
      <div className="zeichenwahlkopf">
        <label>
          Suche
          <input
            value={suche}
            placeholder="Titel oder Kennung …"
            onChange={(e) => {
              setzeSuche(e.target.value);
            }}
          />
        </label>
        <label>
          Kategorie
          <select
            value={kategorie}
            onChange={(e) => {
              setzeKategorie(e.target.value);
            }}
          >
            <option value="">— alle —</option>
            {alleKategorien.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="zeichenkacheln" aria-label="Taktische Zeichen">
        <li>
          {/* Der Rückweg zur Ableitung steht **vorn** und nicht als Knopf
              daneben: Er ist eine Wahl wie jede andere, und wer ihn sucht,
              sucht ihn dort, wo die Zeichen stehen. */}
          <button
            type="button"
            className={wert === undefined ? "zeichenkachel gewaehlt" : "zeichenkachel"}
            aria-pressed={wert === undefined}
            onClick={() => {
              aufWahl(undefined);
            }}
          >
            <span className="kachelbild kachelleer">aus dem Typ</span>
            <span className="kacheltitel">{abgeleitet ?? "dem Typ folgen"}</span>
          </button>
        </li>
        {treffer.map((eintrag) => (
          <li key={eintrag.kennung}>
            <button
              type="button"
              className={wert === eintrag.kennung ? "zeichenkachel gewaehlt" : "zeichenkachel"}
              aria-pressed={wert === eintrag.kennung}
              title={`${eintrag.titel} (${eintrag.kennung})`}
              onClick={() => {
                aufWahl(eintrag.kennung);
              }}
            >
              <span className="kachelbild">
                <Zeichen kennung={eintrag.kennung} bedeutung={eintrag.titel} breite={44} />
              </span>
              <span className="kacheltitel">{eintrag.titel}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="hinweistext">
        {treffer.length >= HOECHSTENS
          ? `Mehr als ${String(HOECHSTENS)} Treffer — die Suche eingrenzen.`
          : `${String(treffer.length)} Zeichen`}
        {wert === undefined ? "" : ` · gewählt: ${titelVon(wert) ?? wert}`}
      </p>
    </div>
  );
}
