/**
 * Der Arbeitsplatz als Fenster: **ein Blatt zur Zeit** (Entwurf „Oberfläche",
 * Option 2a).
 *
 * Vorher standen Lage, Ausgaben, Tagebuch und die Nebenblätter untereinander;
 * wer die Tabelle sehen wollte, scrollte an allem anderen vorbei. Geprüft wird
 * deshalb das Weglassen: Was der Reiter nicht wählt, ist nicht zu sehen — und
 * die Auswahl von Abschnitt und Einheit überlebt den Blattwechsel, weil
 * Ausgaben und Tagebuch sich auf sie beziehen.
 */

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Arbeitsplatz } from "./Arbeitsplatz.js";
import { useLaden } from "./laden.js";
import { ladeMerker, speichereMerker } from "./sitzung.js";
import { baueAttrappe, type Attrappe } from "./pruefhilfen/attrappe.js";

afterEach(cleanup);

const UMGEBUNG = {
  plattform: "linux",
  electron: "43.0.0",
  programmversion: "0.0.0-test",
  rechnername: "fuest-1",
  clientId: "aabbccdd-0000-0000-0000-000000000001",
};

const EINSTELLUNGEN = {
  sharePfad: "/share",
  anzeigename: "Führungsstelle 1",
  betriebsart: "fuehrungsstelle",
} as const;

const KNOTEN = {
  id: "EA1",
  name: "EA 1 Deich Nord",
  typ: "EINSATZORT",
  reihenfolge: 1,
  tiefe: 0,
  eigeneStaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  summenStaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  einheiten: 1,
  einheitenSumme: 1,
  zaehlt: true,
  systemAbschnitt: false,
  kinder: [],
} as never;

const LAGEBILD = {
  einsatzId: "2026-09-10_hochwasser_ab12cd",
  einsatzName: "Hochwasser Oldenburg",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:00.000Z",
  letzterShareKontakt: "2026-09-10T08:00:00.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 1, unterfuehrer: 2, mannschaft: 9 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 0,
  lageZeiger: 1,
} as const;

let attrappe: Attrappe;

/** Sichtbar heißt: in keinem zugeklappten Blatt. */
function sichtbar(name: string): boolean {
  const knoten = screen.queryByLabelText(name);
  return knoten !== null && knoten.closest("[hidden]") === null;
}

/** Schlägt ein Blatt auf, das das Profil Führungsstelle unter „Mehr“ führt. */
async function ausMehr(name: string): Promise<void> {
  await userEvent.click(screen.getByRole("button", { name: "Mehr ▾" }));
  await userEvent.click(screen.getByRole("menuitemradio", { name }));
}

beforeEach(() => {
  // Der Reload-Merker gehört in den Browser, nicht in den nächsten Test.
  sessionStorage.clear();
  localStorage.clear();
  attrappe = baueAttrappe();
  attrappe.antwortet("umgebung", UMGEBUNG);
  attrappe.antwortet("einstellungenLesen", EINSTELLUNGEN);
  attrappe.antwortet("einsaetzeAuflisten", []);
  attrappe.antwortet("baumAnfordern", { lageZeiger: 1, baum: [KNOTEN] });
  attrappe.antwortet("tabelleAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
    spalten: [],
  });
  attrappe.antwortet("tagebuchAnfordern", { lageZeiger: 1, zeilen: [], von: 0, gesamtzahl: 0 });
  // Die Antwort hat die Form der Kostenansicht (`blatt`), sonst liest die
  // Kostenansicht `parameter` von undefined, sobald das Blatt aufgeschlagen wird.
  attrappe.antwortet("kostenAnfordern", {
    lageZeiger: 1,
    blatt: {
      parameter: { psaKostenProSatz: 0, vdaProTag: 0, ukVerpflegungProTag: 0, geplanteEinsatztage: 0 },
      zeilen: [],
      summe: { koepfe: 0, psaProTag: 0, vdaUkProTag: 0, personentage: 0, gesamt: 0 },
      ausgenommen: 0,
    },
  });
  attrappe.antwortet("eingangskorbAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
    jeZustand: { NEU: 3, GEAENDERT: 0, UEBERNOMMEN: 0, ABGELEHNT: 0 },
    offen: 3,
  });
  attrappe.antwortet("anforderungenAnfordern", {
    lageZeiger: 1,
    zeilen: [],
    von: 0,
    gesamtzahl: 0,
    jeZustand: { OFFEN: 0, ZUGESAGT: 0, EINGETROFFEN: 0, STORNIERT: 0 },
  });
  attrappe.antwortet("fuestAnfordern", { lageZeiger: 1, bloecke: [], plan: { tage: [], zeilen: [] }, staerke: [] });
  useLaden.setState({
    akteId: "akte-1",
    einstellungen: EINSTELLUNGEN,
    lagebild: LAGEBILD,
    umgebung: UMGEBUNG,
    baum: undefined,
    tabelle: undefined,
    tagebuch: undefined,
    kosten: undefined,
    eingangskorb: undefined,
    anforderungen: undefined,
    fuest: undefined,
    tabellenfilter: {},
    fehler: undefined,
    hinweise: [],
  });
});

