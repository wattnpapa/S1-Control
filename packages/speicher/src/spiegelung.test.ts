import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { knotenDateisystem } from "./knotenDateisystem.js";
import { arbeitsplatz, legeEinsatzAn, spiegelungFuer } from "./pruefhilfen/aufbau.js";
import { stoerdateisystem, type Stoerung } from "./pruefhilfen/stoerdateisystem.js";
import { segmentText } from "./pfade.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import { liesSegment } from "./segmentlese.js";
import { RUECKSTAU_STAFFEL_MS } from "./startwerte.js";
import { baueZeile } from "./zeile.js";
import type { Schreiber, Schreibergebnis } from "./schreiber.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";

const kodierer = new TextEncoder();
const EINSATZ = "2026-09-08_hochwasser-sued_ab12cd";

function alsGeschrieben(ergebnis: Schreibergebnis) {
  if (ergebnis.art !== "geschrieben") {
    throw new Error(`erwartet: geschrieben, war: ${JSON.stringify(ergebnis)}`);
  }
  return ergebnis.zeile;
}

async function schreibeEreignisse(platz: Arbeitsplatz, schreiber: Schreiber, anzahl: number) {
  for (let i = 0; i < anzahl; i += 1) {
    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: i } }));
  }
}

/** Die Präfix-Invariante aus §5.4.1, als Prüfung formuliert. */
async function shareIstPraefixVonLokal(platz: Arbeitsplatz, name: string): Promise<boolean> {
  let share: Uint8Array;
  try {
    share = await platz.dateisystem.liesAb(platz.ablage.shareDatei(name), 0);
  } catch {
    return true; // Es gibt sie noch nicht — das leere Präfix ist ein Präfix.
  }
  const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalDatei(name), 0);
  if (share.byteLength > lokal.byteLength) return false;
  for (let i = 0; i < share.byteLength; i += 1) {
    if (share[i] !== lokal[i]) return false;
  }
  return true;
}

