/**
 * Komponententests zum Blatt „Funkplan" (KONZEPT-FUNKPLAN.md §5, Option 5b).
 *
 * Die Rechnung prüft Ring 2; hier steht die Verdrahtung: der Reiter, der
 * eigene Ruf mit Zeigerstand und Suche, das Band, die beiden Sichten, die
 * Rufgruppenliste mit Kasten, Anlegen, Bearbeiten und Auflösen mit Grund,
 * die Kürzel, die Ausgabe, die Sperre und der Nur-Lesen-Zustand.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BLAETTER } from "./blaetter.js";
import { Funkplan } from "./Funkplan.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { FUNK_ANSICHT } from "./pruefhilfen/funkplanbeispiel.js";
import { BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("funkplanAnfordern", FUNK_ANSICHT);
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({ akteId: "akte-1", lagebild: BEISPIEL_LAGEBILD, fehler: undefined, hinweise: [] });
});

async function geladen(): Promise<void> {
  render(<Funkplan />);
  await waitFor(() => {
    expect(screen.getByRole("table", { name: "Zuordnung je Rufgruppe" })).toBeDefined();
  });
}

function bedient(): unknown[] {
  return attrappe.rufeDerArt("bedienen").map((r) => r.entwurf);
}

describe("Das Blatt „Funkplan“", () => {
  it("steht als Reiter zwischen Führungsstelle und Versorgung", () => {
    const schluessel = BLAETTER.map((b) => b.schluessel);
    expect(schluessel.indexOf("funkplan")).toBe(schluessel.indexOf("fuest") + 1);
    expect(schluessel.indexOf("versorgung")).toBe(schluessel.indexOf("funkplan") + 1);
    expect(BLAETTER.find((b) => b.schluessel === "funkplan")?.titel).toBe("Funkplan");
  });

  it("holt den Plan mit eigenem Ruf und zeigt das Band, „ohne Rufgruppe“ in Bernstein", async () => {
    await geladen();
    expect(attrappe.rufeDerArt("funkplanAnfordern")[0]).toEqual({ art: "funkplanAnfordern", akteId: "akte-1" });
    const band = screen.getByLabelText("Zahlen des Funkplans");
    const ohne = within(band).getByText("ohne Rufgruppe").closest(".kpi");
    expect(ohne?.className).toContain("warn");
    expect(within(band).getByText("DMO · Gateway").closest(".kpi")?.textContent).toBe("1DMO · Gateway");
    expect(within(band).getByText("Rufgruppen").closest(".kpi")?.className).not.toContain("warn");
  });

  it("gruppiert je Rufgruppe, nennt DMO und Gateway im Kopf und stellt „ohne Rufgruppe“ ans Ende", async () => {
    await geladen();
    const tabelle = screen.getByRole("table", { name: "Zuordnung je Rufgruppe" });
    const gruppen = within(tabelle).getAllByRole("rowgroup").map((g) => g.getAttribute("aria-label"));
    // Die aufgelöste THW_OL_BR fehlt; eine Gruppe ohne Teilnehmer (Analog) steht da.
    expect(gruppen).toEqual([null, "Rufgruppe THW_OL_FUE", "Rufgruppe THW_OL_EA2", "Rufgruppe DMO 310", "Rufgruppe 2 m K 55 G/U", "ohne Rufgruppe"]);
    const dmo = within(tabelle).getByRole("rowgroup", { name: "Rufgruppe DMO 310" });
    expect(within(dmo).getAllByText("DMO")[0]?.className).toContain("warn");
    expect(within(dmo).getByText(/Gateway Heros Varel 25\/10/)).toBeDefined();
    const ohne = within(tabelle).getByRole("rowgroup", { name: "ohne Rufgruppe" });
    expect(within(ohne).getByText("SEG DLRG Oldenburg")).toBeDefined();
    expect(within(ohne).getByText("THW_OL_BR").className).toContain("durchgestrichen");
    const ortung = within(tabelle).getByRole("row", { name: /FGr Ortung 1 OV Varel/ });
    expect(within(ortung).getByText("Bereich ≠ Gruppe").className).toContain("warn");
    expect(within(ortung).getByText("Nicht einsatzbereit")).toBeDefined();
  });

  it("schaltet auf „Je Bereich“ mit der Rufgruppe als Spalte", async () => {
    await geladen();
    fireEvent.click(screen.getByRole("button", { name: "Je Bereich" }));
    const tabelle = screen.getByRole("table", { name: "Zuordnung je Bereich" });
    const ea1 = within(tabelle).getByRole("rowgroup", { name: "Bereich EA 1 Deich Nord" });
    expect(within(ea1).getByText(/2 Einheiten · alle erreichbar/)).toBeDefined();
    expect(within(ea1).getAllByText("THW_OL_EA2")).toHaveLength(1);
    const ang = within(tabelle).getByRole("rowgroup", { name: "Bereich Angefordert" });
    expect(within(ang).getByText(/2 ohne Rufgruppe/)).toBeDefined();
  });

  it("schickt die Suche an den Worker", async () => {
    await geladen();
    fireEvent.change(screen.getByLabelText(/Suche nach Einheit/), { target: { value: " Varel " } });
    await waitFor(() => {
      expect(attrappe.letzterRuf("funkplanAnfordern")).toEqual({ art: "funkplanAnfordern", akteId: "akte-1", suche: "Varel" });
    });
  });

  it("zeigt die gewählte Rufgruppe im Kasten und die aufgelösten blass am Ende", async () => {
    await geladen();
    const liste = screen.getByRole("table", { name: "Liste der Rufgruppen" });
    const zeilen = within(liste).getAllByRole("row").slice(1);
    expect(zeilen.at(-1)?.className).toContain("blass");
    expect(within(zeilen.at(-1) as HTMLElement).getByText(/aufgelöst 1210/)).toBeDefined();
    fireEvent.click(within(liste).getByText("THW_OL_EA2"));
    const kasten = screen.getByRole("group", { name: "Gewählte Rufgruppe THW_OL_EA2" });
    expect(within(kasten).getByText("Bei Netzausfall auf DMO 311 ausweichen")).toBeDefined();
    expect(within(kasten).getByText("EA 2 Pumpen Süd")).toBeDefined();
    expect(screen.getByText(/· 4 · 2 TMO · 1 DMO · 1 Analog/)).toBeDefined();
  });

  it("legt eine Rufgruppe über die Maske an — mit Strg+N", async () => {
    await geladen();
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    const maske = screen.getByRole("form", { name: "Rufgruppe anlegen" });
    fireEvent.change(within(maske).getByLabelText("Betriebsart"), { target: { value: "DMO" } });
    fireEvent.change(within(maske).getByLabelText("Name"), { target: { value: "DMO 311" } });
    fireEvent.change(within(maske).getByLabelText("Zweck"), { target: { value: "Ausweich EA 2" } });
    fireEvent.change(within(maske).getByLabelText("Bereich (optional)"), { target: { value: "EA2" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Rufgruppe anlegen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        {
          typ: "RufgruppeAngelegt",
          nutzlast: { rufgruppeId: expect.stringMatching(/^RG-/), betriebsart: "DMO", name: "DMO 311", zweck: "Ausweich EA 2", abschnittId: "EA2" },
        },
      ]);
    });
  });

  it("bearbeitet die gewählte Rufgruppe mit Strg+E und schreibt nur geänderte Felder mit Vorwert", async () => {
    await geladen();
    fireEvent.click(within(screen.getByRole("table", { name: "Liste der Rufgruppen" })).getByText("THW_OL_EA2"));
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    const maske = screen.getByRole("form", { name: "Rufgruppe „THW_OL_EA2“ bearbeiten" });
    expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "R2" });
    fireEvent.change(within(maske).getByLabelText("hört"), { target: { value: "FmZ Platz 2" } });
    fireEvent.change(within(maske).getByLabelText("Bereich (optional)"), { target: { value: "" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([
        { typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R2", feld: "hoert" }, vorher: "Abschnittsleitung EA 2", neu: "FmZ Platz 2", vorwertPruefen: true },
        { typ: "RufgruppeGeaendert", nutzlast: { rufgruppeId: "R2", feld: "abschnittId" }, vorher: "EA2", neu: null, vorwertPruefen: true },
      ]);
    });
    await waitFor(() => {
      expect(attrappe.letzterRuf("sperre")).toEqual({ art: "sperre", akteId: "akte-1", entitaetId: "R2", frei: true });
    });
  });

  it("fragt beim Auflösen einen Grund und stellt eine aufgelöste wieder her", async () => {
    await geladen();
    const liste = screen.getByRole("table", { name: "Liste der Rufgruppen" });
    fireEvent.click(within(liste).getByText("DMO 310"));
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte für DMO 310" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Auflösen …" }));
    const maske = screen.getByRole("form", { name: /auflösen/ });
    expect(within(maske).getByText(/1 Einheit stehen danach als „ohne Rufgruppe“/)).toBeDefined();
    expect((within(maske).getByRole("button", { name: "Auflösen" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(maske).getByRole("textbox"), { target: { value: "Netz wieder da" } });
    fireEvent.click(within(maske).getByRole("button", { name: "Auflösen" }));
    await waitFor(() => {
      expect(bedient()).toEqual([{ typ: "RufgruppeAufgeloest", nutzlast: { rufgruppeId: "R3" }, vorher: null, neu: true, grund: "Netz wieder da" }]);
    });
    fireEvent.click(within(liste).getByText("THW_OL_BR"));
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte für THW_OL_BR" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Wiederherstellen" }));
    await waitFor(() => {
      expect(bedient()).toHaveLength(2);
    });
    expect(bedient()[1]).toEqual({ typ: "RufgruppeWiederhergestellt", nutzlast: { rufgruppeId: "R5" }, vorher: true, neu: false });
  });

  it("warnt, wenn ein anderer Arbeitsplatz die Rufgruppe bearbeitet, und öffnet erst beim zweiten Versuch", async () => {
    const peer = { clientId: "c2", anzeigename: "Lage 2", rechnername: "r2", veraltet: false, bearbeitet: ["R1"] };
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, peers: [peer] } as never });
    await geladen();
    // Der Hörer des Kürzels hängt an einem Effekt, der die frisch geladene Wahl
    // erst nach dem Zeichnen sieht. Unter Last trifft ein sofortiges Strg+E noch
    // den alten Hörer (keine Wahl) und bewirkt nichts — gedrückt wird deshalb,
    // bis die Warnung steht; der erste Druck beim neuen Hörer warnt.
    await waitFor(() => {
      fireEvent.keyDown(window, { key: "e", ctrlKey: true });
      expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/wird von Lage 2 bearbeitet/);
    });
    expect(screen.queryByRole("form", { name: /bearbeiten/ })).toBeNull();
    fireEvent.keyDown(window, { key: "e", ctrlKey: true });
    expect(screen.getByRole("form", { name: "Rufgruppe „THW_OL_FUE“ bearbeiten" })).toBeDefined();
  });

  it("springt mit Strg+F in die Suche", async () => {
    await geladen();
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    expect(document.activeElement).toBe(screen.getByLabelText(/Suche nach Einheit/));
  });

  it("bietet den Funkplan als Ausdruck im Menü „⋯“ an", async () => {
    attrappe.antwortet("ausgabeErzeugen", { pfad: "/share/ausgaben/funkplan_1.html", bytes: 10 });
    await geladen();
    expect(screen.queryByRole("button", { name: "Funkplan als HTML" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte im Funkplan" }));
    expect(screen.getByRole("menuitem", { name: "Funkplan als PDF" })).toBeDefined();
    fireEvent.click(screen.getByRole("menuitem", { name: "Funkplan als HTML" }));
    await waitFor(() => {
      expect(attrappe.rufeDerArt("ausgabeErzeugen")[0]).toMatchObject({ ausgabe: "funkplan", format: "html" });
    });
    await waitFor(() => {
      expect(screen.getByText(/funkplan_1\.html/)).toBeDefined();
    });
  });

  it("trägt „⋯“ nur an der gewählten Rufgruppe und öffnet dieselben Schritte per Rechtsklick", async () => {
    await geladen();
    const liste = screen.getByRole("table", { name: "Liste der Rufgruppen" });
    expect(within(liste).getAllByRole("button", { name: /^Weitere Schritte für/ })).toHaveLength(1);
    expect(within(liste).getByRole("button", { name: "Weitere Schritte für THW_OL_FUE" })).toBeDefined();
    fireEvent.contextMenu(within(liste).getByText("THW_OL_EA2"));
    const menue = screen.getByRole("menu", { name: "Rufgruppe THW_OL_EA2" });
    expect(within(menue).getAllByRole("menuitem").map((e) => e.textContent)).toEqual(["Bearbeiten …Strg+E", "Auflösen …"]);
    fireEvent.click(within(menue).getByRole("menuitem", { name: "Bearbeiten …" }));
    expect(screen.getByRole("form", { name: "Rufgruppe „THW_OL_EA2“ bearbeiten" })).toBeDefined();
  });

  it("zeigt im beendeten Einsatz alles, schreibt aber nichts", async () => {
    useLaden.setState({ lagebild: { ...BEISPIEL_LAGEBILD, einsatzStatus: "BEENDET" } });
    await geladen();
    expect(screen.getByTestId("nurlesen")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Rufgruppe anlegen" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Bearbeiten/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Auflösen …" })).toBeNull();
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(screen.queryByRole("form", { name: "Rufgruppe anlegen" })).toBeNull();
    const zeile = screen.getByRole("row", { name: /FGr WP OV Cloppenburg/ });
    fireEvent.doubleClick(within(zeile).getByText("THW_OL_EA2"));
    expect(screen.queryByLabelText("Rufgruppe für FGr WP OV Cloppenburg")).toBeNull();
  });
});
