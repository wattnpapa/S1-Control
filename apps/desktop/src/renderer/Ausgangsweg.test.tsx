/**
 * Der Weg eines Ausgangs mit LdF als Station (2026-11-21): Verfasser → LdF
 * teilt zu → Fernmelder überträgt → LdF weist nach und gibt weiter →
 * Sichter verteilt an S2 (rot) und den Verfasser (grün).
 */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Nachrichtenzeile } from "@s1/domaene";

import type { Entwurf } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { Laufzettel } from "./Laufzettel.js";
import { weitergabeEntwurf } from "./Ldfmaske.js";
import { Ldfsicht } from "./Ldfsicht.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";
import { NACHRICHTEN_LAGEBILD, VOR_SICHTER } from "./pruefhilfen/nachrichtenbeispiel.js";

afterEach(cleanup);

let attrappe: Attrappe;
beforeEach(() => {
  attrappe = baueAttrappe();
  attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "e-1" });
  useLaden.setState({ akteId: "akte-1", lagebild: { ...NACHRICHTEN_LAGEBILD, sitzung: { stellen: ["LDF", "SICHTER"], handzeichen: "Lf" } }, hinweise: [] });
});

const BEFOERDERUNG = { mittel: "FUNK", zeitpunkt: "2026-11-21T09:10:00.000Z", handzeichen: "Ka" };

const ZUR_ZUTEILUNG: Nachrichtenzeile = { ...VOR_SICHTER, id: "A-neu", richtung: "AUSGANG", richtungKurz: "A", betreff: "Sandsäcke", absender: "S4", funktion: "S4", laufzustand: "VOR_LDF" };
const BEFOERDERT: Nachrichtenzeile = { ...ZUR_ZUTEILUNG, id: "A-bef", betreff: "Pumpe anfordern", befoerderung: BEFOERDERUNG, gegenstelle: "Heros Wildeshausen 10" };
const OHNE_NUMMER = (() => {
  const kopie: Record<string, unknown> = { ...BEFOERDERT };
  delete kopie["nummer"];
  return kopie as unknown as Nachrichtenzeile;
})();

