/**
 * Der Katalog gegen KONZEPT-EREIGNISSE.md §5 — Zeile fuer Zeile.
 *
 * Die Tests hier pruefen keine Fachlogik, sondern die Uebereinstimmung der
 * Tabelle mit dem Konzept. Faellt einer, ist entweder die Tabelle falsch
 * abgeschrieben oder das Konzept hat sich geaendert, ohne dass der Code
 * nachgezogen wurde.
 */

import { describe, expect, it } from "vitest";

import {
  ANLAGEARTEN,
  GRUND_PFLICHT,
  KATALOG,
  KATALOG_EINTRAEGE,
  KORREKTUR_VON,
  istBekannterTyp,
  schemata,
} from "./index.js";

describe("Der Katalog bildet §5 vollstaendig ab", () => {
  it("kennt genau dreizehn Anlagearten (§3.11)", () => {
    expect(ANLAGEARTEN).toEqual([
      "AbschnittAngelegt",
      "AnforderungAngelegt",
      "AnhangHinzugefuegt",
      "AuftragErfasst",
      "DienstpostenAngelegt",
      "EebMeldungEmpfangen",
      "EinheitAufgeteilt",
      "EinheitGemeldet",
      "EinsatzAngelegt",
      "EtbEintragBerichtigt",
      "EtbEintragErfasst",
      "FahrzeugAngelegt",
      "PersonHinzugefuegt",
    ]);
    expect(ANLAGEARTEN).toHaveLength(13);
  });

  it("kennt genau neun Arten mit Pflicht-grund (§2.4)", () => {
    expect(GRUND_PFLICHT).toEqual([
      "AbschnittTypGeaendert",
      "AnforderungStorniert",
      "ArchivierungZurueckgenommen",
      "EebMeldungAbgelehnt",
      "EinheitEntfernt",
      "EtbEintragBerichtigt",
      "FahrzeugEntfernt",
      "KorrekturVon",
      "PersonEntfernt",
    ]);
    expect(GRUND_PFLICHT).toHaveLength(9);
  });

  it("nennt DienstpostenEntfernt und AnhangEntfernt ausdruecklich nicht (§2.4)", () => {
    // Ein Dienstposten ist Planung, ein Anhang ein Verweis; keines von beiden
    // nimmt eine gemeldete Kraft aus der Lage.
    expect(GRUND_PFLICHT).not.toContain("DienstpostenEntfernt");
    expect(GRUND_PFLICHT).not.toContain("AnhangEntfernt");
  });

  it("vergibt jeden Typ genau einmal", () => {
    const typen = KATALOG_EINTRAEGE.map((eintrag) => eintrag.typ);
    expect(new Set(typen).size).toBe(typen.length);
  });

  it("gibt jedem Ereignis der Form (a) genau ein Feld und keinem anderen eines (§2.2)", () => {
    for (const eintrag of KATALOG_EINTRAEGE) {
      if (eintrag.form === "a") expect(eintrag.feld, eintrag.typ).toBeDefined();
      else expect(eintrag.feld, eintrag.typ).toBeUndefined();
    }
  });

  it("fuehrt KorrekturVon ausserhalb der Tabelle, aber im Nachschlagewerk (§5.9.2)", () => {
    expect(KATALOG_EINTRAEGE).not.toContain(KORREKTUR_VON);
    expect(istBekannterTyp("KorrekturVon")).toBe(true);
    expect(KATALOG.get("KorrekturVon")?.grundPflicht).toBe(true);
  });

  it("weist eine unbekannte Art zurueck, statt sie zu raten (§3.7 Regel 1)", () => {
    expect(istBekannterTyp("EinheitGebeamt")).toBe(false);
  });
});

