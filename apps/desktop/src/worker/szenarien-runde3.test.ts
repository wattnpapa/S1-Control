/**
 * Funktionalität: Nachrichten, dritte Behebung der Audits Runde 2 —
 * durch den echten Aktendienst auf echtem Dateisystem.
 *
 * - R2-FaBe P1-4: der eigene beförderte Ausgang ist im eigenen Posteingang nicht „neu“.
 * - R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8: „Rückgängig“ nimmt den ganzen Schritt.
 * - R2-SGL P2-1, R2-LdF P3-7: der Papier-Nachtrag prüft die Zeitfolge (Warnung).
 * - R2-LdF P2-1, P2-2: Marken „ohne Vorschlag des LdF“ und „abweichend vom Vorschlag“.
 * - R2-ETB P3-1, P3-3, P3-4; ETB P1-7: Stufe der Warnung, Satz des
 *   Zurückziehens, Hinweis beim Zurückziehen nach Verteilung, Handzeichen.
 * - FM P2-7: „Aufnahme berichtigen“.
 */

import { afterEach, describe, expect, it } from "vitest";

import type { Bedienergebnis, Lagebild, Mitteilung } from "../kontrakt/index.js";
import { aufnahmeBerichtigen, nachrichtAufnehmen, nachrichtBefoerdern, nachrichtenParameterSetzen, nachrichtVorschlagen } from "../kontrakt/fmzschritte.js";
import { erledigt, nachrichtSichten, nachrichtVerfassen, nachrichtZurueckziehen, type Nachrichtenanlage } from "../kontrakt/nachrichtenschritte.js";
import { EINSATZ_ID, grundlage, raeumeAuf, takteBis, werkstattMitEinemPlatz, werkstattMitZweiPlaetzen, type Platz, ohneLdf } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const jetzt = (): string => new Date().toISOString();
const vorMinuten = (minuten: number): string => new Date(Date.now() - minuten * 60_000).toISOString();

function anlage(teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage {
  return { nachrichtId: "A-1", richtung: "AUSGANG", anschrift: "OV Wildeshausen", betreff: "Sandsäcke", inhalt: "500 Stück.", absender: "S4", funktion: "S4", zeichen: "Ru", abfassungszeit: jetzt(), ...teile };
}

const eingang = (teile: Partial<Nachrichtenanlage> = {}): Nachrichtenanlage =>
  anlage({ nachrichtId: "E-1", richtung: "EINGANG", absender: "THW OV Brake", anschrift: "FüSt", funktion: "EL", aufnahme: { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }, ...teile });

function lagebild(platz: Platz): Lagebild {
  platz.dienst.sendeVollenStand();
  const stand = platz.mitteilungen.filter((m): m is Extract<Mitteilung, { art: "stand" }> => m.art === "stand").at(-1);
  if (stand?.voll === undefined) throw new Error("kein voller Stand");
  return stand.voll;
}

const warnungen = (e: Bedienergebnis): readonly string[] => (e.art === "geschrieben" ? (e.warnungen ?? []) : []);
const nachweisung = (platz: Platz) => platz.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "nachweisung" }).zeilen;
const tagebuch = (platz: Platz, nachrichtId: string) => platz.dienst.tagebuch({ art: "tagebuchAnfordern", akteId: "akte-1", nachrichtId }).zeilen;

async function fmzAllein(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  await ohneLdf(platz); // der Weg ohne LdF (seit FOLD_VERSION 17 ausdrücklich)
  platz.dienst.stellenSetzen(["FMZ"], "Fm");
  return platz;
}

