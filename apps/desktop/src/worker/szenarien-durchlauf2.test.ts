/**
 * Funktionalität: zweiter Durchlauf der Nachrichten-Audits durch den echten
 * Aktendienst.
 *
 * - Sichter P1-4, ETB P3-3, Sichter P3-4: „Stelle abgeben“ schreibt die
 *   Präsenz sofort ohne Stellen, mit `abgemeldet`; der Kollege zählt den
 *   Sichter nicht mehr und lässt den Ersatzsichter sichten.
 * - Sichter P1-4: der Stau vor dem Sichter meldet sich an der FmZ, je Nachricht einmal.
 * - ETB P1-2, P1-3: ETB-Nummer und Grund des Zurückziehens in der Zeile.
 * - LdF P2-5: Nachweisung mit Schichtausschnitt und Zeitraum im Kopf.
 */

import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it } from "vitest";

import type { Lagebild, Mitteilung } from "../kontrakt/index.js";
import { nachrichtAufnehmen } from "../kontrakt/fmzschritte.js";
import { nachrichtVerfassen, nachrichtZurueckziehen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen } from "./pruefhilfen/werkstatt.js";
import { Sichterstauwaechter, sichterstauText } from "./sichterstau.js";

afterEach(raeumeAuf);

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "N-1",
    richtung: "AUSGANG",
    anschrift: "OV Wildeshausen",
    betreff: "Sandsäcke anfordern",
    inhalt: "500 Sandsäcke.",
    absender: "S4",
    abfassungszeit: new Date().toISOString(),
    ...teile,
  };
}

describe("Funktionalität: Stelle abgeben (Sichter P1-4, ETB P3-3)", () => {
  it("Szenario: der Sichter gibt seine Stelle ab — der Kollege sieht ihn sofort nicht mehr als Sichter", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["SICHTER"], "Si");
    b.dienst.stellenSetzen(["FMZ"], "Fm");
    await takteBis([a, b], 3);
    const vorher = lagebild(b.mitteilungen)?.peers.find((p) => p.clientId === a.dienst.clientId);
    expect(vorher).toMatchObject({ stellen: ["SICHTER"], veraltet: false });
    await a.dienst.stelleAbgeben();
    await takteBis([b], 1);
    const nachher = lagebild(b.mitteilungen)?.peers.find((p) => p.clientId === a.dienst.clientId);
    expect(nachher).toMatchObject({ abgemeldet: true, veraltet: true });
    expect(nachher?.stellen).toBeUndefined();
    const datei = JSON.parse(readFileSync(`${a.share}/praesenz/${a.dienst.clientId}.json`, "utf8")) as Record<string, unknown>;
    expect(datei).toMatchObject({ abgemeldet: true });
    expect(datei["stellen"]).toBeUndefined();
    // Ohne Sichter sichtet die Aufnahme der FmZ als Ersatzsichter (Laufzettel in der Maske).
    const ergebnis = await b.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "Polizei", aufnahme: { mittel: "FUNK", zeitpunkt: new Date().toISOString(), handzeichen: "Fm" } })));
    expect(ergebnis.art).toBe("geschrieben");
    // Wieder Stellen gesetzt: Die Abmeldung ist aufgehoben.
    a.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b], 2);
    expect(lagebild(b.mitteilungen)?.peers.find((p) => p.clientId === a.dienst.clientId)).toMatchObject({ stellen: ["SICHTER"], veraltet: false });
  });
});

function lagebild(mitteilungen: readonly Mitteilung[]): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const m of mitteilungen) {
    if (m.art !== "stand") continue;
    if (m.voll !== undefined) bild = m.voll;
    else if (bild !== undefined) bild = { ...bild, ...(m.geaendert ?? {}) };
  }
  return bild;
}

describe("Funktionalität: Stau vor dem Sichter (Sichter P1-4)", () => {
  it("Szenario: zwei Eingänge über der Schwelle melden sich einmal je Nachricht an der FmZ", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const aufnahme = { mittel: "FUNK", zeitpunkt: new Date().toISOString(), handzeichen: "Fm" };
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "Polizei", aufnahme })));
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "E-2", richtung: "EINGANG", absender: "EA", aufnahme })));
    const waechter = new Sichterstauwaechter();
    const lage = { zustand: platz.dienst.zustand, stellen: ["FMZ"], sichterBesetzt: false };
    const jetzt = Date.now();
    expect(waechter.pruefe({ ...lage, jetztMs: jetzt })).toBeUndefined();
    // Ganze Minuten ab dem Eintreffen; je nach Sekunde 24 oder 25.
    expect(waechter.pruefe({ ...lage, jetztMs: jetzt + 25 * 60_000 })).toMatch(/^2 Nachrichten warten seit 2[45] Minuten vor dem Sichter, kein Sichter besetzt$/u);
    // Dieselben Nachrichten melden sich nicht noch einmal.
    expect(waechter.pruefe({ ...lage, jetztMs: jetzt + 26 * 60_000 })).toBeUndefined();
    // Mit besetztem, aber säumigem Sichter (R2-FM P2-5): ein anderer Satz; ohne Stelle FMZ/LDF: nichts.
    expect(new Sichterstauwaechter().pruefe({ ...lage, sichterBesetzt: true, jetztMs: jetzt + 25 * 60_000 })).toMatch(/obwohl ein Sichter besetzt ist/u);
    expect(new Sichterstauwaechter().pruefe({ ...lage, stellen: ["S4"], jetztMs: jetzt + 25 * 60_000 })).toBeUndefined();
    expect(new Sichterstauwaechter().pruefe({ ...lage, stellen: ["LDF"], jetztMs: jetzt + 25 * 60_000 })).toMatch(/^2 Nachrichten warten seit 2[45] Minuten/u);
    expect(sichterstauText(1, 1)).toBe("1 Nachricht wartet seit 1 Minute vor dem Sichter, kein Sichter besetzt");
  });
});

