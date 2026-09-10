/**
 * Tests zu `s1 akte exportiere` und `s1 akte importiere` — der Abnahme von
 * M4.4 (05-UMSETZUNGSPLAN.md: „Reimport per `s1 akte pruefe` konsistent;
 * Manifest mit Hashes über jede Datei").
 *
 * Geprüft wird am **Rundlauf** und nicht an der Archivdatei allein: Eine Akte
 * wird über `oeffneAkte` geschrieben und gespiegelt, exportiert, in einen
 * leeren Ordner zurückgeholt und dort erneut geprüft. Erst der Vergleich der
 * beiden `zustandsHash` (§7.6) beantwortet die Frage, um die es geht — ob nach
 * dem Umweg über das Archiv derselbe Einsatz dasteht.
 */

import { describe, expect, it } from "vitest";

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { HlcUhr } from "@s1/domaene";
import { liesZip } from "@s1/ausgaben";
import {
  EINSATZ_UNTERORDNER,
  Einsatzablage,
  knotenDateisystem,
  legeEinsatzAn,
  oeffneAkte,
  sha256HexBytes,
  type Einsatzanker,
} from "@s1/speicher";

import { fuehreAus } from "../index.js";
import {
  EXPORT_FASSUNG,
  MANIFEST_DATEI,
  archivName,
  packeAkte,
  type Manifest,
} from "./exportiere.js";

const EINSATZ_ID = "2026-09-08_uebung-nord_ab12cd";

/** Feststehende Uhr — sonst prüfte der Hashvergleich die Systemzeit (§2.4). */
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

