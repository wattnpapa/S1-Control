/**
 * Tests zu `s1 akte pruefe` — der Abnahmebedingung von M2.4.
 *
 * Geprüft wird an einer **echten** Akte in einem Wegwerf-Verzeichnis: Die
 * Ereignisse werden über `oeffneAkte` und `Akte.schreibe` geschrieben und
 * gespiegelt, nicht als Zeilen von Hand gebaut. Nur so misst der Test das, was
 * in M2.4 gemessen wird — den Dateibestand, den die Anwendung hinterlässt.
 * Ein Test gegen selbst zusammengesetzte Zeilen prüfte die Testhilfe.
 */

import { describe, expect, it } from "vitest";

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HlcUhr } from "@s1/domaene";
import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  knotenDateisystem,
  legeEinsatzAn,
  oeffneAkte,
  type Einsatzanker,
} from "@s1/speicher";

import { fuehreAus } from "../index.js";
import { pruefeOrdner, pruefe } from "./pruefe.js";

const EINSATZ_ID = "2026-09-08_uebung-nord_ab12cd";

/**
 * Eine feststehende Uhr statt der Systemzeit (§8, Vorbemerkung).
 *
 * Der `zustandsHash` ist eine Funktion der Ereignisse, und zu jedem Ereignis
 * gehören HLC, Wanduhr und Akteur (§2.4). Zwei Läufe mit der echten Uhr
 * ergäben deshalb verschiedene Ereignisse und damit zu Recht verschiedene
 * Hashes — der Vergleich prüfte dann die Uhr und nicht die Konvergenz. Die
 * Speicherschicht nimmt ihre Zeitquelle genau dafür als Parameter entgegen.
 */
const FESTE_ZEIT = Date.parse("2026-09-08T08:00:00.000Z");
const uhrzeit = () => FESTE_ZEIT;

function anker(): Einsatzanker {
  return {
    einsatzId: EINSATZ_ID,
    name: "Übung Nord",
    datum: "2026-09-08",
    angelegtAm: "2026-09-08T08:00:00.000Z",
    angelegtVon: "9f3c1a20",
  };
}

/**
 * Legt eine Akte an, schreibt `anzahl` Ereignisse und spiegelt sie auf den
 * Share.
 *
 * Der Rückgabewert ist der **Share**-Einsatzordner: Das ist der Ordner, den
 * die Abnahme von M2.4 prüft — der eines zweiten Rechners ebenso.
 */
async function baueAkte(
  wurzel: string,
  rechner: string,
  clientId: string,
  anzahl: number,
  segmentgroesse?: number,
): Promise<string> {
  const ablage = new Einsatzablage(
    path.join(wurzel, "share", "einsatz"),
    path.join(wurzel, rechner, "einsatz"),
  );
  const dateisystem = knotenDateisystem();
  await fsp.mkdir(ablage.share, { recursive: true });
  await fsp.mkdir(ablage.lokal, { recursive: true });
  // §5.6: `einsatz.json` und die Unterordner entstehen einmal beim Anlegen.
  // Ein zweiter Rechner findet sie vor — deshalb `EEXIST` hier hinnehmen.
  try {
    await legeEinsatzAn(dateisystem, ablage, anker(), EINSATZ_UNTERORDNER);
  } catch {
    // Der Ordner steht bereits; der zweite Rechner legt ihn nicht neu an (§5.7).
  }
  const { akte } = await oeffneAkte({
    dateisystem,
    zeit: uhrzeit,
    ablage,
    clientId,
    einsatzId: EINSATZ_ID,
    // Der Akteur geht in jedes Ereignis ein (§2.4) und damit in den Hash. Er
    // bleibt hier für beide Läufe gleich: Verglichen wird, ob **dieselben**
    // Ereignisse auf zwei Rechnern denselben Zustand ergeben — nicht, ob zwei
    // verschiedene Bediener denselben.
    akteur: { benutzer: "Bediener FüSt", host: "fuest-1", clientId },
    uhr: new HlcUhr({ clientId, wanduhr: uhrzeit }),
    neueKennung: () => "aabbccdd",
    ...(segmentgroesse === undefined ? {} : { segmentgroesse }),
  });
  for (let i = 0; i < anzahl; i += 1) {
    const ergebnis = await akte.schreibe({
      typ: "EinheitGemeldet",
      // Eine nach dem Katalog (§5.4) **gültige** Nutzlast. Mit einer
      // unvollständigen führte der Fold jedes Ereignis nach §3.7 als
      // unbekannt mit, und der Bericht spräche über einen Zustand, der aus
      // lauter Ausnahmen besteht — der `zustandsHash` wäre dann kaum noch
      // eine Aussage über die Lage.
      nutzlast: {
        einheitId: `u${i}`,
        abschnittId: "A1",
        bezeichnung: `${i + 1}. Bergungsgruppe`,
        organisation: "THW",
        hierarchie: [],
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
        reihenfolge: i,
        istFuehrungDesAbschnitts: false,
      },
    });
    if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  }
  await akte.spiegle();
  return ablage.share;
}

