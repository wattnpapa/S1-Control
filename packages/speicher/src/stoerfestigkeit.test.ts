/**
 * Regressionstests zu den Befunden der Simulation M0.4.
 *
 * Jeder Test hier steht für einen Fehler, den erst der Lauf mit feindlicher
 * Dateisystem-Schicht und Fehlerinjektion sichtbar gemacht hat
 * (05-UMSETZUNGSPLAN.md, M0.4; Auflage 15). Die Unit-Tests von M0.3 haben
 * keinen davon gefunden, weil sie einen Aufruf **vor** seiner Wirkung scheitern
 * lassen — die teilweise gelungene Schreibung kannten sie nicht.
 */

import { describe, expect, it } from "vitest";

import { HlcUhr } from "@s1/domaene";

import { oeffneAkte, type AkteOptionen } from "./akte.js";
import type { Dateisystem } from "./dateisystem.js";
import { Identitaetenbuch } from "./identitaeten.js";
import { Leser } from "./leser.js";
import { akteur, arbeitsplatz, legeEinsatzAn, spiegelungFuer } from "./pruefhilfen/aufbau.js";
import { stoerdateisystem, type Stoerung } from "./pruefhilfen/stoerdateisystem.js";
import { teilschreiber, type Teilschreibung } from "./pruefhilfen/teilschreiber.js";
import { Spiegelung } from "./spiegelung.js";
import { MELDUNG_EIGENE_DATEI_FEHLT } from "./spiegelergebnis.js";
import { leererUploadZustand, schreibeUploadZustand } from "./uploadZustand.js";
import { schreibeSchreiberzustand } from "./schreiberzustand.js";
import { baueZeile, leseZeilengrenzen } from "./zeile.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";
import type { Schreibergebnis } from "./schreiber.js";

const EINSATZ = "2026-09-08_hochwasser-sued_ab12cd";
const ICH = "9f3c1a20";
const FREMD = "8899aabb";
const NEUE_KENNUNG = "aabbccdd";

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  return ergebnis.zeile;
}

function akteOptionen(
  platz: Arbeitsplatz,
  dateisystem: Dateisystem,
  clientId = ICH,
  segmentgroesse = 100_000,
): AkteOptionen {
  return {
    dateisystem,
    zeit: platz.uhr.lies,
    ablage: platz.ablage,
    clientId,
    einsatzId: EINSATZ,
    akteur: akteur(clientId),
    uhr: new HlcUhr({ clientId, wanduhr: platz.uhr.lies }),
    neueKennung: () => NEUE_KENNUNG,
    segmentgroesse,
  };
}

describe("§4.4 und §5.3 — die Zustandsdateien sind Beschleuniger, keine Sollbruchstellen", () => {
  it("meldet ein gescheitertes `schreiber.json`, statt zu werfen", async () => {
    await using platz = await arbeitsplatz();
    const stoerungen: Stoerung[] = [{ aufruf: "benenneUm", code: "EPERM", malen: 1 }];
    const fs = stoerdateisystem(platz.dateisystem, stoerungen);
    await expect(
      schreibeSchreiberzustand(fs, platz.ablage.schreiberDatei, {
        clientId: ICH,
        laufnummer: 1,
        segment: 0,
        lokalerOffset: 0,
        letzteKette: "0".repeat(32),
      }),
    ).resolves.toBe(false);
  });

  it("meldet ein gescheitertes `upload-state.json`, statt zu werfen", async () => {
    await using platz = await arbeitsplatz();
    const fs = stoerdateisystem(platz.dateisystem, [
      { aufruf: "schreibeUeberOhneSync", code: "ENOSPC", malen: 1 },
    ]);
    await expect(
      schreibeUploadZustand(fs, platz.ablage.uploadZustandDatei, leererUploadZustand()),
    ).resolves.toBe(false);
  });

  it("schreibt weiter, wenn das Umbenennen von `schreiber.json` dauerhaft scheitert (§6.4, §9 zu Auflage 15)", async () => {
    // Der Rename-Fehler ist eine der drei Störungen ohne Konzeptregel; §9
    // verlangt allein, dass er **folgenlos** bleibt. Vor dem Befund aus M0.4
    // riss er den gesamten Schreibweg ab.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const fs = stoerdateisystem(platz.dateisystem, [
      { aufruf: "benenneUm", code: "EPERM", malen: Number.POSITIVE_INFINITY },
    ]);
    const { akte } = await oeffneAkte(akteOptionen(platz, fs));
    for (let i = 0; i < 5; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(leseZeilengrenzen(lokal, 0).zeilen).toHaveLength(5);
  });
});

