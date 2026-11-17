/**
 * Die Sicht „LdF" im Blatt Nachrichten (bestätigt am 2026-11-17,
 * KONZEPT-NACHRICHTEN.md §5, §6) — zwei Karten für den Leiter des
 * Fernmeldebetriebes.
 *
 * Links die Ausgänge vor dem Vorschlag: angenommen, ohne Übermittlungs-
 * vorschlag; „Übermittlung vorschlagen" öffnet die Maske der FmZ mit
 * Fernmelder, Mittel, Gegenstelle, Zeit und Handzeichen
 * (`NachrichtUebermittlungVorgeschlagen`). Rechts die Eingänge vor der Weitergabe: aufgenommen und
 * nachgewiesen, der LdF prüft beides und gibt mit „An den Sichter
 * weitergeben" weiter. Beide Listen kommen aus einem Ruf (Laufzustand
 * VOR_LDF, Ordnung von Ring 2); hier wird nur nach Richtung getrennt.
 *
 * Ob die Sicht im Umschalter steht, entscheidet {@link ldfSichtbar}: nur,
 * wenn der Einsatz den LdF als Station führt oder die Sitzung die Stelle LDF hat.
 *
 * Zweite Runde (R2-LdF P1-1, R2-Si P2-4): Bei 1320 Pixeln lag die rechte
 * Karte über dem Rand, der Knopf „An den Sichter weitergeben“ begann bei
 * x = 1375. Die beiden Karten stehen jetzt untereinander in voller Breite
 * (`fmzkarten untereinander`), die Tabellen haben `table-layout: fixed`,
 * Textzellen brechen um, und die Knopfspalte hat eine feste Breite.
 */

import { useState } from "react";

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { STELLE_LDF } from "../kontrakt/ldfschritte.js";
import { Weitergabemaske } from "./Ldfmaske.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";

/** Die Sicht gibt es, wenn der Einsatz den LdF als Station führt oder diese Sitzung LdF ist. */
export function ldfSichtbar(ldfStation: boolean | undefined, stellen: readonly string[]): boolean {
  return ldfStation === true || stellen.includes(STELLE_LDF);
}

function Vorrang({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  const wort = vorrangwort(zeile);
  if (wort === "") return null;
  return <span className={zeile.vorrangstufe === 0 ? "marke-zustand fehler vorrang-blitz" : "marke-zustand warn"}>{wort}</span>;
}

function vermerk(v: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string {
  return v === undefined ? "—" : `${dtg(v.zeitpunkt)} ${v.handzeichen}`;
}

interface KartenEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly nurLesen: boolean;
  readonly aufSchritt: (zeile: Nachrichtenzeile) => void;
}

function Ausgangskarte({ zeilen, nurLesen, aufSchritt }: KartenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Ausgänge vor dem Vorschlag">
      <h3>Ausgänge vor dem Vorschlag</h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Kein Ausgang wartet auf den Übermittlungsvorschlag.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Ausgänge vor dem Übermittlungsvorschlag">
          <thead>
            <tr>
              <th scope="col" className="schmalspalte">Vorrang</th>
              <th scope="col">Anschrift</th>
              <th scope="col">Betreff</th>
              <th scope="col">Wunsch</th>
              <th scope="col">Annahme</th>
              <th scope="col" className="knopfspalte">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.id}>
                <td>
                  <Vorrang zeile={zeile} />
                </td>
                <td>{zeile.anschrift}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td>{zeile.uebermittlungswunsch === undefined ? "—" : projektion.mittelWort(zeile.uebermittlungswunsch)}</td>
                <td className="mono">{vermerk(zeile.annahme)}</td>
                <td>
                  <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Fernmelder, Mittel und Gegenstelle bestimmen"} onClick={() => aufSchritt(zeile)}>
                    Übermittlung vorschlagen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Eingangskarte({ zeilen, nurLesen, aufSchritt }: KartenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Eingänge vor der Weitergabe">
      <h3>Eingänge vor der Weitergabe</h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Kein Eingang wartet auf die Weitergabe an den Sichter.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Eingänge vor der Weitergabe an den Sichter">
          <thead>
            <tr>
              <th scope="col" className="schmalspalte">Vorrang</th>
              <th scope="col" className="schmalspalte">Nr.</th>
              <th scope="col">Absender</th>
              <th scope="col">Betreff</th>
              <th scope="col">Aufnahme</th>
              <th scope="col" className="knopfspalte">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.id}>
                <td>
                  <Vorrang zeile={zeile} />
                </td>
                <td className="zahl">{zeile.nummer ?? "—"}</td>
                <td>{zeile.absender}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td className="mono">
                  {zeile.aufnahme === undefined ? "—" : `${projektion.mittelWort(zeile.aufnahme.mittel)} ${vermerk(zeile.aufnahme)}`}
                </td>
                <td>
                  <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Aufnahme und Nachweisung geprüft: an den Sichter"} onClick={() => aufSchritt(zeile)}>
                    An den Sichter weitergeben
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export interface LdfsichtEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  /** Öffnet die Maske „Übermittlung vorschlagen" der FmZ (`useFmzschritte`). */
  readonly aufVorschlag: (zeile: Nachrichtenzeile) => void;
}

/** Die beiden Karten mit der Weitergabemaske; die Zeile bleibt der Stand beim Öffnen (Vorher-Wert). */
export function Ldfsicht({ zeilen, handzeichen, nurLesen, aufVorschlag }: LdfsichtEigenschaften): React.JSX.Element {
  const [weiter, setzeWeiter] = useState<Nachrichtenzeile | undefined>(undefined);
  return (
    <>
      <div className="fmzkarten untereinander">
        <Ausgangskarte zeilen={zeilen.filter((z) => z.richtung === "AUSGANG")} nurLesen={nurLesen} aufSchritt={aufVorschlag} />
        <Eingangskarte zeilen={zeilen.filter((z) => z.richtung !== "AUSGANG")} nurLesen={nurLesen} aufSchritt={setzeWeiter} />
      </div>
      {weiter !== undefined && <Weitergabemaske key={weiter.id} zeile={weiter} handzeichen={handzeichen} aufSchliessen={() => setzeWeiter(undefined)} />}
    </>
  );
}
