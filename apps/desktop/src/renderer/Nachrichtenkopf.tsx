/**
 * Der Kopf des Blatts „Nachrichten“ (KONZEPT-NACHRICHTEN.md §6): Band mit
 * den Zahlen, Werkzeugzeile mit dem Umschalter der Sichten und die Chips des
 * Posteingangs — herausgelöst aus `Nachrichten.tsx`, damit jene Datei unter
 * der Strukturgrenze bleibt (AGENTS.md §6). Verhalten wie vorher; neu nach der
 * zweiten Audit-Runde (2026-11-17):
 *
 * - **Sicht „Offen“** (R2-SGL P1-1, R2-FaBe P1-6): nach dem Posteingang im
 *   Umschalter und als Chip „offen“ mit der Zahl `zaehlung.OFFEN` aus Ring 2
 *   (`offenFuerStellen`): eigene Kopien ohne „erledigt“, eigene Ausgänge vor
 *   der Beförderung und die Warteschlangen der eigenen Station. Das
 *   Übungsdrehbuch (Minute 100) setzt sie für die Übergabe voraus.
 * - **FmZ nicht besetzt** (R2-FaBe P0-3): ein bernsteinfarbener Satz im Band,
 *   solange kein Arbeitsplatz mit der Stelle FMZ in der Präsenz steht. Wer
 *   eine Nachricht aufgibt, erfuhr sonst nicht, dass sie liegen bleibt.
 * - **Strg+N** in der Sicht Fernmeldezentrale öffnet „Eingang aufnehmen“
 *   (R2-FM P2-1, P1-1): „Neuen Eintrag anlegen — je nach gewählter Ansicht“,
 *   wie die Tastenkarte es beschreibt. Der Knopf „Nachricht verfassen“ nennt
 *   das Kürzel dort deshalb nicht.
 */

import { FERNMELDERSTELLEN, hatFernmelderstelle, istFernmelderstelle } from "@s1/domaene";
import type { Lagebild, Nachrichtenlage, Ruf, Sitzungsstellen } from "../kontrakt/index.js";
import { fernmelderBesetzt } from "../kontrakt/ldfschritte.js";
import { Filterchips } from "./Filterchips.js";
import { TEXT_NUR_LESEN } from "./Maske.js";
import { stellenname } from "./nachrichtenformate.js";
import { kuerzel, kuerzelText } from "./tastatur.js";

export type Nachrichtensicht = "posteingang" | "offen" | "ausgang" | "sichter" | "fmz" | "nachweisung" | "ldf";
export type Posteingangsstand = NonNullable<Extract<Ruf, { art: "nachrichtenAnfordern" }>["zustaende"]>[number];

/** Die Sichten des Umschalters (§6); „Offen“ für die Übergabe gleich nach dem Posteingang (R2-SGL P1-1). */
export const NACHRICHTENSICHTEN: readonly { readonly schluessel: Nachrichtensicht; readonly titel: string; readonly erklaerung?: string }[] = [
  { schluessel: "posteingang", titel: "Posteingang" },
  { schluessel: "offen", titel: "Offen", erklaerung: "Was für meine Stellen noch zu tun ist – für die Übergabe an die Ablösung" },
  { schluessel: "ausgang", titel: "Ausgang" },
  { schluessel: "sichter", titel: "Sichter" },
  { schluessel: "fmz", titel: "Fernmeldezentrale" },
  { schluessel: "nachweisung", titel: "Nachweisung" },
  // Nur sichtbar mit LdF als Station oder in der Sitzung des LdF (`ldfSichtbar`).
  { schluessel: "ldf", titel: "LdF" },
];

/**
 * Die erste Sicht nach der Stelle (§6): FmZ sieht die Fernmeldezentrale,
 * Sichter den Sichter, alle anderen den Posteingang. Der LdF sieht seine
 * eigene Sicht zuerst — auch vor der FmZ, deren Arbeit er leitet.
 */
export function ersteSicht(stellen: readonly string[]): Nachrichtensicht {
  if (stellen.includes("LDF")) return "ldf";
  if (hatFernmelderstelle(stellen)) return "fmz";
  return stellen.includes("SICHTER") && stellen.every((s) => s === "SICHTER" || istFernmelderstelle(s)) ? "sichter" : "posteingang";
}

function Kachel({ wert, titel, warn = false }: { readonly wert: number | undefined; readonly titel: string; readonly warn?: boolean }): React.JSX.Element {
  return (
    <div className={warn ? "kpi warn" : "kpi"}>
      <dd>{wert ?? "—"}</dd>
      <dt>{titel}</dt>
    </div>
  );
}

