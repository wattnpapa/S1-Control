/**
 * Tests zu den druckbaren Listen (Anforderungen, Tagebuch), dem Papier-Vordruck
 * und der Bildschirmhülle.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { projektion } from "../../domaene/src/index.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";

import { bildschirmtauglich } from "./bildschirm.js";
import { anforderungenAlsHtml, tagebuchAlsHtml } from "./listen.js";
import { papierVordruckAlsHtml } from "./papier.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung <Weser>", stand: "Stand: 08.09.2026, 08:00" };

function lage() {
  const ereignisse = prueflageEreignisse();
  return { ereignisse, zustand: materialisiere(falteHinzu(leereFaltung(), ereignisse)) };
}

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

describe("Papier-Vordruck", () => {
  it("enthält Meldeblock, Einheitenliste und Funkprotokoll als leere A4-Formulare", () => {
    const html = papierVordruckAlsHtml(KOPF);
    expect(html).toContain("Papier-Vordruck: Meldeblock");
    expect(html).toContain("Papier-Vordruck: Einheitenliste");
    expect(html).toContain("Papier-Vordruck: Funkprotokoll");
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
