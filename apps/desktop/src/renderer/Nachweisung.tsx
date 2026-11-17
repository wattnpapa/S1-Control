/**
 * Die Sicht „Nachweisung" im Blatt Nachrichten (KONZEPT-NACHRICHTEN.md §6,
 * §7, §9, Schnitt N2): alle Nachrichten nach Nummer, ohne Nummer zuletzt —
 * die Ordnung kommt aus Ring 2.
 *
 * Die Spalten folgen eStabs Nachweisung: Vorrang, E/A, Nr., Von, An und die
 * Zeiten der drei Vermerke, dazu Abfassungszeit und Betreff. Eine doppelt
 * vergebene Nummer wird nicht verhindert, sondern markiert („zeigen, nicht
 * raten", §9); berichtigt wird mit „Nachweisen" und neuer Nummer. Eine
 * Nachricht ohne Nummer — etwa ein Eingang, den die FmZ ohne Nummer
 * aufgenommen hat, oder eine Gesprächsnotiz (Entscheidung 2) — bekommt
 * hier ihre Nummer.
 *
 * Additiv (2026-11-17): Hat der LdF die Übermittlung vorgeschlagen, steht in
 * der Spalte Beförderung die Marke „Weg: Kurier/Melder (Lf)" — wer
 * entschieden hat, wie die Nachricht lief, gehört in den Nachweis.
 *
 * Additiv (Audit LdF P1-3, Fernmelder P2-7): Mittel (Feld 1) und Gegenstelle
 * (Feld 6) stehen als Spalten — das Betriebsbuch ist ohne sie nicht gegen das
 * Papier prüfbar —, und die Zeiten stehen wie im Ausdruck: Aufnahme und
 * Abfassung als Datum-Zeit-Gruppe, Annahme, Beförderung und Sichtung als
 * vierstellige Uhrzeit mit Handzeichen. „Berichtigen“ belegt die nächste
 * freie Nummer vor (LdF P2-1, in `Fmzmasken.tsx`).
 *
 * „Nachweisung ausgeben" erzeugt die Seite über den bestehenden Weg
 * `ausgabeErzeugen` (HTML, in der Desktop-App auch PDF) in `ausgaben\`.
 */

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { Ausgabeeintraege, Ausgabepfad, useAusgabe } from "./Versorgungsausgabe.js";
import type { Fmzschritt } from "./Fmzmasken.js";
import { Klappmenue } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, uhrzeit, vorrangwort } from "./nachrichtenformate.js";

/** „171045nov26 Fm" — Datum-Zeit-Gruppe und Handzeichen (Aufnahme, Feld 2). */
function vermerk(v: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string {
  return v === undefined ? "—" : `${dtg(v.zeitpunkt)} ${v.handzeichen}`.trim();
}

/** „1045 Fm" — vierstellige Uhrzeit und Handzeichen (Annahme, Beförderung, Sichtung), wie im Ausdruck. */
export function uhrvermerk(v: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string {
  return v === undefined ? "—" : `${uhrzeit(v.zeitpunkt)} ${v.handzeichen}`.trim();
}

/** Das Mittel der Nachricht: das tatsächliche (Aufnahme oder Beförderung), sonst „—". */
function mittelText(zeile: Nachrichtenzeile): string {
  const mittel = zeile.aufnahme?.mittel ?? zeile.befoerderung?.mittel;
  return mittel === undefined ? "—" : projektion.mittelWort(mittel);
}

export interface NachweisungEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly gewaehltId: string | undefined;
  readonly nurLesen: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufSchritt: (schritt: Fmzschritt, zeile: Nachrichtenzeile) => void;
}

/** Das Menü „⋯" mit „Nachweisung als PDF/HTML", daneben die erzeugte Datei. */
export function Nachweisungsausgabe(): React.JSX.Element {
  const ausgabe = useAusgabe("nachweisung");
  return (
    <span className="nachweisungsausgabe">
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "Nachweisung ausgeben", klasse: "", beschriftung: "Nachweisung ausgeben", titel: "Die Nachweisung als Ausdruck (A4 hoch) in den Ordner „ausgaben“" }}
        menue={{ beschriftung: "Nachweisung ausgeben", id: "nachweisungsmenue" }}
        inhalt={(waehle) => <Ausgabeeintraege titel="Nachweisung" bedienung={ausgabe} waehle={waehle} />}
      />
      <Ausgabepfad bedienung={ausgabe} />
    </span>
  );
}