describe("§8.1 und §5.4.1 — ein teilweise gelungener Anhang hinterlässt keine unlesbare Datei", () => {
  it("kürzt das Bruchstück weg, bevor die nächste Zeile geschrieben wird", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    // Erst scharf schalten, wenn schon eine gültige Zeile in der Datei steht:
    // Das Bruchstück soll **zwischen** zwei Zeilen landen, nicht am Dateianfang.
    const teile: Teilschreibung[] = [
      { pfadEnthaelt: `${ICH}.0000.jsonl`, bytes: 60, code: "EIO", malen: 0 },
    ];
    const fs = teilschreiber(platz.dateisystem, teile);
    const { akte } = await oeffneAkte(akteOptionen(platz, fs));

    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 0 } }));
    const nachErster = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);

    (teile[0] as Teilschreibung).malen = 1;
    platz.uhr.weiter(3);
    // §8.8 Punkt 1: sichtbar abgewiesen — und 60 Byte bleiben in der Datei zurück.
    expect((await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 1 } })).art).toBe(
      "abgewiesen",
    );

    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));

    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const gelesen = leseZeilengrenzen(lokal, 0);
    // Ohne die Kürzung stände das Bruchstück zwischen den beiden Zeilen, sein
    // Längenfeld kündigte Bytes ohne Zeilenende an (§8.2 Regel 3), und die
    // Datei wäre ab dieser Stelle dauerhaft nicht mehr auswertbar.
    expect(gelesen.zeilen).toHaveLength(2);
    expect(gelesen.endeOffset).toBe(lokal.byteLength);
    // §8.8 Punkt 2: Die Laufnummer 2 bleibt vergeben; eine Lücke ist erlaubt.
    expect(gelesen.zeilen.map((z) => z.rahmen.id)).toEqual([`${ICH}:1`, `${ICH}:3`]);
    expect(lokal.subarray(0, nachErster.byteLength)).toEqual(nachErster);
  });

  it("lässt die Datei schon nach dem abgewiesenen Schritt auswertbar zurück", async () => {
    // Ohne diesen Test wäre die Kürzung im Fehlerpfad durch die Kürzung vor dem
    // nächsten Anhang verdeckt: Ein Client, der nach dem abgewiesenen
    // Bedienschritt nichts mehr schreibt — der Regelfall, wenn die Platte voll
    // ist —, hinterließe eine Datei, deren letzte Zeile nicht auswertbar ist,
    // und der Spiegelungslauf käme über sie nicht hinaus (§5.4.1).
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const teile: Teilschreibung[] = [
      { pfadEnthaelt: `${ICH}.0000.jsonl`, bytes: 60, code: "ENOSPC", malen: 0 },
    ];
    const fs = teilschreiber(platz.dateisystem, teile);
    const { akte } = await oeffneAkte(akteOptionen(platz, fs));
    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 0 } }));
    const vorher = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);

    (teile[0] as Teilschreibung).malen = 1;
    platz.uhr.weiter(3);
    expect((await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 1 } })).art).toBe(
      "abgewiesen",
    );

    const nachher = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(nachher).toEqual(vorher);
    expect(leseZeilengrenzen(nachher, 0).endeOffset).toBe(nachher.byteLength);
    // Und die Spiegelung überträgt danach die ganze Datei (§5.4.1).
    expect((await akte.spiegle()).ergebnis.art).toBe("uebertragen");
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(share).toEqual(vorher);
  });

  it("überträgt danach vollständig auf den Share (§5.4.1)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const teile: Teilschreibung[] = [
      { pfadEnthaelt: `${ICH}.0000.jsonl`, bytes: 60, code: "EIO", malen: 0 },
    ];
    const fs = teilschreiber(platz.dateisystem, teile);
    const { akte } = await oeffneAkte(akteOptionen(platz, fs));
    for (let i = 0; i < 4; i += 1) {
      if (i === 2) (teile[0] as Teilschreibung).malen = 1;
      platz.uhr.weiter(3);
      await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } });
    }
    expect((await akte.spiegle()).ergebnis.art).toBe("uebertragen");
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(share).toEqual(lokal);
    expect(leseZeilengrenzen(lokal, 0).endeOffset).toBe(lokal.byteLength);
  });
});

