/**
 * Die Einsatzliste der Auswahl: Status, letzte Änderung, Einheiten,
 * Ordnung und Absetzung der Beendeten — und der Doppelname beim Anlegen.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Auswahl } from "./Einsatzauswahl.js";
import { Einsatzliste, ordneEinsatzliste, zeitText } from "./Einsatzliste.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { merkeStand } from "./sitzung.js";

afterEach(cleanup);

const EINSAETZE = [
  { ordner: "a", name: "Hochwasser Nord", datum: "2026-10-01", geaendert: "2026-10-30T10:00:00.000Z" },
  { ordner: "b", name: "Sturm Süd", datum: "2026-10-20", geaendert: "2026-10-31T08:00:00.000Z" },
  { ordner: "c", name: "Übung Alt", datum: "2026-05-01", geaendert: "2026-10-31T09:00:00.000Z" },
];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Ordnung", () => {
  it("sortiert nach zuletzt genutzt und setzt Beendete und Archivierte ab", () => {
    merkeStand("c", { status: "ARCHIVIERT", einheiten: 4, genutzt: Date.parse("2026-10-31T09:30:00.000Z") });
    merkeStand("a", { status: "AKTIV", einheiten: 12, genutzt: Date.parse("2026-10-31T10:00:00.000Z") });
    const { aktuell, abgeschlossen } = ordneEinsatzliste(EINSAETZE, JSON.parse(localStorage.getItem("s1.einsatzstaende") ?? "{}"));
    expect(aktuell.map((z) => z.einsatz.ordner)).toEqual(["a", "b"]);
    expect(abgeschlossen.map((z) => z.einsatz.ordner)).toEqual(["c"]);
  });

  it("nennt heute und gestern beim Namen", () => {
    const jetzt = new Date(2026, 9, 31, 12, 0).getTime();
    expect(zeitText(new Date(2026, 9, 31, 9, 5).getTime(), jetzt)).toBe("heute, 09:05");
    expect(zeitText(new Date(2026, 9, 30, 23, 59).getTime(), jetzt)).toBe("gestern, 23:59");
    expect(zeitText(new Date(2026, 8, 3, 16, 5).getTime(), jetzt)).toBe("03.09.2026, 16:05");
  });
});

describe("Darstellung", () => {
  it("zeigt Status, letzte Änderung und Einheiten je Einsatz — und einen Strich, wo nichts bekannt ist", () => {
    merkeStand("a", { status: "AKTIV", einheiten: 12, genutzt: Date.parse("2026-10-31T10:00:00.000Z") });
    merkeStand("c", { status: "BEENDET", einheiten: 4, genutzt: Date.parse("2026-10-31T09:30:00.000Z") });
    render(<Einsatzliste einsaetze={EINSAETZE} aufOeffnen={() => undefined} />);

    const a = screen.getByRole("button", { name: /Hochwasser Nord/ });
    expect(a.textContent).toContain("Status: laufend");
    expect(a.textContent).toContain("Einheiten: 12");
    expect(a.textContent).toContain("Letzte Änderung:");

    const b = screen.getByRole("button", { name: /Sturm Süd/ });
    expect(b.textContent).toContain("Status: —");
    expect(b.textContent).toContain("Einheiten: —");

    const ueberschrift = screen.getByRole("heading", { name: "Beendet und archiviert" });
    const abgesetzt = ueberschrift.nextElementSibling as HTMLElement;
    expect(within(abgesetzt).getByRole("button", { name: /Übung Alt/ }).textContent).toContain("Status: beendet");
  });

  it("öffnet den gewählten Einsatz", async () => {
    const geoeffnet: string[] = [];
    render(<Einsatzliste einsaetze={EINSAETZE} aufOeffnen={(o) => geoeffnet.push(o)} />);
    await userEvent.click(screen.getByRole("button", { name: /Sturm Süd/ }));
    expect(geoeffnet).toEqual(["b"]);
  });
});

describe("Doppelter Einsatzname", () => {
  let attrappe: Attrappe;
  beforeEach(() => {
    attrappe = baueAttrappe();
    useLaden.setState({
      akteId: undefined,
      einsaetze: [],
      einstellungen: { sharePfad: "/share", anzeigename: "FüSt" },
      umgebung: { plattform: "web", electron: "", programmversion: "0", rechnername: "r", clientId: "c" },
      fehler: undefined,
    });
  });

  it("zeigt den Klartext, nie einen Serverpfad, und behält den eingetippten Namen", async () => {
    attrappe.scheitert("einsatzAnlegen", "Ein Einsatz mit diesem Namen existiert bereits.");
    render(<Auswahl />);
    await userEvent.type(screen.getByLabelText("Neuer Einsatz"), "Übung Weser");
    await userEvent.click(screen.getByRole("button", { name: "Anlegen" }));
    await waitFor(() => {
      expect(useLaden.getState().fehler).toBe("Ein Einsatz mit diesem Namen existiert bereits.");
    });
    expect(useLaden.getState().fehler).not.toMatch(/EEXIST|\/share|tmp/);
    expect((screen.getByLabelText("Neuer Einsatz") as HTMLInputElement).value).toBe("Übung Weser");
  });
});
