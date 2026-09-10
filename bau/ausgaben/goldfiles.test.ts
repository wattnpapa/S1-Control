/**
 * Goldfile-Prüfung der Kernausgaben (M4.1).
 *
 * **Was ein Goldfile beweist und was nicht.** Es beweist, dass sich eine
 * Ausgabe nicht unbemerkt ändert: Wer eine Zahl verschiebt, eine Spalte
 * umbenennt oder eine Zeile anders sortiert, sieht es hier und nicht erst auf
 * dem Papier. Es beweist **nicht**, dass die Ausgabe mit der Excel
 * übereinstimmt — dafür braucht es den Ausdruck der Referenzlage
 * (Entscheidung 8), und der liegt nicht vor. Prüfpunkt 3 bleibt offen; siehe
 * `docs/v2-arbeitsstand/auftraege/M4-einstieg.md`.
 *
 * Der Test liegt unter `bau/`, weil er Dateien liest und schreibt.
 * `@s1/ausgaben` selbst bleibt frei von `node:` — es liefert Zeichenketten.
 *
 * **Abnehmen einer Änderung:** `S1_GOLD=schreiben npx vitest run --project bau`
 * schreibt die Dateien neu. Wer das tut, legt den Unterschied im Commit vor;
 * ein Goldfile, das sich stillschweigend selbst erneuert, ist keines.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { describe, expect, it } from "vitest";

import {
  druckAlsHtml,
  harke,
  harkeAlsHtml,
  druckdaten,
  kostenAlsHtml,
  logAlsHtml,
  statusAlsHtml,
  statusdaten,
} from "../../packages/ausgaben/src/index.js";
import { falteHinzu, leereFaltung, materialisiere } from "../../packages/domaene/src/fold.js";
import { prueflageEreignisse } from "../../packages/domaene/src/pruefhilfen/pruefage.js";
import type { Zustand } from "../../packages/domaene/src/zustand.js";

const ORDNER = path.join(import.meta.dirname, "goldfiles");

/**
 * Der Kopf jeder Ausgabe steht fest.
 *
 * Er trägt sonst `new Date()`, und ein Goldfile mit der Uhrzeit seiner
 * Erzeugung wäre jeden Morgen rot. Die Standangabe ist im Betrieb die einzige
 * Stelle, an der eine Wanduhr in einen Ausdruck kommt (§2.6 sinngemäß: sie
 * ist Anzeige und nie Ordnung).
 */
const KOPF = {
  datum: "2026-09-08",
  einsatzName: "Übung Weser-Ems",
  stand: "Stand: 08.09.2026, 08:15",
};

function lage(): Zustand {
  return materialisiere(falteHinzu(leereFaltung(), prueflageEreignisse()));
}

/** Vergleicht gegen die abgelegte Fassung — oder schreibt sie, wenn abgenommen wird. */
function gegenGoldfile(name: string, inhalt: string): void {
  const datei = path.join(ORDNER, name);
  if (process.env["S1_GOLD"] === "schreiben") {
    mkdirSync(ORDNER, { recursive: true });
    writeFileSync(datei, inhalt, "utf8");
    return;
  }
  const erwartet = readFileSync(datei, "utf8");
  expect(inhalt, `${name} weicht ab. Abnehmen mit S1_GOLD=schreiben`).toBe(erwartet);
}

describe("Der Druck", () => {
  it("bleibt Zeile für Zeile, wie er abgenommen wurde", () => {
    gegenGoldfile("druck.html", druckAlsHtml(druckdaten(lage()), KOPF));
  });

  it("bleibt auch mit einem anderen Organisationsfilter, wie er abgenommen wurde", () => {
    // `Druck!S4` ist ein Auswahlfeld; die Vorbelegung ist THW. Der zweite
    // Goldfile hält fest, dass der Filter tatsächlich filtert und nicht bloß
    // eine Überschrift wechselt.
    gegenGoldfile(
      "druck-feuerwehr.html",
      druckAlsHtml(druckdaten(lage(), { organisation: "FEUERWEHR" }), KOPF),
    );
  });
});

describe("Die Status-Matrix", () => {
  it("bleibt Zeile für Zeile, wie sie abgenommen wurde", () => {
    gegenGoldfile("status.html", statusAlsHtml(statusdaten(lage()), KOPF));
  });
});

describe("Das Logistikblatt", () => {
  it("bleibt Zeile für Zeile, wie es abgenommen wurde", () => {
    gegenGoldfile("log.html", logAlsHtml(lage(), KOPF));
  });

  it("führt die leeren Bereiche mit, wenn man es verlangt", () => {
    // Die Vorlage blendet sie beim Blattwechsel aus (`t_log`); der zweite
    // Goldfile hält fest, dass der Schalter tatsächlich Zeilen hinzufügt und
    // nicht nur eine Überschrift ändert.
    gegenGoldfile("log-mit-leeren.html", logAlsHtml(lage(), KOPF, { mitLeeren: true }));
  });
});

describe("Die Kostenübersicht", () => {
  it("bleibt Zeile für Zeile, wie sie abgenommen wurde", () => {
    gegenGoldfile("kosten.html", kostenAlsHtml(lage(), KOPF));
  });
});

