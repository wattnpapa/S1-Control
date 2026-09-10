/**
 * Die exportierte Einsatzakte gegen einen **fremden** Auspacker (M4.4).
 *
 * `s1 akte importiere` beweist, dass unser Leser unseren Schreiber versteht.
 * Das ist die Abnahmebedingung, aber es ist nicht die ganze Frage: Ein Archiv,
 * das Jahre später aufgemacht wird, wird mit dem Explorer aufgemacht, mit
 * `unzip`, mit dem Archivprogramm, das gerade installiert ist. Deshalb packt
 * dieser Test dieselbe Datei ein zweites Mal mit `unzip` aus und lässt
 * anschließend `s1 akte pruefe` über das Ergebnis laufen — der Rundlauf also,
 * bei dem der Rückweg von einem Programm gegangen wird, das nichts von diesem
 * Baum weiß.
 *
 * Der Test liegt unter `bau/` und läuft nur dort, wo `unzip` vorhanden ist
 * (Projekt `fremdleser` in `vitest.config.ts`, Linux). Übersprungen wird er
 * nicht: Fehlt das Werkzeug auf einem Läufer, auf dem er laufen soll, ist das
 * ein Befund und kein Grund zum Weitergehen.
 */

import { execFileSync } from "node:child_process";
import * as fsp from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { HlcUhr } from "@s1/domaene";
import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  knotenDateisystem,
  legeEinsatzAn,
  oeffneAkte,
} from "@s1/speicher";
import { fuehreAus } from "@s1/cli";

const wegwerf: string[] = [];

afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

function wegwerfordner(): string {
  const ordner = mkdtempSync(path.join(os.tmpdir(), "s1-akte-fremd-"));
  wegwerf.push(ordner);
  return ordner;
}

const EINSATZ_ID = "2026-09-08_uebung-weser_ab12cd";
const FESTE_ZEIT = Date.parse("2026-09-08T08:00:00.000Z");
const uhrzeit = () => FESTE_ZEIT;

/** Eine echte Akte mit Ereignissen und einer Ausgabe aus M4.1. */
async function baueAkte(wurzel: string): Promise<string> {
  const ablage = new Einsatzablage(
    path.join(wurzel, "share", "einsatz"),
    path.join(wurzel, "lokal", "einsatz"),
  );
  const dateisystem = knotenDateisystem();
  await fsp.mkdir(ablage.share, { recursive: true });
  await fsp.mkdir(ablage.lokal, { recursive: true });
  await legeEinsatzAn(
    dateisystem,
    ablage,
    {
      einsatzId: EINSATZ_ID,
      name: "Übung Weser",
      datum: "2026-09-08",
      angelegtAm: "2026-09-08T08:00:00.000Z",
      angelegtVon: "9f3c1a20",
    },
    EINSATZ_UNTERORDNER,
  );
  const clientId = "aabbccdd-0000-0000-0000-000000000001";
  const { akte } = await oeffneAkte({
    dateisystem,
    zeit: uhrzeit,
    ablage,
    clientId,
    einsatzId: EINSATZ_ID,
    akteur: { benutzer: "Bediener FüSt", host: "fuest-1", clientId },
    uhr: new HlcUhr({ clientId, wanduhr: uhrzeit }),
    neueKennung: () => "aabbccdd",
  });
  for (let i = 0; i < 12; i += 1) {
    await akte.schreibe({
      typ: "EinheitGemeldet",
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
  }
  await akte.spiegle();
  // Ein Umlaut im Dateinamen einer Ausgabe: Er prüft das UTF-8-Merkmalsbit
  // gegen einen Leser, der es auswerten muss (APPNOTE 4.4.4).
  await fsp.writeFile(path.join(ablage.share, "ausgaben", "stärkemeldung-0800.html"), "<p>8</p>\n");
  return ablage.share;
}

describe("s1 akte exportiere — der Rundlauf über unzip", () => {
  it("liefert ein Archiv, das unzip fehlerfrei prüft und auspackt", async () => {
    const wurzel = wegwerfordner();
    const ordner = await baueAkte(wurzel);
    const archiv = path.join(wurzel, "akte.zip");

    const hin = await fuehreAus(["akte", "exportiere", ordner, "--ziel", archiv]);
    expect(hin.code, hin.text).toBe(0);

    // `unzip -t` liest das Zentralverzeichnis, springt jeden Eintrag an und
    // prüft dessen CRC-32. Es ist die Probe, die feststellt, ob unser
    // Schreiber das Format hält oder nur zu sich selbst passt.
    const probe = execFileSync("unzip", ["-t", archiv], { encoding: "utf8" });
    expect(probe).toContain("No errors detected");
    expect(probe).toContain("manifest.json");
    expect(probe).toContain("stärkemeldung-0800.html");

    const ziel = path.join(wurzel, "ausgepackt");
    execFileSync("unzip", ["-q", archiv, "-d", ziel]);
    // Das Manifest gehört zum Archiv und nicht in die Akte; ein von Hand
    // ausgepackter Ordner trägt es mit, und der Prüflauf darf sich daran
    // nicht stören.
    await fsp.rm(path.join(ziel, "manifest.json"));

    // Die eigentliche Aussage: Der von einem fremden Programm ausgepackte
    // Ordner besteht dieselbe Prüfung wie das Original und trägt denselben
    // zustandsHash (§7.6).
    const geprueft = await fuehreAus(["akte", "pruefe", ziel, "--vergleiche", ordner]);
    expect(geprueft.code, geprueft.text).toBe(0);
    expect(geprueft.text).toContain("Ergebnis: in Ordnung.");
  });
});
