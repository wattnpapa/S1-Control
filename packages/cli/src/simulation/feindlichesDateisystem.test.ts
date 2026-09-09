import { describe, expect, it } from "vitest";

import { DateisystemFehler, knotenDateisystem, type Dateisystem } from "@s1/speicher";

import { FeindlichesDateisystem, OHNE_STOERUNG, type Stoerprofil } from "./feindlichesDateisystem.js";
import { Simulationsuhr } from "./uhr.js";
import { Zufall } from "./zufall.js";

import * as fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const kodierer = new TextEncoder();

interface Aufbau extends AsyncDisposable {
  readonly wurzel: string;
  readonly share: string;
  readonly lokal: string;
  readonly uhr: Simulationsuhr;
  readonly echt: Dateisystem;
  baue(profil: Partial<Stoerprofil>, eigen?: (pfad: string) => boolean): FeindlichesDateisystem;
}

async function aufbau(): Promise<Aufbau> {
  const wurzel = await fsp.mkdtemp(path.join(os.tmpdir(), "s1-feindlich-"));
  const echt = knotenDateisystem();
  const uhr = new Simulationsuhr();
  const share = path.join(wurzel, "share");
  const lokal = path.join(wurzel, "lokal");
  await echt.legeVerzeichnisAn(share);
  await echt.legeVerzeichnisAn(lokal);
  return {
    wurzel,
    share,
    lokal,
    uhr,
    echt,
    baue: (profil, eigen = () => false) =>
      new FeindlichesDateisystem({
        echt,
        profil: { ...OHNE_STOERUNG, ...profil },
        zufall: new Zufall(1),
        jetzt: () => uhr.jetzt(),
        vorstellen: (ms) => uhr.weiter(ms),
        istShare: (pfad) => pfad.startsWith(share),
        istEigen: eigen,
      }),
    async [Symbol.asyncDispose]() {
      await fsp.rm(wurzel, { recursive: true, force: true });
    },
  };
}

