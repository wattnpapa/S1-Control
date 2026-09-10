/**
 * Funktionalität: Erfassungsbogen per Handscanner (M3.4).
 *
 * Die DoD lautet: „mehrteiliger realer Bogen wird vollständig übernommen".
 * Genau das steht hier — und zwar mit **echten** Bögen aus `pruefdaten/eeb`,
 * denselben 443, gegen die schon der Adapter aus M1.5 läuft. Ein erfundener
 * Bogen prüfte nur, dass diese Datei zu sich selbst passt.
 *
 * Der Weg ist der volle: Bogen → Payload → Segmente → Scan für Scan in den
 * Aktendienst → Signaturprüfung → Übernahme → Fold → Tabelle. Nichts daran ist
 * gestellt außer dem Handscanner selbst, und der ist für den Rechner ohnehin
 * nur eine Tastatur.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import {
  encodePayload,
  encodePayloadUrl,
  segmentPayloadUrls,
  type Erfassungsbogen,
  type Kompressor,
} from "@bos/eeb-format";
import { afterEach, describe, expect, it } from "vitest";

import { kennzahlen, projektion } from "@s1/domaene";

import {
  ablehnungZurueckgenommen,
  meldungAbgelehnt,
  uebernahmeZurueckgenommen,
} from "../kontrakt/bedienschritte.js";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const KOMPRESSOR: Kompressor = {
  deflateRaw: (daten) => new Uint8Array(deflateRawSync(daten)),
  inflateRaw: (daten) => new Uint8Array(inflateRawSync(daten)),
};

const WURZEL = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const PRUEFDATEN = path.join(WURZEL, "pruefdaten", "eeb");

function dateien(verzeichnis: string): string[] {
  const gefunden: string[] = [];
  for (const eintrag of readdirSync(verzeichnis)) {
    const voll = path.join(verzeichnis, eintrag);
    if (statSync(voll).isDirectory()) gefunden.push(...dateien(voll));
    else if (eintrag.endsWith(".json")) gefunden.push(voll);
  }
  return gefunden.sort();
}

const ALLE = dateien(PRUEFDATEN);

function liesDatei(datei: string): Erfassungsbogen {
  return JSON.parse(readFileSync(datei, "utf8")) as Erfassungsbogen;
}

/** Der größte Bogen der Prüfdaten — der, der am ehesten mehrteilig ist. */
function groessterBogen(): { readonly datei: string; readonly bogen: Erfassungsbogen } {
  let bester = { datei: ALLE[0] as string, bogen: liesDatei(ALLE[0] as string), groesse: 0 };
  for (const datei of ALLE) {
    const bogen = liesDatei(datei);
    const groesse = encodePayload(bogen, KOMPRESSOR).length;
    if (groesse > bester.groesse) bester = { datei, bogen, groesse };
  }
  return bester;
}

async function scanne(platz: Platz, texte: readonly string[]) {
  let stand = await platz.dienst.eebScan(texte[0] as string);
  for (const text of texte.slice(1)) stand = await platz.dienst.eebScan(text);
  return stand;
}

