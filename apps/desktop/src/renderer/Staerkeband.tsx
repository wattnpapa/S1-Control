/**
 * Das Stärkeband (Entwurf „Oberfläche", Option 2a, Punkt 2).
 *
 * Fünf gleich breite Kacheln, die letzte hervorgehoben. Es rechnet nichts
 * nach, was der Worker schon gerechnet hat — die Summe ist die einzige
 * Ableitung, und die steht in `formate.ts`, damit Kopfband, Band und
 * Statuszeile dieselbe Zahl zeigen.
 *
 * Die taktische Zeit gehört **nicht** hierher, sondern ins Kopfband: Das Band
 * beantwortet „wie viele", der Kopf „wann".
 */

import type { Lagebild } from "../kontrakt/index.js";
import { gesamt } from "./formate.js";

export interface StaerkebandEigenschaften {
  readonly lagebild: Lagebild;
}

export function Staerkeband({ lagebild }: StaerkebandEigenschaften): React.JSX.Element {
  const { fuehrer, unterfuehrer, mannschaft } = lagebild.gesamtstaerke;
  const kacheln: readonly (readonly [string, number, boolean])[] = [
    ["Einheiten", lagebild.einheiten, false],
    ["Führer", fuehrer, false],
    ["Unterf.", unterfuehrer, false],
    ["Mannsch.", mannschaft, false],
    ["Gesamt", gesamt(lagebild.gesamtstaerke), true],
  ];

  return (
    <div className="staerkeband" aria-label="Stärkeband">
      {kacheln.map(([label, zahl, summe]) => (
        <div key={label} className={summe ? "kachel summe" : "kachel"}>
          <span className="zahl">{String(zahl)}</span>
          <span className="label">{label}</span>
        </div>
      ))}
    </div>
  );
}
