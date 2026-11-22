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
 * - Nachzug der zweiten Runde: Die Marke „abweichend“ steht neben dem
 *   Vorschlag, wenn die Beförderung vom Vorschlag des LdF abweicht (R2-LdF
 *   P2-2), und die Minuten seit Annahme brechen nicht unter die Zeile um
 *   (R2-FM P3-3, `wartezelle`).
 * - Fernmelder als eigene Stellen (2026-11-21): Führt die Sitzung einen der
 *   Fernmelder Fm1 bis Fm3, stehen die Nachrichten, die der LdF ihm
 *   zugeteilt hat, zuoberst mit der Marke „für Sie“, darunter die ohne
 *   Zuteilung und die der anderen. „Nur meine“ blendet die übrigen aus —
 *   ein Zuschnitt, kein Recht (`fernmelderzuteilung.ts`).
 */

import { useState } from "react";

import { eigeneFernmelder, hatFernmelderstelle, projektion, type Nachrichtenzeile } from "@s1/domaene";

import { ausgeblendetText, eigeneZuerst, mirZugeteilt, nurZugeteilte } from "./fernmelderzuteilung.js";
import { minutenSeit } from "./fmzformate.js";
import type { Fmzschritt } from "./Fmzmasken.js";
import { Klappmenue, Menueeintrag } from "./Klappmenue.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";
import { Abweichungsmarke } from "./Nachweisung.js";
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
  /** Additiv (2026-11-21): die Stellen der Sitzung — ein Fernmelder Fm1 bis Fm3 sieht seine Zuteilungen zuoberst. */
  readonly stellen?: readonly string[];
  /**
   * Additiv (Review 2026-11-21): Ein beförderter Ausgang hängt beim LdF, weil
   * keiner besetzt ist — der Fernmelder gibt ihn selbst an den Sichter weiter.
   */
  readonly aufWeitergabe?: (zeile: Nachrichtenzeile) => void;
  /** Additiv (Review Runde 2): Ist ein LdF besetzt? Ohne ihn befördert die FmZ selbst — ein Satz statt Spalte und Marken. */
  readonly ldfBesetzt?: boolean;
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
      {seit !== undefined && <span className={zeile.fmzUeberSchwelle ? "marke-zustand warn wartezelle" : "nebenwert wartezelle"}> seit {seit} min</span>}
    </>
  );
}

