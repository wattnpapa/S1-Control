/**
 * Die vier Bereiche des Hilfefensters (`Hilfe.tsx`), je als eigene Komponente.
 */

import { useMemo, useState } from "react";

import { AKUELI, ANSICHTEN, ERSTE_SCHRITTE, STOERFAELLE, kuerzel, sucheAkueli } from "@s1/domaene";

import { KUERZEL, kuerzelText, type Kuerzelbereich } from "./tastatur.js";

const BEREICHE: readonly Kuerzelbereich[] = ["Allgemein", "Abschnitte", "Einheiten", "Tagebuch", "Masken"];

/** Entfernt Auszeichnungszeichen aus Texten, die auch im Handbuch gedruckt werden. */
export function klartext(text: string): string {
  return text.replace(/\*\*/gu, "").replace(/`/gu, "");
}

/** Erste Schritte in Klartext, danach die Tastenkürzel. */
export function Tastenteil(): React.JSX.Element {
  return (
    <div>
      <h3>Erste Schritte</h3>
      <ol className="ersteschritte">
        {ERSTE_SCHRITTE.map((schritt) => (
          <li key={schritt}>{schritt}</li>
        ))}
      </ol>
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
                    <td>{eintrag.beschreibung}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** Die Abkürzungsliste mit Suche. */
export function Akueliteil(): React.JSX.Element {
  const [suche, setzeSuche] = useState("");
  const treffer = useMemo(() => sucheAkueli(suche), [suche]);
  return (
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
          ? `${String(AKUELI.length)} Abkürzungen aus dem Abkürzungsverzeichnis`
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
  );
}

/** Die Kurzhilfe aller Ansichten. */
export function Ansichtenteil(): React.JSX.Element {
  return (
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
  );
}

/** Die Störfälle; im Browser ohne den Startfall der installierten Anwendung. */
export function Stoerfallteil({ imBrowser }: { readonly imBrowser: boolean }): React.JSX.Element {
  const stoerfaelle = imBrowser ? STOERFAELLE.filter((fall) => fall.kennung !== "START_SCHEITERT") : STOERFAELLE;
  return (
    <div>
      <h3>Wenn etwas klemmt</h3>
      <p className="hinweistext">
        Dieselben Fälle zeigt die Diagnoseansicht, und die
        Kurzanleitung druckt sie.
      </p>
      {stoerfaelle.map((fall) => (
        <div key={fall.kennung} className="stoerfall">
          <h4>{fall.titel}</h4>
          <p>{klartext(fall.woran)}</p>
          <ol>
            {fall.schritte.map((schritt) => (
              <li key={schritt}>{klartext(schritt)}</li>
            ))}
          </ol>
          <p className="nicht">Nicht: {klartext(fall.nicht)}</p>
        </div>
      ))}
    </div>
  );
}
