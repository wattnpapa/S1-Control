/**
 * Komponententests zur Einheitentabelle (M3.2).
 *
 * Sie messen die Verdrahtung: dass ein Doppelklick eine Zelle bearbeitbar
 * macht, dass Enter das richtige Ereignis mit dem gesehenen `vorher` schickt,
 * dass eine unveränderte Eingabe **nichts** schreibt und dass die
 * Spaltengruppen der Excel zuschaltbar sind. Die fachliche Wirkung steht in
 * `szenarien-einheiten.test.ts`, die Regeln in `bedienschritte.test.ts`.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { projektion, type Tabellenzeile, type Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function zelle(text: string, wert: unknown, umstritten = false): Zelle {
  return { text, wert, umstritten };
}

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
      organisation: zelle("THW", "THW"),
      status: zelle("IM_EINSATZ", "IM_EINSATZ"),
      schicht: zelle("", null),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
      weiblich: zelle("0", null),
    },
    ...teil,
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: [zeile("U1", "Bergungsgruppe 1"), zeile("U2", "Fachgruppe N")],
    gesamtzahl: 2,
    von: 0,
    jeStatus: { IM_EINSATZ: { anzahl: 2, gesamt: 18 }, ANGEFORDERT: { anzahl: 1, gesamt: 9 } },
  });
  attrappe.antwortet("untertabelleAnfordern", {
    lageZeiger: 5,
    einheitId: "U1",
    fahrzeuge: [],
    personen: [],
    auftraege: [],
  });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    untertabelle: undefined,
    tabellenfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

async function zeigeTabelle(einheitId?: string): Promise<void> {
  render(
    <Einheitentabelle abschnittId={undefined} einheitId={einheitId} aufEinheit={() => undefined} />,
  );
  await waitFor(() => {
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });
}

describe("Die Einheitentabelle", () => {
  it("zeigt die Grunddaten und die Stärke, aber nicht die ausgeblendeten Gruppen", async () => {
    await zeigeTabelle();
    // Die Vorbelegung folgt der Excel: L:Y, AC:AI und AN:AW sind in der
    // Vorlage ausgeblendet und per Menü zuschaltbar.
    expect(screen.getByRole("columnheader", { name: "Bezeichnung" })).toBeDefined();
    expect(screen.queryByRole("columnheader", { name: "Weibl." })).toBeNull();
    expect(projektion.SICHTBARE_GRUPPEN_VORBELEGUNG).toEqual(["GRUNDDATEN", "STAERKE"]);
  });

  it("schaltet eine Spaltengruppe zu und wieder ab", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: "Logistik" }));
    expect(screen.getByRole("columnheader", { name: "Weibl." })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Logistik" }));
    expect(screen.queryByRole("columnheader", { name: "Weibl." })).toBeNull();
  });

  it("lässt die Grunddaten nicht wegschalten", async () => {
    await zeigeTabelle();
    // Eine Tabelle ohne Bezeichnung und Status ist keine Lage.
    expect(screen.getByRole("button", { name: "Grunddaten" }).hasAttribute("disabled")).toBe(true);
  });

  it("schreibt eine Inline-Änderung mit dem gesehenen Vorher-Wert (§2.2a)", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    const feld = screen.getByLabelText("Bezeichnung");
    fireEvent.change(feld, { target: { value: "Bergungsgruppe Nord" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.typ).toBe("EinheitStammdatenGeaendert");
    expect(entwurf?.vorher).toBe("Bergungsgruppe 1");
    expect(entwurf?.neu).toBe("Bergungsgruppe Nord");
  });

  it("schreibt nichts, wenn sich der Wert nicht geändert hat", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    fireEvent.keyDown(screen.getByLabelText("Bezeichnung"), { key: "Enter" });
    // Ein Ereignis, das denselben Wert noch einmal setzt, steht für immer im
    // Protokoll und erzeugt bei einem zweiten Arbeitsplatz einen
    // Konfliktkandidaten ohne fachlichen Anlass.
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("schreibt die Stärke als Tripel und nichts bei unveränderter Eingabe", async () => {
    await zeigeTabelle();
    const zelle = screen.getAllByText("0/1/8")[0]!;
    fireEvent.doubleClick(zelle);
    const feld = screen.getByLabelText("Fü / UFü / He");
    fireEvent.keyDown(feld, { key: "Enter" });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    fireEvent.doubleClick(screen.getAllByText("0/1/8")[0]!);
    const feld2 = screen.getByLabelText("Fü / UFü / He");
    fireEvent.change(feld2, { target: { value: "0/1/6" } });
    fireEvent.keyDown(feld2, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("StaerkeGeaendert");
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.neu).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 6 });
  });

  it("schreibt keinen Text in die Stärke, sondern nennt die Regel und lässt die Zelle offen", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getAllByText("0/1/8")[0]!);
    const feld = screen.getByLabelText("Fü / UFü / He");
    fireEvent.change(feld, { target: { value: "acht" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
    expect(screen.getByText(/Stärke als Fü\/UFü\/He/)).toBeDefined();
    expect(screen.getByLabelText("Fü / UFü / He")).toBeDefined();
    fireEvent.keyDown(screen.getByLabelText("Fü / UFü / He"), { key: "Escape" });
    expect(screen.queryByLabelText("Fü / UFü / He")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("schreibt nach Escape auch dann nichts, wenn das Feld beim Verschwinden den Fokus verliert", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getAllByText("0/1/8")[0]!);
    const feld = screen.getByLabelText("Fü / UFü / He");
    fireEvent.change(feld, { target: { value: "1/2/1" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    fireEvent.blur(feld);
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("verwirft die Bearbeitung mit Escape", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    const feld = screen.getByLabelText("Bezeichnung");
    fireEvent.change(feld, { target: { value: "Ganz anders" } });
    fireEvent.keyDown(feld, { key: "Escape" });
    expect(screen.queryByLabelText("Bezeichnung")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("macht eine berechnete Spalte nicht bearbeitbar", async () => {
    await zeigeTabelle();
    // „Gesamt" ist in der Excel eine Formel; sie zu schreiben hieße, eine
    // Summe gegen ihre Summanden setzen zu können.
    fireEvent.doubleClick(screen.getAllByText("9")[0] as HTMLElement);
    expect(screen.queryByLabelText("Gesamt")).toBeNull();
  });

  it("markiert eine umstrittene Zelle (§3.8)", async () => {
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 5,
      zeilen: [
        zeile("U1", "Bergungsgruppe 1", {
          zellen: {
            ...zeile("U1", "Bergungsgruppe 1").zellen,
            status: zelle("RUHE", "RUHE", true),
          },
        }),
      ],
      gesamtzahl: 1,
      von: 0,
    });
    await zeigeTabelle();
    expect(screen.getByLabelText("Konflikthinweis")).toBeDefined();
  });

  it("sperrt die Mehrfachhandlungen, solange nichts markiert ist", async () => {
    await zeigeTabelle();
    expect(screen.getByRole("button", { name: /Verschieben/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Zusammenführen" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    expect(screen.getByRole("button", { name: /Verschieben/ }).hasAttribute("disabled")).toBe(false);
    // Zusammenführen braucht mindestens zwei — mit einer einzigen Einheit
    // gäbe es nichts zusammenzuführen.
    expect(screen.getByRole("button", { name: "Zusammenführen" }).hasAttribute("disabled")).toBe(true);
  });

  it("markiert mehrere Einheiten mit Strg und öffnet die Verschiebemaske", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"), { ctrlKey: true });
    fireEvent.click(screen.getByText("Fachgruppe N"), { ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: /Verschieben/ }));
    expect(screen.getByLabelText("2 Einheit(en) verschieben")).toBeDefined();
  });

  it("belegt beim Verschieben kein Ziel vor und sperrt das Übernehmen, bis ein anderer Abschnitt gewählt ist", async () => {
    useLaden.setState({
      baum: {
        lageZeiger: 5,
        baum: [
          { id: "EO", name: "Deich Nord", typ: "EINSATZORT", tiefe: 0, kinder: [] },
          { id: "EA-SUED", name: "Deich Süd", typ: "EINSATZORT", tiefe: 0, kinder: [] },
        ],
      } as never,
    });
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    fireEvent.click(screen.getByRole("button", { name: /Verschieben/ }));
    const maske = screen.getByLabelText("1 Einheit(en) verschieben");
    const uebernehmen = maske.querySelector<HTMLButtonElement>("button.haupt, button[type=submit]") ?? screen.getByRole("button", { name: "Übernehmen" });
    expect(uebernehmen.disabled).toBe(true);
    const wahl = maske.querySelector("select") as HTMLSelectElement;
    expect(wahl.value).toBe("");
    fireEvent.change(wahl, { target: { value: "EO" } });
    expect(uebernehmen.disabled).toBe(true);
    fireEvent.change(wahl, { target: { value: "EA-SUED" } });
    expect(uebernehmen.disabled).toBe(false);
  });

  it("nennt unter der Tabelle den Ausschnitt, wenn nicht alles gezeigt wird", async () => {
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 5,
      zeilen: [zeile("U1", "Bergungsgruppe 1")],
      gesamtzahl: 150,
      von: 0,
    });
    await zeigeTabelle();
    expect(screen.getByText("1 von 150 Einheiten")).toBeDefined();
  });

  it("zählt je Status in der Reihenfolge der Excel und filtert per Klick", async () => {
    await zeigeTabelle();
    const leiste = screen.getByRole("group", { name: "Status" });
    const knoepfe = leiste.querySelectorAll("button");
    expect(Array.from(knoepfe).map((k) => k.textContent)).toEqual(["Angefordert1", "Einsatz2"]);
    fireEvent.click(screen.getByRole("button", { name: /Angefordert/ }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.status).toEqual(["ANGEFORDERT"]);
    });
    fireEvent.click(screen.getByRole("button", { name: "Alle zeigen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.status).toBeUndefined();
    });
  });

  it("nennt am Anlegeknopf beide Wege und nicht nur die Vorlage", async () => {
    await zeigeTabelle();
    expect(screen.getByRole("button", { name: "Aus Vorlage" }).getAttribute("title")).toBe("Einheit anlegen (Strg+N)");
  });

  describe("Zeile kopieren", () => {
    function mitQuelle(): void {
      useLaden.setState({
        baum: { lageZeiger: 5, baum: [{ id: "EO", name: "Deich Nord", typ: "EINSATZORT", tiefe: 0, kinder: [] }] } as never,
      });
      attrappe.antwortet("tabelleAnfordern", {
        lageZeiger: 5,
        zeilen: [
          zeile("U1", "Bergungsgruppe 1", {
            zellen: { ...zeile("U1", "Bergungsgruppe 1").zellen, ebene: zelle("Gruppe", "GRUPPE") },
            herkunftName: "THW OV Hude",
            vorlageId: "thw-b",
          }),
          zeile("U2", "Fachgruppe N"),
        ],
        gesamtzahl: 2,
        von: 0,
      });
    }

    it("ist nur bei genau einer markierten Zeile bedienbar", async () => {
      mitQuelle();
      await zeigeTabelle();
      const knopf = screen.getByRole("button", { name: "Kopieren" });
      expect(knopf.hasAttribute("disabled")).toBe(true);
      expect(knopf.getAttribute("title")).toMatch(/\(Strg\+K\)$/u);
      fireEvent.click(screen.getByText("Bergungsgruppe 1"));
      expect(knopf.hasAttribute("disabled")).toBe(false);
      fireEvent.click(screen.getByText("Fachgruppe N"), { ctrlKey: true });
      expect(knopf.hasAttribute("disabled")).toBe(true);
    });

    it("öffnet die Anlegemaske vorbelegt und schreibt eine neue, angeforderte Einheit", async () => {
      mitQuelle();
      await zeigeTabelle();
      fireEvent.click(screen.getByText("Bergungsgruppe 1"));
      fireEvent.click(screen.getByRole("button", { name: "Kopieren" }));

      const maske = screen.getByLabelText("„Bergungsgruppe 1“ kopieren");
      expect(screen.getByRole("button", { name: "Ohne Vorlage" }).getAttribute("aria-pressed")).toBe("true");
      expect((screen.getByLabelText("Bezeichnung") as HTMLInputElement).value).toBe("Bergungsgruppe 1 (2)");
      expect((screen.getByLabelText("Ebene") as HTMLSelectElement).value).toBe("GRUPPE");
      expect((screen.getByLabelText("Herkunft") as HTMLInputElement).value).toBe("THW OV Hude");
      expect((screen.getByLabelText("Mannschaft") as HTMLInputElement).value).toBe("8");
      expect(maske.textContent).toMatch(/Aufträge, Fahrzeuge, Personen, Status und Zeiten der Quelle werden nicht übernommen/u);

      fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));
      await waitFor(() => {
        expect(attrappe.letzterRuf("bedienen")).toBeDefined();
      });
      const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
      expect(entwurf?.typ).toBe("EinheitGemeldet");
      const nutzlast = entwurf?.nutzlast as Record<string, unknown>;
      expect(nutzlast).toMatchObject({
        abschnittId: "EO",
        bezeichnung: "Bergungsgruppe 1 (2)",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
        status: "ANGEFORDERT",
        hierarchie: [{ art: "ORTSVERBAND", name: "THW OV Hude" }],
        vorlageId: "thw-b",
      });
      expect(nutzlast["einheitId"]).not.toBe("U1");
    });

    it("öffnet die Kopie mit Strg+K, aber nicht ohne markierte Zeile", async () => {
      mitQuelle();
      await zeigeTabelle();
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.queryByLabelText(/kopieren$/u)).toBeNull();
      fireEvent.click(screen.getByText("Fachgruppe N"));
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      expect(screen.getByLabelText("„Fachgruppe N“ kopieren")).toBeDefined();
      expect((screen.getByLabelText("Bezeichnung") as HTMLInputElement).value).toBe("Fachgruppe N (2)");
    });
  });

  it("reicht die Suche als Filter an den Worker weiter", async () => {
    await zeigeTabelle();
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "Fachgruppe" } });
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.suche).toBe("Fachgruppe");
    });
  });
});
