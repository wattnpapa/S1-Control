import { describe, expect, it } from "vitest";

import {
  datumZeitGruppe,
  druckbar,
  leererNachrichtenvordruckPdf,
  nachrichtAlsVordruckPdf,
  verteilerZuordnen,
  vordruckBlaetterAus,
  vordruckDatenAus,
  type Nachrichtendruck,
} from "./nachricht.js";

const GRUNDLAGE: Nachrichtendruck = {
  richtung: "AUSGANG",
  art: "SPRUCH",
  vorrang: "SOFORT",
  gespraechsnotiz: false,
  uebermittlungswunsch: "FUNK",
  anschrift: "Technische Einsatzleitung",
  rufnummer: "0441 123456",
  betreff: "",
  inhalt: "Erkundung abgeschlossen.\nZufahrt ist frei.",
  absender: "Heros Oldenburg 16/11",
  abfassungszeit: "2026-11-17T09:45:00Z",
  zeichen: "JR",
  funktion: "S 2",
  gegenstelle: "Heros Jever 21/10",
  uebung: false,
};

const kopf = (pdf: Uint8Array) => new TextDecoder().decode(pdf.slice(0, 5));

describe("Datum-Zeit-Gruppe", () => {
  it("rechnet nach Berliner Zeit und kuerzt den Monat", () => {
    expect(datumZeitGruppe("2026-11-17T09:45:00Z")).toBe("171045nov26");
    expect(datumZeitGruppe("2026-07-01T22:30:00Z")).toBe("020030jul26");
    expect(datumZeitGruppe("2026-03-05T08:00:00Z")).toBe("050900mrz26");
  });
  it("liefert bei ungueltiger Eingabe nichts", () => {
    expect(datumZeitGruppe("kein Datum")).toBe("");
  });
});

describe("druckbar", () => {
  it("laesst Windows-1252 durch, auch Umlaute und Euro", () => {
    expect(druckbar("Größe 5 €, Übung – „ok“")).toBe("Größe 5 €, Übung – „ok“");
  });
  it("ersetzt Pfeile und Unbekanntes", () => {
    expect(druckbar("A → B")).toBe("A -> B");
    expect(druckbar("Ω und 😀")).toBe("? und ?");
  });
  it("behaelt Zeilenumbrueche und macht Tabulatoren zu Leerzeichen", () => {
    expect(druckbar("a\r\nb\tc")).toBe("a\nb c");
  });
});

describe("Zuordnung nach VordruckDaten", () => {
  it("Ausgang: Annahme, Befoerderung und Nachweisnummer", () => {
    const daten = vordruckDatenAus({
      ...GRUNDLAGE,
      annahme: { zeitpunkt: "2026-11-17T09:50:00Z", handzeichen: "AB" },
      befoerderung: { mittel: "TELEFAX", zeitpunkt: "2026-11-17T10:05:00Z", handzeichen: "CD" },
      nachweis: { nummer: "17", zeitpunkt: "2026-11-17T09:51:00Z", handzeichen: "EF" },
      aufnahme: { zeitpunkt: "2026-11-17T09:00:00Z", handzeichen: "XX" },
    });
    expect(daten.richtung).toBe("ausgang");
    expect(daten.nummer).toBe("17");
    expect(daten.annahmevermerk).toEqual({ datum: "17", uhrzeit: "1050", handzeichen: "AB" });
    expect(daten.befoerderungsvermerk).toEqual({ datum: "17", uhrzeit: "1105", handzeichen: "CD" });
    expect(daten.aufnahmevermerk).toEqual({});
    expect(daten.uebermittlungsweg).toBe("telefax");
    expect(daten.art).toBe("spruch");
    expect(daten.vorrang).toBe("sofort");
    expect(daten.empfaenger).toEqual(["Heros Jever 21/10"]);
    expect(daten.anschriften).toEqual(["Technische Einsatzleitung", "0441 123456"]);
    expect(daten.abfassungszeit).toBe("171045nov26");
    expect(daten.ankreuzfelder()).toContain("betriebsbuchAusgang");
  });

  it("Eingang: Aufnahme, keine Vorbelegung als Ausgang", () => {
    const daten = vordruckDatenAus({
      ...GRUNDLAGE,
      richtung: "EINGANG",
      art: "",
      vorrang: "",
      uebermittlungswunsch: "TELEFON",
      aufnahme: { zeitpunkt: "2026-11-17T09:50:00Z", handzeichen: "AB" },
      annahme: { zeitpunkt: "2026-11-17T09:55:00Z", handzeichen: "ZZ" },
    });
    expect(daten.richtung).toBe("eingang");
    expect(daten.aufnahmevermerk).toEqual({ datum: "17", uhrzeit: "1050", handzeichen: "AB" });
    expect(daten.annahmevermerk).toEqual({});
    expect(daten.uebermittlungsweg).toBe("telefon");
    expect(daten.art).toBeUndefined();
    expect(daten.vorrang).toBeUndefined();
    const kreuze = daten.ankreuzfelder();
    expect(kreuze).toContain("betriebsbuchEingang");
    expect(kreuze).not.toContain("betriebsbuchAusgang");
    expect(kreuze).not.toContain("kopfFunk");
  });

  it("Sichtung: Quittung, Vermerke und Verteilerkaestchen", () => {
    const daten = vordruckDatenAus({
      ...GRUNDLAGE,
      sichtung: {
        zeitpunkt: "2026-11-17T10:00:00Z",
        handzeichen: "S2",
        vermerke: "eilt",
        verteiler: [
          { stelle: "LEITER", kopie: false },
          { stelle: "S1", kopie: false },
          { stelle: "S6", kopie: false },
          { stelle: "Fachberater Statik", kopie: false },
          { stelle: "VB Polizei", kopie: true },
        ],
      },
    });
    expect(daten.quittung).toEqual({ uhrzeit: "1100", zeichen: "S2" });
    expect(daten.vermerke).toBe("eilt");
    expect(daten.verteilerText).toEqual({ S1: { spalte2: "Fachberater Statik", spalte3: "VB Polizei" } });
    expect(daten.weitereAnkreuzfelder).toEqual([
      "verteilerLeiter",
      "verteilerS1Spalte1",
      "verteilerS6Spalte1",
      "verteilerS1Spalte2",
      "verteilerS1Spalte3",
    ]);
  });

  it("Verteiler: freie Namen als Text, Ueberlaeufer und S5 in den Vermerken", () => {
    const frei = Array.from({ length: 6 }, (_, i) => ({ stelle: `Gast ${i}`, kopie: false }));
    const zuordnung = verteilerZuordnen([...frei, { stelle: "S5", kopie: true }]);
    expect(Object.keys(zuordnung.texte)).toHaveLength(5);
    expect(zuordnung.texte.S1).toEqual({ spalte2: "Gast 0", spalte3: "S5" });
    expect(zuordnung.texte.S6).toEqual({ spalte2: "Gast 4" });
    expect(zuordnung.rest).toEqual(["Gast 5"]);
    expect(zuordnung.felder).toContain("verteilerS1Spalte3");
  });

  it("Betreff kommt in sein eigenes Feld", () => {
    const daten = vordruckDatenAus({ ...GRUNDLAGE, betreff: " Lage " });
    expect(daten.betreff).toBe("Lage");
    expect(daten.inhalt).toBe("Erkundung abgeschlossen.\nZufahrt ist frei.");
  });
});

