/**
 * Funktionalität: Aufträge, Fahrzeuge und Personen an einer Einheit.
 *
 * Die Strecke Bedienschritt → Aktendienst → Fold → Projektion für die drei
 * Untertabellen der Einheit — mit den Entwürfen, die auch die Erfassungsmasken
 * bauen (`kontrakt/einheitsteile.ts`). Der Befund, auf den sie antworten:
 * Die Spalten J und K des Blatts Stärke waren nur berechnet, und es gab keinen
 * Weg, etwas in sie hineinzubekommen.
 */

import { afterEach, describe, expect, it } from "vitest";

import {
  auftragBeenden,
  auftragErfassen,
  auftragZuruecknehmen,
  fahrzeugAnlegen,
  fahrzeugEntfernen,
  fahrzeugWiederherstellen,
  personEntfernen,
  personHinzufuegen,
} from "../kontrakt/einheitsteile.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** Relativ zur Uhr des Läufers — §2.5 plausibilisiert Ist-Zeiten gegen die Wanduhr. */
function vorStunden(stunden: number): string {
  return new Date(Date.now() - stunden * 3_600_000).toISOString();
}

async function einsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

function zelle(platz: Platz, schluessel: string): string {
  const zeile = platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1" }).zeilen.find(
    (eintrag) => eintrag.einheitId === "U1",
  );
  return zeile?.zellen[schluessel]?.text ?? "";
}

function unter(platz: Platz) {
  return platz.dienst.untertabelle({ art: "untertabelleAnfordern", akteId: "akte-1", einheitId: "U1" });
}

function saetze(platz: Platz): string[] {
  return platz.dienst
    .tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", einheitId: "U1" } as never)
    .zeilen.map((zeile) => zeile.satz);
}

