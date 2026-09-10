/**
 * Funktionalität: FüSt-Personal mit Schichtplan — die Szenarien zu M5.4.
 *
 * Das Blatt der Führungsstelle ist fachlich ein **zweites Modell** neben der
 * Einheitenliste (`excel-domaenenmodell.md` §5): Funktion × Schicht × Rolle →
 * Besetzung, dazu ein Dienstplan Funktion × Tag. Gemessen wird die echte
 * Strecke bis in die Projektion — und die eine Stelle, an der beide Modelle
 * sich berühren: K17 rechnet aus den besetzten Posten die Stärke, die im
 * Lagebild steht.
 */

import { afterEach, describe, expect, it } from "vitest";

import { projektion } from "@s1/domaene";

import {
  dienstpostenAnlegen,
  dienstpostenBesetzt,
  dienstpostenEntfernt,
  dienstpostenGeaendert,
  dienstpostenWiederhergestellt,
  schichtplanEintrag,
} from "../kontrakt/bedienschritte.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

async function angenommenEinEinsatz(): Promise<Platz> {
  const platz = await werkstattMitEinemPlatz();
  await grundlage(platz);
  return platz;
}

async function wennIchEinenPostenAnlege(
  platz: Platz,
  id: string,
  funktion: string,
  schicht: string,
  teileinheit = "Stab",
  reihenfolge = 1,
): Promise<void> {
  const ergebnis = await platz.dienst.bediene(
    dienstpostenAnlegen({ dienstpostenId: id, teileinheit, funktion, schicht, reihenfolge }),
  );
  if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
}

describe("Szenario: Ein Dienstposten wird angelegt und besetzt", () => {
  it("zählt erst nach der Besetzung in die Stärke der Führungsstelle (K17)", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG");

    // Ein angelegter, aber unbesetzter Posten ist eine leere Zeile im Blatt —
    // und keine Kraft in der Lage.
    expect(projektion.fuestStaerke(platz.dienst.zustand)).toEqual([]);

    await platz.dienst.bediene(dienstpostenBesetzt("D1", null, "Mennenga, Fokke"));

    const staerke = projektion.fuestStaerke(platz.dienst.zustand);
    expect(staerke).toHaveLength(1);
    // „Ltr" heißt Führer — die Zuordnung Funktion → Rolle ist eine
    // Vorbelegung und gehört fachlich zu den Stammdaten (Befund M-B2).
    expect(staerke[0]?.staerke).toEqual({ fuehrer: 1, unterfuehrer: 0, mannschaft: 0 });
  });

  it("räumt den Posten wieder, wenn die Besetzung geleert wird", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG");
    await platz.dienst.bediene(dienstpostenBesetzt("D1", null, "Mennenga, Fokke"));
    await platz.dienst.bediene(dienstpostenBesetzt("D1", "Mennenga, Fokke", ""));

    // §3.2: Der Wert wird `null`, das Feld bleibt stehen — K17 zählt ihn
    // nicht mehr, und das Tagebuch weiß, dass jemand den Posten geräumt hat.
    expect(projektion.fuestStaerke(platz.dienst.zustand)).toEqual([]);
    const blatt = projektion.dienstpostenblatt(platz.dienst.zustand);
    expect(blatt[0]?.zeilen[0]?.besetzt).toBe(false);
  });

  it("trennt Tag und Nacht, wie das Blatt es führt", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG", "Stab", 1);
    await wennIchEinenPostenAnlege(platz, "D2", "Ltr FüSt", "NACHT", "Stab", 2);
    await platz.dienst.bediene(dienstpostenBesetzt("D1", null, "Mennenga, Fokke"));
    await platz.dienst.bediene(dienstpostenBesetzt("D2", null, "Gnieser, Jannik"));

    const staerke = projektion.fuestStaerke(platz.dienst.zustand);
    expect(staerke.map((zeile) => zeile.schicht).sort()).toEqual(["NACHT", "TAG"]);
    // Je Funktion eine Tag- und eine Nachtzeile: Die Führungsstelle ist nicht
    // doppelt so stark, sie arbeitet in zwei Schichten.
    for (const zeile of staerke) expect(zeile.staerke.fuehrer).toBe(1);
  });
});

describe("Szenario: Entfernen ist kein Löschen (§5.4.5 sinngemäß)", () => {
  it("hält den Posten sichtbar und nimmt ihn aus der Stärke", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "SGL 1", "TAG");
    await platz.dienst.bediene(dienstpostenBesetzt("D1", null, "van Rijsinge, Nils"));
    await platz.dienst.bediene(dienstpostenEntfernt("D1", "Sachgebiet nicht besetzt in dieser Lage"));

    expect(projektion.fuestStaerke(platz.dienst.zustand)).toEqual([]);
    // Ohne Sichtbarkeit ließe er sich nicht wiederherstellen, weil ihn
    // niemand mehr sieht.
    const mitEntfernten = projektion.dienstpostenblatt(platz.dienst.zustand, {
      mitEntfernten: true,
    });
    expect(mitEntfernten[0]?.zeilen[0]?.entfernt).toBe(true);
    expect(projektion.dienstpostenblatt(platz.dienst.zustand)).toEqual([]);

    await platz.dienst.bediene(dienstpostenWiederhergestellt("D1"));
    expect(projektion.fuestStaerke(platz.dienst.zustand)).toHaveLength(1);
  });
});

