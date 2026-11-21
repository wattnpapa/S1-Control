/**
 * Der Verteiler des Laufzettels (Feld 19) als Raster wie auf dem Vordruck —
 * herausgelöst aus `Laufzettel.tsx`, weil Laufzettel des Sichters,
 * Ersatzsichter und Gesprächsnotiz ihn teilen (KONZEPT-NACHRICHTEN.md §5).
 *
 * Nach den Audits vom 2026-11-17:
 * - **Raster statt Liste** (Sichter P2-1, Sachgebietsleiter P2-11): Je Stelle
 *   eine Zeile mit den drei Kopiefarben als Kästchen, die Stellen in zwei
 *   Spalten. Ein Klick setzt Stelle und Farbe zugleich; der Laufzettel passt
 *   damit bei 860 Pixel Höhe ohne Scrollen.
 * - **Nicht jeder alles** (Sichter P1-3): Eine weitere Stelle ist zuerst blau
 *   (Mitleser), nicht grün; ohne grünen Hauptempfänger warnt der Laufzettel
 *   („Kein Hauptempfänger“), sperrt aber nicht.
 * - **Anschrift in den Verteiler** (Sachgebietsleiter P1-3, Fernmelder P1-4):
 *   Die Stellen der Anschrift — bekannte Stellen oder Freitext — sind als
 *   grüne Hauptempfänger vorbelegt, S2 bleibt rot. Der Name der eigenen
 *   Führungsstelle (Anschrift eines Eingangs von außen) ist kein Empfänger.
 * - **Zweiter Durchlauf, Punkt 3** (Stand be6f9b9, Bild sichter.png): Lautet
 *   die Anschrift auf S2, bleibt S2 rot und ist der Hauptempfänger — die
 *   Warnung „Kein Hauptempfänger“ schwieg dort nicht. Beginnt ein Teil der
 *   Anschrift mit einer bekannten Stelle („S4 Logistik“), gilt diese Stelle;
 *   „OV Wildeshausen“ bleibt eine grüne Freitextzeile.
 */

import { FERNMELDERSTELLEN } from "@s1/domaene";
import { useState } from "react";

import { KOPIEN, VERTEILERSTELLEN, kopieklasse, stellenname } from "./nachrichtenformate.js";

/** Ein Eintrag der Verteilermatrix, wie der Laufzettel ihn hält. */
export interface Verteilerwahl {
  readonly stelle: string;
  readonly kopie: string;
}

/** Die Vorbelegung: S2 rot (Lehrunterlage, „rote Kopie immer an S2"), sonst leer. */
export const VERTEILER_VORBELEGUNG: readonly Verteilerwahl[] = [{ stelle: "S2", kopie: "ROT" }];

/** Der Satz, wenn kein grüner Hauptempfänger im Verteiler steht (Sichter P1-3). */
export const TEXT_KEIN_HAUPTEMPFAENGER = "Kein Hauptempfänger: Keine Stelle hat die grüne Kopie – wer soll handeln?";

/** Schaltet eine Stelle im Verteiler an oder aus; neu angekreuzt ist die Kopie blau (Mitleser), S2 rot. */
export function umgeschaltet(verteiler: readonly Verteilerwahl[], stelle: string): readonly Verteilerwahl[] {
  if (verteiler.some((e) => e.stelle === stelle)) return verteiler.filter((e) => e.stelle !== stelle);
  return [...verteiler, { stelle, kopie: stelle === "S2" ? "ROT" : "BLAU" }];
}

/** Setzt eine Stelle auf eine Kopiefarbe; dieselbe Farbe noch einmal nimmt die Stelle heraus. */
export function mitKopie(verteiler: readonly Verteilerwahl[], stelle: string, kopie: string): readonly Verteilerwahl[] {
  const bisher = verteiler.find((e) => e.stelle === stelle);
  if (bisher?.kopie === kopie) return verteiler.filter((e) => e.stelle !== stelle);
  if (bisher !== undefined) return verteiler.map((e) => (e.stelle === stelle ? { stelle, kopie } : e));
  return [...verteiler, { stelle, kopie }];
}

