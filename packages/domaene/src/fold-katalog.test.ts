/**
 * Der katalogsgesteuerte Fold — die Regeln aus §2.2, §2.3, §3.7 und §3.10.
 *
 * Jeder Test nennt den Paragraphen, gegen den er misst, und wo das Konzept
 * einen Pruefall vergibt, dessen Nummer.
 */

import { describe, expect, it } from "vitest";

import { falte, type EingehendesEreignis } from "./fold.js";
import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import { hlc, akteur, einheitGemeldet, einsatzAngelegt, abschnittAngelegt, staerke } from "./pruefhilfen/ereignisbau.js";
import type { Hlc } from "./hlc.js";

function bau(
  h: Hlc,
  laufnummer: number,
  typ: string,
  nutzlast: unknown,
  weiteres: Partial<EingehendesEreignis> = {},
): EingehendesEreignis {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    wanduhr: new Date(Date.parse("2026-09-08T08:00:00+02:00") + h.millisekunden).toISOString(),
    typ,
    nutzlast,
    ...weiteres,
  };
}

const einsatz = einsatzAngelegt(hlc(1000, 0, "aa"), 1, {
  einsatzId: "E",
  name: "Hochwasser Sued",
  art: "EINSATZ",
  fuestName: "FueSt Oldenburg",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const abschnittA = abschnittAngelegt(hlc(1001, 0, "aa"), 2, {
  abschnittId: "A",
  name: "Einsatzort 1",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

const einheitU1 = einheitGemeldet(hlc(1002, 0, "aa"), 3, {
  einheitId: "U1",
  abschnittId: "A",
  bezeichnung: "1. Bergungsgruppe",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "IM_EINSATZ",
});

const grundmenge = [einsatz, abschnittA, einheitU1];

describe("Die Anlage belegt genau die Feldpfade ihres Schemas (§2.3)", () => {
  it("legt die vier Kostenparameter als eigene Pfade an, nicht als Block", () => {
    // Waeren sie eine Konstante im Code, haette der Zustand einen Anfangswert
    // ohne Ereignisquelle, und `vorher` der ersten Aenderung passte auf nichts.
    const zustand = falte(grundmenge);
    expect(zustand.einsatz?.kosten.vdaProTag?.wert).toBe(150);
    expect(zustand.einsatz?.kosten.vdaProTag?.durch).toBe("aa:1");

    // Und ein spaeteres `KostenParameterGeaendert` trifft denselben Pfad.
    const geaendert = bau(hlc(2000, 0, "bb"), 1, "KostenParameterGeaendert", {
      einsatzId: "E",
      feld: "vdaProTag",
    }, { vorher: 150, neu: 165 });
    const danach = falte([...grundmenge, geaendert]);
    expect(danach.einsatz?.kosten.vdaProTag?.wert).toBe(165);
    expect(danach.einsatz?.kosten.vdaProTag?.durch).toBe("bb:1");
    expect(danach.hinweise).toEqual([]);
  });

  it("belegt keinen Pfad fuer ein optionales Feld, das in der Nutzlast fehlt", () => {
    // Sonst ueberschriebe eine nachlaufende Anlage ohne Bemerkung eine bereits
    // gesetzte Bemerkung mit „leer".
    const zustand = falte(grundmenge);
    expect(zustand.abschnitte["A"]?.bemerkung).toBeUndefined();
    expect(zustand.einheiten["U1"]?.schicht).toBeUndefined();
  });

  it("legt `logistik` als Block mit einem Pfad je Feld an (§5.4)", () => {
    const gesetzt = bau(hlc(2000, 0, "bb"), 1, "LogistikGesetzt", {
      einheitId: "U1",
      feld: "vegetarisch",
    }, { neu: 3 });
    const zustand = falte([...grundmenge, gesetzt]);
    expect(zustand.einheiten["U1"]?.logistik["vegetarisch"]?.wert).toBe(3);
  });
});

describe("Gueltigkeit: der Fold raet nicht und stuerzt nicht ab (§3.7)", () => {
  it("fuehrt eine unbekannte Art unter `unbekannt` mit dem Grund ART", () => {
    const zustand = falte([...grundmenge, bau(hlc(3000, 0, "bb"), 1, "EinheitGebeamt", {})]);
    expect(zustand.unbekannt).toEqual([
      expect.objectContaining({ id: "bb:1", typ: "EinheitGebeamt", grund: "ART" }),
    ]);
  });

  it("fuehrt eine hoehere Nutzlastversion unter `unbekannt` mit dem Grund VERSION", () => {
    // Es gibt keinen Downcaster (§4.3).
    const zukunft = bau(hlc(3000, 0, "bb"), 1, "StatusGesetzt", { einheitId: "U1" }, {
      neu: "IM_EINSATZ",
      schemaVersion: 2,
    });
    const zustand = falte([...grundmenge, zukunft]);
    expect(zustand.unbekannt[0]?.grund).toBe("VERSION");
  });

  it("fuehrt ein Ereignis der Form (a) ohne `neu` unter `unbekannt` (§2.2)", () => {
    const ohneNeu = bau(hlc(3000, 0, "bb"), 1, "StatusGesetzt", { einheitId: "U1" });
    expect(falte([...grundmenge, ohneNeu]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("fuehrt eine Anlage mit `neu` unter `unbekannt` (§2.2)", () => {
    const mitNeu: EingehendesEreignis = { ...abschnittA, id: "bb:1", neu: "irgendwas" };
    expect(falte([einsatz, mitNeu]).unbekannt[0]?.grund).toBe("SCHEMA");
  });

  it("fuehrt ein Ereignis ohne Pflicht-`grund` unter `unbekannt` (§2.4)", () => {
    const ohneGrund = bau(hlc(3000, 0, "bb"), 1, "EinheitEntfernt", { einheitId: "U1" }, {
      neu: true,
    });
    expect(falte([...grundmenge, ohneGrund]).unbekannt[0]?.grund).toBe("SCHEMA");

    const mitGrund = { ...ohneGrund, grund: "war nie da" };
    const zustand = falte([...grundmenge, mitGrund]);
    expect(zustand.unbekannt).toEqual([]);
    expect(zustand.einheiten["U1"]?.entfernt?.wert).toBe(true);
    expect(zustand.einheiten["U1"]?.zaehlt).toBe(false);
  });

  it("laesst die eine Ausnahme durch: EebMeldungAbgelehnt mit `neu = false` (§2.4, T162)", () => {
    const meldung = bau(hlc(2000, 0, "aa"), 9, "EebMeldungEmpfangen", {
      meldungId: "M1",
      einheitSchluessel: "THW-OL-1",
      stand: "2026-09-08T07:00:00+02:00",
      empfangenAm: "2026-09-08T07:05:00+02:00",
      quelle: "SCAN",
      bogen: { irgendwas: true },
    });
    const ruecknahme = bau(hlc(3000, 0, "bb"), 1, "EebMeldungAbgelehnt", { meldungId: "M1" }, {
      neu: false,
    });
    const zustand = falte([...grundmenge, meldung, ruecknahme]);
    expect(zustand.unbekannt).toEqual([]);
    expect(zustand.meldungen["M1"]?.uebernahmeZustand).toBe("NEU");
  });

  it("meldet einen unbekannten Wert eines offenen Bereichs, faltet ihn aber (§3.7 Punkt 5)", () => {
    const seltsam = einheitGemeldet(hlc(1500, 0, "bb"), 1, {
      einheitId: "U2",
      abschnittId: "A",
      bezeichnung: "Fachgruppe",
      organisation: "WASSERWIRTSCHAFT",
      ebene: "GRUPPE",
      staerke: staerke(0, 1, 5),
      personalErfassung: "NUR_STAERKE",
      status: "WARTET_AUF_BEFEHL",
    });
    const zustand = falte([...grundmenge, seltsam]);
    // Die Einheit ist da, ihre Staerke zaehlt — das ist der Sinn des offenen
    // Bereichs: Eine Einheit aus der Lage zu verlieren, weil ein Statuswert
    // unbekannt ist, waere der weitaus groessere Schaden.
    expect(zustand.einheiten["U2"]?.status.wert).toBe("WARTET_AUF_BEFEHL");
    expect(zustand.einheiten["U2"]?.zaehlt).toBe(true);
    expect(zustand.hinweise).toContainEqual({
      art: "unbekannterWert",
      feldpfad: "einheit/U2/status",
      wert: "WARTET_AUF_BEFEHL",
    });
  });

  it("laesst einen unbekannten Abschnittstyp zaehlen wie EINSATZORT (§3.7)", () => {
    // Der einzige offene Bereich, an dem eine Foldregel haengt: Ein
    // unbekannter Typ zaehlt lieber zu viel als zu wenig.
    const seltsam = abschnittAngelegt(hlc(1500, 0, "bb"), 1, {
      abschnittId: "B",
      name: "Neuer Bereich",
      abschnittstyp: "DROHNENPLATZ",
      reihenfolge: 2,
    });
    const zustand = falte([...grundmenge, seltsam]);
    expect(zustand.abschnitte["B"]?.zaehltInGesamtstaerke).toBe(true);
    expect(zustand.hinweise).toContainEqual({
      art: "unbekannterWert",
      feldpfad: "abschnitt/B/typ",
      wert: "DROHNENPLATZ",
    });
  });
});

describe("Fremdreferenzen (§3.10)", () => {
  it("haelt eine Person mit unbekannter Einheit und meldet den Verweis", () => {
    // Eine Person ohne bekannte Einheit ist eine reale Meldung; sie zu
    // verwerfen waere stilles Verwerfen.
    const person = bau(hlc(2000, 0, "bb"), 1, "PersonHinzugefuegt", {
      personId: "P1",
      einheitId: "GIBT_ES_NICHT",
      nachname: "Meier",
      vorname: "Anke",
      rolle: "MANNSCHAFT",
      funktionen: [],
      fahrerlaubnisse: [],
      geschlecht: "WEIBLICH",
      ernaehrung: "FLEISCH",
      kontakte: [],
      zusatzqualifikationen: [],
    });
    const zustand = falte([...grundmenge, person]);
    expect(zustand.personen["P1"]?.nachname.wert).toBe("Meier");
    expect(zustand.hinweise).toContainEqual({
      art: "fremdreferenzUnbekannt",
      feldpfad: "person/P1/einheitId",
      verweistAuf: "GIBT_ES_NICHT",
    });
  });

  it("laesst den Hinweis ohne Zutun verschwinden, sobald die Einheit eintrifft (§3.8)", () => {
    const person = bau(hlc(2000, 0, "bb"), 1, "PersonHinzugefuegt", {
      personId: "P1",
      einheitId: "U1",
      nachname: "Meier",
      vorname: "Anke",
      rolle: "MANNSCHAFT",
      funktionen: [],
      fahrerlaubnisse: [],
      geschlecht: "WEIBLICH",
      ernaehrung: "FLEISCH",
      kontakte: [],
      zusatzqualifikationen: [],
    });
    expect(falte([...grundmenge, person]).hinweise).toEqual([]);
  });

  it("laesst eine Schichtplanzeile auf ihren Dienstposten warten (§3.10, T179)", () => {
    // Nicht unter `schichtplan/<id>`: `wartend` ist nach Entitaetspfad
    // geschluesselt, und die fehlende Entitaet ist der Dienstposten.
    const zeile = bau(hlc(2000, 0, "bb"), 1, "SchichtplanEintragGesetzt", {
      dienstpostenId: "D1",
      datum: "2026-09-10",
    }, { neu: "Meier" });
    const zustand = falte([...grundmenge, zeile]);
    expect(Object.keys(zustand.wartend)).toEqual(["dienstposten/D1"]);
    expect(zustand.wartend["dienstposten/D1"]?.[0]?.feld).toBe("schichtplan/2026-09-10");
    expect(zustand.hinweise).toContainEqual({
      art: "anlageFehlt",
      feldpfad: "dienstposten/D1",
      wartende: ["bb:1"],
    });
  });
});

describe("Die Zustandsmaschine der Anforderung (§5.6.2, P6)", () => {
  const anlage = bau(hlc(2000, 0, "aa"), 20, "AnforderungAngelegt", {
    anforderungId: "AN1",
    angefordertAm: "2026-09-08T09:00:00+02:00",
  });

  it("beginnt bei OFFEN", () => {
    expect(falte([...grundmenge, anlage]).anforderungen["AN1"]?.zustand).toBe("OFFEN");
  });

  it("geht ueber ZUGESAGT nach EINGETROFFEN, und die Erledigung schlaegt das Storno", () => {
    const zusage = bau(hlc(3000, 0, "bb"), 1, "AbloesungZugesagt", { anforderungId: "AN1" }, {
      neu: { zugesagtFuer: "2026-09-08T12:00:00+02:00", zugesagtVon: "Regionalstelle" },
    });
    expect(falte([...grundmenge, anlage, zusage]).anforderungen["AN1"]?.zustand).toBe("ZUGESAGT");

    const erledigt = bau(hlc(4000, 0, "bb"), 2, "AnforderungErledigt", { anforderungId: "AN1" }, {
      neu: { erledigtAm: "2026-09-08T12:30:00+02:00", abloesendeEinheitId: "U1" },
    });
    const storno = bau(hlc(5000, 0, "cc"), 1, "AnforderungStorniert", { anforderungId: "AN1" }, {
      neu: true,
      grund: "doch nicht noetig",
    });
    // Eingetroffen schlaegt Storno — die Kraefte sind da (§5.6.2).
    expect(
      falte([...grundmenge, anlage, zusage, erledigt, storno]).anforderungen["AN1"]?.zustand,
    ).toBe("EINGETROFFEN");
  });

  it("nimmt die Zusage zurueck, indem das Feld `null` wird (§3.2)", () => {
    const zusage = bau(hlc(3000, 0, "bb"), 1, "AbloesungZugesagt", { anforderungId: "AN1" }, {
      neu: { zugesagtFuer: "2026-09-08T12:00:00+02:00", zugesagtVon: "Regionalstelle" },
    });
    const zurueck = bau(hlc(4000, 0, "bb"), 2, "ZusageZurueckgenommen", { anforderungId: "AN1" }, {
      neu: null,
    });
    const zustand = falte([...grundmenge, anlage, zusage, zurueck]);
    expect(zustand.anforderungen["AN1"]?.zustand).toBe("OFFEN");
    // Das Feld bleibt stehen und traegt `null` — unterscheidbar von „nie
    // gesetzt", und die Serialisierung enthaelt es ausdruecklich.
    expect(zustand.anforderungen["AN1"]?.zusage?.wert).toBeNull();
  });
});

describe("Die reservierten Abschnitts-Ids (§5.3.4)", () => {
  it("verwirft auch ein aenderndes Ereignis auf EINGANG und meldet es (T177)", () => {
    const kaperung = bau(hlc(9000, 0, "bb"), 1, "AbschnittTypGeaendert", {
      abschnittId: "EINGANG",
    }, { neu: "ANGEFORDERT", vorher: "EINSATZORT", grund: "Umbau" });
    const zustand = falte([...grundmenge, kaperung]);

    expect(zustand.abschnitte["EINGANG"]?.typ.wert).toBe("EINGANG");
    expect(zustand.abschnitte["EINGANG"]?.zaehltInGesamtstaerke).toBe(false);
    expect(zustand.hinweise).toContainEqual({
      art: "reservierteIdVerworfen",
      feldpfad: "abschnitt/EINGANG",
      verworfen: "bb:1",
      id: "EINGANG",
    });
    // Die Art steht im Eintrag, nicht im Hinweis (§5.3.4).
    expect(zustand.verworfeneSchluessel).toEqual([
      expect.objectContaining({
        art: "RESERVIERTE_ID",
        schluessel: "EINGANG",
        verworfen: "bb:1",
        ereignisart: "AbschnittTypGeaendert",
        neu: "ANGEFORDERT",
        vorher: "EINSATZORT",
        grund: "Umbau",
      }),
    ]);
  });

  it("schuetzt ARCHIV genauso und haelt seine Zaehlbarkeit bei falsch", () => {
    const kaperung = bau(hlc(9000, 0, "bb"), 1, "AbschnittUmbenannt", {
      abschnittId: "ARCHIV",
    }, { neu: "Sammelraum" });
    const zustand = falte([...grundmenge, kaperung]);
    expect(zustand.abschnitte["ARCHIV"]?.name.wert).toBe("Einsatz beendet");
    expect(zustand.abschnitte["ARCHIV"]?.zaehltInGesamtstaerke).toBe(false);
    expect(zustand.hinweise).toContainEqual(
      expect.objectContaining({ art: "reservierteIdVerworfen", id: "ARCHIV" }),
    );
  });

  it("unterscheidet zwei Kaperungen mit gleichem `neu` an ihrer Ereignisart (T53)", () => {
    // Ohne `ereignisart` waeren die beiden Eintraege bytegleich, und der
    // Bediener saehe zwar, dass etwas verworfen wurde, aber nicht was.
    const umbenannt = bau(hlc(9000, 0, "bb"), 1, "AbschnittUmbenannt", {
      abschnittId: "EINGANG",
    }, { neu: "Sammelraum" });
    const typGeaendert = bau(hlc(9001, 0, "cc"), 1, "AbschnittTypGeaendert", {
      abschnittId: "EINGANG",
    }, { neu: "Sammelraum", grund: "Versuch" });
    const zustand = falte([...grundmenge, umbenannt, typGeaendert]);
    expect(zustand.verworfeneSchluessel).toHaveLength(2);
    expect(zustand.verworfeneSchluessel.map((v) => v.ereignisart).sort()).toEqual([
      "AbschnittTypGeaendert",
      "AbschnittUmbenannt",
    ]);
    expect(zustand.hinweise.filter((h) => h.art === "reservierteIdVerworfen")).toHaveLength(2);
  });
});

describe("Der Einsatz: Beenden ist nicht Archivieren (§5.2)", () => {
  it("leitet `status` aus `ende` ab, und kein Ereignis setzt ihn direkt", () => {
    expect(falte(grundmenge).einsatz?.status).toBe("AKTIV");

    const beendet = bau(hlc(5000, 0, "bb"), 1, "EinsatzBeendet", { einsatzId: "E" }, {
      neu: "2026-09-09T20:00:00+02:00",
    });
    expect(falte([...grundmenge, beendet]).einsatz?.status).toBe("BEENDET");

    // T2: `EinsatzWiedereroeffnet` traegt `neu = null`; das Feld bleibt
    // gesetzt und ist von „nie gesetzt" zu unterscheiden.
    const wieder = bau(hlc(7000, 0, "bb"), 2, "EinsatzWiedereroeffnet", { einsatzId: "E" }, {
      neu: null,
    });
    for (const menge of [
      [...grundmenge, beendet, wieder],
      [...grundmenge, wieder, beendet],
    ]) {
      const zustand = falte(menge);
      expect(zustand.einsatz?.status).toBe("AKTIV");
      expect(zustand.einsatz?.ende?.wert).toBeNull();
      expect(zustand.einsatz?.ende?.hlc.millisekunden).toBe(7000);
    }
  });
});
