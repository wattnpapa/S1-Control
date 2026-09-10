/**
 * Funktionalität: Einsatztagebuch — die Szenarien zu M3.3.
 *
 * Die DoD nennt zwei Aussagen, und beide sind hier zählbar gemacht:
 * „ETB zeigt **jede** Änderung" und „Undo sichtbar als Kompensation".
 *
 * Die erste ist die schärfere. §5.9.1 begründet sie mit einem Satz, der auch
 * der Prüfmaßstab ist: Der Zustand hält je Feld zwei Beobachtungen, das
 * Tagebuch braucht alle — projiziert man es aus dem Zustand, zeigt es bei drei
 * Änderungen zwei Zeilen. Genau das wird gemessen.
 */

import { afterEach, describe, expect, it } from "vitest";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

function tagebuch(platz: Platz, filter: Record<string, unknown> = {}) {
  return platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", ...filter } as never);
}

describe("Funktionalität: Einsatztagebuch", () => {
  it("Szenario: jedes fachliche Ereignis erzeugt eine Zeile", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    // Drei Bedienschritte, drei Zeilen — und keine vierte: Die beiden
    // Verwaltungsereignisse der Speicherschicht erscheinen nicht (§5.9.1),
    // und sie erreichen die Faltung gar nicht erst.
    expect(tagebuch(platz).gesamtzahl).toBe(3);
    expect(tagebuch(platz).zeilen.map((zeile) => zeile.typ)).toEqual([
      "EinheitGemeldet",
      "AbschnittAngelegt",
      "EinsatzAngelegt",
    ]);
  });

  it("Szenario: fünf Änderungen an einem Feld ergeben fünf Zeilen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const werte = ["ANMARSCH", "EINSATZBEREIT", "IM_EINSATZ", "RUHE", "RUECKMARSCH"];
    let vorher: string | null = null;
    for (const status of werte) {
      const ergebnis = await platz.dienst.bediene({
        typ: "StatusGesetzt",
        nutzlast: { einheitId: "U1" },
        vorher,
        neu: status,
      });
      expect(ergebnis.art).toBe("geschrieben");
      vorher = status;
    }

    // Der Zustand hält je Feld zwei Beobachtungen — Gewinner und Zweiter
    // (§3.3). Das Tagebuch hält alle fünf.
    const zeilen = tagebuch(platz, { einheitId: "U1" }).zeilen.filter(
      (zeile) => zeile.typ === "StatusGesetzt",
    );
    expect(zeilen).toHaveLength(5);
    expect(zeilen[0]?.satz).toContain("RUHE → RUECKMARSCH");
    expect(zeilen[4]?.satz).toContain("→ ANMARSCH");
  });

  it("Szenario: eine Rücknahme steht als eigene Zeile neben dem Original", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const gesetzt = await platz.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "IM_EINSATZ",
      neu: "RUHE",
    });
    expect(gesetzt.art).toBe("geschrieben");
    const zurueck = await platz.dienst.zurueck();
    expect(zurueck.art).toBe("geschrieben");

    // U4: **Beide** Zeilen bleiben stehen. Ein Tagebuch, das die
    // zurückgenommene Zeile entfernte, wäre kein Nachweis mehr.
    const alle = tagebuch(platz, { einheitId: "U1" }).zeilen;
    expect(alle.filter((zeile) => zeile.typ === "StatusGesetzt")).toHaveLength(2);
    const kompensation = alle.find((zeile) => zeile.undoOf !== undefined);
    expect(kompensation?.undoOf).toBe(gesetzt.art === "geschrieben" ? gesetzt.ereignisId : "");
    // §6 U1: Die Kompensation ist ein **gewöhnliches** Ereignis — sie trägt
    // dieselbe Art wie das Original und keinen Sonderpfad im Fold.
    expect(kompensation?.typ).toBe("StatusGesetzt");
  });

  it("Szenario: das Tagebuch nennt Akteur und Rechner je Zeile", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const zeile = tagebuch(platz).zeilen[0];
    expect(zeile?.akteur).toBe("Bediener 1");
    expect(zeile?.rechner).toBe("rechner-1");
    // Die Kennung des Arbeitsplatzes steht daneben: Zwei Bediener können
    // denselben Namen führen, die clientId ist eindeutig (§4.1).
    expect(zeile?.clientId).toBeDefined();
  });

  it("Szenario: der Filter je Einheit trennt zwei Einheiten sauber", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene({
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: "U2",
        abschnittId: "EO",
        bezeichnung: "Fachgruppe Wasserschaden",
        organisation: "THW",
        hierarchie: [],
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
        personalErfassung: "NUR_STAERKE",
        status: "ANMARSCH",
        reihenfolge: 2,
        istFuehrungDesAbschnitts: false,
      },
    });

    expect(tagebuch(platz, { einheitId: "U1" }).gesamtzahl).toBe(1);
    expect(tagebuch(platz, { einheitId: "U2" }).gesamtzahl).toBe(1);
    // Der Abschnittsfilter fängt beide, weil beide Einheiten in „EO" stehen.
    expect(tagebuch(platz, { abschnittId: "EO" }).gesamtzahl).toBe(3);
  });

  it("Szenario: ein getippter Eintrag steht neben den abgeleiteten Zeilen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const ergebnis = await platz.dienst.bediene({
      typ: "EtbEintragErfasst",
      nutzlast: {
        etbId: "T1",
        zeitpunkt: "2026-09-10T09:30:00+02:00",
        text: "Deich bei km 12 sackt ab.",
      },
    });
    expect(ergebnis.art).toBe("geschrieben");

    const oberste = tagebuch(platz).zeilen[0];
    expect(oberste?.satz).toBe("Tagebucheintrag: Deich bei km 12 sackt ab.");
    // §2.5: Die fachliche Zeit steht neben der Wanduhr und ersetzt sie nicht.
    expect(oberste?.zeitpunkt).toBe("2026-09-10T09:30:00+02:00");
    expect(oberste?.wanduhr).not.toBe(oberste?.zeitpunkt);
  });

  it("Szenario: der Ausschnitt trägt, das Tagebuch bleibt vollständig", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    for (let nummer = 0; nummer < 20; nummer += 1) {
      await platz.dienst.bediene({
        typ: "EinheitUmsortiert",
        nutzlast: { einheitId: "U1" },
        vorher: nummer,
        neu: nummer + 1,
      });
    }
    const seite = tagebuch(platz, { von: 0, anzahl: 5 });
    expect(seite.zeilen).toHaveLength(5);
    expect(seite.gesamtzahl).toBe(23);
    // Die zweite Seite schließt lückenlos an — die Ordnung ist über beide
    // Rufe dieselbe (§3.5).
    const zweite = tagebuch(platz, { von: 5, anzahl: 5 });
    expect(zweite.zeilen[0]?.ereignisId).not.toBe(seite.zeilen[4]?.ereignisId);
  });
});
