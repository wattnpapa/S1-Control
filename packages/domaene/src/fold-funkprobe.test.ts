/**
 * Funkprobe und Schwelle „kein Kontakt" im Fold (Funkplan F3,
 * KONZEPT-FUNKPLAN.md §3 und §8).
 *
 * Geprüft wird, was der Katalog verspricht: Das Ergebnis wählt den Feldpfad,
 * damit „kein Kontakt" den letzten Kontakt nicht verdrängt; die Funkzeit ist
 * eine Ist-Zeit im Wert; die Rücknahme setzt den Vorher-Wert; die Schwelle ist
 * ein Einsatzparameter mit Rücknahme wie die Kostenparameter; die Funkzeit
 * einer Statusmeldung steht am Statusfeld. Dazu die Tagebuchzeilen.
 */

import { describe, expect, it } from "vitest";

import { falteHinzu, leereFaltung, materialisiere, type EingehendesEreignis } from "./fold.js";
import { KATALOG } from "./katalog/index.js";
import {
  abschnittAngelegt,
  anlageEreignis,
  einheitGemeldet,
  einsatzAngelegt,
  feldEreignis,
  funkprobeDurchgefuehrt,
  hlc,
  staerke,
  type Funkprobenangabe,
} from "./pruefhilfen/ereignisbau.js";
import { istFunkzeile } from "./projektion/tagebuch-funk.js";
import { tagebuchzeile } from "./projektion/tagebuch.js";
import { kompensationFuer } from "./undo.js";
import { FOLD_VERSION, type Zustand } from "./zustand.js";

let n = 0;
function h(client = "a"): ReturnType<typeof hlc> {
  n += 1;
  return hlc(n * 1000, 0, client);
}

function grundlage(): EingehendesEreignis[] {
  n = 0;
  return [
    einsatzAngelegt(h(), n, { einsatzId: "X", name: "Hochwasser", art: "EINSATZ", fuestName: "FüSt", beginn: "2026-09-08T08:00:00+02:00", schichtmodell: "ZWEI_SCHICHT" }),
    abschnittAngelegt(h(), n, { abschnittId: "EA1", name: "EA 1", abschnittstyp: "EINSATZORT", reihenfolge: 1 }),
    einheitGemeldet(h(), n, { einheitId: "E1", abschnittId: "EA1", bezeichnung: "B 1", organisation: "THW", ebene: "GRUPPE", staerke: staerke(1, 2, 9), personalErfassung: "NUR_STAERKE", status: "IM_EINSATZ" }),
    anlageEreignis(h(), n, "RufgruppeAngelegt", { rufgruppeId: "R1", betriebsart: "TMO", name: "THW_OL_EA2" }),
  ];
}

function probe(angabe: Omit<Funkprobenangabe, "einheitId">, vorher: unknown = null, client = "a"): EingehendesEreignis {
  return funkprobeDurchgefuehrt(h(client), n, { einheitId: "E1", ...angabe }, vorher);
}

function zustand(ereignisse: readonly EingehendesEreignis[]): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

const UM_1250 = "2026-09-10T12:50:00+02:00";
const UM_1305 = "2026-09-10T13:05:00+02:00";
const UM_1431 = "2026-09-10T14:31:00+02:00";

