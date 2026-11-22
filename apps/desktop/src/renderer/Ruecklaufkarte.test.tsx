/** Die Karte „Rücklauf“ (Stab-Review 2026-11-22, Sichter). */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Ruecklaufzeile } from "@s1/domaene";

import { Ruecklaufkarte, warteminuten } from "./Ruecklaufkarte.js";

afterEach(cleanup);

const ZEILEN: readonly Ruecklaufzeile[] = [
  {
    stelle: "S3",
    ungelesen: 1,
    kopien: [{ nachrichtId: "N2", kennzeichen: "E 11", betreff: "Deichbruch", vorrangstufe: 0, seit: "2026-11-22T10:00:00.000Z", gelesen: false }],
  },
];

describe("Die Karte „Rücklauf“", () => {
  it("nennt je Stelle offene und ungelesene Kopien, den Blitz mit Wartezeit, und wählt die Nachricht", () => {
    const aufWahl = vi.fn();
    render(<Ruecklaufkarte zeilen={ZEILEN} jetzt="2026-11-22T10:20:00.000Z" aufWahl={aufWahl} />);
    const zeile = within(screen.getByRole("region", { name: "Rücklauf" })).getByRole("rowheader", { name: "S3" }).closest("tr") as HTMLElement;
    const knopf = within(zeile).getByRole("button");
    expect(knopf.textContent).toBe("Blitz E 11 Deichbruch · 20 min · ungelesen");
    fireEvent.click(knopf);
    expect(aufWahl).toHaveBeenCalledWith("N2");
  });

  it("sagt, wenn alles erledigt ist", () => {
    render(<Ruecklaufkarte zeilen={[]} jetzt={undefined} aufWahl={vi.fn()} />);
    expect(screen.getByText("Jede grüne Kopie ist erledigt.")).toBeDefined();
  });

  it("rechnet die Wartezeit in Minuten und nichts ohne Zeiten", () => {
    expect(warteminuten("2026-11-22T10:00:00.000Z", "2026-11-22T11:05:00.000Z")).toBe(65);
    expect(warteminuten(undefined, "2026-11-22T11:05:00.000Z")).toBeUndefined();
  });
});
