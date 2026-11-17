/**
 * Das Blatt „Nachrichten" als Projektion (KONZEPT-NACHRICHTEN.md §6, §9):
 * die fünf Sichten, die Ordnung nach Vorrang, Suche und Ausschnitt, die
 * Nummernvorbelegung, die fünf Zahlen und die Tagebuchsätze.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../pruefhilfen/ereignisbau.js";
import type { Zustand } from "../zustand.js";
import { nachrichtenausschnitt, nachrichtenlage, nachrichtNach, naechsteNachweisnummer } from "./nachrichten.js";
import { nachrichtenZaehlung } from "./nachrichtenzaehlung.js";
import { tagebuchzeile } from "./tagebuch.js";

let n = 0;
/** Die HLC laufen ab 08:00 des Einsatztages in Sekunden — das Eintreffen bei der FmZ ist ihre Zeit (LdF P0-2). */
const BEGINN_MS = Date.parse("2026-09-08T08:00:00+02:00");
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(BEGINN_MS + n * 1000, 0, client);
}

const um = (minute: number): string => `2026-09-08T08:${String(minute).padStart(2, "0")}:00+02:00`;

function verfasst(id: string, angaben: Record<string, unknown> = {}, client = "a"): EingehendesEreignis {
  return anlageEreignis(h(client), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: "FüSt",
    absender: "OV Wildeshausen",
    betreff: "Pumpen eingetroffen",
    inhalt: "Zwei Pumpen am Deich.",
    ...angaben,
  });
}

function vermerk(typ: string, id: string, neu: unknown, extra: Record<string, unknown> = {}, vorher: unknown = null): EingehendesEreignis {
  return feldEreignis(h(), n, typ, { nachrichtId: id, ...extra }, vorher, neu);
}

const gesichtet = (id: string, verteiler: readonly [string, string][]): EingehendesEreignis =>
  vermerk("NachrichtGesichtet", id, { zeitpunkt: um(5), handzeichen: "SI", verteiler: verteiler.map(([stelle, kopie]) => ({ stelle, kopie })) });
const nachgewiesen = (id: string, nummer: number): EingehendesEreignis =>
  vermerk("NachrichtNachgewiesen", id, { nummer, zeitpunkt: um(2), handzeichen: "FM" });

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

/**
 * Eine kleine Lage: zwei Eingänge gesichtet (an S3 und an S2/S4), einer
 * ungesichtet mit Blitz, einer ungesichtet einfach, ein Ausgang vor der FmZ
 * (angenommen um 08:03), ein befördeter Ausgang, eine zurückgezogene Nachricht.
 */
function lage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    verfasst("E1", { betreff: "Pumpen eingetroffen" }),
    nachgewiesen("E1", 26),
    gesichtet("E1", [["S3", "GRUEN"], ["S2", "ROT"]]),
    verfasst("E2", { betreff: "Lage Deich", absender: "EA Nord", vorrang: "SOFORT" }),
    nachgewiesen("E2", 27),
    gesichtet("E2", [["S2", "ROT"], ["S4", "GRUEN"]]),
    vermerk("NachrichtKenntnisGenommen", "E2", { zeitpunkt: um(6), handzeichen: "KL" }, { stelle: "S4" }),
    verfasst("E3", { betreff: "Einfach" }),
    verfasst("E4", { betreff: "Deichbruch", vorrang: "BLITZ" }),
    verfasst("A1", { richtung: "AUSGANG", absender: "S3", anschrift: "OV Wildeshausen", betreff: "Sandsäcke anfordern", funktion: "S3" }, "b"),
    vermerk("NachrichtAngenommen", "A1", { zeitpunkt: um(3), handzeichen: "FM" }),
    verfasst("A2", { richtung: "AUSGANG", absender: "S4", betreff: "Verpflegung", funktion: "S4" }),
    nachgewiesen("A2", 28),
    vermerk("NachrichtBefoerdert", "A2", { mittel: "TELEFON", zeitpunkt: um(4), handzeichen: "FM", gegenstelle: "Kreis OL" }),
    verfasst("Z1", { betreff: "Fehlanlage" }),
    feldEreignis(h(), n, "NachrichtZurueckgezogen", { nachrichtId: "Z1" }, null, true, "doppelt"),
  ];
}

