/** Tests zur Ausgabe „Nachweisung" und zur Abbildung auf den Vordruck (KONZEPT-NACHRICHTEN.md §7). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../../domaene/src/fold.js";
import { projektion, type Nachrichtenzeile } from "../../domaene/src/index.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../../domaene/src/pruefhilfen/ereignisbau.js";

import { vordruckDatenAus } from "./nachricht.js";
import { nachrichtendruckAus } from "./nachrichtendruck.js";
import { NACHWEISUNG_FUSSNOTE, nachweisungAlsHtml } from "./nachweisung.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung <Weser-Ems>", stand: "081443SEP26" };

let n = 0;
function h(): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, "a");
}
const um = (minute: number): string => `2026-09-08T08:${String(minute).padStart(2, "0")}:00+02:00`;

function vermerk(typ: string, id: string, neu: unknown, extra: Record<string, unknown> = {}): EingehendesEreignis {
  return feldEreignis(h(), n, typ, { nachrichtId: id, ...extra }, null, neu);
}

function verfasst(id: string, angaben: Record<string, unknown>): EingehendesEreignis {
  return anlageEreignis(h(), n, "NachrichtVerfasst", {
    nachrichtId: id,
    richtung: "EINGANG",
    anschrift: "FüSt",
    absender: "OV Wildeshausen",
    betreff: "Pumpen eingetroffen",
    inhalt: "Zwei Pumpen am Deich.",
    ...angaben,
  });
}

/** Zwei Eingänge mit gleicher Nummer, eine Gesprächsnotiz als Ausgang, eine Nachricht ohne Nummer. */
function zeilen(): readonly Nachrichtenzeile[] {
  n = 0;
  const ereignisse: EingehendesEreignis[] = [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "UEBUNG", fuestName: "FüSt", beginn: um(0), schichtmodell: "ZWEI_SCHICHT" }),
    verfasst("E1", { vorrang: "SOFORT", abfassungszeit: um(1), betreff: "Lage <Deich>", aufnahme: { mittel: "FUNK", zeitpunkt: um(2), handzeichen: "FM" } }),
    vermerk("NachrichtNachgewiesen", "E1", { nummer: 26, zeitpunkt: um(2), handzeichen: "FM" }),
    vermerk("NachrichtGesichtet", "E1", {
      zeitpunkt: um(5),
      handzeichen: "SI",
      verteiler: [{ stelle: "S3", kopie: "GRUEN" }, { stelle: "S2", kopie: "BLAU" }, { stelle: "S4", kopie: "ROT" }],
      vermerke: "an S3 weiter",
    }),
    verfasst("A1", { richtung: "AUSGANG", gespraechsnotiz: true, absender: "S3", anschrift: "Kreis OL", betreff: "Sandsäcke" }),
    vermerk("NachrichtNachgewiesen", "A1", { nummer: 26, zeitpunkt: um(3), handzeichen: "FM" }),
    vermerk("NachrichtAngenommen", "A1", { zeitpunkt: um(3), handzeichen: "FM" }),
    vermerk("NachrichtBefoerdert", "A1", { mittel: "TELEFON", zeitpunkt: um(4), handzeichen: "FM" }),
    verfasst("E2", { betreff: "Ohne Nummer" }),
  ];
  const zustand = materialisiere(falteHinzu(leereFaltung(), ereignisse));
  return projektion.nachrichtenausschnitt(zustand, { sicht: "nachweisung" }).zeilen;
}

const daten = (): Parameters<typeof nachweisungAlsHtml>[0] => ({ kopf: KOPF, fuestName: "FüSt Oldenburg", akteur: "Meier (FmZ)", zeilen: zeilen() });

