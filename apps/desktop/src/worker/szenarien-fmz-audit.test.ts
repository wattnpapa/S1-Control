/**
 * Funktionalität: Fernmeldezentrale nach den Audits vom 2026-11-17 —
 * Regressionstests durch den echten Aktendienst.
 *
 * - LdF P0-1: Befördern ohne Annahme trägt die Annahme mit Uhrzeit und
 *   Handzeichen der Beförderung nach; eine mitgeschickte Nummer wird
 *   nachgewiesen. Was schon vermerkt ist, wird nicht überschrieben.
 * - Fernmelder P1-5: Ein Ausgang mit Vorrang in der Warteschlange meldet sich
 *   beim Arbeitsplatz mit Stelle FMZ (bei Blitz mit Ton), nicht beim Verfasser.
 * - Sichter P1-1: Ein Eingang mit Vorrang vor dem Sichter meldet sich beim
 *   Arbeitsplatz mit Stelle SICHTER.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Mitteilung } from "../kontrakt/index.js";
import { nachrichtAnnehmen, nachrichtBefoerdern } from "../kontrakt/fmzschritte.js";
import { nachrichtVerfassen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return {
    nachrichtId: "N-1",
    richtung: "AUSGANG",
    anschrift: "OV Wildeshausen",
    betreff: "Sandsäcke anfordern",
    inhalt: "500 Sandsäcke an Deich Nord.",
    absender: "S4",
    abfassungszeit: jetzt(),
    ...teile,
  };
}

function nachweisung(platz: Platz) {
  return platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen;
}

function vorranghinweise(platz: Platz): Extract<Mitteilung, { art: "hinweis" }>[] {
  return platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "hinweis" }> => m.art === "hinweis" && m.text.includes("-Nachricht"));
}

describe("Funktionalität: Fernmeldezentrale nach den Audits", () => {
  it("Szenario: Befördern ohne Annahme trägt die Annahme und die Nummer im selben Zug nach (LdF P0-1)", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ"], "Fm");
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    const vermerk = { zeitpunkt: "2026-11-17T11:55:00.000Z", handzeichen: "Fm" };
    const ergebnis = await platz.dienst.bediene(
      nachrichtBefoerdern("N-1", null, { mittel: "FUNK", ...vermerk, gegenstelle: "Heros Wildeshausen" }, { annahme: vermerk, nachweis: { nummer: 3, ...vermerk } }),
    );
    expect(ergebnis.art).toBe("geschrieben");
    const zeile = nachweisung(platz).find((z) => z.id === "N-1");
    expect(zeile).toMatchObject({ annahme: vermerk, befoerderung: { mittel: "FUNK", handzeichen: "Fm" }, nummer: 3 });
  });

  it("Szenario: eine schon vermerkte Annahme bleibt beim Befördern stehen", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    const frueher = { zeitpunkt: "2026-11-17T11:00:00.000Z", handzeichen: "Ab" };
    await platz.dienst.bediene(nachrichtAnnehmen("N-1", null, frueher));
    const spaeter = { zeitpunkt: "2026-11-17T11:30:00.000Z", handzeichen: "Fm" };
    // Die Maske sah noch keine Annahme und schickt sie mit; der Worker schreibt sie nicht doppelt.
    await platz.dienst.bediene(nachrichtBefoerdern("N-1", null, { mittel: "FUNK", ...spaeter }, { annahme: spaeter }));
    expect(nachweisung(platz).find((z) => z.id === "N-1")?.annahme).toEqual(frueher);
  });

  it("Szenario: ein Blitz-Ausgang in der Warteschlange meldet sich bei der FmZ mit Ton, nicht beim Verfasser (Fernmelder P1-5)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["S4"], "Ru");
    b.dienst.stellenSetzen(["FMZ"], "Fm");
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(anlage({ vorrang: "BLITZ" })));
    await a.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "N-2", betreff: "Ohne Vorrang" })));
    await takteBis([a, b]);
    expect(vorranghinweise(b)).toEqual([{ art: "hinweis", akteId: "akte-2", stufe: "warnung", text: "Blitz-Nachricht A für FmZ: Sandsäcke anfordern", ton: "blitz" }]);
    expect(vorranghinweise(a)).toEqual([]);
    await takteBis([a, b]);
    expect(vorranghinweise(b)).toHaveLength(1);
  });

  it("Szenario: ein Sofort-Eingang vor dem Sichter meldet sich beim Sichter, ohne Ton (Sichter P1-1)", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["FMZ"], "Fm");
    b.dienst.stellenSetzen(["SICHTER"], "Si");
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(anlage({ richtung: "EINGANG", vorrang: "SOFORT", anschrift: "FüSt", absender: "OV Wildeshausen", betreff: "Pegel steigt" })));
    await takteBis([a, b]);
    const beiB = vorranghinweise(b);
    expect(beiB).toHaveLength(1);
    expect(beiB[0]).toMatchObject({ stufe: "warnung", text: expect.stringContaining("Sofort-Nachricht E") });
    expect(beiB[0]?.ton).toBeUndefined();
  });
});
