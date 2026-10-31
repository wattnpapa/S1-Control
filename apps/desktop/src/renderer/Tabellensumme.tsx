/**
 * Die Summenzeilen unter der Einheitentabelle.
 *
 * Sie zählen nach derselben Regel wie Kopfband und Ausgaben
 * (`kennzahlen.zaehlklasse`, an der Zeile als `zaehlklasse`): Die erste Zeile
 * ist die Ist-Stärke, die zweite nennt die erwarteten Kräfte, die dritte alle
 * erfassten Einheiten — ausdrücklich so benannt und getrennt von der Ist-Stärke.
 * Ohne Filter ist die erste Zeile die Zahl des Kopfbands.
 */

import { kennzahlen, type Spalte, type Staerke, type Tabellenzeile } from "@s1/domaene";
import { istZahl } from "./Einheitenzelle.js";

const NULL: Staerke = { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 };

function plus(a: Staerke, b: Staerke): Staerke {
  return {
    fuehrer: a.fuehrer + b.fuehrer,
    unterfuehrer: a.unterfuehrer + b.unterfuehrer,
    mannschaft: a.mannschaft + b.mannschaft,
  };
}

function koepfe(s: Staerke): number {
  return s.fuehrer + s.unterfuehrer + s.mannschaft;
}

/** Summiert die Zeilen, die `wahl` annimmt; entfernte und aufgegangene zählen nie. */
function summiere(zeilen: readonly Tabellenzeile[], wahl: (klasse: string) => boolean): Staerke {
  return zeilen.reduce((bisher, zeile) => (wahl(zeile.zaehlklasse) ? plus(bisher, zeile.staerke) : bisher), NULL);
}

export interface TabellensummeSummen {
  readonly ist: Staerke;
  readonly erwartet: Staerke;
  readonly alle: Staerke;
}

/** Die drei Summen der Zeilen — rein, damit Tests sie ohne Oberfläche prüfen. */
export function tabellensummen(zeilen: readonly Tabellenzeile[]): TabellensummeSummen {
  return {
    ist: summiere(zeilen, (k) => k === "ist"),
    erwartet: summiere(zeilen, (k) => k === "erwartet"),
    alle: summiere(zeilen, (k) => k !== "ausserhalb"),
  };
}

interface Zeilenwerte {
  readonly titel: string;
  readonly staerke: Staerke;
  readonly hinweis?: string;
}

interface Eigenschaften {
  readonly zeilen: readonly Tabellenzeile[];
  readonly spalten: readonly Spalte[];
  /** Zeigt die Tabelle nur einen Ausschnitt des Einsatzes? */
  readonly ausschnitt: boolean;
}

function Summenzeile({ werte, spalten }: { werte: Zeilenwerte; spalten: readonly Spalte[] }): React.JSX.Element {
  return (
    <tr className="summenzeile">
      <th scope="row" title={werte.hinweis}>
        {werte.titel}
      </th>
      {spalten.map((spalte) => (
        <td key={spalte.schluessel} className={istZahl(spalte) ? "zahl" : undefined}>
          {spalte.schluessel === "staerke"
            ? `${String(werte.staerke.fuehrer)}/${String(werte.staerke.unterfuehrer)}/${String(werte.staerke.mannschaft)}`
            : spalte.schluessel === "gesamt"
              ? String(koepfe(werte.staerke))
              : ""}
        </td>
      ))}
    </tr>
  );
}

export function Tabellensumme({ zeilen, spalten, ausschnitt }: Eigenschaften): React.JSX.Element {
  const summen = tabellensummen(zeilen);
  const zusatz = ausschnitt ? " (Ausschnitt)" : "";
  return (
    <tfoot>
      <Summenzeile
        spalten={spalten}
        werte={{ titel: `Ist-Stärke${zusatz}`, staerke: summen.ist, hinweis: kennzahlen.ZAEHLREGEL_TEXT }}
      />
      {koepfe(summen.erwartet) > 0 && (
        <Summenzeile
          spalten={spalten}
          werte={{
            titel: `Erwartet${zusatz}`,
            staerke: summen.erwartet,
            hinweis: "Angefordert, im Anmarsch, in Rufbereitschaft oder im Eingang: noch nicht vor Ort.",
          }}
        />
      )}
      <Summenzeile
        spalten={spalten}
        werte={{
          titel: `Alle erfassten Einheiten${zusatz}`,
          staerke: summen.alle,
          hinweis: "Ist-Stärke plus erwartet plus beendet. Nicht die Ist-Stärke.",
        }}
      />
    </tfoot>
  );
}
