/**
 * Die Rücknahme — ein Knopf, der sagt, was er tut (§6 U2, §2.4).
 *
 * Es gibt sie, weil der Knopf an zwei Stellen steht (Lage und Meldekopf) und
 * weil die Antwort des Dienstes ausgewertet werden muss: Nimmt man sie nicht
 * entgegen, passiert bei `brauchtGrund`, `strukturell` und `nichtMoeglich`
 * sichtbar nichts — der Bediener drückt, und die Lage bleibt, wie sie war.
 */

import { useState } from "react";
import { ereignisMitObjekt, ereignisname } from "./Ereignisnamen.js";
import { Maske, TEXT_NUR_LESEN } from "./Maske.js";
import { useLaden } from "./laden.js";

/** Diese Schritte gehen auch im beendeten Einsatz zurück — sie öffnen ihn wieder. */
const OEFFNENDE_SCHRITTE: ReadonlySet<string> = new Set(["EinsatzBeendet"]);

const TEXT_LEER =
  "Nichts zum Rückgängigmachen. Der Verlauf gilt nur für diese Sitzung und ist nach dem Neuladen oder " +
  "Neustart leer — bereits Eingetragenes bleibt im Einsatztagebuch.";

export function Ruecknahme(): React.JSX.Element {
  const laden = useLaden();
  const [grundFuer, setzeGrundFuer] = useState<string | undefined>(undefined);
  const [grund, setzeGrund] = useState("");
  const [frage, setzeFrage] = useState(false);

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
        `${ergebnis.meldung} Bitte über den Vorgang „${ereignisname(ergebnis.inverseArt)}“ zurücknehmen.`,
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
  const status = laden.lagebild?.einsatzStatus ?? "AKTIV";
  const schreibsperre = status !== "AKTIV" && !(status === "BEENDET" && OEFFNENDE_SCHRITTE.has(oberste ?? ""));
  const schritt = oberste === undefined ? "" : ereignisMitObjekt(oberste, laden.lagebild?.undoObersteObjekt);
  const leer = laden.lagebild !== undefined && tiefe === 0;
  const hinweis = schreibsperre ? TEXT_NUR_LESEN : leer ? TEXT_LEER : `Nimmt Ihren letzten Schritt zurück: ${schritt}`;

  return (
    <>
      <button
        type="button"
        disabled={laden.lagebild === undefined || tiefe === 0 || schreibsperre}
        title={hinweis}
        onClick={() => {
          setzeFrage(true);
        }}
      >
        {leer ? "Rückgängig (Verlauf leer)" : schritt === "" ? "Rückgängig" : `Rückgängig: ${schritt}`}
      </button>

      {frage && (
        <Maske
          titel="Rückgängig machen?"
          bestaetigungstext="Rückgängig machen"
          trotzSperre
          aufBestaetigen={async () => {
            setzeFrage(false);
            await auswerten();
          }}
          aufAbbrechen={() => {
            setzeFrage(false);
          }}
        >
          <p>
            <strong>{schritt}</strong> rückgängig machen?
          </p>
          <p className="hinweistext">
            Das gilt für alle Arbeitsplätze. Es nimmt nur Ihren letzten eigenen Schritt zurück, nicht den eines
            anderen Arbeitsplatzes. Die Rücknahme steht im Einsatztagebuch.
          </p>
        </Maske>
      )}

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
            Die Rücknahme wird als eigener Vorgang („{ereignisname(grundFuer)}“) eingetragen und verlangt
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
