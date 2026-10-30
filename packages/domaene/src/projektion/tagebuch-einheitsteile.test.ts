/**
 * Die Tagebuchsätze zu Auftrag, Fahrzeug und Person (§5.5, §5.6).
 *
 * Gemessen wird, dass eine Zeile ohne Nachschlagen lesbar ist: Sie nennt die
 * Einheit, und sie nennt, **was** erfasst wurde — nicht eine Kennung.
 */

import { describe, expect, it } from "vitest";

import { zeitpunktText } from "../beschriftungen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import {
  anlageEreignis,
  einheitGemeldet,
  feldEreignis,
  hlc,
  staerke,
} from "../pruefhilfen/ereignisbau.js";
import { tagebuchzeile } from "./tagebuch.js";

const EINHEIT = einheitGemeldet(hlc(3, 0, "a"), 3, {
  einheitId: "U1",
  abschnittId: "EA",
  bezeichnung: "FGr N THW OV Varel",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "IM_EINSATZ",
});

const AUFTRAG = anlageEreignis(hlc(4, 0, "a"), 4, "AuftragErfasst", {
  auftragId: "A1",
  einheitId: "U1",
  von: "2026-10-30T14:30:00+01:00",
  text: "Deich sichern",
  quelle: "MANUELL",
});

const FAHRZEUG = anlageEreignis(hlc(5, 0, "a"), 5, "FahrzeugAngelegt", {
  fahrzeugId: "F1",
  einheitId: "U1",
  typ: "GKW",
  bezeichnung: "GKW 1",
  kennzeichen: "THW-84123",
  status: "EINSATZBEREIT",
});

const PERSON = anlageEreignis(hlc(6, 0, "a"), 6, "PersonHinzugefuegt", {
  personId: "P1",
  einheitId: "U1",
  vorname: "Anna",
  nachname: "Muster",
  rolle: "UNTERFUEHRER",
  funktionen: [],
  fahrerlaubnisse: [],
  geschlecht: "WEIBLICH",
  ernaehrung: "VEGETARISCH",
  kontakte: [],
  zusatzqualifikationen: [],
});

function zeile(...weitere: EingehendesEreignis[]): string {
  const alle = [EINHEIT, AUFTRAG, FAHRZEUG, PERSON, ...weitere];
  const zustand = materialisiere(falteHinzu(leereFaltung(), alle));
  const letztes = alle[alle.length - 1] as EingehendesEreignis;
  return tagebuchzeile(zustand, letztes).satz;
}

describe("Das Tagebuch zu Auftrag, Fahrzeug und Person", () => {
  it("nennt beim erfassten Auftrag die Einheit und den Auftragstext", () => {
    const zustand = materialisiere(falteHinzu(leereFaltung(), [EINHEIT, AUFTRAG]));
    const eintrag = tagebuchzeile(zustand, AUFTRAG);
    expect(eintrag.satz).toBe("FGr N THW OV Varel: Auftrag erfasst — Deich sichern");
    // Der Beginn ist die fachliche Zeit der Zeile, und die Einheit ihr Bezug.
    expect(eintrag.zeitpunkt).toBe("2026-10-30T14:30:00+01:00");
    expect(eintrag.einheitId).toBe("U1");
  });

  it("nennt beim Fahrzeug Typ, Bezeichnung und Kennzeichen", () => {
    expect(zeile(FAHRZEUG)).toBe("FGr N THW OV Varel: Fahrzeug angelegt — GKW GKW 1 (THW-84123)");
  });

  it("nennt bei der Person den Namen und die Rolle als Wort", () => {
    expect(zeile(PERSON)).toBe("FGr N THW OV Varel: Person hinzugefügt — Anna Muster (Unterführer)");
  });

  it("schreibt das Ende eines Auftrags als Uhrzeit und nennt den Auftrag beim Text", () => {
    const ende = feldEreignis(hlc(7, 0, "a"), 7, "AuftragBeendet", { auftragId: "A1" }, null, "2026-10-30T16:00:00+01:00");
    expect(zeile(ende)).toBe(`Deich sichern: Auftrag beendet: (leer) → ${zeitpunktText("2026-10-30T16:00:00+01:00")}`);
  });

  it("nennt ein entferntes Fahrzeug bei seiner Bezeichnung, nicht bei der Kennung", () => {
    const weg = feldEreignis(hlc(8, 0, "a"), 8, "FahrzeugEntfernt", { fahrzeugId: "F1" }, null, true, "defekt");
    expect(zeile(weg)).toBe("GKW 1: Fahrzeug entfernt: (leer) → ja");
  });
});
