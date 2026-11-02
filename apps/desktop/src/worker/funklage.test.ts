/**
 * Der Funkplan im Lagebild am echten Aktendienst (Funkplan F4).
 *
 * Geprüft wird die Naht zum Monitor: Das geschobene Lagebild trägt `funk`
 * aus derselben Projektion, die `funkplanAnfordern` liefert, und die Zahlen
 * werden je Zustand und Minute gemerkt — das Lagebild entsteht jede Sekunde,
 * „kein Kontakt über der Schwelle“ braucht nur die Minute.
 */

import { projektion } from "@s1/domaene";
import { afterEach, describe, expect, it } from "vitest";

import { lagebildMit, zLagebild, type Lagebild } from "../kontrakt/index.js";
import { funkprobe, rufgruppeAnlegen, rufgruppeDerEinheit } from "../kontrakt/funkschritte.js";
import { funkFuerLagebild } from "./funkplanprojektion.js";
import { grundlage, raeumeAuf, werkstattMitEinemPlatz, type Platz } from "./pruefhilfen/werkstatt.js";

afterEach(raeumeAuf);

const MINUTE_MS = 60_000;

function letzterStand(platz: Platz): Lagebild | undefined {
  let bild: Lagebild | undefined;
  for (const mitteilung of platz.mitteilungen) {
    if (mitteilung.art !== "stand") continue;
    if (mitteilung.voll !== undefined) bild = mitteilung.voll;
    else if (bild !== undefined) bild = lagebildMit(bild, mitteilung.geaendert ?? {});
  }
  return bild;
}

async function mitZweiGruppen(): Promise<Platz> {
  const a = await werkstattMitEinemPlatz();
  await grundlage(a);
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_EA2" }));
  await a.dienst.bediene(rufgruppeAnlegen({ rufgruppeId: "R2", betriebsart: "DMO", name: "DMO 310" }));
  await a.dienst.bediene(rufgruppeDerEinheit("U1", null, "R1"));
  return a;
}

describe("Der Funkplan im Lagebild", () => {
  it("schiebt die fünf Zahlen aus derselben Projektion wie funkplanAnfordern mit", async () => {
    const a = await mitZweiGruppen();
    const funk = letzterStand(a)?.funk;
    expect(funk).toEqual({ rufgruppen: 2, zugeordnet: 1, ohneRufgruppe: 0, ohneKontakt: 0 });
    const zahlen = a.dienst.funkplan({ art: "funkplanAnfordern", akteId: "akte-1" }).plan.zahlen;
    expect(funk).toEqual({
      rufgruppen: zahlen.rufgruppen,
      zugeordnet: zahlen.zugeordnet,
      ohneRufgruppe: zahlen.ohneRufgruppe,
      ohneKontakt: zahlen.ohneKontakt,
    });
  });

  it("zählt eine Einheit ohne Rufgruppe und hält das Lagebild im Kontrakt gültig", async () => {
    const a = await werkstattMitEinemPlatz();
    await grundlage(a);
    const bild = letzterStand(a);
    expect(bild?.funk).toEqual({ rufgruppen: 0, zugeordnet: 0, ohneRufgruppe: 1, ohneKontakt: 0 });
    expect(zLagebild.safeParse(bild).success).toBe(true);
  });

  it("rechnet „kein Kontakt“ und die letzte Funkprobe gegen die Uhr wie die Projektion", async () => {
    const a = await mitZweiGruppen();
    const probe = new Date(Date.now() - 5 * MINUTE_MS).toISOString();
    await a.dienst.bediene(funkprobe({ einheitId: "U1", rufgruppeId: "R1", rufgruppeAufgeloest: false }, "KONTAKT", probe));
    expect(letzterStand(a)?.funk?.letzteFunkprobe).toBe(probe);
    const zustand = a.dienst.zustand;
    const spaeter = Date.now() + 90 * MINUTE_MS;
    const funk = funkFuerLagebild(zustand, spaeter);
    const minute = new Date(Math.floor(spaeter / MINUTE_MS) * MINUTE_MS).toISOString();
    const zahlen = projektion.funkplan(zustand, minute).zahlen;
    // U1 ist im Einsatz, hat Kontaktpflicht und meldete zuletzt bei der Anlage.
    expect(funk.ohneKontakt).toBe(1);
    expect(funk.ohneKontakt).toBe(zahlen.ohneKontakt);
    expect(funk.letzteFunkprobe).toBe(zahlen.letzteFunkprobe);
    expect(funkFuerLagebild(zustand, Date.now()).ohneKontakt).toBe(0);
  });

  it("rechnet in derselben Minute und mit demselben Zustand nicht neu", async () => {
    const a = await mitZweiGruppen();
    const zustand = a.dienst.zustand;
    const jetzt = Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS + 10_000;
    const erste = funkFuerLagebild(zustand, jetzt);
    expect(funkFuerLagebild(zustand, jetzt + 20_000)).toBe(erste);
    expect(funkFuerLagebild(zustand, jetzt + MINUTE_MS)).not.toBe(erste);
    await a.dienst.bediene(rufgruppeDerEinheit("U1", "R1", "R2"));
    const neu = funkFuerLagebild(a.dienst.zustand, jetzt + MINUTE_MS);
    expect(neu).toEqual({ rufgruppen: 2, zugeordnet: 1, ohneRufgruppe: 0, ohneKontakt: 0 });
    expect(a.dienst.zustand).not.toBe(zustand);
  });
});
