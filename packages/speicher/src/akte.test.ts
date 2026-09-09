import { describe, expect, it } from "vitest";

import { HlcUhr } from "@s1/domaene";

import { oeffneAkte, reparaturAnsatz, type AkteOptionen } from "./akte.js";
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

/** Alle Ereignis-Identitäten, die lokal überhaupt noch irgendwo stehen. */
async function lokaleIdentitaeten(platz: Arbeitsplatz): Promise<readonly string[]> {
  const namen = await platz.dateisystem.listeVerzeichnis(platz.ablage.lokalEreignisse);
  const ids: string[] = [];
  for (const name of namen) {
    const bytes = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(name), 0);
    ids.push(...leseZeilengrenzen(bytes, 0).zeilen.map((z) => z.rahmen.id));
  }
  return ids;
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
    // `SegmentErsetzt` sagt, dass **die Datei, in der die Zeile steht**, der
    // Ersatz eines anderen Segments ist (§4.6 Schritt 2). Am Anfang der Datei
    // der neuen Kennung ist das falsch: Sie ist ein gewöhnliches erstes
    // Segment, und `kettenanker` suchte ihren Anker mitten im genannten Vorbild
    // statt am Kettenanfang. Seit Entscheidung 17 nennt die Nutzlast auch das
    // Präfix — an dieser Aussage ändert das nichts.
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
    // Und `0000` der neuen Kennung gilt nicht als ersetzt — auch dann nicht,
    // wenn die aufgegebene Kennung mitgelesen wird (Entscheidung 17). Ersetzt
    // ist allein `0000` der **alten** Kennung, denn deren Ersatzsegment steht
    // dort weiterhin.
    expect([...(await ersetzteSegmente(platz.dateisystem, platz.ablage, NEUE))]).toEqual([]);
    // Die aufgegebenen Dateien sind hier gelöscht — sie lagen nie auf dem
    // Share, und ihr Inhalt ist beim Wechsel vollständig übernommen worden
    // (siehe `#kuerzeAufShareStand`). Auch mit mitgelesener alter Kennung
    // (Entscheidung 17) gilt deshalb nichts als ersetzt.
    expect([
      ...(await ersetzteSegmente(platz.dateisystem, platz.ablage, NEUE, [ICH])).keys(),
    ]).toEqual([]);
  });
  it("verliert beim Öffnen nichts, was ein abgebrochener Kennungswechsel nicht übernommen hat (§4.5 Schritt 3, §8.8)", async () => {
    // Der Weg: Der Kennungswechsel bricht beim Übernehmen der ungespiegelten
    // Zeilen an einer lokalen Schreibstörung ab (§8.8, Reaktion
    // `kennungswechselUnvollstaendig`). Die Zeilen stehen danach **nur** in der
    // aufgegebenen Datei — nicht auf dem Share (sie waren ungespiegelt) und
    // nicht unter der neuen Kennung (die Übernahme kam nicht dazu). Das
    // Nachholen der Kürzung beim nächsten Öffnen (§4.5 Schritt 6) darf sie
    // deshalb nicht wegschneiden.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const stoerungen: Stoerung[] = [];
    const { akte } = await oeffneAkte({
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
    });
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();

    // Drei Ereignisse, die der Share nie gesehen hat.
    const ungespiegelt: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      ungespiegelt.push(
        alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }))
          .rahmen.id,
      );
    }

    // Der Klon zwingt den Wechsel (§4.5).
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
    // …und die Übernahme scheitert an der ersten Zeile.
    stoerungen.push({
      aufruf: "haengeAnUndSynchronisiere",
      code: "ENOSPC",
      malen: Infinity,
      pfadEnthaelt: `${NEUE}.0000`,
    });
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungswechselUnvollstaendig");
    // Bis hierher ist nichts verloren — die Meldung sagt genau das zu.
    expect(await lokaleIdentitaeten(platz)).toEqual(expect.arrayContaining(ungespiegelt));

    // Der nächste Start — ohne Störung, und unter der Kennung, die der
    // Wechsel hinterlassen hat.
    stoerungen.length = 0;
    await oeffneAkte(akteOptionen(platz, NEUE));

    // Nichts verloren: Die drei stehen weiterhin lokal …
    expect(await lokaleIdentitaeten(platz)).toEqual(expect.arrayContaining(ungespiegelt));
    // … und zwar dort, wo §4.5 Schritt 3 sie hinschreiben wollte, mit
    // unveränderter Identität.
    const neueDatei = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(NEUE, 0), 0);
    expect(leseZeilengrenzen(neueDatei, 0).zeilen.map((z) => z.rahmen.id)).toEqual(ungespiegelt);
    // Und §4.5 Schritt 6 ist trotzdem erfüllt — der Spiegel der aufgegebenen
    // Datei ist wieder ein Präfix ihrer Share-Entsprechung (§8.6.1 Regel 4).
    const spiegel = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    const shareAlt = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(spiegel.byteLength).toBeLessThan(shareAlt.byteLength);
    expect(shareAlt.subarray(0, spiegel.byteLength)).toEqual(spiegel);
  });

  it("kürzt die aufgegebene Datei nicht, solange das Nachholen scheitert (§8.8)", async () => {
    // Der Gegenprobe-Fall: Geht das Nachholen der Übernahme nicht, darf die
    // Kürzung **nicht** trotzdem laufen. §8.8 verlangt eine sichtbare
    // Abweisung und den erneuten Versuch beim nächsten Öffnen — nicht den
    // Verlust.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const stoerungen: Stoerung[] = [];
    const gestoert = stoerdateisystem(platz.dateisystem, stoerungen);
    const { akte } = await oeffneAkte({ ...akteOptionen(platz), dateisystem: gestoert });
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const ungespiegelt: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      platz.uhr.weiter(3);
      ungespiegelt.push(
        alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }))
          .rahmen.id,
      );
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
    stoerungen.push({
      aufruf: "haengeAnUndSynchronisiere",
      code: "ENOSPC",
      malen: Infinity,
      pfadEnthaelt: `${NEUE}.0000`,
    });
    expect((await akte.spiegle()).reaktion?.art).toBe("kennungswechselUnvollstaendig");

    // Das Öffnen läuft gegen dieselbe Störung.
    const vorher = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    await oeffneAkte({ ...akteOptionen(platz, NEUE), dateisystem: gestoert });
    const nachher = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(nachher.byteLength).toBe(vorher.byteLength);
    expect(await lokaleIdentitaeten(platz)).toEqual(expect.arrayContaining(ungespiegelt));
  });
});

