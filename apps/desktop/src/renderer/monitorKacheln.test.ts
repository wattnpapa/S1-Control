/**
 * Die Kacheln von „Offene Punkte", „IuK-Lage" und „Nachrichtenweg".
 */

import { describe, expect, it } from "vitest";

import { BEISPIEL_JETZT, BEISPIEL_LAGEBILD } from "./pruefhilfen/versorgungsbeispiel.js";
import { besetzungText, bytesText, iukLage, kurzliste, nachrichtenweg, offenePunkte, zahlkachel, type Kachel } from "./monitorKacheln.js";
import type { Lagebild } from "../kontrakt/index.js";

function kachel(kacheln: readonly Kachel[], schluessel: string): Kachel | undefined {
  return kacheln.find((k) => k.schluessel === schluessel);
}

const PEER: Lagebild["peers"][number] = {
  clientId: "p",
  anzeigename: "S1",
  rechnername: "r",
  veraltet: false,
  wanduhr: "",
  programmversion: "2.4.1",
  segment: 0,
  offset: 0,
  gelesenerOffset: 0,
  uhrAbweichungMs: 0,
  quarantaene: 0,
};

const NACHRICHTEN: NonNullable<Lagebild["nachrichten"]> = {
  neuFuerStellen: 9,
  vorFmz: 4,
  vorSichter: 2,
  mitVorrangOffen: 9,
  ueberSchwelle: 1,
};

describe("Kacheln des Monitors", () => {
  it("dämpft eine Null und warnt ab eins nur, wo es Handlungsbedarf ist", () => {
    expect(zahlkachel("a", 0, "x").stufe).toBe("leise");
    expect(zahlkachel("a", 2, "x").stufe).toBe("warn");
    expect(zahlkachel("a", 2, "x", false).stufe).toBe("normal");
    expect(zahlkachel("a", 0, "x", true, "darunter").unter).toBeUndefined();
  });

  it("kürzt Namenslisten und schreibt Bytes lesbar", () => {
    expect(kurzliste(["A", "B", "C", "D"])).toBe("A, B +2 weitere");
    expect(kurzliste(["A"])).toBe("A");
    expect(bytesText(0)).toBe("0 B");
    expect(bytesText(2048)).toBe("2,0 kB");
  });

  it("zeigt bei offenen Punkten Ablösungen mit Namen und die Fehlmenge der nächsten Mahlzeit", () => {
    const l: Lagebild = {
      ...BEISPIEL_LAGEBILD,
      offeneAnforderungen: 3,
      abloesungenOffen: [{ anforderungId: "a", abgeloesteEinheitId: "e1", abgeloesteBezeichnung: "FGr WP 1", abloesendeEinheitId: "e2", abloesendeBezeichnung: "FGr WP 2" }],
      hinweise: 0,
    };
    const k = offenePunkte(l, BEISPIEL_JETZT);
    expect(kachel(k, "anforderungen")).toMatchObject({ wert: "3", stufe: "normal" });
    expect(kachel(k, "abloesungen")).toMatchObject({ wert: "1", stufe: "warn", unter: "FGr WP 1" });
    expect(kachel(k, "konflikte")?.stufe).toBe("leise");
    // Ohne Nachrichten- und Funklage fehlen deren Kacheln, statt eine falsche Null zu zeigen.
    expect(kachel(k, "schwelle")).toBeUndefined();
    expect(kachel(k, "funk")).toBeUndefined();
  });

  it("warnt bei einer nicht bestellten Mahlzeit erst innerhalb des Vorlaufs", () => {
    const versorgung = BEISPIEL_LAGEBILD.versorgung;
    if (versorgung === undefined) throw new Error("Beispiel ohne Versorgung");
    const erste = versorgung.mahlzeiten[0];
    if (erste === undefined) throw new Error("Beispiel ohne Mahlzeit");
    const offen = { ...erste, bestellt: undefined, differenz: undefined };
    const l = { ...BEISPIEL_LAGEBILD, versorgung: { ...versorgung, mahlzeiten: [offen] } } as Lagebild;
    const nah = kachel(offenePunkte(l, Date.parse(erste.zeitpunkt) - 60_000), "verpflegung");
    const fern = kachel(offenePunkte(l, Date.parse(erste.zeitpunkt) - 10 * 3_600_000), "verpflegung");
    expect(nah).toMatchObject({ wert: "offen", stufe: "warn" });
    expect(fern).toMatchObject({ wert: "offen", stufe: "normal" });
  });

  it("meldet in der IuK-Lage stille Arbeitsplätze, gemischte Fassungen und einen fehlenden Share", () => {
    const l: Lagebild = {
      ...BEISPIEL_LAGEBILD,
      shareErreichbar: false,
      peers: [PEER, { ...PEER, clientId: "q", anzeigename: "FmZ 2", veraltet: true, programmversion: "2.4.0" }],
    };
    const k = iukLage(l, BEISPIEL_JETZT);
    expect(kachel(k, "share")).toMatchObject({ wert: "nein", stufe: "warn" });
    expect(kachel(k, "plaetze")).toMatchObject({ wert: "1/2", stufe: "warn", unter: "still: FmZ 2" });
    expect(kachel(k, "fassungen")).toMatchObject({ wert: "2", stufe: "warn", unter: "2.4.0, 2.4.1" });
  });

  it("rechnet den Nachrichtenweg stellenneutral und trennt LdF und FmZ an der Schwelle", () => {
    expect(nachrichtenweg(BEISPIEL_LAGEBILD)).toBeUndefined();
    const ohneLdf = nachrichtenweg({ ...BEISPIEL_LAGEBILD, nachrichten: NACHRICHTEN }) ?? [];
    expect(kachel(ohneLdf, "ldf")).toBeUndefined();
    expect(kachel(ohneLdf, "fmz")).toMatchObject({ wert: "4", stufe: "warn", unter: "über Schwelle: 1" });
    // neuFuerStellen und mitVorrangOffen rechnen nach der eigenen Sitzung und erscheinen nicht.
    expect(ohneLdf.some((k) => k.wert === "9")).toBe(false);
    const mitLdf = nachrichtenweg({ ...BEISPIEL_LAGEBILD, nachrichten: { ...NACHRICHTEN, vorLdf: 2, ueberSchwelleLdf: 0, ueberSchwelleFmz: 0, nummernluecken: [3, 7] } }) ?? [];
    expect(kachel(mitLdf, "ldf")).toMatchObject({ wert: "2", stufe: "normal" });
    expect(kachel(mitLdf, "fmz")?.stufe).toBe("normal");
    expect(kachel(mitLdf, "luecken")).toMatchObject({ wert: "2", unter: "3, 7" });
  });

  it("nennt die Besetzung des Nachrichtenwegs", () => {
    expect(besetzungText(undefined)).toBeUndefined();
    expect(besetzungText(["LDF", "FM2", "S1"])).toBe("LdF besetzt · Fm2 besetzt · Sichter nicht besetzt");
    expect(besetzungText(["SICHTER"])).toBe("LdF nicht besetzt · Fernmelder nicht besetzt · Sichter besetzt");
  });
});