/** „beim LdF" — der Ausgang wartet auf den Übermittlungsvorschlag des LdF. */
function Wegmarke({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  if (zeile.laufzustand !== "VOR_LDF") return null;
  if (projektion.ldfSchrittDer(zeile) === "weitergabe") return <span className="marke-zustand warn"> {zeile.richtung === "AUSGANG" ? "befördert" : "Eingang aufgenommen"}, LdF nicht besetzt – selbst weitergeben</span>;
  // Review Runde 2: Vor der Zuteilung sagen Spalte „Zugeteilt“ und „wartet auf Zuteilung“ schon alles;
  // ohne LdF steht ein Satz über der Tabelle statt einer Warnmarke in jeder Zeile.
  return null;
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
export function zeilenschritte(zeile: Nachrichtenzeile, ldf = false): readonly Zeilenschritt[] {
  const annehmen: Zeilenschritt = { schritt: "annahme", text: zeile.annahme === undefined ? "Annehmen" : "Annahme ändern", titel: "Annahmevermerk: Uhrzeit und Handzeichen" };
  const befoerdern: Zeilenschritt = { schritt: "befoerderung", text: "Befördern", titel: "Beförderungsvermerk: Mittel, Gegenstelle, Zeit, Handzeichen" };
  const rest: readonly Zeilenschritt[] = [
    { schritt: "nachweis", text: zeile.nummer === undefined ? "Nachweisen" : `Nr. ${String(zeile.nummer)} ändern`, titel: "In die Nachweisung eintragen" },
  ];
  // 2026-11-22: „Vorschlag“ hieß für den LdF nichts — es ist die Zuteilung an einen Fernmelder.
  const zuteilen: Zeilenschritt = { schritt: "vorschlag", text: zeile.vorschlag === undefined ? "Fernmelder zuteilen" : "Zuteilung ändern", titel: "Einem Fernmelder (Fm1 bis Fm3) zuteilen, Mittel und Gegenstelle bestimmen" };
  // Der LdF (ohne eigene Fernmelderstelle) teilt zu oder ändert die Zuteilung; Annehmen und Befördern
  // sind Sache der Fernmelder und stehen im Menü (Review Runde 2).
  if (ldf) return [zuteilen, befoerdern, annehmen, ...rest];
  return zeile.annahme === undefined ? [annehmen, befoerdern, zuteilen, ...rest] : [befoerdern, annehmen, zuteilen, ...rest];
}

function Knoepfe({ zeile, nurLesen, aufSchritt, aufWeitergabe, ldf = false }: { readonly zeile: Nachrichtenzeile; readonly nurLesen: boolean; readonly aufSchritt: WarteschlangenEigenschaften["aufSchritt"]; readonly aufWeitergabe?: ((zeile: Nachrichtenzeile) => void) | undefined; readonly ldf?: boolean }): React.JSX.Element {
  if (projektion.ldfSchrittDer(zeile) === "weitergabe") {
    return (
      <span className="zeilenknoepfe">
        <button type="button" className="haupt" disabled={nurLesen || aufWeitergabe === undefined} title={nurLesen ? TEXT_NUR_LESEN : "Kein LdF besetzt: Nummer eintragen und selbst an den Sichter weitergeben"} onClick={() => aufWeitergabe?.(zeile)}>
          Selbst weitergeben
        </button>
      </span>
    );
  }
  // Review 2026-11-21: Solange der besetzte LdF noch nicht zugeteilt hat, ist nichts zu tun — die Schritte bleiben im Menü.
  const wartet = !ldf && projektion.ldfSchrittDer(zeile) === "zuteilung" && (zeile as { readonly ldfNichtBesetzt?: unknown }).ldfNichtBesetzt !== true;
  const [erster, ...rest] = zeilenschritte(zeile, ldf);
  const haupt = wartet ? undefined : erster;
  const weitere = wartet && erster !== undefined ? [erster, ...rest] : rest;
  return (
    <span className="zeilenknoepfe">
      {wartet && (
        <span className="leise" title="Der LdF teilt zu. Im Notfall (LdF reagiert nicht, Blitz) über „⋯“ selbst befördern.">
          wartet auf Zuteilung
        </span>
      )}
      {haupt !== undefined && (
        <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : haupt.titel} onClick={() => aufSchritt(haupt.schritt, zeile)}>
          {haupt.text}
        </button>
      )}
      <Klappmenue
        huelle="rechts"
        knopf={{ inhalt: "⋯", beschriftung: "Weitere Schritte", titel: "Weitere Schritte: Annahme, Zuteilung, Nachweis", gesperrt: nurLesen }}
        menue={{ beschriftung: "Weitere Schritte", id: `fmzschritte-${zeile.id}` }}
        inhalt={(waehle) =>
          weitere.map((s) => <Menueeintrag key={s.schritt} text={s.text} titel={s.titel} sperre={nurLesen ? TEXT_NUR_LESEN : undefined} aufWahl={waehle(() => aufSchritt(s.schritt, zeile))} />)
        }
      />
    </span>
  );
}

/** „nur meine (Fm2)“: blendet aus, was nicht dem eigenen Fernmelder zugeteilt ist; nur für eine Sitzung mit Fm1 bis Fm3. */
function Nurmeine({ namen, an, aufAendern }: { readonly namen: readonly string[]; readonly an: boolean; readonly aufAendern: (an: boolean) => void }): React.JSX.Element | null {
  if (namen.length === 0) return null;
  return (
    <label className="kaestchen" title="Nur die Nachrichten, die der LdF Ihnen zugeteilt hat. Die übrigen bleiben erreichbar.">
      <input type="checkbox" checked={an} onChange={(e) => aufAendern(e.target.checked)} />
      nur meine ({namen.join(", ")})
    </label>
  );
}

type Zeileneigenschaften = Pick<WarteschlangenEigenschaften, "jetzt" | "nurLesen" | "aufWahl" | "aufSchritt" | "aufWeitergabe"> & {
  readonly zeile: Nachrichtenzeile;
  readonly gewaehlt: boolean;
  readonly stellen: readonly string[];
  readonly mitZuteilung: boolean;
};

/** Der Satz über der Schlange, solange kein LdF besetzt ist (Review Runde 2). */
export const TEXT_OHNE_LDF = "Kein LdF besetzt: Die Fernmelder befördern selbst; was sie befördern, gilt als zugeteilt.";

/**
 * Eine Zeile der Schlange. Review 2026-11-21: Die eigene Zuteilung steht als
 * Marke „für Sie“ in der ersten Spalte und die Zeile mit Randleiste und
 * fettem Betreff (`tr.zugeteilt`) — nicht nur als Farbe weit rechts.
 */
function Schlangenzeile({ zeile, jetzt, gewaehlt, nurLesen, stellen, aufWahl, aufSchritt, aufWeitergabe, mitZuteilung }: Zeileneigenschaften): React.JSX.Element {
  const meins = mirZugeteilt(zeile, stellen);
  return (
    <tr className={[zeile.fmzUeberSchwelle ? "ueberschwelle" : "", gewaehlt ? "gewaehlt" : "", meins ? "zugeteilt" : ""].filter((k) => k !== "").join(" ")} aria-selected={gewaehlt} onClick={() => aufWahl(zeile.id)}>
      <td>
        {meins && <span className="marke-zustand fuer-sie">für Sie</span>}
        {vorrangwort(zeile) === "" ? "" : <span className={zeile.vorrangstufe === 0 ? "marke-zustand fehler vorrang-blitz" : "marke-zustand warn"}>{vorrangwort(zeile)}</span>}
      </td>
      <td className="zahl">{zeile.nummer ?? "—"}</td>
      <td>{zeile.absender}</td>
      <td>{zeile.anschrift}</td>
      <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
      <td className="mono">{dtg(zeile.abfassungszeit)}</td>
      <td className={zeile.fmzUeberSchwelle ? "zahl wartezelle marke-zustand warn" : "zahl wartezelle"}>{wartezeit(zeile) === undefined ? "—" : `${String(wartezeit(zeile))} min`}</td>
      {mitZuteilung && (
        <td>
          {vorschlagText(zeile) ?? <span className="leise">noch nicht zugeteilt</span>}
          <Abweichungsmarke zeile={zeile} />
        </td>
      )}
      <td>
        <Annahmezelle zeile={zeile} jetzt={jetzt} />
        <Wegmarke zeile={zeile} />
      </td>
      <td>
        <Knoepfe zeile={zeile} nurLesen={nurLesen} aufSchritt={aufSchritt} aufWeitergabe={aufWeitergabe} ldf={stellen.includes("LDF") && !hatFernmelderstelle(stellen)} />
      </td>
    </tr>
  );
}

/** Die linke Karte: die Ausgangswarteschlange mit den Knöpfen je Zeile. */
export function Warteschlange({ zeilen: alle, jetzt, gewaehltId, nurLesen, aufWahl, aufSchritt, schwelleMinuten = 20, stellen = [], aufWeitergabe, ldfBesetzt = true }: WarteschlangenEigenschaften): React.JSX.Element {
  const [nurMeine, setzeNurMeine] = useState(false);
  const namen = eigeneFernmelder(stellen);
  const geordnet = eigeneZuerst(alle, stellen);
  const zeilen = nurMeine && namen.length > 0 ? nurZugeteilte(geordnet, stellen) : geordnet;
  // Die Spalte „Zugeteilt“ bleibt, solange ein LdF besetzt ist oder eine Zeile schon eine Zuteilung trägt.
  const mitZuteilung = ldfBesetzt || alle.some((z) => z.vorschlag !== undefined);
  return (
    <section className="karte fmzkarte" aria-label="Ausgangswarteschlange">
      <h3>
        Ausgangswarteschlange <span className="nebenwert">Schwelle {schwelleMinuten} min</span>
      </h3>
      {!ldfBesetzt && <p className="hinweistext">{TEXT_OHNE_LDF}</p>}
      <Nurmeine namen={namen} an={nurMeine} aufAendern={setzeNurMeine} />
      {nurMeine && namen.length > 0 && <p className="hinweistext">{ausgeblendetText(alle, stellen)}</p>}
      {zeilen.length === 0 ? (
        <p className="hinweistext">{nurMeine && alle.length > 0 ? "Ihnen ist keine Nachricht zugeteilt." : "Keine Nachricht vor der FmZ."}</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Nachrichten vor der FmZ">
          <thead>
            <tr>
              {/* Review Runde 2: dieselben Breitenregeln wie die Sicht LdF. */}
              <th scope="col" className="schmalspalte">Vorrang</th>
              <th scope="col" className="schmalspalte">Nr.</th>
              <th scope="col">Absender</th>
              <th scope="col">Anschrift</th>
              <th scope="col">Betreff</th>
              <th scope="col">Abfassungszeit</th>
              <th scope="col" className="schmalspalte">Wartet</th>
              {mitZuteilung && <th scope="col">Zugeteilt (LdF)</th>}
              <th scope="col">Annahme</th>
              <th scope="col" className="knopfspalte">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <Schlangenzeile key={zeile.id} zeile={zeile} jetzt={jetzt} gewaehlt={zeile.id === gewaehltId} nurLesen={nurLesen} stellen={stellen} aufWahl={aufWahl} aufSchritt={aufSchritt} aufWeitergabe={aufWeitergabe} mitZuteilung={mitZuteilung} />
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
  // Review 2026-11-21: dieselbe Regel wie Ring 2 — der beförderte Ausgang beim LdF gehört nicht hierher.
  return projektion.ohneNummerZeilen(zeilen);
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
