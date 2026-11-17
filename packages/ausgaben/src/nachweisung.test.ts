/** Tests zur Ausgabe „Nachweisung" und zur Abbildung auf den Vordruck (KONZEPT-NACHRICHTEN.md §7). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../../domaene/src/fold.js";
import { projektion, type Nachrichtenzeile } from "../../domaene/src/index.js";
import { anlageEreignis, einsatzAngelegt, feldEreignis, hlc } from "../../domaene/src/pruefhilfen/ereignisbau.js";

import { vordruckDatenAus } from "./nachricht.js";
import { nachrichtendruckAus } from "./nachrichtendruck.js";
import { NACHWEISUNG_FUSSNOTE, NACHWEISUNG_UNTERSCHRIFT, nachweisungAlsHtml } from "./nachweisung.js";

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
    for (const kopf of ["Nr.", "E/A", "Vorrang", "Gegenstelle", "Aufnahme", "Annahme", "Beförderung", "Abfassung", "Absender", "Anschrift", "Betreff", "Sichtung"]) {
      expect(html).toContain(`>${kopf}</th>`);
    }
    expect(html).toContain(NACHWEISUNG_FUSSNOTE);
    expect(NACHWEISUNG_FUSSNOTE).toBe("Nachweisung nach Vordruck 1103.1, Feld 5");
    expect(html).toContain("Erstellt 081443SEP26 · Meier (FmZ)");
  });

  it("trägt die Unterschriftszeile des LdF im Fuß und keine technischen Kennungen im Kopf (LdF P2-5)", () => {
    const html = nachweisungAlsHtml(daten());
    const fuss = html.slice(html.indexOf(NACHWEISUNG_FUSSNOTE));
    for (const feld of NACHWEISUNG_UNTERSCHRIFT) expect(fuss).toContain(`<span>${feld}</span>`);
    expect(fuss).toContain('class="unterschrift"');
    expect(html).toContain("<h1>Übung &lt;Weser-Ems&gt;</h1>");
    expect(html).not.toContain("@bos/eeb-format");
    expect(html).not.toContain('class="kennung"');
  });

  it("schreibt eine Zeile je Nachricht nach Nummer, Spalten wie am Bildschirm, Zeiten einheitlich (R2-LdF P2-5)", () => {
    const html = nachweisungAlsHtml({ ...daten(), zeilen: [...zeilen()].reverse() });
    const zeilenHtml = html.split("\n").filter((z) => z.startsWith("      <tr>"));
    expect(zeilenHtml).toHaveLength(3);
    // E1: Vorrang, E/A, Nr. wie am Bildschirm; Aufnahme als Datum-Zeit-Gruppe (groß) mit Handzeichen,
    // Annahme und Beförderung leer, Sichtung vierstellig mit Handzeichen, Abfassung mit Tag.
    expect(zeilenHtml[0]).toContain("<td>Sofort</td><td>E</td><td>26</td><td>OV Wildeshausen</td><td>FüSt</td><td>Funk</td><td></td><td>080802SEP26 FM</td><td></td><td></td><td>0805 SI</td><td>080801SEP26</td>");
    // A1: Annahme und Beförderung vierstellig mit Handzeichen
    expect(zeilenHtml[1]).toContain("<td></td><td>A</td><td>26</td>");
    expect(zeilenHtml[1]).toContain("<td>0803 FM</td><td>0804 FM</td>");
    // E2: ohne Nummer zuletzt, gleich in welcher Ordnung der Aufrufer übergibt
    expect(zeilenHtml[2]).toContain("<td></td><td>E</td><td></td>");
  });

  it("führt die Gegenstelle der Beförderung und die Weitergabe des LdF (R2-LdF P2-5, R2-ETB P2-3)", () => {
    const a1 = zeilen().find((z) => z.id === "A1") as Nachrichtenzeile;
    const e2 = zeilen().find((z) => z.id === "E2") as Nachrichtenzeile;
    const mitGegenstelle = { ...a1, gegenstelle: "Kreis OL" };
    const weitergegeben = { ...e2, weitergabe: { zeitpunkt: um(9), handzeichen: "Ho" } };
    const html = nachweisungAlsHtml({ ...daten(), zeilen: [mitGegenstelle, weitergegeben] });
    expect(html).toContain("<td>Telefon</td><td>Kreis OL</td>");
    expect(html).toContain("Weitergabe 0809 Ho");
    expect(nachweisungAlsHtml({ ...daten(), zeilen: [{ ...e2, laufzustand: "VOR_LDF" }] })).toContain("wartet beim LdF");
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
    expect(html).toContain('<tr class="unterzeile"><td></td><td colspan="13">Sichtung 0805 SI · Verteiler: S3 (grün), S2 (blau), S4 (rot) · Vermerke: an S3 weiter</td></tr>');
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

describe("Nachweisung, zweiter Durchlauf (LdF P2-5, ETB P1-3, Mittel vorgeschlagen)", () => {
  it("zeigt das nur vorgeschlagene Mittel mit Zusatz statt leer", () => {
    const e2 = zeilen().find((z) => z.id === "E2") as Nachrichtenzeile;
    const mitVorschlag = { ...e2, vorschlag: { mittel: "KURIER", fernmelder: "Fm2", zeitpunkt: um(6), handzeichen: "Lf" } };
    expect(nachweisungAlsHtml({ ...daten(), zeilen: [mitVorschlag] })).toContain("<td>Kurier/Melder (vorgeschlagen)</td>");
  });

  it("nennt den Zeitraum aus den Zeilen oder dem Ausschnitt und die Abschlusszeile des beendeten Einsatzes", () => {
    const html = nachweisungAlsHtml(daten());
    expect(html).toMatch(/Zeitraum von \d\d\.\d\d\.\d{4} \d\d:\d\d bis \d\d\.\d\d\.\d{4} \d\d:\d\d/u);
    expect(html).not.toContain("Nachweisung abgeschlossen");
    const schicht = nachweisungAlsHtml({ ...daten(), zeitraum: { von: "2026-09-08T06:00:00Z", bis: "2026-09-08T14:00:00Z" }, beendet: { zeit: "2026-09-08T15:00:00Z", akteur: "Meier" } });
    expect(schicht).toContain("Zeitraum (Ausschnitt) von 08.09.2026 08:00 bis 08.09.2026 16:00");
    expect(schicht).toContain("Nachweisung abgeschlossen 08.09.2026 17:00, Meier · 3 Nachrichten");
  });

  it("nennt Zeit und Grund des Zurückziehens in der zweiten Zeile", () => {
    const e2 = zeilen().find((z) => z.id === "E2") as Nachrichtenzeile;
    const zurueck = { ...e2, zurueckgezogen: true, zurueckgezogenMit: { zeitpunkt: "2026-09-08T08:30:00+02:00", grund: "Doppelt aufgenommen" } };
    expect(nachweisungAlsHtml({ ...daten(), zeilen: [zurueck] })).toContain("ZURÜCKGEZOGEN 080830sep26: Doppelt aufgenommen");
  });
});