describe("Funktionalität: Erfassungsbogen per Handscanner", () => {
  it("Szenario: ein einteiliger Bogen wird gelesen und angezeigt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);

    const stand = await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
    expect(stand.art).toBe("vollstaendig");
    expect(stand.anzahl).toBe(1);
    expect(stand.vorschau?.bezeichnung.length).toBeGreaterThan(0);
    // §5.8.1: Ein unsignierter Bogen wird aufgenommen und **angezeigt**, nicht
    // verworfen. Der Signaturbefund entscheidet nichts.
    expect(stand.vorschau?.signatur).toBe("unsigniert");
  });

  it("Szenario: ein mehrteiliger Bogen wird Teil für Teil gesammelt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { bogen } = groessterBogen();
    const teile = segmentPayloadUrls(encodePayload(bogen, KOMPRESSOR), 3);

    const erster = await platz.dienst.eebScan(teile[0] as string);
    expect(erster.art).toBe("gesammelt");
    expect(erster.haben).toBe(1);
    expect(erster.anzahl).toBe(3);

    const zweiter = await platz.dienst.eebScan(teile[1] as string);
    expect(zweiter.haben).toBe(2);
    expect(zweiter.art).toBe("gesammelt");

    const dritter = await platz.dienst.eebScan(teile[2] as string);
    expect(dritter.art).toBe("vollstaendig");
    expect(dritter.vorschau?.bezeichnung.length).toBeGreaterThan(0);
  });

  it("Szenario: ein zweimal gescannter Teil ist ein Duplikat und keine Störung", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { bogen } = groessterBogen();
    const teile = segmentPayloadUrls(encodePayload(bogen, KOMPRESSOR), 3);

    await platz.dienst.eebScan(teile[0] as string);
    const nochmal = await platz.dienst.eebScan(teile[0] as string);
    // Ein Handscanner löst gern zweimal aus. Ein Duplikat darf den Stapel
    // weder zurücksetzen noch als Fortschritt zählen.
    expect(nochmal.art).toBe("duplikat");
    expect(nochmal.haben).toBe(1);
  });

  it("Szenario: der Teil eines anderen Bogens beginnt die Sammlung neu", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const eins = segmentPayloadUrls(encodePayload(liesDatei(ALLE[0] as string), KOMPRESSOR), 2);
    const zwei = segmentPayloadUrls(encodePayload(groessterBogen().bogen, KOMPRESSOR), 3);

    await platz.dienst.eebScan(eins[0] as string);
    const fremd = await platz.dienst.eebScan(zwei[0] as string);
    // Wer mitten im Stapel einen anderen Bogen scannt, meint den anderen.
    expect(fremd.art).toBe("fremd");
    expect(fremd.haben).toBe(1);
    expect(fremd.anzahl).toBe(3);
  });

  it("Szenario: unlesbarer Text wird gemeldet und verwirft den Stapel nicht", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const teile = segmentPayloadUrls(encodePayload(groessterBogen().bogen, KOMPRESSOR), 3);
    await platz.dienst.eebScan(teile[0] as string);

    const daneben = await platz.dienst.eebScan("4260123456789");
    expect(daneben.art).toBe("unlesbar");
    expect(daneben.meldung).toContain("Erfassungsbogen");
    // Der halbe Stapel steht noch: Ein Strichcode auf dem Tisch darf zehn
    // Minuten Scanarbeit nicht wegwerfen.
    expect(daneben.haben).toBe(1);
  });

  it("Szenario: der mehrteilige Bogen wird vollständig in einen Abschnitt übernommen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const { bogen } = groessterBogen();
    const teile = segmentPayloadUrls(encodePayload(bogen, KOMPRESSOR), 3);
    const stand = await scanne(platz, teile);
    expect(stand.art).toBe("vollstaendig");

    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    expect(ergebnis.art).toBe("uebernommen");
    if (ergebnis.art !== "uebernommen") return;

    // §5.8.2: Die übernommenen Werte stehen als eigenständige Ereignisse in
    // der Akte — Meldung, Einheit, je Person eine, je Fahrzeug eine, der
    // Vermerk der Übernahme.
    expect(ergebnis.ereignisse).toBeGreaterThanOrEqual(3);

    const zustand = platz.dienst.zustand;
    const einheit = zustand.einheiten[ergebnis.einheitId];
    expect(einheit).toBeDefined();
    expect(einheit?.wirksamerAbschnittId).toBe("EO");

    // Personen und Fahrzeuge des Bogens hängen an der Einheit.
    const unter = platz.dienst.untertabelle({
      art: "untertabelleAnfordern",
      akteId: "akte-1",
      einheitId: ergebnis.einheitId,
    });
    expect(unter.personen).toHaveLength(bogen.personal.length);
    expect(unter.fahrzeuge).toHaveLength(bogen.fahrzeuge.length);

    // Die Meldung selbst steht als Tatsache in der Akte (§5.8.1) und ist als
    // übernommen vermerkt.
    const meldungen = Object.values(zustand.meldungen);
    expect(meldungen).toHaveLength(1);
    expect(meldungen[0]?.uebernahmeZustand).toBe("UEBERNOMMEN");
  });

  it("Szenario: derselbe Bogen zweimal gescannt ergibt eine Meldung und keine Dublette", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    const text = encodePayloadUrl(bogen, KOMPRESSOR);

    await platz.dienst.eebScan(text);
    const erste = await platz.dienst.eebUebernehmen("EO");
    await platz.dienst.eebScan(text);
    const zweite = await platz.dienst.eebUebernehmen("EO");

    expect(erste.art).toBe("uebernommen");
    expect(zweite.art).toBe("uebernommen");
    // §5.8.1: Die `meldungId` ist der Inhalts-Hash des Bogens — zwei
    // Meldeköpfe, die denselben QR scannen, erzeugen **eine** Meldung. §3.11
    // macht aus der zweiten Anlage eine verworfene, nicht eine zweite Einheit.
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(1);
    expect(platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1" }).gesamtzahl).toBe(2);
  });

  it("Szenario: „Von vorn“ verwirft den Stapel", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const teile = segmentPayloadUrls(encodePayload(groessterBogen().bogen, KOMPRESSOR), 3);
    await platz.dienst.eebScan(teile[0] as string);

    const leer = platz.dienst.eebZuruecksetzen();
    expect(leer.art).toBe("leer");
    expect(leer.haben).toBe(0);
    const uebernahme = await platz.dienst.eebUebernehmen("EO");
    expect(uebernahme.art).toBe("nichtMoeglich");
  });
});

