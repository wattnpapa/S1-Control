/**
 * Die Maske „Zusagen“ einer Anforderung (§5.6.2).
 *
 * Vorher schrieb der Knopf die Zusage sofort — mit „jetzt“ als „Zugesagt
 * für“ und ohne „Zugesagt von“. Die Spalten P und Q der Excel blieben damit
 * leer oder falsch, und eine Planzeit „jetzt“ liegt beim Schreiben schon in
 * der Vergangenheit (§2.5 Hinweis). Die Maske fragt beides ab; Strg+D setzt
 * „jetzt“, wo es wirklich gemeint ist.
 */

import { useState } from "react";

import type { Anforderungszeile } from "@s1/domaene";

import { abloesungZugesagt } from "../kontrakt/bedienschritte.js";
import { useAnlegeversuch } from "./Anlegeversuch.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";
import { TEXT_ZEITFORMAT, funkzeitAusEingabe } from "./funkzeit.js";

export interface AnforderungZusageEigenschaften {
  readonly zeile: Anforderungszeile;
  readonly aufSchliessen: () => void;
}

export function AnforderungZusage({ zeile, aufSchliessen }: AnforderungZusageEigenschaften): React.JSX.Element {
  const versuch = useAnlegeversuch();
  const [fuer, setzeFuer] = useState("");
  const [von, setzeVon] = useState("");
  const zeitpunkt = funkzeitAusEingabe(fuer);

  return (
    <Maske
      titel={`Zusage zu Anforderung${zeile.kennung === "" ? "" : ` ${zeile.kennung}`} erfassen`}
      bestaetigungstext="Zusagen"
      bereit={zeitpunkt !== undefined && !versuch.gesperrt}
      bereitGrund="Zeit „Zugesagt für“ eintragen"
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        if (zeitpunkt === undefined) return;
        const ergebnis = await versuch.schreibe(abloesungZugesagt(zeile.id, zeitpunkt, von.trim()));
        if (ergebnis?.art === "geschrieben") aufSchliessen();
      }}
    >
      <label>
        Zugesagt für
        <Zeitfeld wert={fuer} aufAenderung={setzeFuer} platzhalter="HH:MM, HHMM oder TT.MM. HH:MM" />
      </label>
      {fuer.trim() !== "" && zeitpunkt === undefined && (
        <span className="feldfehler">{TEXT_ZEITFORMAT}</span>
      )}
      <label>
        Zugesagt von
        <input
          value={von}
          placeholder="z. B. THW RB Oldenburg"
          onChange={(e) => {
            setzeVon(e.target.value);
          }}
        />
      </label>
      {versuch.anzeige}
    </Maske>
  );
}
