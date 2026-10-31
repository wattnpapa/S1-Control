/**
 * Das Auswahlblatt, während ein Kollege den Wert ändert.
 *
 * Das Statusblatt von A zeigte den neuen Wert von B nicht – A hielt ihn für
 * unverändert und bestätigte blind. Jetzt steht „Inzwischen geändert (neu: …)"
 * im Blatt; die Wahl von A bleibt, die Vorwert-Prüfung des Workers fängt das
 * Schreiben ab.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import type { Spalte, Tabellenzeile } from "@s1/domaene";

import { Zelle } from "./Einheitenzelle.js";

afterEach(cleanup);

const SPALTE = {
  schluessel: "organisation",
  kopf: "Organisation",
  art: "auswahl",
  werte: ["THW", "FW"],
  schreibt: { art: "stammdaten", feld: "organisation" },
} as unknown as Spalte;

function zeile(wert: string): Tabellenzeile {
  return {
    einheitId: "U1",
    anzeige: "Bergungsgruppe 1",
    zellen: { organisation: { text: wert, wert, umstritten: false } },
  } as unknown as Tabellenzeile;
}

function zeige(wert: string): React.JSX.Element {
  return (
    <table>
      <tbody>
        <tr>
          <Zelle
            zeile={zeile(wert)}
            spalte={SPALTE}
            bearbeitet
            aufBearbeiten={() => undefined}
            aufFertig={() => undefined}
            aufAbbrechen={() => undefined}
          />
        </tr>
      </tbody>
    </table>
  );
}

it("sagt im offenen Auswahlblatt, dass der Wert inzwischen geändert wurde", () => {
  const { rerender } = render(zeige("THW"));
  expect(screen.queryByText(/Inzwischen geändert/)).toBeNull();
  rerender(zeige("FW"));
  expect(screen.getByRole("status").textContent).toContain("Inzwischen geändert (neu: ");
});