describe("Funkprobe im Fold", () => {
  it("steht auf Fassung 9; die Probe wählt den Pfad nach dem Ergebnis (LWW_ENTITAET), die Schwelle hat ein Gegenereignis", () => {
    expect(FOLD_VERSION).toBe(9);
    expect(KATALOG.get("FunkprobeDurchgefuehrt")).toMatchObject({
      form: "a",
      entitaet: "einheit",
      feld: { art: "ausNutzlast", schluessel: "ergebnis", praefix: "letzteFunkprobe" },
      klasse: "LWW_ENTITAET",
    });
    expect(KATALOG.get("FunkprobeDurchgefuehrt")?.grundPflicht).toBeUndefined();
    expect(KATALOG.get("FunkParameterGesetzt")).toMatchObject({ entitaet: "einsatz", feld: { art: "fest", pfad: "funkKontaktSchwelleMinuten" }, gegenereignis: "FunkParameterGesetzt" });
  });

  it("hält die letzte Probe je Ergebnis — „kein Kontakt“ verdrängt den Kontakt nicht", () => {
    const z = zustand([
      ...grundlage(),
      probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1250, rufgruppeId: "R1" }),
      probe({ ergebnis: "KEIN_KONTAKT", zeitpunkt: UM_1305, rufgruppeId: "R1", grund: "Funkloch Deich" }),
    ]);
    const proben = z.einheiten["E1"]?.letzteFunkprobe;
    expect(proben?.KONTAKT?.wert).toEqual({ zeitpunkt: UM_1250, rufgruppeId: "R1" });
    expect(proben?.KEIN_KONTAKT?.wert).toEqual({ zeitpunkt: UM_1305, rufgruppeId: "R1", grund: "Funkloch Deich" });
  });

  it("ersetzt die Probe desselben Ergebnisses als Ganzes", () => {
    const basis = grundlage();
    const erste = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1250, rufgruppeId: "R1" });
    const zweite = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1431 }, { zeitpunkt: UM_1250, rufgruppeId: "R1" });
    expect(zustand([...basis, erste, zweite]).einheiten["E1"]?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: UM_1431 });
  });

  it("prüft die Funkzeit als Ist-Zeit gegen die Wanduhr (§2.5)", () => {
    const z = zustand([...grundlage(), probe({ ergebnis: "KONTAKT", zeitpunkt: "2026-09-01T08:00:00+02:00" })]);
    expect(z.hinweise).toContainEqual(expect.objectContaining({ art: "meldezeitUnplausibel", feldpfad: "einheit/E1/letzteFunkprobe/KONTAKT", zeitklasse: "IST" }));
    const passend = zustand([...grundlage(), probe({ ergebnis: "KONTAKT", zeitpunkt: "2026-09-08T08:00:00+02:00" })]);
    expect(passend.hinweise.filter((x) => x.art === "meldezeitUnplausibel")).toEqual([]);
  });

  it("nimmt eine Probe zurück, indem sie den Vorher-Wert setzt — die vorige Probe mit ihrer Funkzeit", () => {
    const basis = grundlage();
    const erste = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1250, rufgruppeId: "R1" });
    const zweite = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1431 }, { zeitpunkt: UM_1250, rufgruppeId: "R1" });
    const z = zustand([...basis, erste, zweite]);
    const kompensation = kompensationFuer(zweite, z);
    expect(kompensation.art).toBe("entwurf");
    if (kompensation.art !== "entwurf") return;
    expect(kompensation.entwurf).toMatchObject({
      typ: "FunkprobeDurchgefuehrt",
      nutzlast: { einheitId: "E1", ergebnis: "KONTAKT" },
      neu: { zeitpunkt: UM_1250, rufgruppeId: "R1" },
      vorher: { zeitpunkt: UM_1431 },
      undoOf: zweite.id,
    });
    const ruecknahme = feldEreignis(h(), n, kompensation.entwurf.typ, kompensation.entwurf.nutzlast, kompensation.entwurf.vorher, kompensation.entwurf.neu);
    const danach = zustand([...basis, erste, zweite, { ...ruecknahme, undoOf: zweite.id }]);
    expect(danach.einheiten["E1"]?.letzteFunkprobe?.KONTAKT?.wert).toEqual({ zeitpunkt: UM_1250, rufgruppeId: "R1" });
  });

  it("leert das Feld, wenn die erste Probe zurückgenommen wird", () => {
    const basis = grundlage();
    const kein = probe({ ergebnis: "KEIN_KONTAKT", zeitpunkt: UM_1305, grund: "Funkloch" });
    const kompensation = kompensationFuer(kein, zustand([...basis, kein]));
    expect(kompensation).toMatchObject({ art: "entwurf", entwurf: { neu: null, nutzlast: { ergebnis: "KEIN_KONTAKT" } } });
  });

  it("hält die Funkzeit einer Statusmeldung als fachliche Zeit am Statusfeld, ohne Zeitklasse", () => {
    const meldung = feldEreignis(h(), n, "StatusGesetzt", { einheitId: "E1", ereignisZeit: "2026-09-07T08:00:00+02:00" }, "IM_EINSATZ", "RUHE");
    const z = zustand([...grundlage(), meldung]);
    expect(z.einheiten["E1"]?.status).toMatchObject({ wert: "RUHE", fachlicheZeit: "2026-09-07T08:00:00+02:00" });
    expect(z.einheiten["E1"]?.status.zeitklasse).toBeUndefined();
    expect(z.hinweise.filter((x) => x.art === "meldezeitUnplausibel")).toEqual([]);
  });
});

