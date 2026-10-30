/**
 * Die Gliederung der Einheitentabelle nach Bereichen.
 *
 * Das Blatt „Stärke“ der Excel liest sich als Gliederung: Jeder Bereich hat
 * eine Kopfzeile mit Namen und Summe, darunter stehen seine Einheiten. Diese
 * Datei setzt die Kopfzeilen, die die Projektion liefert, zwischen die Zeilen
 * des Ausschnitts. Gerechnet wird hier nichts — die Summen stehen in der
 * Projektion (`projektion/gliederung.ts`), damit sie mit Baum und Kopfband
 * aus derselben Regel kommen.
 *
 * **Jeder Bereich ist ein eigener `<tbody>`.** Das ist die Tabellensemantik
 * für eine Zeilengruppe (implizite Rolle `rowgroup`), und die Kopfzelle trägt
 * `scope="rowgroup"`: Ein Vorleseprogramm nennt zu jeder Zelle den Bereich.
 * Kopfzeilen sind nicht markierbar und nicht bearbeitbar; sie tragen weder
 * Klick- noch Tastaturhandlung, damit Auswahl und Kürzel (Strg+M, Strg+E) nur
 * Einheiten treffen.
 */

import type React from "react";

import { abschnittstypTitel, type Bereichskopf, type Spalte, type Staerke, type Tabellengliederung, type Tabellenzeile } from "@s1/domaene";

export interface Gliederungswahl {
  readonly an: boolean;
  readonly ohneLeere: boolean;
}

export const GLIEDERUNG_AUS: Gliederungswahl = { an: false, ohneLeere: false };

interface SchalterEigenschaften {
  readonly wahl: Gliederungswahl;
  readonly aufWahl: (wahl: Gliederungswahl) => void;
}

/** Der Umschalter neben der Statusleiste — zwei Knöpfe, der zweite nur mit Gliederung. */
export function Gliederungsschalter({ wahl, aufWahl }: SchalterEigenschaften): React.JSX.Element {
  return (
    <div className="gliederungsschalter" role="group" aria-label="Gliederung">
      <button
        type="button"
        aria-pressed={wahl.an}
        title="Nach Bereichen gliedern: Kopfzeile mit Zwischensumme je Abschnitt, wie im Blatt „Stärke“"
        onClick={() => {
          aufWahl({ ...wahl, an: !wahl.an });
        }}
      >
        Gliederung
      </button>
      {wahl.an && (
        <button
          type="button"
          aria-pressed={wahl.ohneLeere}
          title="Bereiche ohne Einheiten aus- oder einblenden"
          onClick={() => {
            aufWahl({ ...wahl, ohneLeere: !wahl.ohneLeere });
          }}
        >
          Leere ausblenden
        </button>
      )}
    </div>
  );
}

export function staerkeText(staerke: Staerke): string {
  return `${String(staerke.fuehrer)}/${String(staerke.unterfuehrer)}/${String(staerke.mannschaft)}`;
}

function summe(staerke: Staerke): number {
  return staerke.fuehrer + staerke.unterfuehrer + staerke.mannschaft;
}

function gleich(a: Staerke, b: Staerke): boolean {
  return a.fuehrer === b.fuehrer && a.unterfuehrer === b.unterfuehrer && a.mannschaft === b.mannschaft;
}

/** Ein Bereich mit den Zeilen, die im aktuellen Ausschnitt unter ihm stehen. */
export interface Bereichsblock {
  readonly bereich: Bereichskopf;
  readonly zeilen: readonly Tabellenzeile[];
}

/**
 * Verteilt die Zeilen des Ausschnitts auf ihre Bereiche.
 *
 * Die Kopfzeilen gelten für alle Treffer, der Ausschnitt ist ein Fenster
 * daraus (`von` … `von + zeilen.length`). Ein Bereich erscheint, wenn eine
 * seiner Zeilen im Fenster liegt; ein leerer Bereich, wenn seine Stelle im
 * Fenster liegt — am Ende nur auf der letzten Seite, damit er nicht auf zwei
 * Seiten zugleich steht.
 */
export function bereichsbloecke(
  gliederung: Tabellengliederung,
  zeilen: readonly Tabellenzeile[],
  fenster: { readonly von: number; readonly gesamtzahl: number },
): readonly Bereichsblock[] {
  const ende = fenster.von + zeilen.length;
  const letzteSeite = ende >= fenster.gesamtzahl;
  return gliederung.bereiche
    .filter((bereich) =>
      bereich.zeilen > 0
        ? bereich.von < ende && bereich.von + bereich.zeilen > fenster.von
        : bereich.von >= fenster.von && (bereich.von < ende || letzteSeite),
    )
    .map((bereich) => {
      const anfang = Math.max(bereich.von, fenster.von) - fenster.von;
      const schluss = Math.min(bereich.von + bereich.zeilen, ende) - fenster.von;
      return { bereich, zeilen: zeilen.slice(anfang, Math.max(anfang, schluss)) };
    });
}

interface KopfzellenEigenschaften {
  readonly spalten: readonly Spalte[];
  readonly staerke: Staerke;
  readonly einheiten: number;
}

