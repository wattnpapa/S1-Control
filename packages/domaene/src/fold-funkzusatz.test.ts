/**
 * Weitere Rufgruppen und Funkhinweis der Einheit im Fold (Funkplan F2,
 * KONZEPT-FUNKPLAN.md §8).
 *
 * Beide sind Stammdaten der Einheit (`EinheitStammdatenGeaendert`). Geprüft
 * wird, was daraus folgen soll: die Liste gilt als Ganzes (LWW über die
 * Liste wie `hierarchie`), jede unbekannte Kennung darin ist eine
 * Fremdreferenz, die Rücknahme stellt die vorige Liste her, und das Tagebuch
 * nennt Gruppen beim Namen und trägt das Feld für den Funkauszug.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { KATALOG } from "./katalog/index.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, hlc, staerke } from "./pruefhilfen/ereignisbau.js";
import { istFunkzeile } from "./projektion/tagebuch-funk.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { kompensationFuer } from "./undo.js";
import { FOLD_VERSION, type Zustand } from "./zustand.js";

let n = 0;
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, client);
}

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "B 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(1, 2, 9), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE" }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R2", betriebsart: "DMO", name: "DMO 311" }),
  ];
}

function weitere(vorher: readonly string[] | null, neu: readonly string[] | null, client = "a"): EingehendesEreignis {
  return feldEreignis(h(client), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "weitereRufgruppenIds" }, vorher, neu);
}

function hinweis(vorher: string | null, neu: string | null): EingehendesEreignis {
  return feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "funkHinweis" }, vorher, neu);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

describe("Weitere Rufgruppen und Funkhinweis im Fold", () => {
  it("steht mindestens auf Fassung 8 und führt die Liste als Ganzes (LWW_ENTITAET)", () => {
    expect(FOLD_VERSION).toBeGreaterThanOrEqual(8);
    expect(KATALOG.get("EinheitStammdatenGeaendert")?.klasseJeFeld?.["weitereRufgruppenIds"]).toBe("LWW_ENTITAET");
  });

  it("setzt die Liste, ersetzt sie als Ganzes und leert sie mit null", () => {
    const basis = grundlage();
    const erst = weitere(null, ["R1", "R2"]);
    expect(zustand([...basis, erst]).einheiten["E1"]?.weitereRufgruppenIds?.wert).toEqual(["R1", "R2"]);
    const dann = weitere(["R1", "R2"], ["R2"]);
    expect(zustand([...basis, erst, dann]).einheiten["E1"]?.weitereRufgruppenIds?.wert).toEqual(["R2"]);
    const leer = zustand([...basis, erst, dann, weitere(["R2"], null)]);
    expect(leer.einheiten["E1"]?.weitereRufgruppenIds?.wert).toBeNull();
    expect(leer.hinweise).toEqual([]);
  });

  it("mischt zwei gleichzeitige Listen nicht, sondern lässt die jüngere gelten", () => {
    const basis = grundlage();
    const vonA = feldEreignis(hlc(50_000, 0, "a"), 50, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "weitereRufgruppenIds" }, null, ["R1"]);
    const vonB = feldEreignis(hlc(60_000, 0, "b"), 1, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "weitereRufgruppenIds" }, null, ["R2"]);
    const z = zustand([...basis, vonA, vonB]);
    expect(z.einheiten["E1"]?.weitereRufgruppenIds?.wert).toEqual(["R2"]);
    expect(z.hinweise).toContainEqual(expect.objectContaining({ feldpfad: "einheit/E1/weitereRufgruppenIds" }));
  });

  it("meldet jede unbekannte Kennung der Liste als Fremdreferenz und behält die Liste", () => {
    const basis = grundlage();
    const z = zustand([...basis, weitere(null, ["R1", "R8", "R9"])]);
    expect(z.einheiten["E1"]?.weitereRufgruppenIds?.wert).toEqual(["R1", "R8", "R9"]);
    const fremd = z.hinweise.filter((x) => x.art === "fremdreferenzUnbekannt");
    expect(fremd).toEqual([
      { art: "fremdreferenzUnbekannt", feldpfad: "einheit/E1/weitereRufgruppenIds", verweistAuf: "R8" },
      { art: "fremdreferenzUnbekannt", feldpfad: "einheit/E1/weitereRufgruppenIds", verweistAuf: "R9" },
    ]);
  });

  it("führt den Funkhinweis als Text und leert ihn mit null", () => {
    const basis = grundlage();
    const setzen = hinweis(null, "Bei Netzausfall auf DMO 311");
    expect(zustand([...basis, setzen]).einheiten["E1"]?.funkHinweis?.wert).toBe("Bei Netzausfall auf DMO 311");
    expect(zustand([...basis, setzen, hinweis("Bei Netzausfall auf DMO 311", null)]).einheiten["E1"]?.funkHinweis?.wert).toBeNull();
  });
});

describe("Rücknahme (§6)", () => {
  it("stellt die vorige Liste her, auch „keine“", () => {
    const basis = grundlage();
    const erst = weitere(null, ["R1"]);
    const dann = weitere(["R1"], ["R1", "R2"]);
    const z = zustand([...basis, erst, dann]);
    expect(kompensationFuer(dann, z)).toMatchObject({
      art: "entwurf",
      entwurf: { typ: "EinheitStammdatenGeaendert", nutzlast: { einheitId: "E1", feld: "weitereRufgruppenIds" }, neu: ["R1"], vorher: ["R1", "R2"] },
    });
    expect(kompensationFuer(erst, zustand([...basis, erst]))).toMatchObject({ art: "entwurf", entwurf: { neu: null } });
  });

  it("nimmt einen Funkhinweis auf den vorigen Text zurück", () => {
    const basis = grundlage();
    const setzen = hinweis("alt", "neu");
    expect(kompensationFuer(setzen, zustand([...basis, setzen]))).toMatchObject({ art: "entwurf", entwurf: { neu: "alt", vorher: "neu" } });
  });
});

describe("Weitere Rufgruppen und Funkhinweis im Tagebuch", () => {
  it("nennt die weiteren Rufgruppen beim Namen", () => {
    const basis = grundlage();
    const erst = weitere(null, ["R1", "R2"]);
    const dann = weitere(["R1", "R2"], null);
    const z = zustand([...basis, erst, dann]);
    expect(tagebuchzeile(z, erst).satz).toBe("B 1: Stammdaten geändert (weitere Rufgruppen): keine → THW_OL_FUE, DMO 311");
    expect(tagebuchzeile(z, dann).satz).toBe("B 1: Stammdaten geändert (weitere Rufgruppen): THW_OL_FUE, DMO 311 → keine");
  });

  it("nennt den Funkhinweis als Feld und trägt das Feld für den Funkauszug", () => {
    const basis = grundlage();
    const setzen = hinweis(null, "nachts nur Telefon");
    const z = zustand([...basis, setzen]);
    const zeile = tagebuchzeile(z, setzen);
    expect(zeile.satz).toBe("B 1: Stammdaten geändert (Funkhinweis): (leer) → nachts nur Telefon");
    expect(zeile.feld).toBe("funkHinweis");
    expect(istFunkzeile(zeile)).toBe(true);
  });

  it("zählt Rufgruppe, Overrides und Funkfelder zum Funkauszug, andere Stammdaten nicht", () => {
    const basis = grundlage();
    const bemerkung = feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "bemerkung" }, null, "x");
    const erreichbar = feldEreignis(h(), n, "EinheitStammdatenGeaendert", { einheitId: "E1", feld: "erreichbarkeitOverride" }, null, "0170-1");
    const gruppe = feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E1" }, null, "R1");
    const z = zustand([...basis, bemerkung, erreichbar, gruppe]);
    expect(istFunkzeile(tagebuchzeile(z, bemerkung))).toBe(false);
    expect(istFunkzeile(tagebuchzeile(z, erreichbar))).toBe(true);
    expect(istFunkzeile(tagebuchzeile(z, gruppe))).toBe(true);
    // Eine Art mit festem Feld trägt keinen Feldnamen in der Zeile.
    expect(tagebuchzeile(z, gruppe).feld).toBeUndefined();
  });
});
