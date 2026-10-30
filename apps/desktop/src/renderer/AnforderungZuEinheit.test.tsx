/**
 * Komponententests zur Verbindung Anforderung ↔ Einheit im Blatt
 * Anforderungen: Ablöse-Einheit beim Anlegen wählen, „Eingetroffen“ legt die
 * Einheit an und verknüpft sie, „Einheit anlegen“ trägt sie nach.
 *
 * Die Wirkung im Fold steht in `szenarien-abloesung.test.ts`; hier steht,
 * welche Entwürfe in welcher Reihenfolge geschickt werden.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Anforderungszeile } from "@s1/domaene";

import { Anforderungen } from "./Anforderungen.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const VORSCHLAG = {
  bezeichnung: "BGr THW OV Varel",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  herkunft: "THW RB Oldenburg",
  abschnittId: "ANF",
  nachVorbildVon: "BGr 1 Oldenburg",
};

function zeile(teil: Partial<Anforderungszeile> = {}): Anforderungszeile {
  return {
    id: "A1",
    kennung: "ANF-001",
    zustand: "ZUGESAGT",
    angefordertAm: "2026-09-10T09:00:00+02:00",
    abzuloesendeEinheitId: "E12",
    abzuloesendeEinheit: "BGr 1 Oldenburg",
    vorgeseheneEinheitText: "BGr THW OV Varel",
    vorgesehenerAuftrag: "Deich Nord",
    bemerkung: "",
    zugesagtFuer: "2026-09-10T16:00:00+02:00",
    zugesagtVon: "THW RB Oldenburg",
    storniert: false,
    vorschlag: VORSCHLAG,
    hinweise: [],
    ...teil,
  };
}

let attrappe: Attrappe;

function antworte(zeilen: readonly Anforderungszeile[]): void {
  attrappe.antwortet("anforderungenAnfordern", {
    lageZeiger: 9,
    zeilen,
    von: 0,
    gesamtzahl: zeilen.length,
    jeZustand: { OFFEN: 0, ZUGESAGT: 1, EINGETROFFEN: 0, STORNIERT: 0 },
    einheitenwahl: [
      { id: "E12", name: "BGr 1 Oldenburg" },
      { id: "E20", name: "FGr Elektroversorgung" },
    ],
  });
}

const BAUM = {
  lageZeiger: 9,
  baum: [
    { id: "ANF", name: "Angefordert / Anmarsch", typ: "ANGEFORDERT", kinder: [] },
    { id: "BR", name: "Bereitstellungsraum", typ: "BEREITSTELLUNGSRAUM", kinder: [] },
  ],
};

beforeEach(() => {
  attrappe = baueAttrappe();
  antworte([zeile()]);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    anforderungen: undefined,
    anforderungsfilter: {},
    baum: BAUM as never,
    fehler: undefined,
    hinweise: [],
  });
});

async function zeige(): Promise<void> {
  render(<Anforderungen />);
  await waitFor(() => {
    expect(screen.getByText("ANF-001")).toBeDefined();
  });
}

function entwuerfe(): readonly { typ: string; nutzlast?: unknown; neu?: unknown; vorher?: unknown }[] {
  return attrappe.rufeDerArt("bedienen").map((ruf) => ruf.entwurf);
}

describe("Anforderung und Einheit", () => {
  it("lässt beim Anlegen die abzulösende Einheit aus der Einheitenliste wählen", async () => {
    await zeige();
    fireEvent.change(screen.getByLabelText("Ablösung für"), { target: { value: "E20" } });
    fireEvent.click(screen.getByText("Anfordern"));
    await waitFor(() => {
      expect(entwuerfe()).toHaveLength(1);
    });
    expect(entwuerfe()[0]?.nutzlast).toMatchObject({ abzuloesendeEinheitId: "E20" });
  });

  it("legt bei „Eingetroffen“ die Einheit vorbelegt an und verknüpft sie in der Erledigung", async () => {
    await zeige();
    fireEvent.click(screen.getByText("Eingetroffen"));
    expect((screen.getByLabelText("Bezeichnung") as HTMLInputElement).value).toBe("BGr THW OV Varel");
    expect((screen.getByLabelText("Herkunft") as HTMLInputElement).value).toBe("THW RB Oldenburg");
    expect((screen.getByLabelText("Mannschaft") as HTMLInputElement).value).toBe("0");
    expect((screen.getByLabelText("Abschnitt") as HTMLSelectElement).value).toBe("ANF");
    expect(screen.getByText(/von „BGr 1 Oldenburg“ übernommen/)).toBeDefined();

    fireEvent.change(screen.getByLabelText("Mannschaft"), { target: { value: "7" } });
    fireEvent.click(screen.getByText("Anlegen", { selector: "button[type=submit]" }));
    await waitFor(() => {
      expect(entwuerfe()).toHaveLength(2);
    });
    const [anlage, erledigung] = entwuerfe();
    expect(anlage?.typ).toBe("EinheitGemeldet");
    const nutzlast = anlage?.nutzlast as { einheitId: string; staerke: unknown; abschnittId: string };
    expect(nutzlast.staerke).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 7 });
    expect(nutzlast.abschnittId).toBe("ANF");
    expect(erledigung?.typ).toBe("AnforderungErledigt");
    expect((erledigung?.neu as { abloesendeEinheitId?: string }).abloesendeEinheitId).toBe(nutzlast.einheitId);
  });

  it("setzt nur auf eingetroffen, wenn die Anlage abgewählt ist", async () => {
    await zeige();
    fireEvent.click(screen.getByText("Eingetroffen"));
    fireEvent.click(screen.getByLabelText("Einheit aus der Anforderung anlegen"));
    fireEvent.click(screen.getByText("Eingetroffen", { selector: "button[type=submit]" }));
    await waitFor(() => {
      expect(entwuerfe()).toHaveLength(1);
    });
    expect(entwuerfe()[0]?.typ).toBe("AnforderungErledigt");
    expect(entwuerfe()[0]?.neu).not.toHaveProperty("abloesendeEinheitId");
  });

  it("trägt an einer eingetroffenen Anforderung ohne Einheit die Einheit nach", async () => {
    antworte([zeile({ zustand: "EINGETROFFEN", erledigtAm: "2026-09-10T15:40:00+02:00" })]);
    await zeige();
    fireEvent.click(screen.getByText("Einheit anlegen"));
    fireEvent.click(screen.getByText("Anlegen", { selector: "button[type=submit]" }));
    await waitFor(() => {
      expect(entwuerfe()).toHaveLength(2);
    });
    const nachtrag = entwuerfe()[1];
    expect(nachtrag?.vorher).toEqual({ erledigtAm: "2026-09-10T15:40:00+02:00" });
    expect(nachtrag?.neu).toMatchObject({ erledigtAm: "2026-09-10T15:40:00+02:00" });
  });

  it("bietet „Einheit anlegen“ nicht an, wenn die Einheit schon verknüpft ist, und nennt sie", async () => {
    antworte([
      zeile({ zustand: "EINGETROFFEN", erledigtAm: "2026-09-10T15:40:00+02:00", abloesendeEinheitId: "E99", abloesendeEinheit: "BGr Varel" }),
    ]);
    await zeige();
    expect(screen.queryByText("Einheit anlegen")).toBeNull();
    expect(screen.getByText(/angelegt: BGr Varel/)).toBeDefined();
  });
});
