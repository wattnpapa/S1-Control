/**
 * Die Zelle „Unterkunft" der Bedarfstabelle (S4.2): bearbeitbar wie jede
 * Zelle der Einheitentabelle — Doppelklick (oder Enter) öffnet die Wahl,
 * Enter schreibt, Esc verwirft.
 *
 * Zur Wahl stehen die geltenden Unterkünfte, die mit freien Plätzen zuerst.
 * Eine Zuweisung über die Kapazität wird nicht verweigert; die Karte zeigt
 * sie danach als überbelegt.
 */

import { useState } from "react";

import type { Bedarfszeile, Unterkunftskarte } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { zuweisung } from "../kontrakt/versorgungsschritte.js";

export function Zuweisungszelle(props: {
  readonly zeile: Bedarfszeile;
  readonly karten: readonly Unterkunftskarte[];
  readonly nurLesen: boolean;
}): React.JSX.Element {
  const { zeile } = props;
  const [offen, setzeOffen] = useState(false);
  const [wahl, setzeWahl] = useState(zeile.unterkunftId ?? "");
  const bediene = useLaden((z) => z.bediene);
  const geltend = props.karten.filter((k) => !k.aufgeloest).sort((a, b) => Number(a.frei <= 0) - Number(b.frei <= 0));
  const text = zeile.unterkunft ?? (zeile.unterkunftId === undefined ? "—" : zeile.unterkunftId);

  const schreibe = (): void => {
    setzeOffen(false);
    const entwurf = zuweisung(zeile.einheitId, zeile.unterkunftId, wahl);
    if (entwurf !== undefined) void bediene(entwurf);
  };

  if (!offen || props.nurLesen) {
    return (
      <td
        className="bearbeitbar"
        tabIndex={props.nurLesen ? undefined : 0}
        title={props.nurLesen ? undefined : "Doppelklick oder Enter: Unterkunft wählen"}
        onDoubleClick={() => {
          setzeWahl(zeile.unterkunftId ?? "");
          setzeOffen(true);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          setzeWahl(zeile.unterkunftId ?? "");
          setzeOffen(true);
        }}
      >
        {text}
      </td>
    );
  }
  return (
    <td className="bearbeitbar offen">
      <select
        aria-label={`Unterkunft für ${zeile.einheit}`}
        autoFocus
        value={wahl}
        onChange={(e) => setzeWahl(e.target.value)}
        onBlur={() => setzeOffen(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            schreibe();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setzeOffen(false);
          }
        }}
      >
        <option value="">— ohne Unterkunft —</option>
        {geltend.map((k) => (
          <option key={k.unterkunftId} value={k.unterkunftId}>
            {k.name} ({k.frei > 0 ? `${String(k.frei)} frei` : k.frei === 0 ? "voll" : "überbelegt"})
          </option>
        ))}
      </select>
    </td>
  );
}
