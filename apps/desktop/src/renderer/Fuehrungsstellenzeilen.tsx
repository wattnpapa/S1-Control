/**
 * Die Zeilen des Blattes Führungsstelle: Teilbereichsblock mit Dienstposten
 * (Besetzung) und die Zellen des Schichtplans.
 *
 * Die Felder folgen dem Muster des Anlegeversuchs (`Feldschreiben.ts`): Die
 * Eingabe bleibt stehen, bis der Dienst `geschrieben` meldet; der Hinweis
 * steht am Feld, bei Unterbrechung ist das Schreiben gesperrt. Im beendeten
 * Einsatz sind Felder und Knöpfe gesperrt (`Nurlesen.tsx`).
 */

import { useState } from "react";

import { schichtTitel, type Dienstpostenzeile, type Teilbereichsblock } from "@s1/domaene";

import {
  dienstpostenBesetzt,
  dienstpostenEntfernt,
  dienstpostenWiederhergestellt,
  schichtplanEintrag,
} from "../kontrakt/bedienschritte.js";
import { useFeldversuch } from "./Feldschreiben.js";
import { useGrundabfrage } from "./Grundabfrage.js";
import { useLaden } from "./laden.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { useNurLesen } from "./Nurlesen.js";

const ROLLENTEXT: Readonly<Record<string, string>> = {
  fuehrer: "Fü",
  unterfuehrer: "UFü",
  mannschaft: "He",
};

export function Block({ block }: { readonly block: Teilbereichsblock }): React.JSX.Element {
  return (
    <div className="teilbereich">
      <h3>{block.teileinheit}</h3>
      <table className="dienstposten">
        <thead>
          <tr>
            <th scope="col">Funktion</th>
            <th scope="col">Schicht</th>
            <th scope="col">Rolle</th>
            <th scope="col">Besetzung</th>
            <th scope="col">Handlung</th>
          </tr>
        </thead>
        <tbody>
          {block.zeilen.map((zeile) => (
            <Postenzeile key={zeile.id} zeile={zeile} />
          ))}
          {Object.entries(block.summeJeSchicht).map(([schicht, staerke]) => (
            <tr key={schicht} className="summenzeile">
              <th scope="row" colSpan={3}>
                Besetzt · {schicht}
              </th>
              <td colSpan={2}>
                {staerke.fuehrer}/{staerke.unterfuehrer}/{staerke.mannschaft}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Postenzeile({ zeile }: { readonly zeile: Dienstpostenzeile }): React.JSX.Element {
  const laden = useLaden();
  const grundabfrage = useGrundabfrage();
  const versuch = useFeldversuch();
  const aktion = useFeldversuch();
  const nurLesen = useNurLesen();
  const [entwurf, setzeEntwurf] = useState<string | undefined>(undefined);

  async function uebernimm(): Promise<void> {
    if (entwurf === undefined) return;
    const neu = entwurf.trim();
    if (neu === zeile.besetzung) {
      setzeEntwurf(undefined);
      versuch.verwerfe();
      return;
    }
    // §2.2a: `vorher` ist der Wert, den dieses Fenster gezeigt hat. Ein leeres
    // Feld heißt „unbesetzt“, und das ist im Zustand `null` und nicht "".
    // Der Entwurf weicht erst, wenn der Dienst das Schreiben bestätigt hat.
    const geschrieben = await versuch.schreibe(
      dienstpostenBesetzt(zeile.id, zeile.besetzung === "" ? null : zeile.besetzung, neu),
    );
    if (geschrieben) setzeEntwurf(undefined);
  }

  return (
    <tr className={zeile.entfernt ? "entfernt" : ""}>
      <th scope="row">{zeile.funktion}</th>
      <td>{schichtTitel(zeile.schicht)}</td>
      <td>{ROLLENTEXT[zeile.rolle] ?? zeile.rolle}</td>
      <td>
        <input
          type="text"
          aria-label={`Besetzung ${zeile.funktion} ${zeile.schicht}`}
          value={entwurf ?? zeile.besetzung}
          disabled={zeile.entfernt || nurLesen}
          title={nurLesen ? TEXT_NUR_LESEN : undefined}
          aria-busy={versuch.laeuft}
          onChange={(e) => {
            setzeEntwurf(e.target.value);
          }}
          onBlur={() => void uebernimm()}
          onKeyDown={(e) => {
            if (e.key === "Enter") void uebernimm();
            if (e.key === "Escape") {
              setzeEntwurf(undefined);
              versuch.verwerfe();
            }
          }}
        />
        {versuch.anzeige}
      </td>
      <td>
        {zeile.entfernt ? (
          <button
            type="button"
            disabled={nurLesen || aktion.laeuft || aktion.gesperrt}
            title={nurLesen ? TEXT_NUR_LESEN : undefined}
            onClick={() => {
              void aktion.schreibe(dienstpostenWiederhergestellt(zeile.id));
            }}
          >
            {aktion.laeuft ? "…" : "Wiederherstellen"}
          </button>
        ) : (
          <button
            type="button"
            disabled={nurLesen}
            title={nurLesen ? TEXT_NUR_LESEN : undefined}
            onClick={() => {
              // §2.4: Auch hier ist der Grund Pflicht — ein Dienstposten
              // verschwindet nicht ohne Erklärung aus dem Blatt.
              grundabfrage.frage({
                titel: "Dienstposten entfernen",
                erlaeuterung:
                  "Der Dienstposten bleibt im Einsatztagebuch stehen und lässt sich wiederherstellen.",
                bestaetigungstext: "Entfernen",
                aufGrund: (grund) => laden.bediene(dienstpostenEntfernt(zeile.id, grund)),
              });
            }}
          >
            Entfernen
          </button>
        )}
        {zeile.entfernt && aktion.anzeige}
        {grundabfrage.maske}
      </td>
    </tr>
  );
}

export function Planzelle({
  dienstpostenId,
  datum,
  text,
}: {
  readonly dienstpostenId: string;
  readonly datum: string;
  readonly text: string;
}): React.JSX.Element {
  const versuch = useFeldversuch();
  const nurLesen = useNurLesen();
  const [entwurf, setzeEntwurf] = useState<string | undefined>(undefined);

  async function uebernimm(): Promise<void> {
    if (entwurf === undefined) return;
    if (entwurf === text) {
      setzeEntwurf(undefined);
      return;
    }
    const geschrieben = await versuch.schreibe(
      schichtplanEintrag(dienstpostenId, datum, text === "" ? null : text, entwurf),
    );
    if (geschrieben) setzeEntwurf(undefined);
  }

  return (
    <td>
      <input
        type="text"
        aria-label={`Plan ${dienstpostenId} ${datum}`}
        value={entwurf ?? text}
        disabled={nurLesen}
        title={nurLesen ? TEXT_NUR_LESEN : undefined}
        aria-busy={versuch.laeuft}
        onChange={(e) => {
          setzeEntwurf(e.target.value);
        }}
        onBlur={() => void uebernimm()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setzeEntwurf(undefined);
            versuch.verwerfe();
          }
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {versuch.anzeige}
    </td>
  );
}