describe("§4.6 setzt an der Lesbarkeitsgrenze an (Entscheidung 16a)", () => {
  /** Der Offset, ab dem das Ersatzsegment übernommen hat — aus seiner ersten Zeile. */
  async function uebernahmeAb(platz: Arbeitsplatz, segment: number): Promise<number> {
    const bytes = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, segment), 0);
    const erste = leseZeilengrenzen(bytes, 0).zeilen[0];
    if (erste === undefined) throw new Error("Ersatzsegment ist leer");
    const nutzlast = erste.rahmen["nutzlast"] as { readonly abOffset: number };
    return nutzlast.abOffset;
  }

  /** Schreibt `anzahl` Ereignisse, spiegelt und beschädigt die `zeile`-te Share-Zeile. */
  async function standMitBeschaedigung(platz: Arbeitsplatz, anzahl: number, zeile: number) {
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < anzahl; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    const pfad = `share/einsatz/ereignisse/${ICH}.0000.jsonl`;
    const roh = await platz.wiese.lies(pfad);
    const ziel = leseZeilengrenzen(roh, 0).zeilen[zeile];
    if (ziel === undefined) throw new Error("zu wenige Zeilen");
    const stelle = ziel.offset + Math.floor(ziel.laenge / 2);
    roh[stelle] = (roh[stelle] as number) ^ 0x01;
    await platz.wiese.schreibe(pfad, roh);
    // Die Lesbarkeitsgrenze ist damit der Anfang der beschädigten Zeile.
    return { grenze: ziel.offset };
  }

  it("nimmt die Lesbarkeitsgrenze, wenn die gemeldete Stelle dahinter liegt", async () => {
    // Der Kern der Entscheidung. Die gemeldete Stelle stammt im Spiegelpfad
    // aus `upload-state.json` und liegt hinter der Beschädigung; alles
    // dazwischen wäre für jeden Leser fort.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { grenze } = await standMitBeschaedigung(platz, 8, 3);
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    expect(grenze).toBeGreaterThan(0);
    expect(reparaturAnsatz(share.byteLength, share)).toBe(grenze);
    // Liegt die gemeldete Stelle davor, bleibt sie stehen: Sie ist die
    // schärfere Angabe.
    expect(reparaturAnsatz(0, share)).toBe(0);
    // Ohne lesbare Datei bleibt es bei der gemeldeten Stelle.
    expect(reparaturAnsatz(4711, undefined)).toBe(4711);
  });

  it("setzt den Ersatz nicht hinter der Lesbarkeitsgrenze an", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { grenze } = await standMitBeschaedigung(platz, 8, 3);
    const { ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.reaktion?.art).toBe("repariert");
    expect(await uebernahmeAb(platz, 1)).toBeLessThanOrEqual(grenze);
  });

  it("führt zu jedem ersetzten Segment die Stelle mit, ab der der Ersatz gilt", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const { grenze } = await standMitBeschaedigung(platz, 8, 3);
    await oeffneAkte(akteOptionen(platz));

    // Nicht bloß „Segment 0 ist ersetzt", sondern ab welchem Offset. Ohne
    // diese Angabe bliebe eine spätere Beschädigung davor unrepariert.
    const ersetzt = await ersetzteSegmente(platz.dateisystem, platz.ablage, ICH);
    const ab = await uebernahmeAb(platz, 1);
    expect(ab).toBeGreaterThan(0);
    expect(ab).toBeLessThanOrEqual(grenze);
    expect(ersetzt.get(`${ICH}.0000.jsonl`)).toBe(ab);
  });
});