describe("Spiegelung nach §5.4", () => {
  it("überträgt die lokalen Bytes unverändert und schreibt den Offset fort", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 4);

    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    const ergebnis = await spiegelung.lauf();
    expect(ergebnis.art).toBe("uebertragen");

    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", 0), 0);
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment("9f3c1a20", 0), 0);
    expect(share).toEqual(lokal);
    expect(spiegelung.zustand.eigen["9f3c1a20.0000"]?.shareOffset).toBe(lokal.byteLength);
  });

  it("ist wiederholbar: ein zweiter Lauf ohne neue Ereignisse überträgt nichts (Idempotenz)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 3);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();
    const nachErstem = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", 0), 0);
    expect((await spiegelung.lauf()).art).toBe("uebertragen");
    const nachZweitem = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", 0), 0);
    expect(nachZweitem).toEqual(nachErstem);
  });

  it("Ausgang A: setzt nach einer abgebrochenen Übertragung mit Bruchstückzeile auf (§5.4.3)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 3);
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment("9f3c1a20", 0), 0);

    // Ein Teilschreiben auf dem Share: die ersten Bytes sind da, der Offset ist
    // nie fortgeschrieben worden (§5.4.2 — „nach einem Abbruch kann die
    // Share-Datei weiter sein als der gemerkte shareOffset").
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.shareSegment("9f3c1a20", 0),
      lokal.subarray(0, 70),
    );

    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    const ergebnis = await spiegelung.lauf();
    expect(ergebnis.art).toBe("uebertragen");
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", 0), 0);
    expect(share).toEqual(lokal);
  });

  it("überträgt Segmente aufsteigend und erst, wenn das vorhergehende vollständig ist (§5.4.4)", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20", 400);
    while (schreiber.segment < 2) {
      platz.uhr.weiter(1);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "x".repeat(120) } }));
    }
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();
    // Das Nachfolgesegment erscheint nie vor der Abschlusszeile seines
    // Vorgängers — sonst meldete §8.6.2 eine fehlende Kettenfortsetzung.
    // `vorhanden` ausdrücklich mitgeprüft: Ohne diese Zusicherung ginge der Test
    // auch dann durch, wenn die Datei gar nicht existiert — `liesSegment`
    // liefert dann eine leere Zeilenliste mit dem Abschluss „ende". Genau daran
    // blieb ein Blocker unentdeckt: Kein Segment ab Nummer 1 wurde übertragen,
    // und der Lauf meldete trotzdem „übertragen".
    const erstes = await liesSegment(platz.dateisystem, platz.ablage.shareSegment("9f3c1a20", 0), 0, KETTE_ANFANG);
    expect(erstes.vorhanden).toBe(true);
    expect(erstes.abschluss).toEqual({ art: "ende" });
    const zweites = await liesSegment(
      platz.dateisystem,
      platz.ablage.shareSegment("9f3c1a20", 1),
      0,
      erstes.letzteKette,
    );
    expect(zweites.vorhanden).toBe(true);
    expect(zweites.abschluss).toEqual({ art: "ende" });
    expect(zweites.zeilen.length).toBeGreaterThan(0);
  });

  it("überträgt auch über mehrere Segmentwechsel hinweg jedes Segment vollständig (§5.4.4)", async () => {
    // Der Fall, den ein Lauf über nur einen Wechsel nicht trifft: Ab Segment 1
    // ist der Kettenanker nicht mehr 32 Nullen (§2.3). Wer das übersieht, hält
    // jedes ältere Segment für leer, überträgt es nie und meldet Erfolg —
    // stiller Datenverlust.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20", 400);
    while (schreiber.segment < 4) {
      platz.uhr.weiter(1);
      alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "x".repeat(120) } }));
    }
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    for (let segment = 0; segment <= 4; segment += 1) {
      const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment("9f3c1a20", segment), 0);
      const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", segment), 0);
      expect(share, `Segment ${segment}`).toEqual(lokal);
      // §7.6 Bedingung 1: `shareOffset` gleich dem lokalen vollständigen Offset.
      // Bleibt er auf 0 stehen, ist die Ruhephase nie erreichbar und das
      // Abbruchkriterium von M0.4 unmessbar.
      expect(spiegelung.zustand.eigen[`9f3c1a20.${segmentText(segment)}`]?.shareOffset, `Offset ${segment}`).toBe(
        lokal.byteLength,
      );
    }
  });
});