/** Die fünf Zahlen des Bandes (§6); „mit Vorrang offen" und „über der Schwelle" bernstein ab eins. */
export function Nachrichtenband({ lage, ldfBesetzt = true }: { readonly lage: Nachrichtenlage | undefined; readonly ldfBesetzt?: boolean }): React.JSX.Element {
  return (
    <dl className="kpiband nachrichtenband" aria-label="Zahlen der Nachrichten">
      <Kachel wert={lage?.neuFuerStellen} titel="neu für meine Stellen" />
      <Kachel wert={lage?.vorFmz} titel="vor der FmZ" />
      <Kachel wert={lage?.vorSichter} titel="vor dem Sichter" />
      {/* R2-LdF P3-3: Ist kein LdF besetzt, befördert die FmZ selbst — die Kachel sagt es. */}
      {lage?.vorLdf !== undefined && <Kachel wert={lage.vorLdf} titel={ldfBesetzt ? "vor dem LdF" : "vor dem LdF (nicht besetzt)"} />}
      <Kachel wert={lage?.mitVorrangOffen} titel="mit Vorrang offen" warn={(lage?.mitVorrangOffen ?? 0) > 0} />
      <Kachel wert={lage?.ueberSchwelle} titel="über der Schwelle" warn={(lage?.ueberSchwelle ?? 0) > 0} />
    </dl>
  );
}

/** Der Satz im Band, solange keine FmZ besetzt ist (R2-FaBe P0-3). */
export const TEXT_FMZ_NICHT_BESETZT = "Kein Fernmelder besetzt (Fm1 bis Fm3): Aufgegebene Nachrichten bleiben liegen, bis jemand die Fernmeldezentrale übernimmt – bitte Bescheid geben oder anrufen.";

/**
 * Ob eine FmZ besetzt ist: aus `Lagebild.besetzteStellen` (Präsenz im
 * Worker); liefert ein älterer Worker es nicht, gilt dieselbe Regel aus
 * Sitzung und Präsenz wie beim LdF (`fernmelderBesetzt`).
 */
export function fmzBesetzt(lagebild: Lagebild | undefined): boolean {
  const geliefert = lagebild?.besetzteStellen;
  if (Array.isArray(geliefert)) return hatFernmelderstelle(geliefert);
  return fernmelderBesetzt(lagebild?.sitzung?.stellen, lagebild?.peers ?? []);
}

/** Bernstein im Band, solange keine FmZ in der Präsenz steht (R2-FaBe P0-3); sonst nichts. */
export function Besetzungshinweis({ lagebild }: { readonly lagebild: Lagebild | undefined }): React.JSX.Element | null {
  if (lagebild === undefined || fmzBesetzt(lagebild)) return null;
  return (
    <p className="warnung besetzungshinweis" role="status">
      {TEXT_FMZ_NICHT_BESETZT}
    </p>
  );
}

interface WerkzeugEigenschaften {
  readonly sicht: Nachrichtensicht;
  readonly aufSicht: (sicht: Nachrichtensicht) => void;
  readonly suche: string;
  readonly aufSuche: (suche: string) => void;
  readonly nurLesen: boolean;
  readonly aufVerfassen: () => void;
  /** Additiv (N2): rechts neben der Suche, etwa „Nachweisung ausgeben". */
  readonly rechts?: React.ReactNode;
  /** Additiv: die Sicht „LdF" im Umschalter zeigen. */
  readonly mitLdf?: boolean;
}

export function Werkzeugzeile({ sicht, aufSicht, suche, aufSuche, nurLesen, aufVerfassen, rechts, mitLdf = false }: WerkzeugEigenschaften): React.JSX.Element {
  // In der Sicht Fernmeldezentrale gehört Strg+N der Aufnahme (R2-FM P2-1).
  const mitKuerzel = sicht !== "fmz" ? ` (${kuerzelText(kuerzel("anlegen") as never)})` : "";
  return (
    <div className="werkzeugzeile">
      <div className="umschalter" role="group" aria-label="Sicht">
        {NACHRICHTENSICHTEN.filter((eintrag) => mitLdf || eintrag.schluessel !== "ldf").map((eintrag) => (
          <button key={eintrag.schluessel} type="button" aria-pressed={sicht === eintrag.schluessel} title={eintrag.erklaerung} onClick={() => aufSicht(eintrag.schluessel)}>
            {eintrag.titel}
          </button>
        ))}
      </div>
      <button type="button" className="haupt" disabled={nurLesen} title={nurLesen ? TEXT_NUR_LESEN : `Den Vordruck ausfüllen und aufgeben${mitKuerzel}`} onClick={aufVerfassen}>
        Nachricht verfassen
      </button>
      <span className="werkzeugrechts">
        <input
          id="nachrichtensuche"
          type="search"
          aria-label="Suche über Betreff, Inhalt, Absender und Anschrift"
          placeholder={`Suchen … ${kuerzelText(kuerzel("suchen") as never)}`}
          value={suche}
          onChange={(e) => aufSuche(e.target.value)}
        />
        {rechts}
      </span>
    </div>
  );
}