function normal(text: string): string {
  return text.trim().toLocaleLowerCase("de");
}

/** „FüSt“, „Führungsstelle“ oder ihr Name aus den Stammdaten: die eigene Führungsstelle als Ganzes, kein Empfänger. */
function istEigeneFuest(teil: string, eigeneFuest: string | undefined): boolean {
  const t = normal(teil);
  return t === "füst" || t === "führungsstelle" || (eigeneFuest !== undefined && t === normal(eigeneFuest));
}

const BEKANNT: readonly string[] = [...VERTEILERSTELLEN, "SICHTER", "FMZ", "LDF", ...FERNMELDERSTELLEN];

/** Die bekannte Stelle zu einem Wort („s4“, „Leiter“), sonst `undefined`. */
function bekannteStelle(wort: string): string | undefined {
  return BEKANNT.find((s) => normal(s) === normal(wort) || normal(stellenname(s)) === normal(wort));
}

/**
 * Die Stelle eines Teils der Anschrift: die ganze Angabe als bekannte Stelle,
 * sonst ihr erstes Wort („S4 Logistik“ → S4, zweiter Durchlauf Punkt 3), sonst
 * der Freitext selbst („OV Wildeshausen“).
 */
function stelleDesTeils(teil: string): string {
  return bekannteStelle(teil) ?? bekannteStelle(teil.split(/\s+/u)[0] ?? "") ?? teil;
}

/**
 * Die Stellen der Anschrift: durch Komma, Semikolon oder „und“ getrennt; eine
 * bekannte Stelle (Schlüssel oder Wort, „S3“, „Leiter“) wird zu ihrem
 * Schlüssel, alles andere bleibt Freitext. Der Name der eigenen
 * Führungsstelle fällt weg.
 */
export function anschriftStellen(anschrift: string, eigeneFuest?: string): readonly string[] {
  const ergebnis: string[] = [];
  for (const teil of anschrift.split(/[,;]|\s+und\s+/u)) {
    const t = teil.trim();
    if (t === "" || t.includes("/") || istEigeneFuest(t, eigeneFuest)) continue;
    const stelle = stelleDesTeils(t);
    if (!ergebnis.includes(stelle)) ergebnis.push(stelle);
  }
  return ergebnis;
}

/** Der vorbelegte Verteiler: S2 rot, die Stellen der Anschrift grün (Sachgebietsleiter P1-3). */
export function verteilerAusAnschrift(anschrift: string, eigeneFuest?: string): readonly Verteilerwahl[] {
  const gruen = anschriftStellen(anschrift, eigeneFuest)
    .filter((s) => s !== "S2")
    .map((stelle) => ({ stelle, kopie: "GRUEN" }));
  return [...VERTEILER_VORBELEGUNG, ...gruen];
}

/**
 * Die Warnung vor dem Sichten, wenn niemand die grüne Kopie hat; sonst
 * `undefined`. Additiv (zweiter Durchlauf, Punkt 3): Lautet die Anschrift auf
 * S2 und steht S2 im Verteiler, ist S2 der Hauptempfänger — mit der roten
 * Kopie, denn S2 bekommt immer rot (Lehrunterlage); dann warnt nichts.
 */
export function hauptempfaengerWarnung(verteiler: readonly Verteilerwahl[], anschrift?: string, eigeneFuest?: string): string | undefined {
  if (verteiler.some((e) => e.kopie === "GRUEN")) return undefined;
  const s2Angeschrieben = anschrift !== undefined && anschriftStellen(anschrift, eigeneFuest).includes("S2");
  return s2Angeschrieben && verteiler.some((e) => e.stelle === "S2") ? undefined : TEXT_KEIN_HAUPTEMPFAENGER;
}

const KURZ: Readonly<Record<string, string>> = { GRUEN: "G", BLAU: "B", ROT: "R" };