describe("§5.4.2 — ENOENT heißt nicht: die Datei ist leer", () => {
  it("hängt nach einer Falschauskunft des Negativ-Caches nichts doppelt an", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne(ICH);
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const stoerungen: Stoerung[] = [];
    const fs = stoerdateisystem(platz.dateisystem, stoerungen);
    const spiegelung = new Spiegelung(
      {
        dateisystem: fs,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: ICH,
        einsatzId: EINSATZ,
        vollstaendigerOffset: () => ({
          segment: schreiber.segment,
          offset: schreiber.lokalerVollstaendigerOffset,
        }),
        identitaeten: schreiber.identitaeten,
      },
      leererUploadZustand(),
    );
    expect((await spiegelung.lauf()).art).toBe("uebertragen");
    const nachErstem = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(nachErstem.byteLength).toBeGreaterThan(0);

    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 3 } }));

    // §6.6: Der FileNotFoundCacheLifetime meldet die vorhandene Datei als
    // fehlend. Vor dem Befund aus M0.4 galt sie damit als leer, und alles ab
    // shareOffset wurde ein zweites Mal angehängt.
    stoerungen.push({ aufruf: "liesAb", code: "ENOENT", malen: 1, pfadEnthaelt: `share/einsatz/ereignisse/${ICH}` });
    const gestoert = await spiegelung.lauf();
    expect(gestoert.art).toBe("gescheitert");
    if (gestoert.art !== "gescheitert") throw new Error("unerreichbar");
    expect(gestoert.klasse).toBe("voruebergehend");
    expect(gestoert.meldung).toBe(MELDUNG_EIGENE_DATEI_FEHLT);
    const nachStoerung = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(nachStoerung).toEqual(nachErstem);

    // Der nächste Lauf holt es nach — genau einmal.
    expect((await spiegelung.lauf()).art).toBe("uebertragen");
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(share).toEqual(lokal);
  });

  it("entscheidet die Falschauskunft auf dem Server, nicht in dieser Sitzung", async () => {
    // Ein Merker in der Spiegelung überlebt keinen Neustart, der Cache aus §6.6
    // überdauert ihn. Ein Neustart innerhalb der Cache-Dauer hängte deshalb den
    // gesamten Inhalt des Segments ein zweites Mal an — die Datei begann für
    // jeden Leser mit einer Zeile ohne Zeilenende (§8.2 Regel 3): dauerhafte
    // Quarantäne für alle anderen. Befund aus der Simulation M0.4.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne(ICH);
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const stoerungen: Stoerung[] = [];
    const fs = stoerdateisystem(platz.dateisystem, stoerungen);
    const bauen = (): Spiegelung =>
      new Spiegelung(
        {
          dateisystem: fs,
          zeit: platz.uhr.lies,
          ablage: platz.ablage,
          clientId: ICH,
          einsatzId: EINSATZ,
          vollstaendigerOffset: () => ({
            segment: schreiber.segment,
            offset: schreiber.lokalerVollstaendigerOffset,
          }),
          identitaeten: schreiber.identitaeten,
        },
        leererUploadZustand(),
      );

    // Erster Lauf: überträgt alles, aber `upload-state.json` geht verloren —
    // der frische Zustand unten steht für den Neustart.
    expect((await bauen().lauf()).art).toBe("uebertragen");
    const nachErstem = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);

    // Neustart: neue Spiegelung, `shareOffset` wieder 0 — und der Negativ-Cache
    // meldet die vorhandene Datei als fehlend.
    stoerungen.push({
      aufruf: "liesAb",
      code: "ENOENT",
      malen: 1,
      pfadEnthaelt: `share/einsatz/ereignisse/${ICH}`,
    });
    const nachNeustart = await bauen().lauf();
    expect(nachNeustart.art).toBe("gescheitert");
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(share).toEqual(nachErstem);
  });
});

