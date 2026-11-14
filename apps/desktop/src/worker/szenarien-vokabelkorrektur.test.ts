/**
 * Szenario: Eine Einheit wurde vor der Behebung im Adapter mit rohen
 * Vokabularcodes übernommen („#3 Albstadt") und wird über den Korrekturweg
 * auf Namen gebracht — über den echten Schreibweg des Aktendienstes.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Erfassungsbogen } from "@bos/eeb-format";
import { teilIdsAus, uebernahmeEntwuerfe } from "@s1/domaene";

import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";
import { offeneVokabelkorrekturen } from "./vokabelkorrektur.js";

afterEach(raeumeAuf);

const MELDUNG = "M-0123456789abcdef";
const EINHEIT = "E-albstadt";

/** Zugtrupp TZ Albstadt mit einem FüKW und einem ZFü — die Codes 3, 1–3, 2 und 1. */
const BOGEN = {
  schemaVersion: 8,
  stand: 3_440_645,
  einheit: {
    organisation: 1,
    einheitsTyp: { code: 3 },
    hierarchie: [{ bezeichnung: { code: 1 }, name: "Albstadt", kurz: "OALB" }],
  },
  personalErfassung: 0,
  personal: [
    {
      vorname: "Max",
      nachname: "Muster",
      staerkeRolle: 2,
      funktionen: [{ code: 1 }],
      fahrerlaubnis: 9,
      geschlecht: 1,
      ernaehrung: 1,
      kontakte: [],
      zusatzqualifikationen: [],
    },
  ],
  fahrzeuge: [{ typ: { code: 2 }, stanKonform: true, kennzeichen: "THW-80101" }],
} as unknown as Erfassungsbogen;

/** Schreibt die Übernahme so, wie der Adapter vor der Behebung sie baute. */
async function fehlerhafteUebernahme(platz: Platz): Promise<void> {
  const entwuerfe = uebernahmeEntwuerfe(BOGEN, { zustand: "unsigniert" }, {
    meldungId: MELDUNG,
    einheitId: EINHEIT,
    abschnittId: "EO",
    ...teilIdsAus(MELDUNG, BOGEN),
    empfangenAm: new Date().toISOString(),
    tabellen: {},
  });
  for (const entwurf of entwuerfe) {
    const ergebnis = await platz.dienst.bediene(entwurf);
    expect(ergebnis.art).toBe("geschrieben");
  }
}

describe("Funktionalität: Vokabularkorrektur übernommener Einheiten", () => {
  it("Szenario: „#3 Albstadt“ wird zu „Zugtrupp Technischer Zug Albstadt“", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await fehlerhafteUebernahme(platz);
    expect(platz.dienst.zustand.einheiten[EINHEIT]?.bezeichnung.wert).toBe("#3 Albstadt");
    expect(offeneVokabelkorrekturen(platz.dienst.zustand)).toBe(1);

    const ergebnis = await platz.dienst.vokabelnKorrigieren();

    expect(ergebnis).toEqual({ art: "korrigiert", einheiten: 1, ereignisse: 5 });
    const zustand = platz.dienst.zustand;
    expect(zustand.einheiten[EINHEIT]?.bezeichnung.wert).toBe("Zugtrupp Technischer Zug Albstadt");
    expect(zustand.einheiten[EINHEIT]?.ebene.wert).toBe("ZUGTRUPP");
    const [fahrzeugId] = teilIdsAus(MELDUNG, BOGEN).fahrzeugIds;
    expect(zustand.fahrzeuge[fahrzeugId as string]?.typ.wert).toBe("FüKW");
    expect(offeneVokabelkorrekturen(zustand)).toBe(0);
  });

  it("Szenario: ein zweiter Lauf findet nichts mehr und schreibt nichts", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await fehlerhafteUebernahme(platz);
    await platz.dienst.vokabelnKorrigieren();

    expect(await platz.dienst.vokabelnKorrigieren()).toEqual({ art: "korrigiert", einheiten: 0, ereignisse: 0 });
  });

  it("Szenario: das Lagebild meldet die offenen Einheiten", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await fehlerhafteUebernahme(platz);
    await platz.dienst.takt();

    const werte = platz.mitteilungen
      .filter((m) => m.art === "stand")
      .map((m) => {
        const bild = (m.voll ?? m.geaendert) as { vokabelkorrekturen?: number } | undefined;
        return bild?.vokabelkorrekturen;
      })
      .filter((wert) => wert !== undefined);
    expect(werte.at(-1)).toBe(1);
  });
});
