/**
 * Prüffälle zum Einsatztagebuch (M3.3).
 *
 * Sie messen zwei Dinge, und beide stehen so in §5.9.1: dass **jedes**
 * fachliche Ereignis eine Zeile erzeugt und dass die Zeile lesbar ist. Die
 * zweite Aussage ist die schwierigere — sie hängt an einer Wortliste, die mit
 * dem Katalog wachsen muss, und genau deshalb steht sie hier als geschlossene
 * Prüfung über allen Katalogeinträgen.
 */

import { describe, expect, it } from "vitest";

import { ART_TEXT, tagebuchzeile, trifftFilter, vergleicheZeilen } from "./tagebuch.js";
import { KATALOG_EINTRAEGE } from "../katalog/index.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einheitVerschoben,
  einsatzAngelegt,
  hlc,
  staerke,
  staerkeGeaendert,
  statusGesetzt,
  fremdesEreignis,
} from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";

const EINSATZ = einsatzAngelegt(hlc(1, 0, "a"), 1, {
  einsatzId: "E1",
  name: "Hochwasser",
  art: "EINSATZ",
  fuestName: "FüSt 1",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const ABSCHNITT_NORD = abschnittAngelegt(hlc(2, 0, "a"), 2, {
  abschnittId: "EA-NORD",
  name: "EA Nord",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

const EINHEIT = einheitGemeldet(hlc(3, 0, "a"), 3, {
  einheitId: "U1",
  abschnittId: "EA-NORD",
  bezeichnung: "TZ THW OV Oldenburg",
  organisation: "THW",
  ebene: "ZUG",
  staerke: staerke(1, 2, 9),
  personalErfassung: "NUR_STAERKE",
  status: "ANMARSCH",
});

function falte(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

const GRUNDLAGE = [EINSATZ, ABSCHNITT_NORD, EINHEIT];
const ZUSTAND = falte(GRUNDLAGE);

describe("die Wortliste", () => {
  /**
   * §5.9.1 verlangt eine Zeile je fachlichem Ereignis; eine Zeile, die den
   * technischen Artnamen zeigt, ist für die Führungsstelle keine. Die Liste
   * ist deshalb **geschlossen** über dem Katalog, und dieser Prüffall hält
   * sie: Wer eine Art in den Katalog aufnimmt, muss sie hier benennen.
   */
  it("benennt jede Ereignisart des Katalogs", () => {
    const ohneText = KATALOG_EINTRAEGE.map((eintrag) => eintrag.typ).filter(
      (typ) => ART_TEXT[typ] === undefined,
    );
    expect(ohneText).toEqual([]);
  });

  it("führt keinen Text zu einer Art, die es nicht gibt", () => {
    const bekannt = new Set(KATALOG_EINTRAEGE.map((eintrag) => eintrag.typ));
    // `KorrekturVon` steht im Katalog als eigener Eintrag daneben (§5.9.2)
    // und ist die einzige zulässige Ausnahme.
    const ueberzaehlig = Object.keys(ART_TEXT).filter(
      (typ) => !bekannt.has(typ) && typ !== "KorrekturVon",
    );
    expect(ueberzaehlig).toEqual([]);
  });
});

describe("tagebuchzeile", () => {
  it("nennt bei einer Anlage den Gegenstand beim Namen, nicht bei der Id", () => {
    const zeile = tagebuchzeile(ZUSTAND, EINHEIT);
    expect(zeile.satz).toBe("TZ THW OV Oldenburg: Einheit gemeldet");
    expect(zeile.einheitId).toBe("U1");
    expect(zeile.abschnittId).toBe("EA-NORD");
  });

  it("zeigt bei einem setzenden Ereignis den Übergang von vorher nach neu (§2.2)", () => {
    const ereignis = statusGesetzt(hlc(4, 0, "a"), 4, "U1", "ANMARSCH", "IM_EINSATZ");
    const zeile = tagebuchzeile(falte([...GRUNDLAGE, ereignis]), ereignis);
    expect(zeile.satz).toBe("TZ THW OV Oldenburg: Status gesetzt: ANMARSCH → IM_EINSATZ");
  });

  it("schreibt eine Stärke als Tripel und nicht als JSON", () => {
    const ereignis = staerkeGeaendert(hlc(5, 0, "a"), 5, "U1", staerke(1, 2, 9), staerke(1, 2, 7));
    const zeile = tagebuchzeile(falte([...GRUNDLAGE, ereignis]), ereignis);
    expect(zeile.satz).toBe("TZ THW OV Oldenburg: Stärke geändert: 1/2/9 → 1/2/7");
  });

  it("benennt bei einer Art, die ihr Feld in der Nutzlast trägt, das Feld im Klartext", () => {
    const ereignis: EingehendesEreignis = {
      ...statusGesetzt(hlc(6, 0, "a"), 6, "U1", "", ""),
      typ: "EinheitStammdatenGeaendert",
      nutzlast: { einheitId: "U1", feld: "bezeichnung" },
      vorher: "TZ THW OV Oldenburg",
      neu: "TZ THW OV Delmenhorst",
    };
    const zeile = tagebuchzeile(falte([...GRUNDLAGE, ereignis]), ereignis);
    // `bezeichnung` heißt im Satz „Bezeichnung"; die Beschriftung steht nur
    // bei den Arten, die ihr Feld selbst benennen — bei `StatusGesetzt` wäre
    // sie eine Wiederholung des Artnamens.
    expect(zeile.satz).toContain("(Bezeichnung)");
    expect(zeile.satz).toContain("TZ THW OV Oldenburg → TZ THW OV Delmenhorst");
  });

  it("spricht bei einer Verschiebung über beide Abschnitte", () => {
    const ereignis = einheitVerschoben(hlc(7, 0, "a"), 7, "U1", "EA-NORD", "AUFFANG");
    const zeile = tagebuchzeile(falte([...GRUNDLAGE, ereignis]), ereignis);
    expect(zeile.satz).toBe("TZ THW OV Oldenburg: Einheit verschoben: EA-NORD → AUFFANG");
  });

  it("gibt den frei getippten Eintrag als Text wieder, nicht als Feldübergang", () => {
    const ereignis: EingehendesEreignis = {
      ...EINHEIT,
      id: "a-0000000002",
      typ: "EtbEintragErfasst",
      nutzlast: {
        etbId: "T1",
        zeitpunkt: "2026-09-08T09:30:00+02:00",
        text: "Deich bei km 12 sackt ab.",
      },
    };
    const zeile = tagebuchzeile(ZUSTAND, ereignis);
    expect(zeile.satz).toBe("Tagebucheintrag: Deich bei km 12 sackt ab.");
    expect(zeile.zeitpunkt).toBe("2026-09-08T09:30:00+02:00");
  });

  it("führt eine unbekannte Ereignisart als Zeile statt sie zu verschweigen (§3.7)", () => {
    const ereignis = fremdesEreignis(hlc(8, 0, "a"), 8, "WetterlageGemeldet");
    const zeile = tagebuchzeile(ZUSTAND, ereignis);
    expect(zeile.typ).toBe("WetterlageGemeldet");
    expect(zeile.satz).toContain("Unbekannte Ereignisart");
  });

  it("trägt Akteur, Rechner und die Kennung des schreibenden Arbeitsplatzes", () => {
    const zeile = tagebuchzeile(ZUSTAND, EINHEIT);
    expect(zeile.akteur).toBe("Bediener a");
    expect(zeile.rechner).toBe("rechner-a");
    expect(zeile.clientId).toBe("a");
  });

  it("macht eine Kompensation als solche kenntlich (§6 U1)", () => {
    const ereignis: EingehendesEreignis = {
      ...statusGesetzt(hlc(9, 0, "a"), 9, "U1", "IM_EINSATZ", "ANMARSCH"),
      undoOf: EINHEIT.id,
      grund: "Rücknahme durch Bediener",
    };
    const zeile = tagebuchzeile(falte([...GRUNDLAGE, ereignis]), ereignis);
    expect(zeile.undoOf).toBe(EINHEIT.id);
    expect(zeile.grund).toBe("Rücknahme durch Bediener");
  });
});

describe("die Ordnung", () => {
  /**
   * §2.6: zwei Ordnungen, die nie vermischt werden. Geordnet wird nach HLC —
   * eine Wanduhr, die falsch geht, sortierte das Tagebuch sonst um, und eine
   * nachgetragene fachliche Zeit stünde vor Zeilen, die vor ihr geschrieben
   * wurden.
   */
  it("ordnet nach HLC und bei Gleichstand nach Ereignis-Id (§3.5)", () => {
    const frueh = { hlc: hlc(5, 0, "a"), id: "a-0000000009" };
    const spaet = { hlc: hlc(9, 0, "b"), id: "b-0000000001" };
    expect(vergleicheZeilen(frueh, spaet)).toBeLessThan(0);

    const gleich1 = { hlc: hlc(5, 0, "a"), id: "a-0000000001" };
    const gleich2 = { hlc: hlc(5, 0, "a"), id: "a-0000000002" };
    expect(vergleicheZeilen(gleich1, gleich2)).toBeLessThan(0);
  });
});

describe("trifftFilter", () => {
  const zeile = tagebuchzeile(ZUSTAND, EINHEIT);

  it("filtert je Einheit und je Abschnitt (DoD M3.3)", () => {
    expect(trifftFilter(zeile, { einheitId: "U1" })).toBe(true);
    expect(trifftFilter(zeile, { einheitId: "U2" })).toBe(false);
    expect(trifftFilter(zeile, { abschnittId: "EA-NORD" })).toBe(true);
    expect(trifftFilter(zeile, { abschnittId: "AUFFANG" })).toBe(false);
  });

  it("sucht im Satz, im Akteur und im Grund, ohne Rücksicht auf Groß- und Kleinschreibung", () => {
    expect(trifftFilter(zeile, { suche: "oldenburg" })).toBe(true);
    expect(trifftFilter(zeile, { suche: "bediener a" })).toBe(true);
    expect(trifftFilter(zeile, { suche: "delmenhorst" })).toBe(false);
  });

  it("zeigt auf Wunsch nur Rücknahmen und Berichtigungen", () => {
    expect(trifftFilter(zeile, { nurRuecknahmen: true })).toBe(false);
    expect(trifftFilter({ ...zeile, undoOf: "a-0000000001" }, { nurRuecknahmen: true })).toBe(true);
    expect(trifftFilter({ ...zeile, korrekturVon: "a-0000000001" }, { nurRuecknahmen: true })).toBe(true);
  });
});
