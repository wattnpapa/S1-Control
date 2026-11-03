/**
 * Die Einsatzliste der Auswahl: Status, letzte Änderung, Einheiten,
 * Ordnung und Absetzung der Beendeten, „Öffnen" gefüllt beim zuletzt
 * genutzten — und „Neuer Einsatz …" mit Stammdaten und dem Doppelnamen.
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
  it("zeigt je Einsatz Name, Datum, Status, Einheiten und Stand — und einen Strich, wo nichts bekannt ist", () => {
    merkeStand("a", { status: "AKTIV", einheiten: 12, genutzt: Date.parse("2026-10-31T10:00:00.000Z") });
    merkeStand("c", { status: "BEENDET", einheiten: 4, genutzt: Date.parse("2026-10-31T09:30:00.000Z") });
    render(<Einsatzliste einsaetze={EINSAETZE} aufOeffnen={() => undefined} />);

    const zeilen = within(screen.getByRole("list", { name: "Einsätze auf dem Share" })).getAllByRole("listitem");
    expect(zeilen.map((z) => z.querySelector("strong")?.textContent)).toEqual(["Hochwasser Nord", "Sturm Süd", "Übung Alt"]);
    const [a, b, c] = zeilen as [HTMLElement, HTMLElement, HTMLElement];
    expect(a.textContent).toContain("01.10.2026");
    expect(within(a).getByText("laufend").className).toContain("ok");
    expect(a.textContent).toContain("12 Einh.");
    expect(a.textContent).toMatch(/Stand \S/);
    expect(b.textContent).toContain("Status —");
    expect(b.textContent).toContain("— Einh.");
    expect(c.className).toContain("blass");
    expect(c.textContent).toContain("beendet, nur lesen");
  });

  it("füllt „Öffnen“ beim zuletzt genutzten und bietet bei Beendeten „Ansehen“", () => {
    merkeStand("a", { status: "AKTIV", einheiten: 12, genutzt: Date.parse("2026-10-31T10:00:00.000Z") });
    merkeStand("c", { status: "ARCHIVIERT", einheiten: 4, genutzt: Date.parse("2026-10-31T09:30:00.000Z") });
    render(<Einsatzliste einsaetze={EINSAETZE} aufOeffnen={() => undefined} />);
    expect(screen.getByRole("button", { name: "Hochwasser Nord öffnen" }).className).toBe("haupt");
    expect(screen.getByRole("button", { name: "Sturm Süd öffnen" }).className).toBe("");
    expect(screen.getByRole("button", { name: "Übung Alt ansehen" }).textContent).toBe("Ansehen");
  });

  it("öffnet den gewählten Einsatz", async () => {
    const geoeffnet: string[] = [];
    render(<Einsatzliste einsaetze={EINSAETZE} aufOeffnen={(o) => geoeffnet.push(o)} />);
    await userEvent.click(screen.getByRole("button", { name: "Sturm Süd öffnen" }));
    expect(geoeffnet).toEqual(["b"]);
  });
});

describe("Neuer Einsatz", () => {
  let attrappe: Attrappe;
  beforeEach(() => {
    attrappe = baueAttrappe();
    attrappe.antwortet("einsaetzeAuflisten", []);
    useLaden.setState({
      akteId: undefined,
      einsaetze: [],
      einstellungen: { sharePfad: "/share", anzeigename: "FüSt" },
      umgebung: { plattform: "web", electron: "", programmversion: "0", rechnername: "r", clientId: "c" },
      beschaeftigt: false,
      fehler: undefined,
    });
  });

  async function maske(): Promise<HTMLElement> {
    render(<Auswahl />);
    await userEvent.click(screen.getByRole("button", { name: "Neuer Einsatz …" }));
    return screen.getByRole("form", { name: "Neuer Einsatz" });
  }

  it("öffnet eine Maske mit Name, Datum und den Stammdaten; ohne Name und FüSt sagt sie, was fehlt", async () => {
    const m = await maske();
    for (const feld of ["Einsatzname / Bezeichnung", "Datum", "Name der Führungsstelle (FüSt)", "Übergeordnete Führungsstelle", "Einsatzort", "Einsatzart", "Schichtmodell"]) {
      expect(within(m).getByLabelText(feld)).toBeDefined();
    }
    expect((within(m).getByLabelText("Datum") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((within(m).getByRole("button", { name: "Einsatz anlegen" }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(m).getByTestId("bereitgrund").textContent).toBe("Der Einsatzname darf nicht leer sein.");
    await userEvent.type(within(m).getByLabelText("Einsatzname / Bezeichnung"), "Übung Weser");
    expect(within(m).getByTestId("bereitgrund").textContent).toBe("Der Name der Führungsstelle darf nicht leer sein.");
  });

  it("legt mit FüSt, Art und Beginn an und schreibt übergeordnete FüSt und Ort gleich danach", async () => {
    attrappe.antwortet("einsatzAnlegen", { akteId: "akte-9", einsatzId: "2026-11-03_uebung", ordner: "2026-11-03_uebung" });
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
    const m = await maske();
    await userEvent.type(within(m).getByLabelText("Einsatzname / Bezeichnung"), "Übung Weser");
    await userEvent.clear(within(m).getByLabelText("Datum"));
    await userEvent.type(within(m).getByLabelText("Datum"), "2026-11-03");
    await userEvent.type(within(m).getByLabelText("Name der Führungsstelle (FüSt)"), "FüSt OV Oldenburg");
    await userEvent.type(within(m).getByLabelText("Übergeordnete Führungsstelle"), "FüSt LV NI");
    await userEvent.type(within(m).getByLabelText("Einsatzort"), "Brake");
    await userEvent.selectOptions(within(m).getByLabelText("Einsatzart"), "UEBUNG");
    await userEvent.click(within(m).getByRole("button", { name: "Einsatz anlegen" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(2);
    });
    expect(attrappe.letzterRuf("einsatzAnlegen")).toMatchObject({
      name: "Übung Weser",
      datum: "2026-11-03",
      einsatzArt: "UEBUNG",
      fuestName: "FüSt OV Oldenburg",
      schichtmodell: "ZWEI_SCHICHT",
    });
    expect(attrappe.rufeDerArt("bedienen").map((r) => r.entwurf)).toEqual([
      { typ: "EinsatzStammdatenGeaendert", nutzlast: { einsatzId: "2026-11-03_uebung", feld: "uebergeordneteFuestName" }, vorher: null, neu: "FüSt LV NI" },
      { typ: "EinsatzStammdatenGeaendert", nutzlast: { einsatzId: "2026-11-03_uebung", feld: "ort" }, vorher: null, neu: "Brake" },
    ]);
    expect(useLaden.getState().akteId).toBe("akte-9");
  });

  it("schreibt ohne übergeordnete FüSt und Ort nichts nach", async () => {
    attrappe.antwortet("einsatzAnlegen", { akteId: "akte-9", einsatzId: "e", ordner: "e" });
    const m = await maske();
    await userEvent.type(within(m).getByLabelText("Einsatzname / Bezeichnung"), "Sturm");
    await userEvent.type(within(m).getByLabelText("Name der Führungsstelle (FüSt)"), "FüSt");
    await userEvent.click(within(m).getByRole("button", { name: "Einsatz anlegen" }));
    await waitFor(() => {
      expect(useLaden.getState().akteId).toBe("akte-9");
    });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("zeigt bei doppeltem Namen den Klartext, nie einen Serverpfad, und behält die Eingaben", async () => {
    attrappe.scheitert("einsatzAnlegen", "Ein Einsatz mit diesem Namen existiert bereits.");
    const m = await maske();
    await userEvent.type(within(m).getByLabelText("Einsatzname / Bezeichnung"), "Übung Weser");
    await userEvent.type(within(m).getByLabelText("Name der Führungsstelle (FüSt)"), "FüSt");
    await userEvent.click(within(m).getByRole("button", { name: "Einsatz anlegen" }));
    await waitFor(() => {
      expect(useLaden.getState().fehler).toBe("Ein Einsatz mit diesem Namen existiert bereits.");
    });
    expect(useLaden.getState().fehler).not.toMatch(/EEXIST|\/share|tmp/);
    const offen = screen.getByRole("form", { name: "Neuer Einsatz" });
    expect((within(offen).getByLabelText("Einsatzname / Bezeichnung") as HTMLInputElement).value).toBe("Übung Weser");
    expect(within(offen).getByRole("alert").textContent).toBe("Ein Einsatz mit diesem Namen existiert bereits.");
  });
});