describe("Die Führungsharke (M8.3)", () => {
  it("bleibt Zeile für Zeile, wie sie abgenommen wurde", () => {
    gegenGoldfile("fueorg.html", harkeAlsHtml(lage(), KOPF));
  });

  it("zeichnet den Archivabschnitt nicht mit", () => {
    // Ein Organigramm mit dem Archiv darin zeigte eine Führungsstruktur, die
    // es nicht gibt. Aufgelöste Abschnitte bleiben dagegen stehen (§5.3.2).
    const blatt = harke(lage());
    const namen: string[] = [];
    const sammle = (knoten: readonly { name: string; kinder: readonly never[] }[]): void => {
      for (const k of knoten) {
        namen.push(k.name);
        sammle(k.kinder);
      }
    };
    sammle(blatt.knoten as never);
    expect(namen.some((name) => name.toUpperCase().includes("ARCHIV"))).toBe(false);
  });

  it("führt die Führungsstelle außerhalb des Baums", () => {
    // §5.7 und K17: Die FüSt entsteht aus den Dienstposten und erscheint
    // nicht als gemeldete Einheit. Im Baum stünde sie doppelt.
    const blatt = harke(lage());
    expect(blatt.fuest.length).toBeGreaterThan(0);
    expect(blatt.fuestGesamt.fuehrer + blatt.fuestGesamt.unterfuehrer + blatt.fuestGesamt.mannschaft)
      .toBeGreaterThan(0);
  });
});

describe("Die Zahlen hinter den Ausgaben", () => {
  /**
   * Die Summe der Druckzeilen **ist** die Gesamtzeile.
   *
   * Sie wäre es nicht, wenn eine Zeile den Teilbaum summierte: Die Stärke
   * eines Unterabschnitts stünde dann zweimal da. Unser Modell kennt
   * Unterabschnitte, die Excel nicht — deshalb ist das hier eine echte
   * Prüfung und nicht eine Tautologie.
   */
  it("Druck: die Gesamtzeile ist die Summe der Zeilen", () => {
    const daten = druckdaten(lage());
    const summe = daten.zeilen.reduce((s, z) => s + z.gesamt, 0);
    expect(summe).toBe(daten.gesamtSumme);
    expect(daten.gesamt.fuehrer).toBe(daten.zeilen.reduce((s, z) => s + z.staerke.fuehrer, 0));
  });

  it("Druck: die angeforderten Kräfte stehen in keiner Zeile", () => {
    // §4.1: „(ohne Kräfte aus dem Bereich ‚Angefordert / Anmarsch‘)“. Sie
    // stehen darunter, damit die Führungsstelle sie kennt — aber nicht in der
    // Summe.
    const daten = druckdaten(lage());
    expect(daten.zeilen.some((zeile) => zeile.abschnittId === "ANF")).toBe(false);
    expect(daten.angefordertSumme).toBeGreaterThan(0);
  });

  it("Druck: der leere Abschnitt wird ausgeblendet", () => {
    const daten = druckdaten(lage());
    expect(daten.zeilen.some((zeile) => zeile.abschnittId === "EO4")).toBe(false);
  });

  it("Druck: „Davon Stärke“ filtert wirklich", () => {
    const thw = druckdaten(lage(), { organisation: "THW" });
    const fw = druckdaten(lage(), { organisation: "FEUERWEHR" });
    expect(thw.davonGesamtSumme).toBeGreaterThan(0);
    expect(fw.davonGesamtSumme).toBeGreaterThan(0);
    expect(thw.davonGesamtSumme).not.toBe(fw.davonGesamtSumme);
    // Kein Filter kann mehr zeigen als das Ganze.
    expect(thw.davonGesamtSumme).toBeLessThan(thw.gesamtSumme);
  });

  /**
   * Der Unterschied zwischen Druck und Status in einer Zeile.
   *
   * §4.2 der Bestandsaufnahme: „Gesamtsumme J20 zählt inkl. Angefordert (im
   * Gegensatz zu Druck)." Der Druck zeigt die Lagekarte, der Status die
   * Kräftebilanz.
   */
  it("Status zählt die angeforderten Kräfte mit, der Druck nicht", () => {
    const zustand = lage();
    const druck = druckdaten(zustand);
    const status = statusdaten(zustand);
    expect(status.organisationenSumme.gesamt).toBe(druck.gesamtSumme + druck.angefordertSumme);
  });

  it("Status: beide Kontrollsummen gehen auf", () => {
    const daten = statusdaten(lage());
    expect(daten.probeStatus).toBe(0);
    expect(daten.probeSchicht).toBe(0);
    expect(daten.ohnePflichtangabe).toEqual([]);
  });

  it("Status: die Statusmatrix summiert sich auf die Organisationsmatrix", () => {
    // K21 in Zahlen: Beide Matrizen laufen über dieselbe Menge `E`.
    const daten = statusdaten(lage());
    expect(daten.statusSumme).toBe(daten.organisationenSumme.gesamt);
  });

  it("Status: die Schichtmatrix lässt genau die angeforderten Kräfte aus", () => {
    // K23: Angeforderte Kräfte dürfen ohne Schicht sein. Die Differenz ist
    // deshalb nicht null, sondern genau ihr Anteil.
    const zustand = lage();
    const daten = statusdaten(zustand);
    const druck = druckdaten(zustand);
    expect(daten.organisationenSumme.gesamt - daten.schichtenSumme).toBe(druck.angefordertSumme);
  });
});
