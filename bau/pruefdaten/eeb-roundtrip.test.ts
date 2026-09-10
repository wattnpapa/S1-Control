/**
 * Der Adapter `eeb → EinheitGemeldet` gegen **alle 443 Beispielbögen** (M1.5).
 *
 * Der Roundtrip ist nicht „Bogen rein, Bogen raus" — das Zielmodell ist reicher
 * und ärmer zugleich als der Bogen. Geprüft wird dreierlei:
 *
 *  1. **Gültigkeit.** Jede erzeugte Nutzlast besteht ihr zod-Schema aus §5.
 *     Ein Adapter, der eine ungültige Nutzlast baut, erzeugt ein Ereignis, das
 *     nach §3.7 unter `unbekannt` landet — die Meldung wäre da und trotzdem
 *     nicht in der Lage.
 *  2. **Verlustfreiheit in den Zahlen.** Was der Bogen an Stärke, Personen und
 *     Fahrzeugen meldet, steht nach dem Falten im Zustand.
 *  3. **Der ganze Weg.** Bogen → Nutzlasten → Ereignisse → Fold → Kennzahlen.
 *     Erst das prüft, dass die Übersetzung zum Katalog passt und nicht nur zu
 *     sich selbst.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { PersonalErfassung, staerke as staerkeAusBogen, type Erfassungsbogen } from "@bos/eeb-format";
import { describe, expect, it } from "vitest";

import { SCHEMA_VERSION, ereignisId } from "../../packages/domaene/src/ereignis.js";
import { falte, type EingehendesEreignis } from "../../packages/domaene/src/fold.js";
import { schemata } from "../../packages/domaene/src/katalog/index.js";
import * as K from "../../packages/domaene/src/kennzahlen.js";
import { akteur, hlc } from "../../packages/domaene/src/pruefhilfen/ereignisbau.js";
import { bemerkungAus, ebeneAusEinheitstyp, uebersetzeBogen } from "../../packages/domaene/src/eeb/adapter.js";

const WURZEL = path.resolve(import.meta.dirname, "..", "..");
const PRUEFDATEN = path.join(WURZEL, "pruefdaten", "eeb");

function boegen(verzeichnis: string): string[] {
  const gefunden: string[] = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const voll = path.join(verzeichnis, eintrag);
    if (statSync(voll).isDirectory()) gefunden.push(...boegen(voll));
    else if (eintrag.endsWith(".json")) gefunden.push(voll);
  }
  return gefunden.sort();
}

const DATEIEN = boegen(PRUEFDATEN);
const ALLE: { datei: string; bogen: Erfassungsbogen }[] = DATEIEN.map((datei) => ({
  datei: path.relative(PRUEFDATEN, datei),
  bogen: JSON.parse(readFileSync(datei, "utf8")) as Erfassungsbogen,
}));

let laufnummer = 0;
function bau(typ: string, nutzlast: unknown): EingehendesEreignis {
  laufnummer += 1;
  return {
    id: ereignisId("mk", laufnummer),
    hlc: hlc(1000 + laufnummer, 0, "mk"),
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur("mk"),
    wanduhr: "2026-09-08T08:00:00+02:00",
    typ,
    nutzlast,
  };
}

describe("Die Prüfdaten sind die, die die DoD nennt", () => {
  it("enthält 443 Bögen", () => {
    expect(ALLE).toHaveLength(443);
  });

  it("deckt alle drei Schemaversionen ab, die im Umlauf sind (DoD M1.1)", () => {
    const versionen = new Map<number, number>();
    for (const { bogen } of ALLE) {
      versionen.set(bogen.schemaVersion, (versionen.get(bogen.schemaVersion) ?? 0) + 1);
    }
    expect([...versionen.keys()].sort()).toEqual([6, 7, 8]);
    // Ohne diese Zahlen wäre „alle Schemaversionen" eine Behauptung: Ein
    // einziger Bogen der Version 6 erfüllte den Satz und prüfte die
    // Upcaster-Kette an einem Datensatz statt an hundertneunzehn.
    expect(versionen.get(6)).toBeGreaterThan(100);
    expect(versionen.get(7)).toBeGreaterThan(10);
    expect(versionen.get(8)).toBeGreaterThan(300);
  });
});

describe("Jeder Bogen ergibt gültige Nutzlasten (§3.7)", () => {
  it("besteht für alle 443 Bögen die zod-Schemata des Katalogs", () => {
    const fehler: string[] = [];
    for (const { datei, bogen } of ALLE) {
      const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });

      const einheit = schemata.EinheitGemeldet.safeParse(uebersetzt.einheit);
      if (!einheit.success) fehler.push(`${datei}: Einheit — ${einheit.error.issues[0]?.message}`);

      for (const person of uebersetzt.personen) {
        const geprueft = schemata.PersonHinzugefuegt.safeParse(person);
        if (!geprueft.success) {
          fehler.push(`${datei}: Person — ${geprueft.error.issues[0]?.message}`);
        }
      }
      for (const fahrzeug of uebersetzt.fahrzeuge) {
        const geprueft = schemata.FahrzeugAngelegt.safeParse(fahrzeug);
        if (!geprueft.success) {
          fehler.push(`${datei}: Fahrzeug — ${geprueft.error.issues[0]?.message}`);
        }
      }
    }
    expect(fehler.slice(0, 5)).toEqual([]);
  });

  it("erzeugt für keinen Bogen ein Ereignis unter `unbekannt`", () => {
    // Die härtere Probe: nicht das Schema allein, sondern der Fold. Er prüft
    // zusätzlich Form (§2.2), Pflicht-`grund` (§2.4) und die Id.
    const auffaellig: string[] = [];
    for (const { datei, bogen } of ALLE) {
      laufnummer = 0;
      const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });
      const zustand = falte([
        bau("AbschnittAngelegt", {
          abschnittId: "A",
          name: "Meldekopf",
          typ: "MELDEKOPF",
          reihenfolge: 1,
        }),
        bau("EinheitGemeldet", uebersetzt.einheit),
        ...uebersetzt.personen.map((p) => bau("PersonHinzugefuegt", p)),
        ...uebersetzt.fahrzeuge.map((f) => bau("FahrzeugAngelegt", f)),
        ...(uebersetzt.sofortbedarf === undefined
          ? []
          : [
              {
                ...bau("SofortbedarfGesetzt", { einheitId: "U1" }),
                neu: uebersetzt.sofortbedarf,
              },
            ]),
      ]);
      if (zustand.unbekannt.length > 0) {
        auffaellig.push(`${datei}: ${zustand.unbekannt.map((u) => `${u.typ}/${u.grund}`).join(",")}`);
      }
    }
    expect(auffaellig.slice(0, 5)).toEqual([]);
  });
});

describe("Die Zahlen des Bogens überleben die Übersetzung", () => {
  it("die Stärke steht nach dem Falten unverändert im Zustand", () => {
    const abweichungen: string[] = [];
    for (const { datei, bogen } of ALLE) {
      laufnummer = 0;
      const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });
      const zustand = falte([
        bau("AbschnittAngelegt", {
          abschnittId: "A",
          name: "Meldekopf",
          typ: "MELDEKOPF",
          reihenfolge: 1,
        }),
        bau("EinheitGemeldet", uebersetzt.einheit),
      ]);
      const erwartet = staerkeAusBogen(bogen);
      const wirksam = zustand.einheiten["U1"]?.wirksameStaerke;
      if (
        wirksam?.fuehrer !== erwartet.fuehrer ||
        wirksam.unterfuehrer !== erwartet.unterfuehrer ||
        wirksam.mannschaft !== erwartet.mannschaft
      ) {
        abweichungen.push(datei);
      }
      // K1 muss die Gesamtstärke des Bogens ergeben — die Kennzahl rechnet
      // dieselbe Summe wie `staerke()` im Format.
      const einheit = zustand.einheiten["U1"];
      if (einheit !== undefined && K.gesamtstaerke(einheit) !== erwartet.gesamt) {
        abweichungen.push(`${datei} (K1)`);
      }
    }
    expect(abweichungen.slice(0, 5)).toEqual([]);
  });

  it("jede Person und jedes Fahrzeug des Bogens steht als eigene Entität da", () => {
    const abweichungen: string[] = [];
    for (const { datei, bogen } of ALLE) {
      laufnummer = 0;
      const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });
      const zustand = falte([
        bau("AbschnittAngelegt", {
          abschnittId: "A",
          name: "Meldekopf",
          typ: "MELDEKOPF",
          reihenfolge: 1,
        }),
        bau("EinheitGemeldet", uebersetzt.einheit),
        ...uebersetzt.personen.map((p) => bau("PersonHinzugefuegt", p)),
        ...uebersetzt.fahrzeuge.map((f) => bau("FahrzeugAngelegt", f)),
      ]);
      if (Object.keys(zustand.personen).length !== bogen.personal.length) abweichungen.push(datei);
      if (Object.keys(zustand.fahrzeuge).length !== bogen.fahrzeuge.length) {
        abweichungen.push(`${datei} (Fahrzeuge)`);
      }
    }
    expect(abweichungen.slice(0, 5)).toEqual([]);
  });

  it("bei VOLLSTAENDIG stimmen die Logistikzahlen mit dem Bogen überein", () => {
    // K4 zählt über die Personen; der Bogen leitet dieselben Zahlen ab. Zwei
    // Wege, ein Ergebnis — sonst rechnete die Führungsstelle etwas anderes,
    // als auf dem Bogen steht.
    const abweichungen: string[] = [];
    for (const { datei, bogen } of ALLE) {
      if (bogen.personalErfassung !== PersonalErfassung.VOLLSTAENDIG) continue;
      laufnummer = 0;
      const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });
      const zustand = falte([
        bau("AbschnittAngelegt", {
          abschnittId: "A",
          name: "Meldekopf",
          typ: "MELDEKOPF",
          reihenfolge: 1,
        }),
        bau("EinheitGemeldet", uebersetzt.einheit),
        ...uebersetzt.personen.map((p) => bau("PersonHinzugefuegt", p)),
      ]);
      const einheit = zustand.einheiten["U1"];
      if (einheit === undefined) continue;
      const zahlen = K.logistik(zustand, einheit);
      const weiblich = bogen.personal.filter((p) => p.geschlecht === 1).length;
      const vegan = bogen.personal.filter((p) => p.ernaehrung === 2).length;
      if (zahlen.weiblich !== weiblich || zahlen.vegan !== vegan) abweichungen.push(datei);
    }
    expect(abweichungen.slice(0, 5)).toEqual([]);
  });
});

describe("Die Feldzuordnung im Einzelnen", () => {
  const beispiel = ALLE.find(({ bogen }) => bogen.fahrzeuge.length >= 2 && bogen.personal.length > 0);

  it("findet überhaupt einen Bogen mit Fahrzeugen und Personal", () => {
    expect(beispiel).toBeDefined();
  });

  it("bildet die Bezeichnung aus Einheitstyp und unterster Hierarchieebene", () => {
    const bogen = beispiel?.bogen as Erfassungsbogen;
    const uebersetzt = uebersetzeBogen(bogen, { einheitId: "U1", abschnittId: "A" });
    const ort = bogen.einheit.hierarchie[0]?.name as string;
    expect(uebersetzt.einheit["bezeichnung"]).toContain(ort);
  });

  it("leitet die Ebene aus dem ausgeschriebenen Einheitstyp ab, vom Spezielleren zum Allgemeinen", () => {
    // „Zugtrupp" enthält „Zug", „Fachgruppe" enthält „Gruppe" — die
    // Reihenfolge der Muster ist die eigentliche Aussage.
    expect(ebeneAusEinheitstyp("Zugtrupp Technischer Zug")).toBe("ZUGTRUPP");
    expect(ebeneAusEinheitstyp("Fachgruppe Räumen (A)")).toBe("GRUPPE");
    expect(ebeneAusEinheitstyp("Bergungsgruppe")).toBe("GRUPPE");
    expect(ebeneAusEinheitstyp("Löschzug")).toBe("ZUG");
    expect(ebeneAusEinheitstyp("Tauchtrupp")).toBe("TRUPP");
    expect(ebeneAusEinheitstyp("SEG Sanität")).toBe("UNBESTIMMT");
    expect(ebeneAusEinheitstyp(undefined)).toBe("UNBESTIMMT");
  });

  it("hängt das Übungskennzeichen an die Bemerkung, statt es zu verlieren", () => {
    const uebung = ALLE.find(({ bogen }) => bogen.uebung === true)?.bogen;
    expect(uebung).toBeDefined();
    expect(bemerkungAus(uebung as Erfassungsbogen)).toContain("ÜBUNG (Bogen)");

    // **Alle 443 Beispielbögen tragen `uebung: true`** — sie sind Beispiele,
    // keine Einsatzdaten. Der Gegenfall wird deshalb von Hand gebaut; ihn aus
    // den Prüfdaten zu suchen ergäbe `undefined` und eine Prüfung, die nichts
    // prüft.
    const echt = { ...(uebung as Erfassungsbogen), uebung: undefined, sonstiges: undefined };
    expect(bemerkungAus(echt)).toBeUndefined();
    expect(bemerkungAus({ ...echt, sonstiges: "Pumpe defekt" })).toBe("Pumpe defekt");
  });

  it("meldet die Einheit als ANGEFORDERT — der Bogen kennt keinen Lagestatus", () => {
    const uebersetzt = uebersetzeBogen(beispiel?.bogen as Erfassungsbogen, {
      einheitId: "U1",
      abschnittId: "A",
    });
    expect(uebersetzt.einheit["status"]).toBe("ANGEFORDERT");
    expect(uebersetzt.einheit["istFuehrungDesAbschnitts"]).toBe(false);
  });

  it("nimmt Haupt- und Nebenfahrerlaubnisse zusammen und lässt NONE weg", () => {
    const mitKlassen = ALLE.map(({ bogen }) => bogen).find((bogen) =>
      bogen.personal.some((p) => p.fahrerlaubnis !== 0),
    );
    expect(mitKlassen).toBeDefined();
    const uebersetzt = uebersetzeBogen(mitKlassen as Erfassungsbogen, {
      einheitId: "U1",
      abschnittId: "A",
    });
    for (const person of uebersetzt.personen) {
      const klassen = person["fahrerlaubnisse"] as string[];
      expect(klassen).toEqual([...new Set(klassen)]);
      expect(klassen).not.toContain("NONE");
    }
  });

  it("übernimmt den Sofortbedarf unverändert, wo der Bogen einen trägt", () => {
    const mitBedarf = ALLE.find(({ bogen }) => bogen.sofortbedarf !== undefined)?.bogen;
    expect(mitBedarf).toBeDefined();
    const uebersetzt = uebersetzeBogen(mitBedarf as Erfassungsbogen, {
      einheitId: "U1",
      abschnittId: "A",
    });
    expect(uebersetzt.sofortbedarf).toMatchObject(
      mitBedarf?.sofortbedarf as unknown as Record<string, unknown>,
    );
  });

  it("gibt den Stand als Zeitpunkt zurück — die Grundlage der Revisionsreihe (§2.6)", () => {
    const uebersetzt = uebersetzeBogen(beispiel?.bogen as Erfassungsbogen, {
      einheitId: "U1",
      abschnittId: "A",
    });
    expect(uebersetzt.stand).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("vergibt ohne übergebene Ids ableitbare, eindeutige Ersatz-Ids", () => {
    const uebersetzt = uebersetzeBogen(beispiel?.bogen as Erfassungsbogen, {
      einheitId: "U7",
      abschnittId: "A",
    });
    const ids = uebersetzt.personen.map((p) => p["personId"]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe("U7-P1");
    expect(uebersetzt.fahrzeuge[0]?.["fahrzeugId"]).toBe("U7-F1");
  });
});

describe("Die ganze Kette: Bogen, Meldung, Übernahme, Lage", () => {
  it("führt einen Bogen über den Meldekopf in die Lage (§5.8)", () => {
    laufnummer = 0;
    const bogen = ALLE[0]?.bogen as Erfassungsbogen;
    const uebersetzt = uebersetzeBogen(bogen, {
      einheitId: "U1",
      abschnittId: "EO",
      einheitSchluessel: "THW-OL-B1",
      meldungId: "M1",
    });

    const zustand = falte([
      bau("EinsatzAngelegt", {
        einsatzId: "E",
        name: "Hochwasser",
        art: "EINSATZ",
        fuestName: "FueSt",
        beginn: "2026-09-08T08:00:00+02:00",
        schichtmodell: "ZWEI_SCHICHT",
        kosten: {
          psaKostenProSatz: 180,
          vdaProTag: 150,
          ukVerpflegungProTag: 20,
          geplanteEinsatztage: 5,
        },
      }),
      bau("AbschnittAngelegt", {
        abschnittId: "EO",
        name: "Einsatzort",
        typ: "EINSATZORT",
        reihenfolge: 1,
      }),
      bau("EebMeldungEmpfangen", {
        meldungId: "M1",
        einheitSchluessel: "THW-OL-B1",
        stand: uebersetzt.stand,
        empfangenAm: "2026-09-08T08:30:00+02:00",
        quelle: "SCAN",
        bogen,
      }),
      bau("EinheitGemeldet", uebersetzt.einheit),
      ...uebersetzt.personen.map((p) => bau("PersonHinzugefuegt", p)),
      ...uebersetzt.fahrzeuge.map((f) => bau("FahrzeugAngelegt", f)),
      {
        ...bau("EebMeldungUebernommen", {
          meldungId: "M1",
          einheitId: "U1",
          uebernommeneFelder: ["staerke", "hierarchie"],
        }),
        neu: { einheitId: "U1", uebernommeneFelder: ["staerke", "hierarchie"] },
      },
    ]);

    expect(zustand.unbekannt).toEqual([]);
    // Die Einheit steht im Einsatzort und zählt.
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("EO");
    expect(zustand.einheiten["U1"]?.zaehlt).toBe(true);
    // Der Bogen liegt unverändert an der Meldung — dieser Katalog legt fest,
    // dass er mitgeführt wird (§5.8.1).
    expect(zustand.meldungen["M1"]?.bogen?.wert).toEqual(bogen);
    // Die Meldung hat den Eingangskorb verlassen.
    expect(K.meldekopfEingang(zustand)).toEqual([]);
    expect(zustand.meldungen["M1"]?.uebernahmeZustand).toBe("UEBERNOMMEN");
    // Und die Fremdreferenz der Meldung auf die Einheit ist aufgelöst.
    expect(zustand.hinweise.filter((h) => h.art === "fremdreferenzUnbekannt")).toEqual([]);
  });

  it("meldet die Einheit als mögliche Dublette, wenn zwei Bögen denselben Schlüssel tragen", () => {
    laufnummer = 0;
    const bogen = ALLE[0]?.bogen as Erfassungsbogen;
    const ersteUebersetzung = uebersetzeBogen(bogen, {
      einheitId: "U1",
      abschnittId: "EO",
      einheitSchluessel: "THW-OL-B1",
    });
    const zweiteUebersetzung = uebersetzeBogen(bogen, {
      einheitId: "U2",
      abschnittId: "EO",
      einheitSchluessel: "THW-OL-B1",
    });
    const zustand = falte([
      bau("AbschnittAngelegt", {
        abschnittId: "EO",
        name: "Einsatzort",
        typ: "EINSATZORT",
        reihenfolge: 1,
      }),
      bau("EinheitGemeldet", ersteUebersetzung.einheit),
      bau("EinheitGemeldet", zweiteUebersetzung.einheit),
    ]);
    expect(zustand.hinweise).toContainEqual({
      art: "moeglicheDublette",
      feldpfad: "einheit/U1/einheitSchluessel",
      schluessel: "THW-OL-B1",
      ids: ["U1", "U2"],
    });
  });
});