describe("Die Schwelle „kein Kontakt“", () => {
  it("setzt den Einsatzparameter und nimmt ihn mit dem Vorher-Wert zurück", () => {
    const basis = grundlage();
    const setzen = feldEreignis(h(), n, "FunkParameterGesetzt", { einsatzId: "X" }, null, 45);
    const z = zustand([...basis, setzen]);
    expect(z.einsatz?.funkKontaktSchwelleMinuten?.wert).toBe(45);
    expect(kompensationFuer(setzen, z)).toMatchObject({ art: "entwurf", entwurf: { typ: "FunkParameterGesetzt", neu: null, vorher: 45 } });
  });
});

describe("Funkprobe im Tagebuch", () => {
  it("nennt Rufgruppe und Ergebnis, Funkzeit und Grund in eigenen Spalten, und gehört in den Funkauszug", () => {
    const basis = grundlage();
    const kontakt = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1250, rufgruppeId: "R1" });
    const kein = probe({ ergebnis: "KEIN_KONTAKT", zeitpunkt: UM_1305, grund: "Funkloch Deich" });
    const z = zustand([...basis, kontakt, kein]);
    const erste = tagebuchzeile(z, kontakt);
    expect(erste).toMatchObject({ satz: "B 1: Funkprobe THW_OL_EA2: Kontakt", zeitpunkt: UM_1250, einheitId: "E1", feld: "KONTAKT" });
    expect(istFunkzeile(erste)).toBe(true);
    expect(tagebuchzeile(z, kein)).toMatchObject({ satz: "B 1: Funkprobe: kein Kontakt", grund: "Funkloch Deich", zeitpunkt: UM_1305 });
  });

  it("nennt eine Rücknahme als solche und zur Zeit ihres Schreibens", () => {
    const basis = grundlage();
    const kontakt = probe({ ergebnis: "KONTAKT", zeitpunkt: UM_1250 });
    const ruecknahme = { ...feldEreignis(h(), n, "FunkprobeDurchgefuehrt", { einheitId: "E1", ergebnis: "KONTAKT" }, { zeitpunkt: UM_1250 }, null), undoOf: kontakt.id };
    const zeile = tagebuchzeile(zustand([...basis, kontakt, ruecknahme]), ruecknahme);
    expect(zeile.satz).toBe("B 1: Funkprobe zurückgenommen (Kontakt)");
    expect(zeile.zeitpunkt).toBeUndefined();
  });

  it("schreibt die Schwelle in Minuten; ohne Vorher-Wert gilt die Vorbelegung", () => {
    const basis = grundlage();
    const setzen = feldEreignis(h(), n, "FunkParameterGesetzt", { einsatzId: "X" }, null, 45);
    expect(tagebuchzeile(zustand([...basis, setzen]), setzen).satz).toBe("Hochwasser: Schwelle „kein Kontakt“: 60 → 45 min");
  });
});
