import { describe, expect, it } from "vitest";

import { Identitaetenbuch } from "./identitaeten.js";
import { Leser } from "./leser.js";
import { stoerdateisystem, type Stoerung } from "./pruefhilfen/stoerdateisystem.js";
import { arbeitsplatz, legeEinsatzAn, spiegelungFuer } from "./pruefhilfen/aufbau.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import { leererUploadZustand } from "./uploadZustand.js";
import { UNVOLLSTAENDIG_FRIST_MS, VERFALL_MS } from "./startwerte.js";
import { baueZeile, leseAbschnitt, leseZeilengrenzen } from "./zeile.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";
import type { Schreibergebnis } from "./schreiber.js";

const EINSATZ = "2026-09-08_hochwasser-sued_ab12cd";
const FREMD = "8899aabb";

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  return ergebnis.zeile;
}

/**
 * Ein zweiter Arbeitsplatz am selben Share — mit **eigenem** lokalem Spiegel
 * (§5.1), damit sein Schreibweg und der Leseweg des ersten sich nicht
 * dieselbe Datei teilen.
 */
async function fremderSchreiber(platz: Arbeitsplatz, anzahl: number, clientId = FREMD) {
  const anderer = platz.andererRechner(`rechner-${clientId}`);
  const schreiber = await anderer.oeffne(clientId);
  for (let i = 0; i < anzahl; i += 1) {
    anderer.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
  }
  await spiegelungFuer(anderer, schreiber, EINSATZ).lauf();
  return { schreiber, platz: anderer };
}

function leserFuer(platz: Arbeitsplatz, clientId: string, buch = new Identitaetenbuch()) {
  return new Leser(
    { dateisystem: platz.dateisystem, zeit: platz.uhr.lies, ablage: platz.ablage, clientId, identitaeten: buch },
    leererUploadZustand(),
  );
}

describe("Leseweg nach §5.5", () => {
  it("prüft vor dem Anhängen und übernimmt nur geprüfte Zeilen in den Spiegel", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 3);

    const leser = leserFuer(platz, "9f3c1a20");
    const ergebnis = await leser.taktB();
    expect(ergebnis.neueDateien).toEqual([`${FREMD}.0000.jsonl`]);
    expect(ergebnis.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:1`, `${FREMD}:2`, `${FREMD}:3`]);

    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(`${FREMD}.0000.jsonl`), 0);
    expect(spiegel).toEqual(share);
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.leseOffset).toBe(share.byteLength);
  });

  it("liest am bekannten Offset weiter und liefert die Zeilen als Bündel", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    // Nichts Neues: 0 Bytes, keine Zeilen — Bedingung 2 der Ruhephase (§7.6).
    const leer = await leser.taktA();
    expect(leer.gelesenBytes).toBe(0);
    expect(leer.neueZeilen).toEqual([]);

    platz.uhr.weiter(3);
    alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();
    const nachschub = await leser.taktA();
    expect(nachschub.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:3`]);
  });

  it("liest die eigene Datei nicht als fremde", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const eigener = await platz.oeffne("9f3c1a20");
    platz.uhr.weiter(3);
    alsGeschrieben(await eigener.schreibe({ typ: "EinheitGemeldet" }));
    await spiegelungFuer(platz, eigener, EINSATZ).lauf();

    const leser = leserFuer(platz, "9f3c1a20");
    expect((await leser.taktB()).neueDateien).toEqual([]);
  });
});

