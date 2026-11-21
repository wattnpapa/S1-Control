/**
 * Der Leiter des Fernmeldebetriebes als Station im Laufweg (bestätigt am
 * 2026-11-17, KONZEPT-NACHRICHTEN.md §5, §9): die Ereignisse
 * `NachrichtUebermittlungVorgeschlagen` (Ausgang) und `NachrichtWeitergegeben`
 * (Eingang) im Fold, der
 * Laufzustand VOR_LDF nur mit dem Parameter `ldfStation`, die sechste Zahl
 * des Bandes und die Tagebuchsätze.
 *
 * Ohne den Parameter muss alles bleiben wie vorher — das ist die Hälfte der
 * Prüfung, denn ein Einsatz ohne LdF darf durch die neue Station nicht
 * anders laufen.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { KATALOG } from "./katalog/index.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "./pruefhilfen/ereignisbau.js";
import { nachrichtenausschnitt, nachrichtenlage } from "./projektion/nachrichten.js";
import { GRUND_ERSATZSICHTER, nachrichtensatz, stellenWort } from "./projektion/tagebuch-nachrichten.js";
import type { Zustand } from "./zustand.js";

let n = 0;
function h(): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, "a");
}

const um = (minute: number): string => `2026-09-08T08:${String(minute).padStart(2, "0")}:00+02:00`;

function grundlage(ldf: boolean): EingehendesEreignis[] {
  n = 0;
  const basis = [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
  ];
  return ldf ? [...basis, feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "ldfStation" }, null, true)] : basis;
}

function ausgang(id: string): EingehendesEreignis {
  return anlageEreignis(h(), n, "NachrichtVerfasst", { nachrichtId: id, richtung: "AUSGANG", anschrift: "OV", absender: "S4", betreff: "Sandsäcke", inhalt: "500 Stück" });
}

function eingang(id: string): EingehendesEreignis {
  return anlageEreignis(h(), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: "FüSt",
    absender: "OV Wildeshausen",
    betreff: "Pumpen eingetroffen",
    inhalt: "Zwei Pumpen.",
    aufnahme: { mittel: "FUNK", zeitpunkt: um(1), handzeichen: "FM" },
  });
}

function vermerk(typ: string, id: string, neu: unknown, vorher: unknown = null): EingehendesEreignis {
  return feldEreignis(h(), n, typ, { nachrichtId: id }, vorher, neu);
}

const annahme = { zeitpunkt: um(2), handzeichen: "FM" };
const festlegung = { mittel: "KURIER", fernmelder: "Fm2", gegenstelle: "OV", zeitpunkt: um(3), handzeichen: "LF" };
const befoerderung = { mittel: "KURIER", zeitpunkt: um(4), handzeichen: "FM" };
const weitergabe = { zeitpunkt: um(3), handzeichen: "LF" };

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function lauf(z: Zustand, id: string): string | undefined {
  return z.nachrichten?.[id]?.laufzustand;
}

describe("LdF im Katalog", () => {
  it("führt Vorschlag und Weitergabe als Strukturfelder mit derselben Art als Rücknahme", () => {
    expect(KATALOG.get("NachrichtUebermittlungVorgeschlagen")).toMatchObject({ form: "a", feld: { art: "fest", pfad: "vorschlag" }, klasse: "LWW_ENTITAET", gegenereignis: "NachrichtUebermittlungVorgeschlagen" });
    expect(KATALOG.get("NachrichtWeitergegeben")).toMatchObject({ form: "a", feld: { art: "fest", pfad: "weitergabe" }, klasse: "LWW_ENTITAET", gegenereignis: "NachrichtWeitergegeben" });
    expect(stellenWort("LDF")).toBe("LdF");
  });
});

describe("LdF im Fold: Ausgang", () => {
  it("mit Parameter: aufgegeben gleich beim LdF, mit Zuteilung vor der FmZ, befördert erledigt (FOLD_VERSION 15)", () => {
    const angelegt = [...grundlage(true), ausgang("A1")];
    const z = zustand(angelegt);
    expect(z.einsatz?.ldfStation?.wert).toBe(true);
    // Der LdF sichtet den Ausgang vor jedem Fernmelder — auch ohne Annahme.
    expect(lauf(z, "A1")).toBe("VOR_LDF");
    expect(lauf(zustand([...angelegt, vermerk("NachrichtAngenommen", "A1", annahme)]), "A1")).toBe("VOR_LDF");
    const festgelegt = [...angelegt, vermerk("NachrichtUebermittlungVorgeschlagen", "A1", festlegung)];
    const zf = zustand(festgelegt);
    expect(zf.nachrichten?.["A1"]?.vorschlag?.wert).toEqual(festlegung);
    expect(lauf(zf, "A1")).toBe("VOR_FMZ");
    const angenommen = [...festgelegt, vermerk("NachrichtAngenommen", "A1", annahme)];
    expect(lauf(zustand(angenommen), "A1")).toBe("VOR_FMZ");
    expect(lauf(zustand([...angenommen, vermerk("NachrichtBefoerdert", "A1", befoerderung)]), "A1")).toBe("ERLEDIGT");
  });

  it("ohne Parameter bleibt der angenommene Ausgang vor der FmZ — auch mit Vorschlag", () => {
    const angenommen = [...grundlage(false), ausgang("A1"), vermerk("NachrichtAngenommen", "A1", annahme)];
    expect(lauf(zustand(angenommen), "A1")).toBe("VOR_FMZ");
    expect(lauf(zustand([...angenommen, vermerk("NachrichtUebermittlungVorgeschlagen", "A1", festlegung)]), "A1")).toBe("VOR_FMZ");
  });

  it("die Rücknahme des Vorschlags stellt den Ausgang zurück vor den LdF; ein fremdes Mittel meldet sich", () => {
    const festgelegt = [...grundlage(true), ausgang("A1"), vermerk("NachrichtAngenommen", "A1", annahme), vermerk("NachrichtUebermittlungVorgeschlagen", "A1", festlegung)];
    expect(lauf(zustand([...festgelegt, vermerk("NachrichtUebermittlungVorgeschlagen", "A1", null, festlegung)]), "A1")).toBe("VOR_LDF");
    const fremd = zustand([...festgelegt, vermerk("NachrichtUebermittlungVorgeschlagen", "A1", { ...festlegung, mittel: "BRIEFTAUBE" }, festlegung)]);
    expect(fremd.hinweise).toContainEqual({ art: "unbekannterWert", feldpfad: "nachricht/A1/vorschlag", wert: "BRIEFTAUBE" });
  });
});

describe("LdF im Fold: Eingang", () => {
  it("mit Parameter: aufgenommen vor dem LdF, weitergegeben vor dem Sichter, gesichtet verteilt", () => {
    const basis = [...grundlage(true), eingang("E1")];
    expect(lauf(zustand(basis), "E1")).toBe("VOR_LDF");
    const weiter = [...basis, vermerk("NachrichtWeitergegeben", "E1", weitergabe)];
    const z = zustand(weiter);
    expect(z.nachrichten?.["E1"]?.weitergabe?.wert).toEqual(weitergabe);
    expect(lauf(z, "E1")).toBe("VOR_SICHTER");
    const gesichtet = vermerk("NachrichtGesichtet", "E1", { zeitpunkt: um(5), handzeichen: "SI", verteiler: [{ stelle: "S2", kopie: "ROT" }] });
    expect(lauf(zustand([...weiter, gesichtet]), "E1")).toBe("VERTEILT");
    // Eine Sichtung ohne Weitergabe (Ersatzsichter beim Aufnehmen) ist ebenso verteilt.
    expect(lauf(zustand([...basis, gesichtet]), "E1")).toBe("VERTEILT");
  });

  it("ohne Parameter oder ohne Aufnahme, und die Gesprächsnotiz: nie vor dem LdF", () => {
    expect(lauf(zustand([...grundlage(false), eingang("E1")]), "E1")).toBe("VOR_SICHTER");
    const basis = grundlage(true);
    const ohneAufnahme = anlageEreignis(h(), n, "NachrichtVerfasst", { nachrichtId: "E2", richtung: "EINGANG", anschrift: "S3", absender: "Polizei", betreff: "", inhalt: "x" });
    const notiz = anlageEreignis(h(), n, "NachrichtVerfasst", { nachrichtId: "E3", richtung: "EINGANG", gespraechsnotiz: true, anschrift: "S3", absender: "Polizei", betreff: "", inhalt: "x", aufnahme: { mittel: "TELEFON", zeitpunkt: um(1), handzeichen: "S3" } });
    const z = zustand([...basis, ohneAufnahme, notiz]);
    expect(lauf(z, "E2")).toBe("VOR_SICHTER");
    expect(lauf(z, "E3")).toBe("VOR_SICHTER");
  });
});

describe("LdF in Projektion und Tagebuch", () => {
  it("die Sicht „ldf“ zeigt beide Richtungen, die FmZ den angenommenen Ausgang weiter, das Band zählt nur mit Parameter", () => {
    const ereignisse = [...grundlage(true), ausgang("A1"), vermerk("NachrichtAngenommen", "A1", annahme), eingang("E1")];
    const z = zustand(ereignisse);
    expect(nachrichtenausschnitt(z, { sicht: "ldf" }).zeilen.map((zeile) => zeile.id).sort()).toEqual(["A1", "E1"]);
    expect(nachrichtenausschnitt(z, { sicht: "fmz" }).zeilen.map((zeile) => zeile.id)).toEqual(["A1"]);
    expect(nachrichtenausschnitt(z, { sicht: "sichter" }).zeilen).toEqual([]);
    expect(nachrichtenlage(z, [])).toMatchObject({ vorLdf: 2, vorFmz: 0, vorSichter: 0 });
    const ohne = zustand([...grundlage(false), ausgang("A1"), vermerk("NachrichtAngenommen", "A1", annahme), eingang("E1")]);
    expect(nachrichtenlage(ohne, [])).not.toHaveProperty("vorLdf");
  });

  it("die Zeile trägt Vorschlag und Weitergabe; die Tagebuchsätze nennen Fernmelder, Mittel und Handzeichen", () => {
    const basis = [...grundlage(true), ausgang("A1"), vermerk("NachrichtAngenommen", "A1", annahme)];
    const fest = vermerk("NachrichtUebermittlungVorgeschlagen", "A1", festlegung);
    const ankunft = eingang("E1");
    const weiter = vermerk("NachrichtWeitergegeben", "E1", weitergabe);
    const ereignisse = [...basis, fest, ankunft, weiter];
    const z = zustand(ereignisse);
    const zeilen = nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen;
    expect(zeilen.find((zeile) => zeile.id === "A1")?.vorschlag).toEqual(festlegung);
    expect(zeilen.find((zeile) => zeile.id === "E1")?.weitergabe).toEqual(weitergabe);
    expect(nachrichtensatz(z, fest, "")).toBe("Nachricht A Übermittlung vorgeschlagen (durch Fm2, Kurier/Melder, an OV, Hz. LF): S4 an OV, ‚Sandsäcke‘");
    expect(nachrichtensatz(z, weiter, "")).toBe("Nachricht E an den Sichter weitergegeben (Hz. LF): OV Wildeshausen an FüSt, ‚Pumpen eingetroffen‘");
    const parameter = feldEreignis(h(), n, "NachrichtenParameterGesetzt", { einsatzId: "X", feld: "ldfStation" }, null, true);
    expect(nachrichtensatz(z, parameter, "Nachrichtenparameter gesetzt")).toBe("Nachrichtenparameter gesetzt (LdF als Station): nein → ja");
  });
});

describe("Zwei Sichtungen ohne Abgleich und der Ersatzsichter im Tagebuch (§5)", () => {
  const sichtung = (stelle: string, hz: string) => ({ zeitpunkt: um(5), handzeichen: hz, verteiler: [{ stelle, kopie: "GRUEN" }] });

  it("vereinigt die Verteiler, bis eine Nachsichtung mit passendem Vorher-Wert bereinigt", () => {
    const basis = [...grundlage(false), eingang("E1")];
    const erste = vermerk("NachrichtGesichtet", "E1", sichtung("S3", "SI"));
    const zweite = vermerk("NachrichtGesichtet", "E1", sichtung("LEITER", "KO"));
    const z = zustand([...basis, erste, zweite]);
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "vorherPasstNicht", feldpfad: "nachricht/E1/sichtung" }));
    const zeile = nachrichtenausschnitt(z, { sicht: "nachweisung" }).zeilen[0];
    expect(zeile?.verteiler.map((m) => m.stelle)).toEqual(["LEITER", "S3"]);
    expect(zeile?.zweiteSichtung?.handzeichen).toBe("SI");
    // Erledigt nur, wenn beide Verteiler erledigt sind.
    const nurLeiter = zustand([...basis, erste, zweite, feldEreignis(h(), n, "NachrichtErledigt", { nachrichtId: "E1", stelle: "LEITER" }, null, true)]);
    expect(lauf(nurLeiter, "E1")).toBe("VERTEILT");
    const nach = vermerk("NachrichtGesichtet", "E1", sichtung("S3", "SI"), sichtung("LEITER", "KO"));
    const bereinigt = nachrichtenausschnitt(zustand([...basis, erste, zweite, nach]), { sicht: "nachweisung" }).zeilen[0];
    expect(bereinigt?.verteiler.map((m) => m.stelle)).toEqual(["S3"]);
    expect(bereinigt?.zweiteSichtung).toBeUndefined();
  });

  it("nennt die Sichtung des Ersatzsichters im Tagebuch", () => {
    const basis = [...grundlage(false), eingang("E1")];
    const ersatz: EingehendesEreignis = { ...vermerk("NachrichtGesichtet", "E1", sichtung("S3", "FM")), grund: GRUND_ERSATZSICHTER };
    expect(nachrichtensatz(zustand([...basis, ersatz]), ersatz, "")).toContain("als Ersatzsichter gesichtet (Hz. FM)");
  });
});
