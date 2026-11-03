/**
 * Die Bestätigung nach dem eigenen Schreiben, wie der Store sie ableitet
 * (Entwurf „Entlastung", 3.3) — ohne neues Feld im Kontrakt.
 *
 * Geprüft wird vor allem die Reihenfolge: Das Lagebild mit dem neuen
 * obersten Schritt kann vor oder nach der Antwort auf `bedienen` eintreffen,
 * und in beiden Fällen soll am Ende der Gegenstand in der Bestätigung stehen —
 * nie der eines früheren Schritts.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { setzeBruecke, type Bruecke } from "./bruecke.js";
import { useLaden } from "./laden.js";
import type { Antwort, Bedienergebnis, Lagebild, Ruf } from "../kontrakt/index.js";

const LAGEBILD = {
  einsatzId: "E1",
  einsatzName: "Hochwasser",
  einsatzArt: "EINSATZ",
  standHlc: "",
  standWanduhr: "",
  letzterShareKontakt: "",
  shareErreichbar: true,
  peers: [],
  unuebertrageneBytes: 0,
  quarantaene: [],
  abschnitte: 1,
  einheiten: 2,
  gesamtstaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
  staerkeJeStatus: {},
  hinweise: 0,
  unbekannteEreignisse: 0,
  undoTiefe: 1,
  undoObersteArt: "StatusGesetzt",
  undoObersteObjekt: "FGr E",
  lageZeiger: 1,
} as unknown as Lagebild;

/** Eine Brücke, deren Antwort auf `bedienen` erst kommt, wenn der Test es sagt. */
function aufgehalteneBruecke(): { bruecke: Bruecke; antworte(ergebnis: Bedienergebnis): void } {
  let loese: ((antwort: Antwort<unknown>) => void) | undefined;
  return {
    bruecke: {
      plattform: "linux",
      electron: "43.0.0",
      async ruf(anfrage: Ruf) {
        if (anfrage.art !== "bedienen" && anfrage.art !== "zurueck") return { ok: true, wert: null };
        return new Promise<Antwort<unknown>>((weiter) => {
          loese = weiter;
        });
      },
      aufMitteilung: () => () => undefined,
    },
    antworte(ergebnis) {
      loese?.({ ok: true, wert: ergebnis });
    },
  };
}

const GESCHRIEBEN: Bedienergebnis = { art: "geschrieben", ereignisId: "e2" };

/** Der eigene Verlauf wächst um den eben geschriebenen Schritt. */
function neuerSchritt(folge: number): void {
  useLaden.getState().nimmMitteilung({
    art: "stand",
    akteId: "akte-1",
    folge,
    geaendert: { undoTiefe: 2, undoObersteArt: "StatusGesetzt", undoObersteObjekt: "FGr WP 1" },
  });
}

let bruecke: ReturnType<typeof aufgehalteneBruecke>;

beforeEach(() => {
  bruecke = aufgehalteneBruecke();
  setzeBruecke(bruecke.bruecke);
  useLaden.setState({ akteId: "akte-1", lagebild: LAGEBILD, folge: 1, letzteBestaetigung: undefined, fehler: undefined });
});

describe("Die Bestätigung nach dem Schreiben", () => {
  it("nennt den Gegenstand, wenn das Lagebild vor der Antwort eintrifft", async () => {
    const lauf = useLaden.getState().bediene({ typ: "StatusGesetzt" });
    neuerSchritt(2);
    expect(useLaden.getState().letzteBestaetigung).toBeUndefined();
    bruecke.antworte(GESCHRIEBEN);
    await lauf;
    expect(useLaden.getState().letzteBestaetigung?.text).toBe("Status der Einheit ‚FGr WP 1‘ geändert · gespeichert");
  });

  it("trägt den Gegenstand nach, wenn das Lagebild nach der Antwort eintrifft — nie den des Schritts davor", async () => {
    const lauf = useLaden.getState().bediene({ typ: "StatusGesetzt" });
    bruecke.antworte(GESCHRIEBEN);
    await lauf;
    const zuerst = useLaden.getState().letzteBestaetigung;
    // Oben steht noch der vorige Schritt (FGr E): Er darf nicht genannt werden.
    expect(zuerst?.text).toBe("Status der Einheit geändert · gespeichert");

    neuerSchritt(2);
    const danach = useLaden.getState().letzteBestaetigung;
    expect(danach?.text).toBe("Status der Einheit ‚FGr WP 1‘ geändert · gespeichert");
    // Die zehn Sekunden zählen ab dem Schreiben, nicht ab dem Nachtrag.
    expect(danach?.zeit).toBe(zuerst?.zeit);
  });

  it("bestätigt nichts, wenn der Dienst abweist", async () => {
    const lauf = useLaden.getState().bediene({ typ: "StatusGesetzt" });
    bruecke.antworte({ art: "abgewiesen", meldung: "Vorwert geändert", dauerhafterHinweis: false });
    await lauf;
    neuerSchritt(2);
    expect(useLaden.getState().letzteBestaetigung).toBeUndefined();
  });

  it("bestätigt eine Rücknahme mit dem Namen des zurückgenommenen Schritts", async () => {
    const lauf = useLaden.getState().zurueck();
    bruecke.antworte(GESCHRIEBEN);
    await lauf;
    expect(useLaden.getState().letzteBestaetigung?.text).toBe(
      "Zurückgenommen: Status der Einheit ‚FGr E‘ geändert · gespeichert",
    );
  });

  it("vergisst die Bestätigung beim Schließen des Einsatzes", async () => {
    useLaden.setState({ letzteBestaetigung: { text: "x · gespeichert", zeit: Date.now() } });
    setzeBruecke({ ...bruecke.bruecke, ruf: async () => ({ ok: true, wert: null }) });
    await useLaden.getState().schliesseEinsatz();
    expect(useLaden.getState().letzteBestaetigung).toBeUndefined();
  });
});
