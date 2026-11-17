/**
 * Die Nachricht im Fold (KONZEPT-NACHRICHTEN.md §9, Schnitt N1).
 *
 * Geprüft wird, was der Katalog verspricht: Anlage mit Rahmenfeldern, die
 * Vermerke als Strukturfelder mit Vorher-Wert, zwei Sichter an derselben
 * Nachricht, Kenntnis und Erledigung je Stelle, das Zurückziehen mit
 * Pflichtgrund, die doppelte Nachweisungsnummer und der Laufzustand je Pfad.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { KATALOG } from "./katalog/index.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "./pruefhilfen/ereignisbau.js";
import { kompensationFuer } from "./undo.js";
import { FOLD_VERSION, type Zustand } from "./zustand.js";

let n = 0;
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, client);
}

/** Fachliche Zeiten am Testtag, nah an der abgeleiteten Wanduhr (§2.5). */
const um = (minute: number): string => `2026-09-08T08:${String(minute).padStart(2, "0")}:00+02:00`;

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
  ];
}

function verfasst(id: string, angaben: Record<string, unknown> = {}): EingehendesEreignis {
  return anlageEreignis(h(), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: "FüSt",
    absender: "OV Wildeshausen",
    betreff: "Pumpen eingetroffen",
    inhalt: "Zwei Pumpen am Deich.",
    aufnahme: { mittel: "FUNK", zeitpunkt: um(1), handzeichen: "FM" },
    gegenstelle: "Heros OL 10/1",
    ...angaben,
  });
}

function vermerk(typ: string, id: string, neu: unknown, vorher: unknown = null, extra: Record<string, unknown> = {}, client = "a"): EingehendesEreignis {
  return feldEreignis(h(client), n, typ, { nachrichtId: id, ...extra }, vorher, neu);
}

const sichtung = (verteiler: readonly [string, string][], hz = "SI") => ({
  zeitpunkt: um(5),
  handzeichen: hz,
  verteiler: verteiler.map(([stelle, kopie]) => ({ stelle, kopie })),
});

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Die Nachricht im Katalog", () => {
  it("steht auf Fassung 13 und führt die Arten nach §9", () => {
    expect(FOLD_VERSION).toBe(13);
    expect(KATALOG.get("NachrichtVerfasst")).toMatchObject({ form: "b", entitaet: "nachricht", idFeld: "nachrichtId", ohneUndo: true });
    for (const [typ, pfad] of [["NachrichtAngenommen", "annahme"], ["NachrichtUebermittlungVorgeschlagen", "vorschlag"], ["NachrichtBefoerdert", "befoerderung"], ["NachrichtNachgewiesen", "nachweis"], ["NachrichtGesichtet", "sichtung"], ["NachrichtVermerkt", "vermerke"]] as const) {
      expect(KATALOG.get(typ)).toMatchObject({ form: "a", feld: { art: "fest", pfad }, gegenereignis: typ });
    }
    expect(KATALOG.get("NachrichtKenntnisGenommen")).toMatchObject({ feld: { art: "ausNutzlast", schluessel: "stelle", praefix: "kenntnis" }, ohneUndo: true });
    expect(KATALOG.get("NachrichtErledigt")).toMatchObject({ feld: { praefix: "erledigt" }, festerWert: true, gegenereignis: "ErledigungDerNachrichtZurueckgenommen" });
    expect(KATALOG.get("ErledigungDerNachrichtZurueckgenommen")).toMatchObject({ festerWert: false, gegenereignis: "NachrichtErledigt" });
    expect(KATALOG.get("NachrichtZurueckgezogen")).toMatchObject({ feld: { pfad: "entfernt" }, festerWert: true, grundPflicht: true, ohneUndo: true });
  });
});