/** Die Zellen einer Kopfzeile unter den Spalten: Zahl der Einheiten, Stärke, Gesamt. */
function Kopfzellen({ spalten, staerke, einheiten }: KopfzellenEigenschaften): React.JSX.Element {
  return (
    <>
      {spalten.map((spalte) => {
        const zahl = spalte.schluessel === "staerke" || spalte.schluessel === "gesamt";
        const inhalt =
          spalte.schluessel === "staerke"
            ? staerkeText(staerke)
            : spalte.schluessel === "gesamt"
              ? String(summe(staerke))
              : spalte.schluessel === "bezeichnung"
                ? `${String(einheiten)} Einh.`
                : "";
        return (
          <td key={spalte.schluessel} className={zahl ? "zahl" : undefined}>
            {inhalt}
          </td>
        );
      })}
    </>
  );
}

/** Einrückung je Tiefe — die Excel rückt nicht ein, aber sie hat nur eine Ebene. */
export function einzug(tiefe: number): React.CSSProperties {
  return { paddingLeft: `${String(0.5 + tiefe * 1.2)}em` };
}

interface KopfzeileEigenschaften {
  readonly bereich: Bereichskopf;
  readonly spalten: readonly Spalte[];
}

function Bereichskopfzeile({ bereich, spalten }: KopfzeileEigenschaften): React.JSX.Element {
  const mitUnterabschnitten = !gleich(bereich.staerke, bereich.summenStaerke);
  const titel = [
    abschnittstypTitel(bereich.typ),
    mitUnterabschnitten ? `eigene Stärke ${staerkeText(bereich.staerke)}, mit Unterabschnitten ${staerkeText(bereich.summenStaerke)}` : "",
    bereich.zaehlt ? "" : "zählt nicht in die Gesamtstärke",
  ]
    .filter((teil) => teil !== "")
    .join(" · ");
  return (
    <tr className={bereich.zaehlt ? "bereichskopf" : "bereichskopf zaehlt-nicht"}>
      <th scope="rowgroup" style={einzug(bereich.tiefe)} title={titel}>
        {bereich.name}
        {mitUnterabschnitten && <span className="nebenwert"> mit Unterabschnitten</span>}
        {!bereich.zaehlt && <span className="nebenwert"> · zählt nicht</span>}
      </th>
      <Kopfzellen spalten={spalten} staerke={bereich.summenStaerke} einheiten={bereich.einheitenSumme} />
    </tr>
  );
}

interface EinsatzkopfEigenschaften {
  readonly gliederung: Tabellengliederung;
  readonly spalten: readonly Spalte[];
  /** Ist die Tabelle gefiltert? Dann ist die Summe die der Auswahl. */
  readonly gefiltert: boolean;
}

/**
 * Die oberste Kopfzeile: der Einsatz gesamt.
 *
 * Sie zeigt dieselbe Zahl wie das Kopfband und sagt, was darin fehlt —
 * „ohne Angefordert“ —, und nennt Angefordert daneben. Zwei Gesamtzahlen
 * ohne Erklärung waren der Befund; zwei mit Erklärung sind eine Auskunft.
 */
function Einsatzkopf({ gliederung, spalten, gefiltert }: EinsatzkopfEigenschaften): React.JSX.Element {
  const { einsatz } = gliederung;
  const titel =
    "Zählt wie das Kopfband: ohne Angefordert/Anmarsch, Eingang und Einsatz beendet" +
    (gefiltert ? " — hier über die gefilterten Einheiten" : "");
  return (
    <tbody aria-label="Einsatz gesamt">
      <tr className="bereichskopf einsatzkopf">
        <th scope="rowgroup" title={titel}>
          {gefiltert ? "Auswahl gesamt" : "Einsatz gesamt"}
          <span className="nebenwert"> ohne Angefordert</span>
          {einsatz.angefordertEinheiten > 0 && (
            <span className="nebenwert">
              {` · Angefordert ${String(einsatz.angefordertEinheiten)} Einh. ${staerkeText(einsatz.angefordert)}`}
            </span>
          )}
        </th>
        <Kopfzellen spalten={spalten} staerke={einsatz.staerke} einheiten={einsatz.einheiten} />
      </tr>
    </tbody>
  );
}

export interface GegliederteZeilenEigenschaften {
  readonly gliederung: Tabellengliederung;
  readonly zeilen: readonly Tabellenzeile[];
  readonly fenster: { readonly von: number; readonly gesamtzahl: number; readonly gefiltert: boolean };
  readonly spalten: readonly Spalte[];
  /** Baut die Zeile einer Einheit — die Tabelle behält Auswahl und Bearbeitung bei sich. */
  readonly zeileFuer: (zeile: Tabellenzeile, tiefe: number) => React.JSX.Element;
}

/** Die Tabellenkörper der Gliederung: Einsatzkopf, dann je Bereich Kopfzeile und Einheiten. */
export function GegliederteZeilen({
  gliederung,
  zeilen,
  fenster,
  spalten,
  zeileFuer,
}: GegliederteZeilenEigenschaften): React.JSX.Element {
  return (
    <>
      <Einsatzkopf gliederung={gliederung} spalten={spalten} gefiltert={fenster.gefiltert} />
      {bereichsbloecke(gliederung, zeilen, fenster).map(({ bereich, zeilen: unter }) => (
        <tbody key={bereich.abschnittId} aria-label={bereich.name}>
          <Bereichskopfzeile bereich={bereich} spalten={spalten} />
          {unter.map((zeile) => zeileFuer(zeile, bereich.tiefe + 1))}
        </tbody>
      ))}
    </>
  );
}
