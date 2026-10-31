/**
 * Die Summenzeilen unter der Einheitentabelle.
 *
 * Sie zählen nach derselben Regel wie Kopfband und Ausgaben
 * (`kennzahlen.zaehlklasse`, an der Zeile als `zaehlklasse`): Die erste Zeile
 * ist die Ist-Stärke, die zweite nennt die erwarteten Kräfte, die dritte alle
 * erfassten Einheiten (Ist plus erwartet) — ausdrücklich so benannt und getrennt
 * von der Ist-Stärke; Beendet/Rückmarsch steht als eigene Zeile darunter.
 * Ohne Filter ist die erste Zeile die Zahl des Kopfbands.
 */

import { kennzahlen, type Spalte, type Staerke, type Tabellenzeile } from "@s1/domaene";

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
  readonly beendet: Staerke;
  /** Ist plus erwartet — wie Gliederung und Einheitenliste, ohne Beendet/Rückmarsch. */
  readonly alle: Staerke;
}

/** Die drei Summen der Zeilen — rein, damit Tests sie ohne Oberfläche prüfen. */
export function tabellensummen(zeilen: readonly Tabellenzeile[]): TabellensummeSummen {
  return {
    ist: summiere(zeilen, (k) => k === "ist"),
    erwartet: summiere(zeilen, (k) => k === "erwartet"),
    beendet: summiere(zeilen, (k) => k === "beendet"),
    alle: summiere(zeilen, (k) => k === "ist" || k === "erwartet"),
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

/**
 * Eine Summenzeile: Beschriftung und Zahlen stehen in **einer** Zelle über der
 * ganzen Zeile und kleben links (`.summeninhalt`). So bleiben sie beim
 * waagerechten Scrollen beisammen im Bild — auf dem Handy wie bei breiter
 * Tabelle — und der volle Name wird nie abgeschnitten.
 */
function Summenzeile({ werte, spalten }: { werte: Zeilenwerte; spalten: readonly Spalte[] }): React.JSX.Element {
  return (
    <tr className="summenzeile">
      <th scope="row" colSpan={spalten.length + 1} title={werte.hinweis}>
        <div className="summeninhalt">
          <span className="summentitel">{werte.titel}</span>
          <span className="summenstaerke">
            {`${String(werte.staerke.fuehrer)}/${String(werte.staerke.unterfuehrer)}/${String(werte.staerke.mannschaft)}`}
          </span>
          <span className="summengesamt">{String(koepfe(werte.staerke))}</span>
        </div>
      </th>
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
          hinweis: "Ist-Stärke plus erwartet, ohne Beendet/Rückmarsch. Nicht die Ist-Stärke.",
        }}
      />
      {koepfe(summen.beendet) > 0 && (
        <Summenzeile
          spalten={spalten}
          werte={{
            titel: `Beendet/Rückmarsch${zusatz}`,
            staerke: summen.beendet,
            hinweis: "Einsatz beendet oder Rückmarsch: in keiner der Summen darüber enthalten.",
          }}
        />
      )}
    </tfoot>
  );
}