describe("Die Nachricht im Fold", () => {
  it("legt eine Nachricht an und führt die Sammlung nur, wenn es eine gibt", () => {
    const basis = grundlage();
    expect(zustand(basis).nachrichten).toBeUndefined();
    const z = zustand([...basis, verfasst("N1", { vorrang: "SOFORT" })]);
    const n1 = z.nachrichten?.["N1"];
    expect(n1?.richtung.wert).toBe("EINGANG");
    expect(n1?.betreff.wert).toBe("Pumpen eingetroffen");
    expect(n1?.aufnahme?.wert).toEqual({ mittel: "FUNK", zeitpunkt: um(1), handzeichen: "FM" });
    expect(n1?.vorrang?.wert).toBe("SOFORT");
    expect(n1?.angelegtMitArt).toBe("NachrichtVerfasst");
    expect(n1?.laufzustand).toBe("VOR_SICHTER");
    expect(z.hinweise).toEqual([]);
  });

  it("faltet unbekannte Werte der offenen Bereiche und meldet sie (§3.7) — freie Stellennamen nicht", () => {
    const basis = grundlage();
    const z = zustand([
      ...basis,
      verfasst("N1", { vorrang: "STAATSNOT", aufnahme: { mittel: "BRIEFTAUBE", zeitpunkt: um(1), handzeichen: "FM" } }),
      vermerk("NachrichtGesichtet", "N1", sichtung([["S3", "GRUEN"], ["Polizei", "LILA"], ["DRK", "BLAU"]])),
      vermerk("NachrichtKenntnisGenommen", "N1", { zeitpunkt: um(7), handzeichen: "PO" }, null, { stelle: "Polizei" }),
      vermerk("NachrichtErledigt", "N1", true, null, { stelle: "DRK" }),
    ]);
    expect(z.nachrichten?.["N1"]?.vorrang?.wert).toBe("STAATSNOT");
    expect(z.hinweise).toEqual(expect.arrayContaining([
      { art: "unbekannterWert", feldpfad: "nachricht/N1/vorrang", wert: "STAATSNOT" },
      { art: "unbekannterWert", feldpfad: "nachricht/N1/aufnahme", wert: "BRIEFTAUBE" },
      { art: "unbekannterWert", feldpfad: "nachricht/N1/sichtung", wert: "LILA" },
    ]));
    const zuStellen = z.hinweise.filter((x) => x.art === "unbekannterWert" && ["Polizei", "DRK"].includes(x.wert));
    expect(zuStellen).toEqual([]);
    expect(z.nachrichten?.["N1"]?.kenntnis?.["Polizei"]?.wert?.handzeichen).toBe("PO");
    expect(z.nachrichten?.["N1"]?.erledigt?.["DRK"]?.wert).toBe(true);
  });

  it("weist eine Richtung außerhalb von Eingang und Ausgang ab (geschlossener Bereich)", () => {
    const z = zustand([...grundlage(), verfasst("N1", { richtung: "QUER" })]);
    expect(z.nachrichten).toBeUndefined();
    expect(z.unbekannt).toEqual([expect.objectContaining({ typ: "NachrichtVerfasst", grund: "SCHEMA" })]);
  });

  it("verteilt mit der Sichtung", () => {
    const z = zustand([...grundlage(), verfasst("N1"), vermerk("NachrichtGesichtet", "N1", sichtung([["S2", "ROT"], ["S3", "GRUEN"]]))]);
    expect(z.nachrichten?.["N1"]?.sichtung?.wert?.verteiler).toEqual([{ stelle: "S2", kopie: "ROT" }, { stelle: "S3", kopie: "GRUEN" }]);
    expect(z.nachrichten?.["N1"]?.laufzustand).toBe("VERTEILT");
  });

  it("nimmt eine zweite Sichtung mit gesehenem Vorher-Wert ohne Hinweis an", () => {
    const basis = grundlage();
    const erste = sichtung([["S3", "GRUEN"]]);
    const zweite = sichtung([["S3", "GRUEN"], ["S4", "BLAU"]], "LT");
    const z = zustand([...basis, verfasst("N1"), vermerk("NachrichtGesichtet", "N1", erste), vermerk("NachrichtGesichtet", "N1", zweite, erste)]);
    expect(z.nachrichten?.["N1"]?.sichtung?.wert).toEqual(zweite);
    expect(z.hinweise).toEqual([]);
  });

  it("zeigt zwei Sichter an derselben Nachricht als vorherPasstNicht (§2.2a)", () => {
    const basis = grundlage();
    const vonA = vermerk("NachrichtGesichtet", "N1", sichtung([["S3", "GRUEN"]], "AA"), null, {}, "a");
    const vonB = vermerk("NachrichtGesichtet", "N1", sichtung([["S4", "GRUEN"]], "BB"), null, {}, "b");
    const z = zustand([...basis, verfasst("N1"), vonA, vonB]);
    expect(z.nachrichten?.["N1"]?.sichtung?.wert?.handzeichen).toBe("BB");
    expect(z.hinweise).toContainEqual(expect.objectContaining({
      art: "vorherPasstNicht",
      feldpfad: "nachricht/N1/sichtung",
      gewinner: vonB.id,
      verdraengt: vonA.id,
      gesehen: null,
    }));
  });

  it("führt die Kenntnisnahme je Stelle und lässt sie nicht zurücknehmen", () => {
    const basis = grundlage();
    const s3 = vermerk("NachrichtKenntnisGenommen", "N1", { zeitpunkt: um(7), handzeichen: "MÜ" }, null, { stelle: "S3" });
    const z = zustand([
      ...basis,
      verfasst("N1"),
      vermerk("NachrichtGesichtet", "N1", sichtung([["S3", "GRUEN"], ["S4", "BLAU"]])),
      s3,
      vermerk("NachrichtKenntnisGenommen", "N1", { zeitpunkt: um(8), handzeichen: "KL" }, null, { stelle: "S4" }),
    ]);
    expect(z.nachrichten?.["N1"]?.kenntnis?.["S3"]?.wert).toEqual({ zeitpunkt: um(7), handzeichen: "MÜ" });
    expect(z.nachrichten?.["N1"]?.kenntnis?.["S4"]?.wert?.handzeichen).toBe("KL");
    expect(kompensationFuer(s3, z).art).toBe("nichtMoeglich");
  });

  it("weist eine Stelle mit Schrägstrich ab — sie läge eine Ebene tiefer im Pfad", () => {
    const z = zustand([...grundlage(), verfasst("N1"), vermerk("NachrichtKenntnisGenommen", "N1", { zeitpunkt: um(7), handzeichen: "X" }, null, { stelle: "S1/S4" })]);
    expect(z.unbekannt).toEqual([expect.objectContaining({ typ: "NachrichtKenntnisGenommen", grund: "SCHEMA" })]);
  });

  it("erledigt je Stelle, nimmt die Erledigung zurück und wird erledigt, wenn alle Stellen es sind", () => {
    const basis = grundlage();
    const s3 = vermerk("NachrichtErledigt", "N1", true, null, { stelle: "S3" });
    const vorher = [...basis, verfasst("N1"), vermerk("NachrichtGesichtet", "N1", sichtung([["S3", "GRUEN"], ["S4", "BLAU"]])), s3];
    const z = zustand(vorher);
    expect(z.nachrichten?.["N1"]?.erledigt?.["S3"]?.wert).toBe(true);
    expect(z.nachrichten?.["N1"]?.laufzustand).toBe("VERTEILT");

    const ruecknahme = kompensationFuer(s3, z);
    expect(ruecknahme).toMatchObject({ art: "entwurf", entwurf: { typ: "ErledigungDerNachrichtZurueckgenommen", nutzlast: { nachrichtId: "N1", stelle: "S3" }, neu: false, vorher: true } });
    const zurueck = zustand([...vorher, { ...vermerk("ErledigungDerNachrichtZurueckgenommen", "N1", false, true, { stelle: "S3" }), undoOf: s3.id }]);
    expect(zurueck.nachrichten?.["N1"]?.erledigt?.["S3"]?.wert).toBe(false);

    const alle = zustand([...vorher, vermerk("NachrichtErledigt", "N1", true, null, { stelle: "S4" })]);
    expect(alle.nachrichten?.["N1"]?.laufzustand).toBe("ERLEDIGT");
  });

  it("zieht eine Fehlanlage nur mit Grund zurück; sie bleibt im Zustand", () => {
    const basis = grundlage();
    const ohne = feldEreignis(h(), n, "NachrichtZurueckgezogen", { nachrichtId: "N1" }, null, true);
    const mit = feldEreignis(h(), n, "NachrichtZurueckgezogen", { nachrichtId: "N1" }, null, true, "doppelt aufgenommen");
    expect(zustand([...basis, verfasst("N1"), ohne]).unbekannt).toEqual([expect.objectContaining({ id: ohne.id, grund: "SCHEMA" })]);
    const z = zustand([...basis, verfasst("N1"), mit]);
    expect(z.nachrichten?.["N1"]?.entfernt?.wert).toBe(true);
    expect(z.nachrichten?.["N1"]?.laufzustand).toBe("ZURUECKGEZOGEN");
    expect(kompensationFuer(mit, z).art).toBe("nichtMoeglich");
  });

  it("hält Vermerke nach der Sichtung als eigenes Feld", () => {
    const z = zustand([...grundlage(), verfasst("N1"), vermerk("NachrichtVermerkt", "N1", "ETB-Nr. 14")]);
    expect(z.nachrichten?.["N1"]?.vermerke?.wert).toBe("ETB-Nr. 14");
  });

  it("prüft die Zeiten der Vermerke als Ist-Zeiten (§2.5)", () => {
    const z = zustand([...grundlage(), verfasst("N1"), vermerk("NachrichtAngenommen", "N1", { zeitpunkt: "2026-09-01T08:00:00+02:00", handzeichen: "FM" })]);
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "meldezeitUnplausibel", feldpfad: "nachricht/N1/annahme", zeitklasse: "IST" }));
  });
});

