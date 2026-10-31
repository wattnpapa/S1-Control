/**
 * „Neue Anforderung" im Blatt Anforderungen: die Felder und der Knopf „Anfordern".
 *
 * Das Blatt schließt nicht wie ein Dialog, deshalb gilt hier das Muster des
 * Anlegeversuchs (`Anlegeversuch.tsx`) mit zwei Besonderheiten: Die Felder
 * werden **erst nach bestätigtem Schreiben** geleert, und bei Fehler oder
 * unbekanntem Ausgang steht der Hinweis dauerhaft unter dem Knopf — samt
 * „Eingabe verwerfen" für den Fall, dass der Bediener die Liste geprüft hat und
 * neu beginnen will. Kennung und Zeitstempel bleiben bis dahin dieselben.
 */

import { useState } from "react";

import type { Einheitenwahl } from "@s1/domaene";

import { useAnlegeversuch } from "./Anlegeversuch.js";
import {
  Anforderungsfelder,
  LEERE_ANFORDERUNG,
  anforderungAusEingabe,
  neueAnforderungsId,
} from "./Anforderungsformular.js";
import { anforderungEingabeFehler } from "./anforderungseingabepruefung.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { useLaden } from "./laden.js";

interface Anforderungskennung {
  readonly id: string;
  readonly angefordertAm: string;
}

export function Anforderungsneu({ einheitenwahl }: { readonly einheitenwahl: readonly Einheitenwahl[] }): React.JSX.Element {
  const [neu, setzeNeu] = useState(LEERE_ANFORDERUNG);
  const [laeuft, setzeLaeuft] = useState(false);
  const [eingabefehler, setzeEingabefehler] = useState<string | undefined>(undefined);
  const versuch = useAnlegeversuch();
  const beendet = useLaden((zustand) => (zustand.lagebild?.einsatzStatus ?? "AKTIV") !== "AKTIV");
  const gesperrt = versuch.gesperrt || beendet;

  async function lege(): Promise<void> {
    if (laeuft || gesperrt) return;
    const fehler = anforderungEingabeFehler(neu, false);
    setzeEingabefehler(fehler);
    if (fehler !== undefined) return;
    const kennung = versuch.kennung<Anforderungskennung>(() => ({
      id: neueAnforderungsId(),
      angefordertAm: new Date().toISOString(),
    }));
    const entwurf = anforderungAusEingabe(neu, kennung.angefordertAm, kennung.id);
    if (entwurf === undefined) return;
    setzeLaeuft(true);
    try {
      const ergebnis = await versuch.schreibe(entwurf);
      // Geleert wird nur nach bestätigtem Schreiben: sonst ist die Eingabe weg.
      if (ergebnis?.art === "geschrieben") {
        setzeNeu(LEERE_ANFORDERUNG);
        versuch.verwerfe();
      }
    } finally {
      setzeLaeuft(false);
    }
  }

  return (
    <div className="anforderungneu">
      <Anforderungsfelder
        eingabe={neu}
        aufEingabe={setzeNeu}
        einheitenwahl={einheitenwahl}
        aufEnter={() => void lege()}
      />
      <button
        type="button"
        disabled={gesperrt || laeuft}
        title={versuch.sperre ?? (beendet ? TEXT_NUR_LESEN : undefined)}
        onClick={() => void lege()}
      >
        {laeuft ? "…" : "Anfordern"}
      </button>
      {eingabefehler !== undefined && (
        <p className="hinweistext" role="alert">
          {eingabefehler}
        </p>
      )}
      {versuch.anzeige}
      {beendet && (
        <p role="alert" className="hinweistext">
          {TEXT_NUR_LESEN}. Eingaben werden nicht gespeichert.
        </p>
      )}
      {versuch.hinweis !== undefined && (
        <button
          type="button"
          onClick={() => {
            setzeNeu(LEERE_ANFORDERUNG);
            versuch.verwerfe();
          }}
        >
          Eingabe verwerfen
        </button>
      )}
    </div>
  );
}