describe("§8, Grundsatz — eine lokale Schreibstörung hält den Leser nicht auf", () => {
  it("meldet den Spiegelfehler, lässt `leseOffset` stehen und liest beim nächsten Mal erneut", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const anderer = platz.andererRechner(`rechner-${FREMD}`);
    const fremd = await anderer.oeffne(FREMD);
    for (let i = 0; i < 3; i += 1) {
      anderer.uhr.weiter(3);
      alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await spiegelungFuer(anderer, fremd, EINSATZ).lauf();

    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "ENOSPC", malen: 1, pfadEnthaelt: "rechner-1" },
    ];
    const fs = stoerdateisystem(platz.dateisystem, stoerungen);
    const leser = new Leser(
      {
        dateisystem: fs,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: ICH,
        identitaeten: new Identitaetenbuch(),
      },
      leererUploadZustand(),
    );

    const erster = await leser.taktB();
    expect(erster.spiegelfehler).toHaveLength(1);
    expect(erster.spiegelfehler[0]?.code).toBe("ENOSPC");
    // §5.5: geprüft **vor** dem Anhängen — der Offset darf nicht vorlaufen.
    expect(leser.zustand.fremd[`${FREMD}.0000`]?.leseOffset ?? 0).toBe(0);
    expect(erster.neueZeilen).toHaveLength(0);
    // §7.6: Nichts ist in den Spiegel gelangt, also kein Fortschritt — und weil
    // `spiegelfehler` nicht leer ist, gilt der Durchlauf trotzdem nicht als
    // Ruhe. Beides zusammen ist die Aussage; der Fortschritt allein wäre hier
    // von echter Ruhe nicht zu unterscheiden.
    expect(erster.fortschrittBytes).toBe(0);

    const zweiter = await leser.taktA();
    expect(zweiter.spiegelfehler).toHaveLength(0);
    // Der Durchlauf, der es nachholt, hat sehr wohl etwas bewegt.
    expect(zweiter.fortschrittBytes).toBeGreaterThan(0);
    expect(zweiter.neueZeilen.map((z) => z.rahmen.id)).toEqual([`${FREMD}:1`, `${FREMD}:2`, `${FREMD}:3`]);
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(`${FREMD}.0000.jsonl`), 0);
    expect(spiegel).toEqual(share);
  });

  it("räumt ein Bruchstück im Spiegel weg, statt dahinter anzuhängen (§5.5)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const anderer = platz.andererRechner(`rechner-${FREMD}`);
    const fremd = await anderer.oeffne(FREMD);
    for (let i = 0; i < 3; i += 1) {
      anderer.uhr.weiter(3);
      alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await spiegelungFuer(anderer, fremd, EINSATZ).lauf();

    const fs = teilschreiber(platz.dateisystem, [
      { pfadEnthaelt: `rechner-1`, bytes: 45, code: "EIO", malen: 1 },
    ]);
    const leser = new Leser(
      {
        dateisystem: fs,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: ICH,
        identitaeten: new Identitaetenbuch(),
      },
      leererUploadZustand(),
    );
    const erster = await leser.taktB();
    expect(erster.spiegelfehler).toHaveLength(1);

    await leser.taktA();
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${FREMD}.0000.jsonl`), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(`${FREMD}.0000.jsonl`), 0);
    // Ohne die Kürzung stünden die 45 Bruchstück-Bytes vor den geprüften Zeilen:
    // Der Spiegel wäre länger als die Share-Datei und kein Präfix mehr.
    expect(spiegel).toEqual(share);
  });
});

describe("§7.6 — Bedingung 2 und 3 hängen am Fortschritt, nicht am Umsatz", () => {
  it("meldet 0 Fortschritt, wenn dieselben unvollständigen Bytes erneut kommen (§8.1)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const anderer = platz.andererRechner(`rechner-${FREMD}`);
    const fremd = await anderer.oeffne(FREMD);
    anderer.uhr.weiter(3);
    const zeile = alsGeschrieben(await fremd.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 0 } }));
    await spiegelungFuer(anderer, fremd, EINSATZ).lauf();
    // Ein Bruchstück auf dem Share, das nie vervollständigt wird — der Fall aus
    // §8.1, „der Schreiber ist mitten in einer Zeile endgültig ausgefallen".
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(FREMD, 0),
      zeile.bytes.subarray(0, zeile.bytes.byteLength - 20),
    );

    const leser = new Leser(
      {
        dateisystem: platz.dateisystem,
        zeit: platz.uhr.lies,
        ablage: platz.ablage,
        clientId: ICH,
        identitaeten: new Identitaetenbuch(),
      },
      leererUploadZustand(),
    );
    const erster = await leser.taktB();
    expect(erster.fortschrittBytes).toBeGreaterThan(0);

    const zweiter = await leser.taktA();
    // Dieselben Bytes noch einmal: `gelesenBytes` ist weiterhin größer als 0,
    // der Fortschritt ist 0. Ohne diese Unterscheidung wäre die Ruhephase nach
    // §7.6 für den Rest der Lage unerreichbar.
    expect(zweiter.gelesenBytes).toBeGreaterThan(0);
    expect(zweiter.fortschrittBytes).toBe(0);
  });
});

describe("§4.5 Schritt 6 — die aufgegebene Datei wird zum Spiegel einer fremden", () => {
  /** Erzwingt Ausgang C (§5.4.3) durch eine Zeile mit lokal unbekannter Identität. */
  async function schreibeKlonzeile(platz: Arbeitsplatz, kette: string): Promise<void> {
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:777`,
        vorgaenger: kette,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
  }

  it("kürzt auf das gelesene Share-Ende, nicht auf den gemerkten shareOffset", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz, platz.dateisystem));
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const gemerkt = akte.zustand.eigen[`${ICH}.0000`]?.shareOffset ?? 0;
    // Zwei weitere Zeilen lokal, davon eine bereits auf dem Share — aber der
    // Offset ist noch nicht fortgeschrieben (§5.4.2: erst nach fsync). Genau
    // diese Lage entsteht nach einem abgebrochenen Übertragungsversuch.
    platz.uhr.weiter(3);
    const fuenfte = alsGeschrieben(
      await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 4 } }),
    );
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      fuenfte.bytes,
    );
    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 5 } }));

    await schreibeKlonzeile(platz, fuenfte.kette);
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");

    const lokalAlt = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const shareAlt = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    // §5.5: Der Spiegel ist das geprüfte Präfix der Share-Datei. Waere auf den
    // gemerkten `shareOffset` gekürzt worden, fehlte die fünfte Zeile lokal,
    // obwohl sie auf dem Share steht — der Spiegel wäre dauerhaft kürzer, und
    // der Leser holte sie nie nach, weil die Kette an anderer Stelle stände.
    expect(lokalAlt.byteLength).toBeGreaterThan(gemerkt);
    expect(lokalAlt.byteLength).toBe(fuenfte.offset + fuenfte.bytes.byteLength);
    expect(shareAlt.subarray(0, lokalAlt.byteLength)).toEqual(lokalAlt);
  });

  it("holt die Kürzung beim nächsten Öffnen nach, wenn sie gescheitert ist (§8.8)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const stoerungen: Stoerung[] = [];
    const fs = stoerdateisystem(platz.dateisystem, stoerungen);
    const { akte } = await oeffneAkte(akteOptionen(platz, fs));
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const kette = akte.zustand.eigen[`${ICH}.0000`]?.letzteKette as string;
    const shareLaenge = (await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0))
      .byteLength;
    // Zwei ungespiegelte Zeilen; sie werden mitgenommen und muessen lokal weg.
    for (let i = 3; i < 5; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await schreibeKlonzeile(platz, kette);

    // Das Kuerzen scheitert. Vor dem Befund aus M0.4 riss das den gesamten
    // Spiegelungslauf ab; danach blieb Schritt 6 dauerhaft unerfüllt.
    stoerungen.push({
      aufruf: "kuerzeAuf",
      code: "EIO",
      malen: Number.POSITIVE_INFINITY,
      pfadEnthaelt: `rechner-1`,
    });
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");
    if (reaktion?.art !== "kennungGewechselt") throw new Error("unerreichbar");
    expect(reaktion.meldung).toContain("Aufräumen");
    const nochLang = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(nochLang.byteLength).toBeGreaterThan(shareLaenge);

    // Beim nächsten Öffnen ohne Stoerung wird sie nachgeholt.
    stoerungen.length = 0;
    await oeffneAkte(akteOptionen(platz, fs, "aabbccdd"));
    const gekürzt = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(gekürzt.byteLength).toBe(shareLaenge);
    expect(share.subarray(0, gekürzt.byteLength)).toEqual(gekürzt);
  });
});