describe("Funktionalität: Aufträge, Fahrzeuge und Personen an der Einheit", () => {
  it("Szenario: ein erfasster Auftrag steht sofort in der Spalte „Aufträge“ und im Tagebuch", async () => {
    const platz = await einsatz();
    const ergebnis = await platz.dienst.bediene(
      auftragErfassen({ auftragId: "A1", einheitId: "U1", text: "Deich sichern", von: vorStunden(1) }),
    );
    expect(ergebnis.art).toBe("geschrieben");

    expect(zelle(platz, "auftraege")).toMatch(/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}–; Deich sichern$/);
    expect(unter(platz).auftraege).toMatchObject([{ id: "A1", text: "Deich sichern", beendet: false }]);
    expect(saetze(platz)).toContain("Bergungsgruppe Oldenburg: Auftrag erfasst — Deich sichern");
  });

  it("Szenario: ein erledigter Auftrag bekommt sein Ende, ein zurückgenommener fällt heraus", async () => {
    const platz = await einsatz();
    await platz.dienst.bediene(
      auftragErfassen({ auftragId: "A1", einheitId: "U1", text: "Deich sichern", von: vorStunden(2) }),
    );
    await platz.dienst.bediene(
      auftragErfassen({ auftragId: "A2", einheitId: "U1", text: "Versehen", von: vorStunden(1) }),
    );
    expect((await platz.dienst.bediene(auftragBeenden("A1", undefined, vorStunden(0.5)))).art).toBe("geschrieben");
    expect((await platz.dienst.bediene(auftragZuruecknehmen("A2", "falsche Einheit"))).art).toBe("geschrieben");

    expect(unter(platz).auftraege).toMatchObject([{ id: "A1", beendet: true }]);
    expect(zelle(platz, "auftraege")).not.toContain("Versehen");
    expect(zelle(platz, "auftraege")).toMatch(/–\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}; Deich sichern$/);
  });

  it("Szenario: ein angelegtes Fahrzeug steht in „Geräte / Fahrzeuge“, ein entferntes nicht mehr", async () => {
    const platz = await einsatz();
    const anlage = fahrzeugAnlegen({
      fahrzeugId: "F1",
      einheitId: "U1",
      typ: "GKW",
      kennzeichen: "THW-84123",
      status: "EINSATZBEREIT",
    });
    expect((await platz.dienst.bediene(anlage)).art).toBe("geschrieben");
    expect(zelle(platz, "geraete")).toBe("GKW");
    expect(unter(platz).fahrzeuge).toMatchObject([{ id: "F1", typ: "GKW", kennzeichen: "THW-84123", entfernt: false }]);

    expect((await platz.dienst.bediene(fahrzeugEntfernen("F1", "defekt"))).art).toBe("geschrieben");
    expect(zelle(platz, "geraete")).toBe("");
    // Entfernen ist kein Löschen: Die Untertabelle zeigt es weiter, damit es
    // sich wiederherstellen lässt.
    expect(unter(platz).fahrzeuge[0]?.entfernt).toBe(true);

    expect((await platz.dienst.bediene(fahrzeugWiederherstellen("F1"))).art).toBe("geschrieben");
    expect(zelle(platz, "geraete")).toBe("GKW");
  });

  it("Szenario: eine hinzugefügte Person steht mit Rolle in der Untertabelle", async () => {
    const platz = await einsatz();
    const anlage = personHinzufuegen({
      personId: "P1",
      einheitId: "U1",
      vorname: "Anna",
      nachname: "Muster",
      rolle: "UNTERFUEHRER",
      funktionen: "Kraftfahrer",
      geschlecht: "WEIBLICH",
      ernaehrung: "VEGETARISCH",
    });
    expect((await platz.dienst.bediene(anlage)).art).toBe("geschrieben");
    expect(unter(platz).personen).toMatchObject([{ id: "P1", name: "Anna Muster", rolle: "UNTERFUEHRER" }]);
    expect(saetze(platz)).toContain("Bergungsgruppe Oldenburg: Person hinzugefügt — Anna Muster (Unterführer)");

    expect((await platz.dienst.bediene(personEntfernen("P1", "abgereist"))).art).toBe("geschrieben");
    expect(unter(platz).personen[0]?.entfernt).toBe(true);
  });

  it("Szenario: Leertexte und ein unlesbares Ende werden abgewiesen, bevor sie das Protokoll erreichen", async () => {
    const platz = await einsatz();
    const leer = await platz.dienst.bediene({
      typ: "AuftragErfasst",
      nutzlast: { auftragId: "A1", einheitId: "U1", von: vorStunden(1), text: "   ", quelle: "MANUELL" },
    });
    expect(leer).toMatchObject({ art: "abgewiesen", meldung: "Der Auftrag braucht einen Text." });

    const ohneTyp = await platz.dienst.bediene({
      typ: "FahrzeugAngelegt",
      nutzlast: { fahrzeugId: "F1", einheitId: "U1", typ: " ", status: "EINSATZBEREIT" },
    });
    expect(ohneTyp.art).toBe("abgewiesen");

    await platz.dienst.bediene(
      auftragErfassen({ auftragId: "A2", einheitId: "U1", text: "Deich sichern", von: vorStunden(1) }),
    );
    const ende = await platz.dienst.bediene({ ...auftragBeenden("A2", undefined, "gleich"), neu: "gleich" });
    expect(ende).toMatchObject({ art: "abgewiesen", meldung: "Das Ende des Auftrags ist keine lesbare Zeitangabe." });
    expect(unter(platz).auftraege).toMatchObject([{ id: "A2", beendet: false }]);
  });

  it("Szenario: ein Fahrzeug ohne Grund zu entfernen wird abgewiesen (§2.4)", async () => {
    const platz = await einsatz();
    const ergebnis = await platz.dienst.bediene({
      typ: "FahrzeugEntfernt",
      nutzlast: { fahrzeugId: "F1" },
      vorher: null,
      neu: true,
    });
    expect(ergebnis.art).toBe("abgewiesen");
  });
});
