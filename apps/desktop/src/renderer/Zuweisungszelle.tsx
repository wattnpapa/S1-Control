/**
 * Die Zelle „Unterkunft" der Bedarfstabelle (S4.2).
 *
 * Die Wahl steht sichtbar in jeder Zeile, damit niemand einen Doppelklick
 * kennen muss (Anwenderrückmeldung: „nicht ersichtlich, wie ich zuordne").
 * Geschrieben wird erst mit dem Knopf „Zuweisen" oder Enter; Esc setzt die
 * Wahl zurück. So löst ein Pfeiltastendruck im geschlossenen Feld keinen
 * Schreibvorgang aus.
 *
 * Zur Wahl stehen die geltenden Unterkünfte, die mit freien Plätzen zuerst.
 * Eine Zuweisung über die Kapazität wird nicht verweigert; die Karte zeigt
 * sie danach als überbelegt.
 */

import { useState } from "react";

import type { Bedarfszeile, Unterkunftskarte } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { zuweisung } from "../kontrakt/versorgungsschritte.js";

/** Der Text einer Unterkunft in der Wahl: Name und freie Plätze. */
export function unterkunftWahltext(k: Unterkunftskarte): string {
  const frei = k.frei > 0 ? `${String(k.frei)} frei` : k.frei === 0 ? "voll" : "überbelegt";
  return `${k.name} (${frei})`;
}

/** Die geltenden Unterkünfte, die mit freien Plätzen zuerst. */
export function geltendeUnterkuenfte(karten: readonly Unterkunftskarte[]): readonly Unterkunftskarte[] {
  return karten.filter((k) => !k.aufgeloest).sort((a, b) => Number(a.frei <= 0) - Number(b.frei <= 0));
}

export function Zuweisungszelle(props: {
  readonly zeile: Bedarfszeile;
  readonly karten: readonly Unterkunftskarte[];
  readonly nurLesen: boolean;
}): React.JSX.Element {
  const { zeile } = props;
  const bisher = zeile.unterkunftId ?? "";
  const [wahl, setzeWahl] = useState(bisher);
  const bediene = useLaden((z) => z.bediene);

  if (props.nurLesen) return <td>{zeile.unterkunft ?? zeile.unterkunftId ?? "—"}</td>;

  const schreibe = (): void => {
    const entwurf = zuweisung(zeile.einheitId, zeile.unterkunftId, wahl);
    if (entwurf !== undefined) void bediene(entwurf);
  };
  const geaendert = wahl !== bisher;

  return (
    <td className="zuweisungszelle">
      <span className="zuweisungswahl">
        <select
          aria-label={`Unterkunft für ${zeile.einheit}`}
          value={wahl}
          onChange={(e) => setzeWahl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && geaendert) {
              e.preventDefault();
              schreibe();
            } else if (e.key === "Escape") {
              e.preventDefault();
              setzeWahl(bisher);
            }
          }}
        >
          <option value="">{bisher === "" ? "— Unterkunft wählen —" : "— ohne Unterkunft —"}</option>
          {zeile.zustand === "AUFGELOEST" && <option value={bisher}>{zeile.unterkunft ?? bisher} (aufgelöst)</option>}
          {geltendeUnterkuenfte(props.karten).map((k) => (
            <option key={k.unterkunftId} value={k.unterkunftId}>
              {unterkunftWahltext(k)}
            </option>
          ))}
        </select>
        {geaendert && (
          <button type="button" className="haupt" onClick={schreibe}>
            {wahl === "" ? "Aufheben" : "Zuweisen"}
          </button>
        )}
      </span>
    </td>
  );
}
