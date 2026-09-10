/**
 * Funktionalität: eine vollständige Übung (M8.4).
 *
 * **Was dieser Lauf ist und was er nicht ist.** Er ist der Nachweis, dass die
 * Strecke trägt: eine Lage von der Einsatzanlage bis zur letzten Ausgabe, auf
 * zwei Arbeitsplätzen, über echte Dateien. Er ist **nicht** die Abnahmeübung
 * aus F1 der Abnahmeliste — die verlangt drei bis vier Rechner, ein NAS und
 * zwei Stunden mit Menschen daran. Was ein Baum leisten kann, ist das
 * Drehbuch (`docs/v2/UEBUNG.md`) und dieser Lauf, der es abfährt.
 *
 * **Warum ein Test und nicht ein Skript.** Ein Skript, das durchläuft, sagt
 * nichts; erst die Behauptungen dazwischen sagen etwas. Und ein Skript
 * verrottet, weil es niemand ausführt — dieser Lauf ist bei jedem Commit
 * dabei.
 *
 * **Die Behauptung, auf die alles zuläuft**, steht am Ende: Beide
 * Arbeitsplätze führen denselben `zustandsHash` (§7.6). Das ist dieselbe
 * Aussage, die `s1 akte pruefe --vergleiche` nach der echten Übung trifft —
 * und die Zeile F3 der Abnahmeliste.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  kennzahlen,
  projektion,
  zustandsHash,
  type KanonischerWert,
} from "@s1/domaene";
import { sha256Hex } from "@s1/speicher";

import {
  anforderungAnlegen,
  abloesungZugesagt,
  anforderungErledigt,
  dienstpostenAnlegen,
  dienstpostenBesetzt,
  schichtplanEintrag,
} from "../kontrakt/bedienschritte.js";
import { raeumeAuf, takteBis, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Der Übungstag; alle Zeitpunkte hängen an ihm und nicht an der Systemuhr. */
const JETZT = Date.now();
const inStunden = (stunden: number): string => new Date(JETZT + stunden * 3_600_000).toISOString();
const vorStunden = (stunden: number): string => inStunden(-stunden);
const TAG = new Date(JETZT).toISOString().slice(0, 10);

function hashVon(platz: Platz): string {
  return zustandsHash(platz.dienst.zustand as unknown as KanonischerWert, sha256Hex);
}

// ---------------------------------------------------------------------------
// Die Schritte des Drehbuchs
// ---------------------------------------------------------------------------

async function schrittEinsatzAnlegen(platz: Platz): Promise<void> {
  await platz.dienst.bediene({
    typ: "EinsatzAngelegt",
    nutzlast: {
      einsatzId: "2026-09-10-hochwasser-weser-ems",
      name: "Übung Deichverteidigung",
      art: "UEBUNG",
      fuestName: "FueSt Oldenburg",
      beginn: vorStunden(4),
      schichtmodell: "ZWEI_SCHICHT",
      kosten: { psaKostenProSatz: 180, vdaProTag: 150, ukVerpflegungProTag: 20, geplanteEinsatztage: 3 },
    },
  });
}

async function schrittAbschnitte(platz: Platz): Promise<void> {
  const abschnitte = [
    { abschnittId: "EA1", name: "Deich Nord", typ: "EINSATZABSCHNITT", reihenfolge: 1 },
    { abschnittId: "EA2", name: "Deich Süd", typ: "EINSATZABSCHNITT", reihenfolge: 2 },
    { abschnittId: "UEA1", name: "Sandsackfüllstelle", typ: "UNTERABSCHNITT", reihenfolge: 1, parentId: "EA1" },
  ];
  for (const nutzlast of abschnitte) {
    await platz.dienst.bediene({ typ: "AbschnittAngelegt", nutzlast });
  }
}

async function schrittEinheiten(platz: Platz, abschnittId: string, von: number, bis: number): Promise<void> {
  for (let nummer = von; nummer <= bis; nummer += 1) {
    await platz.dienst.bediene({
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: `U${String(nummer)}`,
        abschnittId,
        bezeichnung: `Bergungsgruppe ${String(nummer)}`,
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
        personalErfassung: "VOLLSTAENDIG",
        status: "ANMARSCH",
        hierarchie: [],
        reihenfolge: nummer,
        istFuehrungDesAbschnitts: false,
      },
    });
  }
}

async function schrittFuehrungsstelle(platz: Platz): Promise<void> {
  await platz.dienst.bediene(
    dienstpostenAnlegen({
      dienstpostenId: "DP1",
      teileinheit: "Stab",
      funktion: "Ltr FüSt",
      schicht: "TAG",
      reihenfolge: 1,
    }),
  );
  await platz.dienst.bediene(dienstpostenBesetzt("DP1", null, "Meyer, Anton"));
  await platz.dienst.bediene(schichtplanEintrag("DP1", TAG, null, "Meyer, Anton / Tagschicht"));
}