describe("Abgeschnittene Zeile nach §8.1 (DoD)", () => {
  it("wertet den Rest nicht aus, meldet nichts und holt sie beim nächsten Durchlauf nach", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();
    const standVorher = leser.zustand.fremd[`${FREMD}.0000`]?.leseOffset as number;

    // Der fremde Schreiber ist mitten in einer Zeile: nur ein Bruchstück ist da.
    platz.uhr.weiter(3);
    const dritte = alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(0, 20),
    );

    const halb = await leser.taktA();
    expect(halb.neueZeilen).toEqual([]);
    expect(halb.neueQuarantaenen).toEqual([]); // §8.1: keine Meldung, kein Hinweis
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.leseOffset).toBe(standVorher);

    // Der Rest kommt nach.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(20),
    );
    const ganz = await leser.taktA();
    expect(ganz.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:3`]);
  });

  it("geht nach fünf Minuten in vorläufige Quarantäne und kommt ohne Zutun zurück (§8.1)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    platz.uhr.weiter(3);
    const dritte = alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(0, 20),
    );
    await leser.taktA();

    // Vor Fristablauf: weiterhin kein Hinweis.
    platz.uhr.weiter(UNVOLLSTAENDIG_FRIST_MS - 1);
    expect((await leser.taktA()).neueQuarantaenen).toEqual([]);

    platz.uhr.weiter(2);
    const spaet = await leser.taktA();
    expect(spaet.neueQuarantaenen).toHaveLength(1);
    expect(spaet.neueQuarantaenen[0]?.vorlaeufig).toBe(true);
    expect(leser.inTaktA).not.toContain(`${FREMD}.0000.jsonl`);

    // §8.1: „Wird die Zeile später doch vollständig und kettenrichtig, fällt die
    // Quarantäne ohne Zutun weg und die Datei kehrt in Takt A zurück."
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(20),
    );
    const geheilt = await leser.pruefeQuarantaenenErneut();
    expect(geheilt.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:3`]);
    expect(leser.inTaktA).toContain(`${FREMD}.0000.jsonl`);
  });
});

describe("Quarantäne ab Offset nach §8.2 (Auflage 7)", () => {
  it("hält alle Zeilen vor der Fehlerstelle gültig und alle anderen Dateien am Laufen", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 4);
    await fremderSchreiber(platz, 2, "ccddeeff");

    // Ein gekipptes Byte in der Mitte der ersten fremden Datei.
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`);
    const dritteZeile = leseAbschnitt(roh, 0, KETTE_ANFANG).zeilen[2] as { offset: number; laenge: number };
    const stelle = dritteZeile.offset + dritteZeile.laenge - 5;
    roh[stelle] = (roh[stelle] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`, roh);

    const leser = leserFuer(platz, "9f3c1a20");
    const ergebnis = await leser.taktB();

    // §8.2 Punkt 1: Alle Zeilen vor der Fehlerstelle bleiben gültig.
    expect(ergebnis.neueZeilen.filter((z) => z.rahmen.id.startsWith(FREMD))).toHaveLength(2);
    // §8.2 Punkt 4: Alle anderen Dateien laufen unverändert weiter.
    expect(ergebnis.neueZeilen.filter((z) => z.rahmen.id.startsWith("ccddeeff"))).toHaveLength(2);
    // §8.2 Punkt 2: Quarantäne genau ab dem Offset der defekten Zeile.
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.quarantaeneAb).toBe(dritteZeile.offset);
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.vorlaeufig).toBe(false);
    // §8.2 Punkt 3: sichtbar und dauerhaft, mit dem zugesagten Wortlaut.
    expect(ergebnis.neueQuarantaenen[0]?.meldung).toContain("sind beschädigt und werden nicht angezeigt");
    expect(ergebnis.neueQuarantaenen[0]?.meldung).toContain("aller anderen Arbeitsplätze sind vollständig");

    // §5.5: Der Spiegel ist ab der Quarantänestelle das **geprüfte Präfix** der
    // Share-Datei, nicht ihre Kopie. Kein defektes Byte gelangt hinein.
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    expect(spiegel.byteLength).toBe(dritteZeile.offset);
    expect(leseAbschnitt(spiegel, 0, KETTE_ANFANG).abschluss).toEqual({ art: "ende" });

    // §8.2, „Ausdrücklich nicht": kein Überspringen der defekten Zeile.
    const nochmal = await leser.taktA();
    expect(nochmal.neueZeilen.filter((z) => z.rahmen.id.startsWith(FREMD))).toEqual([]);
  });

  it("prüft die Quarantänestelle bei jedem Programmstart einmal erneut (§8.2 Punkt 5)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 3);
    const gesund = await platz.wiese.lies(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`);

    const roh = gesund.slice();
    const zweite = leseAbschnitt(roh, 0, KETTE_ANFANG).zeilen[1] as { offset: number; laenge: number };
    const stelle = zweite.offset + zweite.laenge - 6;
    roh[stelle] = (roh[stelle] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`, roh);

    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.quarantaeneAb).toBe(zweite.offset);

    // Der Defekt kam aus einem Lesefehler des Netzes: Die Bytes sind in
    // Wahrheit heil. Beim nächsten Start verschwindet er.
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`, gesund);
    const erneut = await leser.pruefeQuarantaenenErneut();
    expect(erneut.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:2`, `${FREMD}:3`]);
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.quarantaeneAb).toBeNull();
  });
});

