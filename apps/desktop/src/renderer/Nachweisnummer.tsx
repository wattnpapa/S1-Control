/**
 * Die Nummer der Nachweisung mit der Marke „doppelt“.
 *
 * Herausgelöst aus `Nachweisung.tsx`: Die Marke stand nur dort. Zwei
 * Fernmelder, die gleichzeitig aufnehmen, vergeben dieselbe Nummer (auf dem
 * Fileshare lässt sich das nicht sperren, nur zeigen); der LdF zeichnete sie
 * in seiner Karte ab, ohne sie zu sehen (Stab-Review, LdF-1 und Fm-1).
 * Jetzt steht die Marke überall, wo die Nummer in einer Arbeitsliste steht.
 */

import type { Nachrichtenzeile } from "@s1/domaene";

export const TITEL_DOPPELT = "Diese Nummer ist mehrfach vergeben; in der Nachweisung mit „Berichtigen“ richtigstellen";

export function Nachweisnummer({ zeile }: { readonly zeile: Pick<Nachrichtenzeile, "nummer" | "nummerDoppelt"> }): React.JSX.Element {
  if (zeile.nummer === undefined) return <span className="leise">—</span>;
  return (
    <>
      {zeile.nummer}
      {zeile.nummerDoppelt && (
        <span className="marke-zustand warn" title={TITEL_DOPPELT}>
          {" "}
          doppelt
        </span>
      )}
    </>
  );
}
