/**
 * Die Sicht „LdF" im Blatt Nachrichten (bestätigt am 2026-11-17,
 * KONZEPT-NACHRICHTEN.md §5, §6) — zwei Karten für den Leiter des
 * Fernmeldebetriebes.
 *
 * Zweite Karte (2026-11-21): Eingänge **und beförderte Ausgänge** vor der
 * Weitergabe. Der LdF trägt die Nummer der Nachweisung ein, wenn sie fehlt,
 * und gibt an den Sichter, der beim Ausgang S2 rot und den Verfasser grün
 * verteilt.
 *
 * Links die Ausgänge vor der Zuteilung: aufgegeben, ohne Übermittlungs-
 * vorschlag — seit 2026-11-21 schon vor der Annahme, denn der LdF sichtet
 * jeden Ausgang zuerst; „Fernmelder zuteilen" öffnet die Maske der FmZ mit
 * Fernmelder (Fm1 bis Fm3), Mittel, Gegenstelle, Zeit und Handzeichen
 * (`NachrichtUebermittlungVorgeschlagen`). Rechts die Eingänge vor der Weitergabe: aufgenommen und
 * nachgewiesen, der LdF prüft beides und gibt mit „An den Sichter
 * weitergeben" weiter. Beide Listen kommen aus einem Ruf (Laufzustand
 * VOR_LDF, Ordnung von Ring 2); hier wird nur nach Richtung getrennt.
 *
 * Ob die Sicht im Umschalter steht, entscheidet {@link ldfSichtbar}: nur,
 * wenn der Einsatz den LdF als Station führt oder die Sitzung die Stelle LDF hat.
 *
 * Zweite Runde (R2-LdF P1-1, R2-Si P2-4): Bei 1320 Pixeln lag die rechte
 * Karte über dem Rand, der Knopf „An den Sichter weitergeben“ begann bei
 * x = 1375. Die beiden Karten stehen jetzt untereinander in voller Breite
 * (`fmzkarten untereinander`), die Tabellen haben `table-layout: fixed`,
 * Textzellen brechen um, und die Knopfspalte hat eine feste Breite.
 *
 * Nachzug (R2-LdF P2-4): Die Ausgangskarte führt Nummer, Absender und die
 * Wartezeit beim LdF (`wartetSeitLdf`, Ring 2); über der Schwelle steht die
 * Zeile bernstein mit der Marke „über der Schwelle“ — vorher zählte das Band
 * „über der Schwelle 1“, und die Zeile war unmarkiert. Die Eingangskarte
 * zeigt die Wartezeit und die Gegenstelle. Wer am Stau schuld ist, FmZ oder
 * LdF, ist damit ablesbar.
 */

import { useState } from "react";

import { projektion, type Nachrichtenzeile } from "@s1/domaene";

import { STELLE_LDF } from "../kontrakt/ldfschritte.js";
import { Weitergabemaske } from "./Ldfmaske.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";

/** Die Sicht gibt es, wenn der Einsatz den LdF als Station führt oder diese Sitzung LdF ist. */
export function ldfSichtbar(ldfStation: boolean | undefined, stellen: readonly string[]): boolean {
  return ldfStation === true || stellen.includes(STELLE_LDF);
}

