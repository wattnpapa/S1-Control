/**
 * Mahlzeitenregel, Ausgabestellen und Bestellung (S4.3, KONZEPT-S4.md §5.1, §6).
 *
 * Geprüft wird: Die Regel des Einsatzes sticht die Vorbelegung und wirkt
 * auf die Schichten; eine unlesbare Regel fällt auf die Vorbelegung zurück;
 * die Bestellung steht im Tagebuch, lässt sich zurücknehmen, wird durch eine
 * jüngere ersetzt, und ihre Differenz zur Vorausschau ist eine Zahl mit
 * Vorzeichen; die Ausgabestelle ist gesetzt oder der Bereich LOGISTIK.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, hlc, staerke } from "./pruefhilfen/ereignisbau.js";
import { regelstand } from "./projektion/mahlzeitenregel.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { versorgungsblatt, versorgungszahlen } from "./projektion/versorgung-blatt.js";
import { kompensationFuer } from "./undo.js";
import type { Zustand } from "./zustand.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");
const MESZ = 120;
const JETZT = "2026-09-10T14:43:00+02:00";

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "LOG", name: "Logistik", abschnittstyp: "LOGISTIK", reihenfolge: 0 }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "T", abschnittId: "EA1", bezeichnung: "Tag", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 9), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ", schicht: "TAG" }),
    einheitGemeldet(h(), n, { einheitId: "N", abschnittId: "EA1", bezeichnung: "Nacht", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 5), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ", schicht: "NACHT" }),
  ];
}

const zustand = (e: readonly EingehendesEreignis[]): Zustand => materialisiere(falteHinzu(leereFaltung(), e));

function regel(neu: unknown): EingehendesEreignis {
  return feldEreignis(h(), n, "MahlzeitenregelGesetzt", { einsatzId: "X" }, null, neu);
}

function bestellt(id: string, mahlzeit: string, portionen: number, datum = "2026-09-10"): EingehendesEreignis {
  return anlageEreignis(h(), n, "MahlzeitBestellt", { bestellungId: id, datum, mahlzeit, portionen, vegetarisch: 2, vegan: 1, bestelltBei: "Küche JUH" });
}

const blatt = (z: Zustand): ReturnType<typeof versorgungsblatt> => versorgungsblatt(z, { jetzt: JETZT, versatzMinuten: MESZ });

describe("Die Mahlzeitenregel als Einsatzparameter", () => {
  it("gilt als Vorbelegung, solange der Einsatz keine eigene setzt", () => {
    expect(regelstand(zustand(grundlage())).vorbelegung).toBe(true);
    expect(blatt(zustand(grundlage())).regelVorbelegung).toBe(true);
  });

  it("wirkt gegen die Schichten: Nachtverpflegung um 0200 nur für die Nachtschicht, Abend nur für Tag", () => {
    const eigene = [
      { mahlzeit: "ABEND", uhrzeit: "1900", schichten: ["TAG"] },
      { mahlzeit: "NACHT", uhrzeit: "0200", schichten: ["NACHT"] },
    ];
    const b = blatt(zustand([...grundlage(), regel(eigene)]));
    expect(b.regelVorbelegung).toBe(false);
    expect(b.vorausschau.mahlzeiten.map((m) => `${m.mahlzeit} ${m.uhrzeit} ${String(m.bestand.portionen)}`)).toEqual([
      "ABEND 1900 10",
      "NACHT 0200 6",
    ]);
    expect(b.plan.summe.jeMahlzeit).toEqual({ FRUEHSTUECK: 0, MITTAG: 0, ABEND: 10, NACHT: 6 });
  });

  it("fällt bei einer unlesbaren Regel auf die Vorbelegung zurück", () => {
    const z = zustand([...grundlage(), regel([{ mahlzeit: "ABEND", uhrzeit: "25:00", schichten: [] }])]);
    expect(regelstand(z).vorbelegung).toBe(true);
    expect(blatt(z).vorausschau.mahlzeiten).toHaveLength(4);
  });

  it("nimmt eine gesetzte Regel mit Undo auf die vorige zurück", () => {
    const erste = regel([{ mahlzeit: "ABEND", uhrzeit: "1900", schichten: ["TAG"] }]);
    const k = kompensationFuer(erste, zustand([...grundlage(), erste]));
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "MahlzeitenregelGesetzt", neu: null } });
  });
});

describe("Die Ausgabestelle eines Bereichs", () => {
  it("ist vorbelegt mit dem einzigen Bereich vom Typ LOGISTIK und lässt sich setzen", () => {
    expect(blatt(zustand(grundlage())).plan.zeilen[0]?.ausgabestelle).toEqual({ name: "Logistik", vorbelegt: true });
    const z = zustand([
      ...grundlage(),
      anlageEreignis(h(), n, "AusgabestelleAngelegt", { ausgabestelleId: "AS1", name: "Feldküche", traeger: "JUH" }),
      feldEreignis(h(), n, "AbschnittAusgabestelleGesetzt", { abschnittId: "EA1" }, null, "AS1"),
    ]);
    expect(blatt(z).plan.zeilen[0]?.ausgabestelle).toEqual({ id: "AS1", name: "Feldküche", vorbelegt: false });
    expect(blatt(z).ausgabestellen).toEqual([{ ausgabestelleId: "AS1", name: "Feldküche", traeger: "JUH" }]);
  });
});

describe("Die Bestellung", () => {
  it("zeigt die Differenz zur Vorausschau mit Vorzeichen und trägt bestellt ins Lagebild", () => {
    const z = zustand([...grundlage(), bestellt("B1", "ABEND", 12)]);
    const b = blatt(z);
    expect(b.vorausschau.mahlzeiten[0]?.vorausschau.portionen).toBe(16);
    expect(b.bestellstand[0]).toMatchObject({ differenz: -4, bestellung: { bestellungId: "B1", portionen: 12 } });
    expect(b.bestellstand[1]?.bestellung).toBeUndefined();
    expect(versorgungszahlen(z, { jetzt: JETZT, versatzMinuten: MESZ }).mahlzeiten[0]).toMatchObject({ bestellt: 12, differenz: -4 });
  });

  it("ersetzt eine ältere Bestellung derselben Mahlzeit durch die jüngere", () => {
    const z = zustand([...grundlage(), bestellt("B1", "ABEND", 12), bestellt("B2", "ABEND", 18)]);
    const b = blatt(z);
    expect(b.bestellstand[0]?.bestellung?.bestellungId).toBe("B2");
    expect(b.bestellungen.find((x) => x.bestellungId === "B1")?.ersetzt).toBe(true);
  });

  it("lässt nach einer Stornierung die vorige wieder gelten", () => {
    const z = zustand([
      ...grundlage(),
      bestellt("B1", "ABEND", 12),
      bestellt("B2", "ABEND", 18),
      feldEreignis(h(), n, "MahlzeitStorniert", { bestellungId: "B2" }, null, true, "Doppelt bestellt"),
    ]);
    expect(blatt(z).bestellstand[0]?.bestellung?.bestellungId).toBe("B1");
  });

  it("steht im Tagebuch mit Mahlzeit, Tag und Portionen und die Lieferung mit „von“", () => {
    const b1 = bestellt("B1", "ABEND", 12);
    const lieferung = feldEreignis(h(), n, "MahlzeitGeliefert", { bestellungId: "B1" }, null, 12);
    const z = zustand([...grundlage(), b1, lieferung]);
    expect(tagebuchzeile(z, b1).satz).toContain("Abend 10.09. bestellt: 12 Portionen (2 veg., 1 vegan) bei Küche JUH");
    expect(tagebuchzeile(z, lieferung).satz).toContain("12 von 12 Portionen");
    expect(blatt(z).bestellungen[0]?.geliefert).toBe(12);
  });

  it("lässt sich zurücknehmen: Anlage mit Grund, Stornierung ohne", () => {
    const b1 = bestellt("B1", "ABEND", 12);
    const z = zustand([...grundlage(), b1]);
    expect(kompensationFuer(b1, z)).toEqual({ art: "brauchtGrund", zielArt: "MahlzeitStorniert" });
    expect(kompensationFuer(b1, z, "falsch bestellt")).toMatchObject({ art: "entwurf", entwurf: { typ: "MahlzeitStorniert", neu: true } });
    const storno = feldEreignis(h(), n, "MahlzeitStorniert", { bestellungId: "B1" }, null, true, "zu früh");
    expect(kompensationFuer(storno, zustand([...grundlage(), b1, storno]))).toMatchObject({
      art: "entwurf",
      entwurf: { typ: "MahlzeitStornoZurueckgenommen", neu: false },
    });
  });

  it("verwirft eine Stornierung ohne Grund (§2.4)", () => {
    const z = zustand([...grundlage(), bestellt("B1", "ABEND", 12), feldEreignis(h(), n, "MahlzeitStorniert", { bestellungId: "B1" }, null, true)]);
    expect(blatt(z).bestellstand[0]?.bestellung?.bestellungId).toBe("B1");
  });
});
