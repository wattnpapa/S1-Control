/**
 * Das Kopfband (Entwurf „Entlastung", Optionen 6b und 6d).
 *
 * Geprüft wird, was oben am Fenster steht und was das Fenstermenü meldet —
 * nicht, aus welchen Elementen das Band gebaut ist. Seit Runde 6 („Entlastung")
 * hat es zwei Zeilen: Einsatz, Stärke, Zeit, Zustandsmarke und „⋯", darunter
 * die Reiter. Was vorher als Knopf im Band stand, wird über das Menü gefunden.
 */

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Kopfband, fuestZeile } from "./Kopfband.js";
import { STAERKE_REGEL, staerkeNebenText } from "./Staerkekennzahl.js";
import type { Lagebild } from "../kontrakt/index.js";
import { useLaden } from "./laden.js";
import { baueAttrappe } from "./pruefhilfen/attrappe.js";
import { useVerbindung } from "./verbindung.js";

const UMGEBUNG = { plattform: "linux", electron: "43", programmversion: "0", rechnername: "r", clientId: "c" };

beforeEach(() => {
  baueAttrappe();
  useVerbindung.getState().zuruecksetzen();
  useLaden.setState({ akteId: "akte-1", umgebung: UMGEBUNG, bildschirme: undefined, fehler: undefined, hinweise: [] });
});