/** Legt eine Akte an, schreibt `anzahl` Ereignisse, spiegelt und liefert den Share-Ordner. */
async function baueAkte(wurzel: string, anzahl: number): Promise<string> {
  const ablage = new Einsatzablage(
    path.join(wurzel, "share", "einsatz"),
    path.join(wurzel, "rechner-1", "einsatz"),
  );
  const dateisystem = knotenDateisystem();
  await fsp.mkdir(ablage.share, { recursive: true });
  await fsp.mkdir(ablage.lokal, { recursive: true });
  await legeEinsatzAn(dateisystem, ablage, anker(), EINSATZ_UNTERORDNER);
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
  for (let i = 0; i < anzahl; i += 1) {
    const ergebnis = await akte.schreibe({
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
    if (ergebnis.art !== "geschrieben") throw new Error(JSON.stringify(ergebnis));
  }
  await akte.spiegle();
  return ablage.share;
}

async function wegwerfordner(): Promise<string> {
  return fsp.mkdtemp(path.join(os.tmpdir(), "s1-akte-export-"));
}

describe("s1 akte exportiere — das Archiv", () => {
  it("packt Anker, Ereignisse und Ausgaben und nennt jede Datei mit ihrer SHA-256", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, 5);
      // Eine Ausgabe aus M4.1 bis M4.3 liegt im Einsatz — das Archiv muss sie
      // mitnehmen, sonst fehlte im Nachhinein genau der Druck, der im Einsatz
      // an der Wand hing.
      await fsp.writeFile(path.join(ordner, "ausgaben", "druck-0800.html"), "<p>Druck</p>\n");

      const { bytes, manifest } = await packeAkte(
        knotenDateisystem(),
        ordner,
        new Date(FESTE_ZEIT),
      );

      const pfade = manifest.dateien.map((d) => d.pfad);
      expect(pfade).toContain("einsatz.json");
      expect(pfade).toContain("ausgaben/druck-0800.html");
      expect(pfade.some((p) => p.startsWith("ereignisse/"))).toBe(true);
      // §6.4: Präsenz ist die Aussage „ich bin gerade da" und in einem Archiv
      // notwendig falsch.
      expect(pfade.some((p) => p.startsWith("praesenz/"))).toBe(false);

      expect(manifest.fassung).toBe(EXPORT_FASSUNG);
      expect(manifest.einsatzId).toBe(EINSATZ_ID);
      expect(manifest.ereignisse).toBe(5);
      expect(manifest.befunde).toBe(0);

      // Die Prüfsumme im Manifest gehört zum Inhalt im Archiv, nicht zu einer
      // Datei auf der Platte — sonst prüfte das Manifest das Falsche.
      const eintraege = liesZip(bytes);
      for (const soll of manifest.dateien) {
        const ist = eintraege.find((e) => e.pfad === soll.pfad);
        expect(ist, soll.pfad).toBeDefined();
        expect(sha256HexBytes((ist as { bytes: Uint8Array }).bytes)).toBe(soll.sha256);
      }
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("liefert bei gleichem Bestand und gleichem Zeitpunkt bitgleich dieselbe Datei", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, 3);
      const eins = await packeAkte(knotenDateisystem(), ordner, new Date(FESTE_ZEIT));
      const zwei = await packeAkte(knotenDateisystem(), ordner, new Date(FESTE_ZEIT));
      // Ohne Bitgleichheit ließe sich nicht feststellen, ob zwei Archive
      // denselben Stand tragen — und der Vergleich zweier Ablagen wäre auf
      // das Auspacken angewiesen.
      expect(Array.from(zwei.bytes)).toEqual(Array.from(eins.bytes));
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("schlägt den Einsatznamen als Dateinamen vor", () => {
    expect(archivName({ einsatzId: EINSATZ_ID } as Manifest)).toBe(`${EINSATZ_ID}.zip`);
    expect(archivName({} as Manifest)).toBe("einsatz.zip");
  });
});

describe("s1 akte importiere — der Rundlauf", () => {
  it("packt aus und liefert denselben zustandsHash wie der Export", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, 7);
      const archiv = path.join(wurzel, "archiv", `${EINSATZ_ID}.zip`);
      const hin = await fuehreAus(["akte", "exportiere", ordner, "--ziel", archiv]);
      expect(hin.code, hin.text).toBe(0);
      expect(hin.text).toContain("Ergebnis: in Ordnung.");

      const ziel = path.join(wurzel, "zurueck");
      const zurueck = await fuehreAus(["akte", "importiere", archiv, "--ziel", ziel]);
      expect(zurueck.code, zurueck.text).toBe(0);
      expect(zurueck.text).toContain("zustandsHash stimmt mit dem Export überein");

      // Die Gegenprobe ohne Umweg über den Import: derselbe Prüflauf, den die
      // Abnahme von M2.4 fährt, auf dem ausgepackten Ordner.
      const geprueft = await fuehreAus(["akte", "pruefe", ziel, "--vergleiche", ordner]);
      expect(geprueft.code, geprueft.text).toBe(0);
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("packt nichts aus, wenn eine Datei im Archiv nicht zu ihrer SHA-256 passt", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, 3);
      const { bytes, manifest } = await packeAkte(
        knotenDateisystem(),
        ordner,
        new Date(FESTE_ZEIT),
      );
      // Ein Byte im Manifest umbiegen statt in den Daten: Ein verfälschtes
      // Datenbyte fiele schon der CRC-32 des Formats auf. Geprüft werden soll
      // hier die zweite, unabhängige Wache — das Manifest.
      const verbogen = {
        ...manifest,
        dateien: manifest.dateien.map((d, i) => (i === 0 ? { ...d, sha256: "00".repeat(32) } : d)),
      };
      const archiv = path.join(wurzel, "verbogen.zip");
      const roh = liesZip(bytes).filter((e) => e.pfad !== MANIFEST_DATEI);
      const { schreibeZip, textEintrag } = await import("@s1/ausgaben");
      await fsp.mkdir(path.dirname(archiv), { recursive: true });
      await fsp.writeFile(
        archiv,
        schreibeZip([...roh, textEintrag(MANIFEST_DATEI, JSON.stringify(verbogen))], {
          zeitpunkt: new Date(FESTE_ZEIT),
        }),
      );

      const ziel = path.join(wurzel, "zurueck");
      const ergebnis = await fuehreAus(["akte", "importiere", archiv, "--ziel", ziel]);
      expect(ergebnis.code).toBe(1);
      expect(ergebnis.text).toContain("SHA-256 stimmt nicht");
      expect(ergebnis.text).toContain("nichts ausgepackt");
      await expect(fsp.readdir(ziel)).rejects.toThrow();
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("verweigert einen Import in einen nicht leeren Ordner", async () => {
    const wurzel = await wegwerfordner();
    try {
      const ordner = await baueAkte(wurzel, 2);
      const archiv = path.join(wurzel, "a.zip");
      await fuehreAus(["akte", "exportiere", ordner, "--ziel", archiv]);
      const ergebnis = await fuehreAus(["akte", "importiere", archiv, "--ziel", ordner]);
      // Exitcode 2 ist der Aufruffehler: Der Bediener hat auf den falschen
      // Ordner gezeigt, das Archiv ist in Ordnung.
      expect(ergebnis.code).toBe(2);
      expect(ergebnis.text).toContain("nicht leer");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });

  it("meldet ein Archiv aus einer anderen Fassung, statt es zu deuten", async () => {
    const wurzel = await wegwerfordner();
    try {
      const { schreibeZip, textEintrag } = await import("@s1/ausgaben");
      const archiv = path.join(wurzel, "fremd.zip");
      await fsp.writeFile(
        archiv,
        schreibeZip([textEintrag(MANIFEST_DATEI, JSON.stringify({ fassung: 99, dateien: [] }))]),
      );
      const ergebnis = await fuehreAus(["akte", "importiere", archiv, "--ziel", path.join(wurzel, "z")]);
      expect(ergebnis.code).toBe(2);
      expect(ergebnis.text).toContain("Archivfassung 99");
    } finally {
      await fsp.rm(wurzel, { recursive: true, force: true });
    }
  });
});

describe("Hilfe und Aufruffehler", () => {
  it("nennt beide Kommandos in der Hilfe", async () => {
    const { text } = await fuehreAus(["hilfe"]);
    expect(text).toContain("s1 akte exportiere");
    expect(text).toContain("s1 akte importiere");
  });

  it("meldet ein fehlendes --ziel beim Import als Aufruffehler", async () => {
    const ergebnis = await fuehreAus(["akte", "importiere", "irgendwo.zip"]);
    expect(ergebnis.code).toBe(2);
    expect(ergebnis.text).toContain("--ziel");
  });
});