describe("R2-FaBe P1-4: der eigene Ausgang im eigenen Posteingang", () => {
  it("Szenario: S4 gibt einen Blitz auf, die FmZ befördert — S4 hat ihn gelesen, ohne Vorranghinweis", async () => {
    const { a, b } = await werkstattMitZweiPlaetzen();
    await grundlage(a);
    a.dienst.stellenSetzen(["S4"], "Ru");
    b.dienst.stellenSetzen(["FMZ"], "Fm");
    await takteBis([a, b]);
    await a.dienst.bediene(nachrichtVerfassen(anlage({ vorrang: "BLITZ" })));
    await takteBis([a, b]);
    await b.dienst.bediene(nachrichtBefoerdern("A-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const vorher = a.mitteilungen.length;
    await takteBis([a, b]);
    const posteingang = a.dienst.nachrichten({ art: "nachrichtenAnfordern", akteId: "akte-1", sicht: "posteingang" });
    expect(posteingang.zaehlung?.NEU).toBe(0);
    expect(posteingang.zeilen[0]?.verteiler.find((m) => m.stelle === "S4")).toMatchObject({ gelesen: true, eigenerAusgang: true });
    expect(a.mitteilungen.slice(vorher).some((m) => m.art === "hinweis" && m.text.startsWith("Blitz-Nachricht"))).toBe(false);
    expect(lagebild(a).nachrichten?.neuFuerStellen).toBe(0);
  });
});

describe("R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8: Rückgängig als ganzer Schritt", () => {
  it("Szenario: Befördern mit Annahme, Nummer und Kopien — ein Eintrag, ein Rückgängig", async () => {
    const platz = await fmzAllein();
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    const tiefe = lagebild(platz).undoTiefe;
    const zeit = { zeitpunkt: jetzt(), handzeichen: "Fm" };
    await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, { mittel: "FUNK", ...zeit }, { annahme: zeit, nachweis: { nummer: 4, ...zeit } }));
    const bild = lagebild(platz);
    expect(bild.undoObersteSchritt).toBe("Befördern (mit Annahme, Nummer und Kopien)");
    expect(bild.undoObersteTeile).toBe(4);
    // Ein Bedienschritt, ein Eintrag: Die Tiefe wächst um eins, die Art ist die des Hauptschritts.
    expect(bild.undoTiefe).toBe(tiefe + 1);
    expect(bild.undoObersteArt).toBe("NachrichtBefoerdert");
    const ergebnis = await platz.dienst.zurueck();
    expect(ergebnis.art).toBe("geschrieben");
    expect(warnungen(ergebnis)[0]).toBe("Zurückgenommen: Befördern (mit Annahme, Nummer und Kopien) (4 Teile).");
    const zeile = nachweisung(platz)[0];
    expect([zeile?.befoerderung, zeile?.annahme, zeile?.nummer, zeile?.sichtung]).toEqual([undefined, undefined, undefined, undefined]);
    // Jede Kompensation ist ein eigenes Ereignis mit `undoOf` (U1).
    expect(tagebuch(platz, "A-1").filter((z) => z.undoOf !== undefined)).toHaveLength(4);
  });

  it("Szenario: Eingang aufnehmen mit Nummer und Sichtung — Nummer und Sichtung gehen, der Eingang bleibt", async () => {
    const platz = await fmzAllein();
    const verteiler = [{ stelle: "S3", kopie: "GRUEN" }];
    await platz.dienst.bediene(nachrichtAufnehmen(eingang(), { nachweis: { nummer: 1, zeitpunkt: jetzt(), handzeichen: "Fm" }, sichtung: { zeitpunkt: jetzt(), handzeichen: "Fm", verteiler } }));
    expect(lagebild(platz).undoObersteSchritt).toBe("Eingang aufnehmen (mit Nummer und Sichtung)");
    const ergebnis = await platz.dienst.zurueck();
    expect(warnungen(ergebnis)).toContain("Die Nachricht selbst bleibt: Eine aufgegebene oder aufgenommene Nachricht wird nicht rückgängig gemacht, sondern mit Grund zurückgezogen.");
    expect(nachweisung(platz)[0]).toMatchObject({ id: "E-1", laufzustand: "VOR_SICHTER" });
    expect(nachweisung(platz)[0]?.nummer).toBeUndefined();
  });

  it("Szenario: nach dem Aufgeben nennt das Lagebild den Schritt, der nicht rückgängig geht", async () => {
    const platz = await fmzAllein();
    await platz.dienst.bediene(erledigtVorbereitung());
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "A-2" })));
    const bild = lagebild(platz);
    expect(bild.undoOhneRuecknahme).toMatchObject({ art: "NachrichtVerfasst", hinweis: expect.stringContaining("zurückgezogen") as unknown as string });
    expect(bild.undoOhneRuecknahme?.objekt).toContain("Nachricht A");
  });
});