describe("Feindliche Dateisystem-Schicht — Auflage 15", () => {
  it("hält neue Bytes einer fremden Datei zurück und gibt sie später frei", async () => {
    await using a = await aufbau();
    const pfad = path.join(a.share, "fremd.jsonl");
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("erste"));
    const fs = a.baue({ sichtbarkeitsverzoegerungMs: 2_000 });

    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("erste");
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("zweite"));
    // Innerhalb der Verzögerung bleibt das gewachsene Ende unsichtbar.
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("erste");
    a.uhr.weiter(2_500);
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("erstezweite");
  });

  it("zeigt dem Schreiber seine eigene Datei ohne Verzögerung (§6.6, Annahme A5)", async () => {
    // §5.4.2 bestimmt das Share-Ende durch Lesen. Zeigte die Schicht dem
    // Schreiber ein zu frühes Ende, hängte er dieselben Bytes ein zweites Mal
    // an — das wäre ein Angriff auf A5, nicht auf das Verfahren.
    await using a = await aufbau();
    const pfad = path.join(a.share, "eigen.jsonl");
    const fs = a.baue({ sichtbarkeitsverzoegerungMs: 2_000 }, (p) => p.includes("eigen"));
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("erste"));
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("erste");
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("zweite"));
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("erstezweite");
  });

  it("hält eine einmal fehlende Datei über die Cache-Dauer für fehlend (§6.6)", async () => {
    await using a = await aufbau();
    const pfad = path.join(a.share, "spaet.jsonl");
    const fs = a.baue({ fileNotFoundCacheMs: 5_000 });
    await expect(fs.liesAb(pfad, 0)).rejects.toThrow(DateisystemFehler);
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("da"));
    await expect(fs.liesAb(pfad, 0)).rejects.toMatchObject({ code: "ENOENT" });
    a.uhr.weiter(5_500);
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("da");
  });

  it("verschweigt eine neue Datei, solange die Verzeichnisauflistung zwischengespeichert ist (§6.6)", async () => {
    await using a = await aufbau();
    const fs = a.baue({ verzeichnisCacheMs: 10_000 });
    expect(await fs.listeVerzeichnis(a.share)).toEqual([]);
    await a.echt.haengeAnUndSynchronisiere(path.join(a.share, "neu.jsonl"), kodierer.encode("x"));
    expect(await fs.listeVerzeichnis(a.share)).toEqual([]);
    a.uhr.weiter(10_500);
    expect(await fs.listeVerzeichnis(a.share)).toEqual(["neu.jsonl"]);
  });

  it("cacht die Auflistung des lokalen Spiegels nicht — er liegt auf der eigenen Platte", async () => {
    await using a = await aufbau();
    const fs = a.baue({ verzeichnisCacheMs: 10_000 });
    expect(await fs.listeVerzeichnis(a.lokal)).toEqual([]);
    await a.echt.haengeAnUndSynchronisiere(path.join(a.lokal, "neu.jsonl"), kodierer.encode("x"));
    expect(await fs.listeVerzeichnis(a.lokal)).toEqual(["neu.jsonl"]);
  });

  it("schreibt beim abgeschnittenen Anhang ein Präfix und meldet danach den Fehler (§5.4.1)", async () => {
    await using a = await aufbau();
    const pfad = path.join(a.share, "teil.jsonl");
    const fs = a.baue({ abgeschnittenShare: 1 });
    await expect(fs.haengeAnUndSynchronisiere(pfad, kodierer.encode("abcdefgh"))).rejects.toThrow(
      DateisystemFehler,
    );
    const gelandet = new TextDecoder().decode(await a.echt.liesAb(pfad, 0));
    expect(gelandet.length).toBeGreaterThan(0);
    expect(gelandet.length).toBeLessThan(8);
    expect("abcdefgh".startsWith(gelandet)).toBe(true);
  });

  it("lässt während einer Partition jeden Share-Zugriff scheitern, den lokalen nicht (§8.3)", async () => {
    await using a = await aufbau();
    const fs = a.baue({});
    fs.partitioniere(20_000);
    await expect(fs.liesAb(path.join(a.share, "x"), 0)).rejects.toMatchObject({ code: "ETIMEDOUT" });
    await expect(
      fs.haengeAnUndSynchronisiere(path.join(a.lokal, "x"), kodierer.encode("y")),
    ).resolves.toBeUndefined();
    a.uhr.weiter(20_001);
    await expect(fs.liesAb(path.join(a.share, "x"), 0)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("weist bei entzogenem Schreibrecht nur Schreibzugriffe ab, Lesen bleibt möglich (§8.9)", async () => {
    await using a = await aufbau();
    const pfad = path.join(a.share, "recht.jsonl");
    await a.echt.haengeAnUndSynchronisiere(pfad, kodierer.encode("da"));
    const fs = a.baue({});
    fs.entzieheSchreibrecht();
    await expect(fs.haengeAnUndSynchronisiere(pfad, kodierer.encode("x"))).rejects.toMatchObject({
      code: "EACCES",
    });
    // §8.9: „Der Server ist erreichbar, nimmt aber keine Einträge an."
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("da");
    fs.gibSchreibrechtZurueck();
    await expect(fs.haengeAnUndSynchronisiere(pfad, kodierer.encode("x"))).resolves.toBeUndefined();
  });

  it("verbraucht bei einer Blockade Zeit auf der virtuellen Uhr (§8.4)", async () => {
    await using a = await aufbau();
    const fs = a.baue({ blockade: 1, blockadeMs: 25_000 });
    const vorher = a.uhr.jetzt();
    await fs.listeVerzeichnis(a.share);
    // §8.4: Der Aufruf kehrt zurück — nur eben nach dem SessTimeout-Bereich.
    expect(a.uhr.jetzt() - vorher).toBe(25_000);
  });

  it("reicht ohne Störprofil alles unverändert durch", async () => {
    await using a = await aufbau();
    const fs = a.baue({});
    const pfad = path.join(a.share, "sauber.jsonl");
    await fs.haengeAnUndSynchronisiere(pfad, kodierer.encode("abc"));
    expect(new TextDecoder().decode(await fs.liesAb(pfad, 0))).toBe("abc");
    expect(await fs.listeVerzeichnis(a.share)).toEqual(["sauber.jsonl"]);
    expect(Object.keys(fs.zaehler)).toEqual([]);
  });
});
