import { describe, expect, it } from "vitest";

import { HlcUhr } from "@s1/domaene";

import { oeffneAkte, type AkteOptionen } from "./akte.js";
import { DateisystemFehler } from "./dateisystem.js";
import { akteur, arbeitsplatz, legeEinsatzAn } from "./pruefhilfen/aufbau.js";
import { stoerdateisystem, type Stoerung } from "./pruefhilfen/stoerdateisystem.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import { ersetzteSegmente } from "./ersetzteSegmente.js";
import { liesSegment } from "./segmentlese.js";
import { baueZeile, leseAbschnitt, leseZeilengrenzen } from "./zeile.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";
import type { Schreibergebnis } from "./schreiber.js";

const EINSATZ = "2026-09-08_hochwasser-sued_ab12cd";
const ICH = "9f3c1a20";
const NEUE = "aabbccdd";

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  return ergebnis.zeile;
}

function akteOptionen(platz: Arbeitsplatz, clientId = ICH, segmentgroesse?: number): AkteOptionen {
  return {
    dateisystem: platz.dateisystem,
    zeit: platz.uhr.lies,
    ablage: platz.ablage,
    clientId,
    einsatzId: EINSATZ,
    akteur: akteur(clientId),
    uhr: new HlcUhr({ clientId, wanduhr: platz.uhr.lies }),
    neueKennung: () => NEUE,
    ...(segmentgroesse === undefined ? {} : { segmentgroesse }),
  };
}