describe("Die Nachweisungsnummer", () => {
  const nachweis = (nummer: number) => ({ nummer, zeitpunkt: um(3), handzeichen: "FM" });

  it("meldet dieselbe Nummer an zwei Nachrichten mit beiden Ereignis-Ids", () => {
    const basis = grundlage();
    const a = vermerk("NachrichtNachgewiesen", "N1", nachweis(26), null, {}, "a");
    const b = vermerk("NachrichtNachgewiesen", "N2", nachweis(26), null, {}, "b");
    const z = zustand([...basis, verfasst("N1"), verfasst("N2"), a, b]);
    expect(z.hinweise).toContainEqual({
      art: "nachweisnummerDoppelt",
      feldpfad: "nachricht/N1/nachweis",
      nummer: 26,
      ids: ["N1", "N2"],
      ereignisse: [a.id, b.id].sort(),
    });
  });

  it("rechnet den Hinweis bei jeder Materialisierung neu: Berichtigung und Zurückziehen nehmen ihn weg (§3.8)", () => {
    const basis = grundlage();
    const doppelt = [...basis, verfasst("N1"), verfasst("N2"), vermerk("NachrichtNachgewiesen", "N1", nachweis(26)), vermerk("NachrichtNachgewiesen", "N2", nachweis(26))];
    const berichtigt = zustand([...doppelt, vermerk("NachrichtNachgewiesen", "N2", nachweis(27), nachweis(26))]);
    expect(berichtigt.hinweise.filter((x) => x.art === "nachweisnummerDoppelt")).toEqual([]);
    const zurueck = zustand([...doppelt, feldEreignis(h(), n, "NachrichtZurueckgezogen", { nachrichtId: "N2" }, null, true, "Fehlanlage")]);
    expect(zurueck.hinweise.filter((x) => x.art === "nachweisnummerDoppelt")).toEqual([]);
  });

  it("ist unabhängig von der Reihenfolge der Ereignisse (P1)", () => {
    const ereignisse = [...grundlage(), verfasst("N1"), verfasst("N2"), vermerk("NachrichtNachgewiesen", "N1", nachweis(5)), vermerk("NachrichtNachgewiesen", "N2", nachweis(5))];
    expect(zustand([...ereignisse].reverse())).toEqual(zustand(ereignisse));
  });
});

