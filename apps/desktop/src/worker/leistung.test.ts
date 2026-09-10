/**
 * „150 Einheiten flüssig“ — die Zahl aus der DoD von M3.2, gemessen.
 *
 * **Gemessen und nicht behauptet.** Die DoD nennt eine Zahl, und eine Zahl
 * ohne Messung ist eine Meinung. Gemessen wird das, was bei jeder Änderung
 * tatsächlich läuft: einen Bedienschritt falten und daraus den Ausschnitt
 * bauen, den der Renderer bekommt.
 *
 * **Die Schranken sind großzügig, und das mit Absicht.** Ein Test, der eine
 * enge Zeit fordert, misst auf einem ausgelasteten CI-Läufer die Auslastung
 * und nicht das Verfahren — derselbe Grund, aus dem der Mehrclient-Nachweis
 * aus M2.3 nicht auf Wanduhrzeit wartet. Was hier gehalten wird, ist eine
 * **Größenordnung**: Solange ein Tabellenausschnitt bei 150 Einheiten
 * deutlich unter einem Zehntel einer Sekunde bleibt, tippt niemand schneller,
 * als das Fenster zeichnet. Die tatsächlich gemessenen Werte stehen im
 * Abschlussbericht.
 *
 * Entscheidung 10 des Umsetzungsplans nennt außerdem 5.000 Einheiten als
 * Simulationsgrenze. Diese Größe steht **nicht** hier, sondern in
 * `packages/domaene/src/projektion/leistung.test.ts`, und der Grund ist eine
 * Messung: 5.000 Einheiten über den Aktendienst anzulegen heißt 5.000
 * Ereignisse einzeln zu schreiben, jedes mit `fsync` (§2.2 Speicher) — das
 * dauert auf dieser Maschine über zwei Minuten und misst die Platte, nicht
 * die Projektion. Der Fold und der Ausschnitt sind ohne Dateisystem prüfbar,
 * und dort gehören sie hin.
 */

import { afterEach, describe, expect, it } from "vitest";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Wie lange ein Ausschnitt bei 150 Einheiten höchstens dauern darf. */
const SCHRANKE_150_MS = 100;

async function baueEinheiten(platz: Platz, anzahl: number): Promise<void> {
  for (let nummer = 0; nummer < anzahl; nummer += 1) {
    const ergebnis = await platz.dienst.bediene({
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: `E-${String(nummer).padStart(5, "0")}`,
        abschnittId: "EO",
        bezeichnung: `Fachgruppe ${String(nummer)}`,
        organisation: "THW",
        hierarchie: [{ art: "ORTSVERBAND", name: `OV ${String(nummer % 40)}` }],
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
        personalErfassung: "NUR_STAERKE",
        status: nummer % 2 === 0 ? "IM_EINSATZ" : "ANMARSCH",
        reihenfolge: nummer,
        istFuehrungDesAbschnitts: false,
      },
    });
    expect(ergebnis.art).toBe("geschrieben");
  }
}

/** Die Dauer eines Aufrufs in Millisekunden — der Mittelwert über mehrere Läufe. */
function miss(laeufe: number, tue: () => void): number {
  // Ein Vorlauf, damit der erste Aufruf nicht die Kosten der ersten
  // Ausführung des Codepfads trägt und die Messung verzerrt.
  tue();
  const beginn = performance.now();
  for (let lauf = 0; lauf < laeufe; lauf += 1) tue();
  return (performance.now() - beginn) / laeufe;
}

describe("Der Tabellenausschnitt bei vielen Einheiten", () => {
  it("baut bei 150 Einheiten eine Seite deutlich unter einem Zehntel einer Sekunde", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await baueEinheiten(platz, 150);

    const dauer = miss(20, () => {
      platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1", von: 0, anzahl: 100 });
    });
    expect(dauer).toBeLessThan(SCHRANKE_150_MS);
  });

  it("filtert und sucht über alle Einheiten, ohne alle Zeilen zu bauen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await baueEinheiten(platz, 150);

    const gesucht = platz.dienst.tabelle({
      art: "tabelleAnfordern",
      akteId: "akte-1",
      suche: "Fachgruppe 7",
      anzahl: 100,
    });
    // „Fachgruppe 7“, „Fachgruppe 70“ bis „Fachgruppe 79“ und „Fachgruppe 147“
    // — die Suche trifft als Teilzeichenkette, so wie der Autofilter der
    // Excel es tut.
    expect(gesucht.gesamtzahl).toBeGreaterThan(1);
    expect(gesucht.zeilen.every((zeile) => zeile.anzeige.includes("Fachgruppe 7"))).toBe(true);
  });
});
