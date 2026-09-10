/**
 * Das Hilfefenster: Tastenkarte und Abkürzungsliste (M3.6).
 *
 * Zwei Dinge in einem Fenster, und das ist keine Sparsamkeit: In der Excel
 * sind es zwei Handgriffe an derselben Stelle — Strg+H öffnet die
 * Abkürzungsliste, die Tastenkürzel stehen im Blatt „Hinweise“ daneben. Wer
 * nachschlägt, sucht beides im selben Augenblick.
 *
 * **Die Tastenkarte wird nicht abgeschrieben, sondern gelesen.** Sie kommt
 * aus `tastatur.ts` — derselben Liste, aus der die Kürzel tatsächlich
 * greifen. Zwei Listen wären nach der dritten Änderung zwei verschiedene, und
 * die falsche stünde in der Hilfe.
 */

import { useMemo, useState } from "react";

import { AKUELI, sucheAkueli } from "@s1/domaene";

import { KUERZEL, kuerzelText, type Kuerzelbereich } from "./tastatur.js";

const BEREICHE: readonly Kuerzelbereich[] = ["Allgemein", "Abschnitte", "Einheiten", "Tagebuch", "Masken"];

export interface HilfeEigenschaften {
  readonly aufSchliessen: () => void;
}

export function Hilfe({ aufSchliessen }: HilfeEigenschaften): React.JSX.Element {
  const [suche, setzeSuche] = useState("");
  const treffer = useMemo(() => sucheAkueli(suche), [suche]);

  return (
    <section aria-label="Hilfe" className="hilfe">
      <div className="hilfekopf">
        <h2>Tastenkarte und Abkürzungen</h2>
        <button type="button" onClick={aufSchliessen}>
          Schließen
        </button>
      </div>

      <div className="hilfespalten">
        <div>
          <h3>Tastenkürzel</h3>
          {BEREICHE.map((bereich) => {
            const kuerzelDesBereichs = KUERZEL.filter((eintrag) => eintrag.bereich === bereich);
            if (kuerzelDesBereichs.length === 0) return null;
            return (
              <div key={bereich}>
                <h4>{bereich}</h4>
                <table>
                  <tbody>
                    {kuerzelDesBereichs.map((eintrag) => (
                      <tr key={eintrag.name}>
                        <th scope="row">
                          <kbd>{kuerzelText(eintrag)}</kbd>
                        </th>
                        <td>
                          {eintrag.beschreibung}
                          {/* Woher das Kürzel stammt, gehört in die Hilfe:
                              Wer die Excel bedient hat, erkennt es wieder und
                              muss nichts Neues lernen. */}
                          {eintrag.excel === undefined ? "" : ` · in der Excel: ${eintrag.excel}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        <div>
          <h3>Abkürzungsliste</h3>
          <label>
            Suche
            <input
              value={suche}
              onChange={(e) => {
                setzeSuche(e.target.value);
              }}
              placeholder="Kürzel oder Wort"
            />
          </label>
          <p className="hinweistext">
            {treffer.length === AKUELI.length
              ? `${String(AKUELI.length)} Einträge aus dem Blatt „AküLi“ der Excel`
              : `${String(treffer.length)} von ${String(AKUELI.length)} Einträgen`}
          </p>
          <div className="tabellenrahmen akueli">
            <table>
              <tbody>
                {treffer.map((eintrag) => (
                  <tr key={`${eintrag.gruppe}-${eintrag.kuerzel}`}>
                    <th scope="row">{eintrag.kuerzel}</th>
                    <td>{eintrag.bedeutung}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
