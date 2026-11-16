/**
 * Die Sicht „Fernmeldezentrale" im Blatt Nachrichten (KONZEPT-NACHRICHTEN.md
 * §5, §6, Schnitt N2) — zwei Karten.
 *
 * Links die Ausgangswarteschlange: was aufgegeben und noch nicht befördert
 * ist (Laufzustand VOR_FMZ), Vorrang zuoberst, wie Ring 2 sie ordnet. Je
 * Zeile die drei Vermerke des oberen Vordruckteils als Knöpfe: Annehmen,
 * Befördern, Nachweisen. Liegt eine angenommene Nachricht länger als die
 * Schwelle unbefördert, steht ihre Zeile bernstein mit der Zeit seit Annahme
 * — die Belastung der FmZ aus dem Vergleich von Annahme und Beförderung
 * (§5 „Zwanzig Minuten"); die Farbe steht nie allein, die Minuten stehen dabei.
 *
 * Rechts der Hauptknopf „Eingang aufnehmen": die Nachrichtenmaske mit
 * Richtung Eingang und freigeschaltetem oberem Teil.
 *
 * **Nichts wird hier gerechnet** außer den Minuten seit Annahme; Ordnung,
 * Schwelle und Nummernvorbelegung kommen aus Ring 2.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import { minutenSeit } from "./fmzformate.js";
import type { Fmzschritt } from "./Fmzmasken.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";

export interface WarteschlangenEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  /** Die Uhr des Workers, gegen die auch die Schwelle gerechnet ist. */
  readonly jetzt: string;
  readonly gewaehltId: string | undefined;
  readonly nurLesen: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufSchritt: (schritt: Fmzschritt, zeile: Nachrichtenzeile) => void;
}

function Annahmezelle({ zeile, jetzt }: { readonly zeile: Nachrichtenzeile; readonly jetzt: string }): React.JSX.Element {
  if (zeile.annahme === undefined) return <span className="leise">nicht angenommen</span>;
  const seit = minutenSeit(zeile.annahme.zeitpunkt, jetzt);
  return (
    <>
      {dtg(zeile.annahme.zeitpunkt)} {zeile.annahme.handzeichen}
      {seit !== undefined && <span className={zeile.fmzUeberSchwelle ? "marke-zustand warn" : "nebenwert"}> seit {seit} min</span>}
    </>
  );
}

function Knoepfe({ zeile, nurLesen, aufSchritt }: { readonly zeile: Nachrichtenzeile; readonly nurLesen: boolean; readonly aufSchritt: WarteschlangenEigenschaften["aufSchritt"] }): React.JSX.Element {
  const titel = (text: string): string => (nurLesen ? TEXT_NUR_LESEN : text);
  return (
    <span className="zeilenknoepfe">
      <button type="button" disabled={nurLesen} title={titel("Annahmevermerk: Uhrzeit und Handzeichen")} onClick={() => aufSchritt("annahme", zeile)}>
        {zeile.annahme === undefined ? "Annehmen" : "Annahme ändern"}
      </button>
      <button type="button" className="haupt" disabled={nurLesen} title={titel("Beförderungsvermerk: Mittel, Gegenstelle, Zeit, Handzeichen")} onClick={() => aufSchritt("befoerderung", zeile)}>
        Befördern
      </button>
      <button type="button" disabled={nurLesen} title={titel("In die Nachweisung eintragen")} onClick={() => aufSchritt("nachweis", zeile)}>
        {zeile.nummer === undefined ? "Nachweisen" : `Nr. ${String(zeile.nummer)} ändern`}
      </button>
    </span>
  );
}

/** Die linke Karte: die Ausgangswarteschlange mit den Knöpfen je Zeile. */
export function Warteschlange({ zeilen, jetzt, gewaehltId, nurLesen, aufWahl, aufSchritt }: WarteschlangenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Ausgangswarteschlange">
      <h3>Ausgangswarteschlange</h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Keine Nachricht vor der FmZ.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Nachrichten vor der FmZ">
          <thead>
            <tr>
              <th scope="col">Vorrang</th>
              <th scope="col">Nr.</th>
              <th scope="col">Anschrift</th>
              <th scope="col">Betreff</th>
              <th scope="col">Abfassungszeit</th>
              <th scope="col">Annahme</th>
              <th scope="col">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr
                key={zeile.id}
                className={[zeile.fmzUeberSchwelle ? "ueberschwelle" : "", zeile.id === gewaehltId ? "gewaehlt" : ""].filter((k) => k !== "").join(" ")}
                aria-selected={zeile.id === gewaehltId}
                onClick={() => aufWahl(zeile.id)}
              >
                <td>{vorrangwort(zeile) === "" ? "" : <span className={zeile.vorrangstufe === 0 ? "marke-zustand fehler vorrang-blitz" : "marke-zustand warn"}>{vorrangwort(zeile)}</span>}</td>
                <td className="zahl">{zeile.nummer ?? "—"}</td>
                <td>{zeile.anschrift}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td className="mono">{dtg(zeile.abfassungszeit)}</td>
                <td>
                  <Annahmezelle zeile={zeile} jetzt={jetzt} />
                </td>
                <td>
                  <Knoepfe zeile={zeile} nurLesen={nurLesen} aufSchritt={aufSchritt} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Die rechte Karte: der Hauptknopf „Eingang aufnehmen". */
export function Eingangskarte({ nurLesen, aufEingang }: { readonly nurLesen: boolean; readonly aufEingang: () => void }): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Eingang">
      <h3>Eingang von außen</h3>
      <p className="hinweistext">Nachricht mit Aufnahmevermerk, Gegenstelle und Nummer aufnehmen; sie läuft danach zum Sichter.</p>
      <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Den Vordruck mit Aufnahmevermerk ausfüllen"} onClick={aufEingang}>
        Eingang aufnehmen
      </button>
    </section>
  );
}