describe("Der Laufzustand je Pfad (§9)", () => {
  const befoerderung = { mittel: "FUNK", zeitpunkt: um(9), handzeichen: "FM", gegenstelle: "Heros OL 10/1" };

  it("Ausgang: vor der FmZ bis zur Beförderung, danach erledigt", () => {
    const basis = [...grundlage(), verfasst("A1", { richtung: "AUSGANG", aufnahme: undefined })];
    expect(zustand(basis).nachrichten?.["A1"]?.laufzustand).toBe("VOR_FMZ");
    const angenommen = [...basis, vermerk("NachrichtAngenommen", "A1", { zeitpunkt: um(3), handzeichen: "FM" })];
    expect(zustand(angenommen).nachrichten?.["A1"]?.laufzustand).toBe("VOR_FMZ");
    const befoerdert = [...angenommen, vermerk("NachrichtBefoerdert", "A1", befoerderung)];
    expect(zustand(befoerdert).nachrichten?.["A1"]?.laufzustand).toBe("ERLEDIGT");
  });

  it("Ausgang mit sichtungAuchAusgang: nach der Beförderung zum Sichter, dann verteilt", () => {
    const basis = [
      ...grundlage(),
      feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "sichtungAuchAusgang" }, null, true),
      verfasst("A1", { richtung: "AUSGANG" }),
    ];
    const befoerdert = [...basis, vermerk("NachrichtBefoerdert", "A1", befoerderung)];
    const z = zustand(befoerdert);
    expect(z.einsatz?.sichtungAuchAusgang?.wert).toBe(true);
    expect(z.nachrichten?.["A1"]?.laufzustand).toBe("VOR_SICHTER");
    expect(zustand([...befoerdert, vermerk("NachrichtGesichtet", "A1", sichtung([["S3", "GRUEN"]]))]).nachrichten?.["A1"]?.laufzustand).toBe("VERTEILT");
  });

  it("Eingang: vor dem Sichter, verteilt, erledigt; ein leerer Verteiler ist sofort erledigt", () => {
    const basis = [...grundlage(), verfasst("N1")];
    expect(zustand(basis).nachrichten?.["N1"]?.laufzustand).toBe("VOR_SICHTER");
    const verteilt = [...basis, vermerk("NachrichtGesichtet", "N1", sichtung([["S2", "ROT"]]))];
    expect(zustand(verteilt).nachrichten?.["N1"]?.laufzustand).toBe("VERTEILT");
    expect(zustand([...verteilt, vermerk("NachrichtErledigt", "N1", true, null, { stelle: "S2" })]).nachrichten?.["N1"]?.laufzustand).toBe("ERLEDIGT");
    expect(zustand([...basis, vermerk("NachrichtGesichtet", "N1", sichtung([]))]).nachrichten?.["N1"]?.laufzustand).toBe("ERLEDIGT");
  });

  it("Gesprächsnotiz: keine Beförderung, vom Sichter direkt nach verteilt", () => {
    const basis = [...grundlage(), verfasst("G1", { richtung: "AUSGANG", gespraechsnotiz: true, aufnahme: undefined })];
    expect(zustand(basis).nachrichten?.["G1"]?.laufzustand).toBe("VOR_SICHTER");
    expect(zustand([...basis, vermerk("NachrichtGesichtet", "G1", sichtung([["S4", "GRUEN"]]))]).nachrichten?.["G1"]?.laufzustand).toBe("VERTEILT");
  });
});