const ids = (zustandDerLage: Zustand, anfrage: Parameters<typeof nachrichtenausschnitt>[1]): string[] =>
  nachrichtenausschnitt(zustandDerLage, anfrage).zeilen.map((z) => z.id);

describe("Der Übermittlungsvorschlag des LdF", () => {
  it("steht an der Zeile, im Tagebuch und ändert den Laufzustand nicht", () => {
    const vorschlag = { mittel: "FUNK", fernmelder: "Fm2", gegenstelle: "Kreis OL", zeitpunkt: um(2), handzeichen: "LDF" };
    const z = zustand([...lage(), vermerk("NachrichtUebermittlungVorgeschlagen", "A1", vorschlag)]);
    const zeile = nachrichtenausschnitt(z, { sicht: "fmz" }).zeilen.find((r) => r.id === "A1");
    expect(zeile?.vorschlag).toEqual(vorschlag);
    expect(zeile?.laufzustand).toBe("VOR_FMZ");
  });

  it("fehlt in der Zeile, wenn der Wert nicht zum Schema passt", () => {
    const z = zustand([...lage(), vermerk("NachrichtUebermittlungVorgeschlagen", "A1", { mittel: "FUNK" })]);
    expect(nachrichtenausschnitt(z, { sicht: "fmz" }).zeilen.find((r) => r.id === "A1")?.vorschlag).toBeUndefined();
  });
});

