/**
 * Komponententests zum Abschnittsbaum (M3.1).
 *
 * Sie messen, was die BDD-Szenarien nicht messen können: die Verdrahtung der
 * Schritte. Seit Runde 6 („Entlastung", 3.4) stehen sie im Menü „⋯" an der
 * gewählten Zeile und im Kontextmenü, nicht mehr als Knöpfe im Kopf. Die fachliche Wirkung eines `AbschnittAufgeloest` steht in
 * `szenarien-abschnitte.test.ts`; hier steht, dass der Knopf „Auflösen"
 * **genau dieses** Ereignis schickt — mit dem `vorher`-Wert, den dieses
 * Fenster gesehen hat (§2.2a, Auflage 6).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Baumknoten } from "@s1/domaene";
import type { Lagebild } from "../kontrakt/index.js";

import { Abschnittsbaum } from "./Abschnittsbaum.js";
import { useLaden } from "./laden.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

function knoten(id: string, name: string, teil: Partial<Baumknoten> = {}): Baumknoten {
  return {
    id,
    name,
    typ: "EINSATZORT",
    reihenfolge: 1,
    tiefe: 0,
    eigeneStaerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    summenStaerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
    einheiten: 1,
    einheitenSumme: 1, erwartet: 0, erwartetSumme: 0,
    zaehlt: true,
    systemAbschnitt: false,
    kinder: [],
    ...teil,
  };
}

const BAUM: readonly Baumknoten[] = [
  knoten("EO", "Deich Nord"),
  knoten("EA-SUED", "EA Süd", { reihenfolge: 2 }),
  knoten("EINGANG", "Eingang", { systemAbschnitt: true, reihenfolge: 0, einheiten: 0, einheitenSumme: 0 }),
];

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("baumAnfordern", { lageZeiger: 5, baum: BAUM });
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  useLaden.setState({
    akteId: "akte-1",
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    fehler: undefined,
    hinweise: [],
    lagebild: undefined,
  });
});

/** Öffnet „⋯" an der gewählten Zeile und wählt dort einen Schritt. */
function schritt(name: string): void {
  fireEvent.click(screen.getByRole("button", { name: /^Weitere Schritte für / }));
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

/** Rendert den Baum und wartet, bis die erste Antwort eingetragen ist. */
async function zeigeBaum(gewaehlt?: string): Promise<void> {
  render(<Abschnittsbaum gewaehlt={gewaehlt} aufWahl={() => undefined} />);
  await waitFor(() => {
    expect(screen.getByText("Deich Nord")).toBeDefined();
  });
}

describe("Der Abschnittsbaum", () => {
  it("holt den Baum, sobald eine Akte offen ist", async () => {
    await zeigeBaum();
    expect(attrappe.letzterRuf("baumAnfordern")?.akteId).toBe("akte-1");
  });

  it("zeigt Name, Zeichen und die Stärke des Teilbaums", async () => {
    await zeigeBaum();
    // Über den Zeileninhalt und nicht über einen Textknoten: React verteilt
    // die Zahlen auf mehrere Knoten, und die Aussage gilt der Zeile.
    const zeile = screen.getByText("Deich Nord").closest("button") as HTMLElement;
    // „Einh. · Fü/UFü/He" steht einmal über der Liste, nicht in jeder Zeile.
    expect(zeile.textContent).toContain("1 · 0/1/8");
    expect(screen.getAllByText("Einh. · Fü/UFü/He")).toHaveLength(1);
    // Den Typ trägt das taktische Zeichen, nicht das Wort daneben: Beides
    // nebeneinander sagt dasselbe zweimal.
    await waitFor(() => {
      expect(zeile.querySelector("[aria-label='Einsatzabschnittsleitung']")).not.toBeNull();
    });
    expect(zeile.textContent).not.toContain("EINSATZORT");
  });

  it("sperrt die ändernden Schritte für die Systemabschnitte, grau mit Grund (§5.3.4)", async () => {
    await zeigeBaum("EINGANG");
    // Jedes ändernde Ereignis auf `EINGANG` ist wirkungslos; einen Schritt
    // anzubieten, dessen Wirkung der Fold verwirft, wäre ein Versprechen,
    // das die Anwendung nicht hält. Versteckt wird er trotzdem nicht.
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte für Eingang" }));
    for (const name of ["Umbenennen …", "Typ ändern …", "Zeichen …", "Umhängen …", "Nach oben", "Nach unten", "Auflösen …"]) {
      const eintrag = screen.getByRole("menuitem", { name });
      expect(eintrag.getAttribute("aria-disabled")).toBe("true");
      expect(eintrag.getAttribute("title")).toBe("Eingang und Archiv lassen sich nicht ändern");
    }
    fireEvent.click(screen.getByRole("menuitem", { name: "Umbenennen …" }));
    expect(screen.queryByLabelText("Neuer Name")).toBeNull();
  });

  it("schickt beim Umbenennen den gesehenen Vorher-Wert mit (§2.2a)", async () => {
    await zeigeBaum("EO");
    schritt("Umbenennen …");
    const feld = screen.getByLabelText("Neuer Name");
    fireEvent.change(feld, { target: { value: "Deich Nordwest" } });
    fireEvent.click(screen.getByRole("button", { name: "Name speichern" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    const ruf = attrappe.letzterRuf("bedienen");
    expect(ruf?.entwurf.typ).toBe("AbschnittUmbenannt");
    expect(ruf?.entwurf.vorher).toBe("Deich Nord");
    expect(ruf?.entwurf.neu).toBe("Deich Nordwest");
  });

  it("verlangt beim Typwechsel einen Grund, bevor der Knopf greift (§2.4)", async () => {
    await zeigeBaum("EO");
    schritt("Typ ändern …");
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "ANGEFORDERT" } });
    const uebernehmen = screen.getByRole("button", { name: "Typ speichern" });
    expect(uebernehmen.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Grund (Pflicht)"), {
      target: { value: "Noch nicht eingetroffen" },
    });
    expect(screen.getByRole("button", { name: "Typ speichern" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Typ speichern" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittTypGeaendert");
    });
    expect(attrappe.letzterRuf("bedienen")?.entwurf.grund).toBe("Noch nicht eingetroffen");
  });

  it("bietet beim Umhängen keinen Abschnitt an, der einen Zyklus schlösse (§5.3.1)", async () => {
    attrappe.antwortet("baumAnfordern", {
      lageZeiger: 5,
      baum: [knoten("A", "A", { kinder: [knoten("B", "B", { tiefe: 1 })] }), knoten("C", "C")],
    });
    render(<Abschnittsbaum gewaehlt="A" aufWahl={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText("A")).toBeDefined();
    });
    schritt("Umhängen …");

    const wahl = screen.getByLabelText("Übergeordneter Abschnitt");
    const angeboten = [...wahl.querySelectorAll("option")].map((option) => option.textContent);
    expect(angeboten).toContain("C");
    // Weder A selbst noch sein Nachfahre B: Beides schlösse einen Zyklus.
    expect(angeboten).not.toContain("A");
    expect(angeboten).not.toContain("B");
  });

  it("schreibt ein `AbschnittZeichenGesetzt` mit der gewählten Kennung (§5.3)", async () => {
    await zeigeBaum("EO");
    schritt("Zeichen …");

    // Über die Suche und nicht über die Kachelwand als Ganzes: Der Satz hat
    // knapp tausend Zeichen, und die Wand zeigt nur einen Ausschnitt davon.
    fireEvent.change(screen.getByLabelText("Suche"), { target: { value: "Bereitstellungsraum" } });
    const kacheln = screen.getByRole("list", { name: "Taktische Zeichen" });
    const kachel = [...kacheln.querySelectorAll("button")].find((knopf) =>
      (knopf.getAttribute("title") ?? "").includes("Einrichtungen/Bereitstellungsraum"),
    );
    expect(kachel).toBeDefined();
    fireEvent.click(kachel as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittZeichenGesetzt");
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.neu).toBe("Einrichtungen/Bereitstellungsraum");
    // §2.2a: Der Vorher-Wert ist der, den **dieses** Fenster gesehen hat —
    // hier keiner, denn der Abschnitt folgte bisher seinem Typ.
    expect(entwurf?.vorher).toBeNull();
  });

  it("nimmt die Wahl mit der ersten Kachel zurück (`neu` = null)", async () => {
    attrappe.antwortet("baumAnfordern", {
      lageZeiger: 5,
      baum: [knoten("EO", "Deich Nord", { zeichen: "Einheiten/Bergungsgruppe" })],
    });
    await zeigeBaum("EO");
    schritt("Zeichen …");
    fireEvent.click(screen.getByRole("button", { name: /aus dem Typ/ }));
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittZeichenGesetzt");
    });
    const entwurf = attrappe.letzterRuf("bedienen")?.entwurf;
    expect(entwurf?.neu).toBeNull();
    expect(entwurf?.vorher).toBe("Einheiten/Bergungsgruppe");
  });

  it("hängt die Maske an den Körper, nicht in den Baum (Stapelordnung)", async () => {
    await zeigeBaum("EO");
    schritt("Umbenennen …");

    // Steht die Maske im Baum, entscheidet die Reihenfolge im Dokument, wer
    // oben liegt — der klebende Spaltenkopf der Einheitentabelle kommt danach
    // und legte sich darüber. Der Grund am Körper nimmt sie aus dieser Ordnung.
    const formular = screen.getByLabelText("„Deich Nord“ umbenennen");
    const grund = formular.parentElement;
    expect(grund?.className).toBe("maskengrund");
    expect(grund?.parentElement).toBe(document.body);
  });

  it("schließt die Maske mit Escape, ohne etwas zu schreiben (M3.6)", async () => {
    await zeigeBaum("EO");
    schritt("Umbenennen …");
    expect(screen.getByLabelText("Neuer Name")).toBeDefined();

    fireEvent.keyDown(screen.getByLabelText("Neuer Name"), { key: "Escape" });
    expect(screen.queryByLabelText("Neuer Name")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("bestätigt die Maske mit Enter (M3.6)", async () => {
    await zeigeBaum("EO");
    schritt("Umbenennen …");
    const feld = screen.getByLabelText("Neuer Name");
    fireEvent.change(feld, { target: { value: "Deich Mitte" } });
    // Ein `<form>` macht Enter von sich aus zum Bestätigen; geprüft wird
    // deshalb der Absende-Weg und nicht ein eigener Tastenhörer.
    fireEvent.submit(feld.closest("form") as HTMLFormElement);

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.neu).toBe("Deich Mitte");
    });
  });

  it("hält die Maske offen, wenn der Bedienschritt abgewiesen wird (§8.8)", async () => {
    attrappe.antwortet("bedienen", {
      art: "abgewiesen",
      meldung: "Die Nutzlast ist nicht gültig.",
      dauerhafterHinweis: false,
    });
    await zeigeBaum("EO");
    schritt("Umbenennen …");
    fireEvent.change(screen.getByLabelText("Neuer Name"), { target: { value: "Neu" } });
    fireEvent.click(screen.getByRole("button", { name: "Name speichern" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    // Der Bediener soll seine Eingabe nicht verlieren, nur weil der
    // Schreibversuch nicht durchging.
    expect(screen.getByLabelText("Neuer Name")).toBeDefined();
  });

  it("legt einen neuen Abschnitt unter dem gewählten an", async () => {
    await zeigeBaum("EO");
    fireEvent.click(screen.getByRole("button", { name: "Abschnitt anlegen" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "UA Deichfuß" } });
    // Der Knopf in der Maske trägt denselben Namen wie der in der Leiste; der Dialog liegt zuletzt.
    fireEvent.click(screen.getAllByRole("button", { name: "Abschnitt anlegen" }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittAngelegt");
    });
    const nutzlast = attrappe.letzterRuf("bedienen")?.entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["name"]).toBe("UA Deichfuß");
    expect(nutzlast["parentId"]).toBe("EO");
  });
});