describe("Zwei Takte nach §6.2", () => {
  it("verlegt eine Datei nach fünf Minuten Stillstand in Takt B und holt sie bei Bytes zurück", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();
    expect(leser.inTaktA).toContain(`${FREMD}.0000.jsonl`);

    platz.uhr.weiter(VERFALL_MS + 1);
    await leser.taktA();
    expect(leser.inTaktA).not.toContain(`${FREMD}.0000.jsonl`);

    platz.uhr.weiter(3);
    alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet" }));
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();
    const zurueck = await leser.taktB();
    expect(zurueck.neueZeilen).toHaveLength(1);
    expect(leser.inTaktA).toContain(`${FREMD}.0000.jsonl`);
  });

  it("pollt ein angekündigtes Nachfolgesegment bereits in Takt A (§4.3, §6.2)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const fremdPlatz = platz.andererRechner(`rechner-${FREMD}`);
    const fremd = await fremdPlatz.oeffne(FREMD, 400);
    while (fremd.segment === 0) {
      fremdPlatz.uhr.weiter(1);
      alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "x".repeat(120) } }));
    }
    // Nur das abgeschlossene Segment liegt auf dem Share; der Nachfolger fehlt.
    const nurErstes = await fremdPlatz.dateisystem.liesAb(fremdPlatz.ablage.lokalSegment(FREMD, 0), 0);
    await platz.dateisystem.haengeAnUndSynchronisiere(platz.ablage.shareSegment(FREMD, 0), nurErstes);

    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.abgeschlossen).toBe(true);
    // Angekündigt, noch nicht vorhanden — und trotzdem schon im kurzen Takt.
    expect(leser.inTaktA).toContain(`${FREMD}.0001.jsonl`);
    expect(leser.inTaktA).not.toContain(`${FREMD}.0000.jsonl`);

    // Sobald er da ist, läuft die Kette über den Segmentwechsel hinweg durch.
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();
    const nachschub = await leser.taktA();
    expect(nachschub.neueZeilen.length).toBeGreaterThan(0);
    expect(nachschub.neueQuarantaenen).toEqual([]);
  });
});

describe("Abgleich mit dem Spiegel beim Öffnen (§5.3, §5.5)", () => {
  it("baut leseOffset und Identitäten aus dem Spiegel auf, wenn upload-state.json fehlt", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 3);
    const erster = leserFuer(platz, "9f3c1a20");
    await erster.taktB();
    const spiegelVorher = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);

    // Neustart ohne upload-state.json.
    const buch = new Identitaetenbuch();
    const zweiter = leserFuer(platz, "9f3c1a20", buch);
    await zweiter.gleicheMitSpiegelAb();
    expect(zweiter.zustand.fremd[`${FREMD}.0000`]?.leseOffset).toBe(spiegelVorher.byteLength);
    expect(buch.anzahl).toBe(3);

    // Und der Spiegel wird nicht ein zweites Mal beschrieben.
    const ergebnis = await zweiter.taktB();
    expect(ergebnis.neueZeilen).toEqual([]);
    const spiegelNachher = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    expect(spiegelNachher).toEqual(spiegelVorher);
  });

  it("überspringt eine wiederholte Zeile aus einem Ersatzsegment, statt sie zu verwerfen (§4.6)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 4);
    const buch = new Identitaetenbuch();
    const leser = leserFuer(platz, "9f3c1a20", buch);
    await leser.taktB();

    // Der fremde Schreiber repariert nach §4.6 und schreibt ab Zeile 3 neu.
    const lokal = await fremdPlatz.dateisystem.liesAb(fremdPlatz.ablage.lokalSegment(FREMD, 0), 0);
    const dritte = leseAbschnitt(lokal, 0, KETTE_ANFANG).zeilen[2] as { offset: number };
    alsGeschrieben(await fremd.schreibeErsatzsegment(0, dritte.offset));
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();

    const ergebnis = await leser.taktB();
    // Die wiederholten Zeilen sind dieselben Ereignisse und erscheinen nicht
    // erneut im Bündel — und vor allem: sie sind kein Defekt.
    expect(ergebnis.neueQuarantaenen).toEqual([]);
    const ids = ergebnis.neueZeilen.map((z) => z.rahmen.id);
    expect(ids).not.toContain(`${FREMD}:3`);
    expect(ids).not.toContain(`${FREMD}:4`);
    expect(ergebnis.neueZeilen.some((z) => z.rahmen.typ === "SegmentErsetzt")).toBe(true);
  });
});

