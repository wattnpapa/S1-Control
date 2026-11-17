/**
 * Funktionalität: Nachrichten — die Szenarien zu Schnitt N1
 * (KONZEPT-NACHRICHTEN.md §5, §9, §11).
 *
 * Verfassen, Sichten, Kenntnis und Erledigung laufen durch den echten
 * Aktendienst auf echtem Dateisystem; gemessen wird an Ruf, Lagebild,
 * Präsenz und Mitteilungen — so, wie das Fenster sie sieht. Die Rechnung der
 * Sichten prüft Ring 2.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Lagebild, Mitteilung } from "../kontrakt/index.js";
import { erledigt, kenntnisGenommen, nachrichtSichten, nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { HINWEIS_ZWEITE_SICHTUNG } from "./nachrichtenfolgen.js";
import { baueDienst, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "N-1",
    richtung: "EINGANG",
    anschrift: "FüSt",
    betreff: "Pumpen eingetroffen",
    inhalt: "Zwei Pumpen am Deich Nord.",
    absender: "OV Wildeshausen",
    abfassungszeit: jetzt(),
    ...teile,
  };
}

function sichtung(stellen: readonly string[]) {
  return { zeitpunkt: jetzt(), handzeichen: "Si", verteiler: stellen.map((stelle) => ({ stelle, kopie: stelle === "S2" ? "ROT" : "GRUEN" })) };
}

function sicht(platz: Platz, art: "posteingang" | "ausgang" | "sichter", stellen?: readonly string[]) {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: art, ...(stellen === undefined ? {} : { stellen: [...stellen] }) });
}

/** Das Lagebild, wie das Fenster es nach einem vollen Stand hat. */
function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

function hinweise(platz: Platz): Extract<Mitteilung, { art: "hinweis" }>[] {
  return platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "hinweis" }> => m.art === "hinweis");
}

