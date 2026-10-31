/**
 * Masken der Einheitentabelle (Review-Runde 3): Aufteilen mit zu hohem Abzug,
 * Entfernen ohne alten Grund und mit Name und Stärke, Verschieben ohne Grund
 * „grau“.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tabellenzeile } from "@s1/domaene";

import { Einheitenmasken } from "./Einheitenmasken.js";
import { useLaden } from "./laden.js";
import { baueAttrappe } from "./pruefhilfen/attrappe.js";
import type { Einheitenmaske } from "./Einheitentabelle.js";

afterEach(cleanup);

const ZEILE = {
  einheitId: "U1",
  abschnittId: "EO",
  abschnittName: "Deich Nord",
  reihenfolge: 1,
  anzeige: "Bergungsgruppe 1",
  staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
  gesamt: 9,
  entfernt: false,
  zaehlklasse: "ist",
  aufgegangen: false,
  hinweise: [],
  zellen: {},
} as unknown as Tabellenzeile;

beforeEach(() => {
  const attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-1" });
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [], lagebild: undefined });
});

/** Der Bestätigungsknopf der Maske, gleich wie er gerade beschriftet ist. */
function haupt(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('form.maske button[type="submit"]') as HTMLButtonElement;
}

function zeige(maske: Einheitenmaske, gewaehlte: readonly Tabellenzeile[] = [ZEILE], aufGeschrieben?: () => void): void {
  render(
    <Einheitenmasken
      maske={maske}
      gewaehlte={gewaehlte}
      abschnittId={undefined}
      aufSchliessen={() => undefined}
      {...(aufGeschrieben === undefined ? {} : { aufGeschrieben })}
    />,
  );
}

describe("Aufteilen", () => {
  it("sperrt bei mehr Abzug als vorhanden und nennt den Grund aus der Domäne", () => {
    zeige("aufteilen");
    fireEvent.change(screen.getByLabelText("Bezeichnung der neuen Einheit"), { target: { value: "Trupp A" } });
    fireEvent.change(screen.getByLabelText("Führer"), { target: { value: "2" } });
    expect(haupt().disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toMatch(/nur 0\/1\/8 \(Fü\/UFü\/He\) vorhanden/);
    expect(screen.getByTestId("bereitgrund").textContent).toMatch(/vorhanden/);
  });

  it("gibt den Knopf frei, wenn der Abzug im Bestand liegt", () => {
    zeige("aufteilen");
    fireEvent.change(screen.getByLabelText("Bezeichnung der neuen Einheit"), { target: { value: "Trupp A" } });
    fireEvent.change(screen.getByLabelText("Mannschaft"), { target: { value: "3" } });
    expect(haupt().disabled).toBe(false);
  });
});

describe("Entfernen", () => {
  it("nennt Name und Stärke der betroffenen Einheit", () => {
    zeige("entfernen");
    expect(screen.getByTestId("entfernen-betrifft").textContent).toMatch(/Bergungsgruppe 1.*0\/1\/8.*9 Kräfte/);
  });

  it("belegt den Grund beim zweiten Öffnen nicht mit dem vorigen vor und bereinigt die Auswahl", async () => {
    let bereinigt = 0;
    const { rerender } = render(
      <Einheitenmasken maske="entfernen" gewaehlte={[ZEILE]} abschnittId={undefined} aufSchliessen={() => undefined} aufGeschrieben={() => { bereinigt += 1; }} />,
    );
    fireEvent.change(screen.getByLabelText("Grund (Pflicht)"), { target: { value: "Doppelt erfasst" } });
    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    await screen.findByRole("button", { name: "Entfernen" });
    expect(bereinigt).toBe(1);
    rerender(<Einheitenmasken maske={undefined} gewaehlte={[ZEILE]} abschnittId={undefined} aufSchliessen={() => undefined} />);
    rerender(<Einheitenmasken maske="entfernen" gewaehlte={[ZEILE]} abschnittId={undefined} aufSchliessen={() => undefined} />);
    expect((screen.getByLabelText("Grund (Pflicht)") as HTMLInputElement).value).toBe("");
  });
});

describe("Verschieben", () => {
  it("sagt sichtbar neben dem Knopf, was fehlt", () => {
    zeige("verschieben");
    expect(screen.getByTestId("bereitgrund").textContent).toBe("Zielabschnitt wählen");
  });

  it("zeigt bei veralteter, leerer Auswahl keinen Dialog „0 Einheit(en)“", () => {
    zeige("verschieben", []);
    expect(screen.queryByText(/0 Einheit\(en\)/)).toBeNull();
  });
});
