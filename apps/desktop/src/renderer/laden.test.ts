/**
 * Der Zustand-Store gegen eine Attrappe der Brücke (M2.2).
 *
 * Geprüft wird das, was der Store selbst entscheidet — der Delta-Weg, die
 * Lücke, die Kappung der Hinweise und das Fehlerbild. Alles Fachliche kommt
 * fertig aus dem Worker und wird hier nicht nachgerechnet.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { setzeBruecke, type Bruecke } from "./bruecke.js";
import { HINWEISE_MAX, useLaden } from "./laden.js";
import type { Antwort, Lagebild, Mitteilung, Ruf } from "../kontrakt/index.js";

const LAGEBILD: Lagebild = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "0000000000001-00000-aa",
  standWanduhr: "2026-09-10T08:00:00.000Z",
  letzterShareKontakt: "2026-09-10T08:00:05.000Z",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 3,
  einheiten: 1,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
  staerkeJeStatus: { IM_EINSATZ: 9 },
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 2,
  undoObersteArt: "EinheitGemeldet",
};

interface Attrappe extends Bruecke {
  readonly rufe: Ruf[];
  antwortet(art: Ruf["art"], wert: unknown): void;
  scheitert(art: Ruf["art"], meldung: string): void;
}

function baueAttrappe(): Attrappe {
  const rufe: Ruf[] = [];
  const antworten = new Map<string, Antwort<unknown>>();
  return {
    rufe,
    plattform: "linux",
    electron: "43.0.0",
    antwortet(art, wert) {
      antworten.set(art, { ok: true, wert });
    },
    scheitert(art, meldung) {
      antworten.set(art, { ok: false, meldung });
    },
    async ruf(anfrage) {
      rufe.push(anfrage);
      return antworten.get(anfrage.art) ?? { ok: true, wert: null };
    },
    aufMitteilung() {
      return () => undefined;
    },
  };
}

let attrappe: Attrappe;

beforeEach(() => {
  attrappe = baueAttrappe();
  setzeBruecke(attrappe);
  useLaden.setState({
    umgebung: undefined,
    einstellungen: { sharePfad: "", anzeigename: "" },
    einsaetze: [],
    akteId: undefined,
    lagebild: undefined,
    folge: -1,
    fehler: undefined,
    hinweise: [],
    beschaeftigt: false,
  });
});

/** Eine Standmitteilung für die geöffnete Akte. */
function stand(folge: number, teil: Partial<Mitteilung> = {}): Mitteilung {
  return { art: "stand", akteId: "akte-1", folge, ...teil } as Mitteilung;
}

describe("Der Delta-Weg", () => {
  beforeEach(() => {
    useLaden.setState({ akteId: "akte-1" });
  });

  it("nimmt das volle Bild auf", () => {
    useLaden.getState().nimmMitteilung(stand(0, { voll: LAGEBILD }));
    expect(useLaden.getState().lagebild?.einsatzName).toBe("Hochwasser");
    expect(useLaden.getState().folge).toBe(0);
  });

  it("trägt ein Delta auf das Bild auf", () => {
    useLaden.getState().nimmMitteilung(stand(0, { voll: LAGEBILD }));
    useLaden.getState().nimmMitteilung(stand(1, { geaendert: { einheiten: 4 } }));
    expect(useLaden.getState().lagebild?.einheiten).toBe(4);
    // Alles Übrige bleibt stehen — das ist der Sinn eines Deltas.
    expect(useLaden.getState().lagebild?.einsatzName).toBe("Hochwasser");
  });

  it("fordert bei einer Lücke den vollen Stand an, statt weiterzuzeichnen", () => {
    useLaden.getState().nimmMitteilung(stand(0, { voll: LAGEBILD }));
    useLaden.getState().nimmMitteilung(stand(3, { geaendert: { einheiten: 4 } }));
    expect(useLaden.getState().lagebild?.einheiten).toBe(1);
    expect(attrappe.rufe.at(-1)).toEqual({ art: "standAnfordern", akteId: "akte-1" });
  });

  it("fordert den vollen Stand an, wenn ein Delta auf kein Bild trifft", () => {
    useLaden.getState().nimmMitteilung(stand(7, { geaendert: { einheiten: 4 } }));
    expect(useLaden.getState().lagebild).toBeUndefined();
    expect(attrappe.rufe.at(-1)).toEqual({ art: "standAnfordern", akteId: "akte-1" });
  });

  it("übergeht eine Mitteilung für eine fremde Akte", () => {
    useLaden.getState().nimmMitteilung({ art: "stand", akteId: "akte-9", folge: 0, voll: LAGEBILD });
    expect(useLaden.getState().lagebild).toBeUndefined();
  });
});