describe("Akte — die Verdrahtung von §4.5, §4.6 und §5.4", () => {
  it("öffnet, schreibt, spiegelt und meldet dabei nichts Ungewöhnliches", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte, ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.befund.art).toBe("inOrdnung");
    expect(ergebnis.reaktion).toBeUndefined();

    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    const { ergebnis: gespiegelt, reaktion } = await akte.spiegle();
    expect(gespiegelt.art).toBe("uebertragen");
    expect(reaktion).toBeUndefined();

    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(share).toEqual(lokal);
    // §5.3: Der Zustand ist weggeschrieben, nicht nur im Speicher.
    const gelesen = await platz.wiese.liesText("rechner-1/einsatz/upload-state.json");
    expect(gelesen).toContain(`${ICH}.0000`);
  });

  it("repariert eine Beschädigung nach §4.6, ohne die Kennung zu wechseln", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();

    // Eine Beschädigung in der Mitte — nur die Vollprüfung aus §4.6.1 findet sie.
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[40] = (roh[40] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);

    const { ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.befund.art).toBe("beschaedigt");
    expect(ergebnis.reaktion?.art).toBe("repariert");
    expect(ergebnis.reaktion?.meldung).toContain("beschädigt");
    expect(ergebnis.reaktion?.meldung).not.toContain("kopiert");

    // Das Ersatzsegment ist lokal da und trägt dieselben Ereignisse noch einmal.
    const ersatz = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 1), 0);
    const zeilen = leseAbschnitt(ersatz, 0, KETTE_ANFANG).zeilen;
    expect(zeilen.length).toBeGreaterThan(0);
  });

  it("wechselt bei einer fremden Schreibspur die Kennung und nimmt die ungespiegelten Ereignisse mit (§4.5)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    // Zwei Ereignisse, die noch nicht auf dem Share sind.
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }));
    }

    // Der Klon schreibt unter derselben Kennung eine Zeile mit unbekannter Identität.
    const stand = akte.zustand.eigen[`${ICH}.0000`]?.letzteKette as string;
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:77`,
        vorgaenger: stand,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );

    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");
    if (reaktion?.art !== "kennungGewechselt") throw new Error("unerreichbar");
    expect(reaktion.alteClientId).toBe(ICH);
    expect(reaktion.neueClientId).toBe(NEUE);
    // §4.5 Schritt 3: genau die beiden noch nicht gespiegelten Ereignisse.
    expect(reaktion.mitgenommen).toBe(2);
    expect(reaktion.meldung).toContain("kopiert");

    // Sie behalten ihre Identität `<alteClientId>:<laufnummer>` (Schritt 3).
    const neu = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(NEUE, 0), 0);
    const uebernommen = leseAbschnitt(neu, 0, KETTE_ANFANG);
    expect(uebernommen.abschluss).toEqual({ art: "ende" });
    expect(uebernommen.zeilen.map((z) => z.rahmen.id)).toEqual([`${ICH}:3`, `${ICH}:4`]);

    // Und die Laufnummer läuft fort (Schritt 4).
    platz.uhr.weiter(3);
    const naechste = alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet" }));
    expect(naechste.rahmen.id).toBe(`${NEUE}:5`);

    // Ab jetzt wird unter der neuen Kennung gespiegelt, und die alte Datei
    // bleibt liegen (§4.5 Schritt 5).
    await akte.spiegle();
    const shareNeu = await liesSegment(platz.dateisystem, platz.ablage.shareSegment(NEUE, 0), 0, KETTE_ANFANG);
    expect(shareNeu.vorhanden).toBe(true);
    expect(shareNeu.zeilen.map((z) => z.rahmen.id)).toEqual([`${ICH}:3`, `${ICH}:4`, `${NEUE}:5`]);
  });

  it("meldet §5.7, ohne den Ordner neu anzulegen", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet" }));
    await platz.dateisystem.loesche(platz.ablage.shareEinsatzDatei);
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("ordnerFort");
    // §5.7: „darf der Wiederholversuch den Ordner **nicht neu anlegen**."
    // Ohne diese Zusicherung trüge der Test nur den Namen.
    await expect(
      platz.dateisystem.liesAb(platz.ablage.shareEinsatzDatei, 0),
    ).rejects.toBeInstanceOf(DateisystemFehler);
    expect(await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse)).toEqual([]);
  });
});

describe("Befunde aus dem Abschlussgutachten", () => {
  it("erzeugt bei wiederholtem Öffnen nicht jedes Mal ein neues Ersatzsegment (§4.6 Schritt 5)", async () => {
    // §4.6 Schritt 5: „Das beschädigte Segment bekommt keine Abschlusszeile
    // mehr. Es wird nicht mehr beschrieben." Die Beschädigung auf dem Share
    // bleibt also dauerhaft liegen — ohne Ausnahme von der Vollprüfung fiele
    // jedes Öffnen erneut in Ausgang B, und aus einem einmaligen Heilweg würde
    // eine Dauerstörung mit unbegrenztem Dateiwachstum.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[40] = (roh[40] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);

    const erstes = await oeffneAkte(akteOptionen(platz));
    expect(erstes.ergebnis.reaktion?.art).toBe("repariert");

    // Zweites und drittes Öffnen: nichts mehr zu tun.
    const zweites = await oeffneAkte(akteOptionen(platz));
    expect(zweites.ergebnis.befund.art).toBe("inOrdnung");
    expect(zweites.ergebnis.reaktion).toBeUndefined();
    const drittes = await oeffneAkte(akteOptionen(platz));
    expect(drittes.ergebnis.reaktion).toBeUndefined();

    const dateien = [...(await platz.dateisystem.listeVerzeichnis(platz.ablage.lokalEreignisse))].sort();
    expect(dateien).toEqual([`${ICH}.0000.jsonl`, `${ICH}.0001.jsonl`]);
  });

  it("meldet keinen Erfolg, wenn die Reparatur am lokalen Schreiben scheitert (§8.8, §6.3)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[40] = (roh[40] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);

    const stoerungen: Stoerung[] = [
      {
        aufruf: "haengeAnUndSynchronisiere",
        code: "ENOSPC",
        malen: Infinity,
        pfadEnthaelt: "rechner-1",
      },
    ];
    const gestoert = {
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
    };
    const { ergebnis } = await oeffneAkte(gestoert);
    expect(ergebnis.reaktion?.art).toBe("reparaturGescheitert");
    expect(ergebnis.reaktion?.meldung).toContain("Speicherplatz");
  });

  it("schleppt beim Kennungswechsel keine Abschlusszeile in die neue Datei (§4.3)", async () => {
    // Eine Abschlusszeile sagt „dieses Segment ist fertig, es geht bei N
    // weiter". In der neuen Datei wäre das falsch: Ein Leser, dessen Abschnitt
    // darauf endet, hielte den neuen Arbeitsplatz für abgeschlossen und läse
    // ihn nie wieder — ohne Meldung und ohne Quarantäne.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz, ICH, 400));
    while (akte.schreiber.segment === 0) {
      platz.uhr.weiter(1);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "x".repeat(120) } }));
    }
    // Nichts davon ist gespiegelt: alles wird beim Wechsel mitgenommen.
    const stand = akte.zustand.eigen[`${ICH}.0000`]?.letzteKette ?? "0".repeat(32);
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:77`,
        vorgaenger: stand,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");

    const neu = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(NEUE, 0), 0);
    const uebernommen = leseAbschnitt(neu, 0, KETTE_ANFANG);
    expect(uebernommen.abschluss).toEqual({ art: "ende" });
    expect(uebernommen.zeilen.map((z) => z.rahmen.typ)).not.toContain("SegmentAbgeschlossen");
    // Und es sind trotzdem alle fachlichen Ereignisse mitgekommen.
    expect(uebernommen.zeilen.length).toBeGreaterThan(0);
  });
});