describe("Die Sichten", () => {
  it("Posteingang: nur, was eine eigene Stelle im Verteiler hat, Sofort vor einfach, mit Kopiefarbe und Marken", () => {
    const z = zustand(lage());
    expect(ids(z, { sicht: "posteingang", stellen: ["S2"] })).toEqual(["E2", "E1"]);
    expect(ids(z, { sicht: "posteingang", stellen: ["S3"] })).toEqual(["E1"]);
    const e2 = nachrichtenausschnitt(z, { sicht: "posteingang", stellen: ["S4"] }).zeilen[0];
    expect(e2?.verteiler).toEqual([
      { stelle: "S2", kopie: "ROT", gelesen: false, erledigt: false },
      { stelle: "S4", kopie: "GRUEN", gelesen: true, kenntnis: { zeitpunkt: um(6), handzeichen: "KL" }, erledigt: false },
    ]);
    expect(e2).toMatchObject({ richtungKurz: "E", nummer: 27, vorrang: "SOFORT", absender: "EA Nord", laufzustand: "VERTEILT" });
  });

  it("Posteingang: filtert nach neu, gelesen, erledigt — bezogen auf die eigenen Stellen", () => {
    const z = zustand([...lage(), vermerk("NachrichtErledigt", "E1", true, { stelle: "S3" })]);
    expect(ids(z, { sicht: "posteingang", stellen: ["S4"], zustaende: ["GELESEN"] })).toEqual(["E2"]);
    expect(ids(z, { sicht: "posteingang", stellen: ["S2"], zustaende: ["NEU"] })).toEqual(["E2", "E1"]);
    expect(ids(z, { sicht: "posteingang", stellen: ["S3"], zustaende: ["ERLEDIGT"] })).toEqual(["E1"]);
    expect(ids(z, { sicht: "posteingang", stellen: ["S3"], zustaende: ["NEU"] })).toEqual([]);
  });

  it("Ausgang: nach Stelle oder Arbeitsplatz, mit dem Stand in der FmZ", () => {
    const z = zustand(lage());
    expect(ids(z, { sicht: "ausgang", stellen: ["S4"] })).toEqual(["A2"]);
    expect(ids(z, { sicht: "ausgang", clientId: "b" })).toEqual(["A1"]);
    const a2 = nachrichtenausschnitt(z, { sicht: "ausgang", stellen: ["S4"] }).zeilen[0];
    expect(a2).toMatchObject({ laufzustand: "ERLEDIGT", gegenstelle: "Kreis OL", befoerderung: { mittel: "TELEFON", handzeichen: "FM" } });
  });

  it("Ausgang: die Stelle (funktion) entscheidet, nicht der Absender-Freitext (SGL P2-14, Entscheidung 14)", () => {
    const z = zustand([
      ...lage(),
      // Freitext im Absender, Stelle S3 in Feld 15/17, anderer Arbeitsplatz „c“.
      verfasst("A3", { richtung: "AUSGANG", absender: "OV Wildeshausen, S3", funktion: "S3", betreff: "Freitext" }, "c"),
      // Absender sagt S3, die verfassende Stelle ist aber S1: gehört nicht zu S3.
      verfasst("A4", { richtung: "AUSGANG", absender: "S3", funktion: "S1", betreff: "Anderer Verfasser" }, "d"),
    ]);
    expect(ids(z, { sicht: "ausgang", stellen: ["S3"], clientId: "x" }).sort()).toEqual(["A1", "A3"]);
    // Das Wort der Maske („FmZ“) trifft den Schlüssel der Stelle („FMZ“).
    const zFmz = zustand([...lage(), verfasst("A5", { richtung: "AUSGANG", absender: "FmZ", funktion: "FmZ", betreff: "Aus der FmZ" }, "e")]);
    expect(ids(zFmz, { sicht: "ausgang", stellen: ["FMZ"], clientId: "x" })).toEqual(["A5"]);
    // Der eigene Arbeitsplatz sieht seine Ausgänge auch ohne passende Stelle.
    expect(ids(z, { sicht: "ausgang", stellen: ["S6"], clientId: "d" })).toEqual(["A4"]);
  });

  it("Sichter: die Eingänge ohne Sichtung, Blitz zuoberst", () => {
    expect(ids(zustand(lage()), { sicht: "sichter" })).toEqual(["E4", "E3"]);
  });

  it("FmZ: die Warteschlange mit der Zwanzig-Minuten-Marke, Schwelle je Einsatz", () => {
    const basis = lage();
    const z = zustand(basis);
    expect(ids(z, { sicht: "fmz" })).toEqual(["A1"]);
    expect(nachrichtenausschnitt(z, { sicht: "fmz", jetzt: um(20) }).zeilen[0]?.fmzUeberSchwelle).toBe(false);
    expect(nachrichtenausschnitt(z, { sicht: "fmz", jetzt: um(24) }).zeilen[0]?.fmzUeberSchwelle).toBe(true);
    expect(nachrichtenausschnitt(z, { sicht: "fmz" }).zeilen[0]?.fmzUeberSchwelle).toBe(false);
    const laenger = zustand([...basis, feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "fmzSchwelleMinuten" }, null, 30)]);
    expect(nachrichtenausschnitt(laenger, { sicht: "fmz", jetzt: um(24) }).zeilen[0]?.fmzUeberSchwelle).toBe(false);
  });

  it("Nachweisung: alle nach Nummer, ohne Nummer zuletzt, doppelte Nummern markiert", () => {
    const z = zustand([...lage(), nachgewiesen("E3", 26)]);
    const zeilen = nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen;
    expect(zeilen.map((x) => [x.id, x.nummer ?? null, x.nummerDoppelt])).toEqual([
      ["E1", 26, true],
      ["E3", 26, true],
      ["E2", 27, false],
      ["A2", 28, false],
      ["E4", null, false],
      ["A1", null, false],
      ["Z1", null, false],
    ]);
  });
});

