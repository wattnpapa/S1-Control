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
  it("bestellt die Gliederung beim Umschalten und blendet leere Bereiche auf Wunsch aus", async () => {
    await zeigeTabelle();
    expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Gliederung" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.gliederung).toBe(true);
    });
    expect(attrappe.letzterRuf("tabelleAnfordern")?.ohneLeereBereiche).toBeUndefined();

    fireEvent.click(screen.getByRole("button", { name: "Leere ausblenden" }));
    await waitFor(() => {
      expect(attrappe.letzterRuf("tabelleAnfordern")?.ohneLeereBereiche).toBe(true);
    });
  });

  it("kombiniert Gliederung und Statusfilter in einem Ruf", async () => {
    await zeigeTabelle();
    fireEvent.click(screen.getByRole("button", { name: "Gliederung" }));
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
      "Ist-Stärke gesamt · +9 erwartet (angefordert/Anmarsch/Eingang) · Alle erfassten Einheiten 3 Einh. 0/3/24",
      "Angefordert · zählt nicht · +9 erwartet",
      "EA Deich Nord mit Unterabschnitten",
      "UA Deichfuß",
      "EA Reserve",
    ]);

    // Jeder Bereich ist eine eigene Zeilengruppe, die Einheiten stehen darin.
    const nord = screen.getByRole("rowgroup", { name: "EA Deich Nord" });
    expect(within(nord).getByText("Bergungsgruppe 1")).toBeDefined();
    expect(within(nord).getByText("2 Einh.")).toBeDefined();
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
    const einheit = ua.getAllByRole("rowheader")[1] as HTMLElement;
    expect(kopf.style.paddingLeft).toBe("1.7em");
    expect(einheit.style.paddingLeft).toBe("2.9em");
  });

  it("lässt Kopfzeilen nicht markieren und nicht bearbeiten — Kürzel treffen nur Einheiten", async () => {
    const gewaehlt = await zeigeTabelle();
    const kopf = screen.getByText("UA Deichfuß");
    fireEvent.click(kopf);
    fireEvent.doubleClick(within(screen.getByRole("rowgroup", { name: "UA Deichfuß" })).getByText("1 Einh."));
    expect(gewaehlt).toEqual([]);
    expect(screen.getByRole("button", { name: /Verschieben/ }).hasAttribute("disabled")).toBe(true);
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