describe("Befunde des Gutachtens gegen akte.ts", () => {
  /** Beschädigt ein Byte in der Mitte der eigenen Share-Datei. */
  async function beschaedigeShare(platz: Arbeitsplatz) {
    const roh = await platz.wiese.lies(`share/einsatz/ereignisse/${ICH}.0000.jsonl`);
    roh[40] = (roh[40] as number) ^ 0x01;
    await platz.wiese.schreibe(`share/einsatz/ereignisse/${ICH}.0000.jsonl`, roh);
  }

  it("repariert im Spiegelpfad genau einmal und überträgt das Ersatzsegment (§4.6 Schritt 5)", async () => {
    // Ohne die Ausnahme im **Spiegel**pfad erzeugte jeder Lauf ein weiteres
    // Ersatzsegment, und weil der Lauf beim ersten `beschaedigt` zurückkehrt,
    // erreichte keines davon je den Share.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 4; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    await beschaedigeShare(platz);
    // Der Offset muss zurück, damit der Vergleich die Stelle überhaupt sieht.
    const wieder = await oeffneAkte(akteOptionen(platz));
    expect(wieder.ergebnis.reaktion?.art).toBe("repariert");

    // `upload-state.json` geht verloren — nach §5.3 zulässig, die Datei ist ein
    // Beschleuniger, kein Wahrheitsträger. Damit setzt der Vergleich wieder bei
    // Offset 0 an und sieht die Beschädigung; genau so wird der Spiegelpfad
    // überhaupt erreicht.
    await platz.dateisystem.loesche(platz.ablage.uploadZustandDatei);
    const nachVerlust = await oeffneAkte(akteOptionen(platz));

    // Vier weitere Spiegelungsläufe: keiner darf erneut reparieren.
    for (let i = 0; i < 4; i += 1) {
      const { reaktion } = await nachVerlust.akte.spiegle();
      expect(reaktion?.art, `Lauf ${i}`).not.toBe("repariert");
    }
    const lokal = [...(await platz.dateisystem.listeVerzeichnis(platz.ablage.lokalEreignisse))].sort();
    expect(lokal).toEqual([`${ICH}.0000.jsonl`, `${ICH}.0001.jsonl`]);

    // Und das Ersatzsegment ist wirklich auf dem Share angekommen.
    const share = await liesSegment(platz.dateisystem, platz.ablage.shareSegment(ICH, 1), 0, KETTE_ANFANG);
    expect(share.vorhanden).toBe(true);
    expect(share.zeilen.length).toBeGreaterThan(0);
  });

  it("liest den Klon nach dem Kennungswechsel weiter (§4.5 Schritt 6)", async () => {
    // Die alte eigene Datei ist im Augenblick des Wechsels länger als ihre
    // Share-Entsprechung. Ohne Kürzung stünde `leseOffset` hinter dem
    // Share-Ende, und alles, was der Klon dort schreibt, bliebe unsichtbar —
    // ohne Byte, ohne Meldung, ohne Quarantäne.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    // Zwei Ereignisse, die noch nicht auf dem Share sind.
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }));
    }

    const stand = akte.zustand.eigen[`${ICH}.0000`]?.letzteKette as string;
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:77`,
        vorgaenger: stand,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");

    // Der lokale Spiegel der alten Datei ist jetzt ein Präfix der Share-Datei.
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(`${ICH}.0000.jsonl`), 0);
    const shareAlt = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(spiegel.byteLength).toBeLessThan(shareAlt.byteLength);
    expect(shareAlt.subarray(0, spiegel.byteLength)).toEqual(spiegel);

    // Und die Zeile des Klons wird gelesen.
    const gelesen = await akte.taktA();
    expect(gelesen.neueZeilen.map((z) => z.rahmen.id)).toContain(`${ICH}:77`);
  });

  it("öffnet auch bei nicht erreichbarem Share (§1.3 Satz 2, §8.3)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const stoerungen: Stoerung[] = [
      { aufruf: "listeVerzeichnis", code: "ETIMEDOUT", malen: Infinity, pfadEnthaelt: "share" },
      { aufruf: "liesAb", code: "ETIMEDOUT", malen: Infinity, pfadEnthaelt: "share" },
    ];
    const gestoert = {
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
    };
    const { akte, ergebnis } = await oeffneAkte(gestoert);
    expect(ergebnis.befund.art).toBe("nichtErreichbar");
    expect(ergebnis.reaktion?.art).toBe("shareNichtErreichbar");
    // §5.2: Lokal wird trotzdem geschrieben.
    platz.uhr.weiter(3);
    const zeile = alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet" }));
    expect(zeile.rahmen.id).toBe(`${ICH}:1`);
  });

  it("überschreibt sich beim Wegschreiben des Zustands nicht selbst (§8.4)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    // §6.2 lässt die Takte unabhängig laufen — hier alle gleichzeitig.
    const ergebnisse = await Promise.allSettled([
      akte.spiegle(),
      akte.taktA(),
      akte.taktB(),
      akte.speichereZustand(),
    ]);
    expect(ergebnisse.filter((e) => e.status === "rejected")).toEqual([]);
    const inhalt = await platz.wiese.liesText("rechner-1/einsatz/upload-state.json");
    expect(() => JSON.parse(inhalt) as unknown).not.toThrow();
  });

  it("meldet einen überlappenden Spiegelungslauf nicht als Störung (§6.2, §6.3)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    platz.uhr.weiter(3);
    alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet" }));
    const [a, b] = await Promise.all([akte.spiegle(), akte.spiegle()]);
    const arten = [a.ergebnis.art, b.ergebnis.art].sort();
    expect(arten).toEqual(["laeuftBereits", "uebertragen"]);
    expect(a.reaktion).toBeUndefined();
    expect(b.reaktion).toBeUndefined();
  });

  it("unterdrückt bei einem ersetzten Segment nur Ausgang B, nicht die Prüfung selbst (§4.5 Schritt 1)", async () => {
    // §4.6 Schritt 5 sagt, **dieser** Client schreibe dort nicht mehr — ein Klon
    // tut es sehr wohl. Die Ausnahme darf deshalb nur Ausgang B unterdrücken.
    //
    // Dass eine Klon-Zeile **hinter** der Beschädigung desselben Segments
    // trotzdem unerreichbar bleibt, ist keine Lücke dieser Ausnahme, sondern
    // §8.2: „Kein Überspringen der defekten Zeile mit Weiterlesen dahinter.
    // Nach einem Kettenbruch ist nicht mehr feststellbar, ob die Folgezeilen zur
    // selben Kette gehören." Geprüft wird deshalb der Fall, der erreichbar ist:
    // Der Klon beginnt ein eigenes Segment.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    await beschaedigeShare(platz);
    const nachReparatur = await oeffneAkte(akteOptionen(platz));
    expect(nachReparatur.ergebnis.reaktion?.art).toBe("repariert");

    // Der Klon hat unter derselben Kennung ein eigenes Segment begonnen.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 7),
      baueZeile({
        id: `${ICH}:88`,
        vorgaenger: KETTE_ANFANG,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
    const { ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.befund.art).toBe("fremdschreiber");
    expect(ergebnis.reaktion?.art).toBe("kennungGewechselt");
  });

  it("schleppt beim Kennungswechsel auch keine SegmentErsetzt-Zeile mit (§2.4, §4.6)", async () => {
    // `SegmentErsetzt` nennt ein Segment des **alten** Präfixes. Stünde es am
    // Anfang der Datei der neuen Kennung, hielte `ersetzteSegmente` deren
    // laufendes Segment `0000` für ersetzt — es fiele dauerhaft aus der
    // Vollprüfung nach §4.6.1.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    // Ein Ersatzsegment, das nie gespiegelt wurde: Seine Zeilen sind alle
    // „noch nicht gespiegelt" und werden beim Wechsel mitgenommen.
    alsGeschrieben(await akte.schreiber.schreibeErsatzsegment(0, 0));

    // Der Klon beginnt ein eigenes Segment — das löst den Wechsel aus.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 7),
      baueZeile({
        id: `${ICH}:99`,
        vorgaenger: KETTE_ANFANG,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      }),
    );
    const { ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.reaktion?.art).toBe("kennungGewechselt");

    const neu = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(NEUE, 0), 0);
    const typen = leseZeilengrenzen(neu).zeilen.map((z) => z.rahmen.typ);
    expect(typen).not.toContain("SegmentErsetzt");
    expect(typen).not.toContain("SegmentAbgeschlossen");
    // Und `0000` der neuen Kennung gilt nicht als ersetzt.
    expect([...(await ersetzteSegmente(platz.dateisystem, platz.ablage, NEUE))]).toEqual([]);
  });
});
