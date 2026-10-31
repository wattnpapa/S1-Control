import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { peer } from "../kontrakt/pruefhilfen.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import {
  SPERRE_TAKT_MS,
  UEBERNAHME_MS,
  sperrenderArbeitsplatz,
  sperrtext,
  useFremdsperren,
  useSperreHalten,
} from "./useBearbeitungssperre.js";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("sperrenderArbeitsplatz", () => {
  it("nennt den lebenden Halter, ignoriert fortgegangene und andere Datensätze", () => {
    const peers = [
      peer({ clientId: "b", anzeigename: "Lage 2", bearbeitet: ["U1"] }),
      peer({ clientId: "c", anzeigename: "Alt", veraltet: true, bearbeitet: ["U2"] }),
    ];
    expect(sperrenderArbeitsplatz(peers, "U1")).toBe("Lage 2");
    expect(sperrenderArbeitsplatz(peers, "U2")).toBeUndefined();
    expect(sperrenderArbeitsplatz(peers, "U3")).toBeUndefined();
    expect(sperrtext("Lage 2")).toBe("🔒 wird von Lage 2 bearbeitet");
  });
});

describe("Sperre halten", () => {
  let attrappe: Attrappe;
  beforeEach(() => {
    attrappe = baueAttrappe();
    attrappe.antwortet("sperre", null);
    useLaden.setState({ akteId: "akte-1" });
  });

  it("setzt, verlängert im Takt und gibt beim Schließen des Editors frei", () => {
    vi.useFakeTimers();
    const { rerender, unmount } = renderHook(({ id }: { id: string | undefined }) => useSperreHalten(id), {
      initialProps: { id: undefined as string | undefined },
    });
    expect(attrappe.rufeDerArt("sperre")).toHaveLength(0);
    rerender({ id: "U1" });
    expect(attrappe.rufeDerArt("sperre")).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(SPERRE_TAKT_MS);
    });
    expect(attrappe.rufeDerArt("sperre")).toHaveLength(2);
    unmount();
    const letzter = attrappe.letzterRuf("sperre");
    expect(letzter).toMatchObject({ art: "sperre", entitaetId: "U1", frei: true });
  });
});

describe("Fremdsperren", () => {
  it("weist zuerst ab und lässt beim zweiten Versuch bewusst übernehmen", () => {
    useLaden.setState({
      lagebild: { peers: [peer({ clientId: "b", anzeigename: "Lage 2", bearbeitet: ["U1"] })] } as never,
    });
    const { result } = renderHook(() => useFremdsperren());
    expect(result.current.von("U1")).toBe("Lage 2");
    const erst = result.current.pruefeStart("U1", 1000);
    expect(erst).toMatch(/^🔒 wird von Lage 2 bearbeitet\./);
    expect(result.current.pruefeStart("U1", 2000)).toBeUndefined();
    expect(result.current.pruefeStart("U1", 1000 + UEBERNAHME_MS + 1)).toMatch(/Lage 2/);
    expect(result.current.pruefeStart("U9", 1000)).toBeUndefined();
  });
});
