/**
 * Der Stau vor dem Sichter, gesehen von der Fernmeldezentrale (Audit Sichter
 * P1-4, ETB P3-3; „Was offen bleibt“ in docs/audits/nachrichten/README.md).
 *
 * Der Ersatzsichter schaltet erst, wenn die Präsenz des Sichters verfällt —
 * rund zwei Minuten. Bis dahin lag ein Blitz im Eingang, und die FmZ, die ihn
 * aufgenommen hatte, sah den Stau nicht. Zwei Dinge in der Sicht der FmZ:
 *
 * - **Die Hinweiszeile** „n Eingänge warten vor dem Sichter“ im Kopf, aus
 *   `vorSichterUeberSchwelle` der Nachrichtenlage. Das Feld liefert der
 *   Domänen- und Kontraktschnitt (anderer Arbeitsstrang); bis dahin wird es
 *   optional gelesen, und die Zeile fehlt.
 * - **„Ich sichte jetzt selbst“** an jedem Eingang vor dem Sichter, dessen
 *   `wartetSeitSichter` (Minuten vor dem Sichter, ebenfalls optional
 *   gelesen) die Schwelle der FmZ erreicht — dieselbe Schwelle, mit der
 *   Ring 2 `vorSichterUeberSchwelle` zählt —, oder an jedem, wenn kein
 *   Sichter besetzt ist. Der Knopf öffnet den
 *   Laufzettel wie beim Ersatzsichter, der Verteiler aus der Anschrift
 *   vorbelegt (S2 rot, Anschrift grün).
 *
 * Zweite Runde (R2-LdF P1-1, R2-Si P2-4): Die Karte stand in der schmalen
 * rechten Spalte der FmZ-Sicht und lief bei 1320 Pixeln über den Rand
 * (`scrollWidth` 1357). Sie spannt jetzt die volle Breite (`breit`), die
 * Tabelle hat Spaltenköpfe und `table-layout: fixed`, die Knopfspalte eine
 * feste Breite; Blitz steht oben (R2-FM P2-4).
 *
 * Nachzug (R2-FM P2-5, R2-Si P2-2, R2-FM P3-3): Der häufigere Fall ist der
 * besetzte, aber säumige Sichter (Funkgerät, Telefon, Tür). Die Karte
 * erscheint jetzt auch dann, sobald ein Eingang die Schwelle seiner
 * Vorrangstufe überschreitet: Ring 2 sagt es mit `sichterSchwelleUeberschritten`
 * (optional gelesen); bis dahin gilt hier Blitz ab 5, Sofort ab 10 Minuten,
 * sonst die Schwelle des Einsatzes — jeweils höchstens die Einsatzschwelle.
 * Der Satz nennt den Sichter und die längste Wartezeit. Die Minuten rechnet
 * die Karte aus `vorSichterSeit` gegen die Uhr der Ansicht, nicht aus der
 * beim Abruf eingefrorenen Zahl („seit 0 min“ im ersten Takt).
 */

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Nachrichtenlage, Peer } from "../kontrakt/index.js";
import { minutenSeit } from "./fmzformate.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { dtg, vorrangwort } from "./nachrichtenformate.js";

/** Die Minuten, die ein Eingang über der Schwelle vor dem Sichter wartet; optional gelesen (anderer Strang). */
export function wartetSeitSichter(zeile: Nachrichtenzeile): number | undefined {
  const wert = (zeile as { readonly wartetSeitSichter?: unknown }).wartetSeitSichter;
  return typeof wert === "number" && Number.isFinite(wert) ? wert : undefined;
}

/** Die Zahl der Eingänge über der Schwelle vor dem Sichter; optional gelesen (anderer Strang). */
export function vorSichterUeberSchwelle(lage: Nachrichtenlage | undefined): number | undefined {
  const wert = (lage as { readonly vorSichterUeberSchwelle?: unknown } | undefined)?.vorSichterUeberSchwelle;
  return typeof wert === "number" && Number.isFinite(wert) ? wert : undefined;
}

/**
 * Die Eingänge vor dem Sichter — Darstellung aus der Nachweisung, keine Regel (die steht in Ring 2).
 * Additiv (R2-FM P2-4, R2-Si P3-7): Blitz vor Sofort vor Einfach wie jede Liste (§5); innerhalb der
 * Stufe bleibt die Folge der Nachweisung (stabile Sortierung).
 */
