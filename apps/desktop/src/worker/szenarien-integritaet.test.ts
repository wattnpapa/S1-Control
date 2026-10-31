/**
 * Funktionalität: Integrität des Schreibwegs (Review Runde 3, Paket „Integrität
 * Backend“).
 *
 * Gemessen wird die echte Strecke Entwurf → Aktendienst → Fold. Die Aussagen:
 * Aufteilen erzeugt kein Personal, nach dem Einsatzende wird nichts mehr
 * angenommen (auch nicht, wenn der Schritt gleichzeitig eintrifft),
 * „Eintreffen zurück“ lässt keine doppelte Einheit zurück, ANWESEND wirkt,
 * Dubletten werden gemeldet, die Funkzeit kommt im Tagebuch an.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import type { Erfassungsbogen } from "@bos/eeb-format";

import { kennzahlen, projektion } from "@s1/domaene";

import {
  aufteilung,
  anforderungAnlegen,
  anforderungErledigt,
  einsatzBeendet,
  meldeStatusGesetzt,
  ruecknahme,
} from "../kontrakt/bedienschritte.js";
import { anlageAusAnforderung } from "../kontrakt/anforderungsschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, EINSATZ_ID, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const VOR_20_MIN = new Date(Date.now() - 20 * 60_000).toISOString();
const VOR_1_H = new Date(Date.now() - 3_600_000).toISOString();

async function einsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

function teilung(staerke: { fuehrer: number; unterfuehrer: number; mannschaft: number }, id = "U2") {
  return aufteilung({
    quelle: { einheitId: "U1", staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 } } as never,
    neueEinheitId: id,
    bezeichnung: "Teil",
    abgeteilteStaerke: staerke,
    abschnittId: "EO",
    reihenfolge: 1,
    organisation: "THW",
    ebene: "GRUPPE",
  });
}

describe("Aufteilen erzeugt kein Personal", () => {
  it("lehnt einen Abzug über dem Bestand mit Klartext ab und schreibt nichts", async () => {
    const platz = await einsatz();
    const vorher = platz.dienst.zustand;
    const ergebnis = await platz.dienst.bediene(teilung({ fuehrer: 5, unterfuehrer: 5, mannschaft: 50 }));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: "AUFTEILUNG" });
    expect(ergebnis.art === "abgewiesen" ? ergebnis.meldung : "").toContain("Es sind nur 0/1/8");
    expect(platz.dienst.zustand).toBe(vorher);
  });

  it("lässt den Abzug im Bestand zu und rechnet auf den Rest herunter", async () => {
    const platz = await einsatz();
    expect((await platz.dienst.bediene(teilung({ fuehrer: 0, unterfuehrer: 1, mannschaft: 3 }))).art).toBe("geschrieben");
    expect(platz.dienst.zustand.einheiten["U1"]?.wirksameStaerke).toEqual({ fuehrer: 0, unterfuehrer: 0, mannschaft: 5 });
    // Der Rest ist der Bestand: Eine zweite Teilung darf nicht mehr nehmen.
    const zuviel = await platz.dienst.bediene(teilung({ fuehrer: 0, unterfuehrer: 0, mannschaft: 6 }, "U3"));
    expect(zuviel.art).toBe("abgewiesen");
  });
});

describe("Nach dem Einsatzende nimmt der Worker nichts mehr an", () => {
  it("weist eine Einheitenanlage ab, die gleichzeitig mit dem Beenden eintrifft", async () => {
    const platz = await einsatz();
    const anlage = {
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: "RACE", abschnittId: "EO", bezeichnung: "RACE-B", organisation: "THW", hierarchie: [],
        ebene: "GRUPPE", staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 3 }, personalErfassung: "NUR_STAERKE",
        status: "EINSATZBEREIT", reihenfolge: 3, istFuehrungDesAbschnitts: false,
      },
    };
    // Beide Rufe werden abgeschickt, bevor einer fertig ist — wie zwei
    // Nachrichten, die kurz hintereinander im Worker ankommen.
    const [ende, spaet] = await Promise.all([
      platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, VOR_1_H, "Lage bereinigt")),
      platz.dienst.bediene(anlage),
    ]);
    expect(ende.art).toBe("geschrieben");
    expect(spaet).toMatchObject({ art: "abgewiesen", code: "EINSATZ_ABGESCHLOSSEN" });
    expect(platz.dienst.zustand.einheiten["RACE"]).toBeUndefined();
  });
});

async function eintreffenMitEinheit(platz: Platz, einheitId: string): Promise<void> {
  await platz.dienst.bediene(
    anforderungAnlegen({ anforderungId: "A1", kennung: "ANF-1", angefordertAm: VOR_1_H, vorgeseheneEinheitText: "Bergung Zug" }),
  );
  const anlage = anlageAusAnforderung({
    einheitId, abschnittId: "EO", bezeichnung: "Bergung Zug", organisation: "THW", ebene: "ZUG",
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 }, reihenfolge: 4,
  });
  expect((await platz.dienst.bediene(anlage)).art).toBe("geschrieben");
  expect((await platz.dienst.bediene(anforderungErledigt("A1", VOR_20_MIN, einheitId))).art).toBe("geschrieben");
}

function istStaerke(platz: Platz): number {
  const s = kennzahlen.zaehlstand(platz.dienst.zustand).ist;
  return s.fuehrer + s.unterfuehrer + s.mannschaft;
}

describe("Eintreffen zurück und erneut eintreffen", () => {
  it("nimmt die beim Eintreffen angelegte Einheit zurück — die Ist-Stärke verdoppelt sich nicht", async () => {
    const platz = await einsatz();
    const vorher = istStaerke(platz);
    await eintreffenMitEinheit(platz, "N1");
    expect(istStaerke(platz)).toBe(vorher + 6);

    const zurueck = await platz.dienst.bediene(ruecknahme("A1", "erledigung"));
    expect(zurueck).toMatchObject({ art: "geschrieben" });
    expect(zurueck.art === "geschrieben" ? zurueck.warnungen?.join(" ") : "").toContain("wurde mit entfernt");
    expect(istStaerke(platz)).toBe(vorher);

    await eintreffenMitEinheit2(platz, "N2");
    expect(istStaerke(platz)).toBe(vorher + 6);
  });

  it("lässt eine inzwischen im Einsatz geführte Einheit stehen und sagt, wie es weitergeht", async () => {
    const platz = await einsatz();
    await eintreffenMitEinheit(platz, "N1");
    await platz.dienst.bediene({ typ: "StatusGesetzt", nutzlast: { einheitId: "N1" }, vorher: "EINSATZBEREIT", neu: "IM_EINSATZ" });

    const zurueck = await platz.dienst.bediene(ruecknahme("A1", "erledigung"));
    expect(zurueck.art === "geschrieben" ? zurueck.warnungen?.join(" ") : "").toContain("Bestehende Einheit verknüpfen");
    expect(platz.dienst.zustand.einheiten["N1"]?.entfernt?.wert).not.toBe(true);
  });
});

async function eintreffenMitEinheit2(platz: Platz, einheitId: string): Promise<void> {
  const anlage = anlageAusAnforderung({
    einheitId, abschnittId: "EO", bezeichnung: "Bergung Zug", organisation: "THW", ebene: "ZUG",
    staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 }, reihenfolge: 4,
  });
  await platz.dienst.bediene(anlage);
  await platz.dienst.bediene(anforderungErledigt("A1", VOR_20_MIN, einheitId));
}

describe("Dubletten werden gemeldet, nicht abgelehnt", () => {
  it("warnt bei gleicher Anforderungskennung, nicht bei einer anderen", async () => {
    const platz = await einsatz();
    const a = await platz.dienst.bediene(anforderungAnlegen({ anforderungId: "A1", kennung: "A-001", angefordertAm: VOR_1_H, vorgeseheneEinheitText: "X" }));
    expect(a.art === "geschrieben" ? a.warnungen : undefined).toBeUndefined();
    const b = await platz.dienst.bediene(anforderungAnlegen({ anforderungId: "A2", kennung: " a-001 ", angefordertAm: VOR_1_H, vorgeseheneEinheitText: "Y" }));
    expect(b).toMatchObject({ art: "geschrieben" });
    expect(b.art === "geschrieben" ? b.warnungen?.[0] : "").toContain("gibt es schon");
    const c = await platz.dienst.bediene(anforderungAnlegen({ anforderungId: "A3", kennung: "A-002", angefordertAm: VOR_1_H, vorgeseheneEinheitText: "Z" }));
    expect(c.art === "geschrieben" ? c.warnungen : undefined).toBeUndefined();
  });

  it("warnt bei gleichem Abschnittsnamen im selben Elternabschnitt und bei gleichem Einheitennamen im Abschnitt", async () => {
    const platz = await einsatz();
    const abschnitt = await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "EO2", name: "Deich Nord", typ: "EINSATZORT", reihenfolge: 2 },
    });
    expect(abschnitt.art === "geschrieben" ? abschnitt.warnungen?.[0] : "").toContain("Abschnitt");
    const einheit = await platz.dienst.bediene({
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: "U9", abschnittId: "EO", bezeichnung: "bergungsgruppe oldenburg", organisation: "THW", hierarchie: [],
        ebene: "GRUPPE", staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 3 }, personalErfassung: "NUR_STAERKE",
        status: "EINSATZBEREIT", reihenfolge: 3, istFuehrungDesAbschnitts: false,
      },
    });
    expect(einheit.art === "geschrieben" ? einheit.warnungen?.[0] : "").toContain("schon eine Einheit");
  });
});

describe("Fachliche Zeit (ereignisZeit)", () => {
  it("steht im Tagebuch als fachliche Zeit, eine Funkzeit in der Zukunft wird abgewiesen", async () => {
    const platz = await einsatz();
    const funk = new Date(Date.now() - 10 * 60_000).toISOString();
    const ok = await platz.dienst.bediene({
      typ: "StatusGesetzt", nutzlast: { einheitId: "U1", ereignisZeit: funk }, vorher: "IM_EINSATZ", neu: "RUHE",
    });
    expect(ok.art).toBe("geschrieben");
    const zeilen = platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "x" }).zeilen;
    expect(zeilen.some((z) => z.satz.includes("Fachliche Zeit") && z.zeitpunkt === funk)).toBe(true);

    const zukunft = new Date(Date.now() + 3_600_000).toISOString();
    const spaet = await platz.dienst.bediene({
      typ: "StatusGesetzt", nutzlast: { einheitId: "U1", ereignisZeit: zukunft }, vorher: "RUHE", neu: "IM_EINSATZ",
    });
    expect(spaet).toMatchObject({ art: "abgewiesen" });
  });
});

describe("Ablösung eingetroffen: die abgelöste Einheit zählt noch", () => {
  it("liefert abloesungOffen im Ergebnis und im Lagebild, ohne den Status zu ändern", async () => {
    const platz = await einsatz();
    await platz.dienst.bediene(
      anforderungAnlegen({ anforderungId: "A1", kennung: "ANF-1", angefordertAm: VOR_1_H, abzuloesendeEinheitId: "U1" }),
    );
    await platz.dienst.bediene(anlageAusAnforderung({
      einheitId: "N1", abschnittId: "EO", bezeichnung: "Ablösung Zug", organisation: "THW", ebene: "ZUG",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 }, reihenfolge: 4,
    }));
    const ergebnis = await platz.dienst.bediene(anforderungErledigt("A1", VOR_20_MIN, "N1"));
    expect(ergebnis.art === "geschrieben" ? ergebnis.abloesungOffen : undefined).toMatchObject({
      abgeloesteEinheitId: "U1",
      abloesendeEinheitId: "N1",
    });
    expect(platz.dienst.zustand.einheiten["U1"]?.status.wert).toBe("IM_EINSATZ");
    expect(projektion.offeneAbloesungen(platz.dienst.zustand)).toHaveLength(1);
  });
});

const PRUEFDATEN = path.resolve(import.meta.dirname, "..", "..", "..", "..", "pruefdaten", "eeb");

function ersteBoegen(): Erfassungsbogen[] {
  const dateien: string[] = [];
  const geh = (ordner: string): void => {
    for (const e of readdirSync(ordner)) {
      const voll = path.join(ordner, e);
      if (statSync(voll).isDirectory()) geh(voll);
      else if (e.endsWith(".json")) dateien.push(voll);
    }
  };
  geh(PRUEFDATEN);
  return dateien.sort().slice(0, 2).map((d) => JSON.parse(readFileSync(d, "utf8")) as Erfassungsbogen);
}

describe("Eingangskorb", () => {
  it("setzt die Einheit bei ANWESEND einsatzbereit (sie zählt dann zur Ist-Stärke)", async () => {
    const platz = await einsatz();
    const text = JSON.stringify([{ id: "s", name: "B", art: 0, angelegt: 1, geaendert: 1,
      eintraege: ersteBoegen().map((bogen, i) => ({ id: `e${String(i)}`, einheitSchluessel: "", empfangenAm: 1 + i, quelle: "scan", status: 0, bogen })) }]);
    await platz.dienst.buendelEinlesen(text, "EO");
    const meldungId = Object.keys(platz.dienst.zustand.meldungen)[0] as string;
    const vorher = istStaerke(platz);

    const ergebnis = await platz.dienst.bediene(meldeStatusGesetzt(meldungId, null, "ANWESEND"));
    expect(ergebnis.art).toBe("geschrieben");
    const einheiten = Object.values(platz.dienst.zustand.einheiten).filter((e) => e.id !== "U1");
    expect(einheiten.some((e) => e.status.wert === "EINSATZBEREIT")).toBe(true);
    expect(istStaerke(platz)).toBeGreaterThan(vorher);
  });

  it("nennt bei einer kaputten oder falschen Datei die Ursache", async () => {
    const platz = await einsatz();
    const kaputt = await platz.dienst.buendelEinlesen("{ das ist kein json", "EO");
    expect(kaputt.aufgenommen).toBe(0);
    expect(kaputt.abgelehnt?.[0]?.grund).toContain("nicht lesbar");
    const falsch = await platz.dienst.buendelEinlesen(JSON.stringify({ irgendwas: 1 }), "EO");
    expect(falsch.abgelehnt?.[0]?.grund).toContain("keine Meldungen im Bündelformat");
    const leer = await platz.dienst.buendelEinlesen("  ", "EO");
    expect(leer.abgelehnt?.[0]?.grund).toContain("leer");
  });
});