describe("Hinweise und geschlossene Akten", () => {
  it("sammelt Hinweise und kappt sie", () => {
    for (let i = 0; i < HINWEISE_MAX + 20; i += 1) {
      useLaden.getState().nimmMitteilung({
        art: "hinweis",
        stufe: "warnung",
        text: `Meldung ${String(i)}`,
      });
    }
    const hinweise = useLaden.getState().hinweise;
    expect(hinweise).toHaveLength(HINWEISE_MAX);
    // Gekappt wird vorn: Die jüngste Meldung ist die, die zählt.
    expect(hinweise.at(-1)?.text).toBe(`Meldung ${String(HINWEISE_MAX + 19)}`);
  });

  it("schließt die Akte, wenn der Worker sie schließt", () => {
    useLaden.setState({ akteId: "akte-1", lagebild: LAGEBILD, folge: 3 });
    useLaden.getState().nimmMitteilung({
      art: "akteGeschlossen",
      akteId: "akte-1",
      meldung: "Der Ordner ist fort.",
    });
    expect(useLaden.getState().akteId).toBeUndefined();
    expect(useLaden.getState().lagebild).toBeUndefined();
    expect(useLaden.getState().hinweise.at(-1)?.text).toBe("Der Ordner ist fort.");
  });

  it("übergeht das Schließen einer fremden Akte", () => {
    useLaden.setState({ akteId: "akte-1" });
    useLaden.getState().nimmMitteilung({
      art: "akteGeschlossen",
      akteId: "akte-2",
      meldung: "fremd",
    });
    expect(useLaden.getState().akteId).toBe("akte-1");
  });
});

describe("Rufe und Fehlerbild", () => {
  it("lädt Umgebung und Einstellungen beim Start", async () => {
    attrappe.antwortet("umgebung", {
      plattform: "linux",
      electron: "43",
      programmversion: "0.0.0",
      rechnername: "pruefrechner",
      clientId: "abcdef0123456789abcdef0123456789",
    });
    attrappe.antwortet("einstellungenLesen", { sharePfad: "/share", anzeigename: "FüSt" });
    attrappe.antwortet("einsaetzeAuflisten", [
      { ordner: "2026-09-10_hochwasser_aaaaaa", name: "Hochwasser", datum: "2026-09-10" },
    ]);

    await useLaden.getState().starte();
    expect(useLaden.getState().umgebung?.rechnername).toBe("pruefrechner");
    expect(useLaden.getState().einsaetze).toHaveLength(1);
    expect(useLaden.getState().fehler).toBeUndefined();
  });

  it("lässt die Einsatzliste aus, solange kein Share eingestellt ist", async () => {
    attrappe.antwortet("umgebung", {
      plattform: "linux",
      electron: "43",
      programmversion: "0.0.0",
      rechnername: "pruefrechner",
      clientId: "abcdef0123456789abcdef0123456789",
    });
    attrappe.antwortet("einstellungenLesen", { sharePfad: "", anzeigename: "" });
    await useLaden.getState().starte();
    expect(attrappe.rufe.map((r) => r.art)).not.toContain("einsaetzeAuflisten");
  });

  it("macht aus einem abgelehnten Ruf ein Fehlerbild und keinen Absturz", async () => {
    attrappe.scheitert("einstellungenLesen", "Die Datei ist unlesbar.");
    await useLaden.getState().starte();
    expect(useLaden.getState().fehler).toBe("Die Datei ist unlesbar.");
    expect(useLaden.getState().beschaeftigt).toBe(false);
  });

  it("räumt das Fehlerbild wieder ab", () => {
    useLaden.setState({ fehler: "irgendwas" });
    useLaden.getState().loescheFehler();
    expect(useLaden.getState().fehler).toBeUndefined();
  });

  it("bedient nur bei geöffneter Akte", async () => {
    const ohne = await useLaden.getState().bediene({ typ: "StatusGesetzt" });
    expect(ohne).toBeUndefined();
    expect(attrappe.rufe).toHaveLength(0);

    useLaden.setState({ akteId: "akte-1" });
    attrappe.antwortet("bedienen", { art: "geschrieben", ereignisId: "aa-0000000001" });
    const mit = await useLaden.getState().bediene({ typ: "StatusGesetzt" });
    expect(mit).toEqual({ art: "geschrieben", ereignisId: "aa-0000000001" });
  });

  it("reicht den Grund einer Rücknahme durch, wenn einer angegeben ist (§2.4)", async () => {
    useLaden.setState({ akteId: "akte-1" });
    attrappe.antwortet("zurueck", { art: "geschrieben", ereignisId: "aa-0000000002" });
    await useLaden.getState().zurueck("Doppelmeldung");
    expect(attrappe.rufe.at(-1)).toEqual({
      art: "zurueck",
      akteId: "akte-1",
      grund: "Doppelmeldung",
    });
  });

  it("lässt den Grund weg, wenn keiner angegeben ist", async () => {
    useLaden.setState({ akteId: "akte-1" });
    await useLaden.getState().zurueck();
    expect(attrappe.rufe.at(-1)).toEqual({ art: "zurueck", akteId: "akte-1" });
  });

  it("meldet eine fehlende Brücke als lesbaren Satz", async () => {
    setzeBruecke(undefined);
    const merker = vi.spyOn(globalThis, "Date");
    merker.mockRestore();
    await useLaden.getState().starte();
    expect(useLaden.getState().fehler).toContain("Brücke zur Schale fehlt");
  });
});
