/**
 * „Erfassungsbögen speichern" — der Sammel-Download aus der Einheitentabelle.
 *
 * Wer zwanzig Einheiten markiert, bekommt deren Erfassungsbögen als **eine**
 * Datei: eine Bündeldatei (.json) im Format der Erfassungsbogen-App, je
 * Einheit mit der jüngsten Fassung. Die App öffnet sie und druckt daraus die
 * PDFs; eine andere Führungsstelle liest sie über „Bündel einlesen".
 *
 * Die Datei geht nach `ausgaben\` wie jede Ausgabe; `Ausgabedatei` bietet
 * danach Öffnen und Ordner zeigen, in der Web-Schale das Herunterladen.
 * Einheiten ohne Bogen (von Hand angelegt) werden genannt, nicht erfunden.
 */

import { useState } from "react";

import type { Erfassungsbogenergebnis } from "../kontrakt/index.js";
import { Ausgabedatei } from "./Ausgabedatei.js";
import { useLaden } from "./laden.js";
import { Maske } from "./Maske.js";

export interface ErfassungsboegenEigenschaften {
  /** Alle markierten Einheiten — auch die außerhalb des Ausschnitts. */
  readonly einheitIds: readonly string[];
  readonly aufSchliessen: () => void;
}

/** Was nach dem Schreiben unter der Datei steht. */
export function ergebnistext(ergebnis: Erfassungsbogenergebnis): string {
  if (ergebnis.boegen === 0) return "Keine der gewählten Einheiten hat einen Erfassungsbogen. Es wurde keine Datei geschrieben.";
  const zahl = ergebnis.boegen === 1 ? "1 Erfassungsbogen" : `${String(ergebnis.boegen)} Erfassungsbögen`;
  return `${zahl} gespeichert.`;
}

export function Erfassungsboegen({ einheitIds, aufSchliessen }: ErfassungsboegenEigenschaften): React.JSX.Element {
  const schreibe = useLaden((z) => z.schreibeErfassungsboegen);
  const [ergebnis, setzeErgebnis] = useState<Erfassungsbogenergebnis | undefined>(undefined);
  const anzahl = einheitIds.length;

  const speichere = async (): Promise<void> => {
    const antwort = await schreibe(einheitIds);
    if (antwort !== undefined) setzeErgebnis(antwort);
  };

  return (
    <Maske
      titel="Erfassungsbögen speichern"
      bestaetigungstext={ergebnis === undefined ? "Speichern" : "Schließen"}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={ergebnis === undefined ? speichere : aufSchliessen}
      // Liest nur und schreibt nach `ausgaben\`: auch im beendeten Einsatz.
      trotzSperre
    >
      {ergebnis === undefined ? (
        <p className="hinweistext">
          {anzahl === 1 ? "1 Einheit gewählt." : `${String(anzahl)} Einheiten gewählt.`} Gespeichert wird je Einheit der jüngste
          Erfassungsbogen, alle zusammen als eine Bündeldatei (.json). Die Erfassungsbogen-App öffnet sie und druckt daraus die PDFs;
          S1-Control liest sie über „Bündel einlesen".
        </p>
      ) : (
        <Ergebnis ergebnis={ergebnis} />
      )}
    </Maske>
  );
}

function Ergebnis({ ergebnis }: { readonly ergebnis: Erfassungsbogenergebnis }): React.JSX.Element {
  return (
    <>
      <p className="hinweistext">{ergebnistext(ergebnis)}</p>
      {ergebnis.pfad !== undefined && <Ausgabedatei pfad={ergebnis.pfad} vorsatz="Geschrieben" zusatz={`${String(ergebnis.bytes)} Bytes`} />}
      {ergebnis.ohneBogen.length > 0 && (
        <p className="hinweistext">Ohne Erfassungsbogen (von Hand angelegt): {ergebnis.ohneBogen.join(", ")}</p>
      )}
    </>
  );
}