/** Ein rücknehmbarer älterer Schritt, damit der Stapel nicht leer ist. */
function erledigtVorbereitung() {
  const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, "fmzSchwelleMinuten", null, 25);
  if (entwurf === undefined) throw new Error("kein Entwurf");
  return entwurf;
}

function ldfAlsStation() {
  const entwurf = nachrichtenParameterSetzen(EINSATZ_ID, "ldfStation", null, true);
  if (entwurf === undefined) throw new Error("kein Entwurf");
  return entwurf;
}

describe("R2-SGL P2-1, R2-LdF P3-7: Prüfungen des Papier-Nachtrags", () => {
  it("Szenario: Beförderung vor der Annahme und in der Zukunft — geschrieben, aber mit Warnung der Stufe „warnung“", async () => {
    const platz = await fmzAllein();
    const entwurf = nachrichtAufnehmen(anlage({ abfassungszeit: vorMinuten(30) }), {
      annahme: { zeitpunkt: vorMinuten(10), handzeichen: "Fm" },
      befoerderung: { mittel: "FUNK", zeitpunkt: vorMinuten(20), handzeichen: "Fm" },
      nachweis: { nummer: 2, zeitpunkt: vorMinuten(10), handzeichen: "Fm" },
      nachtrag: true,
    });
    const ergebnis = await platz.dienst.bediene(entwurf);
    expect(ergebnis.art).toBe("geschrieben");
    const satz = warnungen(ergebnis).find((w) => w.startsWith("Nachtrag: Beförderung"));
    expect(satz).toMatch(/liegt vor der Annahme/u);
    if (ergebnis.art === "geschrieben") expect(ergebnis.warnungStufen?.[ergebnis.warnungen?.indexOf(satz ?? "") ?? -1]).toBe("warnung");

    const zukunft = nachrichtAufnehmen(anlage({ nachrichtId: "A-2" }), { annahme: { zeitpunkt: new Date(Date.now() + 60 * 60_000).toISOString(), handzeichen: "Fm" }, nachtrag: true });
    expect(warnungen(await platz.dienst.bediene(zukunft)).some((w) => w.includes("liegt in der Zukunft"))).toBe(true);
    // Eine doppelte Nummer bleibt die bekannte Warnung, jetzt mit Stufe „warnung“ (R2-ETB P3-1).
    const doppelt = await platz.dienst.bediene(nachrichtAufnehmen(anlage({ nachrichtId: "A-3" }), { nachweis: { nummer: 2, zeitpunkt: jetzt(), handzeichen: "Fm" }, nachtrag: true }));
    if (doppelt.art === "geschrieben") expect(doppelt.warnungStufen?.[doppelt.warnungen?.findIndex((w) => w.startsWith("Die Nummer 2")) ?? -1]).toBe("warnung");
  });
});

describe("R2-LdF P2-1, P2-2: Wegmarken der Beförderung", () => {
  it("Szenario: abweichend vom Vorschlag und ohne Vorschlag bei besetztem LdF", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["FMZ", "LDF"], "Fm");
    await platz.dienst.bediene(ldfAlsStation());
    await platz.dienst.bediene(nachrichtVerfassen(anlage()));
    await platz.dienst.bediene(nachrichtVorschlagen("A-1", null, { mittel: "TELEFON", fernmelder: "Fm2", zeitpunkt: jetzt(), handzeichen: "Ld" }));
    const abweichend = await platz.dienst.bediene(nachrichtBefoerdern("A-1", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    expect(warnungen(abweichend).some((w) => w.includes("abweichend vom Vorschlag des LdF (Telefon → Funk)"))).toBe(true);
    await platz.dienst.bediene(nachrichtVerfassen(anlage({ nachrichtId: "A-2" })));
    await platz.dienst.bediene(nachrichtBefoerdern("A-2", null, { mittel: "FUNK", zeitpunkt: jetzt(), handzeichen: "Fm" }));
    const zeilen = new Map(nachweisung(platz).map((z) => [z.id, z]));
    expect(zeilen.get("A-1")?.abweichungVomVorschlag).toBe("Telefon → Funk");
    expect(zeilen.get("A-2")?.ohneVorschlag).toBe(true);
    expect(tagebuch(platz, "A-1").find((z) => z.typ === "NachrichtBefoerdert")?.satz).toContain("abweichend vom Vorschlag (Telefon → Funk)");
    expect(tagebuch(platz, "A-2").find((z) => z.typ === "NachrichtBefoerdert")?.satz).toContain("ohne Vorschlag des LdF");
  });
});

