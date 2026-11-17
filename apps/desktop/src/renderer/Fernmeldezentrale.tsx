/**
 * Die Sicht „Fernmeldezentrale" im Blatt Nachrichten (KONZEPT-NACHRICHTEN.md
 * §5, §6, Schnitt N2) — zwei Karten.
 *
 * Links die Ausgangswarteschlange: was aufgegeben und noch nicht befördert
 * ist (Laufzustand VOR_FMZ), Vorrang zuoberst, wie Ring 2 sie ordnet. Je
 * Zeile die drei Vermerke des oberen Vordruckteils als Knöpfe: Annehmen,
 * Befördern, Nachweisen; davor der Vorschlag des LdF (Fernmelder, Mittel,
 * Gegenstelle), den die Maske „Befördern" vorbelegt. Liegt eine angenommene Nachricht länger als die
 * Schwelle unbefördert, steht ihre Zeile bernstein mit der Zeit seit Annahme
 * — die Belastung der FmZ aus dem Vergleich von Annahme und Beförderung
 * (§5 „Zwanzig Minuten"); die Farbe steht nie allein, die Minuten stehen dabei.
 *
 * Führt der Einsatz den LdF als Station (additiv, 2026-11-17), stehen
 * angenommene Ausgänge ohne Übermittlungsvorschlag mit der Marke „beim LdF"
 * in der Schlange — ist kein LdF da, befördert der Fernmelder sie selbst.
 *
 * Rechts der Hauptknopf „Eingang aufnehmen": die Nachrichtenmaske mit
 * Richtung Eingang und freigeschaltetem oberem Teil.
 *
 * **Nichts wird hier gerechnet** außer den Minuten seit Annahme; Ordnung,
 * Schwelle und Nummernvorbelegung kommen aus Ring 2.
 *
 * Nach den Audits vom 2026-11-17:
 * - Die Schlange zeigt den Absender und die Wartezeit seit dem Eintreffen
 *   (`wartetSeit` aus Ring 2, sobald der Domänenschnitt es liefert) und die
 *   Schwelle als Text im Kopf (LdF P1-4, P2-6).
 * - Der Hauptknopf der Zeile ist der nächste fällige Schritt: ohne Annahme
 *   „Annehmen“, sonst „Befördern“ (Fernmelder P3-4).
 * - Eine dritte Karte „Ohne Nummer“ hält beförderte Nachrichten ohne
 *   Nachweisungsnummer sichtbar, mit Knopf „Nachweisen“ (LdF P0-1,
 *   Sachgebietsleiter P1-6) — vorher fielen sie still aus der Sicht.
 * - Zweiter Durchlauf (Fernmelder P3-4, SGL P2-11): Vier Knöpfe je Zeile
 *   brachen bei 1320 Pixeln um und machten jede Zeile doppelt hoch. In der
 *   Zeile steht nur noch der Hauptknopf (der nächste fällige Schritt), die
 *   übrigen Schritte liegen im Menü „⋯“ daneben.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import { minutenSeit } from "./fmzformate.js";
import type { Fmzschritt } from "./Fmzmasken.js";
import { Klappmenue, Menueeintrag } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";
import { kuerzel, kuerzelText } from "./tastatur.js";
import { vorschlagText } from "./Vordruckteile.js";

export interface WarteschlangenEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  /** Die Uhr des Workers, gegen die auch die Schwelle gerechnet ist. */
  readonly jetzt: string;
  readonly gewaehltId: string | undefined;
  readonly nurLesen: boolean;
  readonly aufWahl: (id: string) => void;
  readonly aufSchritt: (schritt: Fmzschritt, zeile: Nachrichtenzeile) => void;
  /** Additiv: die Schwelle des Einsatzes in Minuten, als Text im Kopf (LdF P1-4). */
  readonly schwelleMinuten?: number;
}

/**
 * Die Minuten seit dem Eintreffen bei der FmZ. Das Feld `wartetSeit` liefert
 * der Domänenschnitt (Ring 2, `nachrichtenstand.ts`); solange die Zeile es
 * nicht trägt, bleibt die Spalte leer — gelesen wird es deshalb optional.
 */
export function wartezeit(zeile: Nachrichtenzeile): number | undefined {
  const wert = (zeile as { readonly wartetSeit?: number }).wartetSeit;
  return typeof wert === "number" ? wert : undefined;
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

/** „beim LdF" — der Ausgang wartet auf den Übermittlungsvorschlag des LdF. */
function Wegmarke({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  return zeile.laufzustand === "VOR_LDF" ? <span className="marke-zustand warn"> beim LdF</span> : null;
}

interface Zeilenschritt {
  readonly schritt: Fmzschritt;
  readonly text: string;
  readonly titel: string;
}

/**
 * Die Schritte einer Zeile; der erste ist der Hauptknopf — ohne Annahme
 * „Annehmen“, sonst „Befördern“ (Fernmelder P3-4) —, die übrigen stehen im Menü.
 */
export function zeilenschritte(zeile: Nachrichtenzeile): readonly Zeilenschritt[] {
  const annehmen: Zeilenschritt = { schritt: "annahme", text: zeile.annahme === undefined ? "Annehmen" : "Annahme ändern", titel: "Annahmevermerk: Uhrzeit und Handzeichen" };
  const befoerdern: Zeilenschritt = { schritt: "befoerderung", text: "Befördern", titel: "Beförderungsvermerk: Mittel, Gegenstelle, Zeit, Handzeichen" };
  const rest: readonly Zeilenschritt[] = [
    { schritt: "vorschlag", text: zeile.vorschlag === undefined ? "Vorschlag" : "Vorschlag ändern", titel: "Übermittlungsvorschlag des LdF: Fernmelder, Mittel, Gegenstelle" },
    { schritt: "nachweis", text: zeile.nummer === undefined ? "Nachweisen" : `Nr. ${String(zeile.nummer)} ändern`, titel: "In die Nachweisung eintragen" },
  ];
  return zeile.annahme === undefined ? [annehmen, befoerdern, ...rest] : [befoerdern, annehmen, ...rest];
}

function Knoepfe({ zeile, nurLesen, aufSchritt }: { readonly zeile: Nachrichtenzeile; readonly nurLesen: boolean; readonly aufSchritt: WarteschlangenEigenschaften["aufSchritt"] }): React.JSX.Element {
  const [haupt, ...weitere] = zeilenschritte(zeile);
  return (
    <span className="zeilenknoepfe">
      {haupt !== undefined && (
        <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : haupt.titel} onClick={() => aufSchritt(haupt.schritt, zeile)}>
          {haupt.text}
        </button>
      )}
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "⋯", beschriftung: "Weitere Schritte", titel: "Weitere Schritte: Vorschlag, Annahme, Nachweis", gesperrt: nurLesen }}
        menue={{ beschriftung: "Weitere Schritte", id: `fmzschritte-${zeile.id}` }}
        inhalt={(waehle) =>
          weitere.map((s) => <Menueeintrag key={s.schritt} text={s.text} titel={s.titel} sperre={nurLesen ? TEXT_NUR_LESEN : undefined} aufWahl={waehle(() => aufSchritt(s.schritt, zeile))} />)
        }
      />
    </span>
  );
}