describe("Präfix-Invariante aus §5.4.1", () => {
  it("hält über beliebig verschränkte Schreib-, Bruchstück-, Neustart- und Spiegelungsläufe", async () => {
    // Zwei Schritte machen diese Eigenschaft erst zu einer: „bruchstueck" legt
    // eine halb geschriebene Zeile ans lokale Dateiende — der Kill mitten im
    // Append —, und „neustart" kürzt sie nach §8.1 wieder weg. Solange nur
    // vollständige Zeilen entstehen, ist jede Spiegelung trivial ein Präfix;
    // erst diese beiden zusammen erzeugen den Gegenfall aus §5.4.1: Ein Lauf
    // nimmt eine gerade entstehende Zeile mit, der Rechner stürzt ab, die
    // lokale Datei wird gekürzt — und die Share-Datei wäre **länger** als die
    // lokale. Der Vergleich fände dann fremde Bytes an einer Stelle, an der es
    // lokal keine gibt, und meldete dem Bediener nach einem gewöhnlichen
    // Absturz, sein Benutzerprofil sei kopiert worden.
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.constant("schreiben"),
            fc.constant("schreiben"),
            fc.constant("spiegeln"),
            fc.constant("bruchstueck"),
            fc.constant("neustart"),
          ),
          { minLength: 6, maxLength: 24 },
        ),
        async (plan) => {
          await using platz = await arbeitsplatz();
          await legeEinsatzAn(platz, EINSATZ);
          let schreiber = await platz.oeffne("9f3c1a20", 500);
          let spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
          let bruchstueckOffen = false;

          const pruefeInvariante = async () => {
            for (const name of await platz.dateisystem.listeVerzeichnis(platz.ablage.lokalEreignisse)) {
              expect(await shareIstPraefixVonLokal(platz, name), name).toBe(true);
            }
          };

          for (const schritt of plan) {
            if (schritt === "schreiben" && !bruchstueckOffen) {
              platz.uhr.weiter(2);
              await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { f: "y".repeat(60) } });
            } else if (schritt === "bruchstueck" && !bruchstueckOffen) {
              await platz.dateisystem.haengeAnUndSynchronisiere(
                platz.ablage.lokalSegment("9f3c1a20", schreiber.segment),
                kodierer.encode('742\tcafebabe\t{"id":"9f3c1a20:'),
              );
              bruchstueckOffen = true;
            } else if (schritt === "neustart") {
              // §8.1: Der Schreiber kürzt sein eigenes letztes Segment auf die
              // letzte vollständige, kettenrichtige Zeile.
              schreiber = await platz.oeffne("9f3c1a20", 500);
              spiegelung = spiegelungFuer(platz, schreiber, EINSATZ, spiegelung.zustand);
              bruchstueckOffen = false;
            } else if (schritt === "spiegeln") {
              const ergebnis = await spiegelung.lauf();
              // Weder Ausgang B noch C dürfen hier auftreten — ein Bruchstück
              // am lokalen Ende und ein Neustart sind Normalbetrieb.
              expect(ergebnis.art).toBe("uebertragen");
            }
            await pruefeInvariante();
          }
        },
      ),
      { numRuns: 40 },
    );
  });

  it("hält auch über einen Absturz mitten im Append hinweg", async () => {
    // Der Gegenfall aus §5.4.1: Ein Lauf nimmt eine gerade entstehende Zeile
    // mit, der Rechner stürzt ab, die lokale Datei wird gekürzt — und die
    // Share-Datei wäre länger als die lokale. Genau das schließt die Regel
    // „nur bis zur letzten vollständigen Zeile" aus.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const erster = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, erster, 3);
    const spiegelung = spiegelungFuer(platz, erster, EINSATZ);
    await spiegelung.lauf();

    // Bruchstück lokal anhängen (Kill mitten im Append) und erneut spiegeln.
    await platz.dateisystem.haengeAnUndSynchronisiere(
      platz.ablage.lokalSegment("9f3c1a20", 0),
      kodierer.encode('418\tdeadbeef\t{"id":"9f3c1a20:4"'),
    );
    expect((await spiegelung.lauf()).art).toBe("uebertragen");
    expect(await shareIstPraefixVonLokal(platz, "9f3c1a20.0000.jsonl")).toBe(true);

    // Neustart: lokal wird gekürzt (§8.1). Die Share-Datei überlebt das, weil
    // das Bruchstück nie übertragen wurde.
    const zweiter = await platz.oeffne("9f3c1a20");
    expect(await shareIstPraefixVonLokal(platz, "9f3c1a20.0000.jsonl")).toBe(true);
    const spiegelung2 = spiegelungFuer(platz, zweiter, EINSATZ, spiegelung.zustand);
    const ergebnis = await spiegelung2.lauf();
    // Und zwar ohne die Meldung „Ihr Profil wurde kopiert".
    expect(ergebnis.art).toBe("uebertragen");
  });
});

