/**
 * Die Rücknahme — ein Knopf, der sagt, was er tut (§6 U2, §2.4).
 *
 * Er steht seit Runde 6 („Entlastung", 3.3) rechts in der Statuszeile, immer
 * an derselben Stelle und in jeder Betriebsart einmal: „↶ Rückgängig: Einheit
 * ‚TZ‘ entfernt". Vorher stand er in der Werkzeugzeile der Lage und im Kopf
 * des Meldekopfs, grau und ohne Namen, wenn der Verlauf leer war — wer ihn so
 * sah, wusste nicht, warum er nicht ging (Audit P0-2). Jetzt sagt er es:
 * „Rückgängig: nichts zurückzunehmen", der Titel erklärt den Rest.
 *
 * Die Antwort des Dienstes wird hier ausgewertet: Nimmt man sie nicht
 * entgegen, passiert bei `brauchtGrund`, `strukturell` und `nichtMoeglich`
 * sichtbar nichts — der Bediener drückt, und die Lage bleibt, wie sie war.
 * Die Bestätigung einer gelungenen Rücknahme steht links daneben
 * (`Schreibbestaetigung`, aus `laden.zurueck`).
 */

import { useMemo, useState } from "react";
import { obersterSchritt } from "./bestaetigungsfolge.js";
import { ereignisname } from "./Ereignisnamen.js";
import { Maske, TEXT_NUR_LESEN } from "./Maske.js";
import { useLaden } from "./laden.js";
import { useKuerzel } from "./tastatur.js";

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
  const schritt = obersterSchritt(laden.lagebild);
  const leer = laden.lagebild !== undefined && tiefe === 0;
  const hinweis = schreibsperre
    ? TEXT_NUR_LESEN
    : leer
      ? TEXT_LEER
      : `Nimmt Ihren letzten Schritt zurück: ${schritt} (Strg+Z)`;
  const gesperrt = laden.lagebild === undefined || tiefe === 0 || schreibsperre;

  // Strg+Z steht seit M3.6 in der Tastenkarte, war aber an keinen Knopf
  // gebunden. Jetzt, da der Knopf genau einmal im Fenster steht, hängt das
  // Kürzel an ihm: Es öffnet dieselbe Rückfrage wie der Klick. Im Eingabefeld
  // bleibt Strg+Z das Zurücknehmen des Tippens (`findeKuerzel`).
  useKuerzel(
    useMemo(
      () => ({
        zurueck: () => {
          if (!gesperrt) setzeFrage(true);
        },
      }),
      [gesperrt],
    ),
  );

  return (
    <>
      <button
        type="button"
        className="ruecknahme"
        aria-keyshortcuts="Control+Z"
        disabled={gesperrt}
        title={hinweis}
        onClick={() => {
          setzeFrage(true);
        }}
      >
        <span aria-hidden="true">↶ </span>
        {leer ? "Rückgängig: nichts zurückzunehmen" : schritt === "" ? "Rückgängig" : `Rückgängig: ${schritt}`}
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
