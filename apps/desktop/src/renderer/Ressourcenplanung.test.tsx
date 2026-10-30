/**
 * Komponententests zur Ressourcenplanung in der Einheitentabelle: die Marken
 * K12 und K18 und die Zeilenaktion „Ablösung anfordern“.
 *
 * Die Spalten selbst rechnet die Projektion (`abloesung.test.ts`); hier steht
 * nur, dass die Tabelle sie zeichnet und dass die Zeilenaktion die richtige
 * Anforderung schreibt.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Tabellenzeile, Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zelle(text: string, wert: unknown): Zelle {
  return { text, wert, umstritten: false };
}

/** In einer Stunde — K18 nennt das „läuft ab“. */
const BALD = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function zeile(id: string, bezeichnung: string, teil: Partial<Tabellenzeile> = {}): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId: "EO",
    abschnittName: "Deich Nord",
    reihenfolge: 1,
    anzeige: bezeichnung,
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    gesamt: 9,
    entfernt: false,
    aufgegangen: false,
    hinweise: [],
    zellen: {
      bezeichnung: zelle(bezeichnung, bezeichnung),
      status: zelle("Einsatz", "IM_EINSATZ"),
      verfuegbarBis: zelle("", null),
      anforderungsKennung: zelle("", undefined),
    },
    ...teil,
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  const abgeloest = zeile("U1", "Bergungsgruppe 1", {
    abloesung: { text: "Ablösung angefordert", ton: "warn" },
  });
  const laeuftAb = zeile("U2", "Fachgruppe N");
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: [
      { ...abgeloest, zellen: { ...abgeloest.zellen, anforderungsKennung: zelle("ANF-001", undefined) } },
      { ...laeuftAb, zellen: { ...laeuftAb.zellen, verfuegbarBis: zelle("bald", BALD) } },
    ],
    gesamtzahl: 2,
    von: 0,
    jeStatus: { IM_EINSATZ: { anzahl: 2, gesamt: 18 } },
  });
  attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 5, einheitId: "U1", fahrzeuge: [], personen: [], auftraege: [] });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", baum: undefined, tabelle: undefined, tabellenfilter: {}, fehler: undefined, hinweise: [] });
});

async function zeige(): Promise<void> {
  render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
  await waitFor(() => {
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });
}

describe("Die Ressourcenplanung in der Einheitentabelle", () => {
  it("zeigt K12 als Wort an der Bezeichnung — auch bei ausgeblendeter Ressourcenplanung", async () => {
    await zeige();
    expect(screen.getByText("Ablösung angefordert").className).toContain("warn");
  });

  it("zeigt K18 als „läuft ab“ an „Verfügbar bis“, sobald die Gruppe zu sehen ist", async () => {
    await zeige();
    expect(screen.queryByText("läuft ab")).toBeNull();
    fireEvent.click(screen.getByText("Ressourcen"));
    expect(screen.getByText("läuft ab")).toBeDefined();
    expect(screen.getByText("Anforderungs-ID")).toBeDefined();
    expect(screen.getByText("ANF-001")).toBeDefined();
  });

  it("öffnet an einer markierten Zeile „Ablösung anfordern“ und schreibt die Einheit als abzulösende", async () => {
    await zeige();
    const knopf = screen.getByText("Ablösung anfordern") as HTMLButtonElement;
    expect(knopf.disabled).toBe(true);
    fireEvent.click(screen.getByText("Fachgruppe N"));
    fireEvent.click(knopf);

    expect(screen.getByText("Ablösung für „Fachgruppe N“ anfordern")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Vorgesehene Einheit"), { target: { value: "FGr N Jever" } });
    fireEvent.click(screen.getByText("Anfordern", { selector: "button[type=submit]" }));

    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1);
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("AnforderungAngelegt");
    expect(entwurf?.nutzlast).toMatchObject({ abzuloesendeEinheitId: "U2", vorgeseheneEinheitText: "FGr N Jever" });
  });

  it("warnt in der Maske, wenn die Einheit schon eine Ablösung hat", async () => {
    await zeige();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    fireEvent.click(screen.getByText("Ablösung anfordern"));
    expect(screen.getByText(/Für diese Einheit steht schon/).textContent).toContain("ANF-001");
  });
});
