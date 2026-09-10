/**
 * Die Führungsorganisation als Ansicht (Option 3a).
 *
 * Geprüft wird, dass sie **aus dem Baum** zeichnet und nichts eigenes führt:
 * dieselben Namen, dieselben Zahlen, die Einrichtungen daneben — und der Weg
 * zum Blatt an der Wand.
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Fuehrungsorganisation } from "./Fuehrungsorganisation.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function knoten(id: string, name: string, typ: string, kinder: unknown[] = []): unknown {
  return {
    id,
    name,
    typ,
    reihenfolge: 1,
    tiefe: 0,
    eigeneStaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
    summenStaerke: { fuehrer: 4, unterfuehrer: 11, mannschaft: 38 },
    einheiten: 3,
    einheitenSumme: 14,
    zaehlt: true,
    systemAbschnitt: false,
    kinder,
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("baumAnfordern", {
    lageZeiger: 5,
    baum: [
      knoten("EA1", "EA 1 Deich Nord", "EINSATZORT", [
        knoten("UEA11", "UEA 1.1 Pumpen", "EINSATZORT"),
      ]),
      knoten("MK", "Meldekopf", "MELDEKOPF"),
    ],
  });
  attrappe.antwortet("ausgabeErzeugen", { pfad: "/share/ausgaben/fueorg.pdf", bytes: 4096 });
  useLaden.setState({ akteId: "akte-1", baum: undefined, fehler: undefined, hinweise: [] });
});

describe("Die Führungsorganisation", () => {
  it("zeichnet die Führung als Harke und die Einrichtungen daneben", async () => {
    render(<Fuehrungsorganisation />);

    await waitFor(() => {
      expect(screen.getByText("EA 1 Deich Nord")).toBeDefined();
    });
    // Das Zeichen trägt die Kurzform, die Bildunterschrift Name und Stärke.
    expect(screen.getByLabelText("Einsatzabschnittsleitung")).toBeDefined();
    expect(screen.getByLabelText("Untereinsatzabschnittsleitung")).toBeDefined();
    expect(screen.getAllByText("14 Einh. · 4/11/38").length).toBeGreaterThan(0);

    // Der Meldekopf hängt nicht unter der Einsatzleitung, er steht daneben.
    const daneben = screen.getByLabelText("Einrichtungen neben der Harke");
    expect(daneben.textContent).toContain("Meldekopf");
  });

  it("schreibt das Blatt als PDF über die vorhandene Ausgabe", async () => {
    render(<Fuehrungsorganisation />);
    await waitFor(() => {
      expect(screen.getByText("EA 1 Deich Nord")).toBeDefined();
    });

    await userEvent.click(screen.getByRole("button", { name: /Als PDF/ }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("ausgabeErzeugen")?.ausgabe).toBe("fueorg");
    });
    expect(screen.getByText(/fueorg\.pdf/)).toBeDefined();
  });

  it("schreibt die Bedeutung aus, wenn die Beschriftung umgestellt wird", async () => {
    render(<Fuehrungsorganisation />);
    await waitFor(() => {
      expect(screen.getByText("EA 1 Deich Nord")).toBeDefined();
    });
    // In der Kurzform steht die Bedeutung nur im Zeichen selbst (als `title`
    // für Vorleseprogramme), nicht unter ihm.
    expect(screen.getAllByText("Einsatzabschnittsleitung")).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Ausgeschrieben" }));
    expect(screen.getAllByText("Einsatzabschnittsleitung")).toHaveLength(2);
  });
});