/**
 * Die Revisionsreihe — M6.0.
 *
 * §5.8.1 baut den Meldeweg auf zwei verschiedenen Identitäten auf, und der
 * Unterschied ist der ganze Punkt: Die **`meldungId`** ist der Bogen, der
 * **`einheitSchluessel`** ist die Einheit. Meldet dieselbe Gruppe am nächsten
 * Tag neu, ändert sich der Bogen und damit die `meldungId` — der
 * Fingerabdruck bleibt, und daran erkennt der Fold die zweite Fassung als
 * Revision derselben Reihe.
 *
 * Ohne diese Trennung wäre jede Meldung ihre eigene Reihe: `GEAENDERT` könnte
 * nie entstehen, K26 lieferte je Meldung einen Revisionskopf statt je
 * Einheit, und die Führungsstelle sähe dieselbe Gruppe nach drei Tagen
 * dreimal im Lagebild.
 */
describe("Funktionalität: Revisionen einer Einheit", () => {
  /**
   * Derselbe Bogen mit späterem Stand und anderer Stärke — die Tagesmeldung.
   *
   * `staerkeManuell` und nicht `staerke`: Der Bogen rechnet seine Stärke aus
   * dem Personal, solange keine manuelle Angabe vorliegt
   * (`@bos/eeb-format`, `staerke()`). Eine Einheit, die nur ihre Stärke
   * meldet, setzt genau dieses Feld.
   */
  function zweiteFassung(bogen: Erfassungsbogen): Erfassungsbogen {
    return {
      ...bogen,
      stand: bogen.stand + 24 * 60,
      staerkeManuell: { fuehrer: 1, unterfuehrer: 1, mannschaft: 4, gesamt: 6 },
    } as Erfassungsbogen;
  }

  async function uebernimm(platz: Platz, bogen: Erfassungsbogen): Promise<string> {
    await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    if (ergebnis.art !== "uebernommen") throw new Error(JSON.stringify(ergebnis));
    return ergebnis.einheitId;
  }

  it("Szenario: die zweite Fassung derselben Einheit ist eine Revision und keine zweite Einheit", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);

    const erste = await uebernimm(platz, bogen);
    const zweite = await uebernimm(platz, zweiteFassung(bogen));

    // Dieselbe Einheit — die Kennung folgt dem Fingerabdruck, nicht dem Bogen.
    expect(zweite).toBe(erste);
    const zustand = platz.dienst.zustand;
    expect(Object.keys(zustand.meldungen)).toHaveLength(2);
    // Und **eine** Einheit im Lagebild, nicht zwei.
    const eigene = Object.values(zustand.einheiten).filter((e) => e.id === erste);
    expect(eigene).toHaveLength(1);
  });

  it("Szenario: beide Fassungen stehen in derselben Revisionsreihe", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    await uebernimm(platz, zweiteFassung(bogen));

    const schluessel = new Set(
      Object.values(platz.dienst.zustand.meldungen).map((m) => String(m.einheitSchluessel?.wert)),
    );
    expect(schluessel.size).toBe(1);

    // K26 liefert **einen** Revisionskopf je Reihe, und es ist die Fassung mit
    // dem jüngeren `stand` — nicht die mit der höheren HLC (§2.6).
    const koepfe = kennzahlen.revisionskoepfe(platz.dienst.zustand);
    expect(koepfe).toHaveLength(1);
    const staende = Object.values(platz.dienst.zustand.meldungen).map((m) => String(m.stand.wert));
    expect(String(koepfe[0]?.stand.wert)).toBe(staende.sort()[1]);
  });

  it("Szenario: die Revision schreibt Feldereignisse und keine zweite Anlage (§5.8.2)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    const einheitId = await uebernimm(platz, bogen);
    await uebernimm(platz, zweiteFassung(bogen));

    const einheit = platz.dienst.zustand.einheiten[einheitId];
    // Die geänderte Stärke steht in der Einheit — eine zweite Anlage hätte
    // nach §3.11 nichts geändert und einen Hinweis erzeugt.
    expect(einheit?.staerke.wert).toEqual({ fuehrer: 1, unterfuehrer: 1, mannschaft: 4 });
    expect(einheit?.verworfeneAnlagen).toHaveLength(0);
    expect(platz.dienst.zustand.hinweise.map((h) => h.art)).not.toContain("zweiteAnlageVerworfen");
  });

  it("Szenario: eine Revision ohne Änderung schreibt kein Feldereignis", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);

    // Nur der Stand wandert, sonst nichts. Der Bogen ist damit ein anderer
    // (andere `meldungId`), die Einheit aber unverändert.
    const vorher = platz.dienst.zustand.einheiten;
    await uebernimm(platz, { ...bogen, stand: bogen.stand + 60 } as Erfassungsbogen);

    // Ein Ereignis ohne Änderung wäre eine Zeile im Tagebuch, die nichts
    // sagt — und ein `vorher`, das gleich `neu` ist, könnte nie einen
    // Konflikt anzeigen (§2.2a).
    const nachher = platz.dienst.zustand.einheiten;
    expect(Object.keys(nachher)).toEqual(Object.keys(vorher));
    const meldungen = Object.values(platz.dienst.zustand.meldungen);
    expect(meldungen).toHaveLength(2);
    const vermerk = meldungen
      .map((m) => m.uebernahme?.wert as { uebernommeneFelder?: readonly string[] } | undefined)
      .find((u) => u !== undefined && (u.uebernommeneFelder?.length ?? 0) === 0);
    expect(vermerk).toBeDefined();
  });

  it("Szenario: zwei verschiedene Einheiten teilen keine Reihe", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const erster = liesDatei(ALLE[0] as string);
    // Ein Bogen einer anderen Einheit: Der Fingerabdruck läuft über
    // Organisation, Einheitstyp und Herkunft (`@bos/meldekopf`), also muss ein
    // Bogen her, der sich darin unterscheidet.
    const anderer = ALLE.map(liesDatei).find(
      (b) =>
        b.einheit.organisation !== erster.einheit.organisation ||
        b.einheit.hierarchie[0]?.name !== erster.einheit.hierarchie[0]?.name,
    );
    expect(anderer, "Die Prüfdaten müssen zwei verschiedene Einheiten enthalten").toBeDefined();

    const eins = await uebernimm(platz, erster);
    const zwei = await uebernimm(platz, anderer as Erfassungsbogen);
    expect(zwei).not.toBe(eins);
    expect(kennzahlen.revisionskoepfe(platz.dienst.zustand)).toHaveLength(2);
  });
});

