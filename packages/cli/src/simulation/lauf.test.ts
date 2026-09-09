import { describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";

import { fuehreSimulationAus, type Laufergebnis } from "./lauf.js";
import { abnahmePlan, deutePlan, pruefePlan, ruhigerPlan, type Plan } from "./plan.js";
import { berichte, fehlendeStoerungen, GEFORDERTE_STOERUNGEN } from "./bericht.js";

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Ein kleiner, aber vollständiger Lauf.
 *
 * Bewusst klein: Der Abnahmelauf mit 4 Clients und 2.000 Kommandos dauert rund
 * eine Minute und gehört in `s1 simuliere`, nicht in die Testsuite. Geprüft
 * wird hier, dass das Gerüst trägt — Ruhephase, Vergleich, Bericht — und dass
 * derselbe Startwert denselben Lauf ergibt.
 */
async function lauf(plan: Plan): Promise<Laufergebnis> {
  const wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-lauf-test-"));
  try {
    return await fuehreSimulationAus({ plan, dateisystem: knotenDateisystem(), wurzel });
  } finally {
    await fsp.rm(wurzel, { recursive: true, force: true });
  }
}

const KLEIN = { clients: 3, kommandos: 45, phasen: 2, ruheVersucheMax: 120 } as const;

describe("Simulationslauf — M0.4", () => {
  it("konvergiert ohne Störung über alle Clients", async () => {
    const ergebnis = await lauf({ ...ruhigerPlan(), ...KLEIN });
    expect(ergebnis.maengel).toEqual([]);
    expect(ergebnis.erfolg).toBe(true);
    for (const phase of ergebnis.phasen) {
      expect(phase.ruheErreicht).toBe(true);
      expect(phase.befund.art).toBe("konvergent");
      if (phase.befund.art !== "konvergent") throw new Error("unerreichbar");
      expect(phase.befund.clients).toHaveLength(KLEIN.clients);
      expect(phase.spiegelpruefung.every((s) => s.stimmt)).toBe(true);
    }
    // Ohne Störung darf keine gemeldet werden — sonst prüfte der gestörte Lauf
    // gegen einen Vergleichslauf, der selbst gestört war.
    expect(ergebnis.stoerungen).toEqual({});
  }, 60_000);

  it("liefert aus demselben Startwert denselben Zustand", async () => {
    const plan = { ...ruhigerPlan(), ...KLEIN, startwert: 4242 };
    const [eins, zwei] = await Promise.all([lauf(plan), lauf(plan)]);
    const hashes = (e: Laufergebnis): readonly string[] =>
      e.phasen.map((p) => (p.befund.art === "konvergent" ? p.befund.zustandsHash : p.befund.art));
    expect(hashes(eins)).toEqual(hashes(zwei));
    expect(eins.ereignisse).toBe(zwei.ereignisse);
    expect(eins.ereignisBytes).toBe(zwei.ereignisBytes);
  }, 90_000);

  it("liefert aus verschiedenen Startwerten verschiedene Läufe", async () => {
    const [eins, zwei] = await Promise.all([
      lauf({ ...ruhigerPlan(), ...KLEIN, startwert: 1 }),
      lauf({ ...ruhigerPlan(), ...KLEIN, startwert: 2 }),
    ]);
    const hash = (e: Laufergebnis): string =>
      e.phasen[0]?.befund.art === "konvergent" ? e.phasen[0].befund.zustandsHash : "";
    expect(hash(eins)).not.toBe(hash(zwei));
  }, 90_000);

  it("konvergiert auch unter allen Störungen und weist sie im Bericht nach", async () => {
    // Groß genug, dass jede vom Plan geforderte Störung rechnerisch eintritt —
    // sonst meldet `bewerte` sie zu Recht als Mangel, und der Test prüfte nur,
    // dass ein zu kleiner Lauf klein ist.
    const ergebnis = await lauf({ ...abnahmePlan(), clients: 3, kommandos: 400, phasen: 2, ruheVersucheMax: 200 });
    expect(fehlendeStoerungen(ergebnis)).toEqual([]);
    expect(ergebnis.maengel).toEqual([]);
    // §7.6: Der rote Ausgang darf nie eintreten.
    expect(ergebnis.phasen.map((p) => p.befund.art)).not.toContain("abweichend");
    expect(ergebnis.phasen.some((p) => p.befund.art === "konvergent")).toBe(true);
    const text = berichte(ergebnis);
    expect(text).toContain("Konvergenzvergleich nach §7.6");
    expect(text).toContain("A2");
    // Kein `erfolg ? … : …`: Ein Erwartungswert, der sich nach dem Ergebnis
    // richtet, prüft nichts — und „NICHT bestanden" enthält „bestanden".
    expect(text).toMatch(/^Ergebnis: bestanden/m);
  }, 180_000);

  it("misst die Zahlen, die M0.5 braucht (§10, A2/A7/A10)", async () => {
    const ergebnis = await lauf({ ...ruhigerPlan(), ...KLEIN });
    const m = ergebnis.messwerte;
    expect(m.ereignisse).toBeGreaterThan(0);
    expect(m.byteJeEreignis).toBeGreaterThan(0);
    expect(m.kleinsteZeile).toBeLessThanOrEqual(m.byteJeEreignis);
    expect(m.groessteZeile).toBeGreaterThanOrEqual(m.byteJeEreignis);
    // A7: Der neu hinzukommende Arbeitsplatz muss alles gesehen haben.
    expect(m.erstlaufZeilen).toBe(ergebnis.ereignisse);
    expect(m.erstlaufBytes).toBe(ergebnis.ereignisBytes);
    expect(m.erstlaufDateien).toBeGreaterThanOrEqual(KLEIN.clients);
    // A10: Die eigenen Segmente sind ein Teil dessen, was der Erstlauf liest.
    expect(m.vollpruefungAnteil).toBeGreaterThan(0);
    expect(m.vollpruefungAnteil).toBeLessThan(1);
  }, 60_000);
});

describe("Plandatei", () => {
  it("füllt fehlende Felder aus dem Abnahmeplan", () => {
    const plan = deutePlan('{"startwert": 5, "clients": 2}');
    expect(plan.startwert).toBe(5);
    expect(plan.clients).toBe(2);
    expect(plan.kommandos).toBe(abnahmePlan().kommandos);
    expect(plan.profil).toEqual(abnahmePlan().profil);
  });

  it("überschreibt einzelne Felder des Störprofils, ohne die übrigen zu verlieren", () => {
    const plan = deutePlan('{"profil": {"blockade": 0}}');
    expect(plan.profil.blockade).toBe(0);
    expect(plan.profil.verzeichnisCacheMs).toBe(abnahmePlan().profil.verzeichnisCacheMs);
  });

  it("weist ein unbekanntes Feld ab, statt es still zu übergehen", () => {
    // Ein vertipptes `kommandi: 5000` still zu ignorieren hieße, einen Lauf zu
    // melden, den niemand angefordert hat.
    expect(() => deutePlan('{"kommandi": 5000}')).toThrow(/kommandi/);
    expect(() => deutePlan('{"profil": {"blockadee": 1}}')).toThrow(/blockadee/);
    expect(() => deutePlan('{"fehler": {"kil": 1}}')).toThrow(/kil/);
  });

  it("weist unbrauchbares JSON und unbrauchbare Werte ab", () => {
    expect(() => deutePlan("kein json")).toThrow(SyntaxError);
    expect(() => deutePlan("[]")).toThrow(TypeError);
    expect(() => deutePlan('{"clients": "vier"}')).toThrow(TypeError);
    expect(() => deutePlan('{"einsatzId": ""}')).toThrow(TypeError);
  });

  it("weist Pläne ab, die keinen Vergleich hergeben", () => {
    expect(() => pruefePlan({ ...abnahmePlan(), clients: 1 })).toThrow(/mindestens 2 Clients/);
    expect(() => pruefePlan({ ...abnahmePlan(), kommandos: 0 })).toThrow(RangeError);
    expect(() => pruefePlan({ ...abnahmePlan(), phasen: 0 })).toThrow(RangeError);
    expect(() => pruefePlan({ ...abnahmePlan(), segmentgroesse: 8 })).toThrow(RangeError);
    expect(() => pruefePlan({ ...abnahmePlan(), taktAMs: 0 })).toThrow(RangeError);
  });

  it("nennt die geforderten Störungen, die in einem Lauf nicht vorkamen", () => {
    const leer = {
      plan: abnahmePlan(),
      stoerungen: {},
      dateisystemZaehler: {},
    } as unknown as Laufergebnis;
    // Der Abnahmeplan fordert alle zehn; keine ist eingetreten.
    expect([...fehlendeStoerungen(leer)].sort()).toEqual([...GEFORDERTE_STOERUNGEN].sort());

    const voll = {
      plan: abnahmePlan(),
      stoerungen: { kill: 1, partition: 1, uhrsprung: 1 },
      dateisystemZaehler: {
        abgeschnittenShare: 1,
        abgeschnittenLokal: 1,
        renameFehler: 1,
        blockade: 1,
        fileNotFoundCache: 1,
        verzeichnisCache: 1,
        sichtbarkeitVerzoegert: 1,
      },
    } as unknown as Laufergebnis;
    expect(fehlendeStoerungen(voll)).toEqual([]);

    // Ein Plan, der eine Störung abschaltet, fordert sie nicht — ihr Ausbleiben
    // ist dann kein Mangel, sondern die Folge des Plans.
    const ohne = {
      plan: ruhigerPlan(),
      stoerungen: {},
      dateisystemZaehler: {},
    } as unknown as Laufergebnis;
    expect(fehlendeStoerungen(ohne)).toEqual([]);
  });

  it("macht eine geforderte, aber ausgebliebene Störung zum Mangel", async () => {
    // Auflage 15 und die DoD verlangen „alle Störungen". Ein Plan, der sie
    // fordert, in dem sie aber nicht eintreten, darf nicht bestehen.
    const plan: Plan = {
      ...abnahmePlan(),
      clients: 2,
      kommandos: 40,
      phasen: 1,
      ruheVersucheMax: 200,
      // Der Abnahmeplan fordert alle zehn Störungen; 40 Kommandos reichen für
      // die seltenen nicht. Genau das muss der Lauf melden, statt zu bestehen.
      fehler: { ...abnahmePlan().fehler, beschaedigung: 0 },
    };
    const ergebnis = await lauf(plan);
    const fehlend = fehlendeStoerungen(ergebnis);
    expect(fehlend.length).toBeGreaterThan(0);
    for (const name of fehlend) {
      expect(ergebnis.maengel).toContain(`Geforderte Störung nie eingetreten: ${name}`);
    }
    expect(ergebnis.erfolg).toBe(false);
  }, 60_000);
});
