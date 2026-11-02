/**
 * Die Versorgung am echten Aktendienst (S4.1).
 *
 * Geprüft wird die Naht: Das geschobene Lagebild trägt `versorgung` aus
 * derselben Projektion, die der Ruf `versorgungAnfordern` liefert, und der
 * Ruf trägt den Zeigerstand wie jede andere Ansicht (M3.7).
 */

import { afterEach, describe, expect, it } from "vitest";

import { lagebildMit, zRuf, type Lagebild } from "../kontrakt/index.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";
import { ortsversatz, versorgungFuerLagebild } from "./versorgungsprojektion.js";

afterEach(raeumeAuf);

function letzterStand(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

describe("Die Versorgung im Worker", () => {
  it("schiebt die Zahlen der Versorgung im Lagebild mit", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const versorgung = letzterStand(a)?.versorgung;
    expect(versorgung?.mahlzeiten.length).toBeGreaterThanOrEqual(3);
    // Die Bergungsgruppe hat keine Schicht und isst wie die Tagschicht.
    const portionen = versorgung?.mahlzeiten.map((m) => m.bestand) ?? [];
    expect(Math.max(...portionen)).toBe(9);
    expect(versorgung?.anmarsch).toBe(0);
  });

  it("liefert das Blatt mit Zeigerstand, Logistikblatt und Vorausschau", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const ansicht = a.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-1", stunden: 48 });
    expect(ansicht.lageZeiger).toBe(3);
    expect(ansicht.blatt.vorausschau.stunden).toBe(48);
    expect(ansicht.blatt.vorausschau.mahlzeiten).toHaveLength(8);
    expect(ansicht.logistik.gesamt.gesamt).toBe(9);
    expect(ansicht.blatt.plan.summe.koepfe).toBe(9);
  });

  it("nimmt im Kontrakt nur 24 oder 48 Stunden an", () => {
    expect(zRuf.safeParse({ art: "versorgungAnfordern", akteId: "akte-1", stunden: 48 }).success).toBe(true);
    expect(zRuf.safeParse({ art: "versorgungAnfordern", akteId: "akte-1", stunden: 72 }).success).toBe(false);
  });

  it("rechnet in derselben Minute und mit demselben Zustand nicht neu", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const zustand = a.dienst.zustand;
    const jetzt = Date.parse("2026-09-10T14:43:10Z");
    const erste = versorgungFuerLagebild(zustand, jetzt);
    expect(versorgungFuerLagebild(zustand, jetzt + 20_000)).toBe(erste);
    expect(versorgungFuerLagebild(zustand, jetzt + 60_000)).not.toBe(erste);
    expect(Number.isInteger(ortsversatz(jetzt))).toBe(true);
  });

  it("legt eine Unterkunft an, bringt unter und zeigt Belegung in Lagebild, Blatt und Belegungsliste", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const angelegt = await a.dienst.bediene({ typ: "UnterkunftAngelegt", nutzlast: { unterkunftId: "UK1", name: "Turnhalle", kapazitaet: 6 } });
    expect(angelegt.art).toBe("geschrieben");
    await a.dienst.bediene({ typ: "EinheitUntergebracht", nutzlast: { einheitId: "U1" }, vorher: null, neu: "UK1" });
    const versorgung = letzterStand(a)?.versorgung;
    expect(versorgung?.belegt).toBe(9);
    expect(versorgung?.frei).toBe(0);
    const ansicht = a.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-1" });
    expect(ansicht.blatt.belegung.unterkuenfte[0]).toMatchObject({ name: "Turnhalle", ueberbelegt: true, frei: -3 });
    const seite = a.dienst.ausgabeHtml("belegung");
    expect(seite.dateiname).toMatch(/^belegung_/);
    expect(seite.html).toContain("Turnhalle");
    expect(seite.html).toContain("Bergungsgruppe Oldenburg");
  });

  it("weist eine Kapazität ab, die keine ganze Zahl ist", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    await a.dienst.bediene({ typ: "UnterkunftAngelegt", nutzlast: { unterkunftId: "UK1", name: "Turnhalle", kapazitaet: 6 } });
    const ergebnis = await a.dienst.bediene({ typ: "UnterkunftGeaendert", nutzlast: { unterkunftId: "UK1", feld: "kapazitaet" }, vorher: 6, neu: "zwölf" });
    expect(ergebnis.art).toBe("abgewiesen");
  });

  it("weist eine Mahlzeitenregel ohne lesbare Ausgabezeit ab und nimmt eine gültige an", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const falsch = await a.dienst.bediene({ typ: "MahlzeitenregelGesetzt", nutzlast: { einsatzId: "2026-09-10_hochwasser" }, vorher: null, neu: [{ mahlzeit: "ABEND", uhrzeit: "18:00", schichten: ["TAG"] }] });
    expect(falsch.art).toBe("abgewiesen");
    const einsatzId = a.dienst.zustand.einsatz?.id ?? "";
    const gut = await a.dienst.bediene({ typ: "MahlzeitenregelGesetzt", nutzlast: { einsatzId }, vorher: null, neu: [{ mahlzeit: "ABEND", uhrzeit: "1900", schichten: ["TAG"] }] });
    expect(gut.art).toBe("geschrieben");
    const ansicht = a.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-1" });
    expect(ansicht.blatt.regelVorbelegung).toBe(false);
    expect(ansicht.blatt.vorausschau.mahlzeiten.every((m) => m.mahlzeit === "ABEND")).toBe(true);
  });

  it("schreibt eine Bestellung und führt sie in Bestellliste und Vorausschau als Ausgabe", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const vorher = a.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-1" });
    const erste = vorher.blatt.vorausschau.mahlzeiten[0];
    const geschrieben = await a.dienst.bediene({
      typ: "MahlzeitBestellt",
      nutzlast: { bestellungId: "B1", datum: erste?.datum ?? "", mahlzeit: erste?.mahlzeit ?? "", portionen: 7, vegetarisch: 0, vegan: 0, bestelltBei: "Küche" },
    });
    expect(geschrieben.art).toBe("geschrieben");
    const ansicht = a.dienst.versorgung({ art: "versorgungAnfordern", akteId: "akte-1" });
    expect(ansicht.blatt.bestellstand[0]?.differenz).toBe(7 - (erste?.vorausschau.portionen ?? 0));
    expect(letzterStand(a)?.versorgung?.mahlzeiten[0]?.bestellt).toBe(7);
    const liste = a.dienst.ausgabeHtml("bestellliste");
    expect(liste.dateiname).toMatch(/^bestellliste_/);
    expect(liste.html).toContain("Bestellliste Verpflegung");
    const differenz = 7 - (erste?.vorausschau.portionen ?? 0);
    expect(liste.html).toContain(differenz > 0 ? `+${String(differenz)}` : differenz < 0 ? `−${String(-differenz)}` : "±0");
    expect(a.dienst.ausgabeHtml("vorausschau").html).toContain("Zu- und Abgänge");
  });
});
