/**
 * Die Grundabfrage — eine Maske für die Pflichtgründe aus §2.4.
 *
 * Es gibt sie, weil `window.prompt` im Anwendungsfenster von Electron nicht
 * unterstützt wird: Der Aufruf liefert dort sofort `null`, die Bedienung
 * bricht stumm ab, und Stornieren, Ablehnen und Entfernen sind faktisch
 * nicht ausführbar. Dieselbe Maske wie überall sonst löst das und bringt
 * Enter, Escape und den Fokus im ersten Feld gleich mit.
 */

import { useState } from "react";

import type { Bedienergebnis } from "../kontrakt/index.js";
import { Versuchshinweise, hinweisAusErgebnis } from "./Anlegeversuch.js";
import { Maske } from "./Maske.js";
import { useSchreibsperre } from "./useVerbindungsstatus.js";

interface OffeneFrage {
  readonly titel: string;
  readonly erlaeuterung: string;
  readonly bestaetigungstext: string;
  /**
   * Schreibt den Grund. Gibt der Aufrufer das Versprechen des Schreibens
   * zurück, bleibt die Maske mit dem Grund **stehen**, bis der Dienst
   * `geschrieben` meldet: Bei Unterbrechung ist die Eingabe nicht verloren,
   * der Hinweis steht im Dialog, und ein zweiter Druck schreibt nicht doppelt.
   */
  readonly aufGrund: (grund: string) => void | Promise<Bedienergebnis | undefined>;
}

export function useGrundabfrage(): {
  readonly frage: (frage: OffeneFrage) => void;
  readonly maske: React.JSX.Element | null;
} {
  const [offen, setzeOffen] = useState<OffeneFrage | undefined>(undefined);
  const [grund, setzeGrund] = useState("");
  const [hinweis, setzeHinweis] = useState<string | undefined>(undefined);
  const sperre = useSchreibsperre();

  const frage = (naechste: OffeneFrage): void => {
    setzeGrund("");
    setzeHinweis(undefined);
    setzeOffen(naechste);
  };

  const maske =
    offen === undefined ? null : (
      <Maske
        titel={offen.titel}
        bestaetigungstext={offen.bestaetigungstext}
        bereit={grund.trim().length > 0 && sperre === undefined}
        bereitGrund={grund.trim().length > 0 ? undefined : "Grund eintragen"}
        aufBestaetigen={() => {
          setzeHinweis(undefined);
          const folge = offen.aufGrund(grund.trim());
          if (!(folge instanceof Promise)) {
            setzeOffen(undefined);
            return;
          }
          return folge.then((ergebnis) => {
            if (ergebnis?.art === "geschrieben") setzeOffen(undefined);
            else setzeHinweis(hinweisAusErgebnis(ergebnis));
          });
        }}
        aufAbbrechen={() => {
          setzeOffen(undefined);
        }}
      >
        <p>{offen.erlaeuterung}</p>
        <label>
          Grund (Pflicht)
          <input
            value={grund}
            onChange={(ereignis) => {
              setzeGrund(ereignis.target.value);
            }}
          />
        </label>
        <Versuchshinweise sperre={sperre} hinweis={hinweis} />
      </Maske>
    );

  return { frage, maske };
}
