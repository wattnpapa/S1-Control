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
 *
 * Nach den Audits vom 2026-11-17:
 * - Im Ausgang steht je Zeile der Stand mit dem Vermerk der FmZ
 *   („angenommen (FmZ) 1320 Fm · Quittung der Gegenstelle 1321 Fm (Funk)“),
 *   statt nur „erledigt“, wo die Nachricht bloß befördert ist (Sachgebietsleiter
 *   P0-1). Den Text liefert der Domänenschnitt als `fmzVermerkText`.
 * - Im Posteingang steht die Kopiefarbe als Wort in einer eigenen Spalte
 *   („grün: bearbeiten“, SGL P2-8) und der Vermerk des Sichters unter dem
 *   Betreff (Sichter P2-5).
 * - Die Liste des Sichters zeigt die Eingangszeit, den Aufnahmevermerk der
 *   FmZ (Sichter P1-2): „innerhalb der Stufe nach Eingang“ wird ablesbar.
 */

import { projektion, type Laufzustand, type Nachrichtenzeile } from "@s1/domaene";

import type { Kontextort } from "./Klappmenue.js";
import { Ersatzmarke } from "./Laufzettelzusatz.js";
import { dtg, eigeneMarken, kopieFuer, kopieklasse, kopiewort, vorrangwort } from "./nachrichtenformate.js";
import { ausgangsvermerk } from "./nachrichtenvermerke.js";

const LAUFWORT: Readonly<Record<Laufzustand, string>> = {
  VOR_FMZ: "vor der FmZ",
  VOR_SICHTER: "vor dem Sichter",
  VERTEILT: "verteilt",
  ERLEDIGT: "erledigt",
  ZURUECKGEZOGEN: "zurückgezogen",
  // Review 2026-11-21: dasselbe Wort wie Lese-Ansicht, Abschlussvermerk und Band.
  VOR_LDF: "beim LdF",
};

export function laufwort(zustand: Laufzustand): string {
  return LAUFWORT[zustand];
}

/**
 * Der Stand eines Ausgangs mit dem Vermerk der FmZ. `fmzVermerkText` liefert
 * der Domänenschnitt (Ring 2); gelesen wird es optional, damit diese Liste
 * auch ohne ihn durch den Typecheck kommt.
 */
export function ausgangsstand(zeile: Nachrichtenzeile): string {
  if (zeile.zurueckgezogen) return laufwort("ZURUECKGEZOGEN");
  // R2-FaBe P0-2: „angenommen (FmZ) …“ und „Quittung der Gegenstelle …“ statt „angenommen …“
  // und „befördert …“ — der Verfasser las die Annahme der eigenen FmZ als Quittung des
  // Empfängers. Der Satz kommt aus Ring 2 (`fmzVermerkText`), derselbe wie in Ansicht und Vorschau.
  // Review 2026-11-21: Davor steht immer, wo die Nachricht jetzt ist und wer dran ist.
  if (zeile.annahme === undefined && zeile.befoerderung === undefined) return wegwort(zeile);
  return `${wegwort(zeile)} · ${ausgangsvermerk(zeile)}`;
}

/**
 * Wo der Ausgang steht und wer dran ist (Review 2026-11-21): „beim LdF
 * (Zuteilung)“, „bei Fm2“, „beim LdF (Nachweisung)“, „vor dem Sichter“ —
 * vorher stand nach der Annahme in drei Zuständen derselbe Vermerk.
 */
export function wegwort(zeile: Nachrichtenzeile): string {
  const schritt = projektion.ldfSchrittDer(zeile);
  const ohneLdf = (zeile as { readonly ldfNichtBesetzt?: unknown }).ldfNichtBesetzt === true;
  if (schritt === "zuteilung") return ohneLdf ? "vor der FmZ (kein LdF)" : "beim LdF (Zuteilung)";
  if (schritt === "weitergabe") return zeile.richtung === "AUSGANG" ? (ohneLdf ? "befördert, kein LdF – FmZ gibt weiter" : "beim LdF (Nachweisung)") : laufwort("VOR_LDF");
  const fm = zeile.vorschlag?.fernmelder.trim() ?? "";
  // Review Runde 2: Den zugeteilten Fernmelder besetzt gerade niemand (Präsenz, vom Worker markiert).
  const fmFrei = (zeile as { readonly fernmelderNichtBesetzt?: unknown }).fernmelderNichtBesetzt === true;
  if (zeile.laufzustand === "VOR_FMZ" && fm !== "") return fmFrei ? `bei ${fm} (nicht besetzt)` : `bei ${fm}`;
  return laufwort(zeile.laufzustand);
}