describe("Was der Kennungswechsel den älteren Kennungen antut (Befund 7.6)", () => {
  it("liest den Klon noch in derselben Sitzung, wenn die Kürzung aussteht", async () => {
    // `gleicheMitSpiegelAb` setzt den `leseOffset` der aufgegebenen Datei auf
    // ihre volle lokale Länge (§5.5: der Spiegel ist „ihr geprüftes Präfix").
    // Steht die Kürzung noch aus, ist sie länger als das Share-Ende — der
    // Leser käme an die Zeilen des Klons bis zum nächsten Programmstart nicht
    // mehr heran. Befund 7.6 des Messprotokolls, hergeleitet.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const stoerungen: Stoerung[] = [];
    const { akte } = await oeffneAkte({
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
    });
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();
    // Zwei ungespiegelte Zeilen — sie machen den lokalen Spiegel länger als
    // das Share-Ende.
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 10 + i } }));
    }

    // Der Klon zwingt den Wechsel …
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
    // … und die Kürzung der aufgegebenen Datei scheitert (§8.8).
    stoerungen.push({
      aufruf: "kuerzeAuf",
      code: "EIO",
      malen: Infinity,
      pfadEnthaelt: `${ICH}.0000`,
    });
    const { reaktion } = await akte.spiegle();
    expect(reaktion?.art).toBe("kennungGewechselt");

    // Der Leseoffset steht **nicht** hinter dem Share-Ende: Er endet dort, wo
    // lokaler Spiegel und Share-Datei auseinanderlaufen.
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment(ICH, 0), 0);
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment(ICH, 0), 0);
    expect(lokal.byteLength).toBeGreaterThan(share.byteLength);
    const lage = akte.leser.zustand.fremd[`${ICH}.0000`];
    if (lage === undefined) throw new Error("keine Lage für die aufgegebene Datei");
    expect(lage.leseOffset).toBeLessThan(lokal.byteLength);
    expect(lage.leseOffset).toBeLessThanOrEqual(share.byteLength);
  });

  it("löscht die Datei einer älteren Kennung nicht, die die Übernahme nie berührt hat", async () => {
    // `#wechsleKennung` übergab **alle** früheren Kennungen mit der
    // Gewissheit, ihr Inhalt stehe „nachweislich anderswo". Gesammelt werden
    // aber nur die Zeilen des **gerade** aufgegebenen Präfixes. Für eine
    // ältere Kennung, deren Übernahme seinerzeit nach §8.8 abgebrochen ist,
    // gilt die Gewissheit nicht — und ihre nie gespiegelte Datei wurde beim
    // nächsten Wechsel gelöscht. Ihre Zeilen stehen dann nirgends mehr.
    // Befund 7.6, hergeleitet.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const ZWEI = "22222222";
    const DREI = "33333333";
    const kennungen = [ZWEI, DREI];
    const stoerungen: Stoerung[] = [];
    const { akte } = await oeffneAkte({
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
      neueKennung: () => kennungen.shift() ?? DREI,
    });

    // Zwei Zeilen unter ICH, die der Share nie gesehen hat.
    const nurLokal: string[] = [];
    for (let i = 0; i < 2; i += 1) {
      platz.uhr.weiter(3);
      nurLokal.push(
        alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } })).rahmen
          .id,
      );
    }

    /** Der Klon beginnt ein eigenes Segment — das zwingt den Wechsel (§4.5 Schritt 1). */
    async function klonBeginntSegment(unter: string, nummer: number) {
      await platz.dateisystem.haengeAnUndSynchronisiere(
        platz.ablage.shareSegment(unter, 7),
        baueZeile({
          id: `${unter}:${nummer}`,
          vorgaenger: KETTE_ANFANG,
          typ: "EinheitGemeldet",
          schemaVersion: 1,
          nutzlast: { vomKlon: true },
        }),
      );
    }

    // Erster Wechsel — und die Übernahme bricht an einer lokalen
    // Schreibstörung ab (§8.8). Die zwei Zeilen bleiben allein in `ICH.0000`.
    await klonBeginntSegment(ICH, 77);
    stoerungen.push({
      aufruf: "haengeAnUndSynchronisiere",
      code: "ENOSPC",
      malen: Infinity,
      pfadEnthaelt: `${ZWEI}.0000`,
    });
    // §4.5 Schritt 1 („alle eigenen Segmente") wird beim **Öffnen** geprüft.
    const ersteroeffnung = await oeffneAkte({
      ...akteOptionen(platz),
      dateisystem: stoerdateisystem(platz.dateisystem, stoerungen),
      neueKennung: () => kennungen.shift() ?? DREI,
    });
    expect(ersteroeffnung.ergebnis.reaktion?.art).toBe("kennungswechselUnvollstaendig");
    stoerungen.length = 0;

    // Zweiter Wechsel: ZWEI wird aufgegeben, DREI übernimmt. ICH ist jetzt
    // eine **ältere** Kennung, die diese Übernahme nie berührt hat — und
    // `ICH.0000` hat keine Entsprechung auf dem Share.
    platz.uhr.weiter(3);
    alsGeschrieben(
      await ersteroeffnung.akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 9 } }),
    );
    await klonBeginntSegment(ZWEI, 88);
    const zweite = await oeffneAkte({
      ...akteOptionen(platz, ZWEI),
      neueKennung: () => kennungen.shift() ?? DREI,
    });
    expect(["kennungGewechselt", "kennungswechselUnvollstaendig"]).toContain(
      zweite.ergebnis.reaktion?.art,
    );

    // Die zwei Zeilen stehen noch — sonst wären sie fort.
    expect(await lokaleIdentitaeten(platz)).toEqual(expect.arrayContaining(nurLokal));
  });
});

