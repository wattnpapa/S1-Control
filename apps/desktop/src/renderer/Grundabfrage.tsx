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
import { Maske } from "./Maske.js";

interface OffeneFrage {
  readonly titel: string;
  readonly erlaeuterung: string;
  readonly bestaetigungstext: string;
  readonly aufGrund: (grund: string) => void;
}

export function useGrundabfrage(): {
  readonly frage: (frage: OffeneFrage) => void;
  readonly maske: React.JSX.Element | null;
} {
  const [offen, setzeOffen] = useState<OffeneFrage | undefined>(undefined);
  const [grund, setzeGrund] = useState("");

  const frage = (naechste: OffeneFrage): void => {
    setzeGrund("");
    setzeOffen(naechste);
  };

  const maske =
    offen === undefined ? null : (
      <Maske
        titel={offen.titel}
        bestaetigungstext={offen.bestaetigungstext}
        bereit={grund.trim().length > 0}
        aufBestaetigen={() => {
          const text = grund.trim();
          setzeOffen(undefined);
          offen.aufGrund(text);
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
      </Maske>
    );

  return { frage, maske };
}