describe("§4.5 Schritt 6 — eine nie gespiegelte aufgegebene Datei", () => {
  it("wird gelöscht, nicht auf 0 gekürzt, und nur bei gelungener Übernahme", async () => {
    // Ohne Share-Entsprechung ist die aufgegebene Datei der Spiegel einer
    // fremden Datei, die es nicht gibt. Bliebe sie als 0-Byte-Datei liegen,
    // kennte kein anderer Client sie: Der Versionsvektor dieses Clients wäre
    // dauerhaft ein anderer, und der Vergleich nach §7.6 fiele für den Rest
    // der Lage in den dritten Ausgang. Befund aus der Simulation M0.4.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz, platz.dateisystem, ICH, 900));
    // Segment 0000 füllen und **vor** dem Wechsel spiegeln, damit Segment 0001
    // nie auf den Share gelangt: Nur dann ist `shareOffset` dort 0, und nur
    // dann darf gelöscht werden.
    while (akte.schreiber.segment === 0) {
      platz.uhr.weiter(3);
      alsGeschrieben(
        await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "x".repeat(120) } }),
      );
      if (akte.schreiber.segment === 0) await akte.spiegle();
    }
    const lokal0001 = platz.ablage.lokalSegment(ICH, 1);
    expect((await platz.dateisystem.liesAb(lokal0001, 0)).byteLength).toBeGreaterThan(0);
    await expect(
      platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 1), 0),
    ).rejects.toMatchObject({ code: "ENOENT" });

    const kette = akte.zustand.eigen[`${ICH}.0000`]?.letzteKette as string;
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:777`,
        vorgaenger: kette,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
    // Ausgelöst über die Vollprüfung beim Öffnen (§4.6.1 Auslöser 1): Der
    // Spiegelungslauf kommt an Segment 0000 nicht mehr vorbei, weil dort nichts
    // mehr zu übertragen ist (§5.4.2 setzt am `shareOffset` an — genau die
    // Lücke, für die §4.6.1 den zweiten Auslöser vorsieht).
    const letzteNummer = akte.schreiber.zustand.laufnummer;
    const { ergebnis } = await oeffneAkte(akteOptionen(platz, platz.dateisystem, ICH, 900));
    expect(ergebnis.befund.art).toBe("fremdschreiber");
    expect(ergebnis.reaktion?.art).toBe("kennungGewechselt");

    console.log("DIR", await platz.dateisystem.listeVerzeichnis(platz.ablage.lokalEreignisse));
    // Weg — nicht 0 Byte groß.
    await expect(platz.dateisystem.liesAb(lokal0001, 0)).rejects.toMatchObject({ code: "ENOENT" });
    // §4.5 Schritt 3: Der Inhalt steht unverändert in der Datei der neuen Kennung.
    const neu = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(NEUE_KENNUNG, 0), 0);
    const ids = leseZeilengrenzen(neu, 0).zeilen.map((z) => z.rahmen.id);
    expect(ids).toContain(`${ICH}:${letzteNummer}`);
  });
});