describe("Die Ausgabe Nachweisung", () => {
  it("ist eine A4-hoch-Seite mit Kopf, Spalten und Fußnote", () => {
    const html = nachweisungAlsHtml(daten());
    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("<h2>Nachweisung</h2>");
    expect(html).toContain("Führungsstelle FüSt Oldenburg · 3 Nachrichten");
    for (const kopf of ["Nr.", "E/A", "Vorrang", "Aufnahme", "Annahme", "Beförderung", "Abfassung", "Absender", "Anschrift", "Betreff", "Sichtung"]) {
      expect(html).toContain(`>${kopf}</th>`);
    }
    expect(html).toContain(NACHWEISUNG_FUSSNOTE);
    expect(NACHWEISUNG_FUSSNOTE).toBe("Nachweisung nach Vordruck 1103.1, Feld 5");
    expect(html).toContain("Erstellt 081443SEP26 · Meier (FmZ)");
  });

  it("schreibt eine Zeile je Nachricht in der übergebenen Ordnung, Zeiten wie der Vordruck", () => {
    const html = nachweisungAlsHtml(daten());
    const zeilenHtml = html.split("\n").filter((z) => z.startsWith("      <tr>"));
    expect(zeilenHtml).toHaveLength(3);
    // E1: Nr. 26, Sofort, Aufnahme als Datum-Zeit-Gruppe, Sichtung vierstellig mit Handzeichen
    expect(zeilenHtml[0]).toContain("<td>26</td><td>E</td><td>Sofort</td><td>080802sep26</td><td></td><td></td><td>080801sep26</td>");
    expect(zeilenHtml[0]).toContain("<td>0805 SI</td>");
    // A1: Annahme und Beförderung vierstellig mit Handzeichen
    expect(zeilenHtml[1]).toContain("<td>A</td><td></td><td></td><td>0803 FM</td><td>0804 FM</td>");
    // E2: ohne Nummer, ohne Marke
    expect(zeilenHtml[2]).toContain("<td></td><td>E</td>");
  });

  it("markiert doppelte Nummern und Gesprächsnotizen und maskiert HTML", () => {
    const html = nachweisungAlsHtml(daten());
    expect(html.match(/Nr\. doppelt/g)).toHaveLength(2);
    expect(html).toContain("<td>Nr. doppelt, GN</td>");
    expect(html).toContain("Lage &lt;Deich&gt;");
    expect(html).toContain("Übung &lt;Weser-Ems&gt;");
    expect(html).not.toContain("Lage <Deich>");
  });

  it("zeigt Sichtung, Verteiler und Vermerke als zweite Zeile und die Nummernfolge im Fuß (Sichter-Audit, LdF P2-2)", () => {
    const html = nachweisungAlsHtml(daten());
    expect(html).toContain('<tr class="unterzeile"><td></td><td colspan="11">Sichtung 0805 SI · Verteiler: S3 (grün), S2 (blau), S4 (rot) · Vermerke: an S3 weiter</td></tr>');
    expect(html).toContain("Nummern 1 bis 26; Fehlende Nummern: 1–25 · ohne Nummer: 1 · zurückgezogen: 0");
    expect(html).toContain("<td>ohne Nummer</td>");
    const lueckenlos = zeilen().map((z) => ({ ...z, nummer: z.id === "E2" ? 2 : 1 }));
    expect(nachweisungAlsHtml({ ...daten(), zeilen: lueckenlos })).toContain("Nummern 1 bis 2; lückenlos");
  });

  it("gibt bei keiner Nachricht eine leere Tabelle aus", () => {
    const html = nachweisungAlsHtml({ ...daten(), zeilen: [] });
    expect(html).toContain("0 Nachrichten");
    expect(html).toContain("<tbody>\n    </tbody>");
  });
});

describe("nachrichtendruckAus", () => {
  it("bildet Vermerke, Nachweis und Sichtung ab; BLAU ist nur Kopie", () => {
    const e1 = zeilen().find((z) => z.id === "E1");
    expect(e1).toBeDefined();
    const druck = nachrichtendruckAus(e1 as Nachrichtenzeile, true);
    expect(druck).toMatchObject({
      richtung: "EINGANG",
      vorrang: "SOFORT",
      uebung: true,
      aufnahme: { mittel: "FUNK", handzeichen: "FM" },
      nachweis: { nummer: "26", handzeichen: "FM" },
    });
    expect(druck.sichtung).toEqual({
      zeitpunkt: um(5),
      handzeichen: "SI",
      verteiler: [
        { stelle: "S3", kopie: false },
        { stelle: "S2", kopie: true },
        { stelle: "S4", kopie: false },
      ],
      vermerke: "an S3 weiter",
    });
    expect(druck.annahme).toBeUndefined();
  });

  it("füllt fehlende Texte leer und übernimmt Annahme und Beförderung des Ausgangs", () => {
    const a1 = zeilen().find((z) => z.id === "A1") as Nachrichtenzeile;
    const druck = nachrichtendruckAus(a1, false);
    expect(druck).toMatchObject({ richtung: "AUSGANG", gespraechsnotiz: true, art: "", vorrang: "", rufnummer: "", zeichen: "", uebung: false });
    expect(druck.annahme).toEqual({ zeitpunkt: um(3), handzeichen: "FM" });
    expect(druck.befoerderung).toEqual({ mittel: "TELEFON", zeitpunkt: um(4), handzeichen: "FM" });
    expect(druck.sichtung).toBeUndefined();
  });

  it("nimmt die Vermerke aus der Zeile vor denen der Sichtung und trägt BLAU in den Vordruck", () => {
    const e1 = zeilen().find((z) => z.id === "E1") as Nachrichtenzeile;
    const druck = nachrichtendruckAus({ ...e1, vermerke: "Nachtrag" }, false);
    expect(druck.sichtung?.vermerke).toBe("Nachtrag");
    const vordruck = vordruckDatenAus(druck);
    expect(vordruck.nummer).toBe("26");
    expect(vordruck.weitereAnkreuzfelder).toContain("verteilerS3Spalte1");
  });
});