/** Klappt das Fenstermenü auf und gibt es zurück. */
async function oeffneMenue(): Promise<HTMLElement> {
  await userEvent.click(screen.getByRole("button", { name: "Fenstermenü" }));
  return screen.getByRole("menu", { name: "Fenstermenü" });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const JETZT = new Date(2026, 8, 10, 14, 43).getTime();

const PEER = {
  clientId: "b",
  anzeigename: "B",
  rechnername: "rb",
  veraltet: false,
  wanduhr: "",
  programmversion: "2.0.0",
  segment: 1,
  offset: 0,
  gelesenerOffset: 0,
  uhrAbweichungMs: 0,
  quarantaene: 0,
};

const LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: new Date(JETZT - 6000).toISOString(),
  letzterShareKontakt: new Date(JETZT - 3000).toISOString(),
  shareErreichbar: true,
  peers: [
    { ...PEER, clientId: "b", anzeigename: "B", rechnername: "rb" },
    { ...PEER, clientId: "c", anzeigename: "C", rechnername: "rc" },
  ],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 6,
  einheiten: 42,
  gesamtstaerke: { fuehrer: 24, unterfuehrer: 61, mannschaft: 183 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 0,
};

describe("Kopfband", () => {
  it("lässt die Stärke ohne Einsatz weg, die Zeit bleibt", () => {
    render(<Kopfband lagebild={undefined} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />);
    expect(screen.queryByText("Ist-Stärke")).toBeNull();
    expect(screen.queryByRole("button", { name: "Regel" })).toBeNull();
    expect(screen.getByText("101443SEP26")).toBeDefined();
  });

  it("zeigt Stärke und taktische Zeit in der vereinbarten Schreibweise", () => {
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText("24/61/183 // 268")).toBeDefined();
    expect(screen.getByText("101443SEP26")).toBeDefined();
  });

  it("erklärt die Zählregel sichtbar und zeigt erwartete Köpfe neben der Kopfzahl", async () => {
    const { container } = render(
      <Kopfband
        lagebild={{ ...LAGEBILD, staerkeErwartet: 6, staerkeBeendet: 2 }}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.getByText("Ist-Stärke")).toBeDefined();
    expect(screen.getByText("+6 erwartet (angefordert/Anmarsch/Eingang) · 2 beendet")).toBeDefined();
    expect(container.querySelector(".kennzahl")?.getAttribute("title")).toBe(STAERKE_REGEL);
    // Auf Touch gibt es keinen Tooltip: Ein Tipp auf „Regel“ zeigt den Text.
    expect(screen.queryByRole("note")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Regel" }));
    expect(screen.getByRole("note").textContent).toContain(STAERKE_REGEL);
    await userEvent.click(screen.getByRole("button", { name: "Regel" }));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("schließt die Zählregel per Esc, Tipp daneben und „Schließen“", async () => {
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    const oeffne = async (): Promise<void> => {
      await userEvent.click(screen.getByRole("button", { name: "Regel" }));
      expect(screen.getByRole("note")).toBeDefined();
    };
    await oeffne();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("note")).toBeNull();
    await oeffne();
    await userEvent.click(document.body);
    expect(screen.queryByRole("note")).toBeNull();
    await oeffne();
    await userEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("zeigt ohne Köpfe außerhalb der Zählung keine Nebenzahl", () => {
    expect(staerkeNebenText(LAGEBILD)).toBe("");
    expect(staerkeNebenText({ ...LAGEBILD, staerkeBeendet: 3 })).toBe("3 beendet");
  });

  it("trägt den Einsatz als Überschrift und die Führungsstelle klein darunter", () => {
    const stammdaten = {
      name: "Hochwasser Oldenburg",
      art: "EINSATZ",
      fuestName: "OV Oldenburg",
      beginn: "2026-09-10T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
    };
    render(
      <Kopfband
        lagebild={{ ...LAGEBILD, stammdaten }}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Hochwasser Oldenburg");
    expect(screen.getByText("FüSt OV Oldenburg · S1-Control")).toBeDefined();
  });

  it("setzt „FüSt“ nur vor einen Namen, der es nicht schon trägt", () => {
    const mit = (fuestName: string): Lagebild =>
      ({ ...LAGEBILD, stammdaten: { fuestName } }) as unknown as Lagebild;
    expect(fuestZeile(mit("FüSt Weser-Ems"))).toBe("FüSt Weser-Ems · S1-Control");
    expect(fuestZeile(mit("OV Oldenburg"))).toBe("FüSt OV Oldenburg · S1-Control");
    expect(fuestZeile(mit(""))).toBe("S1-Control");
    expect(fuestZeile(LAGEBILD)).toBe("S1-Control");
  });

  it("nennt ohne offenen Einsatz das Programm und keine Zustandsmarke", () => {
    render(
      <Kopfband lagebild={undefined} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("S1-Control");
    expect(screen.getByText("Einsatzführung für die Führungsstelle")).toBeDefined();
    expect(document.querySelector(".zustandsmarke")).toBeNull();
  });

  it("zeigt die Zustandsmarke mit der Ausführung im Tooltip statt einer Zustandszeile", () => {
    render(
      <Kopfband lagebild={LAGEBILD} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    const marke = screen.getByText("✓ aktuell");
    expect(marke.getAttribute("title")).toBe("Stand vor 6 s · Share erreichbar · 2 weitere Arbeitsplätze");
    expect(document.querySelector(".zustandszeile")).toBeNull();
  });

  it("sagt in der Untertitelzeile, dass ein beendeter oder archivierter Einsatz gesperrt ist", () => {
    const { rerender } = render(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "BEENDET" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText(/BEENDET — Eingaben gesperrt/u)).toBeDefined();
    rerender(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "ARCHIVIERT" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.getByText(/ARCHIVIERT — nur lesen/u)).toBeDefined();
    expect(screen.getByText(/ARCHIVIERT/u).closest(".untertitel")).not.toBeNull();
    rerender(
      <Kopfband lagebild={{ ...LAGEBILD, einsatzStatus: "AKTIV" }} jetzt={JETZT} theme="standard" waehleTheme={() => undefined} aufHilfe={() => undefined} />,
    );
    expect(screen.queryByText(/gesperrt|nur lesen/u)).toBeNull();
  });

  it("trägt weder Hilfeknopf noch Themenschalter noch den Weg zur Einsatzauswahl im Band", () => {
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        zurueckZurAuswahl={() => undefined}
        angemeldet
      />,
    );
    expect(screen.queryByRole("button", { name: "Hilfe" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Dunkel" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Einsatzauswahl/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Abmelden" })).toBeNull();
  });

  it("zeigt die Reiter erst mit offenem Einsatz und meldet die Wahl", async () => {
    const waehleBlatt = vi.fn();
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        blatt="lage"
        waehleBlatt={waehleBlatt}
        offeneMeldungen={7}
      />,
    );
    expect(screen.getByRole("tab", { name: "Lage", selected: true })).toBeDefined();
    // Der Zähler steht am Reiter, weil dort die Entscheidung fällt, ob man
    // hinsieht — nicht erst im Blatt.
    expect(screen.getByRole("tab", { name: "Eingang 7 offen" })).toBeDefined();

    await userEvent.click(screen.getByRole("tab", { name: /Eingang/ }));
    expect(waehleBlatt).toHaveBeenCalledWith("eingang");
  });

  it("stellt je Profil andere Reiter ins Band und den Rest unter „Mehr“ (E3)", async () => {
    const zeige = (profil: "fuehrungsstelle" | "vermeldezentrale" | "versorgung" | "alle" | undefined): void => {
      cleanup();
      render(
        <Kopfband
          lagebild={LAGEBILD}
          jetzt={JETZT}
          theme="standard"
          waehleTheme={() => undefined}
          aufHilfe={() => undefined}
          blatt="lage"
          waehleBlatt={() => undefined}
          profil={profil}
        />,
      );
    };
    const reiter = (): string[] => screen.getAllByRole("tab").map((knopf) => knopf.textContent);

    zeige(undefined);
    expect(reiter()).toEqual(["Lage", "Eingang", "Führungsstelle", "Ausgaben", "Einsatztagebuch"]);
    zeige("vermeldezentrale");
    expect(reiter()).toEqual(["Funkplan", "Lage", "Einsatztagebuch"]);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    expect(within(screen.getByRole("menu", { name: "Weitere Blätter" })).getAllByRole("menuitemradio").map((e) => e.textContent)).toEqual([
      "Eingang",
      "Führungsstelle",
      "Versorgung",
      "Kosten",
      "Ausgaben",
    ]);
    zeige("versorgung");
    expect(reiter()).toEqual(["Versorgung", "Lage", "Ausgaben"]);
    zeige("alle");
    expect(reiter()).toHaveLength(8);
    expect(screen.queryByRole("button", { name: "Mehr ▾" })).toBeNull();
  });

  it("schlägt ein Blatt aus „Mehr“ auf und zeigt es dann als vorübergehenden Reiter mit Häkchen (E3)", async () => {
    const waehleBlatt = vi.fn();
    const eigenschaften = {
      lagebild: LAGEBILD,
      jetzt: JETZT,
      theme: "standard",
      waehleTheme: () => undefined,
      aufHilfe: () => undefined,
      waehleBlatt,
      offeneMeldungen: 4,
      profil: "vermeldezentrale",
    } as const;
    const { rerender } = render(<Kopfband {...eigenschaften} blatt="funkplan" />);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    const menue = screen.getByRole("menu", { name: "Weitere Blätter" });
    // Der Zähler offener Meldungen steht auch im Menü, als Zahl und im Namen.
    expect(within(menue).getByRole("menuitemradio", { name: "Eingang 4 offen" }).textContent).toBe("Eingang4");
    await userEvent.click(within(menue).getByRole("menuitemradio", { name: "Kosten" }));
    expect(waehleBlatt).toHaveBeenCalledWith("kosten");
    expect(screen.queryByRole("menu")).toBeNull();

    rerender(<Kopfband {...eigenschaften} blatt="kosten" />);
    const kosten = screen.getByRole("tab", { name: "Kosten", selected: true });
    expect(kosten.className).toBe("aus-mehr");
    expect(screen.getAllByRole("tab").map((knopf) => knopf.textContent)).toEqual(["Funkplan", "Lage", "Einsatztagebuch", "Kosten"]);
    await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
    expect(screen.getByRole("menuitemradio", { name: "Kosten" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("menuitemradio", { name: "Versorgung" }).getAttribute("aria-checked")).toBe("false");

    // Zurück in ein Blatt des Bands: Der vorübergehende Reiter geht wieder.
    rerender(<Kopfband {...eigenschaften} blatt="lage" />);
    expect(screen.queryByRole("tab", { name: "Kosten" })).toBeNull();
  });

  it("lässt die Reiterzeile weg, solange kein Einsatz offen ist", () => {
    render(
      <Kopfband
        lagebild={undefined}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
      />,
    );
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("nennt keinen Zähler, wenn nichts offen ist", () => {
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        blatt="kosten"
        waehleBlatt={() => undefined}
      />,
    );
    expect(screen.getByRole("tab", { name: "Eingang" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Kosten", selected: true })).toBeDefined();
  });

  it("führt die Diagnose nicht mehr als Reiter, aber im Fenstermenü", async () => {
    const waehleBlatt = vi.fn();
    render(
      <Kopfband
        lagebild={LAGEBILD}
        jetzt={JETZT}
        theme="standard"
        waehleTheme={() => undefined}
        aufHilfe={() => undefined}
        zurueckZurAuswahl={() => undefined}
        blatt="lage"
        waehleBlatt={waehleBlatt}
      />,
    );
    expect(screen.queryByRole("tab", { name: "Diagnose" })).toBeNull();
    const menue = await oeffneMenue();
    await userEvent.click(within(menue).getByRole("menuitem", { name: "Diagnose" }));
    expect(waehleBlatt).toHaveBeenCalledWith("diagnose");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
