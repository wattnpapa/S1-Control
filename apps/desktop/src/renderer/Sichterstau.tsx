/**
 * Der Stau vor dem Sichter, gesehen von der Fernmeldezentrale (Audit Sichter
 * P1-4, ETB P3-3; „Was offen bleibt“ in docs/audits/nachrichten/README.md).
 *
 * Der Ersatzsichter schaltet erst, wenn die Präsenz des Sichters verfällt —
 * rund zwei Minuten. Bis dahin lag ein Blitz im Eingang, und die FmZ, die ihn
 * aufgenommen hatte, sah den Stau nicht. Zwei Dinge in der Sicht der FmZ:
 *
 * - **Die Hinweiszeile** „n Eingänge warten vor dem Sichter“ im Kopf, aus
 *   `vorSichterUeberSchwelle` der Nachrichtenlage. Das Feld liefert der
 *   Domänen- und Kontraktschnitt (anderer Arbeitsstrang); bis dahin wird es
 *   optional gelesen, und die Zeile fehlt.
 * - **„Ich sichte jetzt selbst“** an jedem Eingang vor dem Sichter, dessen
 *   `wartetSeitSichter` (Minuten vor dem Sichter, ebenfalls optional
 *   gelesen) die Schwelle der FmZ erreicht — dieselbe Schwelle, mit der
 *   Ring 2 `vorSichterUeberSchwelle` zählt —, oder an jedem, wenn kein
 *   Sichter besetzt ist. Der Knopf öffnet den
 *   Laufzettel wie beim Ersatzsichter, der Verteiler aus der Anschrift
 *   vorbelegt (S2 rot, Anschrift grün).
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Nachrichtenlage } from "../kontrakt/index.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";

/** Die Minuten, die ein Eingang über der Schwelle vor dem Sichter wartet; optional gelesen (anderer Strang). */
export function wartetSeitSichter(zeile: Nachrichtenzeile): number | undefined {
  const wert = (zeile as { readonly wartetSeitSichter?: unknown }).wartetSeitSichter;
  return typeof wert === "number" && Number.isFinite(wert) ? wert : undefined;
}

/** Die Zahl der Eingänge über der Schwelle vor dem Sichter; optional gelesen (anderer Strang). */
export function vorSichterUeberSchwelle(lage: Nachrichtenlage | undefined): number | undefined {
  const wert = (lage as { readonly vorSichterUeberSchwelle?: unknown } | undefined)?.vorSichterUeberSchwelle;
  return typeof wert === "number" && Number.isFinite(wert) ? wert : undefined;
}

/** Die Eingänge vor dem Sichter — Darstellung aus der Nachweisung, keine Regel (die steht in Ring 2). */
export function vorSichterZeilen(zeilen: readonly Nachrichtenzeile[]): readonly Nachrichtenzeile[] {
  return zeilen.filter((z) => z.laufzustand === "VOR_SICHTER" && !z.zurueckgezogen);
}

/** Ob die FmZ diesen Eingang selbst sichten darf: Er wartet die Schwelle lang, oder kein Sichter ist besetzt. */
export function selbstSichtbar(zeile: Nachrichtenzeile, sichterDa: boolean, schwelleMinuten: number): boolean {
  const seit = wartetSeitSichter(zeile);
  return !sichterDa || (seit !== undefined && seit >= schwelleMinuten);
}

/** „2 Eingänge warten vor dem Sichter“ — oder nichts, solange keiner über der Schwelle liegt. */
export function sichterstauText(anzahl: number | undefined): string | undefined {
  if (anzahl === undefined || anzahl <= 0) return undefined;
  return anzahl === 1 ? "1 Eingang wartet vor dem Sichter" : `${String(anzahl)} Eingänge warten vor dem Sichter`;
}

/** Die Hinweiszeile im Kopf der FmZ-Sicht. */
export function Sichterhinweis({ lage }: { readonly lage: Nachrichtenlage | undefined }): React.JSX.Element | null {
  const text = sichterstauText(vorSichterUeberSchwelle(lage));
  if (text === undefined) return null;
  return (
    <p className="warnung sichterhinweis" role="status">
      {text} — wer aufgenommen hat, kann selbst sichten.
    </p>
  );
}

export interface SichterstaukarteEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly sichterDa: boolean;
  /** Die Schwelle der FmZ in Minuten (`fmzSchwelleMinuten`). */
  readonly schwelleMinuten: number;
  readonly nurLesen: boolean;
  readonly aufSelbst: (zeile: Nachrichtenzeile) => void;
}

/** Die Karte der Eingänge, die die FmZ selbst sichten darf; leer entfällt sie. */
export function Sichterstaukarte({ zeilen, sichterDa, schwelleMinuten, nurLesen, aufSelbst }: SichterstaukarteEigenschaften): React.JSX.Element | null {
  const faellig = vorSichterZeilen(zeilen).filter((z) => selbstSichtbar(z, sichterDa, schwelleMinuten));
  if (faellig.length === 0) return null;
  return (
    <section className="karte fmzkarte" aria-label="Vor dem Sichter">
      <h3>Vor dem Sichter</h3>
      <p className="hinweistext">{sichterDa ? "Diese Eingänge warten über der Schwelle auf den Sichter." : "Kein Sichter besetzt: Wer aufgenommen hat, verteilt selbst."}</p>
      <table className="nachrichtentabelle" aria-label="Eingänge vor dem Sichter">
        <tbody>
          {faellig.map((zeile) => (
            <tr key={zeile.id}>
              <td>{vorrangwort(zeile)}</td>
              <td className="zahl">{zeile.nummer ?? "—"}</td>
              <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
              <td className="mono">{zeile.aufnahme === undefined ? "—" : `${dtg(zeile.aufnahme.zeitpunkt)} ${zeile.aufnahme.handzeichen}`}</td>
              <td className="zahl">{wartetSeitSichter(zeile) === undefined ? "" : `seit ${String(wartetSeitSichter(zeile))} min`}</td>
              <td>
                <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Den Laufzettel öffnen und selbst verteilen (Verteiler aus der Anschrift vorbelegt)"} onClick={() => aufSelbst(zeile)}>
                  Ich sichte jetzt selbst
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
