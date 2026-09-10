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

import { kennzahlen } from "@s1/domaene";

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