describe("Funktionalität: Nachrichten (N1)", () => {
  it("Szenario: Verfassen legt einen Ausgang an, der vor der FmZ steht", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S1"], "Mü");
    const ergebnis = await platz.dienst.bediene(nachrichtVerfassen(anlage({ richtung: "AUSGANG", absender: "S1", zeichen: "Mü" })));
    expect(ergebnis.art).toBe("geschrieben");
    const ausgang = sicht(platz, "ausgang");
    expect(ausgang.zeilen.map((z) => [z.id, z.laufzustand])).toEqual([["N-1", "VOR_FMZ"]]);
    expect(ausgang.anschriften).toContain("Deich Nord");
    expect(ausgang.anschriften).toContain("Bergungsgruppe Oldenburg");
    expect(lagebild(platz).nachrichten).toMatchObject({ vorFmz: 1, vorSichter: 0, neuFuerStellen: 0 });
    expect(lagebild(platz).sitzung).toEqual({ stellen: ["S1"], handzeichen: "Mü" });
  });

  it("Szenario: Eingang zum Sichter, Sichtung verteilt, Kenntnis und Erledigung je Stelle", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["S4"], "Mü");
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    expect(sicht(platz, "sichter").zeilen.map((z) => z.id)).toEqual(["N-1"]);
    expect(lagebild(platz).nachrichten?.vorSichter).toBe(1);

    expect((await platz.dienst.bediene(nachrichtSichten("N-1", null, sichtung(["S4", "S2"])))).art).toBe("geschrieben");
    expect(sicht(platz, "sichter").zeilen).toHaveLength(0);
    const post = sicht(platz, "posteingang");
    expect(post.zeilen.map((z) => z.verteiler.map((m) => [m.stelle, m.kopie]))).toEqual([[["S4", "GRUEN"], ["S2", "ROT"]]]);
    expect(lagebild(platz).nachrichten?.neuFuerStellen).toBe(1);

    await platz.dienst.bediene(kenntnisGenommen("N-1", "S4", { zeitpunkt: jetzt(), handzeichen: "Mü" }));
    expect(sicht(platz, "posteingang").zeilen[0]?.verteiler[0]).toMatchObject({ stelle: "S4", gelesen: true, erledigt: false });
    expect(lagebild(platz).nachrichten?.neuFuerStellen).toBe(0);

    await platz.dienst.bediene(erledigt("N-1", "S4"));
    const zeile = sicht(platz, "posteingang").zeilen[0];
    expect(zeile?.verteiler[0]).toMatchObject({ erledigt: true });
    // S2 hat nicht erledigt: Die Nachricht ist verteilt, nicht erledigt.
    expect(zeile?.laufzustand).toBe("VERTEILT");
    // Der Posteingang einer anderen Stelle bleibt erreichbar (Zuschnitt, kein Recht).
    expect(sicht(platz, "posteingang", ["S2"]).zeilen[0]?.verteiler[1]).toMatchObject({ stelle: "S2", gelesen: false });
  });

  it("Szenario: eine zweite Sichtung ohne den neuen Vorwert wird geschrieben, gemeldet und vereinigt (§5)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await a.dienst.bediene(nachrichtVerfassen(anlage()));
    await takteBis([a, b]);
    // Beide Sichter haben den Laufzettel leer geöffnet; A sichtet zuerst.
    expect((await a.dienst.bediene(nachrichtSichten("N-1", null, sichtung(["S4"])))).art).toBe("geschrieben");
    await takteBis([a, b]);
    // Seit 2026-11-17 nicht mehr abgewiesen: Beide Verteiler gelten, der zweite Sichter sieht den Hinweis.
    const zweite = await b.dienst.bediene(nachrichtSichten("N-1", null, sichtung(["S3"])));
    expect(zweite.art).toBe("geschrieben");
    expect(zweite.art === "geschrieben" ? (zweite.warnungen ?? []).join(" ") : "").toContain(HINWEIS_ZWEITE_SICHTUNG);
    await takteBis([a, b]);
    expect(b.dienst.zustand.hinweise).toContainEqual(expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "nachricht/N-1/sichtung" }));
    const zeile = sicht(b, "posteingang", ["S4"]).zeilen[0];
    expect(zeile?.verteiler.map((m) => m.stelle).sort()).toEqual(["S3", "S4"]);
    expect(zeile?.zweiteSichtung).toBeDefined();
    // Die Nachsichtung mit dem gesehenen Vorwert bereinigt: ein Verteiler, keine Marke.
    const gesehen = zeile?.sichtung ?? null;
    expect((await b.dienst.bediene(nachrichtSichten("N-1", gesehen, sichtung(["S3"])))).art).toBe("geschrieben");
    expect(sicht(b, "posteingang", ["S3"]).zeilen[0]).toMatchObject({ verteiler: [expect.objectContaining({ stelle: "S3" })] });
    expect(sicht(b, "posteingang", ["S3"]).zeilen[0]?.zweiteSichtung).toBeUndefined();
  });

  it("Szenario: Stelle und Handzeichen stehen in der Präsenz und erscheinen am Peer", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    a.dienst.stellenSetzen(["S1", "S4", "S1", " "], " Mü ");
    await takteBis([a, b]);
    const peer = lagebild(b).peers.find((p) => p.anzeigename === "Arbeitsplatz 1");
    expect(peer).toMatchObject({ stellen: ["S1", "S4"], handzeichen: "Mü" });
    expect(lagebild(a).sitzung).toEqual({ stellen: ["S1", "S4"], handzeichen: "Mü" });
  });

  it("Szenario: eine gesichtete Blitz-Nachricht für die eigene Stelle meldet sich mit Ton, nur einmal", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["S4"], "Si");
    b.dienst.stellenSetzen(["S4"], "Mü");
    await a.dienst.bediene(nachrichtVerfassen(anlage({ vorrang: "BLITZ" })));
    await a.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "N-2", betreff: "Lage ruhig" })));
    await a.dienst.bediene(nachrichtSichten("N-1", null, sichtung(["S4"])));
    await a.dienst.bediene(nachrichtSichten("N-2", null, sichtung(["S4"])));
    await takteBis([a, b]);
    const beiB = hinweise(b).filter((h) => h.text.includes("-Nachricht"));
    expect(beiB).toEqual([{ art: "hinweis", akteId: "akte-2", stufe: "warnung", text: "Blitz-Nachricht E für S4: Pumpen eingetroffen", ton: "blitz" }]);
    // Wer selbst verteilt hat, bekommt keinen Hinweis.
    expect(hinweise(a).filter((h) => h.text.includes("-Nachricht"))).toEqual([]);
    await takteBis([a, b]);
    expect(hinweise(b).filter((h) => h.text.includes("-Nachricht"))).toHaveLength(1);
  });

  it("Szenario: was beim Öffnen schon da war, meldet sich nicht — auch mit Stelle vor dem Öffnen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ vorrang: "BLITZ" })));
    await platz.dienst.bediene(nachrichtSichten("N-1", null, sichtung(["S4"])));
    platz.dienst.schliesse();
    // Wie der Main beim Öffnen mit Angaben: erst die Sitzung, dann die Akte.
    const neu = baueDienst(platz.wurzel, platz.share, platz.nummer);
    neu.dienst.stellenSetzen(["S4"], "Mü");
    await neu.dienst.oeffne();
    await takteBis([neu]);
    expect(hinweise(neu).filter((h) => h.text.includes("-Nachricht"))).toEqual([]);
    const erstes = neu.mitteilungen.find((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand");
    expect(erstes?.voll?.sitzung).toEqual({ stellen: ["S4"], handzeichen: "Mü" });
    expect(erstes?.voll?.nachrichten?.neuFuerStellen).toBe(1);
  });
});