async function schrittAnforderung(platz: Platz): Promise<void> {
  await platz.dienst.bediene(
    anforderungAnlegen({
      anforderungId: "AN1",
      kennung: "A-01",
      vorgeseheneEinheitText: "Fachgruppe Wasserschaden/Pumpen",
      vorgesehenerAuftrag: "Lenzen Sportplatz",
      angefordertAm: vorStunden(2),
    }),
  );
  await platz.dienst.bediene(abloesungZugesagt("AN1", inStunden(6), "GFB Oldenburg"));
}

// ---------------------------------------------------------------------------
// Der Lauf
// ---------------------------------------------------------------------------

describe("Funktionalität: eine vollständige Übung", () => {
  it("Szenario: das Drehbuch läuft von der Einsatzanlage bis zur Einsatzakte", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();

    // 1 bis 3: Der erste Arbeitsplatz legt an, der zweite liest mit.
    await schrittEinsatzAnlegen(a);
    await schrittAbschnitte(a);
    await schrittEinheiten(a, "EA1", 1, 3);
    await takteBis([a, b]);
    expect(Object.keys(b.dienst.zustand.abschnitte)).toContain("UEA1");

    // 4: Der **zweite** Arbeitsplatz erfasst weiter. Das ist der Punkt, an
    // dem sich eine Mehrbenutzeranwendung von einer geteilten Datei
    // unterscheidet: Beide schreiben, keiner wartet.
    await schrittEinheiten(b, "EA2", 4, 6);
    await takteBis([a, b]);
    expect(kennzahlen.einheitenDerLage(a.dienst.zustand)).toHaveLength(6);

    // 5: Status führen — die eigentliche Arbeit der Schicht.
    for (const einheitId of ["U1", "U2", "U3"]) {
      await a.dienst.bediene({
        typ: "StatusGesetzt",
        nutzlast: { einheitId },
        vorher: "ANMARSCH",
        neu: "IM_EINSATZ",
      });
    }
    await takteBis([a, b]);

    // 6 und 7: Führungsstelle und Anforderung, auf verschiedenen Plätzen.
    await schrittFuehrungsstelle(a);
    await schrittAnforderung(b);
    await takteBis([a, b]);

    // 8: Die Anforderung trifft ein. §5.6.2: Danach nimmt sie nichts mehr an.
    await b.dienst.bediene(anforderungErledigt("AN1", vorStunden(0.25)));
    await takteBis([a, b]);

    // ---- Was danach zu sehen sein muss ------------------------------------

    // Die Ausgaben entstehen alle, und keine ist leer. Geprüft wird nicht ihr
    // Inhalt — dafür stehen die Goldfiles —, sondern dass die Lage sie
    // trägt: Eine Ausgabe, die an einer echten Übungslage scheitert, hat
    // niemand vorher bemerkt.
    for (const ausgabe of ["druck", "status", "log", "kosten", "fueorg"] as const) {
      const { html, dateiname } = a.dienst.ausgabeHtml(ausgabe);
      expect(html.length, ausgabe).toBeGreaterThan(500);
      expect(dateiname, ausgabe).toMatch(/_\d{4}-\d{2}-\d{2}_\d{4}$/);
    }

    // Die Anforderung steht erledigt, auf **beiden** Plätzen.
    for (const platz of [a, b]) {
      const liste = projektion.anforderungsliste(platz.dienst.zustand);
      expect(liste.zeilen[0]?.zustand, platz.dienst.clientId).toBe("EINGETROFFEN");
    }

    // Die Führungsstelle steht im Blatt, und zwar nur einmal: Sie entsteht
    // aus den Dienstposten (§5.7, K17) und ist keine gemeldete Einheit.
    expect(projektion.fuestStaerke(b.dienst.zustand)).toHaveLength(1);
    expect(
      kennzahlen.einheitenDerLage(b.dienst.zustand).some((e) => e.bezeichnung.wert === "Ltr FüSt"),
    ).toBe(false);

    // Das Tagebuch trägt jeden Schritt — es ist eine Projektion und kein
    // Eintragsbuch (§5.9.1).
    const tagebuch = a.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" });
    expect(tagebuch.zeilen.length).toBeGreaterThanOrEqual(10);

    // Und die Aussage, auf die alles zuläuft: derselbe Zustand auf beiden
    // Plätzen (§7.6, P3). Das ist Zeile F3 der Abnahmeliste, im Kleinen.
    expect(hashVon(a)).toBe(hashVon(b));
  });

  it("Szenario: eine Rücknahme mitten in der Übung ändert beide Plätze gleich", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await schrittEinsatzAnlegen(a);
    await schrittAbschnitte(a);
    await schrittEinheiten(a, "EA1", 1, 2);
    await takteBis([a, b]);

    await a.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "ANMARSCH",
      neu: "IM_EINSATZ",
    });
    await takteBis([a, b]);
    await a.dienst.zurueck("Verwechslung mit U2");
    await takteBis([a, b]);

    // §6 U3: Die Rücknahme setzt den alten Wert und löscht nichts. Beide
    // Plätze sehen dasselbe — sonst wäre die Rücknahme eine lokale
    // Sichtänderung, und genau das darf sie nicht sein.
    expect(a.dienst.zustand.einheiten["U1"]?.status.wert).toBe("ANMARSCH");
    expect(hashVon(a)).toBe(hashVon(b));
  });
});
