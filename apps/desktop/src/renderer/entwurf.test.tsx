/**
 * Der Entwurf des Anforderungsformulars übersteht Blattwechsel und Reload und
 * ist nach dem erfolgreichen Anlegen oder „Eingabe verwerfen“ weg.
 */

import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Anforderungsneu } from "./Anforderungsneu.js";
import { hatOffenenEntwurf, useAnforderungsentwurf, useEntwurf, vergesseEntwurf } from "./entwurf.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { ladeEntwurf } from "./sitzung.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  sessionStorage.clear();
  vergesseEntwurf();
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  attrappe.antwortet("anforderungenAnfordern", { lageZeiger: 1, zeilen: [], von: 0, gesamtzahl: 0, jeZustand: {} });
  useLaden.setState({
    akteId: "akte-1",
    lagebild: { einsatzId: "E1", einsatzStatus: "AKTIV" } as never,
    anforderungen: undefined,
    fehler: undefined,
    hinweise: [],
  });
});

const feld = (): HTMLInputElement => screen.getByLabelText("Vorgesehener Auftrag");

describe("Anforderungsentwurf", () => {
  it("überlebt den Wechsel des Blatts (Komponente wird ausgehängt)", () => {
    const erste = render(<Anforderungsneu einheitenwahl={[]} />);
    fireEvent.change(feld(), { target: { value: "Ablösung Deich" } });
    erste.unmount();
    render(<Anforderungsneu einheitenwahl={[]} />);
    expect(feld().value).toBe("Ablösung Deich");
    expect(hatOffenenEntwurf()).toBe(true);
  });

  it("überlebt einen Reload (sessionStorage) und gehört zu einem Einsatz", () => {
    const { result } = renderHook(() => useAnforderungsentwurf());
    act(() => {
      result.current[1]({ kennung: "A-7", abzuloesendeEinheitId: "", vorgeseheneEinheitText: "", vorgesehenerAuftrag: "" });
    });
    expect(ladeEntwurf<{ kennung: string }>()).toEqual({ ordner: "E1", eingabe: expect.objectContaining({ kennung: "A-7" }) });

    // Reload: der Store liest den Entwurf neu aus dem sessionStorage.
    vergesseEntwurf();
    useEntwurf.setState({ ordner: "E1", eingabe: { kennung: "A-7", abzuloesendeEinheitId: "", vorgeseheneEinheitText: "", vorgesehenerAuftrag: "" } });
    expect(renderHook(() => useAnforderungsentwurf()).result.current[0].kennung).toBe("A-7");

    // Anderer Einsatz: leeres Formular.
    useLaden.setState({ lagebild: { einsatzId: "E2", einsatzStatus: "AKTIV" } as never });
    expect(renderHook(() => useAnforderungsentwurf()).result.current[0].kennung).toBe("");
  });

  it("wird beim erfolgreichen Anlegen gelöscht", async () => {
    render(<Anforderungsneu einheitenwahl={[]} />);
    fireEvent.change(feld(), { target: { value: "Pumpen" } });
    expect(ladeEntwurf()).toBeDefined();
    fireEvent.click(screen.getByText("Anfordern"));
    await waitFor(() => {
      expect(hatOffenenEntwurf()).toBe(false);
    });
    expect(ladeEntwurf()).toBeUndefined();
  });

  it("wird bei „Eingabe verwerfen“ gelöscht", async () => {
    attrappe.antwortet("bedienen", { art: "abgewiesen", grund: "Nicht jetzt." });
    render(<Anforderungsneu einheitenwahl={[]} />);
    fireEvent.change(feld(), { target: { value: "Pumpen" } });
    fireEvent.click(screen.getByText("Anfordern"));
    fireEvent.click(await screen.findByText("Eingabe verwerfen"));
    await waitFor(() => {
      expect(ladeEntwurf()).toBeUndefined();
    });
    expect(feld().value).toBe("");
  });
});