describe("Die drei Ausgänge aus §5.4.3", () => {
  /** Setzt den gemerkten Offset zurück — der Fall „Share weiter als shareOffset" aus §5.4.2. */
  function offsetZurueck(zustand: ReturnType<typeof spiegelungFuer>["zustand"], bis: number) {
    return {
      ...zustand,
      eigen: { ...zustand.eigen, "9f3c1a20.0000": { shareOffset: bis, letzteKette: KETTE_ANFANG } },
    };
  }

  it("Ausgang B: gekippte Bytes ohne fremde Schreibspur führen zur Reparatur, nicht zum Kennungswechsel", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 4);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    // Ein gekipptes Byte auf dem Share, und der Offset steht wieder am Anfang.
    const roh = await platz.wiese.lies("share/einsatz/ereignisse/9f3c1a20.0000.jsonl");
    roh[roh.byteLength - 8] = (roh[roh.byteLength - 8] as number) ^ 0x01;
    await platz.wiese.schreibe("share/einsatz/ereignisse/9f3c1a20.0000.jsonl", roh);

    const zweite = spiegelungFuer(platz, schreiber, EINSATZ, offsetZurueck(spiegelung.zustand, 0));
    const ergebnis = await zweite.lauf();
    expect(ergebnis.art).toBe("beschaedigt");
    if (ergebnis.art !== "beschaedigt") throw new Error("unerreichbar");
    expect(ergebnis.meldung).toContain("beschädigt");
    expect(ergebnis.meldung).not.toContain("kopiert");
  });

  it("Ausgang B: eine unlesbare Zeile stützt B, nicht C — der Zweifel geht zugunsten der Reparatur aus", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 3);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    // Das Längenfeld der ersten Zeile verfälschen: die Zeile ist damit weder
    // lesbar noch einer Identität zuzuordnen (§5.4.3, letzter Absatz).
    const roh = await platz.wiese.lies("share/einsatz/ereignisse/9f3c1a20.0000.jsonl");
    roh[0] = 0x39;
    await platz.wiese.schreibe("share/einsatz/ereignisse/9f3c1a20.0000.jsonl", roh);

    const zweite = spiegelungFuer(platz, schreiber, EINSATZ, offsetZurueck(spiegelung.zustand, 0));
    expect((await zweite.lauf()).art).toBe("beschaedigt");
  });

  it("Ausgang C, asymmetrisch: eine lokal unbekannte Identität ist eine fremde Schreibspur", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 3);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    // Der Klon hat unter derselben Kennung weitergeschrieben.
    const fremd = baueZeile({
      id: "9f3c1a20:99",
      vorgaenger: spiegelung.zustand.eigen["9f3c1a20.0000"]?.letzteKette as string,
      typ: "EinheitGemeldet",
      schemaVersion: 1,
      nutzlast: { vomKlon: true },
    });
    await platz.dateisystem.haengeAnUndSynchronisiere(platz.ablage.shareSegment("9f3c1a20", 0), fremd);

    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 4 } }));
    const ergebnis = await spiegelung.lauf();
    expect(ergebnis.art).toBe("fremdeSchreibspur");
    if (ergebnis.art !== "fremdeSchreibspur") throw new Error("unerreichbar");
    expect(ergebnis.id).toBe("9f3c1a20:99");
    expect(ergebnis.meldung).toContain("kopiert");
  });

  it("Ausgang C, symmetrisch: dieselbe Laufnummer für ein anderes Ereignis (§4.5 Schritt 4)", async () => {
    // Die Lage, die ein reiner Zahlenvergleich („größer als die eigene")
    // übersähe: Beide Kopien laufen gleich weit und vergeben dieselbe Nummer.
    // Dann trügen zwei verschiedene Ereignisse dieselbe Identität, und
    // Auflage 8 wäre im Kern verletzt.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 2);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    // Der Klon schreibt genau die nächste Nummer — dieselbe, die dieser Client
    // gleich vergibt —, aber mit anderem Inhalt.
    const klonzeile = baueZeile({
      id: "9f3c1a20:3",
      vorgaenger: spiegelung.zustand.eigen["9f3c1a20.0000"]?.letzteKette as string,
      typ: "EinheitGemeldet",
      schemaVersion: 1,
      nutzlast: { n: 999 },
    });
    await platz.dateisystem.haengeAnUndSynchronisiere(platz.ablage.shareSegment("9f3c1a20", 0), klonzeile);

    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet", nutzlast: { n: 2 } }));
    const ergebnis = await spiegelung.lauf();
    expect(ergebnis.art).toBe("fremdeSchreibspur");
    if (ergebnis.art !== "fremdeSchreibspur") throw new Error("unerreichbar");
    expect(ergebnis.id).toBe("9f3c1a20:3");
  });

  it("Ausgang A: eine wiederholte Zeile derselben Identität mit gleichem Inhalt ist kein Widerspruch", async () => {
    // Der Gegenprobe halber: Wäre der Vergleich byteweise statt „Rahmen ohne
    // vorgaenger" (§4.6), fiele dieser Fall fälschlich in Ausgang C.
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 2);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();
    const share = await platz.dateisystem.liesAb(platz.ablage.shareSegment("9f3c1a20", 0), 0);
    const lokal = await platz.dateisystem.liesAb(platz.ablage.lokalSegment("9f3c1a20", 0), 0);
    expect(share).toEqual(lokal);
  });
});

