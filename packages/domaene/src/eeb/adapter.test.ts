/**
 * Der Adapter an den Feldern, die der Bogen seit Schema 12 und 13 traegt:
 * Funkrufname als Erreichbarkeit, Zeichenfarbe und Sitzplaetze am Fahrzeug,
 * Einzelperson statt Einheit. Die Breite ueber alle Beispielboegen misst
 * `bau/pruefdaten/eeb-roundtrip.test.ts`; hier steht der Einzelfall.
 */

import { KontaktArt, Zeichenfarbe, type Erfassungsbogen, type Person } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "../ereignis.js";
import { falte, type EingehendesEreignis } from "../fold.js";
import { schemata } from "../katalog/index.js";
import { akteur, hlc } from "../pruefhilfen/ereignisbau.js";
import { pruefbogen } from "../pruefhilfen/pruefbogen.js";
import { bezeichnungAus, uebersetzeBogen } from "./adapter.js";

const AUFTRAG = { einheitId: "U1", abschnittId: "A" } as const;

function person(nachname: string, funktion = 5): Person {
  return {
    vorname: "Anna",
    nachname,
    staerkeRolle: 2,
    funktionen: [{ code: funktion }],
    fahrerlaubnis: 5,
    geschlecht: 1,
    ernaehrung: 0,
    kontakte: [],
    zusatzqualifikationen: [],
  } as unknown as Person;
}

/** Ein Baufachberater, allein anrueckend — der Bogen sagt es seit Schema 13. */
function einzelperson(nachname = "Muster"): Erfassungsbogen {
  const bogen = pruefbogen();
  return {
    ...bogen,
    schemaVersion: 13,
    einheit: { ...bogen.einheit, einzelperson: true, einheitsTyp: { freitext: "Baufachberater/in" } },
    personal: [person(nachname)],
    fahrzeuge: [],
  };
}

let laufnummer = 0;
function bau(typ: string, nutzlast: unknown): EingehendesEreignis {
  laufnummer += 1;
  return {
    id: ereignisId("mk", laufnummer),
    hlc: hlc(1000 + laufnummer, 0, "mk"),
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur("mk"),
    wanduhr: "2026-11-15T08:00:00+01:00",
    typ,
    nutzlast,
  };
}

describe("Funkrufname als Erreichbarkeit (Schema 12)", () => {
  it("wird als Kontaktart FUNK uebersetzt und nicht als Mobilnummer verkleidet", () => {
    const bogen = pruefbogen();
    bogen.personal[0]!.kontakte = [
      { art: KontaktArt.MOBIL, dienstlich: true, wert: "01701234567" },
      { art: KontaktArt.FUNK, dienstlich: true, wert: "Heros Oldenburg 18/13-1" },
    ];
    const uebersetzt = uebersetzeBogen(bogen, AUFTRAG);
    const kontakte = uebersetzt.personen[0]?.["kontakte"];
    expect(kontakte).toEqual([
      { art: "MOBIL", dienstlich: true, wert: "01701234567" },
      { art: "FUNK", dienstlich: true, wert: "Heros Oldenburg 18/13-1" },
    ]);
    expect(schemata.PersonHinzugefuegt.safeParse(uebersetzt.personen[0]).success).toBe(true);
  });
});