/**
 * Der Eingangskorb mit Quittierung — M6.1.
 *
 * Die Excel führt diesen Weg von Hand: gelb heißt „liegt an", grün heißt
 * „übernommen", eine Änderung setzt wieder gelb (Hinweise C159–C172,
 * EXH F-E1). Hier ist die Ampel der abgeleitete `uebernahmeZustand` aus
 * §5.8.1 und kann deshalb nicht vergessen werden.
 */
describe("Funktionalität: Eingangskorb mit Quittierung", () => {
  async function scanneNur(platz: Platz, bogen: Erfassungsbogen): Promise<void> {
    await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
  }

  async function uebernimm(platz: Platz, bogen: Erfassungsbogen): Promise<void> {
    await scanneNur(platz, bogen);
    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    if (ergebnis.art !== "uebernommen") throw new Error(JSON.stringify(ergebnis));
  }

  it("Szenario: eine übernommene Meldung steht auf grün", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await uebernimm(platz, liesDatei(ALLE[0] as string));

    const korb = projektion.eingangskorb(platz.dienst.zustand);
    expect(korb.zeilen).toHaveLength(1);
    expect(korb.zeilen[0]?.zustand).toBe("UEBERNOMMEN");
    expect(korb.offen).toBe(0);
  });

  it("Szenario: eine jüngere Fassung setzt die übernommene wieder auf gelb", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    // Nur scannen, nicht übernehmen: Die zweite Fassung liegt an.
    await scanneNur(platz, { ...bogen, stand: bogen.stand + 24 * 60 } as Erfassungsbogen);
    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    expect(ergebnis.art).toBe("uebernommen");

    // §5.8.1: `GEAENDERT` heißt „übernommen, aber es liegt eine jüngere
    // Fassung derselben Reihe vor". Die ältere trägt es, die jüngere nicht.
    const korb = projektion.eingangskorb(platz.dienst.zustand);
    const zustaende = korb.zeilen.map((z) => z.zustand).sort();
    expect(zustaende).toEqual(["GEAENDERT", "UEBERNOMMEN"]);
  });

  it("Szenario: eine abgelehnte Meldung bleibt sichtbar", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    const meldungId = Object.keys(platz.dienst.zustand.meldungen)[0] as string;

    await platz.dienst.bediene(meldungAbgelehnt(meldungId, "Doppelt gemeldet, Bogen von gestern"));

    // §5.8.1: Der Empfang ist eine Tatsache, Löschen ist verboten. Wer eine
    // Meldung nicht will, lehnt sie ab — sie bleibt im Korb.
    const korb = projektion.eingangskorb(platz.dienst.zustand);
    expect(korb.zeilen).toHaveLength(1);
    expect(korb.zeilen[0]?.zustand).toBe("ABGELEHNT");
    expect(platz.dienst.zustand.meldungen[meldungId]).toBeDefined();
  });

  it("Szenario: die Ablehnung wird zurückgenommen und braucht dafür keinen Grund", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await uebernimm(platz, liesDatei(ALLE[0] as string));
    const meldungId = Object.keys(platz.dienst.zustand.meldungen)[0] as string;
    await platz.dienst.bediene(meldungAbgelehnt(meldungId, "Irrtum"));

    // §5.8.1: dieselbe Art mit `neu = false`, und dann ohne Pflicht-`grund`.
    // Der Grund gehört zur Ablehnung, nicht zu ihrer Rücknahme.
    const ergebnis = await platz.dienst.bediene(ablehnungZurueckgenommen(meldungId));
    expect(ergebnis.art).toBe("geschrieben");
    expect(projektion.eingangskorb(platz.dienst.zustand).zeilen[0]?.zustand).toBe("UEBERNOMMEN");
  });

  it("Szenario: eine Ablehnung ohne Grund wird abgewiesen (§2.4)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await uebernimm(platz, liesDatei(ALLE[0] as string));
    const meldungId = Object.keys(platz.dienst.zustand.meldungen)[0] as string;

    const ergebnis = await platz.dienst.bediene({
      typ: "EebMeldungAbgelehnt",
      nutzlast: { meldungId },
      vorher: false,
      neu: true,
    });
    expect(ergebnis.art).toBe("abgewiesen");
  });

  it("Szenario: die Rücknahme der Übernahme stellt die Meldung zurück in den Korb", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await uebernimm(platz, liesDatei(ALLE[0] as string));
    const meldungId = Object.keys(platz.dienst.zustand.meldungen)[0] as string;

    await platz.dienst.bediene(uebernahmeZurueckgenommen(meldungId));

    const korb = projektion.eingangskorb(platz.dienst.zustand);
    expect(korb.zeilen[0]?.zustand).toBe("NEU");
    expect(korb.offen).toBe(1);
    // Die Einheit bleibt: Die Feldereignisse der Übernahme sind
    // eigenständige Ereignisse (§5.8.2), und was einmal in der Lage stand,
    // verschwindet nicht dadurch, dass man den Vermerk zurücknimmt.
    expect(Object.keys(platz.dienst.zustand.einheiten).length).toBeGreaterThan(1);
  });

  it("Szenario: der Korb zeigt auf Wunsch nur die jüngste Fassung je Reihe (K26)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    await uebernimm(platz, { ...bogen, stand: bogen.stand + 24 * 60 } as Erfassungsbogen);

    expect(projektion.eingangskorb(platz.dienst.zustand).zeilen).toHaveLength(2);
    const koepfe = projektion.eingangskorb(platz.dienst.zustand, { nurKoepfe: true });
    expect(koepfe.zeilen).toHaveLength(1);
    expect(koepfe.zeilen[0]?.kopf).toBe(true);
  });

  it("Szenario: die Revisionen einer Reihe stehen nach Stand und nicht nach Empfang", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    // Erst die **jüngere** Fassung übernehmen, dann die ältere nachscannen —
    // der Fall des nachgescannten Papierbogens von gestern (§2.6).
    await uebernimm(platz, { ...bogen, stand: bogen.stand + 24 * 60 } as Erfassungsbogen);
    await uebernimm(platz, bogen);

    const schluessel = Object.values(platz.dienst.zustand.meldungen)[0]?.einheitSchluessel?.wert;
    const reihe = projektion.revisionen(platz.dienst.zustand, String(schluessel));
    expect(reihe).toHaveLength(2);
    // Älteste zuerst — nach `stand`, obwohl sie später empfangen wurde.
    expect(reihe[0]?.stand.localeCompare(reihe[1]?.stand ?? "")).toBeLessThan(0);
    expect(reihe[0]?.empfangenAm.localeCompare(reihe[1]?.empfangenAm ?? "")).toBeGreaterThanOrEqual(0);
    // Und der Kopf ist die jüngere, nicht die zuletzt empfangene.
    expect(reihe[1]?.kopf).toBe(true);
  });
});

