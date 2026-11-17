/**
 * Funktionalität: Erfassungsbogen aus einer PDF der Erfassungsbogen-App.
 *
 * Die PDF trägt den Bogen als JSON-Anhang. Der Renderer zieht die Texte aus
 * der Datei; hier steht, was der Aktendienst daraus macht: Vorschau,
 * Warteschlange einer Sammel-PDF, Übernahme — und dass ein Bogen, der einmal
 * gescannt und einmal als Datei kommt, **eine** Meldung ist (§5.8.1).
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

import { encodePayloadUrl, type Erfassungsbogen, type Kompressor } from "@bos/eeb-format";
import { afterEach, describe, expect, it } from "vitest";

import { einsatzBeendet, entfernung } from "../kontrakt/bedienschritte.js";
import { EINSATZ_ID, grundlage, raeumeAuf, werkstattMitEinemPlatz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const KOMPRESSOR: Kompressor = {
  deflateRaw: (daten) => new Uint8Array(deflateRawSync(daten)),
  inflateRaw: (daten) => new Uint8Array(inflateRawSync(daten)),
};

const PRUEFDATEN = path.resolve(import.meta.dirname, "..", "..", "..", "..", "pruefdaten", "eeb", "thw");
const TEXTE = ["001-albstadt-ztr-tz.json", "002-biberach-riss-fgr-o-b.json", "003-crailsheim-fgr-w-a.json"].map((name) =>
  readFileSync(path.join(PRUEFDATEN, name), "utf8"),
);

// Jedes Szenario legt eine Werkstatt an und liest mehrere Bögen samt Übernahme
// ein. Auf dem langsamen windows-latest-Läufer reichen die 5 s von Vitest nicht
// (Zeitüberschreitung im Massenimport-Szenario); 30 s tragen den Läufer, ohne
// Fachlogik oder Erwartungen zu ändern.
describe("Funktionalität: Erfassungsbogen aus einer PDF", { timeout: 30_000 }, () => {
  it("Szenario: der Bogen einer PDF wird angezeigt und als PDF-Import übernommen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);

    const stand = await platz.dienst.eebDatei([TEXTE[0] as string]);
    expect(stand.art).toBe("vollstaendig");
    expect(stand.wartend).toBeUndefined();
    expect(stand.vorschau?.bezeichnung.length).toBeGreaterThan(0);
    // Der Anhang trägt keine Signatur — sie steckt nur im QR-Code.
    expect(stand.vorschau?.signatur).toBe("unsigniert");

    const ergebnis = await platz.dienst.eebUebernehmen("EO");
    expect(ergebnis.art).toBe("uebernommen");
    const meldungen = Object.values(platz.dienst.zustand.meldungen);
    expect(meldungen).toHaveLength(1);
    expect(meldungen[0]?.quelle?.wert).toBe("PDF_IMPORT");
  });

  it("Szenario: eine Sammel-PDF wird Bogen für Bogen übernommen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);

    const erster = await platz.dienst.eebDatei(TEXTE);
    expect(erster.art).toBe("vollstaendig");
    expect(erster.wartend).toBe(2);

    const eins = await platz.dienst.eebUebernehmen("EO");
    expect(eins.art).toBe("uebernommen");
    if (eins.art !== "uebernommen") return;
    expect(eins.naechster?.art).toBe("vollstaendig");
    expect(eins.naechster?.wartend).toBe(1);
    expect(eins.naechster?.vorschau?.meldungId).not.toBe(erster.vorschau?.meldungId);

    const zwei = await platz.dienst.eebUebernehmen("EO");
    expect(zwei.art === "uebernommen" && zwei.naechster?.wartend).toBeUndefined();
    const drei = await platz.dienst.eebUebernehmen("EO");
    expect(drei.art === "uebernommen" && drei.naechster).toBeUndefined();

    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(3);
    // Die Grundlage bringt eine Einheit mit.
    expect(Object.keys(platz.dienst.zustand.einheiten)).toHaveLength(4);
    // Die Schlange ist leer: Ein weiterer Versuch findet nichts mehr.
    expect((await platz.dienst.eebUebernehmen("EO")).art).toBe("nichtMoeglich");
  });

  it("Szenario: eine Sammel-PDF wird mit einem Klick vollständig übernommen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei(TEXTE);

    const ergebnis = await platz.dienst.eebAlleUebernehmen("EO");
    expect(ergebnis.uebernommen).toBe(3);
    expect(ergebnis.fehlgeschlagen).toEqual([]);
    // Nach jedem Bogen eine Fortschrittsmeldung an die Fenster.
    const fortschritt = platz.mitteilungen.filter((m) => m.art === "eebFortschritt");
    expect(fortschritt.map((m) => m.art === "eebFortschritt" && `${String(m.fertig)}/${String(m.gesamt)}`)).toEqual([
      "1/3",
      "2/3",
      "3/3",
    ]);
    expect(ergebnis.ereignisse).toBeGreaterThanOrEqual(3);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(3);
    expect(Object.keys(platz.dienst.zustand.einheiten)).toHaveLength(4);
    // Danach ist nichts mehr da.
    expect((await platz.dienst.eebUebernehmen("EO")).art).toBe("nichtMoeglich");
  });

  it("Szenario: der Massenimport übernimmt auch, was nach einem Überspringen noch wartet", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei(TEXTE);
    await platz.dienst.eebUeberspringen();

    const ergebnis = await platz.dienst.eebAlleUebernehmen("EO");
    expect(ergebnis.uebernommen).toBe(2);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(2);
  });

  it("Szenario: bereits erfasste Einheiten bleiben beim Massenimport in ihrem Abschnitt und werden genannt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "ANF", name: "Angefordert", typ: "ANGEFORDERT", reihenfolge: 2 },
    });
    await platz.dienst.eebDatei([TEXTE[0] as string]);
    await platz.dienst.eebAlleUebernehmen("EO");

    await platz.dienst.eebDatei(TEXTE);
    const ergebnis = await platz.dienst.eebAlleUebernehmen("ANF");
    expect(ergebnis.uebernommen).toBe(3);
    expect(ergebnis.aktualisiert).toHaveLength(1);
    expect(ergebnis.aktualisiert?.[0]?.abschnitt).toBe("Deich Nord");
    const abschnitte = Object.values(platz.dienst.zustand.einheiten).map((e) => e.wirksamerAbschnittId).sort();
    expect(abschnitte).toEqual(["ANF", "ANF", "EO", "EO"]);
  });

  it("Szenario: eine gelöschte Einheit kommt mit erneutem Import im gewählten Abschnitt zurück", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "ANF", name: "Angefordert", typ: "ANGEFORDERT", reihenfolge: 2 },
    });
    await platz.dienst.eebDatei(TEXTE);
    await platz.dienst.eebAlleUebernehmen("EO");
    const opfer = Object.keys(platz.dienst.zustand.einheiten).find((id) => id !== "U1") as string;
    await platz.dienst.bediene(entfernung(opfer, "falsch importiert"));

    await platz.dienst.eebDatei(TEXTE);
    const ergebnis = await platz.dienst.eebAlleUebernehmen("ANF");
    expect(ergebnis.uebernommen).toBe(3);
    expect(ergebnis.fehlgeschlagen).toEqual([]);
    expect(ergebnis.wiederhergestellt).toHaveLength(1);
    const zurueck = platz.dienst.zustand.einheiten[opfer];
    expect(zurueck?.entfernt?.wert).toBe(false);
    expect(zurueck?.wirksamerAbschnittId).toBe("ANF");
    // Die beiden aktiven stehen weiter in EO und werden als nicht verschoben genannt.
    expect(ergebnis.aktualisiert).toHaveLength(2);
    const zeilen = platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1", abschnittId: "ANF" }).zeilen;
    expect(zeilen.map((z) => z.einheitId)).toEqual([opfer]);
  });

  it("Szenario: der Massenimport wird abgebrochen und später fortgesetzt", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei(TEXTE);

    const lauf = platz.dienst.eebAlleUebernehmen("EO");
    // Der Abbruch kommt, während der erste Bogen geschrieben wird.
    platz.dienst.eebAbbrechen();
    const ergebnis = await lauf;
    expect(ergebnis.abgebrochen).toBe(true);
    expect(ergebnis.uebernommen).toBe(1);
    expect(ergebnis.naechster?.art).toBe("vollstaendig");
    expect(ergebnis.naechster?.wartend).toBe(1);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(1);

    // Die übrigen warten weiter und lassen sich danach übernehmen.
    const rest = await platz.dienst.eebAlleUebernehmen("EO");
    expect(rest.abgebrochen).toBeUndefined();
    expect(rest.uebernommen).toBe(2);
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(3);
  });

  it("Szenario: ein Abbruch ohne laufenden Import wirkt nicht auf den nächsten", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.eebAbbrechen();
    await platz.dienst.eebDatei(TEXTE);
    const ergebnis = await platz.dienst.eebAlleUebernehmen("EO");
    expect(ergebnis.abgebrochen).toBeUndefined();
    expect(ergebnis.uebernommen).toBe(3);
  });

  it("Szenario: ein abgewiesener Bogen hält den Massenimport nicht an", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei(TEXTE);
    // Ein archivierter Einsatz nimmt nichts mehr an — jeder Bogen wird abgewiesen.
    const ende = new Date(Date.now() - 3_600_000).toISOString();
    await platz.dienst.bediene(einsatzBeendet(EINSATZ_ID, null, ende, "Lage bereinigt"));
    expect((await platz.dienst.archiviere(new Date().toISOString())).art).toBe("geschrieben");

    const ergebnis = await platz.dienst.eebAlleUebernehmen("EO");
    expect(ergebnis.uebernommen).toBe(0);
    expect(ergebnis.fehlgeschlagen).toHaveLength(3);
    expect(ergebnis.fehlgeschlagen[0]?.bezeichnung.length).toBeGreaterThan(0);
    // Alle Bögen sind abgearbeitet, keiner hängt mehr in der Schlange.
    expect((await platz.dienst.eebUeberspringen()).art).toBe("leer");
  });

  it("Szenario: ein Bogen der Sammel-PDF wird übersprungen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const erster = await platz.dienst.eebDatei(TEXTE);

    const zweiter = await platz.dienst.eebUeberspringen();
    expect(zweiter.art).toBe("vollstaendig");
    expect(zweiter.wartend).toBe(1);
    expect(zweiter.vorschau?.meldungId).not.toBe(erster.vorschau?.meldungId);

    await platz.dienst.eebUeberspringen();
    expect((await platz.dienst.eebUeberspringen()).art).toBe("leer");
    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(0);
  });

  it("Szenario: „Von vorn“ verwirft auch die wartenden Bögen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei(TEXTE);

    expect(platz.dienst.eebZuruecksetzen().art).toBe("leer");
    expect((await platz.dienst.eebUebernehmen("EO")).art).toBe("nichtMoeglich");
    expect((await platz.dienst.eebUeberspringen()).art).toBe("leer");
  });

  it("Szenario: eine Datei ohne Bogen wird gemeldet und lässt den halben Stapel stehen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.eebDatei([TEXTE[0] as string]);

    const daneben = await platz.dienst.eebDatei(["kein json", '{"einheit":1}']);
    expect(daneben.art).toBe("unlesbar");
    expect(daneben.meldung).toContain("Erfassungsbogen");
    // Der zuvor gelesene Bogen ist noch da.
    expect((await platz.dienst.eebUebernehmen("EO")).art).toBe("uebernommen");
  });

  it("Szenario: derselbe Bogen als Scan und als PDF ergibt eine Meldung", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const bogen = JSON.parse(TEXTE[0] as string) as Erfassungsbogen;

    const gescannt = await platz.dienst.eebScan(encodePayloadUrl(bogen, KOMPRESSOR));
    await platz.dienst.eebUebernehmen("EO");
    const ausDatei = await platz.dienst.eebDatei([TEXTE[0] as string]);
    expect(ausDatei.vorschau?.meldungId).toBe(gescannt.vorschau?.meldungId);
    await platz.dienst.eebUebernehmen("EO");

    expect(Object.keys(platz.dienst.zustand.meldungen)).toHaveLength(1);
    expect(Object.keys(platz.dienst.zustand.einheiten)).toHaveLength(2);
  });
});