/** Die linke Karte: die Ausgangswarteschlange mit den Knöpfen je Zeile. */
export function Warteschlange({ zeilen, jetzt, gewaehltId, nurLesen, aufWahl, aufSchritt, schwelleMinuten = 20 }: WarteschlangenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Ausgangswarteschlange">
      <h3>
        Ausgangswarteschlange <span className="nebenwert">Schwelle {schwelleMinuten} min</span>
      </h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Keine Nachricht vor der FmZ.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Nachrichten vor der FmZ">
          <thead>
            <tr>
              <th scope="col">Vorrang</th>
              <th scope="col">Nr.</th>
              <th scope="col">Absender</th>
              <th scope="col">Anschrift</th>
              <th scope="col">Betreff</th>
              <th scope="col">Abfassungszeit</th>
              <th scope="col">Wartet</th>
              <th scope="col">Vorschlag LdF</th>
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
                <td>{zeile.absender}</td>
                <td>{zeile.anschrift}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td className="mono">{dtg(zeile.abfassungszeit)}</td>
                <td className={zeile.fmzUeberSchwelle ? "zahl marke-zustand warn" : "zahl"}>{wartezeit(zeile) === undefined ? "—" : `${String(wartezeit(zeile))} min`}</td>
                <td>{vorschlagText(zeile) ?? <span className="leise">kein Vorschlag</span>}</td>
                <td>
                  <Annahmezelle zeile={zeile} jetzt={jetzt} />
                  <Wegmarke zeile={zeile} />
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

/**
 * Die befördert, aber nicht nachgewiesenen Nachrichten (LdF P0-1, SGL P1-6,
 * Fernmelder P2-10) — aus der Nachweisung gefiltert, weil die Sicht der FmZ
 * in Ring 2 nur VOR_FMZ kennt. Das Filtern ist Darstellung, keine Regel.
 */
export function ohneNummerZeilen(zeilen: readonly Nachrichtenzeile[]): readonly Nachrichtenzeile[] {
  return zeilen.filter((z) => z.befoerderung !== undefined && z.nummer === undefined && !z.zurueckgezogen);
}

/** Die dritte Karte: beförderte Nachrichten ohne Nummer, mit „Nachweisen". */
export function OhneNummerKarte({ zeilen, nurLesen, aufSchritt }: { readonly zeilen: readonly Nachrichtenzeile[]; readonly nurLesen: boolean; readonly aufSchritt: WarteschlangenEigenschaften["aufSchritt"] }): React.JSX.Element | null {
  if (zeilen.length === 0) return null;
  return (
    <section className="karte fmzkarte" aria-label="Ohne Nummer">
      <h3>Ohne Nummer</h3>
      <p className="hinweistext">Befördert, aber noch nicht nachgewiesen — die Nummer gehört ins Betriebsbuch.</p>
      <table className="nachrichtentabelle" aria-label="Beförderte Nachrichten ohne Nummer">
        <tbody>
          {zeilen.map((zeile) => (
            <tr key={zeile.id}>
              <td>{vorrangwort(zeile)}</td>
              <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
              <td className="mono">
                {zeile.befoerderung === undefined ? "—" : `${dtg(zeile.befoerderung.zeitpunkt)} ${zeile.befoerderung.handzeichen}`}
              </td>
              <td>
                <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "In die Nachweisung eintragen"} onClick={() => aufSchritt("nachweis", zeile)}>
                  Nachweisen
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Die rechte Karte: der Hauptknopf „Eingang aufnehmen". */
export function Eingangskarte({ nurLesen, aufEingang }: { readonly nurLesen: boolean; readonly aufEingang: () => void }): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Eingang">
      <h3>Eingang von außen</h3>
      {/* R2-FM P2-1: das Kürzel steht dabei; in dieser Sicht öffnet Strg+N die Aufnahme. */}
      <p className="hinweistext">Nachricht mit Aufnahmevermerk, Gegenstelle und Nummer aufnehmen; sie läuft danach zum Sichter. Kürzel: {kuerzelText(kuerzel("anlegen") as never)}.</p>
      <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : `Den Vordruck mit Aufnahmevermerk ausfüllen (${kuerzelText(kuerzel("anlegen") as never)})`} onClick={aufEingang}>
        Eingang aufnehmen
      </button>
    </section>
  );
}