function Vorrang({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element | null {
  const wort = vorrangwort(zeile);
  if (wort === "") return null;
  return <span className={zeile.vorrangstufe === 0 ? "marke-zustand fehler vorrang-blitz" : "marke-zustand warn"}>{wort}</span>;
}

function vermerk(v: { readonly zeitpunkt: string; readonly handzeichen: string } | undefined): string {
  return v === undefined ? "—" : `${dtg(v.zeitpunkt)} ${v.handzeichen}`;
}

/** Die Vorbelegung der Schwelle, wenn das Blatt keine nennt (wie `FMZ_SCHWELLE_VORBELEGUNG`). */
const SCHWELLE_VORGABE = 20;

/** Ob die Zeile beim LdF über der Schwelle liegt: `wartetSeitLdf` gegen die Schwelle des Einsatzes (R2-LdF P2-4). */
export function ldfUeberSchwelle(zeile: Nachrichtenzeile, schwelleMinuten: number): boolean {
  return zeile.wartetSeitLdf !== undefined && zeile.wartetSeitLdf >= schwelleMinuten;
}

/** „12 min“ und die Marke „über der Schwelle“ — die Zelle „Wartet“ (R2-LdF P2-4). */
function Wartezelle({ zeile, schwelleMinuten }: { readonly zeile: Nachrichtenzeile; readonly schwelleMinuten: number }): React.JSX.Element {
  if (zeile.wartetSeitLdf === undefined) return <td className="zahl">—</td>;
  const ueber = ldfUeberSchwelle(zeile, schwelleMinuten);
  return (
    <td className="zahl wartezelle">
      {zeile.wartetSeitLdf} min
      {ueber && <span className="marke-zustand warn"> über der Schwelle</span>}
    </td>
  );
}

interface KartenEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly nurLesen: boolean;
  readonly aufSchritt: (zeile: Nachrichtenzeile) => void;
  readonly schwelleMinuten: number;
}

function Ausgangskarte({ zeilen, nurLesen, aufSchritt, schwelleMinuten }: KartenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Ausgänge vor der Zuteilung">
      <h3>Ausgänge vor der Zuteilung</h3>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Kein Ausgang wartet auf die Zuteilung an einen Fernmelder.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Ausgänge vor der Zuteilung an einen Fernmelder">
          <thead>
            <tr>
              <th scope="col" className="schmalspalte">Vorrang</th>
              <th scope="col" className="schmalspalte">Nr.</th>
              <th scope="col">Absender</th>
              <th scope="col">Anschrift</th>
              <th scope="col">Betreff</th>
              <th scope="col">Wunsch</th>
              <th scope="col">Annahme</th>
              <th scope="col" className="schmalspalte">Wartet</th>
              <th scope="col" className="knopfspalte">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.id} className={ldfUeberSchwelle(zeile, schwelleMinuten) ? "ueberschwelle" : undefined}>
                <td>
                  <Vorrang zeile={zeile} />
                </td>
                <td className="zahl">{zeile.nummer ?? "—"}</td>
                <td>{zeile.absender}</td>
                <td>{zeile.anschrift}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td>{zeile.uebermittlungswunsch === undefined ? "—" : projektion.mittelWort(zeile.uebermittlungswunsch)}</td>
                <td className="mono">{vermerk(zeile.annahme)}</td>
                <Wartezelle zeile={zeile} schwelleMinuten={schwelleMinuten} />
                <td>
                  <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Einem Fernmelder (Fm1 bis Fm3) zuteilen, Mittel und Gegenstelle bestimmen"} onClick={() => aufSchritt(zeile)}>
                    Fernmelder zuteilen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Beim Eingang der Aufnahmevermerk („von …“), beim beförderten Ausgang der Beförderungsvermerk („an …“). */
function Wegvermerk({ zeile }: { readonly zeile: Nachrichtenzeile }): React.JSX.Element {
  const ausgang = zeile.richtung === "AUSGANG";
  const v = ausgang ? zeile.befoerderung : zeile.aufnahme;
  return (
    <>
      <span className="nebenwert">{ausgang ? "A " : "E "}</span>
      {v === undefined ? "—" : `${projektion.mittelWort(v.mittel)} ${vermerk(v)}`}
      {zeile.gegenstelle !== undefined && <span className="nebenwert"> {ausgang ? "an" : "von"} {zeile.gegenstelle}</span>}
    </>
  );
}

function Eingangskarte({ zeilen, nurLesen, aufSchritt, schwelleMinuten }: KartenEigenschaften): React.JSX.Element {
  return (
    <section className="karte fmzkarte" aria-label="Vor der Weitergabe">
      <h3>Vor der Weitergabe an den Sichter</h3>
      <p className="hinweistext">Aufgenommene Eingänge und beförderte Ausgänge: Nachweisung prüfen oder eintragen, dann an den Sichter.</p>
      {zeilen.length === 0 ? (
        <p className="hinweistext">Keine Nachricht wartet auf die Weitergabe an den Sichter.</p>
      ) : (
        <table className="nachrichtentabelle" aria-label="Nachrichten vor der Weitergabe an den Sichter">
          <thead>
            <tr>
              <th scope="col" className="schmalspalte">Vorrang</th>
              <th scope="col" className="schmalspalte">Nr.</th>
              <th scope="col">Absender</th>
              <th scope="col">Betreff</th>
              <th scope="col">Aufnahme / Beförderung</th>
              <th scope="col" className="schmalspalte">Wartet</th>
              <th scope="col" className="knopfspalte">
                <span className="nurvorlesen">Schritte</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((zeile) => (
              <tr key={zeile.id} className={ldfUeberSchwelle(zeile, schwelleMinuten) ? "ueberschwelle" : undefined}>
                <td>
                  <Vorrang zeile={zeile} />
                </td>
                <td className="zahl">{zeile.nummer ?? "—"}</td>
                <td>{zeile.absender}</td>
                <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
                <td className="mono">
                  <Wegvermerk zeile={zeile} />
                </td>
                <Wartezelle zeile={zeile} schwelleMinuten={schwelleMinuten} />
                <td>
                  <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : "Nachweisung geprüft oder eingetragen: an den Sichter"} onClick={() => aufSchritt(zeile)}>
                    {zeile.nummer === undefined ? "Nachweisen und weitergeben" : "An den Sichter weitergeben"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export interface LdfsichtEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly handzeichen: string;
  readonly nurLesen: boolean;
  /** Öffnet die Maske „Fernmelder zuteilen" der FmZ (`useFmzschritte`). */
  readonly aufVorschlag: (zeile: Nachrichtenzeile) => void;
  /** Additiv (R2-LdF P2-4): die Schwelle des Einsatzes für die Marke an der Wartezeit. */
  readonly schwelleMinuten?: number | undefined;
  /** Additiv (2026-11-21): die nächste freie Nummer — Vorbelegung, wenn der LdF beim Weitergeben nachweist. */
  readonly naechsteNummer?: number | undefined;
}

/** Die beiden Karten mit der Weitergabemaske; die Zeile bleibt der Stand beim Öffnen (Vorher-Wert). */
export function Ldfsicht({ zeilen, handzeichen, nurLesen, aufVorschlag, schwelleMinuten = SCHWELLE_VORGABE, naechsteNummer }: LdfsichtEigenschaften): React.JSX.Element {
  const [weiter, setzeWeiter] = useState<Nachrichtenzeile | undefined>(undefined);
  return (
    <>
      <div className="fmzkarten untereinander">
        {/* 2026-11-21: der Ausgang vor der Beförderung zur Zuteilung, danach mit den Eingängen zur Nachweisung und Weitergabe. */}
        <Ausgangskarte zeilen={zeilen.filter((z) => projektion.ldfSchrittDer(z) === "zuteilung")} nurLesen={nurLesen} aufSchritt={aufVorschlag} schwelleMinuten={schwelleMinuten} />
        <Eingangskarte zeilen={zeilen.filter((z) => projektion.ldfSchrittDer(z) === "weitergabe")} nurLesen={nurLesen} aufSchritt={setzeWeiter} schwelleMinuten={schwelleMinuten} />
      </div>
      {weiter !== undefined && <Weitergabemaske key={weiter.id} zeile={weiter} handzeichen={handzeichen} naechsteNummer={naechsteNummer} aufSchliessen={() => setzeWeiter(undefined)} />}
    </>
  );
}