function Marken({ zeile, stellen }: { readonly zeile: Nachrichtenzeile; readonly stellen: readonly string[] }): React.JSX.Element {
  const { gelesen, erledigt } = eigeneMarken(zeile, stellen);
  // Audit ETB P3-4: Durchstreichen allein trägt nicht (Schwarzweißdruck, Sehschwäche) — das Wort steht dabei.
  if (zeile.zurueckgezogen) return <span className="marke-zustand fehler">zurückgezogen</span>;
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
  /** Additiv: die Spalte „Eingang“ mit dem Aufnahmevermerk (Sicht Sichter, Sichter P1-2). */
  readonly eingangsspalte?: boolean;
  readonly gewaehlt: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufLesen: (id: string) => void;
  readonly aufKontext: (ort: Kontextort) => void;
}

/**
 * Die Nummernspalte ohne Nummer: „folgt (FmZ)“, solange die FmZ sie noch vergeben kann, nach der
 * Beförderung „ohne Nummer“ (R2-SGL P2-5) — die FmZ hat sie dann bewusst nicht vergeben, und
 * „folgt“ versprach dem Verfasser eine Nummer, die nicht kommt.
 */
export function nummerOhne(zeile: Pick<Nachrichtenzeile, "befoerderung"> & Partial<Pick<Nachrichtenzeile, "laufzustand" | "richtung">>, folgt: boolean): string {
  if (!folgt) return "—";
  // Review 2026-11-21: Beim LdF zur Nachweisung kommt die Nummer im nächsten Schritt.
  if (zeile.laufzustand !== undefined && projektion.ldfSchrittDer({ ...zeile, laufzustand: zeile.laufzustand, richtung: zeile.richtung ?? "" }) === "weitergabe") return "folgt (LdF)";
  return zeile.befoerderung === undefined ? "folgt (FmZ)" : "ohne Nummer";
}

/** Der Vermerk der Spalte „Eingang / Beförderung“: beim Eingang die Aufnahme, beim Ausgang die Beförderung. */
function wegvermerk(zeile: Nachrichtenzeile): string {
  const v = zeile.richtung === "AUSGANG" ? zeile.befoerderung : zeile.aufnahme;
  if (v === undefined) return "—";
  return `${zeile.richtung === "AUSGANG" ? "befördert " : ""}${dtg(v.zeitpunkt)} ${v.handzeichen}`;
}

/**
 * Die Kopie des eigenen Ausgangs (R2-FaBe P1-4): Ring 2 markiert sie mit
 * `eigenerAusgang` (optional gelesen) und führt sie als gelesen; hier heißt sie
 * „eigene Nachricht“ statt „grün: bearbeiten“ — sie ist kein Auftrag.
 */
export function eigenerAusgang(zeile: Nachrichtenzeile, stellen: readonly string[]): boolean {
  return zeile.verteiler.some((m) => stellen.includes(m.stelle) && (m as { readonly eigenerAusgang?: unknown }).eigenerAusgang === true);
}

function Standzelle({ zeile, stellen, posteingang }: { readonly zeile: Nachrichtenzeile; readonly stellen: readonly string[]; readonly posteingang: boolean }): React.JSX.Element {
  // Additiv (R2-SGL P1-1): In der Sicht „Offen“ stehen auch eigene Ausgänge und Zeilen der eigenen
  // Station ohne eigene Kopie; sie zeigen ihren Stand, nicht „neu“.
  const eigeneKopie = zeile.verteiler.some((m) => stellen.includes(m.stelle));
  if (posteingang && (eigeneKopie || zeile.zurueckgezogen)) return <Marken zeile={zeile} stellen={stellen} />;
  return <>{zeile.richtungKurz === "A" ? ausgangsstand(zeile) : laufwort(zeile.laufzustand)}</>;
}