/**
 * Der Vergleich zweier Fassungen — M6.2.
 *
 * „Die Historie zeigt Stände, der Diff zeigt Bewegung" — der Satz steht im
 * Modulkopf von `@bos/meldekopf`, und er ist der Grund für diesen Weg: Vor
 * einer Übernahme will die Führungsstelle nicht die ganze Fassung lesen,
 * sondern wissen, was anders ist.
 */
describe("Funktionalität: Änderungen zwischen zwei Fassungen", () => {
  async function uebernimm(platz: Platz, bogen: Erfassungsbogen): Promise<void> {
    await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    if (ergebnis.art !== "uebernommen") throw new Error(JSON.stringify(ergebnis));
  }

  it("Szenario: eine geänderte Stärke steht als Bewegung da", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    await uebernimm(platz, {
      ...bogen,
      stand: bogen.stand + 24 * 60,
      staerkeManuell: { fuehrer: 1, unterfuehrer: 1, mannschaft: 4, gesamt: 6 },
    } as Erfassungsbogen);

    const schluessel = String(
      Object.values(platz.dienst.zustand.meldungen)[0]?.einheitSchluessel?.wert,
    );
    const vergleich = projektion.letzteAenderung(platz.dienst.zustand, schluessel);
    expect(vergleich).toBeDefined();
    expect(vergleich?.diff.anzahl).toBeGreaterThan(0);
    // Die Texte kommen fertig aus dem geteilten Kern — hier wird nichts
    // formatiert, damit App und Führungsstelle denselben Wortlaut zeigen.
    const gesamt = vergleich?.diff.staerke.find((a) => a.feld === "Gesamtstärke");
    expect(gesamt?.nachher).toBe("6");
  });

  it("Szenario: eine Fassung ohne inhaltliche Änderung meldet null Positionen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);
    await uebernimm(platz, bogen);
    // Nur der Stand wandert: ein anderer Bogen, dieselbe Einheit, kein Inhalt
    // anders. Der Meldestand selbst ist kein Diff-Eintrag.
    await uebernimm(platz, { ...bogen, stand: bogen.stand + 60 } as Erfassungsbogen);

    const schluessel = String(
      Object.values(platz.dienst.zustand.meldungen)[0]?.einheitSchluessel?.wert,
    );
    expect(projektion.letzteAenderung(platz.dienst.zustand, schluessel)?.diff.anzahl).toBe(0);
  });

  it("Szenario: eine Reihe mit einer einzigen Fassung hat keine Bewegung", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await uebernimm(platz, liesDatei(ALLE[0] as string));

    const schluessel = String(
      Object.values(platz.dienst.zustand.meldungen)[0]?.einheitSchluessel?.wert,
    );
    // Dort gibt es keine Bewegung, nur einen Stand.
    expect(projektion.letzteAenderung(platz.dienst.zustand, schluessel)).toBeUndefined();
  });
});

