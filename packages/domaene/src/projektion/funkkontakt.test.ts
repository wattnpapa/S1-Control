/**
 * Prüffälle zum letzten Kontakt (KONZEPT-FUNKPLAN.md §3, Funkplan F3): die
 * Rangfolge Funkprobe gegen Statusmeldung, der Statusfilter, die Schwelle am
 * Rand, „kein Kontakt" ohne Rückstellung, die Zahlen des Bandes, die Folge
 * der Funkproben und die Spalte der Einheitentabelle.
 *
 * Die Wanduhr der Bauhilfe liegt bei 08:00 Uhr am 08.09.2026 plus die
 * Millisekunden der HLC; die Funkzeiten unten sind auf diesen Morgen gelegt.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "../fold.js";
import { abschnittAngelegt, anlageEreignis, einheitGemeldet, einsatzAngelegt, feldEreignis, funkprobeDurchgefuehrt, hlc, staerke, type Funkprobenangabe } from "../pruefhilfen/ereignisbau.js";
import type { EinheitZustand, Zustand } from "../zustand.js";
import { kontaktmarke, letzterKontakt } from "./funkkontakt.js";
import { funkplan, type Funkteilnehmer } from "./funkplan.js";
import { funkprobenfolge } from "./funkproben.js";
import { tabellenzeile } from "./tabelle.js";

let n = 0;
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, client);
}

/**
 * Eine Funkzeit am Einsatzmorgen in der Ortszeit des Rechners — „1250" in der
 * Marke ist Ortszeit. Die Wanduhr der Anlagen liegt davor.
 */
const UHR = (hhmm: string): string => new Date(2026, 8, 8, Number(hhmm.slice(0, 2)), Number(hhmm.slice(2))).toISOString();

/** Eine Einheit als `[Kennung, Status]`; ohne Status im Einsatz. */
type Einheitangabe = readonly [string, string?];

function einheit([einheitId, status = "IM_EINSATZ"]: Einheitangabe): EingehendesEreignis {
  return einheitGemeldet(h(), n, { einheitId, abschnittId: "EA1", bezeichnung: `Einheit ${einheitId}`, organisation: "THW", ebene: "GRUPPE", staerke: staerke(0, 1, 8), personalErfassung: "NUR_STAERKE", status });
}

/** Einsatz, Bereich, Rufgruppe und die Einheiten — die Laufnummern beginnen hier neu. */
function grundlage(...einheiten: readonly Einheitangabe[]): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_EA2" }),
    ...einheiten.map(einheit),
  ];
}

function probe(einheitId: string, angabe: Omit<Funkprobenangabe, "einheitId">): EingehendesEreignis {
  return funkprobeDurchgefuehrt(h(), n, { einheitId, ...angabe });
}