describe("Folgeblaetter", () => {
  const zeilen = (n: number) => Array.from({ length: n }, (_, i) => `Zeile ${i + 1}`).join("\n");

  it("zwoelf Zeilen bleiben ein Blatt ohne Blattangabe", () => {
    const blaetter = vordruckBlaetterAus({ ...GRUNDLAGE, inhalt: zeilen(12) });
    expect(blaetter).toHaveLength(1);
    expect(blaetter[0]?.blatt).toBe("");
  });

  it("lange Zeilen werden umgebrochen und zaehlen mit", () => {
    const lang = Array.from({ length: 6 }, () => "Wort ".repeat(60).trim()).join("\n");
    expect(vordruckBlaetterAus({ ...GRUNDLAGE, inhalt: lang }).length).toBeGreaterThan(1);
  });

  it("dreizehn Zeilen werden zwei Blaetter", () => {
    const blaetter = vordruckBlaetterAus({ ...GRUNDLAGE, inhalt: zeilen(13) });
    expect(blaetter.map((b) => b.blatt)).toEqual(["Blatt 1 von 2", "Blatt 2 von 2"]);
    expect(blaetter[1]?.inhalt).toBe("Zeile 13");
    expect(blaetter[1]?.abfassungszeit).toBe("171045nov26");
    const pdf = nachrichtAlsVordruckPdf({ ...GRUNDLAGE, inhalt: zeilen(13) }, { blatt: "a5" });
    expect(new TextDecoder().decode(pdf)).toMatch(/\/Count 2/);
  });

  it("Uebungsmarke aus der Nachricht oder der Option", () => {
    expect(vordruckBlaetterAus({ ...GRUNDLAGE, uebung: true })[0]?.uebung).toBe(true);
    expect(vordruckBlaetterAus(GRUNDLAGE)[0]?.uebung).toBe(false);
    expect(vordruckBlaetterAus(GRUNDLAGE, true)[0]?.uebung).toBe(true);
  });
});

describe("PDF", () => {
  it("A5 und A4 quer beginnen mit %PDF und sind nicht leer", () => {
    for (const blatt of ["a5", "a4quer"] as const) {
      const pdf = nachrichtAlsVordruckPdf(GRUNDLAGE, { blatt, uebung: true });
      expect(kopf(pdf)).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(1000);
    }
  });

  it("A4 quer legt zwei Bloecke auf eine Seite", () => {
    const inhalt = Array.from({ length: 13 }, (_, i) => `Zeile ${i}`).join("\n");
    const pdf = nachrichtAlsVordruckPdf({ ...GRUNDLAGE, inhalt }, { blatt: "a4quer" });
    expect(new TextDecoder().decode(pdf)).toMatch(/\/Count 1/);
  });

  it("Verteilertexte und Sonderzeichen brechen die Ausgabe nicht", () => {
    const pdf = nachrichtAlsVordruckPdf(
      {
        ...GRUNDLAGE,
        inhalt: "Lage → ruhig Ω",
        sichtung: { zeitpunkt: "2026-11-17T10:00:00Z", handzeichen: "S2", vermerke: "", verteiler: [{ stelle: "Fachberater", kopie: false }] },
      },
      { blatt: "a5" },
    );
    expect(kopf(pdf)).toBe("%PDF-");
  });

  it("leerer Vordruck", () => {
    const pdf = leererNachrichtenvordruckPdf();
    expect(kopf(pdf)).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
