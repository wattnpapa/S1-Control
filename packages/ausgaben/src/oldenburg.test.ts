/**
 * Tests zum Oldenburger Block — der Exportvariante aus M4.2
 * (05-UMSETZUNGSPLAN.md: „Oldenburg-Spaltenformat als Exportvariante“).
 *
 * Geprüft wird die **Spaltenordnung** und sonst wenig: Der Block hat genau
 * einen Zweck — er wird in das Blatt „Stärke“ der Vorlage eingefügt
 * (`excel-domaenenmodell.md` §2). Eine Spalte zu wenig oder eine an falscher
 * Stelle, und alles dahinter sitzt in der Vorlage um eins verschoben. Das ist
 * ein Fehler, den niemand beim Ansehen bemerkt, weil jede Zelle etwas enthält
 * — nur das Falsche.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";
import type { Zustand } from "../../domaene/src/zustand.js";

import { oldenburgAlsXlsx } from "./xlsx.js";
import { liesZip } from "./zip.js";

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

/** Das Blatt als XML — der Block hat nur eines. */
function blatt(bytes: Uint8Array): string {
  const eintrag = liesZip(bytes).find((e) => e.pfad === "xl/worksheets/sheet1.xml");
  if (eintrag === undefined) throw new Error("kein Blatt in der Datei");
  return new TextDecoder().decode(eintrag.bytes);
}

/** Die Zellen einer Zeile als Paare aus Bezug und Text. */
function zeile(xml: string, nummer: number): readonly (readonly [string, string])[] {
  const start = xml.indexOf(`<row r="${String(nummer)}">`);
  if (start < 0) return [];
  const ende = xml.indexOf("</row>", start);
  const abschnitt = xml.slice(start, ende);
  const zellen: (readonly [string, string])[] = [];
  const muster = /<c r="([A-Z]+\d+)"(?: t="inlineStr")?>(?:<is><t xml:space="preserve">(.*?)<\/t><\/is>|<v>(.*?)<\/v>)<\/c>/g;
  let treffer = muster.exec(abschnitt);
  while (treffer !== null) {
    zellen.push([treffer[1] as string, (treffer[2] ?? treffer[3] ?? "") as string]);
    treffer = muster.exec(abschnitt);
  }
  return zellen;
}

describe("Der Oldenburger Block", () => {
  it("führt die Kopfzeile in der Spaltenordnung des Blatts „Stärke“, B bis AM", () => {
    const xml = blatt(oldenburgAlsXlsx(lage()));
    const koepfe = zeile(xml, 1);
    // Der Block beginnt in Spalte A der eigenen Datei und entspricht Spalte B
    // der Vorlage: Spalte A ist dort die Zeilennummern-Hilfsspalte (§2) und
    // wird nicht mitgeschickt.
    expect(koepfe[0]).toEqual(["A1", "FüSt."]);
    expect(koepfe.map(([, text]) => text)).toEqual([
      "FüSt.", "Bezeichnung", "Organisation", "Herkunft",
      "Zug", "Trupp o. Staffel", "Gruppe", "Person",
      "Geräte / Fahrzeuge", "Aufträge",
      "Erreichbarkeit", "Verfügbar bis", "Ablösung angefordert", "Anforderungs-ID",
      "Zugesagt für", "Zugesagt von (Org.)", "Vorgesehene Einheit", "Vorgesehener Auftrag",
      "eingetr. / zugew.", "Einsatzende", "Rückführung", "Bemerkungen",
      "Reserve 1", "Reserve 2",
      "Status", "Schicht", "ID Einheiten-erfassungsbogen",
      "Weibl.", "Div.", "Veget.", "Vegan.", "ÜN (m)", "ÜN (w)", "ÜN (d)",
      "Fü", "Ufü", "He", "Gesamt",
    ]);
    // 38 Spalten, B..AM der Vorlage: die letzte liegt in der eigenen Datei
    // auf AL, weil um eins nach links versetzt.
    expect(koepfe).toHaveLength(38);
    expect(koepfe[37]?.[0]).toBe("AL1");
  });

  it("schreibt die Bezeichnung in die Spalte der Ebene und lässt die drei anderen leer", () => {
    const xml = blatt(oldenburgAlsXlsx(lage()));
    // Spalten E..H der eigenen Datei sind F..I der Vorlage: Zug, Trupp,
    // Gruppe, Person. Je Zeile darf höchstens eine von ihnen belegt sein.
    for (let nummer = 2; nummer < 50; nummer += 1) {
      const zellen = zeile(xml, nummer);
      // Überschriftenzeilen eines Abschnitts tragen nur Spalte A.
      if (zellen.length <= 1) continue;
      const ebenen = zellen.filter(([bezug]) => /^[EFGH]\d+$/.test(bezug));
      expect(ebenen.length, `Zeile ${String(nummer)}`).toBeLessThanOrEqual(1);
    }
  });

  it("trägt die Stärke als drei Zahlen und die Summe daneben", () => {
    const xml = blatt(oldenburgAlsXlsx(lage()));
    // Die Prüflage beginnt mit dem Stab der FüSt: 2/3/1, Gesamt 6.
    const erste = zeile(xml, 3);
    const werte = new Map(erste);
    expect(werte.get("AI3")).toBe("2");
    expect(werte.get("AJ3")).toBe("3");
    expect(werte.get("AK3")).toBe("1");
    expect(werte.get("AL3")).toBe("6");
    // Als Zahl und nicht als Zeichenkette — sonst summiert die Vorlage nicht.
    expect(xml).toContain('<c r="AL3"><v>6</v></c>');
  });

  it("stellt jedem Abschnitt eine Überschriftenzeile voran und lässt leere aus", () => {
    const xml = blatt(oldenburgAlsXlsx(lage()));
    expect(xml).toContain("FüSt Oldenburg");
    // EO4 ist in der Prüflage der Abschnitt ohne jede Einheit; er bekommt
    // keine Überschrift, sonst füllte der Block die Vorlage mit Leerzeilen.
    expect(xml).not.toContain("Einsatzort 4");
  });

  it("nimmt den Stand als erste Zeile auf, wenn einer angegeben ist", () => {
    const mit = blatt(oldenburgAlsXlsx(lage(), { stand: "Stand 08:00" }));
    expect(zeile(mit, 1)).toEqual([["A1", "Stand 08:00"]]);
    expect(zeile(mit, 2)[0]).toEqual(["A2", "FüSt."]);
  });

  it("bleibt bei leerer Lage eine gültige Datei mit Kopfzeile", () => {
    const leer = oldenburgAlsXlsx(materialisiere(leereFaltung()));
    const dateien = liesZip(leer).map((e) => e.pfad);
    expect(dateien).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(zeile(blatt(leer), 1)).toHaveLength(38);
  });

  it("heißt am Reiter „Stärke“, damit man die beiden Ausgaben unterscheidet", () => {
    const mappe = liesZip(oldenburgAlsXlsx(lage())).find((e) => e.pfad === "xl/workbook.xml");
    expect(new TextDecoder().decode((mappe as { bytes: Uint8Array }).bytes)).toContain(
      'name="Stärke"',
    );
  });
});
