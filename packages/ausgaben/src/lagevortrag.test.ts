/** Der Lagevortrag als Seite (Stab-Review LtrStab A2). */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere } from "../../domaene/src/fold.js";
import { projektion } from "../../domaene/src/index.js";
import { prueflageEreignisse } from "../../domaene/src/pruefhilfen/pruefage.js";
import { lagevortragAlsHtml } from "./lagevortrag.js";

const KOPF = { datum: "2026-09-08", einsatzName: "Übung <Weser>", stand: "Stand: 08.09.2026, 08:00" };

describe("Der Lagevortrag als HTML", () => {
  it("hat alle Abschnitte der Besprechung, ein Notizfeld und maskiert Freitext", () => {
    const ereignisse = prueflageEreignisse();
    const zustand = materialisiere(falteHinzu(leereFaltung(), ereignisse));
    const html = lagevortragAlsHtml(projektion.lagevortrag(zustand, ereignisse, "2026-09-08T12:00:00+02:00"), KOPF);
    for (const titel of ["Lage je Abschnitt", "Pegel und Deich", "Patienten, Amtshilfe, Material, Störungen", "Kräfte nach Status", "Kommen und Gehen", "Offene Aufträge", "Anforderungen", "Nachrichten im Rücklauf", "Letzte Einträge im Einsatztagebuch", "Notizen"]) {
      expect(html, titel).toContain(`<h2>${titel}</h2>`);
    }
    expect(html).toContain("Übung &lt;Weser&gt;");
    expect(html).toContain("Gesamt");
  });
});
