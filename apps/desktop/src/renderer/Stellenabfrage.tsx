/**
 * Die Abfrage von Stelle und Handzeichen beim Öffnen eines Einsatzes
 * (KONZEPT-NACHRICHTEN.md Entscheidung 3).
 *
 * Wer einen Einsatz aufschlägt, sagt, welche Position er im Stab hat —
 * mehrere zugleich, wenn Sachgebiete zusammengefasst sind (DV 1-100 4.3.1),
 * und ein freier Name, wenn die Stelle in keiner Liste steht. Dazu das
 * Handzeichen, zwei bis vier Zeichen, wie der Vordruck es in Feld 2 bis 4, 17
 * und 18 verlangt. Die Wahl gilt für die Sitzung dieser Akte, steht in der
 * Präsenz und wird beim nächsten Öffnen desselben Einsatzes vorgeschlagen.
 *
 * **Ein Zuschnitt, kein Recht** (§4): Die Stelle wählt, welcher Posteingang
 * zuerst kommt; die anderen bleiben erreichbar. Deshalb lässt sich die
 * Abfrage auch ohne Stelle verlassen — aber nur mit „Abbrechen“, nicht mit
 * einem leeren „Übernehmen“ (Audit Sachgebietsleiter P1-4, Fernmelder P1-4):
 * Wer übernimmt, hat eine Stelle und ein Handzeichen von zwei bis vier
 * Zeichen; wer abbricht, arbeitet „ohne Stelle“, und die Statuszeile sagt es.
 */

import { useState } from "react";

import type { Einstellungen, Sitzungsstellen } from "../kontrakt/index.js";
import { Maske } from "./Maske.js";
import { ARBEITSPLATZSTELLEN, handzeichenPflicht, stellenname } from "./nachrichtenformate.js";

/** Die freien Stellen aus dem Textfeld: durch Komma getrennt, ohne Schrägstrich. */
export function freieStellen(text: string): readonly string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s !== "" && !s.includes("/"));
}

/** Das Handzeichen: leer erlaubt (dann fragt der Vordruck später), sonst zwei bis vier Zeichen. */
export function handzeichenFehler(handzeichen: string): string | undefined {
  const hz = handzeichen.trim();
  if (hz === "" || (hz.length >= 2 && hz.length <= 4)) return undefined;
  return "Das Handzeichen hat zwei bis vier Zeichen.";
}

/** Was vor „Übernehmen“ fehlt: mindestens eine Stelle und ein gültiges Handzeichen. */
export function stellenabfrageFehler(stellen: readonly string[], handzeichen: string): string | undefined {
  if (stellen.length === 0) return "Mindestens eine Stelle wählen – oder „Abbrechen“ für „ohne Stelle“";
  return handzeichenPflicht(handzeichen);
}

/** Die Vorbelegung aus den Einstellungen: Stellen dieses Einsatzes, Handzeichen des Arbeitsplatzes. */
export function vorbelegungAus(einstellungen: Einstellungen, ordner: string | undefined): Sitzungsstellen {
  const stellen = ordner === undefined ? [] : (einstellungen.stellenJeEinsatz?.[ordner] ?? []);
  return { stellen, ...(einstellungen.handzeichen === undefined ? {} : { handzeichen: einstellungen.handzeichen }) };
}

/** Die Einstellungen mit der Wahl als Vorbelegung für das nächste Öffnen dieses Einsatzes. */
export function mitVorbelegung(einstellungen: Einstellungen, ordner: string, sitzung: Sitzungsstellen): Einstellungen {
  return {
    ...einstellungen,
    ...(sitzung.handzeichen === undefined ? {} : { handzeichen: sitzung.handzeichen }),
    stellenJeEinsatz: { ...einstellungen.stellenJeEinsatz, [ordner]: [...sitzung.stellen] },
  };
}

export interface StellenabfrageEigenschaften {
  readonly vorbelegung: Sitzungsstellen;
  readonly einsatzname?: string;
  readonly aufBestaetigen: (sitzung: Sitzungsstellen) => void | Promise<unknown>;
  readonly aufAbbrechen: () => void;
}

export function Stellenabfrage({ vorbelegung, einsatzname, aufBestaetigen, aufAbbrechen }: StellenabfrageEigenschaften): React.JSX.Element {
  const bekannt = new Set(ARBEITSPLATZSTELLEN);
  const [gewaehlt, setzeGewaehlt] = useState<readonly string[]>(vorbelegung.stellen.filter((s) => bekannt.has(s)));
  const [frei, setzeFrei] = useState(vorbelegung.stellen.filter((s) => !bekannt.has(s)).join(", "));
  const [handzeichen, setzeHandzeichen] = useState(vorbelegung.handzeichen ?? "");
  const stellen = [...new Set([...ARBEITSPLATZSTELLEN.filter((s) => gewaehlt.includes(s)), ...freieStellen(frei)])];
  const fehler = stellenabfrageFehler(stellen, handzeichen);
  const hz = handzeichen.trim();
  return (
    <Maske
      titel={einsatzname === undefined ? "Stelle und Handzeichen" : `Stelle und Handzeichen · ${einsatzname}`}
      bestaetigungstext="Übernehmen"
      trotzSperre
      bereit={fehler === undefined}
      {...(fehler === undefined ? {} : { bereitGrund: fehler })}
      aufAbbrechen={aufAbbrechen}
      aufBestaetigen={() => aufBestaetigen({ stellen, ...(hz === "" ? {} : { handzeichen: hz }) })}
    >
      <p className="hinweistext">
        Welche Position hat dieser Arbeitsplatz im Stab? Die Wahl gilt, bis der Einsatz geschlossen wird, und steht bei den anderen
        Arbeitsplätzen als besetzte Stelle. Sie ist ein Zuschnitt, kein Recht: Jeder Posteingang bleibt erreichbar.
      </p>
      <div className="kaestchenzeile stellenwahl" role="group" aria-label="Stellen">
        {ARBEITSPLATZSTELLEN.map((stelle) => (
          <label key={stelle} className="kaestchen">
            <input
              type="checkbox"
              checked={gewaehlt.includes(stelle)}
              onChange={(e) => setzeGewaehlt(e.target.checked ? [...gewaehlt, stelle] : gewaehlt.filter((s) => s !== stelle))}
            />
            {stellenname(stelle)}
          </label>
        ))}
      </div>
      <label>
        Weitere Stelle (frei, mehrere durch Komma)
        <input value={frei} placeholder="z. B. Polizei" onChange={(e) => setzeFrei(e.target.value)} />
      </label>
      <label>
        Handzeichen
        <input value={handzeichen} maxLength={4} placeholder="2 bis 4 Zeichen" onChange={(e) => setzeHandzeichen(e.target.value)} />
      </label>
    </Maske>
  );
}
