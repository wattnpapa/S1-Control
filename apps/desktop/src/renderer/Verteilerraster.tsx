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
 */

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

/**
 * Die Stellen der Anschrift: durch Komma, Semikolon oder „und“ getrennt; eine
 * bekannte Stelle (Schlüssel oder Wort, „S3“, „Leiter“) wird zu ihrem
 * Schlüssel, alles andere bleibt Freitext. Der Name der eigenen
 * Führungsstelle fällt weg.
 */
export function anschriftStellen(anschrift: string, eigeneFuest?: string): readonly string[] {
  const bekannt = [...VERTEILERSTELLEN, "SICHTER", "FMZ", "LDF"];
  const ergebnis: string[] = [];
  for (const teil of anschrift.split(/[,;]|\s+und\s+/u)) {
    const t = teil.trim();
    if (t === "" || t.includes("/") || istEigeneFuest(t, eigeneFuest)) continue;
    const stelle = bekannt.find((s) => normal(s) === normal(t) || normal(stellenname(s)) === normal(t)) ?? t;
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

/** Die Warnung vor dem Sichten, wenn niemand die grüne Kopie hat; sonst `undefined`. */
export function hauptempfaengerWarnung(verteiler: readonly Verteilerwahl[]): string | undefined {
  return verteiler.some((e) => e.kopie === "GRUEN") ? undefined : TEXT_KEIN_HAUPTEMPFAENGER;
}

const KURZ: Readonly<Record<string, string>> = { GRUEN: "G", BLAU: "B", ROT: "R" };

function Rasterzeile({ stelle, kopie, aufKopie }: { readonly stelle: string; readonly kopie: string | undefined; readonly aufKopie: (kopie: string) => void }): React.JSX.Element {
  const name = stellenname(stelle);
  return (
    <div className={`verteilerzeile ${kopieklasse(kopie)}`} role="group" aria-label={name}>
      <span className="verteilername">{name}</span>
      {KOPIEN.map((k) => (
        <label key={k.wert} className={`kopiefeld ${kopieklasse(k.wert)}`} title={`${name}: Kopie ${k.titel}`}>
          <input type="checkbox" aria-label={`${name} ${k.titel.split(" ")[0] ?? k.titel}`} checked={kopie === k.wert} onChange={() => aufKopie(k.wert)} />
          {KURZ[k.wert]}
        </label>
      ))}
    </div>
  );
}

export function Verteilermatrix({ verteiler, aufAenderung }: { readonly verteiler: readonly Verteilerwahl[]; readonly aufAenderung: (neu: readonly Verteilerwahl[]) => void }): React.JSX.Element {
  const [frei, setzeFrei] = useState("");
  const freie = verteiler.map((e) => e.stelle).filter((s) => !(VERTEILERSTELLEN as readonly string[]).includes(s));
  const freiDazu = (): void => {
    const name = frei.trim();
    if (name === "" || name.includes("/")) return;
    if (!verteiler.some((e) => e.stelle === name)) aufAenderung([...verteiler, { stelle: name, kopie: "BLAU" }]);
    setzeFrei("");
  };
  return (
    <div className="verteilermatrix verteilerraster" role="group" aria-label="Verteiler">
      <div className="verteilerzeilen">
        {[...VERTEILERSTELLEN, ...freie].map((stelle) => (
          <Rasterzeile key={stelle} stelle={stelle} kopie={verteiler.find((e) => e.stelle === stelle)?.kopie} aufKopie={(kopie) => aufAenderung(mitKopie(verteiler, stelle, kopie))} />
        ))}
      </div>
      <div className="kaestchenzeile">
        <label>
          Weitere Stelle
          <input
            value={frei}
            placeholder="z. B. Polizei"
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