export function vorSichterZeilen(zeilen: readonly Nachrichtenzeile[]): readonly Nachrichtenzeile[] {
  return zeilen.filter((z) => z.laufzustand === "VOR_SICHTER" && !z.zurueckgezogen).sort((a, b) => a.vorrangstufe - b.vorrangstufe);
}

/**
 * Die Schwellen vor dem Sichter: die des Einsatzes und je Vorrang, sofern die
 * Stammdaten sie führen (`sichterSchwelleBlitzMinuten`, `…SofortMinuten`).
 */
export interface Sichterschwellen {
  readonly einsatz: number;
  readonly blitz?: number | undefined;
  readonly sofort?: number | undefined;
}

/** Die Schwelle der Vorrangstufe vor dem Sichter (R2-Si P2-2): Blitz 5, Sofort 10 Minuten (oder aus den Stammdaten), höchstens die Einsatzschwelle. */
export function sichterschwelle(vorrangstufe: number, schwellen: number | Sichterschwellen): number {
  const s = typeof schwellen === "number" ? { einsatz: schwellen } : schwellen;
  if (vorrangstufe === 0) return Math.min(s.blitz ?? 5, s.einsatz);
  if (vorrangstufe === 1) return Math.min(s.sofort ?? 10, s.einsatz);
  return s.einsatz;
}

/** Die Minuten vor dem Sichter: aus `vorSichterSeit` gegen die Uhr der Ansicht, sonst die gelieferte Zahl (R2-FM P3-3). */
export function wartetMinuten(zeile: Nachrichtenzeile, jetzt: string | undefined): number | undefined {
  const seit = jetzt === undefined ? undefined : minutenSeit(zeile.vorSichterSeit, jetzt);
  return seit ?? wartetSeitSichter(zeile);
}

/**
 * Ob die FmZ diesen Eingang selbst sichten darf: kein Sichter besetzt, oder
 * er wartet über der Schwelle seiner Stufe — so sagt es Ring 2
 * (`sichterSchwelleUeberschritten`), sonst die Regel {@link sichterschwelle}.
 */
export function selbstSichtbar(zeile: Nachrichtenzeile, sichterDa: boolean, schwelleMinuten: number | Sichterschwellen, jetzt?: string): boolean {
  if (!sichterDa) return true;
  const geliefert = (zeile as { readonly sichterSchwelleUeberschritten?: unknown }).sichterSchwelleUeberschritten;
  if (typeof geliefert === "boolean") return geliefert;
  const seit = wartetMinuten(zeile, jetzt);
  return seit !== undefined && seit >= sichterschwelle(zeile.vorrangstufe, schwelleMinuten);
}

/** „Si (Hz. Si)“ — der besetzte Sichter aus der Präsenz, sonst `undefined`. */
export function sichtername(peers: readonly Peer[]): string | undefined {
  const p = peers.find((x) => !x.veraltet && x.stellen?.includes("SICHTER") === true);
  if (p === undefined) return undefined;
  return p.handzeichen === undefined || p.handzeichen === "" ? p.anzeigename : `${p.anzeigename} (Hz. ${p.handzeichen})`;
}

/** Der Satz über der Karte bei besetztem, säumigem Sichter: wer, wie lange (R2-FM P2-5). */
export function saeumigText(sichter: string | undefined, anzahl: number, laengste: number | undefined): string {
  const wer = sichter === undefined ? "Der Sichter ist besetzt" : `Der Sichter ${sichter} ist besetzt`;
  const wie = anzahl === 1 ? "1 Nachricht wartet über der Schwelle" : `${String(anzahl)} Nachrichten warten über der Schwelle`;
  const seit = laengste === undefined ? "" : `, der älteste seit ${String(laengste)} min`;
  return `${wer}, reagiert aber nicht: ${wie}${seit}. Wer aufgenommen hat, kann selbst sichten (Blitz ab 5, Sofort ab 10 min).`;
}

/** „2 Eingänge warten vor dem Sichter“ — oder nichts, solange keiner über der Schwelle liegt. */
export function sichterstauText(anzahl: number | undefined): string | undefined {
  if (anzahl === undefined || anzahl <= 0) return undefined;
  return anzahl === 1 ? "1 Nachricht wartet vor dem Sichter" : `${String(anzahl)} Nachrichten warten vor dem Sichter`;
}