describe("ETB P1-7, R2-ETB P3-3, P3-4: Erledigen und Zurückziehen", () => {
  it("Szenario: Erledigung mit Handzeichen; Zurückziehen nach Verteilung nennt die Stellen, die Zeile den Satz", async () => {
    const platz = await werkstattMitEinemPlatz();
    await grundlage(platz);
    platz.dienst.stellenSetzen(["SICHTER", "S3"], "Mü");
    await platz.dienst.bediene({ ...nachrichtVerfassen(eingang()), grund: "Test ohne FmZ" });
    await platz.dienst.bediene(nachrichtSichten("E-1", null, { zeitpunkt: jetzt(), handzeichen: "Mü", verteiler: [{ stelle: "S3", kopie: "GRUEN" }, { stelle: "S2", kopie: "ROT" }] }));
    await platz.dienst.bediene(erledigt("E-1", "S3"));
    const erledigung = tagebuch(platz, "E-1").find((z) => z.typ === "NachrichtErledigt");
    expect(erledigung).toMatchObject({ handzeichen: "Mü", stelle: "S3" });
    expect(erledigung?.satz).toContain("für S3 erledigt (Hz. Mü)");
    const rueckzug = await platz.dienst.bediene(nachrichtZurueckziehen("E-1", "Fehlanlage"));
    const hinweis = warnungen(rueckzug).find((w) => w.includes("war schon verteilt"));
    expect(hinweis).toContain("S3 (erledigt), S2 (neu)");
    const zeile = nachweisung(platz)[0];
    expect(zeile?.zurueckgezogenText).toMatch(/^Zurückgezogen \d{2}\.\d{2}\.\d{4} \d{2}:\d{2} von Sichter · Mü, Grund: „Fehlanlage“$/u);
  });
});

describe("FM P2-7: Aufnahme berichtigen", () => {
  it("Szenario: Zahlendreher in der Aufnahmezeit — mit Grund berichtigt, im Tagebuch als Berichtigung", async () => {
    const platz = await fmzAllein();
    const falsch = { mittel: "FUNK", zeitpunkt: vorMinuten(1), handzeichen: "Fm" };
    await platz.dienst.bediene(nachrichtVerfassen(eingang({ aufnahme: falsch })));
    const richtig = { mittel: "TELEFON", zeitpunkt: vorMinuten(5), handzeichen: "Fm" };
    const ohneGrund = await platz.dienst.bediene({ ...aufnahmeBerichtigen("E-1", falsch, richtig, "x"), grund: "" });
    expect(ohneGrund.art).toBe("abgewiesen");
    expect((await platz.dienst.bediene(aufnahmeBerichtigen("E-1", falsch, richtig, "Zahlendreher"))).art).toBe("geschrieben");
    expect(nachweisung(platz)[0]?.aufnahme).toEqual(richtig);
    const zeile = tagebuch(platz, "E-1").find((z) => z.typ === "NachrichtAufnahmeBerichtigt");
    expect(zeile).toMatchObject({ berichtigung: true, grund: "Zahlendreher", stelle: "FMZ" });
    expect(zeile?.satz).toMatch(/Aufnahme berichtigt \(Funk \d{4} → Telefon \d{4}, Hz\. Fm\)/u);
  });
});
