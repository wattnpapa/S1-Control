/**
 * Die Gliederung der Einheitentabelle nach Bereichen.
 *
 * Seit Runde 6 („Entlastung", 3.5) die Vorgabe, solange im Baum kein
 * Abschnitt gewählt ist, und ohne Spalte Abschnitt: Die Kopfzeile sagt, wo
 * eine Einheit steht. Die Kopfzelle reicht bis zur ersten Zahlenspalte.
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

import { abschnittstypTitel, kennzahlen, type Bereichskopf, type Spalte, type Staerke, type Tabellengliederung, type Tabellenzeile } from "@s1/domaene";

export interface Gliederungswahl {
  readonly an: boolean;
  readonly ohneLeere: boolean;
}

export const GLIEDERUNG_AUS: Gliederungswahl = { an: false, ohneLeere: false };

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

/**
 * Wie viele Spalten links vor der ersten Zahl stehen. So weit reicht die
 * Kopfzelle eines Bereichs: Name und Zahl der Einheiten brauchen die Breite,
 * und unter Status, Schicht oder Organisation hat eine Zwischensumme nichts
 * zu sagen.
 */
export function vorlauf(spalten: readonly Spalte[]): number {
  const erste = spalten.findIndex((spalte) => spalte.schluessel === "staerke" || spalte.schluessel === "gesamt");
  return Math.max(1, erste === -1 ? spalten.length : erste);
}

interface KopfzellenEigenschaften {
  readonly spalten: readonly Spalte[];
  readonly staerke: Staerke;
}

/** Die Zahlenzellen einer Kopfzeile rechts der Kopfzelle: Stärke und Gesamt. */
function Kopfzellen({ spalten, staerke }: KopfzellenEigenschaften): React.JSX.Element {
  return (
    <>
      {spalten.slice(vorlauf(spalten)).map((spalte) => {
        const zahl = spalte.schluessel === "staerke" || spalte.schluessel === "gesamt";
        const inhalt =
          spalte.schluessel === "staerke" ? staerkeText(staerke) : spalte.schluessel === "gesamt" ? String(summe(staerke)) : "";
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
    bereich.zaehlt ? "" : "zählt nicht in die Ist-Stärke",
  ]
    .filter((teil) => teil !== "")
    .join(" · ");
  return (
    <tr className={bereich.zaehlt ? "bereichskopf" : "bereichskopf zaehlt-nicht"}>
      <th scope="rowgroup" colSpan={vorlauf(spalten)} style={einzug(bereich.tiefe)} title={titel}>
        {bereich.name}
        {mitUnterabschnitten && <span className="nebenwert"> mit Unterabschnitten</span>}
        <span className="nebenwert"> · {String(bereich.einheitenSumme)} Einh.</span>
        {!bereich.zaehlt && <span className="nebenwert"> · zählt nicht</span>}
        {bereich.erwartetSumme > 0 && <span className="nebenwert"> · {kennzahlen.erwartetKurz(bereich.erwartetSumme)}</span>}
      </th>
      <Kopfzellen spalten={spalten} staerke={bereich.summenStaerke} />
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
 * Die oberste Kopfzeile: die Ist-Stärke des Einsatzes.
 *
 * Sie zeigt dieselbe Zahl wie das Kopfband (eine Zählregel,
 * `kennzahlen.zaehlklasse`) und nennt daneben, was nicht darin steht: die
 * erwarteten Kräfte und alle erfassten Einheiten.
 */
function Einsatzkopf({ gliederung, spalten, gefiltert }: EinsatzkopfEigenschaften): React.JSX.Element {
  const { einsatz } = gliederung;
  const titel = `${kennzahlen.ZAEHLREGEL_TEXT}${gefiltert ? " — hier über die gefilterten Einheiten" : ""}`;
  const erwartet = summe(einsatz.erwartet);
  return (
    <tbody aria-label="Ist-Stärke gesamt">
      <tr className="bereichskopf einsatzkopf">
        <th scope="rowgroup" colSpan={vorlauf(spalten)} title={titel}>
          {gefiltert ? "Auswahl: Ist-Stärke" : "Ist-Stärke gesamt"}
          <span className="nebenwert">{` · ${String(einsatz.einheiten)} Einh.`}</span>
          {erwartet > 0 && <span className="nebenwert">{` · ${kennzahlen.erwartetText(erwartet)}`}</span>}
          <span className="nebenwert">
            {` · Alle erfassten Einheiten ${String(einsatz.alleEinheiten)} Einh. ${staerkeText(einsatz.alle)}`}
          </span>
          {einsatz.beendetEinheiten > 0 && (
            <span className="nebenwert" title="Nicht in der Ist-Stärke und nicht in „Alle erfassten Einheiten“.">
              {` · Beendet/Rückmarsch: ${String(einsatz.beendetEinheiten)} Einh. ${staerkeText(einsatz.beendet)}`}
            </span>
          )}
        </th>
        <Kopfzellen spalten={spalten} staerke={einsatz.staerke} />
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
