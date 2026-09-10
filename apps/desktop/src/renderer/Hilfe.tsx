/**
 * Das Hilfefenster: Tastenkarte, Abkürzungsliste, Ansichten, Störfälle
 * (M3.6, erweitert in M8.1).
 *
 * Zwei Dinge in einem Fenster, und das ist keine Sparsamkeit: In der Excel
 * sind es zwei Handgriffe an derselben Stelle — Strg+H öffnet die
 * Abkürzungsliste, die Tastenkürzel stehen im Blatt „Hinweise“ daneben. Wer
 * nachschlägt, sucht beides im selben Augenblick.
 *
 * **Nichts hier ist abgeschrieben.** Die Tastenkarte kommt aus derselben
 * Liste, aus der die Kürzel tatsächlich greifen; die Abkürzungen aus der, die
 * die Suche bedient; die Ansichtstexte aus der, die auch an den Ansichten
 * selbst hängt; die Störfälle aus der, die die Diagnose und die gedruckte
 * Karte lesen. Zwei Listen wären nach der dritten Änderung zwei verschiedene,
 * und die falsche stünde in der Hilfe.
 *
 * **Vier Bereiche, umschaltbar statt untereinander** (M8.1). Mit den Störfällen
 * und zehn Ansichtstexten dazu wäre das Fenster sonst eine Seite, durch die
 * gescrollt wird, um zu finden, was man sucht. Wer die Hilfe öffnet, hat eine
 * Frage, und die gehört zu einem der vier Bereiche.
 */

import { useMemo, useState } from "react";

import { AKUELI, ANSICHTEN, STOERFAELLE, kuerzel, sucheAkueli } from "@s1/domaene";

import { KUERZEL, kuerzelText, type Kuerzelbereich } from "./tastatur.js";

const BEREICHE: readonly Kuerzelbereich[] = ["Allgemein", "Abschnitte", "Einheiten", "Tagebuch", "Masken"];

/** Die vier Bereiche des Fensters, in der Reihenfolge der Häufigkeit ihrer Frage. */
const TEILE = [
  { schluessel: "tasten", titel: "Tastenkarte" },
  { schluessel: "akueli", titel: "Abkürzungen" },
  { schluessel: "ansichten", titel: "Ansichten" },
  { schluessel: "stoerfaelle", titel: "Störfälle" },
] as const;

type Teil = (typeof TEILE)[number]["schluessel"];

export interface HilfeEigenschaften {
  readonly aufSchliessen: () => void;
}

export function Hilfe({ aufSchliessen }: HilfeEigenschaften): React.JSX.Element {
  const [suche, setzeSuche] = useState("");
  const [teil, setzeTeil] = useState<Teil>("tasten");
  const treffer = useMemo(() => sucheAkueli(suche), [suche]);

  return (
    <section aria-label="Hilfe" className="hilfe">
      <div className="hilfekopf">
        <h2>Tastenkarte und Abkürzungen</h2>
        <button type="button" onClick={aufSchliessen}>
          Schließen
        </button>
      </div>

      <div className="reiterleiste" role="tablist">
        {TEILE.map((eintrag) => (
          <button
            key={eintrag.schluessel}
            type="button"
            role="tab"
            aria-selected={teil === eintrag.schluessel}
            onClick={() => {
              setzeTeil(eintrag.schluessel);
            }}
          >
            {eintrag.titel}
          </button>
        ))}
      </div>

      <div className="hilfespalten">
        {teil === "tasten" && (
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
        )}

        {teil === "akueli" && (
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
        )}

        {teil === "ansichten" && (
        <div>
          <h3>Die Ansichten</h3>
          <p className="hinweistext">
            Dieselben Texte stehen an den Ansichten selbst und im Handbuch.
          </p>
          {ANSICHTEN.map((ansicht) => (
            <div key={ansicht.kennung} className="ansichtshilfe">
              <h4>{ansicht.titel}</h4>
              <p>{ansicht.wozu}</p>
              <p>
                <em>Zuerst:</em> {ansicht.zuerst}
              </p>
              <p>
                <em>Gut zu wissen:</em> {ansicht.ueberraschung}
              </p>
              {ansicht.kuerzel.length > 0 && (
                <p className="hinweistext">
                  {ansicht.kuerzel
                    .map((name) => {
                      const eintrag = kuerzel(name);
                      return eintrag === undefined ? name : kuerzelText(eintrag);
                    })
                    .join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
        )}

        {teil === "stoerfaelle" && (
        <div>
          <h3>Wenn etwas klemmt</h3>
          <p className="hinweistext">
            Dieselben sechs Fälle zeigt die Diagnoseansicht, und die
            Kurzanleitung druckt sie.
          </p>
          {STOERFAELLE.map((fall) => (
            <div key={fall.kennung} className="stoerfall">
              <h4>{fall.titel}</h4>
              <p>{fall.woran}</p>
              <ol>
                {fall.schritte.map((schritt) => (
                  <li key={schritt}>{schritt}</li>
                ))}
              </ol>
              <p className="nicht">Nicht: {fall.nicht}</p>
            </div>
          ))}
        </div>
        )}
      </div>
    </section>
  );
}