function Zeile({ zeile, stellen, posteingang, eingangsspalte = false, gewaehlt, aufWahl, aufLesen, aufKontext }: ZeilenEigenschaften): React.JSX.Element {
  const kopie = kopieFuer(zeile, stellen);
  const klassen = [kopieklasse(kopie), gewaehlt ? "gewaehlt" : "", zeile.zurueckgezogen ? "abgelehnt" : ""].filter((k) => k !== "").join(" ");
  // Eine aufgegebene Nachricht hat vor der FmZ noch keine Nummer: Die vergibt
  // die Fernmeldezentrale beim Nachweisen. „—" hieße „fehlt", „folgt" sagt,
  // dass nichts zu tun ist.
  // Additiv (SGL P0-1): Auch ein beförderter Ausgang ohne Nummer wartet auf die FmZ.
  const folgt = zeile.nummer === undefined && !zeile.zurueckgezogen && (zeile.laufzustand === "VOR_FMZ" || zeile.laufzustand === "VOR_LDF" || zeile.richtungKurz === "A");
  const nummer = zeile.nummer === undefined ? nummerOhne(zeile, folgt) : String(zeile.nummer);
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
      {posteingang && <td className={`kopiewort ${kopieklasse(kopie)}`}>{eigenerAusgang(zeile, stellen) ? "eigene Nachricht" : kopiewort(kopie)}</td>}
      <td>
        <Standzelle zeile={zeile} stellen={stellen} posteingang={posteingang} />
        {zeile.zweiteSichtung !== undefined && (
          <span className="marke-zustand warn" title="Zwei Sichter haben ohne Abgleich verteilt; beide Verteiler gelten, bis eine Nachsichtung bereinigt">
            {" "}
            zwei Sichtungen
          </span>
        )}
        {/* R2-Si P2-1: Die Ersatzsichtung der FmZ trägt eine Marke; der heimkehrende Sichter sieht sie. */}
        <Ersatzmarke zeile={zeile} />
      </td>
      <td>
        <Vorrangmarke zeile={zeile} />
      </td>
      {/* R2-FaBe P2-9: Die Gesprächsnotiz heißt „Notiz“, nicht „E“ — sie kam nicht von außen. */}
      <td>{zeile.gespraechsnotiz ? "Notiz" : zeile.richtungKurz}</td>
      <td className="zahl" title={folgt ? (nummer === "folgt (LdF)" ? "Die Nachweisungsnummer trägt der LdF ein" : "Die Nachweisungsnummer vergibt die Fernmeldezentrale") : undefined}>
        {nummer}
      </td>
      <td>{zeile.absender}</td>
      <td>{zeile.anschrift}</td>
      {eingangsspalte && <td className="mono">{wegvermerk(zeile)}</td>}
      <td className="mono">{dtg(zeile.abfassungszeit)}</td>
      <th scope="row" title={zeile.vermerke === undefined ? undefined : `Vermerk: ${zeile.vermerke}`}>
        {zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}
        {posteingang && zeile.vermerke !== undefined && zeile.vermerke !== "" && <span className="zeilenvermerk">Vermerk: {zeile.vermerke}</span>}
      </th>
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
            <span className="nurvorlesen">Farbrand</span>
          </th>
          {rest.posteingang && <th scope="col">Kopie</th>}
          <th scope="col">{rest.posteingang ? "Marken" : "Stand"}</th>
          <th scope="col">Vorrang</th>
          <th scope="col" title="Eingang oder Ausgang">E/A</th>
          <th scope="col">Nr.</th>
          <th scope="col">Absender</th>
          <th scope="col">Anschrift</th>
          {rest.eingangsspalte === true && <th scope="col">Eingang / Beförderung</th>}
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
