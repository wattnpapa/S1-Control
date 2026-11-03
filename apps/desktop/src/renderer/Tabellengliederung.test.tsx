/**
 * Komponententests zur Gliederung der Einheitentabelle.
 *
 * Gemessen wird die Verdrahtung: dass der Umschalter die Gliederung beim
 * Worker bestellt, dass die Kopfzeilen mit ihren Summen zwischen den
 * Einheiten stehen und dass Kopfzeilen weder markierbar noch bearbeitbar sind
 * — Auswahl, Kürzel und Inline-Bearbeitung treffen nur Einheiten. Die Summen
 * selbst rechnet die Projektion (`gliederung.test.ts`).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Bereichskopf, Tabellengliederung, Tabellenzeile, Zelle } from "@s1/domaene";

import { Einheitentabelle } from "./Einheitentabelle.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { bereichsbloecke } from "./Tabellengliederung.js";

afterEach(cleanup);

function zelle(text: string, wert: unknown): Zelle {
  return { text, wert, umstritten: false };
}

function zeile(id: string, bezeichnung: string, abschnittId: string): Tabellenzeile {
  return {
    einheitId: id,
    abschnittId,
    abschnittName: abschnittId,
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
      status: zelle("Im Einsatz", "IM_EINSATZ"),
      staerke: zelle("0/1/8", { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 }),
      gesamt: zelle("9", undefined),
    },
  };
}

function bereich(teil: Partial<Bereichskopf> & Pick<Bereichskopf, "abschnittId" | "name" | "von" | "zeilen">): Bereichskopf {
  const s = { fuehrer: 0, unterfuehrer: teil.zeilen, mannschaft: 8 * teil.zeilen };
  return {
    typ: "EINSATZORT",
    tiefe: 0,
    einheiten: teil.zeilen,
    staerke: s,
    einheitenSumme: teil.zeilen,
    summenStaerke: s,
    erwartet: 0,
    erwartetSumme: 0,
    zaehlt: true,
    ...teil,
  };
}

const GLIEDERUNG: Tabellengliederung = {
  bereiche: [
    bereich({ abschnittId: "ANF", name: "Angefordert", typ: "ANGEFORDERT", von: 0, zeilen: 1, zaehlt: false, erwartet: 9, erwartetSumme: 9 }),
    bereich({
      abschnittId: "EA1",
      name: "EA Deich Nord",
      von: 1,
      zeilen: 1,
      einheitenSumme: 2,
      summenStaerke: { fuehrer: 0, unterfuehrer: 2, mannschaft: 16 },
    }),
    bereich({ abschnittId: "UA1", name: "UA Deichfuß", tiefe: 1, von: 2, zeilen: 1 }),
    bereich({ abschnittId: "EA2", name: "EA Reserve", von: 3, zeilen: 0 }),
  ],
  einsatz: {
    einheiten: 2,
    staerke: { fuehrer: 0, unterfuehrer: 2, mannschaft: 16 },
    angefordertEinheiten: 1,
    angefordert: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    erwartetEinheiten: 1,
    erwartet: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    alleEinheiten: 3,
    alle: { fuehrer: 0, unterfuehrer: 3, mannschaft: 24 },
    beendetEinheiten: 0,
    beendet: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  },
};

const ZEILEN = [zeile("U1", "Anmarsch Gruppe", "ANF"), zeile("U2", "Bergungsgruppe 1", "EA1"), zeile("U3", "Fachgruppe W", "UA1")];

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 5,
    zeilen: ZEILEN,
    gesamtzahl: 3,
    von: 0,
    jeStatus: { IM_EINSATZ: { anzahl: 3, gesamt: 27 } },
    gliederung: GLIEDERUNG,
  });
  attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 5, einheitId: "U2", fahrzeuge: [], personen: [], auftraege: [] });
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

async function zeigeTabelle(): Promise<string[]> {
  const gewaehlt: string[] = [];
  render(
    <Einheitentabelle
      abschnittId={undefined}
      einheitId={undefined}
      aufEinheit={(id) => {
        if (id !== undefined) gewaehlt.push(id);
      }}
    />,
  );
  await waitFor(() => {
    expect(screen.getByText("Bergungsgruppe 1")).toBeDefined();
  });
  return gewaehlt;
}

describe("Die Gliederung der Einheitentabelle", () => {
  it("bestellt ohne gewählten Abschnitt die Gliederung und schaltet sie im Menü „Spalten“ um", async () => {
    await zeigeTabelle();
    // Vorgabe ohne Abschnitt: gegliedert wie die Stärketabelle auf Papier.
    expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Spalten" }));
    const schalter = screen.getByRole("menuitemcheckbox", { name: "Gliederung nach Bereich" });
    expect(schalter.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(schalter);
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBeUndefined();
    });
    // „Leere Bereiche ausblenden“ steht nur mit Gliederung da.
    expect(screen.queryByRole("menuitemcheckbox", { name: "Leere Bereiche ausblenden" })).toBeNull();

    fireEvent.click(schalter);
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBe(true);
    });
    expect(attrappe.letzterRuf("tabelleAnfordern")?.ohneLeereBereiche).toBeUndefined();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Leere Bereiche ausblenden" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.ohneLeereBereiche).toBe(true);
    });
  });

  it("kombiniert Gliederung und Statusfilter in einem Ruf", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: /^Einsatz/ }));
    await waitFor(() => {
      const ruf = attrappe.letzterRuf("tabelleAnfordern");
      expect(ruf?.gliederung).toBe(true);
      expect(ruf?.status).toEqual(["IM_EINSATZ"]);
    });
  });

  it("setzt Kopfzeilen mit Zwischensummen zwischen die Einheiten, in Baumordnung", async () => {
    await zeigeTabelle();
    const koepfe = screen.getAllByRole("rowheader").filter((kopf) => kopf.getAttribute("scope") === "rowgroup");
    expect(koepfe.map((kopf) => kopf.textContent)).toEqual([
      "Ist-Stärke gesamt · 2 Einh. · +9 erwartet (angefordert/Anmarsch/Eingang) · Alle erfassten Einheiten 3 Einh. 0/3/24",
      "Angefordert · 1 Einh. · zählt nicht · +9 erwartet",
      "EA Deich Nord mit Unterabschnitten · 2 Einh.",
      "UA Deichfuß · 1 Einh.",
      "EA Reserve · 0 Einh.",
    ]);
    // Die Kopfzelle reicht bis zur ersten Zahlenspalte.
    const spaltenkoepfe = screen.getAllByRole("columnheader").map((kopf) => kopf.textContent);
    expect(koepfe[2]?.getAttribute("colspan")).toBe(String(spaltenkoepfe.indexOf("Fü / UFü / He")));

    // Jeder Bereich ist eine eigene Zeilengruppe, die Einheiten stehen darin.
    const nord = screen.getByRole("rowgroup", { name: "EA Deich Nord" });
    expect(within(nord).getByText("Bergungsgruppe 1")).toBeDefined();
    expect(within(nord).getByText("0/2/16")).toBeDefined();
    expect(within(nord).getByText("18")).toBeDefined();
    // Der leere Bereich steht als Kopfzeile ohne Einheiten da.
    expect(within(screen.getByRole("rowgroup", { name: "EA Reserve" })).getAllByRole("row")).toHaveLength(1);
  });

  it("nennt am Einsatz dieselbe Ist-Stärke wie das Kopfband und trennt erwartet und alle erfassten", async () => {
    await zeigeTabelle();
    const einsatz = screen.getByRole("rowgroup", { name: "Ist-Stärke gesamt" });
    expect(within(einsatz).getByText("0/2/16")).toBeDefined();
    expect(within(einsatz).getByRole("rowheader").getAttribute("title")).toContain("Ist-Stärke: Kräfte, die vor Ort sind");
  });

  it("rückt Einheiten nach der Tiefe ihres Bereichs ein", async () => {
    await zeigeTabelle();
    const ua = within(screen.getByRole("rowgroup", { name: "UA Deichfuß" }));
    const kopf = ua.getAllByRole("rowheader")[0] as HTMLElement;
    // Ohne Spalte Abschnitt rückt die Bezeichnung ein.
    const einheit = ua.getByText("Fachgruppe W").closest("td") as HTMLElement;
    expect(kopf.style.paddingLeft).toBe("1.7em");
    expect(einheit.style.paddingLeft).toBe("2.9em");
    expect(einheit.className).toContain("namensspalte");
  });

  it("lässt Kopfzeilen nicht markieren und nicht bearbeiten — Kürzel treffen nur Einheiten", async () => {
    const gewaehlt = await zeigeTabelle();
    const kopf = screen.getByText("UA Deichfuß");
    fireEvent.click(kopf);
    fireEvent.doubleClick(within(screen.getByRole("rowgroup", { name: "UA Deichfuß" })).getAllByRole("rowheader")[0] as HTMLElement);
    expect(gewaehlt).toEqual([]);
    expect(screen.queryByRole("toolbar", { name: "Auswahl" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Bezeichnung" })).toBeNull();
    // Strg+M öffnet ohne markierte Einheit nichts, auch nach dem Klick auf den Kopf.
    fireEvent.keyDown(window, { key: "m", ctrlKey: true });
    expect(screen.queryByLabelText(/verschieben/)).toBeNull();
    // Kopfzeilen tragen nichts, das den Tabulator anhält.
    for (const reihe of document.querySelectorAll("tr.bereichskopf")) {
      expect(reihe.querySelector("[tabindex], button, input, select")).toBeNull();
    }

    // Die Einheit darunter bleibt markier- und bearbeitbar wie ohne Gliederung.
    fireEvent.click(screen.getByText("Bergungsgruppe 1"));
    expect(gewaehlt).toEqual(["U2"]);
    fireEvent.keyDown(window, { key: "m", ctrlKey: true });
    expect(screen.getByLabelText("1 Einheit(en) verschieben")).toBeDefined();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.doubleClick(screen.getByText("Fachgruppe W"));
    const feld = screen.getByLabelText("Bezeichnung");
    fireEvent.change(feld, { target: { value: "Fachgruppe Wasser" } });
    fireEvent.keyDown(feld, { key: "Enter" });
    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
  });
});

describe("bereichsbloecke", () => {
  it("verteilt einen Ausschnitt auf die Bereiche, die in ihm liegen", () => {
    const zweite = [ZEILEN[1], ZEILEN[2]] as Tabellenzeile[];
    const bloecke = bereichsbloecke(GLIEDERUNG, zweite, { von: 1, gesamtzahl: 3 });
    expect(bloecke.map((b) => [b.bereich.abschnittId, b.zeilen.map((z) => z.einheitId)])).toEqual([
      ["EA1", ["U2"]],
      ["UA1", ["U3"]],
      ["EA2", []],
    ]);
  });

  it("setzt einen leeren Bereich am Seitenende nur auf die letzte Seite", () => {
    const erste = [ZEILEN[0], ZEILEN[1], ZEILEN[2]] as Tabellenzeile[];
    const nichtLetzte = bereichsbloecke(GLIEDERUNG, erste, { von: 0, gesamtzahl: 10 });
    expect(nichtLetzte.map((b) => b.bereich.abschnittId)).toEqual(["ANF", "EA1", "UA1"]);
  });
});

describe("Die Spalte Abschnitt (Entlastung, Leitsatz 4)", () => {
  function flach(): void {
    attrappe.antwortet("tabelleAnfordern", { lageZeiger: 5, zeilen: ZEILEN, gesamtzahl: 3, von: 0, jeStatus: {} });
  }

  it("fehlt in der Gliederung ohne gewählten Abschnitt", async () => {
    await zeigeTabelle();
    expect(screen.queryByRole("columnheader", { name: "Abschnitt" })).toBeNull();
    expect(screen.getByRole("table").className).toBe("ohne-abschnitt");
    // Nur Kopfzeilen tragen eine Zeilenkopfzelle, Einheiten nicht.
    expect(screen.getAllByRole("rowheader").every((kopf) => kopf.getAttribute("scope") !== "row" || kopf.closest("tfoot") !== null)).toBe(true);
  });

  it("steht nur in der flachen Gesamtliste, wenn die Gliederung abgeschaltet ist", async () => {
    flach();
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: "Spalten" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Gliederung nach Bereich" }));
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: "Abschnitt" })).toBeDefined();
    });
    expect(screen.getByRole("rowheader", { name: "EA1" })).toBeDefined();
  });

  it("fehlt bei gewähltem Abschnitt; dort ist die Liste flach, und die Wahl je Fall bleibt", async () => {
    flach();
    const { rerender } = render(<Einheitentabelle abschnittId="EA1" einheitId={undefined} aufEinheit={() => undefined} />);
    await screen.findByText("Bergungsgruppe 1");
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.abschnittId).toBe("EA1");
    });
    expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBeUndefined();
    expect(screen.queryByRole("columnheader", { name: "Abschnitt" })).toBeNull();

    // Im Fall „mit Abschnitt“ gegliedert …
    fireEvent.click(screen.getByRole("button", { name: "Spalten" }));
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Gliederung nach Bereich" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBe(true);
    });
    // … ändert den Fall „ohne Abschnitt“ nicht: Der bleibt gegliedert, wie vorgegeben.
    rerender(<Einheitentabelle abschnittId={undefined} einheitId={undefined} aufEinheit={() => undefined} />);
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.abschnittId).toBeUndefined();
    });
    expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBe(true);
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Gliederung nach Bereich" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBeUndefined();
    });
    // Zurück zum Abschnitt: dessen Wahl (gegliedert) gilt noch.
    rerender(<Einheitentabelle abschnittId="EA1" einheitId={undefined} aufEinheit={() => undefined} />);
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")).toMatchObject({ abschnittId: "EA1", gliederung: true });
    });
  });

  it("trägt die Sperre „wird bearbeitet“ an der Bezeichnung", async () => {
    useLaden.setState({
      lagebild: { peers: [{ clientId: "b", anzeigename: "Lage 2", bearbeitet: ["U2"] }] } as never,
    });
    await zeigeTabelle();
    const vermerk = screen.getByText(/wird von Lage 2 bearbeitet/);
    expect(vermerk.closest("td")?.className).toContain("namensspalte");
    expect(vermerk.closest("td")?.textContent).toContain("Bergungsgruppe 1");
    useLaden.setState({ lagebild: undefined });
  });
});
