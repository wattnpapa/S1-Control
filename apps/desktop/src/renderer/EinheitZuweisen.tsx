/**
 * „Einheit zuweisen" an der Unterkunftskarte (S4.2): der zweite Weg zur
 * Zuweisung, von der Unterkunft aus.
 *
 * Zur Wahl stehen alle Einheiten ohne geltende Unterkunft — die mit
 * Übernachtungsbedarf zuerst, danach die ohne gemeldeten Bedarf. Auch die
 * sind zuweisbar; sie belegen dann ihre Köpfe (Ring 2, `belegung`).
 */

import { useState } from "react";

import type { Ohnebedarfszeile, Unterbringungsbedarf } from "@s1/domaene";

import { useLaden } from "./laden.js";
import { zuweisung } from "../kontrakt/versorgungsschritte.js";

export interface Zuweisbare {
  readonly einheitId: string;
  readonly text: string;
  /** Die bisherige (aufgelöste) Unterkunft als Vorwert, sonst nichts. */
  readonly vorher?: string;
}

/** „· Anmarsch" nur, wenn der Bereich es nicht schon sagt. */
function anmarschZusatz(z: { readonly bereich: string; readonly anmarsch: boolean }): string {
  return z.anmarsch && z.bereich !== "Anmarsch" ? " · Anmarsch" : "";
}

function ohneText(z: Ohnebedarfszeile): string {
  return `${z.einheit} · ${z.bereich} · ${String(z.koepfe)} Köpfe${anmarschZusatz(z)}`;
}

/** Wer noch ohne geltende Unterkunft ist, getrennt nach mit und ohne Bedarf. */
export function zuweisbareEinheiten(bedarf: Unterbringungsbedarf): {
  readonly mitBedarf: readonly Zuweisbare[];
  readonly ohneBedarf: readonly Zuweisbare[];
} {
  const mitBedarf = bedarf.zeilen
    .filter((z) => z.zustand !== "ZUGEWIESEN")
    .map((z) => ({
      einheitId: z.einheitId,
      text: `${z.einheit} · ${z.bereich} · ${String(z.m + z.w + z.d)} Betten${anmarschZusatz(z)}`,
      ...(z.unterkunftId === undefined ? {} : { vorher: z.unterkunftId }),
    }));
  const ohneBedarf = bedarf.ohneBedarf.map((z) => ({ einheitId: z.einheitId, text: ohneText(z) }));
  return { mitBedarf, ohneBedarf };
}

export function EinheitZuweisen(props: {
  readonly unterkunftId: string;
  readonly unterkunft: string;
  readonly bedarf: Unterbringungsbedarf;
}): React.JSX.Element {
  const [wahl, setzeWahl] = useState("");
  const bediene = useLaden((z) => z.bediene);
  const { mitBedarf, ohneBedarf } = zuweisbareEinheiten(props.bedarf);
  if (mitBedarf.length === 0 && ohneBedarf.length === 0) {
    return <p className="hinweistext">Alle Einheiten sind untergebracht.</p>;
  }
  const schreibe = (): void => {
    const einheit = [...mitBedarf, ...ohneBedarf].find((e) => e.einheitId === wahl);
    setzeWahl("");
    if (einheit === undefined) return;
    const entwurf = zuweisung(einheit.einheitId, einheit.vorher, props.unterkunftId);
    if (entwurf !== undefined) void bediene(entwurf);
  };
  return (
    <p className="zuweisungswahl">
      <select aria-label={`Einheit in ${props.unterkunft} unterbringen`} value={wahl} onChange={(e) => setzeWahl(e.target.value)}>
        <option value="">— Einheit wählen —</option>
        {mitBedarf.length > 0 && (
          <optgroup label="mit Übernachtungsbedarf">
            {mitBedarf.map((e) => (
              <option key={e.einheitId} value={e.einheitId}>
                {e.text}
              </option>
            ))}
          </optgroup>
        )}
        {ohneBedarf.length > 0 && (
          <optgroup label="ohne gemeldeten Bedarf">
            {ohneBedarf.map((e) => (
              <option key={e.einheitId} value={e.einheitId}>
                {e.text}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <button type="button" disabled={wahl === ""} onClick={schreibe}>
        Zuweisen
      </button>
    </p>
  );
}
