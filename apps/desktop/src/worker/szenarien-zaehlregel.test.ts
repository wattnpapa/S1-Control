/**
 * Szenario: Eine Zählregel für die Stärke (Führung Runde 2, P0-1).
 *
 * Kopf („Ist-Stärke“), Tabellensumme, Gliederung und alle Ausgaben müssen
 * dieselbe Zahl nennen, auch bei gemischten Status. Ein Statuswechsel auf
 * „Einsatzbereit“ ändert den Kopf sofort — ohne dass die Einheit den Bereich
 * wechselt. Gemessen wird am echten Aktendienst.
 */

import { afterEach, describe, expect, it } from "vitest";

import { lagebildMit, type Lagebild } from "../kontrakt/index.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

/** `grundlage` legt U1 (0/1/8) im Einsatz an; U2 (0/1/5) kommt im Anmarsch dazu. */
async function mitAnmarsch(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  await platz.dienst.bediene({
    typ: "EinheitGemeldet",
    nutzlast: {
      einheitId: "U2",
      abschnittId: "EO",
      bezeichnung: "Fachgruppe U2",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 5 },
      personalErfassung: "NUR_STAERKE",
      status: "ANMARSCH",
      hierarchie: [],
      reihenfolge: 1,
      istFuehrungDesAbschnitts: false,
    },
  });
  return platz;
}

function kopf(platz: Platz): Lagebild {
  let bild: Lagebild | undefined;
  for (const m of platz.mitteilungen) {
    if (m.art !== "stand") continue;
    if (m.voll !== undefined) bild = m.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, m.geaendert ?? {});
  }
  if (bild === undefined) throw new Error("kein Lagebild");
  return bild;
}

function tabelle(platz: Platz) {
  return platz.dienst.tabelle({ art: "tabelleAnfordern", akteId: "akte-1", gliederung: true });
}

describe("Eine Zählregel für die Stärke", () => {
  it("Kopf, Tabellensumme und Gliederung nennen bei gemischten Status dieselbe Ist-Stärke", async () => {
    const platz = await mitAnmarsch();
    const ist = { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 };
    expect(kopf(platz).gesamtstaerke).toEqual(ist);
    expect(kopf(platz).staerkeErwartet).toBe(6);

    const t = tabelle(platz);
    expect(t.gliederung?.einsatz.staerke).toEqual(ist);
    expect(t.gliederung?.einsatz.erwartet).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 5 });
    const istZeilen = t.zeilen.filter((z) => z.zaehlklasse === "ist");
    expect(istZeilen.reduce((s, z) => s + z.gesamt, 0)).toBe(9);
    expect(t.zeilen.filter((z) => z.zaehlklasse === "erwartet").reduce((s, z) => s + z.gesamt, 0)).toBe(6);
    expect(t.gliederung?.einsatz.alle).toEqual({ fuehrer: 0, unterfuehrer: 2, mannschaft: 13 });
  });

  it("alle Ausgaben nennen die Ist-Stärke des Kopfs und beschriften die Gesamtsummen ehrlich", async () => {
    const platz = await mitAnmarsch();
    const status = platz.dienst.ausgabeHtml("status").html;
    expect(status).toContain("Ist-Stärke (vor Ort): 0/1/8 // 9");
    expect(status).toContain("+6 erwartet (angefordert/Anmarsch/Eingang)");
    expect(status).toContain("Alle erfassten Einheiten");
    expect(platz.dienst.ausgabeHtml("druck").html).toContain("Gesamt (Ist-Stärke)");
    expect(platz.dienst.ausgabeHtml("fueorg").html).toContain("Einsatz gesamt (Ist-Stärke): 0 / 1 / 8 = 9");
    const liste = platz.dienst.ausgabeHtml("einheitenliste").html;
    expect(liste).toContain("0 / 1 / 8 = 9");
    expect(liste).toContain("0 / 2 / 13 = 15");
    expect(liste).toContain("Anmarsch (erwartet)");
  });

  it("ein Statuswechsel auf Einsatzbereit ändert den Kopf sofort, ohne den Bereich zu wechseln", async () => {
    const platz = await mitAnmarsch();
    await platz.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U2" },
      vorher: "ANMARSCH",
      neu: "EINSATZBEREIT",
    });
    expect(kopf(platz).gesamtstaerke).toEqual({ fuehrer: 0, unterfuehrer: 2, mannschaft: 13 });
    expect(kopf(platz).staerkeErwartet).toBe(0);
    expect(tabelle(platz).gliederung?.einsatz.staerke).toEqual(kopf(platz).gesamtstaerke);
    expect(platz.dienst.ausgabeHtml("status").html).toContain("Ist-Stärke (vor Ort): 0/2/13 // 15");

    // … und zurück: Rückgängig durch erneuten Status, der Kopf folgt.
    await platz.dienst.bediene({
      typ: "StatusGesetzt",
      nutzlast: { einheitId: "U2" },
      vorher: "EINSATZBEREIT",
      neu: "ANGEFORDERT",
    });
    expect(kopf(platz).gesamtstaerke).toEqual({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 });
    expect(kopf(platz).staerkeErwartet).toBe(6);
  });

  it("die Kontrollsumme der Status-Ausgabe nennt Klartext statt Differenzzahl, Kennung und Serverpfad", async () => {
    const platz = await mitAnmarsch();
    const html = platz.dienst.ausgabeHtml("status").html;
    expect(html).not.toMatch(/\(-?\d+\)/);
    expect(html).not.toContain("(U1)");
    expect(html).not.toContain("(U2)");
    expect(html).not.toMatch(/[A-Za-z]:\\|\/tmp\//);
  });
});