/** Der Chip der Sicht „Offen“ — kein Zustandsfilter, sondern der Sprung in die Sicht (R2-SGL P1-1). */
export const CHIP_OFFEN = "OFFEN";

const CHIPS = [
  { wert: "NEU", titel: "neu", ton: "warn" },
  { wert: "GELESEN", titel: "gelesen", ton: "" },
  { wert: "ERLEDIGT", titel: "erledigt", ton: "ok" },
  { wert: CHIP_OFFEN, titel: "offen", ton: "warn" },
] as const;

/** Die Zählung der Ansicht; `OFFEN` ist additiv (Ring 2, SGL P1-7). */
export type Zaehlung = Readonly<Record<Posteingangsstand, number>> & { readonly OFFEN?: number };

export interface PostfilterEigenschaften {
  readonly lage: Nachrichtenlage | undefined;
  /** Additiv (N2): die Zahlen je Zustand aus der Ansicht, für die gezeigten Stellen. */
  readonly zaehlung: Zaehlung | undefined;
  readonly wahl: readonly Posteingangsstand[];
  readonly aufWahl: (wahl: readonly Posteingangsstand[]) => void;
  readonly sitzung: Sitzungsstellen | undefined;
  readonly fuer: string;
  readonly aufFuer: (fuer: string) => void;
  /** Additiv (R2-SGL P1-1): die Sicht „Offen“ ist gewählt, und der Chip schaltet sie. */
  readonly offen?: boolean;
  readonly aufOffen?: (offen: boolean) => void;
}

function chipzahl(wert: string, zaehlung: Zaehlung | undefined, lage: Nachrichtenlage | undefined, fuer: string): number | undefined {
  if (wert === CHIP_OFFEN) return zaehlung?.OFFEN;
  if (zaehlung !== undefined) return zaehlung[wert as Posteingangsstand];
  return wert === "NEU" && fuer === "" ? lage?.neuFuerStellen : undefined;
}

/** Die Chips des Posteingangs und die Wahl, wessen Posteingang gezeigt wird. */
export function Postfilter({ lage, zaehlung, wahl, aufWahl, sitzung, fuer, aufFuer, offen = false, aufOffen }: PostfilterEigenschaften): React.JSX.Element {
  const eigene = sitzung?.stellen ?? [];
  // Mit der Zählung aus der Ansicht trägt jeder Chip seine Zahl; ohne (älterer Dienst) nur „neu" aus dem Band.
  const chips = CHIPS.filter((c) => c.wert !== CHIP_OFFEN || aufOffen !== undefined).map((c) => ({ ...c, anzahl: chipzahl(c.wert, zaehlung, lage, fuer) }));
  const andere = ["LEITER", "S1", "S2", "S3", "S4", "S6", "FACHBERATER", "VERBINDUNGSSTELLE", "SICHTER", "LDF", ...FERNMELDERSTELLEN].filter((s) => !eigene.includes(s));
  return (
    <Filterchips
      beschriftung="Filter nach Zustand"
      chips={chips}
      wahl={offen ? [CHIP_OFFEN] : wahl}
      aufWahl={(neu) => {
        // Der Chip „offen“ ist die Sicht „Offen“; die übrigen filtern den Posteingang.
        const mitOffen = neu.includes(CHIP_OFFEN);
        if (mitOffen !== offen) aufOffen?.(mitOffen);
        aufWahl(neu.filter((w) => w !== CHIP_OFFEN) as readonly Posteingangsstand[]);
      }}
      dazu={
        <label className="filterschalter">
          Posteingang von
          <select value={fuer} onChange={(e) => aufFuer(e.target.value)}>
            <option value="">{eigene.length === 0 ? "— keine Stelle gewählt —" : `meinen Stellen (${eigene.map(stellenname).join(", ")})`}</option>
            {andere.map((s) => (
              <option key={s} value={s}>
                {stellenname(s)}
              </option>
            ))}
          </select>
        </label>
      }
    />
  );
}