describe("Die Schemata beschreiben nur die Nutzlast (§5.1)", () => {
  it("laesst zusaetzliche Felder durch, weil kein Schema strict ist (§3.7 Punkt 3)", () => {
    // Ein Client einer hoeheren Nutzlastversion darf Felder mitfuehren, die
    // dieser nicht kennt. Ein strict-Schema wiese sie ab, und die Meldung
    // stuende unter `unbekannt` statt in der Lage.
    const ergebnis = schemata.StatusGesetzt.safeParse({
      einheitId: "U1",
      spaeteresFeld: "aus einer neueren Fassung",
    });
    expect(ergebnis.success).toBe(true);
  });

  it("nimmt einen unbekannten Wert eines offenen Bereichs an (§3.7 Punkt 5)", () => {
    // `status` ist ein offener Bereich: der Fold erzeugt `unbekannterWert`
    // und spiegelt den Wert unveraendert weiter. Ein z.enum wiese ihn ab.
    const anlage = {
      einheitId: "U1",
      abschnittId: "A",
      bezeichnung: "1. Bergungsgruppe",
      organisation: "THW",
      hierarchie: [],
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
      personalErfassung: "NUR_STAERKE",
      status: "EINE_NEUE_LAGE",
      reihenfolge: 0,
      istFuehrungDesAbschnitts: false,
    };
    expect(schemata.EinheitGemeldet.safeParse(anlage).success).toBe(true);
  });

  it("weist einen unbekannten Wert eines geschlossenen Bereichs zurueck (§3.7 Punkt 5)", () => {
    const ergebnis = schemata.EinsatzAngelegt.safeParse({
      einsatzId: "E",
      name: "Hochwasser",
      art: "MANOEVER",
      fuestName: "FueSt",
      beginn: "2026-09-10T08:00:00+02:00",
      schichtmodell: "ZWEI_SCHICHT",
      kosten: {
        psaKostenProSatz: 180,
        vdaProTag: 150,
        ukVerpflegungProTag: 20,
        geplanteEinsatztage: 5,
      },
    });
    expect(ergebnis.success).toBe(false);
  });

  it("weist eine Id ohne Laenge und eine ueberlange zurueck (§5.1, S7)", () => {
    expect(schemata.StatusGesetzt.safeParse({ einheitId: "" }).success).toBe(false);
    expect(schemata.StatusGesetzt.safeParse({ einheitId: "x".repeat(201) }).success).toBe(false);
    expect(schemata.StatusGesetzt.safeParse({ einheitId: "x".repeat(200) }).success).toBe(true);
  });

  it("erzwingt bei EinheitAufgeteilt die drei Bedingungen aus §5.4.2a", () => {
    const einheit = {
      abschnittId: "A",
      bezeichnung: "Teileinheit",
      organisation: "THW",
      hierarchie: [],
      ebene: "TRUPP",
      staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 3 },
      personalErfassung: "NUR_STAERKE",
      status: "IM_EINSATZ",
      reihenfolge: 1,
      istFuehrungDesAbschnitts: false,
    };
    const gut = {
      quellEinheitId: "U1",
      neueEinheitId: "V1",
      neueEinheit: einheit,
      abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 3 },
      gesehen: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
      uebernommeneFahrzeuge: [],
      uebernommenePersonen: [],
    };
    expect(schemata.EinheitAufgeteilt.safeParse(gut).success).toBe(true);

    // abgeteilteStaerke muss zur Staerke der neuen Einheit passen (§5.4.2).
    expect(
      schemata.EinheitAufgeteilt.safeParse({
        ...gut,
        abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
      }).success,
    ).toBe(false);

    // Quelle und Ziel muessen verschieden sein (§5.4.2a Nr. 4).
    expect(
      schemata.EinheitAufgeteilt.safeParse({ ...gut, neueEinheitId: "U1" }).success,
    ).toBe(false);

    // Jede uebernommene Entitaet hoechstens einmal (§2.2 Form (c)).
    expect(
      schemata.EinheitAufgeteilt.safeParse({
        ...gut,
        uebernommeneFahrzeuge: [{ fahrzeugId: "F1" }, { fahrzeugId: "F1" }],
      }).success,
    ).toBe(false);
  });

  it("erzwingt bei EinheitZusammengefuehrt die beiden Bedingungen aus §5.4.3", () => {
    const gesehen = { fuehrer: 0, unterfuehrer: 0, mannschaft: 3 };
    expect(
      schemata.EinheitZusammengefuehrt.safeParse({
        zielEinheitId: "Z",
        quellen: [{ einheitId: "Q1", gesehen }],
      }).success,
    ).toBe(true);

    // Das Ziel darf nicht unter den Quellen stehen.
    expect(
      schemata.EinheitZusammengefuehrt.safeParse({
        zielEinheitId: "Z",
        quellen: [{ einheitId: "Z", gesehen }],
      }).success,
    ).toBe(false);

    // Jede Quelle hoechstens einmal.
    expect(
      schemata.EinheitZusammengefuehrt.safeParse({
        zielEinheitId: "Z",
        quellen: [
          { einheitId: "Q1", gesehen },
          { einheitId: "Q1", gesehen },
        ],
      }).success,
    ).toBe(false);

    // Mindestens eine Quelle.
    expect(
      schemata.EinheitZusammengefuehrt.safeParse({ zielEinheitId: "Z", quellen: [] }).success,
    ).toBe(false);
  });

  it("verlangt beim Schnappschuss-Hash genau 64 Zeichen (§5.2)", () => {
    const gut = {
      einsatzId: "E",
      zeitpunkt: "2026-09-10T20:00:00+02:00",
      snapshotHash: "a".repeat(64),
    };
    expect(schemata.EinsatzArchiviert.safeParse(gut).success).toBe(true);
    expect(
      schemata.EinsatzArchiviert.safeParse({ ...gut, snapshotHash: "a".repeat(63) }).success,
    ).toBe(false);
  });

  it("verlangt beim Schichtplan ein Datum ohne Uhrzeit (§5.7)", () => {
    expect(
      schemata.SchichtplanEintragGesetzt.safeParse({ dienstpostenId: "D1", datum: "2026-09-10" })
        .success,
    ).toBe(true);
    expect(
      schemata.SchichtplanEintragGesetzt.safeParse({
        dienstpostenId: "D1",
        datum: "2026-09-10T08:00:00+02:00",
      }).success,
    ).toBe(false);
  });

  it("verlangt beim Zeitpunkt einen Zeitzonenversatz (§5.1)", () => {
    expect(
      schemata.EtbEintragErfasst.safeParse({
        etbId: "T1",
        zeitpunkt: "2026-09-10T09:14:00+02:00",
        text: "Alarm",
      }).success,
    ).toBe(true);
    expect(
      schemata.EtbEintragErfasst.safeParse({
        etbId: "T1",
        zeitpunkt: "2026-09-10T09:14:00",
        text: "Alarm",
      }).success,
    ).toBe(false);
  });
});
