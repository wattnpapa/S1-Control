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
import { STELLE_FMZ } from "@s1/domaene";

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

/**
 * Die Stationen des Fernmeldebetriebs (Audit Fernmelder P3-3): wer an ihnen
 * sitzt, soll nicht neunmal tabulieren. Seit 2026-11-21 LdF und die
 * Fernmelder Fm1 bis Fm3 statt der einen FmZ.
 */
const STATIONEN = ["LDF", "FM1", "FM2", "FM3", "SICHTER"] as const;

/** Der Satz, wenn die Vorbelegung noch die alte Stelle FmZ trägt. */
export const TEXT_FMZ_AUFGETEILT = "Die Stelle FmZ ist aufgeteilt: Bitte LdF oder einen der Fernmelder Fm1, Fm2, Fm3 wählen.";

/** Die Vorbelegung ohne den Altwert FMZ — wer Fernmelder war, wählt einmal seine Nummer. */
export function ohneAltstelle(stellen: readonly string[]): readonly string[] {
  return stellen.filter((s) => s !== STELLE_FMZ);
}

/** Die Stationen zuerst, dann die Stellen des Verteilers in der Ordnung des Vordrucks. */
export function abfolge(stellen: readonly string[]): readonly string[] {
  return [...STATIONEN.filter((s) => stellen.includes(s)), ...stellen.filter((s) => !(STATIONEN as readonly string[]).includes(s))];
}

/**
 * Die Erklärungen der ersten Maske (R2-FaBe P1-1): Der Fachberater riet, was
 * ein Handzeichen ist, und hätte „DRK“ oder „xx“ schreiben können; es steht
 * später auf jedem Vordruck. Als Tooltip und beim Handzeichen als Zeile.
 */
export const TITEL_HANDZEICHEN = "Ihr Kürzel, mit dem Sie auf jedem Vordruck, im Laufzettel und im Tagebuch zeichnen – meist die Initialen, z. B. „Mka“.";
export const TITEL_STELLE = "Ihre Position im Stab, z. B. S3 oder Fachberater: Sie bestimmt, welcher Posteingang zuerst kommt. Mehrere Stellen, wenn Sachgebiete zusammengefasst sind.";

export interface StellenabfrageEigenschaften {
  readonly vorbelegung: Sitzungsstellen;
  readonly einsatzname?: string;
  readonly aufBestaetigen: (sitzung: Sitzungsstellen) => void | Promise<unknown>;
  readonly aufAbbrechen: () => void;
  /**
   * Additiv (R2-Si P3-5): „Stelle abgeben“ für den Schichtwechsel am selben
   * Rechner — der Arbeitsplatz steht danach ohne Stelle, die anderen sehen
   * die Stelle als unbesetzt (der Ersatzsichter greift). Vorher ging das nur
   * über „Einsatz schließen“.
   */
  readonly aufAbgeben?: (() => void) | undefined;
}

export function Stellenabfrage({ vorbelegung, einsatzname, aufBestaetigen, aufAbbrechen, aufAbgeben }: StellenabfrageEigenschaften): React.JSX.Element {
  const bekannt = new Set(ARBEITSPLATZSTELLEN);
  // 2026-11-21: Der Altwert FMZ wird nicht vorbelegt; wer Fernmelder war, wählt einmal LdF oder Fm1 bis Fm3.
  const vorbelegt = ohneAltstelle(vorbelegung.stellen);
  const altFmz = vorbelegung.stellen.includes(STELLE_FMZ);
  const [gewaehlt, setzeGewaehlt] = useState<readonly string[]>(vorbelegt.filter((s) => bekannt.has(s)));
  const [frei, setzeFrei] = useState(vorbelegt.filter((s) => !bekannt.has(s)).join(", "));
  const [handzeichen, setzeHandzeichen] = useState(vorbelegung.handzeichen ?? "");
  const stellen = [...new Set([...ARBEITSPLATZSTELLEN.filter((s) => gewaehlt.includes(s)), ...freieStellen(frei)])];
  const fehler = stellenabfrageFehler(stellen, handzeichen);
  const hz = handzeichen.trim();
  // Eine vollständige Vorbelegung (nach dem Neuladen) bestätigt ein Klick; der Fokus steht gleich auf „Übernehmen“.
  const [vollstaendig] = useState(() => stellenabfrageFehler(vorbelegt, vorbelegung.handzeichen ?? "") === undefined);
  const handzeichenZuerst = !vollstaendig && vorbelegt.length > 0 && (vorbelegung.handzeichen ?? "") === "";
  return (
    <Maske
      titel={einsatzname === undefined ? "Stelle und Handzeichen" : `Stelle und Handzeichen · ${einsatzname}`}
      bestaetigungstext="Übernehmen"
      trotzSperre
      startfokus={vollstaendig ? "bestaetigen" : "feld"}
      bereit={fehler === undefined}
      {...(fehler === undefined ? {} : { bereitGrund: fehler })}
      aufAbbrechen={aufAbbrechen}
      aufBestaetigen={() => aufBestaetigen({ stellen, ...(hz === "" ? {} : { handzeichen: hz }) })}
    >
      {vollstaendig && (
        <p className="hinweistext" role="status">
          Zuletzt gewählt: {vorbelegt.map(stellenname).join(", ")} (Hz. {vorbelegung.handzeichen}). „Übernehmen“ bestätigt; wer ablöst, trägt sein eigenes Handzeichen ein.
        </p>
      )}
      {altFmz && (
        <p className="warnung" role="status">
          {TEXT_FMZ_AUFGETEILT}
        </p>
      )}
      <p className="hinweistext">
        Welche Position hat dieser Arbeitsplatz im Stab? Die Wahl gilt, bis der Einsatz geschlossen wird, und steht bei den anderen
        Arbeitsplätzen als besetzte Stelle. Sie ist ein Zuschnitt, kein Recht: Jeder Posteingang bleibt erreichbar.
      </p>
      <div className="kaestchenzeile stellenwahl" role="group" aria-label="Stellen" title={TITEL_STELLE}>
        {abfolge(ARBEITSPLATZSTELLEN).map((stelle) => (
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
      <label title={TITEL_HANDZEICHEN}>
        Handzeichen
        {/* R2-SGL P2-6: Stellen vorbelegt, Handzeichen leer — der Fokus steht gleich im Handzeichen. */}
        <input value={handzeichen} maxLength={4} placeholder="2 bis 4 Zeichen" {...(handzeichenZuerst ? { "data-startfokus": "" } : {})} onChange={(e) => setzeHandzeichen(e.target.value)} />
      </label>
      <p className="hinweistext">{TITEL_HANDZEICHEN}</p>
      {aufAbgeben !== undefined && vorbelegung.stellen.length > 0 && (
        <p className="hinweistext">
          Schichtwechsel am selben Rechner:{" "}
          <button type="button" title="Die Stelle freigeben; die anderen Arbeitsplätze sehen sie als unbesetzt" onClick={aufAbgeben}>
            Stelle abgeben
          </button>
        </p>
      )}
    </Maske>
  );
}