describe("Der Arbeitsplatz", () => {
  it("schlägt die Lage auf und zeigt sonst kein Blatt", async () => {
    render(<Arbeitsplatz />);

    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(sichtbar("Einheiten")).toBe(true);
    expect(sichtbar("Einsatztagebuch")).toBe(false);
    expect(screen.queryByLabelText("Ausgaben")).toBeNull();
    expect(screen.queryByLabelText("Kostenübersicht")).toBeNull();
  });

  it("wechselt mit dem Reiter das Blatt und legt die Lage darunter weg", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });

    await userEvent.click(screen.getByRole("tab", { name: "Einsatztagebuch" }));
    await waitFor(() => {
      expect(sichtbar("Einsatztagebuch")).toBe(true);
    });
    // Die Lage bleibt eingehängt — sie hält die Auswahl —, ist aber weg.
    expect(sichtbar("Abschnitte")).toBe(false);

    await userEvent.click(screen.getByRole("tab", { name: "Lage" }));
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
  });

  it("holt ein Nebenblatt erst, wenn es aufgeschlagen wird (M3.7)", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(attrappe.rufeDerArt("kostenAnfordern")).toHaveLength(0);

    await ausMehr("Kosten");
    await waitFor(() => {
      expect(attrappe.rufeDerArt("kostenAnfordern").length).toBeGreaterThan(0);
    });
  });

  it("führt in der Lage keine Werkzeugzeile, weder Monitor noch Rückgängig — Rückgängig steht einmal, unten", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    const lage = screen.getByLabelText("Lagebild");
    // Die Werkzeugzeile der Lage ist ganz weg; der Bogen steckt im Hauptknopf der Einheitenkarte.
    expect(document.querySelector(".lagekopf")).toBeNull();
    expect(within(lage).queryByRole("button", { name: "Erfassungsbogen einlesen" })).toBeNull();
    await userEvent.click(within(lage).getByRole("button", { name: "Einheit anlegen" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Erfassungsbogen einlesen …" }));
    expect(screen.getByRole("region", { name: "Erfassungsbogen einlesen" })).toBeDefined();
    expect(within(lage).queryByRole("button", { name: /Stärke-Monitor/ })).toBeNull();
    expect(within(lage).queryByRole("button", { name: /Rückgängig/ })).toBeNull();
    const ruecknahmen = screen.getAllByRole("button", { name: /Rückgängig/ });
    expect(ruecknahmen).toHaveLength(1);
    expect(ruecknahmen[0]?.closest("footer")?.getAttribute("aria-label")).toBe("Statuszeile");
    // Der Monitor ist über das Fenstermenü erreichbar.
    await userEvent.click(screen.getByRole("button", { name: "Fenstermenü" }));
    expect(screen.getByRole("menuitem", { name: "Stärke-Monitor öffnen …" })).toBeDefined();
  });

  it("zeigt unter dem Kopfband die Einstiegszeile des aufgeschlagenen Blatts", async () => {
    localStorage.clear();
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(screen.getByRole("complementary", { name: "Einstieg: Lage" })).toBeDefined();
    await ausMehr("Kosten");
    expect(screen.getByRole("complementary", { name: "Einstieg: Kosten" })).toBeDefined();
    // Keine Hilfemarke „?“ mehr an den Karten (3.6).
    expect(screen.queryByRole("button", { name: /^Hilfe zu / })).toBeNull();
  });

  it("trägt Eingangskorb und Anforderungen als Umschalter im Blatt „Eingang“ (E3)", async () => {
    render(<Arbeitsplatz />);
    await userEvent.click(await screen.findByRole("tab", { name: "Eingang" }));
    const umschalter = screen.getByRole("group", { name: "Unteransicht Eingang" });
    const korb = await within(umschalter).findByRole("button", { name: "Eingangskorb (3 offen)" });
    expect(korb.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("region", { name: "Eingangskorb" })).toBeDefined();
    // Nur die gewählte Unteransicht ist eingehängt — ihre Kürzel gelten allein.
    expect(screen.queryByRole("region", { name: "Anforderungen" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "Einstieg: Eingang · Eingangskorb" })).toBeDefined();

    await userEvent.click(within(umschalter).getByRole("button", { name: "Anforderungen" }));
    expect(screen.getByRole("region", { name: "Anforderungen" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Eingangskorb" })).toBeNull();
    expect(screen.getByRole("complementary", { name: "Einstieg: Eingang · Anforderungen" })).toBeDefined();
    await waitFor(() => {
      expect(ladeMerker()?.blatt).toBe("eingang.anforderungen");
    });

    // Die Unteransicht bleibt, solange das Fenster offen ist.
    await userEvent.click(screen.getByRole("tab", { name: "Lage" }));
    await userEvent.click(screen.getByRole("tab", { name: /^Eingang/ }));
    expect(screen.getByRole("region", { name: "Anforderungen" })).toBeDefined();
  });

  it("trägt Stammdaten und Führungsorganisation als Umschalter im Blatt „Führungsstelle“ (E3)", async () => {
    render(<Arbeitsplatz />);
    await userEvent.click(await screen.findByRole("tab", { name: "Führungsstelle" }));
    const umschalter = screen.getByRole("group", { name: "Unteransicht Führungsstelle" });
    expect(within(umschalter).getByRole("button", { name: "Stammdaten und Schichtplan" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("region", { name: "Führungsstelle" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Führungsorganisation" })).toBeNull();

    await userEvent.click(within(umschalter).getByRole("button", { name: "Führungsorganisation" }));
    expect(screen.getByRole("region", { name: "Führungsorganisation" })).toBeDefined();
    expect(screen.queryByRole("region", { name: "Führungsstelle" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Führungsorganisation" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Anforderungen" })).toBeNull();
  });

  it("schlägt mit „Im Tagebuch zeigen“ das Tagebuch der Einheit auf", async () => {
    attrappe.antwortet("tabelleAnfordern", {
      lageZeiger: 1,
      zeilen: [
        {
          einheitId: "U1",
          abschnittId: "EA1",
          abschnittName: "EA 1 Deich Nord",
          reihenfolge: 1,
          anzeige: "FGr WP 1",
          staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
          gesamt: 9,
          entfernt: false,
          zaehlklasse: "ist",
          aufgegangen: false,
          hinweise: [],
          zellen: { bezeichnung: { text: "FGr WP 1", wert: "FGr WP 1", umstritten: false } },
        },
      ],
      von: 0,
      gesamtzahl: 1,
    });
    attrappe.antwortet("untertabelleAnfordern", { lageZeiger: 1, einheitId: "U1", fahrzeuge: [], personen: [], auftraege: [] });
    render(<Arbeitsplatz />);
    const zeile = (await screen.findByText("FGr WP 1")).closest("tr") as HTMLElement;
    zeile.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Im Tagebuch zeigen" }));
    await waitFor(() => {
      expect(sichtbar("Einsatztagebuch")).toBe(true);
    });
    expect(screen.getByRole("tab", { name: "Einsatztagebuch" }).getAttribute("aria-selected")).toBe("true");
    await waitFor(() => {
      expect(attrappe.letzterRuf("tagebuchAnfordern")?.einheitId).toBe("U1");
    });
  });

  it("stellt die Reiter des gespeicherten Profils ins Band (E3)", async () => {
    const einstellungen = { ...EINSTELLUNGEN, profil: "versorgung" } as const;
    attrappe.antwortet("einstellungenLesen", einstellungen);
    useLaden.setState({ einstellungen });
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(screen.getAllByRole("tab").map((reiter) => reiter.textContent)).toEqual(["Versorgung", "Lage", "Ausgaben"]);
    await ausMehr("Einsatztagebuch");
    await waitFor(() => {
      expect(sichtbar("Einsatztagebuch")).toBe(true);
    });
    expect(screen.getByRole("tab", { name: "Einsatztagebuch", selected: true })).toBeDefined();
  });

  it("schlägt die Diagnose über das Fenstermenü auf, nicht über einen Reiter", async () => {
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(true);
    });
    expect(screen.queryByRole("tab", { name: "Diagnose" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Fenstermenü" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Diagnose" }));
    await waitFor(() => {
      expect(sichtbar("Abschnitte")).toBe(false);
    });
    await waitFor(() => {
      expect(attrappe.rufeDerArt("diagnoseAnfordern").length).toBeGreaterThan(0);
    });
  });

  it("merkt Einsatz und Blatt für den Reload und löscht den Merker beim ausdrücklichen Zurück", async () => {
    render(<Arbeitsplatz />);
    await userEvent.click(await screen.findByRole("tab", { name: "Einsatztagebuch" }));
    await waitFor(() => {
      expect(ladeMerker()).toMatchObject({ ordner: LAGEBILD.einsatzId, blatt: "tagebuch" });
    });

    await userEvent.click(screen.getByRole("button", { name: "Fenstermenü" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Einsatz schließen" }));
    await waitFor(() => {
      expect(ladeMerker()).toBeUndefined();
    });
    expect(attrappe.rufeDerArt("einsatzSchliessen")).toHaveLength(1);
  });
});

describe("Der Arbeitsplatz nach einem Reload", () => {
  const ORDNER = "2026-09-10_hochwasser_ab12cd";

  beforeEach(() => {
    attrappe.antwortet("einsaetzeAuflisten", [{ ordner: ORDNER, name: "Hochwasser Oldenburg", datum: "2026-09-10" }]);
    attrappe.antwortet("einsatzOeffnen", { akteId: "akte-neu", einsatzId: ORDNER, ordner: ORDNER });
    useLaden.setState({ akteId: undefined, lagebild: undefined, einsaetze: [], umgebung: undefined });
  });

  it("öffnet den gemerkten Einsatz wieder, mit dem gemerkten Blatt", async () => {
    speichereMerker(ORDNER, "tagebuch");
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(useLaden.getState().akteId).toBe("akte-neu");
    });
    expect(attrappe.letzterRuf("einsatzOeffnen")?.ordner).toBe(ORDNER);
    expect(screen.getByRole("tab", { name: "Einsatztagebuch" }).getAttribute("aria-selected")).toBe("true");
  });

  it("schlägt einen alten Merker „anforderungen“ als Eingang mit Anforderungen auf (E3)", async () => {
    speichereMerker(ORDNER, "anforderungen");
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(useLaden.getState().akteId).toBe("akte-neu");
    });
    expect(screen.getByRole("tab", { name: /^Eingang/ }).getAttribute("aria-selected")).toBe("true");
    const umschalter = screen.getByRole("group", { name: "Unteransicht Eingang" });
    expect(within(umschalter).getByRole("button", { name: "Anforderungen" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("schlägt einen alten Merker „fueorg“ als Führungsstelle mit Führungsorganisation auf, Unbekanntes als Lage", async () => {
    speichereMerker(ORDNER, "fueorg");
    const { unmount } = render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(useLaden.getState().akteId).toBe("akte-neu");
    });
    expect(screen.getByRole("tab", { name: "Führungsstelle" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("button", { name: "Führungsorganisation" }).getAttribute("aria-pressed")).toBe("true");
    unmount();

    useLaden.setState({ akteId: undefined, lagebild: undefined });
    speichereMerker(ORDNER, "gibtsnicht");
    render(<Arbeitsplatz />);
    await waitFor(() => {
      expect(useLaden.getState().akteId).toBe("akte-neu");
    });
    expect(screen.getByRole("tab", { name: "Lage" }).getAttribute("aria-selected")).toBe("true");
  });

  it("landet ohne Merker in der Einsatzliste", async () => {
    render(<Arbeitsplatz />);
    expect(await screen.findByRole("button", { name: /Hochwasser Oldenburg/ })).toBeDefined();
    expect(attrappe.rufeDerArt("einsatzOeffnen")).toHaveLength(0);
    expect(useLaden.getState().akteId).toBeUndefined();
  });

  it("zeigt die Einsatzliste mit Hinweis, wenn der Einsatz nicht aufgeht", async () => {
    speichereMerker(ORDNER, "lage");
    attrappe.scheitert("einsatzOeffnen", "Der Share antwortet nicht.");
    render(<Arbeitsplatz />);
    expect(await screen.findByText(/Einsatz konnte nicht wieder geöffnet werden: Der Share antwortet nicht\./)).toBeDefined();
    expect(screen.getByRole("button", { name: /Hochwasser Oldenburg/ })).toBeDefined();
  });
});
