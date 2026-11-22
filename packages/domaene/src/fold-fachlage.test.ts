/**
 * Die Fachlage im Fold (Stab-Review 2026-11-22): Anlage als Felder, Änderung
 * nach LWW, Verweis auf einen unbekannten Abschnitt als Hinweis, Schema prüft.
 */

import { describe, expect, it } from "vitest";

import { KATALOG } from "./katalog/index.js";
import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { abschnittAngelegt, anlageEreignis, feldEreignis, hlc } from "./pruefhilfen/ereignisbau.js";

let n = 0;
const h = (): ReturnType<typeof hlc> => hlc(++n * 1000, 0, "a");
const falte = (...e: EingehendesEreignis[]) => materialisiere(falteHinzu(leereFaltung(), e));
const ZEIT = "2026-11-22T10:00:00.000Z";

describe("Die Fachlage im Fold", () => {
  it("legt Pegelmessung und Deichschaden an, ändert den Stand und lässt leere Sammlungen weg", () => {
    n = 0;
    const z = falte(
      anlageEreignis(h(), n, "PegelstandGemessen", { messungId: "P1", pegel: "Drielake", zeitpunkt: ZEIT, wertCm: 382, prognoseCm: 420 }),
      anlageEreignis(h(), n, "DeichschadenGemeldet", { schadenId: "D1", deichKm: "3,4", art: "SICKERSTELLE", beschreibung: "Sickerstelle landseitig", zeitpunkt: ZEIT }),
      feldEreignis(h(), n, "DeichschadenGeaendert", { schadenId: "D1", feld: "stand" }, null, "IN_ARBEIT"),
    );
    expect(z.pegelmessungen?.["P1"]?.wertCm.wert).toBe(382);
    expect(z.deichschaeden?.["D1"]?.stand?.wert).toBe("IN_ARBEIT");
    expect(z.patienten).toBeUndefined();
  });

  it("meldet eine Abschnittslage zu einem unbekannten Abschnitt, behält sie aber", () => {
    n = 0;
    const z = falte(anlageEreignis(h(), n, "AbschnittslageGemeldet", { lageId: "L1", abschnittId: "EA9", zeitpunkt: ZEIT, lage: "Deich hält" }));
    expect(z.abschnittslagen?.["L1"]?.lage.wert).toBe("Deich hält");
    expect(z.hinweise.some((h) => h.art === "fremdreferenzUnbekannt")).toBe(true);
    const mit = falte(
      abschnittAngelegt(h(), n, { abschnittId: "EA9", name: "EA 9", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
      anlageEreignis(h(), n, "AbschnittslageGemeldet", { lageId: "L1", abschnittId: "EA9", zeitpunkt: ZEIT, lage: "Deich hält" }),
    );
    expect(mit.hinweise.some((h) => h.art === "fremdreferenzUnbekannt")).toBe(false);
  });

  it("prüft die Anlage gegen ihr Schema: keine unbekannte Sichtungskategorie, kein Name am Patienten", () => {
    const schema = KATALOG.get("PatientErfasst")?.schema;
    expect(schema?.safeParse({ patientId: "X", kennung: "AK-17", sichtung: "SK2", einsatzkraft: true, zeitpunkt: ZEIT }).success).toBe(true);
    expect(schema?.safeParse({ patientId: "X", kennung: "AK-17", sichtung: "ROT", einsatzkraft: true, zeitpunkt: ZEIT }).success).toBe(false);
    expect(KATALOG.get("PatientGeaendert")?.schema.safeParse({ patientId: "X", feld: "name" }).success).toBe(false);
  });
});

describe("Die Fachlage im Tagebuch", () => {
  it("nennt Bezug, Inhalt und bei Änderungen den neuen Wert als Wort", async () => {
    const { tagebuchzeile } = await import("./projektion/tagebuch.js");
    n = 0;
    const anlage = anlageEreignis(h(), n, "DeichschadenGemeldet", { schadenId: "D1", deichKm: "3,4", art: "SICKERSTELLE", beschreibung: "landseitig", zeitpunkt: ZEIT });
    const aenderung = feldEreignis(h(), n, "DeichschadenGeaendert", { schadenId: "D1", feld: "stand" }, null, "GESICHERT");
    const z = falte(anlage, aenderung);
    expect(tagebuchzeile(z, anlage).satz).toBe("Deichschaden gemeldet — Deich-km 3,4: Sickerstelle: landseitig");
    expect(tagebuchzeile(z, aenderung).satz).toBe("Deich-km 3,4: Deichschaden geändert — Stand: gesichert");
  });
});
