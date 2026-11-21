/**
 * Regressionstests zur zweiten Audit-Runde (2026-11-17), Blatt „Nachrichten“:
 *
 * - R2-SGL P1-1: Sicht „Offen“ nach dem Posteingang, Chip „offen“ mit der
 *   Zahl `zaehlung.OFFEN`; die Einstiegszeile nennt sie.
 * - R2-FaBe P1-2, P2-2: Die Einstiegszeile sagt Fachstellen, was Posteingang,
 *   Kopie und „erledigt“ bedeuten.
 * - R2-LdF P1-1, R2-Si P2-4: Karten der Sicht LdF und „Vor dem Sichter“ in
 *   voller Breite mit festem Tabellenlayout (Struktur und Stylesheet; die
 *   Pixel misst jsdom nicht).
 * - R2-Si P2-3 (alt P3-2): Escape im Lesen-Fenster schließt nur das Fenster,
 *   Tab bleibt darin, der Fokus kehrt zurück.
 * - R2-SGL P2-4, R2-Si P3-1, P2-5, P2-6, P2-5 (SGL): Hinweiskasten ohne
 *   Layoutsprung mit „×“ je Zeile, Reiterzahl für Sichter und FmZ, Merker
 *   ohne fremdes Handzeichen, „ohne Nummer“ nach der Beförderung.
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Lagebild, Nachrichtenansicht as Ansicht } from "../kontrakt/index.js";
import { Einstiegszeile } from "./Einstiegszeile.js";
import { SATZ_OFFEN, SATZ_POSTEINGANG } from "./einstiegszusatz.js";
import { Hinweiskasten } from "./Hinweiskasten.js";
import { useLaden } from "./laden.js";
import { Ldfsicht } from "./Ldfsicht.js";
import { Nachrichten } from "./Nachrichten.js";
import { Nachrichtenansicht } from "./Nachrichtenansicht.js";
import { nummerOhne } from "./Nachrichtenliste.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { BLITZ_AN_S4, NACHRICHTEN_LAGEBILD, VOR_SICHTER, nachrichtenansicht } from "./pruefhilfen/nachrichtenbeispiel.js";
import { nachrichtenzahl } from "./Reiterzeile.js";
import { Sichterstaukarte } from "./Sichterstau.js";
import { gemerkteStelleFuer, merkeStelle } from "./stellenmerker.js";
import { useKuerzel } from "./tastatur.js";

afterEach(cleanup);

let attrappe: Attrappe;

function sitzung(stellen: readonly string[]): void {
  useLaden.setState({ lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: [...stellen], handzeichen: "Mü" } } });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "a-0000000001" });
  const ansicht: Ansicht = { ...nachrichtenansicht([BLITZ_AN_S4]), zaehlung: { NEU: 1, GELESEN: 0, ERLEDIGT: 0, OFFEN: 3 } };
  attrappe.antwortet("nachrichtenAnfordern", ansicht);
  useLaden.setState({ akteId: "akte-1", fehler: undefined, hinweise: [] });
});

describe("R2-SGL P1-1: Sicht „Offen“ für die Übergabe", () => {
  it("steht nach dem Posteingang im Umschalter und fragt die Sicht „offen“ für die eigenen Stellen an", async () => {
    sitzung(["S3"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const umschalter = screen.getByRole("group", { name: "Sicht" });
    expect(within(umschalter).getAllByRole("button").map((b) => b.textContent).slice(0, 3)).toEqual(["Posteingang", "Offen", "Ausgang"]);
    fireEvent.click(within(umschalter).getByRole("button", { name: "Offen" }));
    await waitFor(() => expect(attrappe.letzterRuf("nachrichtenAnfordern")).toMatchObject({ sicht: "offen", stellen: ["S3"] }));
    expect(attrappe.letzterRuf("nachrichtenAnfordern")?.zustaende).toBeUndefined();
  });

  it("trägt den Chip „offen“ mit der Zahl aus `zaehlung.OFFEN`; ein Klick schaltet in die Sicht", async () => {
    sitzung(["S3"]);
    render(<Nachrichten aufTagebuch={vi.fn()} />);
    const chips = screen.getByRole("group", { name: "Filter nach Zustand" });
    const chip = await waitFor(() => within(chips).getByRole("button", { name: /offen\s*3/u }));
    fireEvent.click(chip);
    await waitFor(() => expect(attrappe.letzterRuf("nachrichtenAnfordern")).toMatchObject({ sicht: "offen" }));
    expect(within(screen.getByRole("group", { name: "Sicht" })).getByRole("button", { name: "Offen" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(screen.getByRole("group", { name: "Filter nach Zustand" })).getByRole("button", { name: /offen/u }));
    await waitFor(() => expect(attrappe.letzterRuf("nachrichtenAnfordern")).toMatchObject({ sicht: "posteingang" }));
  });

  it("nennt die Einstiegszeile; für Fachstellen dazu Posteingang, Kopie und „erledigt“", () => {
    sitzung(["FACHBERATER"]);
    render(<Einstiegszeile ort="nachrichten" />);
    const zeile = screen.getByRole("complementary");
    expect(zeile.textContent).toContain(SATZ_POSTEINGANG);
    expect(zeile.textContent).toContain(SATZ_OFFEN);
    expect(zeile.textContent).toContain("„erledigt“ ist Ihr eigener Vermerk");
    cleanup();
    sitzung(["FMZ"]);
    render(<Einstiegszeile ort="nachrichten" />);
    expect(screen.getByRole("complementary").textContent).not.toContain(SATZ_POSTEINGANG);
    expect(screen.getByRole("complementary").textContent).toContain(SATZ_OFFEN);
  });
});

describe("R2-LdF P1-1, R2-Si P2-4: Karten passen in den Rahmen", () => {
  const EINGANG_LDF: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-ldf", laufzustand: "VOR_LDF", nummer: 9, betreff: "Brücke gesperrt", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T09:10:00.000Z", handzeichen: "Fm" } };

  it("stellt die Karten der Sicht LdF untereinander, mit Spaltenköpfen fester Breite", () => {
    render(<Ldfsicht zeilen={[EINGANG_LDF]} handzeichen="Ld" nurLesen={false} aufVorschlag={vi.fn()} />);
    const karte = screen.getByRole("region", { name: "Vor der Weitergabe" });
    expect(karte.parentElement?.className).toBe("fmzkarten untereinander");
    expect(karte.querySelector("th.knopfspalte")).not.toBeNull();
  });

  it("spannt „Vor dem Sichter“ über die volle Breite, mit Kopf und Blitz zuoberst", () => {
    const einfach: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-1", nummer: 3 };
    const blitz: Nachrichtenzeile = { ...VOR_SICHTER, id: "N-2", nummer: 5, vorrang: "BLITZ", vorrangstufe: 0, betreff: "Person im Wasser" };
    render(<Sichterstaukarte zeilen={[einfach, blitz]} sichterDa={false} schwelleMinuten={20} nurLesen={false} aufSelbst={vi.fn()} />);
    const karte = screen.getByRole("region", { name: "Vor dem Sichter" });
    expect(karte.className).toContain("breit");
    expect(within(karte).getAllByRole("columnheader").map((k) => k.textContent)).toContain("Wartet");
    expect(within(karte).getAllByRole("row")[1]?.textContent).toContain("Person im Wasser");
  });

  it("hält im Stylesheet die Regeln für festes Layout, Umbruch und volle Breite", () => {
    const seite = Object.values(import.meta.glob("./index.html", { eager: true, query: "?raw", import: "default" }))[0] as string;
    expect(seite).toMatch(/\.fmzkarten > \* \{\s*min-width: 0;/u);
    expect(seite).toMatch(/\.fmzkarten\.untereinander \{\s*grid-template-columns: minmax\(0, 1fr\);/u);
    expect(seite).toMatch(/\.fmzkarten > \.breit \{\s*grid-column: 1 \/ -1;/u);
    expect(seite).toMatch(/\.fmzkarten\.untereinander \.nachrichtentabelle \{\s*table-layout: fixed;/u);
    expect(seite).toMatch(/overflow-wrap: anywhere;/u);
    expect(seite).toMatch(/\.hinweisanker \{\s*position: relative;\s*height: 0;/u);
  });
});

describe("R2-Si P2-3: Lesen-Fenster", () => {
  function Mitauswahl({ aufAbbrechen }: { readonly aufAbbrechen: () => void }): null {
    useKuerzel({ abbrechen: aufAbbrechen });
    return null;
  }

  it("schließt mit Escape nur das Fenster, hält Tab im Fenster und gibt den Fokus zurück", () => {
    const aufAbbrechen = vi.fn();
    const aufSchliessen = vi.fn();
    const ausloeser = document.createElement("button");
    ausloeser.textContent = "Lesen";
    document.body.append(ausloeser);
    ausloeser.focus();
    const { unmount } = render(
      <>
        <Mitauswahl aufAbbrechen={aufAbbrechen} />
        <Nachrichtenansicht zeile={BLITZ_AN_S4} aufSchliessen={aufSchliessen} />
      </>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const schliessen = within(dialog).getByRole("button", { name: "Schließen" });
    expect(document.activeElement).toBe(schliessen);
    fireEvent.keyDown(schliessen, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.body, { key: "Tab", shiftKey: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Escape" });
    expect(aufSchliessen).toHaveBeenCalledTimes(1);
    expect(aufAbbrechen).not.toHaveBeenCalled();
    unmount();
    expect(document.activeElement).toBe(ausloeser);
    ausloeser.remove();
  });
});

describe("Hinweiskasten, Reiterzahl, Stellenmerker, Nummer", () => {
  it("überlagert über einem Anker ohne Höhe und schließt einzelne Warnungen mit „×“", () => {
    useLaden.getState().melde("warnung", "FmZ nicht besetzt");
    useLaden.getState().melde("warnung", "Blitz-Nachricht E 5");
    render(<Hinweiskasten />);
    const kasten = screen.getByRole("region", { name: "Hinweise" });
    expect(kasten.parentElement?.className).toBe("hinweisanker");
    fireEvent.click(within(kasten).getByRole("button", { name: "Hinweis schließen: FmZ nicht besetzt" }));
    expect(useLaden.getState().hinweise.map((h) => h.text)).toEqual(["Blitz-Nachricht E 5"]);
  });

  it("zählt am Reiter für Sichter und FmZ auch die eigene Warteschlange", () => {
    const lage = { neuFuerStellen: 1, vorFmz: 2, vorSichter: 4, mitVorrangOffen: 0, ueberSchwelle: 0 };
    expect(nachrichtenzahl(lage, ["S3"])).toBe(1);
    expect(nachrichtenzahl(lage, ["SICHTER"])).toBe(5);
    expect(nachrichtenzahl(lage, ["FMZ"])).toBe(3);
    expect(nachrichtenzahl(undefined, ["FMZ"])).toBe(0);
  });

  it("bietet das Handzeichen aus dem Merker nur unter demselben Anzeigenamen an", () => {
    merkeStelle("Einsatz-1", { stellen: ["S3"], handzeichen: "Mü" }, Date.now(), "Lage 1");
    expect(gemerkteStelleFuer("Einsatz-1", "Lage 1")).toEqual({ stellen: ["S3"], handzeichen: "Mü" });
    expect(gemerkteStelleFuer("Einsatz-1", "Lage 2")).toEqual({ stellen: ["S3"] });
    merkeStelle("Einsatz-2", { stellen: ["S4"], handzeichen: "Ru" });
    expect(gemerkteStelleFuer("Einsatz-2", "Lage 1")).toEqual({ stellen: ["S4"] });
  });

  it("schreibt „folgt (FmZ)“ nur, solange nicht befördert, danach „ohne Nummer“", () => {
    expect(nummerOhne({}, true)).toBe("folgt (FmZ)");
    expect(nummerOhne({ befoerderung: { mittel: "FUNK", zeitpunkt: "2026-11-17T10:00:00.000Z", handzeichen: "Fm" } }, true)).toBe("ohne Nummer");
    expect(nummerOhne({}, false)).toBe("—");
  });
});

// Die Lagebild-Typen des anderen Arbeitsstrangs werden optional gelesen; dieser Test hält die Form fest.
it("liest `besetzteStellen` nur, wenn es eine Liste von Wörtern ist", async () => {
  const { fmzBesetzt } = await import("./Nachrichtenkopf.js");
  const lagebild = { ...NACHRICHTEN_LAGEBILD, peers: [], sitzung: { stellen: ["S3"] } } as Lagebild;
  expect(fmzBesetzt(lagebild)).toBe(false);
  expect(fmzBesetzt({ ...lagebild, besetzteStellen: ["FMZ"] } as Lagebild)).toBe(true);
  expect(fmzBesetzt({ ...lagebild, besetzteStellen: "FMZ" } as unknown as Lagebild)).toBe(false);
});

it("zeigt in der Hilfe zur Ansicht Nachrichten die Begriffe (R2-FaBe P1-2)", async () => {
  const { Ansichtenteil } = await import("./Hilfeteile.js");
  render(<Ansichtenteil />);
  expect(screen.getByText(/FmZ ist die Fernmeldezentrale/u).textContent).toContain("Begriffe:");
});