/** Die Hinweiszeile im Kopf der FmZ-Sicht. */
export function Sichterhinweis({ lage }: { readonly lage: Nachrichtenlage | undefined }): React.JSX.Element | null {
  const text = sichterstauText(vorSichterUeberSchwelle(lage));
  if (text === undefined) return null;
  return (
    <p className="warnung sichterhinweis" role="status">
      {text} — wer aufgenommen oder weitergegeben hat, kann selbst sichten.
    </p>
  );
}

export interface SichterstaukarteEigenschaften {
  readonly zeilen: readonly Nachrichtenzeile[];
  readonly sichterDa: boolean;
  /** Die Schwelle der FmZ in Minuten (`fmzSchwelleMinuten`), additiv mit den Schwellen je Vorrang. */
  readonly schwelleMinuten: number | Sichterschwellen;
  readonly nurLesen: boolean;
  readonly aufSelbst: (zeile: Nachrichtenzeile) => void;
  /** Additiv (R2-FM P2-5): der besetzte Sichter mit Handzeichen, für den Satz über der Karte. */
  readonly sichter?: string | undefined;
  /** Additiv (R2-FM P3-3): die Uhr der Ansicht, gegen die die Wartezeit gerechnet wird. */
  readonly jetzt?: string | undefined;
}

/** Beim Eingang die Aufnahme, beim beförderten Ausgang die Beförderung (Review 2026-11-21). */
function stauvermerk(zeile: Nachrichtenzeile): string {
  const v = zeile.richtung === "AUSGANG" ? zeile.befoerderung : zeile.aufnahme;
  return v === undefined ? "—" : `${zeile.richtung === "AUSGANG" ? "A befördert " : "E "}${dtg(v.zeitpunkt)} ${v.handzeichen}`;
}

/** Die Karte der Nachrichten, die die FmZ selbst sichten darf; leer entfällt sie. */
export function Sichterstaukarte({ zeilen, sichterDa, schwelleMinuten, nurLesen, aufSelbst, sichter, jetzt }: SichterstaukarteEigenschaften): React.JSX.Element | null {
  const faellig = vorSichterZeilen(zeilen).filter((z) => selbstSichtbar(z, sichterDa, schwelleMinuten, jetzt));
  if (faellig.length === 0) return null;
  const minuten = faellig.map((z) => wartetMinuten(z, jetzt)).filter((m): m is number => m !== undefined);
  return (
    <section className="karte fmzkarte breit" aria-label="Vor dem Sichter">
      <h3>Vor dem Sichter</h3>
      <p className={sichterDa ? "warnung" : "hinweistext"}>{sichterDa ? saeumigText(sichter, faellig.length, minuten.length === 0 ? undefined : Math.max(...minuten)) : "Kein Sichter besetzt: Wer aufgenommen oder weitergegeben hat, verteilt selbst."}</p>
      <table className="nachrichtentabelle" aria-label="Nachrichten vor dem Sichter">
        <thead>
          <tr>
            <th scope="col" className="schmalspalte">Vorrang</th>
            <th scope="col" className="schmalspalte">Nr.</th>
            <th scope="col">Betreff</th>
            <th scope="col">Eingang / Beförderung</th>
            <th scope="col" className="schmalspalte">Wartet</th>
            <th scope="col" className="knopfspalte">
              <span className="nurvorlesen">Schritte</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {faellig.map((zeile) => (
            <tr key={zeile.id}>
              <td>{vorrangwort(zeile)}</td>
              <td className="zahl">{zeile.nummer ?? "—"}</td>
              <th scope="row">{zeile.betreff === "" ? <span className="leise">(ohne Betreff)</span> : zeile.betreff}</th>
              <td className="mono">{stauvermerk(zeile)}</td>
              <td className="zahl wartezelle">{wartetMinuten(zeile, jetzt) === undefined ? "" : `seit ${String(wartetMinuten(zeile, jetzt))} min`}</td>
              <td>
                <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : zeile.richtung === "AUSGANG" ? "Den Laufzettel öffnen und selbst verteilen (S2 rot und der Verfasser grün vorbelegt)" : "Den Laufzettel öffnen und selbst verteilen (Verteiler aus der Anschrift vorbelegt)"} onClick={() => aufSelbst(zeile)}>
                  Ich sichte jetzt selbst
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