function status(einheitId: string, neu: string, ereignisZeit?: string): EingehendesEreignis {
  return feldEreignis(h(), n, "StatusGesetzt", { einheitId, ...(ereignisZeit === undefined ? {} : { ereignisZeit }) }, "IM_EINSATZ", neu);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

function e1(z: Zustand): EinheitZustand {
  return z.einheiten["E1"] as EinheitZustand;
}

function teilnehmer(plan: ReturnType<typeof funkplan>, einheitId: string): Funkteilnehmer | undefined {
  return [...plan.rufgruppen.flatMap((r) => r.teilnehmer), ...plan.ohneRufgruppe].find((t) => t.einheitId === einheitId);
}

describe("Der letzte Kontakt", () => {
  it("nimmt die jüngere Zeit aus Funkprobe „Kontakt“ und Statusmeldung", () => {
    const basis = grundlage(["E1"]);
    const spaeteProbe = zustand([...basis, status("E1", "RUHE", UHR("1000")), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1100") })]);
    expect(letzterKontakt(e1(spaeteProbe), undefined, 60)).toEqual({ art: "FUNKPROBE", zeitpunkt: UHR("1100"), ueberSchwelle: false });
    const spaeteMeldung = zustand([...basis, probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("0900") }), status("E1", "RUHE", UHR("1000"))]);
    expect(letzterKontakt(e1(spaeteMeldung), undefined, 60)).toMatchObject({ art: "MELDUNG", zeitpunkt: UHR("1000") });
  });

  it("nimmt ohne Funkzeit die Wanduhr der Statusmeldung, und eine zurückgenommene Meldung zählt nicht", () => {
    const basis = grundlage(["E1"]);
    const ohneZeit = zustand(basis);
    const anlage = basis.at(-1) as EingehendesEreignis;
    expect(letzterKontakt(e1(ohneZeit), undefined, 60)).toMatchObject({ art: "MELDUNG", zeitpunkt: anlage.wanduhr });
    const meldung = status("E1", "RUHE", UHR("1000"));
    const zurueck = { ...feldEreignis(h(), n, "StatusGesetzt", { einheitId: "E1", ereignisZeit: UHR("1000") }, "RUHE", "IM_EINSATZ"), undoOf: meldung.id };
    expect(letzterKontakt(e1(zustand([...basis, meldung, zurueck])), undefined, 60)).toBeUndefined();
  });

  it("ist genau an der Schwelle noch nicht darüber, eine Minute später schon", () => {
    const z = zustand([...grundlage(["E1"]), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1000") })]);
    expect(letzterKontakt(e1(z), UHR("1100"), 60)?.ueberSchwelle).toBe(false);
    expect(letzterKontakt(e1(z), UHR("1101"), 60)?.ueberSchwelle).toBe(true);
    expect(letzterKontakt(e1(z), UHR("1101"), 90)?.ueberSchwelle).toBe(false);
  });

  it("führt Rufbereitschaft, Einsatzvorbehalt, Angefordert und Rückmarsch nie über der Schwelle", () => {
    for (const wert of ["RUFBEREITSCHAFT", "EINSATZVORBEHALT", "ANGEFORDERT", "RUECKMARSCH"]) {
      const z = zustand([...grundlage(["E1", wert]), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("0805") })]);
      expect(letzterKontakt(e1(z), UHR("2000"), 60)?.ueberSchwelle, wert).toBe(false);
    }
    const anmarsch = zustand([...grundlage(["E1", "ANMARSCH"]), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("0805") })]);
    expect(letzterKontakt(e1(anmarsch), UHR("2000"), 60)?.ueberSchwelle).toBe(true);
  });
});

describe("„kein Kontakt“ im Funkplan", () => {
  it("setzt den letzten Kontakt nicht zurück und steht als eigener Hinweis daneben", () => {
    const z = zustand([
      ...grundlage(["E1"]),
      probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1000"), rufgruppeId: "R1" }),
      probe("E1", { ergebnis: "KEIN_KONTAKT", zeitpunkt: UHR("1030"), rufgruppeId: "R1", grund: "Funkloch Deich" }),
    ]);
    const t = teilnehmer(funkplan(z, UHR("1045")), "E1");
    expect(t?.letzterKontakt).toEqual({ art: "FUNKPROBE", zeitpunkt: UHR("1000"), ueberSchwelle: false });
    expect(t?.keinKontaktGemeldet).toEqual({ zeitpunkt: UHR("1030"), rufgruppeId: "R1", grund: "Funkloch Deich" });
    expect(t?.letzteFunkproben?.KONTAKT).toEqual({ zeitpunkt: UHR("1000"), rufgruppeId: "R1" });
  });

  it("verschwindet, sobald danach wieder Kontakt war", () => {
    const z = zustand([
      ...grundlage(["E1"]),
      probe("E1", { ergebnis: "KEIN_KONTAKT", zeitpunkt: UHR("1030"), grund: "Funkloch" }),
      probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1040") }),
    ]);
    expect(teilnehmer(funkplan(z, UHR("1045")), "E1")?.keinKontaktGemeldet).toBeUndefined();
  });
});

describe("Die Zahlen des Bandes", () => {
  it("zählt die Einheiten über der Schwelle und nennt die jüngste Funkprobe; die Schwelle kommt aus dem Einsatz", () => {
    const basis = grundlage(["E1"], ["E2"], ["E3", "RUFBEREITSCHAFT"]);
    const ereignisse = [
      ...basis,
      probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("0900") }),
      probe("E2", { ergebnis: "KEIN_KONTAKT", zeitpunkt: UHR("1000"), grund: "keine Antwort" }),
    ];
    const plan = funkplan(zustand(ereignisse), UHR("1030"));
    // E1: 90 min seit der Probe; E2: nur die Anlage am frühen Morgen; E3 in Rufbereitschaft.
    expect(plan.zahlen.ohneKontakt).toBe(2);
    expect(plan.zahlen.letzteFunkprobe).toBe(UHR("1000"));
    expect(plan.schwelleMinuten).toBe(60);
    const grosszuegig = funkplan(zustand([...ereignisse, feldEreignis(h(), n, "FunkParameterGesetzt", { einsatzId: "X" }, null, 120)]), UHR("1030"));
    expect(grosszuegig.schwelleMinuten).toBe(120);
    expect(grosszuegig.zahlen.ohneKontakt).toBe(1);
  });

  it("zählt ohne Uhr niemanden über der Schwelle und nennt ohne Probe keine Zeit", () => {
    const plan = funkplan(zustand(grundlage(["E1"])));
    expect(plan.zahlen.ohneKontakt).toBe(0);
    expect(plan.zahlen.letzteFunkprobe).toBeUndefined();
  });
});

