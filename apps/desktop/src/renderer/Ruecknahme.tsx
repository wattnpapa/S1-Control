/**
 * Die Rücknahme — ein Knopf, der sagt, was er tut (§6 U2, §2.4).
 *
 * Es gibt sie, weil der Knopf an zwei Stellen steht (Lage und Meldekopf) und
 * weil die Antwort des Dienstes ausgewertet werden muss: Nimmt man sie nicht
 * entgegen, passiert bei `brauchtGrund`, `strukturell` und `nichtMoeglich`
 * sichtbar nichts — der Bediener drückt, und die Lage bleibt, wie sie war.
 */

import { useState } from "react";
import { Maske } from "./Maske.js";
import { useLaden } from "./laden.js";

export function Ruecknahme(): React.JSX.Element {
  const laden = useLaden();
  const [grundFuer, setzeGrundFuer] = useState<string | undefined>(undefined);
  const [grund, setzeGrund] = useState("");

  const auswerten = async (grundtext?: string): Promise<void> => {
    const ergebnis = await laden.zurueck(grundtext);
    if (ergebnis === undefined) return;
    if (ergebnis.art === "brauchtGrund") {
      // Die Zielart verlangt einen Grund; ohne Rückfrage bliebe der Druck folgenlos.
      setzeGrund("");
      setzeGrundFuer(ergebnis.zielArt);
      return;
    }
    setzeGrundFuer(undefined);
    if (ergebnis.art === "strukturell") {
      laden.melde(
        "warnung",
        `${ergebnis.meldung} Bitte über den Fachvorgang "${ergebnis.inverseArt}" zurücknehmen.`,
      );
      return;
    }
    if (ergebnis.art === "nichtMoeglich" || ergebnis.art === "abgewiesen") {
      laden.melde("warnung", ergebnis.meldung);
      return;
    }
    if (ergebnis.art === "uhrSteht") {
      laden.melde("warnung", ergebnis.meldung);
    }
  };

  const tiefe = laden.lagebild?.undoTiefe ?? 0;
  const oberste = laden.lagebild?.undoObersteArt;

  return (
    <>
      <button
        type="button"
        disabled={laden.lagebild === undefined || tiefe === 0}
        title={
          tiefe === 0
            ? "Zurzeit gibt es nichts zurückzunehmen"
            : `Nimmt den letzten eigenen Schritt zurück${oberste === undefined ? "" : `: ${oberste}`}`
        }
        onClick={() => void auswerten()}
      >
        Rückgängig
        {oberste === undefined ? "" : ` (${oberste})`}
      </button>

      {grundFuer !== undefined && (
        <Maske
          titel="Grund für die Rücknahme"
          bestaetigungstext="Zurücknehmen"
          bereit={grund.trim().length > 0}
          aufBestaetigen={() => auswerten(grund.trim())}
          aufAbbrechen={() => {
            setzeGrundFuer(undefined);
          }}
        >
          <p>
            Die Rücknahme wird als eigener Vorgang der Art „{grundFuer}“ eingetragen und verlangt
            einen Grund. Er steht später im Einsatztagebuch.
          </p>
          <label>
            Grund
            <input
              value={grund}
              onChange={(ereignis) => {
                setzeGrund(ereignis.target.value);
              }}
            />
          </label>
        </Maske>
      )}
    </>
  );
}