describe("Der Abschnittsbaum mit einem Knopf (Entlastung, 3.4)", () => {
  it("trägt im Kopf nur „Abschnitt anlegen“ und ohne Auswahl keine Zeilenschritte", async () => {
    await zeigeBaum();
    const kopf = screen.getByRole("heading", { name: "Abschnitte" }).parentElement as HTMLElement;
    expect(within(kopf).getAllByRole("button").map((k) => k.textContent)).toEqual(["Abschnitt anlegen"]);
    expect(within(kopf).getByRole("button").getAttribute("title")).toBe("Neuen Abschnitt anlegen (Strg+N)");
    expect(screen.queryByRole("button", { name: /^Weitere Schritte für / })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hilfe zu/ })).toBeNull();
  });

  it("zeigt „Alle Bereiche“ mit Einheiten und Ist-Stärke des Einsatzes und hebt damit die Wahl auf", async () => {
    useLaden.setState({
      lagebild: { einsatzStatus: "AKTIV", einheiten: 20, gesamtstaerke: { fuehrer: 5, unterfuehrer: 16, mannschaft: 85 } } as unknown as Lagebild,
    });
    const aufWahl = vi.fn();
    const { rerender } = render(<Abschnittsbaum gewaehlt={undefined} aufWahl={aufWahl} />);
    await screen.findByText("Deich Nord");
    const alle = screen.getByRole("button", { name: /^Alle Bereiche/ });
    expect(alle.textContent).toContain("20 · 5/16/85");
    expect(alle.getAttribute("aria-pressed")).toBe("true");

    rerender(<Abschnittsbaum gewaehlt="EO" aufWahl={aufWahl} />);
    expect(screen.getByRole("button", { name: /^Alle Bereiche/ }).getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /^Alle Bereiche/ }));
    expect(aufWahl).toHaveBeenLastCalledWith(undefined);
  });

  it("trägt „⋯“ nur an der gewählten Zeile, mit den Schritten in fester Reihenfolge", async () => {
    await zeigeBaum("EO");
    const knoepfe = screen.getAllByRole("button", { name: /^Weitere Schritte für / });
    expect(knoepfe).toHaveLength(1);
    expect(knoepfe[0]?.getAttribute("aria-label")).toBe("Weitere Schritte für Deich Nord");
    expect(knoepfe[0]?.getAttribute("aria-haspopup")).toBe("menu");
    fireEvent.click(knoepfe[0] as HTMLElement);
    const menue = screen.getByRole("menu", { name: "Abschnitt Deich Nord" });
    expect(within(menue).getAllByRole("menuitem").map((e) => e.textContent)).toEqual([
      "Umbenennen …",
      "Typ ändern …",
      "Zeichen …",
      "Umhängen …",
      "Nach oben",
      "Nach unten",
      "Auflösen …",
    ]);
    expect(menue.querySelectorAll("hr")).toHaveLength(2);
    expect(within(menue).getByRole("menuitem", { name: "Auflösen …" }).className).toBe("rot");
    // Unter Deich Nord steht EA Süd: „Nach unten“ geht.
    expect(within(menue).getByRole("menuitem", { name: "Nach unten" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("öffnet per Rechtsklick dasselbe Menü an der Zeile und wählt sie dabei", async () => {
    const aufWahl = vi.fn();
    const { rerender } = render(<Abschnittsbaum gewaehlt={undefined} aufWahl={aufWahl} />);
    await screen.findByText("EA Süd");
    const zeile = screen.getByText("EA Süd").closest("li") as HTMLElement;
    const ereignis = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 50, clientY: 80 });
    zeile.dispatchEvent(ereignis);
    // Das Menü des Browsers bleibt zu.
    expect(ereignis.defaultPrevented).toBe(true);
    expect(aufWahl).toHaveBeenLastCalledWith("EA-SUED");
    rerender(<Abschnittsbaum gewaehlt="EA-SUED" aufWahl={aufWahl} />);
    const menue = await screen.findByRole("menu", { name: "Abschnitt EA Süd" });
    expect(menue.parentElement?.parentElement).toBe(document.body);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    // Esc im Menü schließt nur das Menü, die Wahl bleibt.
    expect(aufWahl).toHaveBeenCalledTimes(1);
  });

  it("tauscht mit „Nach unten“ die Reihenfolge mit dem Nachbarn — zwei Ereignisse mit Vorher-Wert", async () => {
    await zeigeBaum("EO");
    schritt("Nach unten");
    await waitFor(() => {
      expect(attrappe.rufeDerArt("bedienen")).toHaveLength(2);
    });
    const [erster, zweiter] = attrappe.rufeDerArt("bedienen").map((ruf) => ruf.entwurf);
    expect(erster).toMatchObject({ typ: "AbschnittUmsortiert", nutzlast: { abschnittId: "EO" }, vorher: 1, neu: 2 });
    expect(zweiter).toMatchObject({ typ: "AbschnittUmsortiert", nutzlast: { abschnittId: "EA-SUED" }, vorher: 2, neu: 1 });
  });

  it("zeigt den Schalter für Aufgelöste nur, wenn es welche gibt, und blendet sie vorgegeben aus", async () => {
    await zeigeBaum();
    expect(screen.queryByLabelText(/Aufgelöste zeigen/)).toBeNull();
    cleanup();

    attrappe.antwortet("baumAnfordern", {
      lageZeiger: 6,
      baum: [...BAUM, knoten("ALT", "EA Alt", { aufgeloestNach: "EO", reihenfolge: 3 })],
    });
    await zeigeBaum();
    expect(screen.queryByText("EA Alt")).toBeNull();
    const schalter = screen.getByLabelText("Aufgelöste zeigen (1)");
    expect(schalter.closest(".baumfuss")).not.toBeNull();
    fireEvent.click(schalter);
    expect(screen.getByText("EA Alt")).toBeDefined();
  });

  it("hebt die Wahl mit Esc auf", async () => {
    const aufWahl = vi.fn();
    render(<Abschnittsbaum gewaehlt="EO" aufWahl={aufWahl} />);
    await screen.findByText("Deich Nord");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(aufWahl).toHaveBeenLastCalledWith(undefined);
  });

  it("sperrt im beendeten Einsatz Anlegen und alle Schritte, mit Grund", async () => {
    useLaden.setState({
      lagebild: { einsatzStatus: "BEENDET", einheiten: 1, gesamtstaerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 } } as unknown as Lagebild,
    });
    await zeigeBaum("EO");
    expect((screen.getByRole("button", { name: "Abschnitt anlegen" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Weitere Schritte für Deich Nord" }));
    expect(screen.getByRole("menuitem", { name: "Umbenennen …" }).getAttribute("title")).toBe("Einsatz beendet – nur lesen");
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(screen.queryByLabelText("Abschnitt anlegen")).toBeNull();
  });
});
