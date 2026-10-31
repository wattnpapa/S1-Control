/**
 * Browser-Zurück verlässt den Einsatz nicht ungefragt; beforeunload warnt nur
 * bei offenem Entwurf.
 */

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { vergesseEntwurf } from "./entwurf.js";
import { TEXT_ZURUECK_FRAGE, useBrowserNavigation, type Navigation } from "./navigation.js";
import { useEntwurf } from "./entwurf.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Pruefling(eigenschaften: Navigation): null {
  useBrowserNavigation(eigenschaften);
  return null;
}

beforeEach(() => {
  history.replaceState(null, "");
  vergesseEntwurf();
});

function zurueck(): void {
  act(() => {
    history.back();
  });
}

const warte = (): Promise<void> => new Promise((fertig) => setTimeout(fertig, 30));

describe("History je Reiter", () => {
  it("legt je Blatt einen Eintrag an und geht mit Zurück zum vorigen Blatt", async () => {
    const waehle = vi.fn();
    const props = { aktiv: true, blatt: "lage", waehleBlatt: waehle, zurueckZurAuswahl: vi.fn() };
    const { rerender } = render(<Pruefling {...props} />);
    rerender(<Pruefling {...props} blatt="ausgaben" />);
    expect((history.state as { s1blatt: string }).s1blatt).toBe("ausgaben");
    zurueck();
    await warte();
    expect(waehle).toHaveBeenCalledWith("lage");
  });

  it("fragt vor dem Verlassen des ersten Blatts und bleibt bei „Nein“", async () => {
    const zurueckZurAuswahl = vi.fn();
    const frage = vi.spyOn(globalThis, "confirm").mockReturnValue(false);
    render(<Pruefling aktiv blatt="lage" waehleBlatt={vi.fn()} zurueckZurAuswahl={zurueckZurAuswahl} />);
    zurueck();
    await warte();
    expect(frage).toHaveBeenCalledWith(TEXT_ZURUECK_FRAGE);
    expect(zurueckZurAuswahl).not.toHaveBeenCalled();
    // Der Eintrag wurde aufgefüllt: ein zweites Zurück fragt wieder.
    expect((history.state as { s1blatt: string }).s1blatt).toBe("lage");
  });

  it("geht bei „Ja“ zurück zur Einsatzauswahl", async () => {
    const zurueckZurAuswahl = vi.fn();
    vi.spyOn(globalThis, "confirm").mockReturnValue(true);
    render(<Pruefling aktiv blatt="lage" waehleBlatt={vi.fn()} zurueckZurAuswahl={zurueckZurAuswahl} />);
    zurueck();
    await warte();
    expect(zurueckZurAuswahl).toHaveBeenCalledOnce();
  });

  it("tut ohne offenen Einsatz nichts", async () => {
    const frage = vi.spyOn(globalThis, "confirm");
    render(<Pruefling aktiv={false} blatt="lage" waehleBlatt={vi.fn()} zurueckZurAuswahl={vi.fn()} />);
    expect(history.state).toBeNull();
    zurueck();
    await warte();
    expect(frage).not.toHaveBeenCalled();
  });
});

describe("beforeunload", () => {
  const entladen = (): BeforeUnloadEvent => {
    const ereignis = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    globalThis.dispatchEvent(ereignis);
    return ereignis;
  };

  it("warnt nur, wenn ein Entwurf mit Inhalt offen ist", () => {
    render(<Pruefling aktiv blatt="lage" waehleBlatt={vi.fn()} zurueckZurAuswahl={vi.fn()} />);
    expect(entladen().defaultPrevented).toBe(false);
    useEntwurf.setState({
      ordner: "",
      eingabe: { kennung: "", abzuloesendeEinheitId: "", vorgeseheneEinheitText: "", vorgesehenerAuftrag: "Pumpen" },
    });
    expect(entladen().defaultPrevented).toBe(true);
  });
});
