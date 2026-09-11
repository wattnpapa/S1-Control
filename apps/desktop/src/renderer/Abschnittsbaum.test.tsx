/**
 * Komponententests zum Abschnittsbaum (M3.1).
 *
 * Sie messen, was die BDD-Szenarien nicht messen können: die Verdrahtung der
 * Knöpfe. Die fachliche Wirkung eines `AbschnittAufgeloest` steht in
 * `szenarien-abschnitte.test.ts`; hier steht, dass der Knopf „Auflösen"
 * **genau dieses** Ereignis schickt — mit dem `vorher`-Wert, den dieses
 * Fenster gesehen hat (§2.2a, Auflage 6).
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Baumknoten } from "@s1/domaene";

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
    einheitenSumme: 1,
    zaehlt: true,
    systemAbschnitt: false,
    kinder: [],
    ...teil,
  };
}

const BAUM: readonly Baumknoten[] = [
  knoten("EO", "Deich Nord"),
  knoten("EA-SUED", "EA Süd", { reihenfolge: 2 }),
  knoten("AUFFANG", "Auffang", { systemAbschnitt: true, reihenfolge: 0, einheiten: 0, einheitenSumme: 0 }),
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
  });
});

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
    expect(zeile.textContent).toContain("1 Einh.");
    expect(zeile.textContent).toContain("0/1/8");
    // Den Typ trägt das taktische Zeichen, nicht das Wort daneben: Beides
    // nebeneinander sagt dasselbe zweimal.
    await waitFor(() => {
      expect(zeile.querySelector("[aria-label='Einsatzabschnittsleitung']")).not.toBeNull();
    });
    expect(zeile.textContent).not.toContain("EINSATZORT");
  });

  it("sperrt die ändernden Knöpfe für die Systemabschnitte (§5.3.4)", async () => {
    await zeigeBaum("AUFFANG");
    // Jedes ändernde Ereignis auf `AUFFANG` ist wirkungslos; einen Knopf
    // anzubieten, dessen Wirkung der Fold verwirft, wäre ein Versprechen,
    // das die Anwendung nicht hält.
    expect(screen.getByRole("button", { name: "Umbenennen" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Auflösen" }).hasAttribute("disabled")).toBe(true);
  });

  it("schickt beim Umbenennen den gesehenen Vorher-Wert mit (§2.2a)", async () => {
    await zeigeBaum("EO");
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));
    const feld = screen.getByLabelText("Neuer Name");
    fireEvent.change(feld, { target: { value: "Deich Nordwest" } });
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Typ ändern" }));
    fireEvent.change(screen.getByLabelText("Typ"), { target: { value: "ANGEFORDERT" } });
    const uebernehmen = screen.getByRole("button", { name: "Übernehmen" });
    expect(uebernehmen.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByLabelText("Grund (Pflicht)"), {
      target: { value: "Noch nicht eingetroffen" },
    });
    expect(screen.getByRole("button", { name: "Übernehmen" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Umhängen" }));

    const wahl = screen.getByLabelText("Übergeordneter Abschnitt");
    const angeboten = [...wahl.querySelectorAll("option")].map((option) => option.textContent);
    expect(angeboten).toContain("C");
    // Weder A selbst noch sein Nachfahre B: Beides schlösse einen Zyklus.
    expect(angeboten).not.toContain("A");
    expect(angeboten).not.toContain("B");
  });

  it("hängt die Maske an den Körper, nicht in den Baum (Stapelordnung)", async () => {
    await zeigeBaum("EO");
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));

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
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));
    expect(screen.getByLabelText("Neuer Name")).toBeDefined();

    fireEvent.keyDown(screen.getByLabelText("Neuer Name"), { key: "Escape" });
    expect(screen.queryByLabelText("Neuer Name")).toBeNull();
    expect(attrappe.rufeDerArt("bedienen")).toHaveLength(0);
  });

  it("bestätigt die Maske mit Enter (M3.6)", async () => {
    await zeigeBaum("EO");
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Umbenennen" }));
    fireEvent.change(screen.getByLabelText("Neuer Name"), { target: { value: "Neu" } });
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")).toBeDefined();
    });
    // Der Bediener soll seine Eingabe nicht verlieren, nur weil der
    // Schreibversuch nicht durchging.
    expect(screen.getByLabelText("Neuer Name")).toBeDefined();
  });

  it("legt einen neuen Abschnitt unter dem gewählten an", async () => {
    await zeigeBaum("EO");
    fireEvent.click(screen.getByRole("button", { name: "Neu" }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "UA Deichfuß" } });
    fireEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => {
      expect(attrappe.letzterRuf("bedienen")?.entwurf.typ).toBe("AbschnittAngelegt");
    });
    const nutzlast = attrappe.letzterRuf("bedienen")?.entwurf.nutzlast as Record<string, unknown>;
    expect(nutzlast["name"]).toBe("UA Deichfuß");
    expect(nutzlast["parentId"]).toBe("EO");
  });
});