/**
 * Was die Kästchen G, B, R bedeuten (R2-FaBe P1-1/P1-2): Wer den Vordruck
 * nicht kennt, las nur Buchstaben. Der Satz steht als Tooltip am Raster und
 * an jedem Kästchen; das Wort der Farbe davor.
 */
export const TITEL_KOPIEN = "grün: bearbeiten, blau: Kenntnis, rot: S2 für Lage und Tagebuch";
const KOPIE_TUN: Readonly<Record<string, string>> = { GRUEN: "grün – bearbeiten (Hauptempfänger)", BLAU: "blau – zur Kenntnis (Mitleser)", ROT: "rot – S2 für Lage und Tagebuch" };

interface RasterzeileEigenschaften {
  readonly stelle: string;
  readonly kopie: string | undefined;
  readonly aufKopie: (kopie: string) => void;
  /** Additiv (R2-FM P1-1): der Platz in der Tabulatorfolge der Aufnahme. */
  readonly tabfolge?: number | undefined;
}

function Rasterzeile({ stelle, kopie, aufKopie, tabfolge }: RasterzeileEigenschaften): React.JSX.Element {
  const name = stellenname(stelle);
  return (
    <div className={`verteilerzeile ${kopieklasse(kopie)}`} role="group" aria-label={name}>
      <span className="verteilername">{name}</span>
      {KOPIEN.map((k) => (
        <label key={k.wert} className={`kopiefeld ${kopieklasse(k.wert)}`} title={`${name}: Kopie ${KOPIE_TUN[k.wert] ?? k.titel}. ${TITEL_KOPIEN}`}>
          <input type="checkbox" aria-label={`${name} ${k.titel.split(" ")[0] ?? k.titel}`} data-tabfolge={tabfolge} checked={kopie === k.wert} onChange={() => aufKopie(k.wert)} />
          {KURZ[k.wert]}
        </label>
      ))}
    </div>
  );
}

export interface VerteilermatrixEigenschaften {
  readonly verteiler: readonly Verteilerwahl[];
  readonly aufAenderung: (neu: readonly Verteilerwahl[]) => void;
  /** Additiv (R2-FM P1-1): die Kästchen und „Weitere Stelle“ in der Tabulatorfolge der Aufnahme. */
  readonly tabfolge?: number | undefined;
}

export function Verteilermatrix({ verteiler, aufAenderung, tabfolge }: VerteilermatrixEigenschaften): React.JSX.Element {
  const [frei, setzeFrei] = useState("");
  const freie = verteiler.map((e) => e.stelle).filter((s) => !(VERTEILERSTELLEN as readonly string[]).includes(s));
  const freiDazu = (): void => {
    const name = frei.trim();
    if (name === "" || name.includes("/")) return;
    if (!verteiler.some((e) => e.stelle === name)) aufAenderung([...verteiler, { stelle: name, kopie: "BLAU" }]);
    setzeFrei("");
  };
  return (
    <div className="verteilermatrix verteilerraster" role="group" aria-label="Verteiler" title={`Kopiefarben: ${TITEL_KOPIEN}`}>
      <div className="verteilerzeilen">
        {[...VERTEILERSTELLEN, ...freie].map((stelle) => (
          <Rasterzeile key={stelle} stelle={stelle} tabfolge={tabfolge} kopie={verteiler.find((e) => e.stelle === stelle)?.kopie} aufKopie={(kopie) => aufAenderung(mitKopie(verteiler, stelle, kopie))} />
        ))}
      </div>
      <div className="kaestchenzeile">
        <label>
          Weitere Stelle
          <input
            value={frei}
            placeholder="z. B. Polizei"
            data-tabfolge={tabfolge}
            onChange={(e) => setzeFrei(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                freiDazu();
              }
            }}
          />
        </label>
        <button type="button" onClick={freiDazu} disabled={frei.trim() === ""}>
          Dazu
        </button>
      </div>
    </div>
  );
}
