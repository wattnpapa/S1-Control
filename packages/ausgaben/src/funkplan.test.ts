/** Tests zur Ausgabe „Funkplan" und zum leeren Vordruck (KONZEPT-FUNKPLAN.md §7). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../../domaene/src/fold.js";
import { projektion } from "../../domaene/src/index.js";
import { anlageEreignis, feldEreignis, hlc } from "../../domaene/src/pruefhilfen/ereignisbau.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";

import { FUNKPLAN_FUSSNOTE, funkplanAlsHtml } from "./funkplan.js";
import { papierVordruckAlsHtml } from "./papier.js";

const KOPF = {
  datum: "2026-09-08",
  einsatzName: "Übung <Weser-Ems>",
  stand: "081443SEP26",
  fuestName: "FüSt Oldenburg",
  erstelltVon: "Meier (FmZ)",
};

let n = 0;
function h(): ReturnType<typeof hlc> {
  n += 1;
  return hlc(9_000_000 + n * 1000, 0, "fmz");
}

/** Die Prüflage mit drei Rufgruppen, einer aufgelösten und einigen Zuordnungen. */
function lage() {
  n = 0;
  const funk: EingehendesEreignis[] = [
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_FUE", zweck: "Führung", hoert: "FmZ Platz 1", reihenfolge: 1 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R2", betriebsart: "DMO", name: "DMO 310", zweck: "Deich", gateway: "Heros Varel 25/10", abschnittId: "EO1", reihenfolge: 2 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R3", betriebsart: "ANALOG", name: "Kanal 55", reihenfolge: 3 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R4", betriebsart: "TMO", name: "ALT_GRUPPE", reihenfolge: 4 }),
  ];
  funk.push(
    feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E01" }, null, "R1"),
    feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E12" }, null, "R2"),
    feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E19" }, null, "R2"),
    feldEreignis(h(), n, "EinheitRufgruppeGesetzt", { einheitId: "E05" }, null, "R4"),
    feldEreignis(h(), n, "RufgruppeAufgeloest", { rufgruppeId: "R4" }, null, true, "abgeschaltet"),
  );
  const zustand = materialisiere(falteHinzu(leereFaltung(), [...prueflageEreignisse(), ...funk]));
  return projektion.funkplan(zustand);
}

describe("Die Ausgabe Funkplan", () => {
  it("führt je geltende Rufgruppe eine Kopfzeile mit Betriebsart, Name, Zweck, Gateway und hört", () => {
    const html = funkplanAlsHtml(lage(), KOPF);
    expect(html).toContain("<h1>Funkplan</h1>");
    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("TMO · THW_OL_FUE <small>Führung · hört FmZ Platz 1</small>");
    expect(html).toContain("DMO · DMO 310 <small>Deich · Gateway Heros Varel 25/10</small>");
    expect(html).toContain("Analog · Kanal 55</td>");
    expect(html).not.toContain("ALT_GRUPPE");
  });

  it("nennt die Teilnehmer mit Bereich und Hinweis und setzt je Gruppe eine leere Zeile", () => {
    const html = funkplanAlsHtml(lage(), KOPF);
    expect(html).toContain("<tr><td>Stab FüSt</td>");
    expect(html).toContain("<td>FGr Wasserschaden/Pumpen</td>");
    expect(html).toContain("Bereich ≠ Gruppe");
    // Drei Gruppen mit je einer leeren Zeile, dazu zwei am Ende.
    expect(html.match(/<tr class="leer">/g)).toHaveLength(5);
  });

  it("führt am Ende die Einheiten ohne Rufgruppe, auch die der aufgelösten Gruppe", () => {
    const html = funkplanAlsHtml(lage(), KOPF);
    const ohne = html.slice(html.indexOf("Ohne Rufgruppe"));
    expect(ohne).toContain("FGr Logistik-Verpflegung");
    expect(ohne).not.toContain("Stab FüSt<");
    // Rückmarsch zählt nicht mehr und steht nicht auf dem Plan.
    expect(html).not.toContain("Trupp Aufklärung");
  });

  it("trägt Kopf mit Führungsstelle, Stand und Akteur, maskiert und mit Fuß", () => {
    const html = funkplanAlsHtml(lage(), KOPF, "ausgaben\\funkplan-081443SEP26.pdf");
    expect(html).toContain("Übung &lt;Weser-Ems&gt; · Führungsstelle FüSt Oldenburg");
    expect(html).toContain("<dt>Stand</dt><dd>081443SEP26</dd>");
    expect(html).toContain("<dt>Erstellt</dt><dd>Meier (FmZ)</dd>");
    expect(html).toContain(FUNKPLAN_FUSSNOTE);
    expect(html).toContain("S1-Control · ausgaben\\funkplan-081443SEP26.pdf");
  });

  it("bleibt ohne Rufgruppen eine ausfüllbare Seite", () => {
    const html = funkplanAlsHtml({ rufgruppen: [], ohneRufgruppe: [], jeBereich: [], zahlen: { rufgruppen: 0, zugeordnet: 0, ohneRufgruppe: 0, dmoOderGateway: 0 } }, { datum: "2026-09-08", einsatzName: "Leer", stand: "Stand: jetzt" });
    expect(html).toContain("Ohne Rufgruppe");
    expect(html.match(/<tr class="leer">/g)).toHaveLength(2);
    expect(html).not.toContain("<dt>Erstellt</dt>");
  });
});

describe("Der leere Funkplan im Papier-Vordruck", () => {
  it("steht als vierte Seite mit denselben Spalten wie die Ausgabe", () => {
    const html = papierVordruckAlsHtml({ datum: "2026-09-08", einsatzName: "Übung", stand: "Stand: jetzt" });
    const seite = html.slice(html.indexOf('aria-label="Funkplan (leer)"'));
    expect(html.indexOf("Papier-Vordruck: Funkprotokoll")).toBeLessThan(html.indexOf("Papier-Vordruck: Funkplan (leer)"));
    expect(seite).toContain('<th scope="col">Einheit</th><th scope="col">Bereich</th><th scope="col">Funkrufname</th><th scope="col">Erreichbarkeit</th><th scope="col">Hinweis</th>');
    expect(seite.match(/<tr class="rg">/g)).toHaveLength(4);
    expect(seite).toContain("Ohne Rufgruppe");
  });
});
