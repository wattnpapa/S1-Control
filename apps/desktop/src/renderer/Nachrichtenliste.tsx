/**
 * Die Liste einer Sicht im Blatt „Nachrichten" (KONZEPT-NACHRICHTEN.md §6).
 *
 * Eine Zeile je Nachricht, in der Ordnung von Ring 2 (Blitz vor Sofort vor
 * einfach, dann nach Eingang). Links am Rand die Kopiefarbe — grün
 * Hauptempfänger, blau Mitleser, rot S2 —, damit man beim Aufschlagen weiß,
 * ob man handeln oder nur wissen soll (§2, „Drittens"). Die Farbe steht nie
 * allein: Die Kopie steht auch als Wort im Titel der Zeile.
 *
 * Im Posteingang tragen die Zeilen die beiden Marken „gelesen" und
 * „erledigt" der eigenen Stellen; Ausgang und Sichter zeigen stattdessen den
 * Laufzustand.
 */

import { projektion, type Laufzustand, type Nachrichtenzeile } from "@s1/domaene";

import type { Kontextort } from "./Klappmenue.js";
import { dtg, eigeneMarken, kopieFuer, kopieklasse, vorrangwort } from "./nachrichtenformate.js";

const LAUFWORT: Readonly<Record<Laufzustand, string>> = {
  VOR_FMZ: "vor der FmZ",
  VOR_SICHTER: "vor dem Sichter",
  VERTEILT: "verteilt",
  ERLEDIGT: "erledigt",
  ZURUECKGEZOGEN: "zurückgezogen",
};

export function laufwort(zustand: Laufzustand): string {
  return LAUFWORT[zustand];
}

function Marken({ zeile, stellen }: { readonly zeile: Nachrichtenzeile; readonly stellen: readonly string[] }): React.JSX.Element {
  const { gelesen, erledigt } = eigeneMarken(zeile, stellen);
  return (
    <>
      <span className={gelesen ? "marke-zustand ok" : "marke-zustand warn"}>{gelesen ? "gelesen" : "neu"}</span>{" "}
      {erledigt && <span className="marke-zustand ok">erledigt</span>}
    </>
  );
}

function Vorrangmarke({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  const wort = vorrangwort(zeile);
  if (wort === "") return null;
  return <span className={zeile.vorrangstufe === 0 ? "marke-zustand fehler vorrang-blitz" : "marke-zustand warn"}>{wort}</span>;
}

interface ZeilenEigenschaften {
  readonly zeile: Nachrichtenzeile;
  readonly stellen: readonly string[];
  readonly posteingang: boolean;
  readonly gewaehlt: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufLesen: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
}

function Zeile({ zeile, stellen, posteingang, gewaehlt, aufWahl, aufLesen, aufKontext }: ZeilenEigenschaften): React.JSX.Element {
  const kopie = kopieFuer(zeile, stellen);
  const klassen = [kopieklasse(kopie), gewaehlt ? "gewaehlt" : "", zeile.zurueckgezogen ? "abgelehnt" : ""].filter((k) => k !== "").join(" ");
  // Eine aufgegebene Nachricht hat vor der FmZ noch keine Nummer: Die vergibt
  // die Fernmeldezentrale beim Nachweisen. „—" hieße „fehlt", „folgt" sagt,
  // dass nichts zu tun ist.
  const folgt = zeile.nummer === undefined && zeile.laufzustand === "VOR_FMZ";
  const nummer = zeile.nummer === undefined ? (folgt ? "folgt (FmZ)" : "—") : String(zeile.nummer);
  const kopietext = kopie === undefined ? "ohne Kopie" : `Kopie ${projektion.kopieWort(kopie)}`;
  return (
    <tr
      className={klassen}
      aria-selected={gewaehlt}
      title={kopietext}
      onClick={() => aufWahl(zeile.id)}
      onDoubleClick={() => aufLesen(zeile.id)}
      onContextMenu={(ereignis) => {
        ereignis.preventDefault();
        aufWahl(zeile.id);
        aufKontext({ x: ereignis.clientX, y: ereignis.clientY });
      }}
    >
      <td className="kopierand">
        <span className="nurvorlesen">{kopietext}</span>
      </td>
      <td>{posteingang ? <Marken zeile={zeile} stellen={stellen} /> : laufwort(zeile.laufzustand)}</td>
      <td>
        <Vorrangmarke zeile={zeile} />
      </td>
      <td>{zeile.richtungKurz}</td>
      <td className="zahl" title={folgt ? "Die Nachweisungsnummer vergibt die Fernmeldezentrale" : undefined}>
        {nummer}
      </td>
      <td>{zeile.absender}</td>
      <td>{zeile.anschrift}</td>
      <td className="mono">{dtg(zeile.abfassungszeit)}</td>
      <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
    </tr>
  );
}

export interface NachrichtenlisteEigenschaften extends Omit<ZeilenEigenschaften, "zeile" | "gewaehlt"> {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly beschriftung: string;
  readonly gewaehltId: string | undefined;
}

export function Nachrichtenliste({ zeilen, beschriftung, gewaehltId, ...rest }: NachrichtenlisteEigenschaften): React.JSX.Element {
  return (
    <table className="nachrichtentabelle" aria-label={beschriftung}>
      <thead>
        <tr>
          <th scope="col" className="kopierand">
            <span className="nurvorlesen">Kopie</span>
          </th>
          <th scope="col">{rest.posteingang ? "Marken" : "Stand"}</th>
          <th scope="col">Vorrang</th>
          <th scope="col" title="Eingang oder Ausgang">E/A</th>
          <th scope="col">Nr.</th>
          <th scope="col">Absender</th>
          <th scope="col">Anschrift</th>
          <th scope="col">Abfassungszeit</th>
          <th scope="col">Betreff</th>
        </tr>
      </thead>
      <tbody>
        {zeilen.map((zeile) => (
          <Zeile key={zeile.id} zeile={zeile} gewaehlt={zeile.id === gewaehltId} {...rest} />
        ))}
      </tbody>
    </table>
  );
}
