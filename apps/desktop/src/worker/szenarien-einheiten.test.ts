/**
 * Funktionalität: Einheiten — die BDD-Szenarien zu M3.2.
 *
 * Sechs der zehn Szenarien der Feature-Datei aus v1
 * (`legacy-v1/e2e/features/einsatz-lifecycle.feature`) sprechen über
 * Einheiten: anlegen, verschieben, Stärken summieren, aufteilen,
 * zurücknehmen, Fahrzeug zuordnen. Sie stehen hier in derselben Reihenfolge
 * und mit denselben Aussagen; was sich geändert hat, ist der Läufer und der
 * Umstand, dass die Stärke jetzt ein Tripel ist und keine Zahl.
 *
 * Gemessen wird die Strecke Bedienschritt → Speicherschicht → Dateisystem →
 * Fold → Projektion; die Entwürfe baut dieselbe Funktion, die auch die Maske
 * benutzt (`bedienschritte.ts`), damit hier keine zweite Bauweise entsteht.
 */

import { afterEach, describe, expect, it } from "vitest";

import { kennzahlen, projektion, type Tabellenzeile } from "@s1/domaene";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

// ---------------------------------------------------------------------------
// Die Schritte
// ---------------------------------------------------------------------------

async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

async function wennIchDieEinheitAnlege(
  platz: Platz,
  einheitId: string,
  bezeichnung: string,
  abschnittId: string,
  staerke: { fuehrer: number; unterfuehrer: number; mannschaft: number },
): Promise<void> {
  const ergebnis = await platz.dienst.bediene({
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId,
      abschnittId,
      bezeichnung,
      organisation: "THW",
      hierarchie: [],
      ebene: "ZUG",
      staerke,
      personalErfassung: "NUR_STAERKE",
      status: "IM_EINSATZ",
      reihenfolge: 5,
      istFuehrungDesAbschnitts: false,
    },
  });
  expect(ergebnis.art).toBe("geschrieben");
}

function dannSeheIchDieTabelle(platz: Platz, abschnittId?: string): readonly Tabellenzeile[] {
  return platz.dienst.tabelle({
    art: "tabelleAnfordern",
    akteId: "akte-1",
    ...(abschnittId === undefined ? {} : { abschnittId }),
  }).zeilen;
}

function gesamtstaerke(platz: Platz): number {
  const gesamt = kennzahlen.einsatzGesamtstaerke(platz.dienst.zustand).gesamt;
  return gesamt.fuehrer + gesamt.unterfuehrer + gesamt.mannschaft;
}

// ---------------------------------------------------------------------------
// Die Szenarien
// ---------------------------------------------------------------------------

