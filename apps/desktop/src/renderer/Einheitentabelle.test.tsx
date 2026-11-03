/**
 * Komponententests zur Einheitentabelle (M3.2).
 *
 * Sie messen die Verdrahtung: dass ein Doppelklick eine Zelle bearbeitbar
 * macht, dass Enter das richtige Ereignis mit dem gesehenen `vorher` schickt,
 * dass eine unveränderte Eingabe **nichts** schreibt und dass die
 * Spaltengruppen der Excel zuschaltbar sind. Die fachliche Wirkung steht in
 * `szenarien-einheiten.test.ts`, die Regeln in `bedienschritte.test.ts`.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { projektion, type Tabellenzeile, type Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { peer } from "../kontrakt/pruefhilfen.js";

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
    zaehlklasse: "ist",
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

/** Schaltet im Menü „Spalten ▾“ einen Eintrag um; das Menü bleibt dabei offen. */
function spaltenmenue(name: string): void {
  if (screen.queryByRole("menu", { name: "Spalten" }) === null) fireEvent.click(screen.getByRole("button", { name: "Spalten" }));
  fireEvent.click(screen.getByRole("menuitemcheckbox", { name }));
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
  attrappe.antwortet("sperre", null);
  useLaden.setState({
    akteId: "akte-1",
    lagebild: undefined,
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

  it("schaltet eine Spaltengruppe im Menü „Spalten“ zu und wieder ab", async () => {
    await zeigeTabelle();
    // Keine Reihe „Spalten:“ mit Kontrollkästchen mehr über der Tabelle.
    expect(screen.queryByRole("checkbox", { name: "Logistik" })).toBeNull();
    const knopf = screen.getByRole("button", { name: "Spalten" });
    expect(knopf.getAttribute("aria-haspopup")).toBe("menu");
    spaltenmenue("Logistik");
    expect(screen.getByRole("columnheader", { name: "Weibl." })).toBeDefined();
    expect(screen.getByRole("menuitemcheckbox", { name: "Logistik" }).getAttribute("aria-checked")).toBe("true");
    spaltenmenue("Logistik");
    expect(screen.queryByRole("columnheader", { name: "Weibl." })).toBeNull();
  });

  it("lässt die Grunddaten nicht wegschalten", async () => {
    await zeigeTabelle();
    // Eine Tabelle ohne Bezeichnung und Status ist keine Lage.
    spaltenmenue("Grunddaten");
    const grunddaten = screen.getByRole("menuitemcheckbox", { name: "Grunddaten" });
    expect(grunddaten.getAttribute("aria-checked")).toBe("true");
    expect(grunddaten.getAttribute("aria-disabled")).toBe("true");
    expect(grunddaten.textContent).toContain("immer");
    expect(screen.getByRole("columnheader", { name: "Bezeichnung" })).toBeDefined();
  });

  it("führt im Menü „Spalten“ die sechs Gruppen, die Gliederung, Stillgelegte und das Zurücksetzen", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: "Spalten" }));
    const menue = screen.getByRole("menu", { name: "Spalten" });
    expect(within(menue).getAllByRole("menuitemcheckbox").map((e) => e.textContent)).toEqual([
      "Grunddatenimmer",
      "Stärke",
      "Ressourcen",
      "Logistik",
      "Kosten",
      "Funk",
      "Gliederung nach Bereich",
      "Stillgelegte zeigen",
    ]);
    fireEvent.click(within(menue).getByRole("menuitemcheckbox", { name: "Stillgelegte zeigen" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.mitStillgelegten).toBe(true);
    });
    fireEvent.click(within(menue).getByRole("menuitemcheckbox", { name: "Kosten" }));
    fireEvent.click(within(menue).getByRole("menuitem", { name: "Spalten zurücksetzen" }));
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.mitStillgelegten).toBeUndefined();
    });
    expect(screen.getByRole("group", { name: "Filter nach Status" }).textContent).toContain("Spalten Grunddaten, Stärke");
  });

  it("nennt in der Filterzeile rechts, was das Menü „Spalten“ eingestellt hat", async () => {
    await zeigeTabelle();
    const filter = screen.getByRole("group", { name: "Filter nach Status" });
    expect(filter.textContent).toMatch(/^Filter/);
    expect(filter.textContent).toContain("Spalten Grunddaten, Stärke");
    spaltenmenue("Funk");
    expect(filter.textContent).toContain("Spalten Grunddaten, Stärke, Funk");
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

  it("schickt den Wert vom Öffnen als Vorwert und lehnt ein fremd geändertes Feld ab, statt zu überschreiben", async () => {
    await zeigeTabelle();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    const feld = screen.getByLabelText("Bezeichnung");
    // Während der Editor offen ist, setzt ein Kollege einen anderen Wert.
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 6,
      zeilen: [zeile("U1", "Bergungsgruppe Kollege"), zeile("U2", "Fachgruppe N")],
      gesamtzahl: 2,
      von: 0,
      jeStatus: {},
    });
    attrappe.antwortet("bedienen", {
      art: "abgewiesen",
      meldung: "Wurde inzwischen von Lage 2 geändert (neu: Bergungsgruppe Kollege). Neu laden?",
      code: "VORWERT",
      dauerhafterHinweis: false,
    });
    fireEvent.change(feld, { target: { value: "Bergungsgruppe Nord" } });
    fireEvent.keyDown(feld, { key: "Enter" });

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.vorher).toBe("Bergungsgruppe 1");
    expect(entwurf?.vorwertPruefen).toBe(true);
    await waitFor(() => {
      expect(screen.getByText(/Wurde inzwischen von Lage 2 geändert/)).toBeDefined();
    });
    expect(screen.getByText(/Enter übernimmt Ihren Wert trotzdem/)).toBeDefined();
  });

  it("zeigt die Sperre eines Kollegen an der Zeile und lässt erst beim zweiten Versuch bewusst bearbeiten", async () => {
    useLaden.setState({
      lagebild: { peers: [peer({ clientId: "b", anzeigename: "Lage 2", bearbeitet: ["U1"] })] } as never,
    });
    await zeigeTabelle();
    expect(screen.getByText(/🔒 wird von Lage 2 bearbeitet/)).toBeDefined();
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    expect(screen.queryByLabelText("Bezeichnung")).toBeNull();
    expect(useLaden.getState().hinweise.at(-1)?.text).toMatch(/Zum Bearbeiten trotzdem erneut tippen/);
    fireEvent.doubleClick(screen.getByText("Bergungsgruppe 1"));
    expect(screen.getByLabelText("Bezeichnung")).toBeDefined();
    // Der offene Editor setzt seinerseits die Sperre.
    await waitFor(() => {
      expect(attrappe.letzterRuf("sperre")).toMatchObject({ entitaetId: "U1" });
    });
    useLaden.setState({ lagebild: undefined });
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

  it("zeigt ohne Auswahl keine Zeilenwerkzeuge, auch nicht grau (Entlastung, Leitsatz 2)", async () => {
    await zeigeTabelle();
    expect(screen.queryByRole("toolbar", { name: "Auswahl" })).toBeNull();
    for (const name of [/Verschieben/, /Aufteilen/, /Zusammenführen/, /Kopieren/, /Entfernen/, /Ablösung/, /Funk/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
  });

  it("zeigt mit einer gewählten Zeile die Auswahlleiste mit den Schritten für eine Einheit", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    expect(leiste.textContent).toContain("1 gewählt · Bergungsgruppe 1");
    expect(leiste.textContent).toContain("Esc hebt die Auswahl auf");
    expect(within(leiste).getAllByRole("button").map((k) => k.textContent)).toEqual([
      "VerschiebenStrg+M",
      "Aufteilen",
      "Zusammenführen",
      "KopierenStrg+K",
      "Ablösung anfordern",
      "Funk …",
      "EntfernenStrg+E",
    ]);
    // Zusammenführen braucht mindestens zwei — es steht grau da und sagt, was fehlt.
    const zusammen = within(leiste).getByRole("button", { name: "Zusammenführen" });
    expect(zusammen.getAttribute("aria-disabled")).toBe("true");
    expect(zusammen.getAttribute("title")).toBe("Zwei Einheiten wählen");
    fireEvent.click(zusammen);
    expect(screen.queryByRole("form")).toBeNull();
    // Die Leiste steht am Fuß der Karte, nach der Tabelle und vor dem Tabellenfuß.
    expect(screen.getByRole("table").compareDocumentPosition(leiste) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("lässt bei zwei gewählten Zeilen nur, was mit zweien geht", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    fireEvent.click(screen.getByText("Fachgruppe N"), { ctrlKey: true });
    const leiste = screen.getByRole("toolbar", { name: "Auswahl" });
    expect(leiste.textContent).toContain("2 gewählt");
    expect(within(leiste).getAllByRole("button").map((k) => k.getAttribute("aria-disabled") ?? k.textContent)).toEqual([
      "VerschiebenStrg+M",
      "Zusammenführen",
    ]);
    fireEvent.click(within(leiste).getByRole("button", { name: "Zusammenführen" }));
    expect(screen.getByRole("form")).toBeDefined();
  });

  it("hebt die Auswahl mit Esc auf, und die Leiste verschwindet", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    expect(screen.getByRole("toolbar", { name: "Auswahl" })).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("toolbar", { name: "Auswahl" })).toBeNull();
  });

  it("markiert per Rechtsklick und öffnet dasselbe als Kontextmenü; Esc schließt nur das Menü", async () => {
    const tagebuch: string[] = [];
    render(
      <Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} aufTagebuch={(id) => tagebuch.push(id)} />,
    );
    await screen.findByText("Bergungsgruppe 1");
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    const zeile = screen.getByText("Fachgruppe N").closest("tr") as HTMLElement;
    const ereignis = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 30, clientY: 40 });
    zeile.dispatchEvent(ereignis);
    expect(ereignis.defaultPrevented).toBe(true);

    // Ohne Strg ist die Zeile danach allein markiert.
    await waitFor(() => {
      expect(screen.getByRole("toolbar", { name: "Auswahl" }).textContent).toContain("1 gewählt · Fachgruppe N");
    });
    const menue = screen.getByRole("menu", { name: "1 gewählt · Fachgruppe N" });
    expect(within(menue).getAllByRole("menuitem").map((e) => e.textContent)).toEqual([
      "Verschieben …Strg+M",
      "Aufteilen …",
      "Zusammenführen …",
      "KopierenStrg+K",
      "Ablösung anfordern …",
      "Funk und Erreichbarkeit …",
      "Im Tagebuch zeigen",
      "Entfernen …Strg+E",
    ]);
    expect(within(menue).getByRole("menuitem", { name: "Zusammenführen …" }).getAttribute("title")).toBe("Zwei Einheiten wählen");
    expect(document.activeElement).toBe(within(menue).getAllByRole("menuitem")[0]);

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("toolbar", { name: "Auswahl" })).toBeDefined();

    zeile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Im Tagebuch zeigen" }));
    expect(tagebuch).toEqual(["U2"]);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("öffnet aus dem Kontextmenü die Maske des Schritts", async () => {
    await zeigeTabelle();
    const zeile = screen.getByText("Bergungsgruppe 1").closest("tr") as HTMLElement;
    zeile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Verschieben/ }));
    expect(screen.getByLabelText("1 Einheit(en) verschieben")).toBeDefined();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("nimmt mit Strg und Rechtsklick eine Zeile zur Auswahl dazu", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    const zeile = screen.getByText("Fachgruppe N").closest("tr") as HTMLElement;
    zeile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, ctrlKey: true }));
    expect(await screen.findByRole("menu", { name: "2 gewählt" })).toBeDefined();
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
    const leiste = screen.getByRole("group", { name: "Filter nach Status" });
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

  it("führt im Hauptknopf „Einheit anlegen ▾“ Vorlage, ohne Vorlage und den Erfassungsbogen", async () => {
    let scanner = 0;
    render(
      <Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} aufScanner={() => { scanner += 1; }} />,
    );
    await screen.findByText("Bergungsgruppe 1");
    const knopf = screen.getByRole("button", { name: "Einheit anlegen" });
    expect(knopf.className).toBe("haupt");
    expect(knopf.getAttribute("title")).toContain("Strg+N");
    expect(knopf.getAttribute("title")).toContain("Strg+Q");
    fireEvent.click(knopf);
    const menue = screen.getByRole("menu", { name: "Einheit anlegen" });
    expect(within(menue).getAllByRole("menuitem").map((e) => e.textContent)).toEqual([
      "Aus Vorlage …Strg+N",
      "Ohne Vorlage",
      "Erfassungsbogen einlesen …Strg+Q",
    ]);
    fireEvent.click(within(menue).getByRole("menuitem", { name: "Erfassungsbogen einlesen …" }));
    expect(scanner).toBe(1);
    expect(screen.queryByRole("menu")).toBeNull();

    fireEvent.click(knopf);
    fireEvent.click(screen.getByRole("menuitem", { name: "Aus Vorlage …" }));
    expect(screen.getByRole("button", { name: "Aus Vorlage" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(window, { key: "Escape" });

    fireEvent.click(knopf);
    fireEvent.click(screen.getByRole("menuitem", { name: "Ohne Vorlage" }));
    expect(screen.getByRole("button", { name: "Ohne Vorlage" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("nennt im Kopf die Zahl, mit gewähltem Abschnitt „n in <Abschnitt>“", async () => {
    useLaden.setState({
      baum: { lageZeiger: 5, baum: [{ id: "EO", name: "Deich Nord", typ: "EINSATZORT", tiefe: 0, kinder: [] }] } as never,
    });
    const { rerender } = render(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await screen.findByText("Bergungsgruppe 1");
    expect(screen.getByRole("heading", { name: /^Einheiten/ }).textContent).toBe("Einheiten 2");
    rerender(<Einheitentabelle abschnittId="EO" einheitId={undefined} aufEinheit={() => undefined} />);
    expect(screen.getByRole("heading", { name: /^Einheiten/ }).textContent).toBe("Einheiten 2 in Deich Nord");
    expect(screen.queryByRole("button", { name: /Hilfe zu/ })).toBeNull();
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

    it("steht nur bei genau einer markierten Zeile in der Auswahlleiste", async () => {
      mitQuelle();
      await zeigeTabelle();
      expect(screen.queryByRole("button", { name: "Kopieren" })).toBeNull();
      fireEvent.click(screen.getByText("Bergungsgruppe 1"));
      const knopf = screen.getByRole("button", { name: "Kopieren" });
      expect(knopf.getAttribute("title")).toMatch(/\(Strg\+K\)$/u);
      fireEvent.click(screen.getByText("Fachgruppe N"), { ctrlKey: true });
      expect(screen.queryByRole("button", { name: "Kopieren" })).toBeNull();
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

      fireEvent.click(screen.getByRole("button", { name: "Kopie anlegen" }));
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
        hierarchie: [{ art: "HERKUNFT", name: "THW OV Hude" }],
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