describe("Suche, Ausschnitt und Einzelzeile", () => {
  it("sucht über Betreff, Inhalt, Absender und Anschrift", () => {
    const z = zustand(lage());
    expect(ids(z, { sicht: "nachweisung", suche: "deichbruch" })).toEqual(["E4"]);
    expect(ids(z, { sicht: "nachweisung", suche: "ea nord" })).toEqual(["E2"]);
    expect(ids(z, { sicht: "nachweisung", suche: "wildeshausen" })).toEqual(["E1", "E3", "E4", "A1", "Z1"]);
    expect(nachrichtenausschnitt(z, { sicht: "nachweisung", suche: "Zwei Pumpen" }).gesamtzahl).toBe(7);
  });

  it("liefert den Ausschnitt mit Gesamtzahl wie das Tagebuch", () => {
    const ausschnitt = nachrichtenausschnitt(zustand(lage()), { sicht: "nachweisung", von: 2, anzahl: 2 });
    expect(ausschnitt.gesamtzahl).toBe(7);
    expect(ausschnitt.von).toBe(2);
    expect(ausschnitt.zeilen.map((x) => x.id)).toEqual(["A2", "E3"]);
  });

  it("findet eine einzelne Nachricht mit allen Feldern des Vordrucks", () => {
    expect(nachrichtNach(zustand(lage()), "E1")).toMatchObject({ betreff: "Pumpen eingetroffen", inhalt: "Zwei Pumpen am Deich.", anschrift: "FüSt" });
    expect(nachrichtNach(zustand(lage()), "XX")).toBeUndefined();
  });
});

describe("Nummernvorbelegung und Zahlen", () => {
  it("belegt die höchste bekannte Nummer plus eins vor", () => {
    const basis = lage();
    expect(naechsteNachweisnummer(zustand(basis.slice(0, 2)))).toBe(1);
    expect(naechsteNachweisnummer(zustand(basis))).toBe(29);
    expect(naechsteNachweisnummer(zustand([...basis, nachgewiesen("Z1", 40)]))).toBe(41);
  });

  it("zählt die fünf Zahlen des Bandes für die eigenen Stellen", () => {
    const z = zustand(lage());
    const luecken = Array.from({ length: 25 }, (_, i) => i + 1);
    // Mit Vorrang offen je Stelle (SGL P1-7): E 27 (Sofort) für S2 und S4; der Blitz vor dem Sichter nur für den Sichter.
    // Mit `jetzt` dazu der Stau vor dem Sichter (Sichter P1-4) und die Rechenzeit (zweiter Durchlauf).
    expect(nachrichtenlage(z, ["S2"], um(24))).toEqual({ neuFuerStellen: 2, vorFmz: 1, vorSichter: 2, mitVorrangOffen: 1, ueberSchwelle: 1, nummernluecken: luecken, vorSichterUeberSchwelle: 2, gerechnetUm: um(24) });
    expect(nachrichtenlage(z, ["S4"])).toEqual({ neuFuerStellen: 0, vorFmz: 1, vorSichter: 2, mitVorrangOffen: 1, ueberSchwelle: 0, nummernluecken: luecken });
  });
});