describe("Funktionalität: Einheiten", () => {
  it("Szenario: Einheit anlegen und in der Liste sehen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchDieEinheitAnlege(platz, "U2", "OV Oldenburg", "EO", {
      fuehrer: 1,
      unterfuehrer: 2,
      mannschaft: 6,
    });

    const namen = dannSeheIchDieTabelle(platz).map((zeile) => zeile.anzeige);
    expect(namen).toContain("OV Oldenburg");
    // Die Einheit aus `grundlage` (0/1/8 = 9) plus 1/2/6 = 9 ergibt 18.
    expect(gesamtstaerke(platz)).toBe(18);
  });

  it("Szenario: Einheit zwischen Abschnitten verschieben", async () => {
    const platz = await angenommenEinEinsatz();
    await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "EA-NORD", name: "EA Nord", typ: "EINSATZORT", reihenfolge: 2 },
    });
    await platz.dienst.bediene({
      typ: "EinheitVerschoben",
      nutzlast: { einheitId: "U1" },
      vorher: "EO",
      neu: "EA-NORD",
    });

    expect(dannSeheIchDieTabelle(platz, "EA-NORD").map((zeile) => zeile.einheitId)).toEqual(["U1"]);
    expect(dannSeheIchDieTabelle(platz, "EO")).toHaveLength(0);
    // Die Gesamtstärke bleibt: Verschieben bewegt Kräfte, es schafft und
    // vernichtet keine.
    expect(gesamtstaerke(platz)).toBe(9);
  });

  it("Szenario: Gesamtstärke summiert über alle Abschnitte", async () => {
    const platz = await angenommenEinEinsatz();
    await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "EA-WEST", name: "EA West", typ: "EINSATZORT", reihenfolge: 2 },
    });
    await wennIchDieEinheitAnlege(platz, "U2", "Einheit B", "EA-WEST", {
      fuehrer: 0,
      unterfuehrer: 1,
      mannschaft: 6,
    });
    expect(gesamtstaerke(platz)).toBe(16);
  });

  it("Szenario: eine angeforderte Einheit zählt nicht in der Gesamtstärke", async () => {
    const platz = await angenommenEinEinsatz();
    // §5.3: Der Abschnittstyp `ANGEFORDERT` zählt nicht — wer angefordert
    // ist, ist noch nicht da. Genau dafür weist K3 ihn getrennt aus.
    await platz.dienst.bediene({
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "ANF", name: "Angefordert", typ: "ANGEFORDERT", reihenfolge: 9 },
    });
    await wennIchDieEinheitAnlege(platz, "U9", "Kommt noch", "ANF", {
      fuehrer: 1,
      unterfuehrer: 1,
      mannschaft: 9,
    });

    expect(gesamtstaerke(platz)).toBe(9);
    const getrennt = kennzahlen.einsatzGesamtstaerke(platz.dienst.zustand).angefordert;
    expect(getrennt.fuehrer + getrennt.unterfuehrer + getrennt.mannschaft).toBe(11);
  });

  it("Szenario: Einheit in Teileinheiten aufteilen", async () => {
    const platz = await angenommenEinEinsatz();
    const quelle = dannSeheIchDieTabelle(platz)[0] as Tabellenzeile;
    await platz.dienst.bediene({
      typ: "EinheitAufgeteilt",
      nutzlast: {
        quellEinheitId: "U1",
        neueEinheitId: "U1-A",
        neueEinheit: {
          abschnittId: "EO",
          bezeichnung: "BGr Teil 1",
          organisation: "THW",
          hierarchie: [],
          ebene: "TRUPP",
          staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
          personalErfassung: "NUR_STAERKE",
          status: "IM_EINSATZ",
          reihenfolge: 2,
          istFuehrungDesAbschnitts: false,
        },
        abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
        gesehen: quelle.staerke,
        uebernommeneFahrzeuge: [],
        uebernommenePersonen: [],
      },
    });

    const zeilen = dannSeheIchDieTabelle(platz);
    expect(zeilen.map((zeile) => zeile.anzeige)).toContain("BGr Teil 1");
    // §5.4.2: Die Wirkung ist relativ — der Quelle werden 4 abgezogen, und
    // die Summe über beide bleibt dieselbe wie vorher.
    expect(gesamtstaerke(platz)).toBe(9);
    expect(zeilen.find((zeile) => zeile.einheitId === "U1")?.staerke).toEqual({
      fuehrer: 0,
      unterfuehrer: 1,
      mannschaft: 4,
    });
  });

  it("Szenario: Aufteilung zurücknehmen", async () => {
    const platz = await angenommenEinEinsatz();
    const quelle = dannSeheIchDieTabelle(platz)[0] as Tabellenzeile;
    await platz.dienst.bediene({
      typ: "EinheitAufgeteilt",
      nutzlast: {
        quellEinheitId: "U1",
        neueEinheitId: "U1-A",
        neueEinheit: {
          abschnittId: "EO",
          bezeichnung: "BGr Teil 1",
          organisation: "THW",
          hierarchie: [],
          ebene: "TRUPP",
          staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
          personalErfassung: "NUR_STAERKE",
          status: "IM_EINSATZ",
          reihenfolge: 2,
          istFuehrungDesAbschnitts: false,
        },
        abgeteilteStaerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 4 },
        gesehen: quelle.staerke,
        uebernommeneFahrzeuge: [],
        uebernommenePersonen: [],
      },
    });

    // §6 U2: Der Rückweg einer Aufteilung ist eine Zusammenführung. Er ist
    // **strukturell** — der Dienst kann ihn nicht selbst bauen, weil die
    // Maske des Fachvorgangs die gesehenen Stärken braucht.
    const zurueck = await platz.dienst.zurueck();
    expect(zurueck.art).toBe("strukturell");
    if (zurueck.art === "strukturell") {
      expect(zurueck.inverseArt).toBe("EinheitZusammengefuehrt");
    }
  });

  it("Szenario: Einheit entfernen nimmt sie aus den Summen, aber nicht aus der Akte", async () => {
    const platz = await angenommenEinEinsatz();
    await platz.dienst.bediene({
      typ: "EinheitEntfernt",
      nutzlast: { einheitId: "U1" },
      vorher: null,
      neu: true,
      grund: "Doppelt gemeldet",
    });

    expect(gesamtstaerke(platz)).toBe(0);
    expect(dannSeheIchDieTabelle(platz)).toHaveLength(0);
    // §5.4.5: Entfernen ist kein Löschen — mit `mitStillgelegten` steht sie da.
    const mit = platz.dienst.tabelle({
      art: "tabelleAnfordern",
      akteId: "akte-1",
      mitStillgelegten: true,
    }).zeilen;
    expect(mit.find((zeile) => zeile.einheitId === "U1")?.entfernt).toBe(true);
  });

  it("Szenario: Fahrzeug einer Einheit zuordnen", async () => {
    const platz = await angenommenEinEinsatz();
    await platz.dienst.bediene({
      typ: "FahrzeugAngelegt",
      nutzlast: {
        fahrzeugId: "F1",
        einheitId: "U1",
        typ: "MTW",
        bezeichnung: "MTW-OV",
        // §5.5: `status` ist Pflicht. Der Aktendienst prüft die Nutzlast,
        // bevor er schreibt — ein Fahrzeug ohne Status käme gar nicht erst
        // in die Akte.
        status: "EINSATZBEREIT",
        funkrufname: { kennwort: "Heros", eigenerStandort: true, ort: "Oldenburg", teile: [21, 51] },
      },
    });

    const unter = platz.dienst.untertabelle({
      art: "untertabelleAnfordern",
      akteId: "akte-1",
      einheitId: "U1",
    });
    expect(unter.fahrzeuge.map((fahrzeug) => fahrzeug.bezeichnung)).toContain("MTW-OV");
    // Der Funkrufname wird zu der Form zusammengesetzt, in der er über Funk
    // gesprochen wird — als Struktur wäre er in einer Zeile unlesbar.
    expect(unter.fahrzeuge[0]?.funkrufname).toBe("Heros Oldenburg 21/51");
  });

  it("Szenario: eine Einheit in einen unbekannten Abschnitt bleibt sichtbar und zählt", async () => {
    const platz = await angenommenEinEinsatz();
    // §5.3.3: Das `AbschnittAngelegt` ist noch unterwegs. Die Stärke einer
    // real gemeldeten Einheit darf nicht dadurch verschwinden, dass ein
    // Ereignis fehlt — sie steht im Auffang und zählt.
    await wennIchDieEinheitAnlege(platz, "U7", "Kommt aus dem Nichts", "NOCH-NICHT-DA", {
      fuehrer: 1,
      unterfuehrer: 0,
      mannschaft: 0,
    });

    const imAuffang = dannSeheIchDieTabelle(platz, "AUFFANG");
    expect(imAuffang.map((zeile) => zeile.einheitId)).toContain("U7");
    expect(gesamtstaerke(platz)).toBe(10);
  });

  it("Szenario: eine Inline-Änderung mit falschem Vorher-Wert erzeugt einen Hinweis an der Zelle", async () => {
    const platz = await angenommenEinEinsatz();
    // §2.2a, Auflage 6: Der Bediener schickt mit, was er gesehen hat. Weicht
    // das vom gefalteten Zustand ab, entsteht `vorherPasstNicht` — und die
    // Zelle trägt die Markierung, statt still zu überschreiben.
    await platz.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U1" },
      vorher: "ANMARSCH",
      neu: "RUHE",
    });

    const zeile = dannSeheIchDieTabelle(platz).find((eintrag) => eintrag.einheitId === "U1");
    expect(zeile?.zellen["status"]?.umstritten).toBe(true);
    expect(zeile?.hinweise.some((hinweis) => hinweis.art === "vorherPasstNicht")).toBe(true);
    // Der Wert gilt trotzdem: Last-Writer-Wins mit Hinweis, nicht ohne (§3.4).
    expect(zeile?.zellen["status"]?.text).toBe("RUHE");
  });

  it("Szenario: die Spaltengruppen der Excel lassen sich zuschalten", async () => {
    const platz = await angenommenEinEinsatz();
    const grunddaten = projektion.spaltenDerGruppen(["GRUNDDATEN", "STAERKE"]);
    const mitLogistik = projektion.spaltenDerGruppen(["GRUNDDATEN", "STAERKE", "LOGISTIKDATEN"]);
    expect(mitLogistik.length).toBeGreaterThan(grunddaten.length);
    // Und die Zellen sind da, auch wenn die Gruppe ausgeblendet ist: Die
    // Projektion baut alle, die Ansicht zeigt eine Auswahl.
    const zeile = dannSeheIchDieTabelle(platz)[0];
    expect(zeile?.zellen["weiblich"]).toBeDefined();
  });
});