/**
 * Die Bündeldatei — M6.3.
 *
 * Ein Meldekopf am Bereitstellungsraum hat oft keine Verbindung zur
 * Führungsstelle (`excel-handbuch-anforderungen.md`, Rollen). Er sammelt Bögen
 * in seiner App, und jemand trägt die Datei hinüber. Das Format ist die
 * `Einsatzsammlung` des Erfassungsbogens — ein eigenes zu erfinden hieße,
 * denselben Bogen zweimal zu beschreiben.
 */
describe("Funktionalität: Bündeldatei", () => {
  /** Eine Sammlung, wie die App sie exportiert. */
  function sammlung(boegen: readonly Erfassungsbogen[]): string {
    return JSON.stringify([
      {
        id: "s1",
        name: "BR Hafen",
        art: 0,
        angelegt: 1_757_000_000_000,
        geaendert: 1_757_000_000_000,
        eintraege: boegen.map((bogen, i) => ({
          id: `e${String(i)}`,
          einheitSchluessel: "",
          empfangenAm: 1_757_000_000_000 + i * 1000,
          quelle: "scan",
          status: 0,
          bogen,
        })),
      },
    ]);
  }

  it("Szenario: eine Datei mit drei Bögen wird zu drei Meldungen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const boegen = ALLE.slice(0, 3).map(liesDatei);

    const ergebnis = await platz.dienst.buendelEinlesen(sammlung(boegen), "EO");
    expect(ergebnis.aufgenommen).toBe(3);
    expect(ergebnis.bekannt).toBe(0);
    expect(ergebnis.uebersprungen).toBe(0);
    expect(ergebnis.name).toBe("BR Hafen");
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(3);
  });

  it("Szenario: dasselbe Bündel zweimal eingelesen ändert nichts (§3.6)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const datei = sammlung(ALLE.slice(0, 2).map(liesDatei));

    await platz.dienst.buendelEinlesen(datei, "EO");
    const zweites = await platz.dienst.buendelEinlesen(datei, "EO");

    // Derselbe Bogen ergibt dieselbe `meldungId` und damit eine Meldung. Ein
    // zweimal eingelesenes Bündel ist kein Fehler, sondern ein Vorgang ohne
    // Wirkung — und das muss der Bediener erfahren.
    expect(zweites.aufgenommen).toBe(0);
    expect(zweites.bekannt).toBe(2);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(2);
  });

  it("Szenario: ein Bogen aus dem Bündel und derselbe gescannt fallen zusammen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = liesDatei(ALLE[0] as string);

    await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
    await platz.dienst.eebUebernehmen("EO");
    const ergebnis = await platz.dienst.buendelEinlesen(sammlung([bogen]), "EO");

    // Zwei Meldeköpfe, zwei Wege, eine Meldung — darauf beruht die
    // Dublettenfreiheit des ganzen Meldewegs (§5.8.1).
    expect(ergebnis.bekannt).toBe(1);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(1);
  });

  it("Szenario: kaputte Einträge werden gezählt und nicht verschwiegen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const gut = liesDatei(ALLE[0] as string);
    const datei = JSON.stringify([
      {
        id: "s1",
        name: "Kaputt",
        art: 0,
        angelegt: 1,
        geaendert: 1,
        eintraege: [
          { id: "a", einheitSchluessel: "", empfangenAm: 1, quelle: "scan", status: 0, bogen: gut },
          { id: "b", einheitSchluessel: "", empfangenAm: 1, quelle: "scan", status: 0 },
          { id: "c", einheitSchluessel: "", empfangenAm: 1, quelle: "scan", status: 0, bogen: { unsinn: true } },
        ],
      },
    ]);

    const ergebnis = await platz.dienst.buendelEinlesen(datei, "EO");
    expect(ergebnis.aufgenommen).toBe(1);
    // Wer eine Datei mit drei Bögen einliest und einen bekommt, muss das
    // erfahren — ein stiller Leser verlöre die Meldung und die Auskunft.
    expect(ergebnis.uebersprungen).toBe(2);
  });

  it("Szenario: der Rückweg schreibt eine Datei, die sich wieder einlesen lässt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.buendelEinlesen(sammlung(ALLE.slice(0, 2).map(liesDatei)), "EO");

    const geschrieben = await platz.dienst.buendelSchreiben();
    expect(geschrieben.bytes).toBeGreaterThan(0);
    expect(path.basename(geschrieben.pfad)).toMatch(/^buendel_\d{4}-\d{2}-\d{2}_\d{4}\.json$/);

    // Der Rundlauf: dieselbe Datei wieder hinein — und nichts ist neu.
    const text = readFileSync(geschrieben.pfad, "utf8");
    const zurueck = await platz.dienst.buendelEinlesen(text, "EO");
    expect(zurueck.aufgenommen).toBe(0);
    expect(zurueck.bekannt).toBe(2);
  });
});
