/**
 * Die Undo-Gruppe (R2-LdF P2-8, R2-FM P3-1, R2-FaBe P2-8;
 * KONZEPT-EREIGNISSE.md §6, Nachtrag „Undo-Gruppe“): Folgeschritte tragen
 * `folgeVon`, der Stapel fasst sie mit dem Hauptschritt zu einem Eintrag
 * zusammen; jedes Ereignis bleibt für sich eine Kompensation (U1).
 */

import { describe, expect, it } from "vitest";

import type { EingehendesEreignis } from "./fold.js";
import { anlageEreignis, feldEreignis, hlc } from "./pruefhilfen/ereignisbau.js";
import { Undostapel, kompensationFuer } from "./undo.js";
import { gruppenbezeichnung, gruppenkennung, gruppenrest, obersteGruppe, ohneRuecknahmeHinweis } from "./undogruppe.js";
import type { Zustand } from "./zustand.js";

let n = 0;
const h = () => {
  n += 1;
  return hlc(1_000_000 + n * 1000, n, "a");
};

function befoerdern(): EingehendesEreignis[] {
  n = 0;
  const haupt = feldEreignis(h(), n, "NachrichtBefoerdert", { nachrichtId: "A1" }, null, { mittel: "FUNK", zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" });
  const folge = (typ: string, neu: unknown, grund?: string) => feldEreignis(h(), n, typ, { nachrichtId: "A1", folgeVon: haupt.id }, null, neu, grund);
  return [
    haupt,
    folge("NachrichtAngenommen", { zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" }),
    folge("NachrichtNachgewiesen", { nummer: 3, zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" }),
    folge("NachrichtGesichtet", { zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm", verteiler: [] }, "Kopien nach Beförderung"),
  ];
}

describe("Undo-Gruppe", () => {
  it("fasst Hauptschritt und Folgeschritte zu einem Eintrag, neuestes zuerst", () => {
    const ereignisse = befoerdern();
    const stapel = new Undostapel("a");
    stapel.nimmAlleAuf(ereignisse);
    const gruppe = obersteGruppe(stapel.eintraege);
    expect(gruppe.map((e) => e.typ)).toEqual(["NachrichtGesichtet", "NachrichtNachgewiesen", "NachrichtAngenommen", "NachrichtBefoerdert"]);
    expect(gruppe.every((e) => gruppenkennung(e.ereignis) === ereignisse[0]?.id)).toBe(true);
    expect(gruppenbezeichnung(gruppe, ereignisse[0])).toBe("Befördern (mit Annahme, Nummer und Kopien)");
    expect(gruppenrest(ereignisse[0], gruppe)).toBeUndefined();
  });

  it("nennt die Anlage als Hauptschritt, auch wenn sie selbst nicht rücknehmbar ist, und sagt, dass sie bleibt", () => {
    n = 0;
    const anlage = anlageEreignis(h(), n, "NachrichtVerfasst", { nachrichtId: "E1", richtung: "EINGANG", anschrift: "", betreff: "", inhalt: "", absender: "", aufnahme: { mittel: "FUNK", zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" } });
    const nachweis = feldEreignis(h(), n, "NachrichtNachgewiesen", { nachrichtId: "E1", folgeVon: anlage.id }, null, { nummer: 1, zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm" });
    const sichtung = feldEreignis(h(), n, "NachrichtGesichtet", { nachrichtId: "E1", folgeVon: anlage.id }, null, { zeitpunkt: "2026-11-17T19:00:00Z", handzeichen: "Fm", verteiler: [] });
    const stapel = new Undostapel("a");
    stapel.nimmAlleAuf([anlage, nachweis, sichtung]);
    const gruppe = obersteGruppe(stapel.eintraege);
    expect(gruppe).toHaveLength(2);
    expect(gruppenbezeichnung(gruppe, anlage)).toBe("Eingang aufnehmen (mit Nummer und Sichtung)");
    expect(gruppenrest(anlage, gruppe)).toBe(ohneRuecknahmeHinweis("NachrichtVerfasst"));
  });

  it("lässt `folgeVon` nicht in die Kompensation", () => {
    const [, annahme] = befoerdern();
    const kompensation = kompensationFuer(annahme as EingehendesEreignis, { nachrichten: {} } as unknown as Zustand);
    expect(kompensation.art).toBe("entwurf");
    if (kompensation.art === "entwurf") expect(kompensation.entwurf.nutzlast).toEqual({ nachrichtId: "A1" });
  });

  it("meldet den jüngsten eigenen Schritt, der nicht rücknehmbar ist (R2-FaBe P2-8)", () => {
    const ereignisse = befoerdern();
    const aufgegeben = anlageEreignis(h(), n, "NachrichtVerfasst", { nachrichtId: "A2", richtung: "AUSGANG", anschrift: "", betreff: "", inhalt: "", absender: "" });
    const stapel = new Undostapel("a");
    stapel.nimmAlleAuf([...ereignisse, aufgegeben]);
    expect(stapel.juengsterOhneRuecknahme()?.id).toBe(aufgegeben.id);
    expect(stapel.oberster()?.typ).toBe("NachrichtGesichtet");
    // Ein einzelner Schritt ohne Folgen trägt keine Gruppenbezeichnung.
    const einzeln = new Undostapel("a");
    einzeln.nimmAlleAuf([ereignisse[0] as EingehendesEreignis]);
    expect(gruppenbezeichnung(obersteGruppe(einzeln.eintraege), ereignisse[0])).toBeUndefined();
  });
});

describe("Durchlauf 2026-11-22: Zuteilung nach der Beförderung", () => {
  const zuteilung = feldEreignis(hlc(2_000_000, 1, "ldf"), 1, "NachrichtUebermittlungVorgeschlagen", { nachrichtId: "A7" }, null, { mittel: "FUNK", fernmelder: "Fm1", zeitpunkt: "2026-11-22T17:24:00Z", handzeichen: "Sch" });
  const befoerderung = feldEreignis(hlc(2_100_000, 1, "fm1"), 1, "NachrichtBefoerdert", { nachrichtId: "A7" }, null, { mittel: "FUNK", zeitpunkt: "2026-11-22T17:26:00Z", handzeichen: "Ka" });

  it("nimmt die Zuteilung des LdF aus dem Stapel, sobald der Fernmelder befördert hat, und sagt warum", () => {
    const stapel = new Undostapel("ldf");
    stapel.nimmAuf(zuteilung);
    expect(stapel.oberster()?.typ).toBe("NachrichtUebermittlungVorgeschlagen");
    stapel.nimmAuf(befoerderung);
    expect(stapel.oberster()).toBeUndefined();
    expect(stapel.juengsterOhneRuecknahme()?.id).toBe(zuteilung.id);
    expect(ohneRuecknahmeHinweis("NachrichtUebermittlungVorgeschlagen")).toContain("schon befördert");
  });

  it("gibt die Zuteilung wieder frei, wenn die Beförderung zurückgenommen ist", () => {
    const stapel = new Undostapel("ldf");
    const ruecknahme = { ...feldEreignis(hlc(2_200_000, 2, "fm1"), 2, "NachrichtBefoerdert", { nachrichtId: "A7" }, null, null), undoOf: befoerderung.id };
    stapel.nimmAlleAuf([zuteilung, befoerderung, ruecknahme]);
    expect(stapel.oberster()?.typ).toBe("NachrichtUebermittlungVorgeschlagen");
  });

  it("lässt eine Zuteilung einer anderen Nachricht stehen", () => {
    const stapel = new Undostapel("ldf");
    stapel.nimmAlleAuf([zuteilung, feldEreignis(hlc(2_100_000, 3, "fm1"), 3, "NachrichtBefoerdert", { nachrichtId: "A8" }, null, { mittel: "FUNK", zeitpunkt: "2026-11-22T17:26:00Z", handzeichen: "Ka" })]);
    expect(stapel.oberster()?.id).toBe(zuteilung.id);
  });
});
