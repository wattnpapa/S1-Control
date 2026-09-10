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
