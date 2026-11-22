/** Die Karte „Arbeitsplätze der Fernmeldezentrale“ (Stab-Review LdF-A1). */

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { Fmzplatz } from "@s1/domaene";

import { Fmzplaetzekarte } from "./Fmzplaetzekarte.js";

afterEach(cleanup);

const PLAETZE: readonly Fmzplatz[] = [
  { stelle: "FM1", name: "Fm1", besetzt: [{ anzeigename: "Yilmaz", handzeichen: "Yi", zuletzt: "2026-11-22T10:00:00.000Z" }], zugeteilt: 2, angenommen: 1, aeltesteSeit: "2026-11-22T09:45:00.000Z", rufgruppen: ["TMO 1"] },
  { stelle: "FM2", name: "Fm2", besetzt: [], zugeteilt: 1, angenommen: 0, rufgruppen: [] },
];

describe("Die Arbeitsplätze der FmZ", () => {
  it("zeigt Besetzung, Zuteilungen mit Wartezeit, Rufgruppen und warnt bei Zuteilung an einen leeren Platz", () => {
    render(<Fmzplaetzekarte plaetze={PLAETZE} jetzt="2026-11-22T10:05:00.000Z" />);
    const karte = screen.getByRole("region", { name: "Arbeitsplätze der Fernmeldezentrale" });
    const fm1 = within(karte).getByRole("rowheader", { name: "Fm1" }).closest("tr") as HTMLElement;
    expect(fm1.textContent).toContain("Yilmaz (Yi) · zuletzt vor 5 min");
    expect(fm1.textContent).toContain("2 offen, 1 angenommen · älteste 20 min");
    expect(fm1.textContent).toContain("TMO 1");
    const fm2 = within(karte).getByRole("rowheader", { name: "Fm2" }).closest("tr") as HTMLElement;
    expect(fm2.textContent).toContain("nicht besetzt");
    expect(fm2.textContent).toContain("niemand da");
  });
});