/** Die Marke des Übermittlungsvorschlags des LdF an der Beförderung. */
function Wegmarke({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  const w = zeile.vorschlag;
  if (w === undefined) return null;
  return (
    <span className="nebenwert" title={`Vom LdF vorgeschlagen, durch ${w.fernmelder}`}>
      {" "}
      Weg: {projektion.mittelWort(w.mittel)} ({w.handzeichen})
    </span>
  );
}

function Nummer({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element {
  if (zeile.nummer === undefined) return <span className="leise">—</span>;
  return (
    <>
      {zeile.nummer}
      {zeile.nummerDoppelt && (
        <span className="marke-zustand warn" title="Diese Nummer ist mehrfach vergeben; mit „Nachweisen“ berichtigen">
          {" "}
          doppelt
        </span>
      )}
    </>
  );
}

export function Nachweisung({ zeilen, gewaehltId, nurLesen, aufWahl, aufSchritt }: NachweisungEigenschaften): React.JSX.Element {
  if (zeilen.length === 0) return <p className="hinweistext">Noch keine Nachricht in der Nachweisung.</p>;
  return (
    <table className="nachrichtentabelle" aria-label="Nachweisung">
      <thead>
        <tr>
          <th scope="col">Vorrang</th>
          <th scope="col" title="Eingang oder Ausgang">E/A</th>
          <th scope="col">Nr.</th>
          <th scope="col">Von</th>
          <th scope="col">An</th>
          <th scope="col">Mittel</th>
          <th scope="col">Gegenstelle</th>
          <th scope="col">Aufnahme</th>
          <th scope="col">Annahme</th>
          <th scope="col">Beförderung</th>
          <th scope="col">Sichtung</th>
          <th scope="col">Abfassungszeit</th>
          <th scope="col">Betreff</th>
          <th scope="col">
            <span className="nurvorlesen">Schritte</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((zeile) => (
          <tr
            key={zeile.id}
            className={[zeile.id === gewaehltId ? "gewaehlt" : "", zeile.zurueckgezogen ? "abgelehnt" : "", zeile.nummerDoppelt ? "doppelt" : ""].filter((k) => k !== "").join(" ")}
            aria-selected={zeile.id === gewaehltId}
            onClick={() => aufWahl(zeile.id)}
          >
            <td>{vorrangwort(zeile)}</td>
            <td>{zeile.richtungKurz}{zeile.gespraechsnotiz ? " (Notiz)" : ""}</td>
            <td className="zahl">
              <Nummer zeile={zeile} />
            </td>
            <td>{zeile.absender}</td>
            <td>{zeile.anschrift}</td>
            <td>{mittelText(zeile)}</td>
            <td>{zeile.gegenstelle ?? "—"}</td>
            <td className="mono">{vermerk(zeile.aufnahme)}</td>
            <td className="mono">{uhrvermerk(zeile.annahme)}</td>
            <td className="mono">
              {uhrvermerk(zeile.befoerderung)}
              <Wegmarke zeile={zeile} />
            </td>
            <td className="mono">{uhrvermerk(zeile.sichtung)}</td>
            <td className="mono">{dtg(zeile.abfassungszeit)}</td>
            <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
            <td>
              {(zeile.nummer === undefined || zeile.nummerDoppelt) && (
                <button type="button" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Nummer der Nachweisung eintragen oder berichtigen"} onClick={() => aufSchritt("nachweis", zeile)}>
                  {zeile.nummer === undefined ? "Nachweisen" : "Berichtigen"}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
