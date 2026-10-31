/**
 * Tests zur Ablösung an der Einheitenzeile (Spalten N bis S, K12, K18) und zur
 * Einheit aus einer Anforderung.
 *
 * Gerechnet wird über der Prüflage, ergänzt um die Ereignisse, die eine
 * Ablösung durchläuft: zusagen, eintreffen, Einheit anlegen. Die Prüflage
 * trägt A1 (offen, löst E12 ab) und A2 (zugesagt, löst E20 ab).
 */

import { describe, expect, it } from "vitest";

import { zeitpunktText } from "../beschriftungen.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einheitGemeldet, feldEreignis, hlc, staerke } from "../pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../pruefhilfen/pruefage.js";
import type { Zustand } from "../zustand.js";

import { abloesungDerEinheit, verfuegbarkeitsmarke } from "./abloesung.js";
import { anforderungZurEinheit, anforderungsliste } from "./anforderung.js";
import { einheitenwahl, einheitsvorschlag } from "./anforderung-einheit.js";
import { spaltenDerGruppen, tabellenzeile } from "./tabelle.js";
import { tagebuchzeile } from "./tagebuch.js";

const H = (n: number): ReturnType<typeof hlc> => hlc(9_000_000 + n, 0, "T");

function lage(...dazu: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...dazu]));
}

function zeile(zustand: Zustand, einheitId: string): ReturnType<typeof tabellenzeile> {
  const einheit = zustand.einheiten[einheitId];
  if (einheit === undefined) throw new Error(`Einheit ${einheitId} fehlt`);
  return tabellenzeile(zustand, einheit);
}

const ZUSAGE = feldEreignis(H(1), 1, "AbloesungZugesagt", { anforderungId: "A1" }, null, {
  zugesagtFuer: "2026-09-08T18:00:00+02:00",
  zugesagtVon: "THW RB Oldenburg",
});
const NEUE_EINHEIT = einheitGemeldet(H(2), 2, {
  einheitId: "E99",
  abschnittId: "ANF",
  bezeichnung: "BGr Varel",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "ANGEFORDERT",
});
const ERLEDIGT = feldEreignis(H(3), 3, "AnforderungErledigt", { anforderungId: "A1" }, null, {
  erledigtAm: "2026-09-08T09:15:00+02:00",
  abloesendeEinheitId: "E99",
});

describe("Die Ablösungsspalten der Einheitentabelle (N bis S)", () => {
  it("stehen in der Gruppe Ressourcenplanung zwischen „Verfügbar bis“ und „Eingetroffen“", () => {
    const schluessel = spaltenDerGruppen(["RESSOURCENPLANUNG"]).map((spalte) => spalte.schluessel);
    const von = schluessel.indexOf("verfuegbarBis");
    expect(schluessel.slice(von, von + 8)).toEqual([
      "verfuegbarBis",
      "abloesungAngefordert",
      "anforderungsKennung",
      "zugesagtFuer",
      "zugesagtVon",
      "abloesungDurch",
      "vorgesehenerAuftrag",
      "eingetroffenAm",
    ]);
  });

  it("zeigt an der abzulösenden Einheit Zeitpunkt, Kennung und Vorgesehenes der offenen Anforderung", () => {
    const zellen = zeile(lage(), "E12").zellen;
    expect(zellen["abloesungAngefordert"]?.text).toBe(zeitpunktText("2026-09-08T07:30:00+02:00"));
    expect(zellen["anforderungsKennung"]?.text).toBe("ANF-2026-001");
    expect(zellen["abloesungDurch"]?.text).toBe("BGr THW OV Varel");
    expect(zellen["vorgesehenerAuftrag"]?.text).toBe("Ablösung Deichverteidigung Nord");
    expect(zellen["zugesagtFuer"]?.text).toBe("");
  });

  it("füllt „Zugesagt für“ und „Zugesagt von“ mit der Zusage, die Zeit als Wort", () => {
    const zellen = zeile(lage(ZUSAGE), "E12").zellen;
    expect(zellen["zugesagtFuer"]?.text).toBe(zeitpunktText("2026-09-08T18:00:00+02:00"));
    expect(zellen["zugesagtVon"]?.text).toBe("THW RB Oldenburg");
  });

  it("nennt in „Ablösung durch“ die angelegte Einheit, sobald die Erledigung sie trägt", () => {
    const zustand = lage(ZUSAGE, NEUE_EINHEIT, ERLEDIGT);
    expect(zeile(zustand, "E12").zellen["abloesungDurch"]?.text).toBe("BGr Varel");
    expect(anforderungZurEinheit(zustand, "E12")?.abloesendeEinheitId).toBe("E99");
  });

  it("lässt die Spalten bei einer Einheit ohne Anforderung leer und setzt keine Marke", () => {
    const leer = zeile(lage(), "E30");
    expect(leer.zellen["anforderungsKennung"]?.text).toBe("");
    expect(leer.abloesung).toBeUndefined();
  });
});