describe("Die Nachrichten im Tagebuch", () => {
  it("nennt Nummer, Richtung, Absender, Anschrift und Betreff", () => {
    const basis = lage();
    const z = zustand(basis);
    const satz = (index: number): string => tagebuchzeile(z, basis[index] as EingehendesEreignis).satz;
    expect(satz(1)).toBe("Nachricht E 26 erfasst: OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(satz(2)).toBe("Nachricht E 26 nachgewiesen (Hz. FM): OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(satz(3)).toBe("Nachricht E 26 gesichtet (Hz. SI), verteilt an S3 (grün), S2 (rot): OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(satz(7)).toBe("Nachricht E 27 von S4 zur Kenntnis genommen (Hz. KL): EA Nord an FüSt, ‚Lage Deich‘");
    expect(satz(10)).toBe("Nachricht A aufgegeben: S3 an OV Wildeshausen, ‚Sandsäcke anfordern‘");
    expect(satz(14)).toBe("Nachricht A 28 befördert (Telefon, an Kreis OL, Hz. FM): S4 an FüSt, ‚Verpflegung‘");
    const zurueck = tagebuchzeile(z, basis[16] as EingehendesEreignis);
    expect(zurueck).toMatchObject({ satz: "Nachricht E zurückgezogen, Grund: „doppelt“: OV Wildeshausen an FüSt, ‚Fehlanlage‘", grund: "doppelt", berichtigung: true, nachrichtId: "Z1" });
  });

  it("schreibt die Aufnahme als „aufgenommen“, mit der Aufnahmezeit als fachlicher Zeit", () => {
    const basis = lage();
    const aufnahme = verfasst("E9", { aufnahme: { mittel: "FUNK", zeitpunkt: um(9), handzeichen: "FM" } });
    const zeile = tagebuchzeile(zustand([...basis, aufnahme]), aufnahme);
    expect(zeile.satz).toBe("Nachricht E aufgenommen: OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(zeile.zeitpunkt).toBe(um(9));
  });

  it("nennt Erledigung, Rücknahme, Vermerk und Gesprächsnotiz", () => {
    const basis = lage();
    const erledigt = vermerk("NachrichtErledigt", "E1", true, { stelle: "S3" });
    const zurueck = vermerk("ErledigungDerNachrichtZurueckgenommen", "E1", false, { stelle: "S3" }, true);
    const notiz = verfasst("G1", { gespraechsnotiz: true, absender: "S1", anschrift: "Kreis OL", betreff: "Telefonat" });
    const vermerkt = vermerk("NachrichtVermerkt", "E1", "ETB-Nr. 14");
    const z = zustand([...basis, erledigt, zurueck, notiz, vermerkt]);
    expect(tagebuchzeile(z, erledigt).satz).toBe("Nachricht E 26 für S3 erledigt: OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(tagebuchzeile(z, zurueck).satz).toBe("Nachricht E 26 Erledigung für S3 zurückgenommen: OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    expect(tagebuchzeile(z, notiz).satz).toBe("Gesprächsnotiz E festgehalten: S1 an Kreis OL, ‚Telefonat‘");
    expect(tagebuchzeile(z, vermerkt).satz).toBe("Nachricht E 26 Vermerk „ETB-Nr. 14“: OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
  });

  it("schreibt die Parameter des Einsatzes mit Vorbelegung", () => {
    const basis = lage();
    const schwelle = feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "fmzSchwelleMinuten" }, null, 30);
    const sichtung = feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "sichtungAuchAusgang" }, null, true);
    const z = zustand([...basis, schwelle, sichtung]);
    expect(tagebuchzeile(z, schwelle).satz).toBe("Hochwasser: Nachrichtenparameter gesetzt (Schwelle FmZ): 20 → 30 min");
    expect(tagebuchzeile(z, sichtung).satz).toBe("Hochwasser: Nachrichtenparameter gesetzt (Sichtung auch für Ausgänge): nein → ja");
  });
});

describe("Die Zahlen hinter den Chips", () => {
  it("zählt den Posteingang je Stand wie die Sicht ihn filtert", () => {
    const z = zustand([...lage(), vermerk("NachrichtErledigt", "E1", true, { stelle: "S3" })]);
    expect(nachrichtenZaehlung(z, ["S2"])).toEqual({ NEU: 2, GELESEN: 0, ERLEDIGT: 0, OFFEN: 2 });
    expect(nachrichtenZaehlung(z, ["S4"])).toEqual({ NEU: 0, GELESEN: 1, ERLEDIGT: 0, OFFEN: 1 });
    // S3 hat E 26 erledigt; offen bleibt der eigene Ausgang A 1, der noch bei der FmZ liegt.
    expect(nachrichtenZaehlung(z, ["S3"])).toEqual({ NEU: 0, GELESEN: 0, ERLEDIGT: 1, OFFEN: 1 });
    for (const stand of ["NEU", "GELESEN", "ERLEDIGT"] as const) {
      const gesamt = nachrichtenausschnitt(z, { sicht: "posteingang", stellen: ["S2", "S3", "S4"], zustaende: [stand] }).gesamtzahl;
      expect(nachrichtenZaehlung(z, ["S2", "S3", "S4"])[stand]).toBe(gesamt);
    }
  });

  it("zählt nichts für eine Stelle ohne Verteiler und für einen leeren Einsatz", () => {
    expect(nachrichtenZaehlung(zustand(lage()), ["S9"])).toEqual({ NEU: 0, GELESEN: 0, ERLEDIGT: 0, OFFEN: 0 });
    expect(nachrichtenZaehlung(zustand([]), ["S2"])).toEqual({ NEU: 0, GELESEN: 0, ERLEDIGT: 0, OFFEN: 0 });
  });
});