async function wegwerfordner(): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), "s1-akte-pruefe-"));
}

describe("s1 akte pruefe — die Abnahme von M2.4", () => {
  it("meldet eine heile Akte mit Exitcode 0 und nennt den zustandsHash", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 5);

      const ergebnis = await pruefe([ordner]);

      expect(ergebnis.code).toBe(0);
      expect(ergebnis.text).toContain("Übung Nord");
      expect(ergebnis.text).toContain("Befunde:           keine");
      expect(ergebnis.text).toMatch(/zustandsHash: {4}[0-9a-f]{64}/);
      // Fünf geschriebene Ereignisse, keines davon ein Verwaltungsereignis
      // (§2.4): Ohne Segmentwechsel und ohne Reparatur entsteht keines.
      expect(ergebnis.text).toContain("Ereignisse:      5");
      // Der Zustand ist ein Zustand und keine Sammlung von Ausnahmen: Die
      // fünf Meldungen stehen als Einheiten da, nicht als unbekannte Arten.
      expect(ergebnis.text).toContain("Einheiten:       5");
      expect(ergebnis.text).toContain("Unbekannte Arten: 0");
      expect(ergebnis.text).toContain("Ergebnis: in Ordnung.");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("nennt bei einem verfälschten Byte Datei, Offset und §8.2 und gibt Exitcode 1", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 5);
      const datei = path.join(ordner, "ereignisse", "9f3c1a20.0000.jsonl");
      const roh = new Uint8Array(await fsp.readFile(datei));
      // Ein gekipptes Byte **in der Mitte** — nicht am Ende. Am Ende wäre es
      // ein abgeschnittener Anhang nach §8.1 und ausdrücklich kein Fehler.
      const stelle = Math.floor(roh.byteLength / 2);
      roh[stelle] = (roh[stelle] as number) ^ 0x01;
      await fsp.writeFile(datei, roh);

      const ergebnis = await pruefe([ordner]);

      expect(ergebnis.code).toBe(1);
      expect(ergebnis.text).toContain("9f3c1a20.0000.jsonl @ ");
      expect(ergebnis.text).toContain("§8.2");
      expect(ergebnis.text).toContain("Quarantäne ab dieser Stelle");
      // Die Fundstelle ist eine Zeilengrenze vor der Verfälschung, nie hinter
      // ihr: Ab dort wird die Datei nicht mehr ausgewertet (§8.2 Punkt 7).
      const befund = await pruefeOrdner(knotenDateisystem(), ordner);
      const defekt = befund.befunde.find((b) => b.klasse === "endgueltig");
      expect(defekt?.offset).toBeLessThanOrEqual(stelle);
      expect(befund.ereignisse).toBeLessThan(5);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("unterscheidet die vorläufige Stelle aus §8.1 von einem Defekt und bleibt bei Exitcode 0", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 4);
      const datei = path.join(ordner, "ereignisse", "9f3c1a20.0000.jsonl");
      const roh = new Uint8Array(await fsp.readFile(datei));
      // Das Bild eines gezogenen Kabels mitten im Anhang: Die letzte Zeile
      // bricht ab. §8.1 nennt das ausdrücklich „kein Fehler".
      await fsp.writeFile(datei, roh.subarray(0, roh.byteLength - 12));

      const ergebnis = await pruefe([ordner]);

      expect(ergebnis.code).toBe(0);
      expect(ergebnis.text).toContain("§8.1");
      expect(ergebnis.text).toContain("kein Fehler");
      expect(ergebnis.text).toContain("Ergebnis: in Ordnung.");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("ergibt für zwei Rechner mit denselben Ereignissen denselben zustandsHash", async () => {
    // Das Konvergenzkriterium aus §7.6 und der eigentliche Zweck von M2.4:
    // „zwei Rechner führen denselben Einsatz". Verglichen werden zwei
    // getrennte Ordner mit demselben Ereignisbestand.
    const wurzel = await wegwerfordner();
    const zweitwurzel = await wegwerfordner();
    try {
      const links = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 6);
      const rechts = await baueAkte(zweitwurzel, "rechner-2", "9f3c1a20", 6);
      expect(links).not.toBe(rechts);

      const ergebnis = await pruefe([links, "--vergleiche", rechts]);

      expect(ergebnis.code).toBe(0);
      expect(ergebnis.text).toContain("Beide Ordner ergeben denselben zustandsHash");
      const einer = await pruefeOrdner(knotenDateisystem(), links);
      const anderer = await pruefeOrdner(knotenDateisystem(), rechts);
      expect(einer.zustandsHash).toBe(anderer.zustandsHash);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
      await fsp.rm(zweitwurzel, { recursive: true, force: true });
    }
  });

  it("meldet verschiedene zustandsHash-Werte als Fehler des Vergleichs", async () => {
    const wurzel = await wegwerfordner();
    const zweitwurzel = await wegwerfordner();
    try {
      const links = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 6);
      const rechts = await baueAkte(zweitwurzel, "rechner-2", "9f3c1a20", 3);

      const ergebnis = await pruefe([links, "--vergleiche", rechts]);

      expect(ergebnis.code).toBe(1);
      expect(ergebnis.text).toContain("verschiedener zustandsHash");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
      await fsp.rm(zweitwurzel, { recursive: true, force: true });
    }
  });

  it("prüft die Kette über den Segmentwechsel hinweg (§2.3, §4.3)", async () => {
    // Der Anker der ersten Zeile eines Folgesegments ist **nicht** der
    // Kettenanfang, sondern die Kettenprüfsumme der letzten Zeile des
    // Vorgängers (§2.3). Wer für jede Datei 32 Nullen annähme, hielte hier
    // jede Datei ab Segment 1 für kettenfalsch — und zwar still, weil die
    // Prüfung schon an Byte 0 abbräche.
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 8, 400);
      const befund = await pruefeOrdner(knotenDateisystem(), ordner);

      expect(befund.dateien.length).toBeGreaterThan(1);
      expect(befund.befunde).toEqual([]);
      // §2.4: Die Abschlusszeilen der Segmentwechsel sind Verwaltungs-
      // ereignisse und stehen nicht im gefalteten Zustand.
      expect(befund.verwaltungsereignisse).toBe(befund.dateien.length - 1);
      expect(befund.ereignisse).toBe(8);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("lässt eine Beschädigung nicht auf die folgenden Segmente durchschlagen", async () => {
    // §8.2 setzt die **eine** Datei ab der Fundstelle in Quarantäne, nicht den
    // Rest der Akte. Der Anker des Nachfolgesegments liegt hinter dieser
    // Stelle und ist damit nicht mehr erreichbar (§2.3) — das macht die Kette
    // über den Segmentwechsel unprüfbar, aber nicht falsch. Ein Bericht, der
    // hier „kettenfalsch" meldete, verlöre die Ereignisse aller folgenden
    // Segmente und beantwortete die Abnahmefrage von M2.4 („kein
    // Datenverlust") nachweislich falsch.
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 8, 400);
      const heil = await pruefeOrdner(knotenDateisystem(), ordner);
      const datei = path.join(ordner, "ereignisse", "9f3c1a20.0000.jsonl");
      const roh = new Uint8Array(await fsp.readFile(datei));
      const stelle = Math.floor(roh.byteLength / 2);
      roh[stelle] = (roh[stelle] as number) ^ 0x01;
      await fsp.writeFile(datei, roh);

      const befund = await pruefeOrdner(knotenDateisystem(), ordner);

      expect(befund.befunde.some((b) => b.datei === "9f3c1a20.0000.jsonl")).toBe(true);
      expect(befund.befunde.some((b) => b.grund.includes("Vorgängersegment steht in Quarantäne"))).toBe(
        true,
      );
      // Verloren gehen darf nur, was hinter der Fundstelle in **dieser** Datei
      // steht; die Ereignisse der übrigen Segmente bleiben gezählt.
      const letztesSegment = heil.dateien.at(-1);
      expect(befund.ereignisse).toBeGreaterThanOrEqual(
        heil.ereignisse - (heil.dateien[0]?.zeilen ?? 0),
      );
      expect(letztesSegment).toBeDefined();
      expect(befund.dateien.at(-1)?.zeilen).toBe(letztesSegment?.zeilen);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("meldet eine fehlende einsatz.json als Befund, nicht als Aufruffehler", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, "rechner-1", "9f3c1a20", 2);
      await fsp.rm(path.join(ordner, "einsatz.json"));

      const ergebnis = await pruefe([ordner]);

      expect(ergebnis.code).toBe(1);
      expect(ergebnis.text).toContain("einsatz.json");
      expect(ergebnis.text).toContain("§5.7");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("gibt für einen Pfad, der kein Einsatzordner ist, Exitcode 2", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ergebnis = await fuehreAus(["akte", "pruefe", path.join(wurzel, "gibtEsNicht")]);

      expect(ergebnis.code).toBe(2);
      expect(ergebnis.text).toContain("Kein Einsatzordner");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("weist einen fehlenden Ordner und unbekannte Optionen mit Exitcode 2 ab", async () => {
    expect((await fuehreAus(["akte", "pruefe"])).code).toBe(2);
    const falsch = await fuehreAus(["akte", "pruefe", ".", "--vergleicht", "."]);
    expect(falsch.code).toBe(2);
    expect(falsch.text).toContain("--vergleicht");
    expect((await fuehreAus(["akte", "falte", "."])).code).toBe(2);
  });

  it("nennt `akte pruefe` in der Hilfe", async () => {
    expect((await fuehreAus([])).text).toContain("s1 akte pruefe");
  });
});