describe("K12 als Marke der Zeile", () => {
  it("heißt nach dem Zustand der Anforderung: angefordert, zugesagt, eingetroffen", () => {
    expect(zeile(lage(), "E12").abloesung).toEqual({ text: "Ablösung angefordert", ton: "warn" });
    expect(zeile(lage(), "E20").abloesung?.text).toBe("Ablösung zugesagt");
    expect(zeile(lage(ZUSAGE, NEUE_EINHEIT, ERLEDIGT), "E12").abloesung).toEqual({
      text: "Ablösung eingetroffen",
      ton: "ok",
    });
  });

  it("verschwindet mit dem Storno", () => {
    const storno = feldEreignis(H(4), 4, "AnforderungStorniert", { anforderungId: "A1" }, false, true, "Doppelt");
    expect(abloesungDerEinheit(lage(storno), "E12")).toBeUndefined();
  });
});

describe("K18 als Marke an „Verfügbar bis“", () => {
  const BIS = "2026-09-08T20:00:00+02:00";

  it("schweigt, solange mehr als ein Tag bleibt", () => {
    expect(verfuegbarkeitsmarke(BIS, "2026-09-07T19:00:00+02:00")).toBeUndefined();
  });

  it("sagt „läuft ab“ innerhalb eines Tages und „abgelaufen“ danach", () => {
    expect(verfuegbarkeitsmarke(BIS, "2026-09-08T08:00:00+02:00")).toEqual({ text: "läuft ab", ton: "warn" });
    expect(verfuegbarkeitsmarke(BIS, "2026-09-08T20:00:00+02:00")).toEqual({ text: "abgelaufen", ton: "fehler" });
  });

  it("übergeht leere und unlesbare Werte", () => {
    expect(verfuegbarkeitsmarke(null, "2026-09-08T08:00:00+02:00")).toBeUndefined();
    expect(verfuegbarkeitsmarke("morgen", "2026-09-08T08:00:00+02:00")).toBeUndefined();
  });
});

describe("Die Einheit aus einer Anforderung", () => {
  it("schlägt Organisation, Ebene, Stärke und Bereich der abzulösenden Einheit vor, Herkunft aus der Zusage, Auftrag aus der Anforderung", () => {
    const zustand = lage(ZUSAGE);
    const anforderung = zustand.anforderungen["A1"];
    if (anforderung === undefined) throw new Error("A1 fehlt");
    expect(einheitsvorschlag(zustand, anforderung)).toEqual({
      bezeichnung: "BGr THW OV Varel",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
      herkunft: "THW RB Oldenburg",
      auftrag: "Ablösung Deichverteidigung Nord",
      // Der zählende Bereich der abgelösten Einheit, nicht „Angefordert / Anmarsch“.
      abschnittId: "EO1",
      nachVorbildVon: "BGr 1 Oldenburg",
    });
  });

  it("belegt ohne abzulösende Einheit nichts vor, was niemand gemeldet hat", () => {
    const zustand = lage();
    const anforderung = zustand.anforderungen["A3"];
    if (anforderung === undefined) throw new Error("A3 fehlt");
    const vorschlag = einheitsvorschlag(zustand, anforderung);
    expect(vorschlag.staerke).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 0 });
    expect(vorschlag.nachVorbildVon).toBeUndefined();
  });

  it("bietet alle aktiven Einheiten zur Wahl an, nach Namen geordnet, und trägt die Liste im Ausschnitt", () => {
    const zustand = lage();
    const wahl = einheitenwahl(zustand);
    const namen = wahl.map((eintrag) => eintrag.name);
    expect(namen).toEqual([...namen].sort((a, b) => a.localeCompare(b, "de-DE")));
    expect(wahl.some((eintrag) => eintrag.id === "E12")).toBe(true);
    expect(anforderungsliste(zustand).einheitenwahl).toEqual(wahl);
  });
});

describe("Das Tagebuch der Ablösung", () => {
  const satz = (zustand: Zustand, ereignis: EingehendesEreignis): string => tagebuchzeile(zustand, ereignis).satz;

  it("nennt die Anlage mit Kennung und abzulösender Einheit — und ordnet sie dieser Einheit zu", () => {
    const anlage = anlageEreignis(H(5), 5, "AnforderungAngelegt", {
      anforderungId: "A9",
      kennung: "ANF-9",
      abzuloesendeEinheitId: "E12",
      vorgeseheneEinheitText: "BGr Varel",
      angefordertAm: "2026-09-08T08:00:00+02:00",
    });
    const zustand = lage(anlage);
    expect(satz(zustand, anlage)).toBe("Anforderung ANF-9: angelegt — Ablösung für BGr 1 Oldenburg; vorgesehen: BGr Varel");
    expect(tagebuchzeile(zustand, anlage).einheitId).toBe("E12");
  });

  it("schreibt Zusage und Eintreffen mit Zeiten als Wort und dem Namen der ablösenden Einheit", () => {
    const zustand = lage(ZUSAGE, NEUE_EINHEIT, ERLEDIGT);
    expect(satz(zustand, ZUSAGE)).toBe(
      `Anforderung ANF-2026-001: Zusage erfasst für ${zeitpunktText("2026-09-08T18:00:00+02:00")} von THW RB Oldenburg`,
    );
    expect(satz(zustand, ERLEDIGT)).toBe(
      `Anforderung ANF-2026-001: eingetroffen ${zeitpunktText("2026-09-08T09:15:00+02:00")} — Ablösung durch BGr Varel`,
    );
  });
});