describe("Szenario: Der Schichtplan", () => {
  it("legt seine Spalten aus den Einträgen an und nicht aus einem Kalender", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG");

    // §5.7: `DienstpostenAngelegt` belegt keinen Schichtplanpfad. Der Eintrag
    // entsteht erst mit dem ersten `SchichtplanEintragGesetzt` — sonst hätte
    // jeder Einsatz mit einem unbeplanten Posten einen anderen zustandsHash.
    expect(platz.dienst.zustand.schichtplan["D1"]).toBeUndefined();
    expect(projektion.schichtplanblatt(platz.dienst.zustand).tage).toEqual([]);

    await platz.dienst.bediene(
      schichtplanEintrag("D1", "2026-09-10", null, "Mennenga, Fokke / Mob. 0441-000001"),
    );
    await platz.dienst.bediene(schichtplanEintrag("D1", "2026-09-11", null, "Meyer, Anton"));

    const plan = projektion.schichtplanblatt(platz.dienst.zustand);
    expect(plan.tage).toEqual(["2026-09-10", "2026-09-11"]);
    expect(plan.zeilen[0]?.tage["2026-09-10"]).toContain("Mennenga");
  });

  it("hält zwei Schreiber auf derselben Zelle zusammen (§5.7, T50)", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG");
    await platz.dienst.bediene(schichtplanEintrag("D1", "2026-09-10", null, "erster Eintrag"));
    await platz.dienst.bediene(
      schichtplanEintrag("D1", "2026-09-10", "erster Eintrag", "zweiter Eintrag"),
    );

    // Der Schlüssel ist das Paar (dienstpostenId, datum): Zwei Clients, die
    // denselben Tag desselben Postens beschreiben, meinen dieselbe Zelle.
    const plan = projektion.schichtplanblatt(platz.dienst.zustand);
    expect(Object.keys(plan.zeilen[0]?.tage ?? {})).toEqual(["2026-09-10"]);
    expect(plan.zeilen[0]?.tage["2026-09-10"]).toBe("zweiter Eintrag");
    expect(platz.dienst.zustand.hinweise).toHaveLength(0);
  });

  it("schneidet den Plan auf ein Fenster zu", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG");
    await platz.dienst.bediene(schichtplanEintrag("D1", "2026-09-10", null, "Tag eins"));
    await platz.dienst.bediene(schichtplanEintrag("D1", "2026-09-12", null, "Tag drei"));

    // Der Plan reicht über Wochen, der Bildschirm nicht.
    const fenster = projektion.schichtplanblatt(platz.dienst.zustand, { von: "2026-09-11" });
    expect(fenster.tage).toEqual(["2026-09-12"]);
  });
});

describe("Szenario: Die Ordnung des Blattes", () => {
  it("führt die Teilbereiche in der Reihenfolge der Vorlage", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D3", "FaBe", "TAG", "Externe", 1);
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG", "Stab", 1);
    await wennIchEinenPostenAnlege(platz, "D2", "GrFü K", "TAG", "FGr K", 1);

    // Angelegt in der Reihenfolge Externe, Stab, FGr K — gezeigt in der
    // Reihenfolge des Blattes.
    expect(projektion.dienstpostenblatt(platz.dienst.zustand).map((b) => b.teileinheit)).toEqual([
      "Stab",
      "FGr K",
      "Externe",
    ]);
  });

  it("hängt einen unbekannten Teilbereich hinten an, statt ihn abzuweisen", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "Ltr FüSt", "TAG", "Stab", 1);
    await wennIchEinenPostenAnlege(platz, "D2", "Verbindungsperson", "TAG", "Bundeswehr", 1);

    // `teileinheit` ist im Katalog Pflichttext und keine Aufzählung: Ein
    // Einsatz darf einen sechsten Teilbereich führen (§3.7 sinngemäß).
    expect(projektion.dienstpostenblatt(platz.dienst.zustand).map((b) => b.teileinheit)).toEqual([
      "Stab",
      "Bundeswehr",
    ]);
  });

  it("ändert die Funktion eines Postens und rechnet die Rolle neu", async () => {
    const platz = await angenommenEinEinsatz();
    await wennIchEinenPostenAnlege(platz, "D1", "He K", "TAG");
    await platz.dienst.bediene(dienstpostenBesetzt("D1", null, "Bruns, Lasse"));
    expect(projektion.fuestStaerke(platz.dienst.zustand)[0]?.staerke.mannschaft).toBe(1);

    await platz.dienst.bediene(dienstpostenGeaendert("D1", "funktion", "He K", "TrFü K"));

    // Die Rolle folgt der Funktion und ist kein eigenes Feld: Wer befördert
    // wird, wird in der Summe befördert.
    expect(projektion.fuestStaerke(platz.dienst.zustand)[0]?.staerke).toEqual({
      fuehrer: 0,
      unterfuehrer: 1,
      mannschaft: 0,
    });
  });
});