describe("Funktionalität: ETB-Nummer und Zurückziehen in der Zeile (ETB P1-2, P1-3)", () => {
  it("Szenario: die Nachricht trägt die laufende Nummer ihrer Tagebuchzeile und den Grund des Zurückziehens", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtZurueckziehen("N-1", "Doppelt aufgegeben"));
    const zeile = platz.dienst.nachricht("N-1");
    const tagebuch = [...platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1" }).zeilen].reverse();
    const nummer = tagebuch.findIndex((z) => z.typ === "NachrichtVerfasst") + 1;
    expect(zeile?.etbNummer).toBe(nummer);
    expect(zeile?.zurueckgezogenMit).toMatchObject({ grund: "Doppelt aufgegeben" });
    const ansicht = platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" });
    expect(ansicht.zeilen[0]?.etbNummer).toBe(nummer);
    const html = platz.dienst.ausgabeHtml("nachweisung").html;
    expect(html).toContain("Doppelt aufgegeben");
    expect(html).toMatch(/Zeitraum von /u);
  });

  it("Szenario: die Nachweisung als Schicht nimmt nur die Nachrichten im Ausschnitt (LdF P2-5)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ betreff: "Frühschicht", abfassungszeit: "2026-09-10T06:00:00Z" })));
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "N-2", betreff: "Spätschicht", abfassungszeit: "2026-09-10T15:00:00Z" })));
    const html = platz.dienst.ausgabeHtml("nachweisung", undefined, { von: "2026-09-10T12:00:00Z", bis: "2026-09-10T20:00:00Z" }).html;
    expect(html).toContain("Spätschicht");
    expect(html).not.toContain("Frühschicht");
    expect(html).toContain("Zeitraum (Ausschnitt) von 10.09.2026 14:00 bis 10.09.2026 22:00");
  });
});

describe("Funktionalität: Papier-Nachtrag eines Ausgangs in einem Schritt (Fernmelder P2-9)", () => {
  it("Szenario: Annahme, Nummer und Beförderung als Folgewerte der Anlage, mit den Folgen der Beförderung", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const vermerk = { zeitpunkt: "2026-11-17T09:00:00.000Z", handzeichen: "Fm" };
    const ergebnis = await platz.dienst.bediene(
      nachrichtAufnehmen(anlage(), { annahme: vermerk, nachweis: { nummer: 4, ...vermerk }, befoerderung: { mittel: "TELEFON", zeitpunkt: "2026-11-17T09:05:00.000Z", handzeichen: "Fm", gegenstelle: "Kreis OL" } }),
    );
    expect(ergebnis.art).toBe("geschrieben");
    const zeile = platz.dienst.nachricht("N-1");
    expect(zeile).toMatchObject({ annahme: vermerk, nummer: 4, befoerderung: { mittel: "TELEFON", handzeichen: "Fm" }, gegenstelle: "Kreis OL" });
    // Die Folgen der Beförderung (rote und grüne Kopie) laufen mit: Der Ausgang ist verteilt, nicht befördert ohne Kopie.
    expect(zeile?.sichtung?.verteiler.map((v) => v.stelle)).toContain("S2");
  });
});

describe("Lagebild: Konflikthinweise mit Art und Pfad (Fernmelder P2-6)", () => {
  it("trägt Art und Feldpfad der Hinweise, höchstens fünfzig", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    const vermerk = { zeitpunkt: "2026-11-17T09:00:00.000Z", handzeichen: "Fm" };
    await platz.dienst.bediene(nachrichtAufnehmen(anlage(), { nachweis: { nummer: 4, ...vermerk } }));
    await platz.dienst.bediene(nachrichtAufnehmen(anlage({ nachrichtId: "N-2" }), { nachweis: { nummer: 4, ...vermerk } }));
    const bild = lagebild(platz.mitteilungen);
    expect(bild?.hinweise).toBeGreaterThan(0);
    expect(bild?.konflikthinweise?.some((h) => h.art === "nachweisnummerDoppelt" && h.feldpfad.startsWith("nachricht"))).toBe(true);
  });
});