describe("LdF: Zuteilung vor der Beförderung, Nachweisung und Weitergabe danach", () => {
  it("führt den beförderten Ausgang in der Karte vor der Weitergabe, nicht bei der Zuteilung", () => {
    render(<Ldfsicht zeilen={[ZUR_ZUTEILUNG, OHNE_NUMMER]} handzeichen="Lf" nurLesen={false} aufVorschlag={vi.fn()} naechsteNummer={7} />);
    const zuteilung = screen.getByRole("table", { name: "Ausgänge vor der Zuteilung an einen Fernmelder" });
    expect(within(zuteilung).getAllByRole("row")).toHaveLength(2);
    const weitergabe = screen.getByRole("table", { name: "Nachrichten vor der Weitergabe an den Sichter" });
    const zeile = within(weitergabe).getByRole("row", { name: /Pumpe anfordern/ });
    expect(zeile.textContent).toContain("an Heros Wildeshausen 10");
    expect(within(zeile).getByRole("button", { name: "Nachweisen und weitergeben" })).toBeTruthy();
  });

  it("trägt beim Weitergeben die Nummer der Nachweisung ein, vorbelegt mit der nächsten freien", async () => {
    render(<Ldfsicht zeilen={[OHNE_NUMMER]} handzeichen="Lf" nurLesen={false} aufVorschlag={vi.fn()} naechsteNummer={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Nachweisen und weitergeben" }));
    const maske = screen.getByRole("form", { name: /An den Sichter weitergeben/ });
    expect(maske.textContent).toContain("Beförderung:");
    expect((within(maske).getByLabelText("Nummer (Nachweisung)") as HTMLInputElement).value).toBe("7");
    fireEvent.click(within(maske).getByRole("button", { name: "Weitergeben" }));
    await waitFor(() => expect(attrappe.rufeDerArt("bedienen")).toHaveLength(1));
    const entwurf = (attrappe.rufeDerArt("bedienen")[0] as { entwurf: Entwurf }).entwurf;
    // Erst die Nummer mit Vorwert-Prüfung, die Weitergabe folgt im Worker.
    expect(entwurf).toMatchObject({ typ: "NachrichtNachgewiesen", nutzlast: { nachrichtId: "A-bef" }, vorher: null, vorwertPruefen: true, neu: { nummer: 7, handzeichen: "Lf" }, nachrichtenfolge: { weitergabe: { handzeichen: "Lf" } } });
  });

  it("schreibt ohne Nummer keinen Nachweis und lehnt eine unlesbare Nummer ab", () => {
    const ohne = weitergabeEntwurf(OHNE_NUMMER, { zeit: "1015", handzeichen: "Lf", nummer: "" });
    expect(typeof ohne === "string" ? ohne : ohne.typ).toBe("NachrichtWeitergegeben");
    expect(weitergabeEntwurf(OHNE_NUMMER, { zeit: "1015", handzeichen: "Lf", nummer: "x7" })).toBe("Nummer als ganze Zahl eintragen");
    // Trägt die Nachricht schon eine Nummer, bleibt sie, wie sie ist.
    const mit = weitergabeEntwurf({ ...BEFOERDERT, nummer: 3 }, { zeit: "1015", handzeichen: "Lf", nummer: "9" });
    expect(typeof mit === "string" ? mit : mit.typ).toBe("NachrichtWeitergegeben");
  });
});

describe("Sichter: Verteilung eines beförderten Ausgangs", () => {
  it("belegt rot S2 und grün die Stelle des Verfassers vor, nicht die Anschrift draußen", () => {
    render(<Laufzettel zeile={{ ...BEFOERDERT, laufzustand: "VOR_SICHTER", anschrift: "OV Wildeshausen" }} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} />);
    expect((screen.getByRole("checkbox", { name: "S2 rot" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "S4 grün" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.queryByRole("checkbox", { name: "OV Wildeshausen grün" })).toBeNull();
  });
});

describe("Andere Programmfassung in der Präsenz (Review 2026-11-21)", () => {
  it("nennt lebende Arbeitsplätze mit anderer oder ohne Fold-Fassung, nicht die veralteten", async () => {
    const { andereFassungen, fassungstext } = await import("./Nachrichtenkopf.js");
    const { FOLD_VERSION } = await import("@s1/domaene");
    const peers = [
      { veraltet: false, anzeigename: "LdF-Platz", foldVersion: FOLD_VERSION - 1 },
      { veraltet: false, anzeigename: "Altclient" },
      { veraltet: true, anzeigename: "Weg", foldVersion: 1 },
      { veraltet: false, anzeigename: "Aktuell", foldVersion: FOLD_VERSION },
    ];
    expect(andereFassungen(peers)).toEqual(["LdF-Platz", "Altclient"]);
    expect(fassungstext(["LdF-Platz"])).toContain("Kopien können ausbleiben");
  });
});

describe("Befördern mit besetztem LdF (Review 2026-11-21)", () => {
  it("sagt beim leeren Nummernfeld, dass der LdF die Nummer einträgt", async () => {
    const { Befoerderungszusatz, TEXT_NUMMER_DURCH_LDF } = await import("./Befoerderungszusatz.js");
    render(<Befoerderungszusatz zeile={OHNE_NUMMER} nummer="" aufNummer={vi.fn()} warnung={undefined} ohneNummerBestaetigt={false} durchLdf />);
    expect(screen.getByText(TEXT_NUMMER_DURCH_LDF)).toBeTruthy();
  });
});

describe("Darstellung je Rolle (Review 2026-11-21)", () => {
  it("Verfasser: Die Spalte „Stand“ sagt, wo der Ausgang steht und wer dran ist", async () => {
    const { wegwort, ausgangsstand, nummerOhne } = await import("./Nachrichtenliste.js");
    expect(wegwort(ZUR_ZUTEILUNG)).toBe("beim LdF (Zuteilung)");
    expect(wegwort({ ...ZUR_ZUTEILUNG, ldfNichtBesetzt: true } as Nachrichtenzeile)).toBe("vor der FmZ (kein LdF)");
    const zugeteilt = { ...ZUR_ZUTEILUNG, laufzustand: "VOR_FMZ" as const, vorschlag: { mittel: "FUNK", fernmelder: "Fm2", zeitpunkt: "2026-11-21T09:00:00.000Z", handzeichen: "Lf" } };
    expect(wegwort(zugeteilt)).toBe("bei Fm2");
    expect(ausgangsstand(BEFOERDERT)).toMatch(/^beim LdF \(Nachweisung\) · /u);
    expect(wegwort({ ...BEFOERDERT, laufzustand: "VOR_SICHTER" })).toBe("vor dem Sichter");
    expect(nummerOhne(OHNE_NUMMER, true)).toBe("folgt (LdF)");
  });

  it("Sichter: Der Laufzettel nennt beim Ausgang Beförderung, Fernmelder und Nummer und warnt nicht vor fehlendem Hauptempfänger", async () => {
    const { ausgangskopf } = await import("./Laufzettel.js");
    const zeile = { ...BEFOERDERT, laufzustand: "VOR_SICHTER" as const, nummer: 7, vorschlag: { mittel: "FUNK", fernmelder: "Fm2", zeitpunkt: "2026-11-21T09:00:00.000Z", handzeichen: "Lf" }, weitergabe: { zeitpunkt: "2026-11-21T09:20:00.000Z", handzeichen: "Lf" } };
    expect(ausgangskopf(zeile)).toMatch(/^Ausgang · befördert Funk .* Ka \(Fm2\) an Heros Wildeshausen 10 · Nr\. 7 · weitergegeben Lf$/u);
    render(<Laufzettel zeile={{ ...zeile, absender: "S2", funktion: "S2" }} handzeichen="Si" nurLesen={false} aufGesichtet={vi.fn()} />);
    expect(screen.queryByText(/Kein Hauptempfänger/u)).toBeNull();
  });

  it("LdF: Die Sicht zeigt zugeteilte, noch nicht beförderte Ausgänge mit „Zuteilung ändern“", () => {
    const zugeteilt = { ...ZUR_ZUTEILUNG, id: "A-zu", laufzustand: "VOR_FMZ" as const, betreff: "Zugeteilt", vorschlag: { mittel: "FUNK", fernmelder: "Fm2", zeitpunkt: "2026-11-21T09:00:00.000Z", handzeichen: "Lf" } };
    const aufVorschlag = vi.fn();
    render(<Ldfsicht zeilen={[zugeteilt, OHNE_NUMMER]} handzeichen="Lf" nurLesen={false} aufVorschlag={aufVorschlag} />);
    const karte = screen.getByRole("table", { name: "Zugeteilte Ausgänge vor der Beförderung" });
    expect(within(karte).getByRole("row", { name: /Zugeteilt/ }).textContent).toContain("Fm2");
    fireEvent.click(within(karte).getByRole("button", { name: "Zuteilung ändern" }));
    expect(aufVorschlag).toHaveBeenCalledWith(zugeteilt);
    const weitergabe = screen.getByRole("table", { name: "Nachrichten vor der Weitergabe an den Sichter" });
    expect(within(weitergabe).getByRole("row", { name: /Pumpe anfordern/ }).textContent).toMatch(/^A—S4/u);
  });

  it("S2: Lese-Ansicht und Band sagen, wann die Kopien kommen und wie sich der LdF-Stand teilt", async () => {
    const { verteilerleer } = await import("./Vordruckteile.js");
    const { ldfkacheltitel } = await import("./Nachrichtenkopf.js");
    expect(verteilerleer(BEFOERDERT, false)).toMatch(/^wartet beim LdF \(Nachweisung\)/u);
    expect(verteilerleer({ ...BEFOERDERT, laufzustand: "VOR_SICHTER" }, false)).toBe("wartet beim Sichter, die rote Kopie an S2 folgt");
    expect(ldfkacheltitel({ vorLdf: 3, vorLdfZuteilung: 2 } as never, true)).toBe("vor dem LdF · 2 Zuteilung, 1 Weitergabe");
  });
});