describe("Reparatur in der Datei einer aufgegebenen Kennung (Entscheidung 17, Richtung B)", () => {
  /**
   * Treibt einen Arbeitsplatz in den Kennungswechsel und lässt seine alte
   * Datei **gespiegelt** zurück.
   *
   * Das Spiegeln vor dem Wechsel ist der Punkt: Nur eine Datei, die auf dem
   * Share liegt, kann dort beschädigt werden — und nur sie überlebt den
   * Wechsel lokal (`#kuerzeAufShareStand` löscht die nie gespiegelte).
   */
  async function nachKennungswechsel(platz: Arbeitsplatz) {
    const { akte } = await oeffneAkte(akteOptionen(platz));
    for (let i = 0; i < 8; i += 1) {
      platz.uhr.weiter(3);
      alsGeschrieben(await akte.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
    }
    await akte.spiegle();

    // Der Klon beginnt ein eigenes Segment — das löst den Wechsel nach §4.5
    // Fall 2 aus.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 7),
      baueZeile({
        id: `${ICH}:99`,
        vorgaenger: KETTE_ANFANG,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      } as never),
    );
    const { ergebnis } = await oeffneAkte(akteOptionen(platz));
    expect(ergebnis.reaktion?.art).toBe("kennungGewechselt");
  }

  /** Kippt ein Bit in der genannten Zeile der Share-Datei der alten Kennung. */
  async function beschaedigeAlteDatei(platz: Arbeitsplatz, zeile: number) {
    const pfad = `share/einsatz/ereignisse/${ICH}.0000.jsonl`;
    const roh = await platz.wiese.lies(pfad);
    const ziel = leseZeilengrenzen(roh, 0).zeilen[zeile];
    if (ziel === undefined) throw new Error("zu wenige Zeilen");
    const stelle = ziel.offset + Math.floor(ziel.laenge / 2);
    roh[stelle] = (roh[stelle] as number) ^ 0x01;
    await platz.wiese.schreibe(pfad, roh);
    return { grenze: ziel.offset, verloreneIds: leseZeilengrenzen(roh, 0).zeilen.slice(zeile).map((z) => z.rahmen.id) };
  }

  it("entdeckt und repariert eine Beschädigung unter der aufgegebenen Kennung", async () => {
    // Der Befund aus Startwert 12345 (Messprotokoll 7.7): Die Zeilen hinter
    // der Beschädigung sind für jeden Leser fort, obwohl dieser Rechner sie
    // vollständig hat. §4.5 Schritt 6 macht die Datei fürs Lesen fremd; für
    // die **Prüfung** bleibt sie eigen.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await nachKennungswechsel(platz);
    const { verloreneIds } = await beschaedigeAlteDatei(platz, 4);

    const { akte, ergebnis } = await oeffneAkte(akteOptionen(platz, NEUE));
    expect(ergebnis.befund.art).toBe("beschaedigt");
    if (ergebnis.befund.art !== "beschaedigt") throw new Error("unerreichbar");
    // Die beschädigte Datei ist die der **alten** Kennung.
    expect(ergebnis.befund.praefix).toBe(ICH);
    expect(ergebnis.reaktion?.art).toBe("repariert");
    if (ergebnis.reaktion?.art !== "repariert") throw new Error("unerreichbar");
    expect(ergebnis.reaktion.praefix).toBe(ICH);

    // §4.6, „Die lokale Seite", Punkt 1: erst lokal, dann übertragen. Ein
    // Leser sieht das Ersatzsegment erst nach dem Spiegelungslauf.
    await akte.spiegle();

    // Repariert wird durch ein Ersatzsegment unter der **neuen** Kennung —
    // „ein Schreiber je Datei" bleibt unangetastet.
    const namen = await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse);
    const ersatzNamen = namen.filter((n) => n.startsWith(`${NEUE}.`));
    expect(ersatzNamen.length).toBeGreaterThan(0);

    // Und die verlorenen Zeilen stehen dort wieder — lesbar, unter
    // unveränderter Identität (§4.6 Schritt 4).
    const wiederLesbar = new Set<string>();
    for (const name of ersatzNamen) {
      const bytes = await platz.dateisystem.liesAb(platz.ablage.shareDatei(name), 0);
      for (const z of leseZeilengrenzen(bytes, 0).zeilen) wiederLesbar.add(z.rahmen.id);
    }
    for (const id of verloreneIds) expect(wiederLesbar.has(id)).toBe(true);
  });

  it("nennt in der Kopfzeile das Präfix des ersetzten Segments", async () => {
    // Ohne das Präfix hielte `ersetzteSegmente` das Segment `0000` der
    // **neuen** Kennung für ersetzt: Es fiele dauerhaft aus der Vollprüfung
    // nach §4.6.1, und eine Beschädigung dort bliebe für immer liegen.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await nachKennungswechsel(platz);
    await beschaedigeAlteDatei(platz, 4);
    await oeffneAkte(akteOptionen(platz, NEUE));

    const ersetzt = await ersetzteSegmente(platz.dateisystem, platz.ablage, NEUE, [ICH]);
    expect([...ersetzt.keys()]).toEqual([`${ICH}.0000.jsonl`]);
    expect(ersetzt.has(`${NEUE}.0000.jsonl`)).toBe(false);
  });

  it("hält ein Öffnen nach der Reparatur für in Ordnung — keine zweite Runde", async () => {
    // §4.6 Schritt 5: „Es wird nicht mehr beschrieben." Ohne die Auskunft aus
    // `ersetzteSegmente` erzeugte jedes weitere Öffnen ein neues
    // Ersatzsegment — eine Dauerstörung statt einer Heilung.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await nachKennungswechsel(platz);
    await beschaedigeAlteDatei(platz, 4);
    const { akte } = await oeffneAkte(akteOptionen(platz, NEUE));
    await akte.spiegle();
    const vorher = (await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse)).length;

    const { ergebnis } = await oeffneAkte(akteOptionen(platz, NEUE));
    expect(ergebnis.befund.art).not.toBe("beschaedigt");
    expect((await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse)).length).toBe(
      vorher,
    );
  });

  it("meldet keine Beschädigung, wenn der Klon in der alten Datei bloß weiterschreibt", async () => {
    // Der Gegenfall, an dem der Weg scheitern würde. §4.5 Schritt 6: Die alte
    // Datei ist „der Spiegel einer fremden Datei — nämlich der des Klons".
    // Dass auf dem Share mehr steht als lokal, ist dort der vorgesehene
    // Zustand und keine Beschädigung; ein Ersatzsegment dafür wiederholte
    // Zeilen, die dieser Client gar nicht hat.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    await nachKennungswechsel(platz);
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment(ICH, 0),
      baueZeile({
        id: `${ICH}:1234`,
        vorgaenger: KETTE_ANFANG,
        typ: "EinheitGemeldet",
        schemaVersion: 1,
        nutzlast: { vomKlon: true },
      } as never),
    );

    const { ergebnis } = await oeffneAkte(akteOptionen(platz, NEUE));
    expect(ergebnis.befund.art).toBe("inOrdnung");
  });
});
