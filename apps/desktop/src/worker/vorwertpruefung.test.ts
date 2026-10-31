/**
 * Die optimistische Vorwert-Prüfung gegen zwei echte Arbeitsplätze.
 *
 * Der Fall aus der Review: A öffnet einen Editor, wird unterbrochen, B ändert
 * den Wert, A kommt zurück und bestätigt. Ohne Prüfung gewänne A still; mit ihr
 * sieht A, was B gesetzt hat.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Ereignisentwurf } from "@s1/speicher";

import { lagebildMit, type Lagebild } from "../kontrakt/index.js";
import { grundlage, raeumeAuf, takteBis, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";
import { CODE_VORWERT } from "../kontrakt/index.js";
import { werttext, type PruefbarerEntwurf } from "./vorwertpruefung.js";

afterEach(raeumeAuf);

function status(neu: string, vorher: string, pruefen: boolean): Ereignisentwurf {
  const entwurf: PruefbarerEntwurf = {
    typ: "StatusGesetzt",
    nutzlast: { einheitId: "U1" },
    vorher,
    neu,
    ...(pruefen ? { vorwertPruefen: true } : {}),
  };
  return entwurf;
}

describe("Vorwert-Prüfung", () => {
  it("weist ab, wenn ein anderer Arbeitsplatz das Feld inzwischen geändert hat – mit Namen und neuem Wert", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const alt = String(a.dienst.zustand.einheiten["U1"]?.status.wert);

    expect((await a.dienst.bediene(status("RUHE", alt, true))).art).toBe("geschrieben");
    await takteBis([a, b]);

    const ergebnis = await b.dienst.bediene(status("ANGEFORDERT", alt, true));
    expect(ergebnis).toMatchObject({ art: "abgewiesen", code: CODE_VORWERT });
    const meldung = "meldung" in ergebnis ? ergebnis.meldung : "";
    expect(meldung).toMatch(/^Wurde inzwischen von .+ geändert \(neu: RUHE\)\. Neu laden\?$/);
    // Nichts wurde geschrieben: Bei B gilt weiter RUHE.
    expect(b.dienst.zustand.einheiten["U1"]?.status.wert).toBe("RUHE");
  });

  it("schreibt, wenn der Vorwert stimmt oder nicht verlangt wurde", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const alt = String(a.dienst.zustand.einheiten["U1"]?.status.wert);
    await a.dienst.bediene(status("RUHE", alt, true));
    await takteBis([a, b]);

    expect((await b.dienst.bediene(status("ANGEFORDERT", "RUHE", true))).art).toBe("geschrieben");
    // Ohne Verlangen bleibt das alte Verhalten (Aufrufer ohne Editor-Vorwert).
    expect((await b.dienst.bediene(status("RUHE", alt, false))).art).toBe("geschrieben");
  });

  it("hält den eigenen letzten Schritt nicht für einen Konflikt", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    const alt = String(a.dienst.zustand.einheiten["U1"]?.status.wert);
    await a.dienst.bediene(status("RUHE", alt, true));
    expect((await a.dienst.bediene(status("ANGEFORDERT", alt, true))).art).toBe("geschrieben");
  });
});

describe("werttext", () => {
  it("nennt Stärke, leere Werte und Text lesbar", () => {
    expect(werttext({ fuehrer: 0, unterfuehrer: 1, mannschaft: 8 })).toBe("0/1/8");
    expect(werttext(null)).toBe("leer");
    expect(werttext("")).toBe("leer");
    expect(werttext("RUHE")).toBe("RUHE");
  });
});

function lageVon(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

describe("Bearbeitungssperre über die Präsenz", () => {
  it("zeigt dem Kollegen, was gesperrt ist, und nimmt es mit der Freigabe zurück", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    await takteBis([a, b]);
    expect(lageVon(b)?.peers[0]?.bearbeitet ?? []).toEqual([]);

    a.dienst.sperre("U1", false);
    await takteBis([a, b]);
    expect(lageVon(b)?.peers[0]?.bearbeitet).toEqual(["U1"]);

    a.dienst.sperre("U1", true);
    await takteBis([a, b]);
    expect(lageVon(b)?.peers[0]?.bearbeitet ?? []).toEqual([]);
  });
});
