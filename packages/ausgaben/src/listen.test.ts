/**
 * Tests zu den druckbaren Listen (Anforderungen, Tagebuch), dem Papier-Vordruck
 * und der Bildschirmhülle.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { projektion, zeitpunktText } from "../../domaene/src/index.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";

import { bildschirmtauglich } from "./bildschirm.js";
import { anforderungenAlsHtml, tagebuchAlsHtml } from "./listen.js";
import { papierVordruckAlsHtml } from "./papier.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung <Weser>", stand: "Stand: 08.09.2026, 08:00" };

function lage() {
  const ereignisse = prueflageEreignisse();
  return { ereignisse, zustand: materialisiere(falteHinzu(leereFaltung(), ereignisse)) };
}

describe("Das Tagebuch als HTML, Nachtrag (Stab-Review ETB E2)", () => {
  it("markiert einen Nachtrag an der Fachzeit", () => {
    const zeile = {
      ereignisId: "e-1", typ: "EtbEintragErfasst", hlcText: "1", wanduhr: "2026-11-22T17:27:00.000Z", zeitpunkt: "2026-11-22T17:05:00.000Z",
      nachtrag: true, akteur: "S2", rechner: "r", clientId: "c", satz: "Telefonat",
    } as unknown as projektion.Tagebuchzeile;
    expect(tagebuchAlsHtml([zeile], KOPF)).toContain("(Nachtrag)");
  });
});

describe("Anforderungen als HTML", () => {
  it("trägt Seitenzahl, Stand, Notizspalte und maskiert Freitext", () => {
    const { zustand } = lage();
    const liste = projektion.anforderungsliste(zustand);
    const html = anforderungenAlsHtml(liste.zeilen, liste.jeZustand, KOPF);
    expect(html).toContain('counter(page) " von " counter(pages)');
    expect(html).toContain("Stand: 08.09.2026, 08:00");
    expect(html).toContain('<th scope="col">Notiz</th>');
    expect(html).toContain("Übung &lt;Weser&gt;");
    expect(html).toContain('name="viewport"');
    expect(html).toContain('class="tabellenrahmen"');
  });

  it("nennt die Zusage in Ortszeit und nicht als ISO in UTC (Stab-Review S1, B-S1-1)", () => {
    const zeile = {
      id: "AN1", kennung: "A 1", zustand: "ZUGESAGT", angefordertAm: "2026-11-22T15:00:00.000Z",
      vorgeseheneEinheitText: "B-Gr", vorgesehenerAuftrag: "", bemerkung: "", storniert: false, hinweise: [],
      zugesagtFuer: "2026-11-22T18:30:00.000Z", zugesagtVon: "B-Gr OV Hannover",
    } as unknown as projektion.Anforderungszeile;
    const html = anforderungenAlsHtml([zeile], { ZUGESAGT: 1 }, KOPF);
    expect(html).toContain(`${zeitpunktText("2026-11-22T18:30:00.000Z")} / B-Gr OV Hannover`);
    expect(html).not.toContain("T18:30");
  });

  it("sagt, wenn nichts angefordert ist", () => {
    expect(anforderungenAlsHtml([], {}, KOPF)).toContain("Keine Anforderungen erfasst.");
  });
});

describe("Tagebuch als HTML", () => {
  it("läuft älteste zuerst und hat eine Notizspalte", () => {
    const { zustand, ereignisse } = lage();
    const ausschnitt = projektion.tagebuchausschnitt(zustand, ereignisse, {});
    const html = tagebuchAlsHtml(ausschnitt.zeilen, KOPF);
    expect(ausschnitt.zeilen.length).toBeGreaterThan(1);
    const aelteste = ausschnitt.zeilen[ausschnitt.zeilen.length - 1];
    const neueste = ausschnitt.zeilen[0];
    expect(html.indexOf(aelteste?.satz.slice(0, 20).replace(/&/g, "&amp;") ?? "")).toBeGreaterThan(-1);
    expect(html).toContain('<td class="notiz"></td>');
    expect(html).toContain("älteste zuerst");
    expect(neueste).toBeDefined();
  });
});

describe("Tagebuch als HTML: zwei Zeiten, Nummer, Handzeichen, Abschluss (ETB P0-3)", () => {
  const zeile = (teile: Partial<projektion.Tagebuchzeile>): projektion.Tagebuchzeile => ({
    ereignisId: "a:1",
    typ: "NachrichtNachgewiesen",
    hlcText: "0",
    wanduhr: "2026-09-08T10:33:00Z",
    akteur: "Arbeitsplatz FmZ",
    rechner: "pc-fmz",
    clientId: "a",
    satz: "Nachricht E 4 nachgewiesen (Hz. Fm): Polizei an FüSt",
    ...teile,
  });

  it("führt laufende Nummer, Erfasst und Fachzeit getrennt (R2-ETB P3-2), Nachricht, Akteur, Hz. und Rechner", () => {
    const html = tagebuchAlsHtml(
      [zeile({ ereignisId: "a:2", zeitpunkt: "2026-09-08T07:00:00Z", nachrichtNummer: "E 4", handzeichen: "Fm" }), zeile({ satz: "Einsatz angelegt", typ: "EinsatzAngelegt" })],
      KOPF,
    );
    for (const kopf of ["Nr.", "Erfasst", "Fachzeit", "Nachricht", "Eintrag", "Akteur", "Hz.", "Rechner", "Notiz"]) expect(html).toContain(`>${kopf}</th>`);
    const reihen = html.split("<tr>").slice(2);
    expect(reihen[0]).toContain("<td>1</td>");
    expect(reihen[1]).toContain("<td>2</td>");
    expect(reihen[1]).toContain("<td>E 4</td>");
    expect(reihen[1]).toContain("<td>Fm</td>");
    expect(reihen[1]).toContain("<td>pc-fmz</td>");
    // R2-ETB P3-2: „Erfasst“ mit Sekunden wie am Bildschirm, die Fachzeit ohne.
    expect(reihen[1]).toContain("<td>08.09.2026 12:33:00</td>");
    expect(reihen[1]).toContain("<td>08.09.2026 09:00</td>");
    expect(html).toContain("<strong>Stand: 08.09.2026, 08:00 · 2 Einträge</strong>");
  });

  it("schließt mit „Einsatztagebuch abgeschlossen“, markiert Berichtigungen und doppelt den Grund nicht", () => {
    const html = tagebuchAlsHtml(
      [zeile({ satz: "Nachricht A zurückgezogen, Grund: „doppelt“: S4 an OV", grund: "doppelt", berichtigung: true })],
      KOPF,
      { beendet: { zeit: "2026-09-08T16:00:00Z", akteur: "Meier" } },
    );
    expect(html).toMatch(/Einsatztagebuch abgeschlossen \d{2}\.\d{2}\.2026 \d{2}:\d{2}, Meier · 1 Einträge/);
    expect(html).toContain("[Berichtigung]");
    expect(html).not.toContain("(Grund: doppelt)");
  });

  it("zeigt die Stelle des Ereignisses statt des Anzeigenamens, wo es eine nennt (ETB P1-7)", () => {
    const html = tagebuchAlsHtml([zeile({ stelle: "SICHTER", handzeichen: "Si" }), zeile({ ereignisId: "a:3" })], KOPF);
    const reihen = html.split("<tr>").slice(2);
    expect(reihen[0]).toContain("<td>Arbeitsplatz FmZ</td>");
    expect(reihen[1]).toContain("<td>Sichter</td>");
    expect(reihen[1]).not.toContain("Arbeitsplatz FmZ");
  });
});

describe("Papier-Vordruck", () => {
  it("enthält Meldeblock, Einheitenliste, Funkprotokoll und leeren Funkplan als leere A4-Formulare", () => {
    const html = papierVordruckAlsHtml(KOPF);
    expect(html).toContain("Papier-Vordruck: Meldeblock");
    expect(html).toContain("Papier-Vordruck: Einheitenliste");
    expect(html).toContain("Papier-Vordruck: Funkprotokoll");
    expect(html).toContain("Papier-Vordruck: Funkplan (leer)");
    expect(html).toContain("size: A4 portrait");
    expect(html.match(/<td><\/td>/g)?.length).toBeGreaterThan(100);
  });
});

describe("Bildschirmhülle", () => {
  const roh = "<html><head></head><body><table><tr><td>1</td></tr></table></body></html>";

  it("ergänzt viewport und scrollbaren Tabellenrahmen", () => {
    const html = bildschirmtauglich(roh);
    expect(html).toContain('name="viewport"');
    expect(html).toContain('<div class="tabellenrahmen"><table');
    expect(html).toContain("@media screen");
  });

  it("ist idempotent", () => {
    const einmal = bildschirmtauglich(roh);
    expect(bildschirmtauglich(einmal)).toBe(einmal);
  });
});
