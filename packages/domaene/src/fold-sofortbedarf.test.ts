/**
 * Die Abarbeitung des Sofortbedarfs je Feld (S4.4, KONZEPT-S4.md §5.5).
 *
 * Diesel kann erledigt sein und Unterbringung noch nicht; eine Zeile, deren
 * Felder alle erledigt sind, bleibt in der Liste und wird blass; die Summen
 * nennen den gemeldeten und den offenen Bedarf; Undo und „wieder offen"
 * nehmen die Erledigung zurück; das Tagebuch nennt das Feld.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, hlc, staerke } from "./pruefhilfen/ereignisbau.js";
import { sofortbedarfsliste } from "./projektion/sofortbedarf.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { versorgungseinheiten } from "./projektion/versorgung.js";
import { kompensationFuer } from "./undo.js";
import type { Zustand } from "./zustand.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Sturm", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "FGr WP", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 2, 13), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    einheitGemeldet(h(), n, { einheitId: "E2", abschnittId: "EA1", bezeichnung: "B 2", organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 5), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    feldEreignis(h(), n, "SofortbedarfGesetzt", { einheitId: "E1" }, null, { verpflegungPersonen: 15, dieselLiter: 800, benzinLiter: 0, gemischLiter: 20, unterbringung: true, ruhezeitErforderlich: false }),
    feldEreignis(h(), n, "SofortbedarfGesetzt", { einheitId: "E2" }, null, { verpflegungPersonen: 6, dieselLiter: 100, benzinLiter: 0, gemischLiter: 0, unterbringung: false, ruhezeitErforderlich: false }),
    anlageEreignis(h(), n, "FahrzeugAngelegt", { fahrzeugId: "F1", typ: "MTW", einheitId: "E1", status: "EINSATZBEREIT" }),
  ];
}

const erledigt = (einheitId: string, feld: string): EingehendesEreignis => feldEreignis(h(), n, "SofortbedarfErledigt", { einheitId, feld }, null, true);
const zustand = (e: readonly EingehendesEreignis[]): Zustand => materialisiere(falteHinzu(leereFaltung(), e));
const liste = (z: Zustand): ReturnType<typeof sofortbedarfsliste> => sofortbedarfsliste(z, versorgungseinheiten(z, Date.parse("2026-09-08T12:00:00+02:00")));

describe("Sofortbedarf je Feld erledigen", () => {
  it("kennt die Felder mit Bedarf und die Fahrzeuge der Einheit", () => {
    const z = liste(zustand(grundlage())).zeilen.find((x) => x.einheitId === "E1");
    expect(z?.felder).toEqual(["VERPFLEGUNG", "DIESEL", "GEMISCH", "UNTERBRINGUNG"]);
    expect(z?.fahrzeuge).toBe("MTW");
    expect(z?.vollstaendig).toBe(false);
  });

  it("erledigt Diesel, ohne die Unterbringung zu berühren, und rechnet die offenen Liter", () => {
    const l = liste(zustand([...grundlage(), erledigt("E1", "DIESEL")]));
    const z = l.zeilen.find((x) => x.einheitId === "E1");
    expect(Object.keys(z?.erledigt ?? {})).toEqual(["DIESEL"]);
    expect(l.summe.dieselLiter).toBe(900);
    expect(l.offen.dieselLiter).toBe(100);
    expect(l.offen.unterbringung).toBe(1);
    expect(l.offen.zeilen).toBe(2);
  });

  it("lässt eine vollständig erledigte Zeile stehen, blass und hinten", () => {
    const l = liste(zustand([...grundlage(), erledigt("E2", "VERPFLEGUNG"), erledigt("E2", "DIESEL")]));
    expect(l.zeilen.map((z) => z.einheitId)).toEqual(["E1", "E2"]);
    expect(l.zeilen[1]?.vollstaendig).toBe(true);
    expect(l.offen.zeilen).toBe(1);
  });

  it("öffnet ein Feld wieder und nimmt die Erledigung per Undo zurück", () => {
    const e = erledigt("E1", "DIESEL");
    const offen = feldEreignis(h(), n, "SofortbedarfWiederOffen", { einheitId: "E1", feld: "DIESEL" }, true, false);
    expect(liste(zustand([...grundlage(), e, offen])).offen.dieselLiter).toBe(900);
    const k = kompensationFuer(e, zustand([...grundlage(), e]));
    expect(k).toMatchObject({ art: "entwurf", entwurf: { typ: "SofortbedarfWiederOffen", nutzlast: { einheitId: "E1", feld: "DIESEL" }, neu: false } });
    const zurueck = kompensationFuer(offen, zustand([...grundlage(), e, offen]));
    expect(zurueck).toMatchObject({ art: "entwurf", entwurf: { typ: "SofortbedarfErledigt", neu: true } });
  });

  it("verwirft ein unbekanntes Feld", () => {
    const z = zustand([...grundlage(), feldEreignis(h(), n, "SofortbedarfErledigt", { einheitId: "E1", feld: "WASSER" }, null, true)]);
    expect(z.unbekannt.some((u) => u.typ === "SofortbedarfErledigt")).toBe(true);
  });

  it("nennt im Tagebuch Einheit und Feld", () => {
    const e = erledigt("E1", "GEMISCH");
    expect(tagebuchzeile(zustand([...grundlage(), e]), e).satz).toMatch(/FGr WP.*Gemisch/);
  });
});