describe("Ordnerverschiebung nach §5.7", () => {
  it("hält die Spiegelung an, statt den Ordner neu anzulegen", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 2);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    await spiegelung.lauf();

    // Der Ordner wird verschoben: `einsatz.json` ist fort.
    await platz.dateisystem.loesche(platz.ablage.shareEinsatzDatei);
    await platz.dateisystem.loesche(platz.ablage.shareSegment("9f3c1a20", 0));

    platz.uhr.weiter(3);
    alsGeschrieben(await schreiber.schreibe({ typ: "EinheitGemeldet" }));
    const ergebnis = await spiegelung.lauf();
    expect(ergebnis.art).toBe("ordnerFort");
    // Nichts wurde neu angelegt — der Upload lief nicht ins Leere.
    expect(await platz.dateisystem.listeVerzeichnis(platz.ablage.shareEreignisse)).toEqual([]);
  });

  it("hält auch an, wenn dort ein anderer Einsatz liegt", async () => {
    await using platz = await arbeitsplatz();
    await legeEinsatzAn(platz, "2026-09-08_anderer_ff00aa");
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 1);
    const ergebnis = await spiegelungFuer(platz, schreiber, EINSATZ).lauf();
    expect(ergebnis.art).toBe("ordnerFort");
  });
});

describe("Rückstau und Fehlerklassen (§5.4.4, §8.9)", () => {
  it("staffelt vorübergehende Fehler nach 2 / 5 / 15 / 30 s", async () => {
    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "ETIMEDOUT", malen: Infinity, pfadEnthaelt: "share" },
    ];
    await using platz = await arbeitsplatz(stoerdateisystem(knotenDateisystem(), stoerungen));
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 2);
    const spiegelung = spiegelungFuer(platz, schreiber, EINSATZ);
    for (const erwartet of RUECKSTAU_STAFFEL_MS) {
      const ergebnis = await spiegelung.lauf();
      expect(ergebnis.art).toBe("gescheitert");
      if (ergebnis.art !== "gescheitert") throw new Error("unerreichbar");
      expect(ergebnis.klasse).toBe("voruebergehend");
      expect(ergebnis.naechsterVersuchMs).toBe(erwartet);
    }
    // Danach bleibt es beim langsamsten Takt.
    const weiter = await spiegelung.lauf();
    expect(weiter.art === "gescheitert" && weiter.naechsterVersuchMs).toBe(30_000);
    expect(spiegelung.ausfallSeit).toBeDefined();
  });

  it("geht bei entzogenem Schreibrecht sofort auf den langsamsten Takt und meldet den Grund", async () => {
    const stoerungen: Stoerung[] = [
      { aufruf: "haengeAnUndSynchronisiere", code: "EACCES", malen: Infinity, pfadEnthaelt: "share" },
    ];
    await using platz = await arbeitsplatz(stoerdateisystem(knotenDateisystem(), stoerungen));
    await legeEinsatzAn(platz, EINSATZ);
    const schreiber = await platz.oeffne("9f3c1a20");
    await schreibeEreignisse(platz, schreiber, 2);
    const ergebnis = await spiegelungFuer(platz, schreiber, EINSATZ).lauf();
    expect(ergebnis.art).toBe("gescheitert");
    if (ergebnis.art !== "gescheitert") throw new Error("unerreichbar");
    expect(ergebnis.klasse).toBe("dauerhaft");
    expect(ergebnis.naechsterVersuchMs).toBe(30_000);
    // §8.9: Die Anzeige trennt den Zustand von der Erreichbarkeit.
    expect(ergebnis.meldung).toContain("kein Schreibrecht");
  });
});
