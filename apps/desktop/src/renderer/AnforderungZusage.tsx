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

import { abloesungZugesagt, zeitpunktAusEingabe } from "../kontrakt/bedienschritte.js";
import { Maske } from "./Maske.js";
import { Zeitfeld } from "./Zeitfeld.js";
import { useLaden } from "./laden.js";

export interface AnforderungZusageEigenschaften {
  readonly zeile: Anforderungszeile;
  readonly aufSchliessen: () => void;
}

export function AnforderungZusage({ zeile, aufSchliessen }: AnforderungZusageEigenschaften): React.JSX.Element {
  const laden = useLaden();
  const [fuer, setzeFuer] = useState("");
  const [von, setzeVon] = useState("");
  const zeitpunkt = zeitpunktAusEingabe(fuer);

  return (
    <Maske
      titel={`Ablösung ${zeile.kennung === "" ? "" : `${zeile.kennung} `}zusagen`}
      bestaetigungstext="Zusagen"
      bereit={zeitpunkt !== undefined}
      aufAbbrechen={aufSchliessen}
      aufBestaetigen={async () => {
        if (zeitpunkt === undefined) return;
        const ergebnis = await laden.bediene(abloesungZugesagt(zeile.id, zeitpunkt, von.trim()));
        if (ergebnis?.art === "geschrieben") aufSchliessen();
      }}
    >
      <label>
        Zugesagt für
        <Zeitfeld wert={fuer} aufAenderung={setzeFuer} platzhalter="TT.MM. HH:MM oder HH:MM" />
      </label>
      {fuer.trim() !== "" && zeitpunkt === undefined && (
        <span className="feldfehler">Zeit als TT.MM.JJJJ HH:MM, „30.10. 14:30“ oder „14:30“ (heute)</span>
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
    </Maske>
  );
}