describe("Befunde aus der Begutachtung", () => {
  it("verdoppelt den Spiegel nicht, wenn eine fremde Kennung ein Ersatzsegment hat (§5.5, §2.3)", async () => {
    // Der Anker eines fremden Ersatzsegments ist eine **innere** Zeile des
    // ersetzten Segments (§4.6 Schritt 3). Wer ihn für 32 Nullen hält, setzt
    // `leseOffset` beim Öffnen auf 0 zurück und hängt den gesamten Inhalt ein
    // zweites Mal an den Spiegel an — der doppelte Anhang, den §5.4.2 als den
    // einen Fehler benennt, den dieses Verfahren ausschliessen soll.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 4);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    const lokal = await fremdPlatz.dateisystem.liesAb(fremdPlatz.ablage.lokalSegment(FREMD, 0), 0);
    const dritte = leseAbschnitt(lokal, 0, KETTE_ANFANG).zeilen[2] as { offset: number };
    alsGeschrieben(await fremd.schreibeErsatzsegment(0, dritte.offset));
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();
    await leser.taktB();

    const vorher = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0001.jsonl`), 0);
    expect(vorher.byteLength).toBeGreaterThan(0);

    // Neustart ohne upload-state.json: der Abgleich darf nichts verdoppeln.
    const zweiter = leserFuer(platz, "9f3c1a20", new Identitaetenbuch());
    await zweiter.gleicheMitSpiegelAb();
    expect(zweiter.zustand.fremd[`${FREMD}.0001`]?.leseOffset).toBe(vorher.byteLength);
    await zweiter.taktB();
    const nachher = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0001.jsonl`), 0);
    expect(nachher).toEqual(vorher);
  });

  it("hängt bei zwei gleichzeitigen Takt-A-Durchläufen nichts doppelt an (§8.4)", async () => {
    // §8.4: „Kein zweiter Versuch, solange der erste unterwegs ist. Je Datei ist
    // höchstens ein Zugriff offen; die Speicherschicht serialisiert das selbst
    // und überlässt es nicht dem Aufrufer." Takt A (3 s) und Takt B (4 s)
    // laufen nach §6.2 unabhängig, und ein SMB-Zugriff darf bis zu 60 s hängen
    // — die Überlappung ist der Normalfall, nicht die Ausnahme.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    // Neue Bytes, die beide Läufe zu lesen versuchen.
    for (let i = 0; i < 3; i += 1) {
      fremdPlatz.uhr.weiter(3);
      alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }));
    }
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, { eigen: {}, fremd: {} }).lauf();
    const share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(`${FREMD}.0000.jsonl`), 0);

    const [a, b] = await Promise.all([leser.taktA(), leser.taktA()]);

    // Der lokale Spiegel ist das geprüfte Präfix der Share-Datei (§5.5) — nicht
    // ihr Anderthalbfaches.
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    expect(spiegel).toEqual(share);
    // Und dasselbe Ereignis erscheint nicht zweimal im Bündel für den Fold.
    const ids = [...a.neueZeilen, ...b.neueZeilen].map((z) => z.rahmen.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("meldet einen gescheiterten Lesezugriff, statt ihn zu verschlucken (§8.3, §7.6)", async () => {
    // Verschluckt sähe ein Share-Ausfall aus wie Bedingung 2 der Ruhephase —
    // überall 0 Bytes —, und ein Konvergenzlauf hielte Stillstand für Ruhe.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    const stoerungen: Stoerung[] = [
      { aufruf: "liesAb", code: "ETIMEDOUT", malen: Infinity, pfadEnthaelt: "share" },
    ];
    const gestoert = new Leser(
      {
        dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: "9f3c1a20",
        identitaeten: new Identitaetenbuch(),
      },
      leser.zustand,
    );
    const ergebnis = await gestoert.taktA();
    expect(ergebnis.gelesenBytes).toBe(0);
    // Genau hier liegt der Unterschied zu einer echten Ruhephase.
    expect(ergebnis.lesefehler).toHaveLength(1);
    expect(ergebnis.lesefehler[0]?.klasse).toBe("voruebergehend");
    expect(ergebnis.lesefehler[0]?.code).toBe("ETIMEDOUT");
  });

  it("hebt die vorläufige Quarantäne im laufenden Betrieb ohne Zutun auf (§8.1)", async () => {
    // §8.1: „Wird die Zeile später doch vollständig und kettenrichtig, fällt die
    // Quarantäne **ohne Zutun** weg und die Datei kehrt in Takt A zurück." Ohne
    // Zutun heisst: ohne Programmstart.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd } = await fremderSchreiber(platz, 2);
    const leser = leserFuer(platz, "9f3c1a20");
    await leser.taktB();

    platz.uhr.weiter(3);
    const dritte = alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(0, 20),
    );
    await leser.taktA();
    platz.uhr.weiter(UNVOLLSTAENDIG_FRIST_MS + 1);
    expect((await leser.taktA()).neueQuarantaenen).toHaveLength(1);

    // Der Schreiber vervollständigt die Zeile — der Regelfall nach §5.4.1.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareDatei(`${FREMD}.0000.jsonl`),
      dritte.bytes.subarray(20),
    );
    const geheilt = await leser.taktB();
    expect(geheilt.geheilteQuarantaenen).toEqual([`${FREMD}.0000.jsonl`]);
    expect(geheilt.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:3`]);
    expect(leser.inTaktA).toContain(`${FREMD}.0000.jsonl`);
    expect(leser.quarantaenen).toEqual([]);
  });

  it("pollt eine endgültig quarantänisierte Datei nicht weiter (§8.2 Punkt 2)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await fremderSchreiber(platz, 4);
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`);
    const dritteZeile = leseAbschnitt(roh, 0, KETTE_ANFANG).zeilen[2] as { offset: number; laenge: number };
    const stelle = dritteZeile.offset + dritteZeile.laenge - 5;
    roh[stelle] = (roh[stelle] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${FREMD}.0000.jsonl`, roh);

    const leser = leserFuer(platz, "9f3c1a20");
    expect((await leser.taktB()).neueQuarantaenen).toHaveLength(1);
    // §8.2 Punkt 2: „wird ab dort nicht weiter ausgewertet und nicht weiter
    // gepollt" — kein zweiter Durchlauf erzeugt dieselbe Meldung noch einmal.
    const nochmal = await leser.taktB();
    expect(nochmal.neueQuarantaenen).toEqual([]);
    expect(nochmal.gelesenBytes).toBe(0);
    expect(leser.quarantaenen).toHaveLength(1);
    expect(leser.quarantaenen[0]?.grund).toBe("crc");
    expect(leser.quarantaenen[0]?.seit).toBeGreaterThan(0);
  });

  it("lässt eine zurückgestellte Datei verfallen, statt sie ewig im kurzen Takt zu halten (§6.2)", async () => {
    // Steht der Kettenanker nicht fest, wird die Datei zurückgestellt. Ohne
    // Verfall bliebe sie für den Rest der Lage in Takt A und kostete jeden
    // kurzen Takt einen vollständigen Lesezugriff.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    // Ein Segment 0001 ohne Vorgänger auf dem Share: der Anker ist nicht
    // bestimmbar.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(FREMD, 1),
      baueZeile({
        id: `${FREMD}:9`,
        vorgaenger: "a".repeat(32),
        typ: "EinheitGemeldet",
        schemaVersion: 1,
      }),
    );
    const leser = leserFuer(platz, "9f3c1a20");
    const ergebnis = await leser.taktB();
    expect(ergebnis.neueQuarantaenen).toEqual([]); // kein Urteil ohne Grundlage
    expect(ergebnis.neueZeilen).toEqual([]);

    platz.uhr.weiter(VERFALL_MS + 1);
    await leser.taktA();
    expect(leser.inTaktA).not.toContain(`${FREMD}.0001.jsonl`);
  });
});

describe("§5.5 — die Kürzung des Spiegels verlängert ihn nicht (Befund 20 aus M0.4)", () => {
  it("lässt einen zu kurzen Spiegel kurz, statt ihn mit Nullbytes auf `leseOffset` aufzufüllen", async () => {
    // `kuerzeAuf` **verlängert** mit Nullbytes, wenn die verlangte Länge über
    // der tatsächlichen liegt. Dass `leseOffset` nie über der Spiegellänge
    // steht, ist eine Zusicherung der Aufrufreihenfolge in `akte.ts` — dort
    // gleicht `gleicheMitSpiegelAb` beides vor dem ersten Poll ab. `Leser` ist
    // aber öffentlich, und ein Aufrufer, der mit einem gemerkten
    // Uploadzustand auf einen verkürzten Spiegel trifft, verlangt genau diese
    // Länge. Ohne die Grenze in `#kuerzeSpiegel` stünden danach Nullbytes im
    // Spiegel: Er wäre kein Präfix der Share-Datei mehr, der Export nach
    // §8.6.1 Regel 4 gäbe erfundene Bytes weiter, und jeder Leser fiele dort
    // nach §8.2 in Quarantäne.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { schreiber: fremd, platz: fremdPlatz } = await fremderSchreiber(platz, 3);
    const datei = `${FREMD}.0000.jsonl`;

    const erster = leserFuer(platz, "9f3c1a20");
    await erster.taktB();
    const zustand = erster.zustand;
    const leseOffset = zustand.fremd[`${FREMD}.0000`]?.leseOffset as number;

    // Der Spiegel wird hinter dem Rücken des Lesers kürzer — ein abgebrochener
    // lokaler Schreibweg (§8.8), eine zurückgespielte Sicherung, ein
    // Uploadzustand aus einer früheren Sitzung.
    const spiegelpfad = platz.ablage.lokalDatei(datei);
    const kurz = (leseZeilengrenzen(await platz.dateisystem.liesAb(spiegelpfad, 0), 0).zeilen[0] as {
      laenge: number;
    }).laenge;
    await platz.dateisystem.kuerzeAuf(spiegelpfad, kurz);
    expect(kurz).toBeLessThan(leseOffset);

    // Neue Zeilen auf dem Share, und ein Leser, der auf dem gemerkten
    // `leseOffset` aufsetzt, ohne vorher abzugleichen.
    platz.uhr.weiter(3);
    alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 3 } }));
    await spiegelungFuer(fremdPlatz, fremd, EINSATZ, leererUploadZustand()).lauf();

    const zweiter = new Leser(
      {
        dateisystem: platz.dateisystem,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: "9f3c1a20",
        identitaeten: new Identitaetenbuch(),
      },
      zustand,
    );
    const ergebnis = await zweiter.taktA();
    expect(ergebnis.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:4`]);

    const spiegel = await platz.dateisystem.liesAb(spiegelpfad, 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(datei), 0);
    const neueBytes = share.byteLength - leseOffset;
    // Kein einziges erfundenes Byte: Der Spiegel ist um genau die neuen Bytes
    // gewachsen, nicht um die Lücke bis `leseOffset` obendrein.
    expect(spiegel.byteLength).toBe(kurz + neueBytes);
    expect(spiegel.includes(0)).toBe(false);
    expect(spiegel.subarray(0, kurz)).toEqual(share.subarray(0, kurz));
  });
});