describe("Zeichenfarbe und Sitzplaetze am Fahrzeug (Schema 9 und 13)", () => {
  it("nimmt beide Felder mit und laesst sie weg, wo der Bogen sie nicht traegt", () => {
    const bogen = pruefbogen();
    bogen.fahrzeuge[0]!.zeichenfarbe = Zeichenfarbe.KOMMUNAL;
    bogen.fahrzeuge[0]!.sitzplaetze = 7;
    const [erstes, zweites] = uebersetzeBogen(bogen, AUFTRAG).fahrzeuge;
    expect(erstes?.["zeichenfarbe"]).toBe("KOMMUNAL");
    expect(erstes?.["sitzplaetze"]).toBe(7);
    expect(zweites).not.toHaveProperty("zeichenfarbe");
    expect(zweites).not.toHaveProperty("sitzplaetze");
    expect(schemata.FahrzeugAngelegt.safeParse(erstes).success).toBe(true);
  });

  it("haelt eine Farbe, die dieser Client nicht kennt, als Zahl fest (§3.7)", () => {
    const bogen = pruefbogen();
    bogen.fahrzeuge[1]!.zeichenfarbe = 9 as Zeichenfarbe;
    const fahrzeug = uebersetzeBogen(bogen, AUFTRAG).fahrzeuge[1];
    expect(fahrzeug?.["zeichenfarbe"]).toBe("#9");
    expect(schemata.FahrzeugAngelegt.safeParse(fahrzeug).success).toBe(true);
  });

  it("steht nach dem Falten am Fahrzeug im Zustand", () => {
    const bogen = pruefbogen();
    bogen.fahrzeuge[0]!.zeichenfarbe = Zeichenfarbe.GRAU;
    bogen.fahrzeuge[0]!.sitzplaetze = 3;
    const uebersetzt = uebersetzeBogen(bogen, AUFTRAG);
    const zustand = falte([
      bau("AbschnittAngelegt", { abschnittId: "A", name: "Meldekopf", typ: "MELDEKOPF", reihenfolge: 1 }),
      bau("EinheitGemeldet", uebersetzt.einheit),
      ...uebersetzt.fahrzeuge.map((f) => bau("FahrzeugAngelegt", f)),
    ]);
    expect(zustand.unbekannt).toEqual([]);
    expect(zustand.fahrzeuge["U1-F1"]?.zeichenfarbe?.wert).toBe("GRAU");
    expect(zustand.fahrzeuge["U1-F1"]?.sitzplaetze?.wert).toBe(3);
    expect(zustand.fahrzeuge["U1-F2"]?.zeichenfarbe).toBeUndefined();
  });
});

describe("Eine gemeldete Position ohne Namen", () => {
  it("bekommt einen Platzhalter statt die Meldung scheitern zu lassen (§5.5)", () => {
    const bogen = pruefbogen();
    bogen.personal = [{ ...person("  "), vorname: "" }, person("Meyer")];
    const [ohne, mit] = uebersetzeBogen(bogen, AUFTRAG).personen;
    expect(ohne?.["nachname"]).toBe("(ohne Namen)");
    expect(ohne?.["vorname"]).toBe("–");
    expect(ohne?.["funktionen"]).toEqual(["He"]);
    expect(mit?.["nachname"]).toBe("Meyer");
    expect(schemata.PersonHinzugefuegt.safeParse(ohne).success).toBe(true);
  });
});

describe("Einzelperson statt Einheit (Schema 13)", () => {
  it("bekommt die Ebene PERSON und den Namen in der Bezeichnung", () => {
    const uebersetzt = uebersetzeBogen(einzelperson(), AUFTRAG);
    expect(uebersetzt.einheit["ebene"]).toBe("PERSON");
    expect(uebersetzt.einheit["bezeichnung"]).toBe("Baufachberater/in Albstadt (Muster)");
    expect(schemata.EinheitGemeldet.safeParse(uebersetzt.einheit).success).toBe(true);
  });

  it("unterscheidet zwei Fachberater desselben Ortsverbands in der Bezeichnung", () => {
    expect(bezeichnungAus(einzelperson("Meyer"))).not.toBe(bezeichnungAus(einzelperson("Schulz")));
  });

  it("nimmt die Funktion der Person, wenn der Bogen keinen Einheitstyp traegt", () => {
    const bogen = einzelperson();
    bogen.einheit.einheitsTyp = { freitext: "" };
    expect(bezeichnungAus(bogen)).not.toContain("Einheit");
    expect(bezeichnungAus(bogen)).toContain("Albstadt (Muster)");
  });

  it("laesst eine Einheit ohne das Kennzeichen unveraendert", () => {
    const uebersetzt = uebersetzeBogen(pruefbogen(), AUFTRAG);
    expect(uebersetzt.einheit["ebene"]).toBe("ZUGTRUPP");
    expect(uebersetzt.einheit["bezeichnung"]).toBe("Zugtrupp Technischer Zug Albstadt");
  });
});