describe("Die Folge der Funkproben", () => {
  it("listet die Proben nach Funkzeit, jüngste zuerst, mit Rufgruppe, Ergebnis, Akteur und Grund", () => {
    const basis = grundlage(["E1"], ["E2"]);
    const a = probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1000"), rufgruppeId: "R1" });
    const b = probe("E2", { ergebnis: "KEIN_KONTAKT", zeitpunkt: UHR("0930"), grund: "Funkloch" });
    const c = probe("E2", { ergebnis: "KONTAKT", zeitpunkt: UHR("1015") });
    const ereignisse = [...basis, a, b, c];
    const folge = funkprobenfolge(zustand(ereignisse), ereignisse);
    expect(folge.map((z) => z.ereignisId)).toEqual([c.id, a.id, b.id]);
    expect(folge[1]).toEqual({ ereignisId: a.id, einheitId: "E1", einheit: "Einheit E1", rufgruppeId: "R1", rufgruppe: "THW_OL_EA2", ergebnis: "KONTAKT", zeitpunkt: UHR("1000"), akteur: "Bediener a", zurueckgenommen: false });
    expect(folge[2]).toMatchObject({ ergebnis: "KEIN_KONTAKT", grund: "Funkloch" });
    expect(funkprobenfolge(zustand(ereignisse), ereignisse, 2)).toHaveLength(2);
  });

  it("zeigt eine Rücknahme nicht als Probe und kennzeichnet die zurückgenommene", () => {
    const basis = grundlage(["E1"]);
    const a = probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1000") });
    const zurueck = { ...feldEreignis(h(), n, "FunkprobeDurchgefuehrt", { einheitId: "E1", ergebnis: "KONTAKT" }, { zeitpunkt: UHR("1000") }, null), undoOf: a.id };
    const ereignisse = [...basis, a, zurueck];
    expect(funkprobenfolge(zustand(ereignisse), ereignisse)).toEqual([expect.objectContaining({ ereignisId: a.id, zurueckgenommen: true })]);
  });
});

describe("Die Spalte „Letzter Kontakt“ der Einheitentabelle", () => {
  it("trägt den Kontakt ohne Uhr an der Zeile; die Marke rechnet der Aufrufer mit seinem jetzt", () => {
    const z = zustand([...grundlage(["E1"]), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("1250") })]);
    const zeile = tabellenzeile(z, e1(z));
    expect(zeile.zellen["letzterKontakt"]).toEqual({ text: "1250 Funkprobe", wert: undefined, umstritten: false });
    expect(zeile.letzterKontakt).toEqual({ art: "FUNKPROBE", zeitpunkt: UHR("1250"), schwelleMinuten: 60, kontaktpflicht: true });
    expect(kontaktmarke(zeile.letzterKontakt, UHR("1350"))).toMatchObject({ text: "1250 Funkprobe", ton: "neutral" });
    expect(kontaktmarke(zeile.letzterKontakt, UHR("1443"))).toEqual({
      text: "1250 · 1 h 53 min",
      ton: "warn",
      titel: "1250 Funkprobe · vor 1 h 53 min — kein Kontakt seit mehr als 60 min",
    });
    expect(kontaktmarke(undefined, UHR("1443"))).toBeUndefined();
  });

  it("färbt eine Einheit ohne Kontaktpflicht nie Bernstein", () => {
    const z = zustand([...grundlage(["E1", "RUECKMARSCH"]), probe("E1", { ergebnis: "KONTAKT", zeitpunkt: UHR("0900") })]);
    const zeile = tabellenzeile(z, e1(z));
    expect(zeile.letzterKontakt?.kontaktpflicht).toBe(false);
    expect(kontaktmarke(zeile.letzterKontakt, UHR("2300"))?.ton).toBe("neutral");
  });
});
