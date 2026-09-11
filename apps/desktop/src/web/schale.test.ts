/**
 * Die Web-Schale eines Arbeitsplatzes ueber den echten Aktendienst.
 *
 * Derselbe Weg wie in `../main/vermittlung.test.ts`, nur mit dem, was die
 * Web-Schale anders macht: fester Share, Profil unter der Datenwurzel,
 * Anzeigename als Akteur. Zwei Arbeitsplaetze auf demselben Share sind hier
 * zwei Browser — und sie muessen einander als Peers sehen, sonst waere die
 * Web-Schale kein Arbeitsplatz, sondern ein Loch im Modell.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { einsatzKennung } from "@s1/domaene";

import { arbeitsplatzOrdner, webSchalenfabrik } from "./schale.js";
import type { Arbeitsplatzschale } from "./arbeitsplaetze.js";
import { baueDirektenArbeiter } from "../main/pruefhilfen/direkterArbeiter.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import type { Einstellungen, Lagebild, Mitteilung, Ruf, Umgebung } from "../kontrakt/index.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

const SCHLUESSEL_A = "A".repeat(32);
const SCHLUESSEL_B = "B".repeat(32);

interface Werkstatt {
  readonly wurzel: string;
  readonly sharePfad: string;
  readonly datenwurzel: string;
  /**
   * Die Aktendienste **je Arbeitsplatz**: Jeder Arbeitsplatz hat seinen
   * eigenen Arbeiterhof und vergibt seine Akten-Kennungen selbst — zwei
   * Browser haben also beide eine `akte-1`, und eine gemeinsame Map hielte
   * nur einen von beiden.
   */
  readonly dienste: Map<string, Map<string, Aktendienst>>;
  readonly mitteilungen: Map<string, Mitteilung[]>;
  oeffne(schluessel: string): Arbeitsplatzschale;
  dienst(schluessel: string, akteId: string): Aktendienst | undefined;
  takte(runden?: number): Promise<void>;
}

function baueWerkstatt(): Werkstatt {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-web-schale-"));
  wegwerf.push(wurzel);
  const dienste = new Map<string, Map<string, Aktendienst>>();
  const mitteilungen = new Map<string, Mitteilung[]>();
  const sharePfad = path.join(wurzel, "share");
  const datenwurzel = path.join(wurzel, "daten");
  const dienstemap = (schluessel: string): Map<string, Aktendienst> => {
    const vorhanden = dienste.get(schluessel);
    if (vorhanden !== undefined) return vorhanden;
    const neu = new Map<string, Aktendienst>();
    dienste.set(schluessel, neu);
    return neu;
  };
  const fabrik = (schluessel: string, sende: (m: Mitteilung) => void): Arbeitsplatzschale =>
    webSchalenfabrik({
      sharePfad,
      datenwurzel,
      arbeiterFabrik: (start) => baueDirektenArbeiter(start, dienstemap(schluessel)),
      programmversion: "0.0.0-web",
      rechnername: "container",
      protokolliere: () => undefined,
    })(schluessel, sende);
  return {
    wurzel,
    sharePfad,
    datenwurzel,
    dienste,
    mitteilungen,
    oeffne(schluessel) {
      const liste: Mitteilung[] = [];
      mitteilungen.set(schluessel, liste);
      return fabrik(schluessel, (m) => liste.push(m));
    },
    dienst(schluessel, akteId) {
      return dienste.get(schluessel)?.get(akteId);
    },
    async takte(runden = 4) {
      for (let i = 0; i < runden; i += 1) {
        for (const platz of dienste.values()) {
          for (const dienst of platz.values()) await dienst.takt();
        }
      }
    },
  };
}

async function ruf<T>(schale: Arbeitsplatzschale, anfrage: Ruf): Promise<T> {
  const antwort = await schale.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

const ANLEGEN = {
  art: "einsatzAnlegen",
  name: "Sturmflut Jadebusen",
  datum: "2026-09-11",
  einsatzArt: "EINSATZ",
  fuestName: "FueSt Wilhelmshaven",
  beginn: "2026-09-11T06:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
} as const satisfies Ruf;

describe("Web-Schale eines Arbeitsplatzes", () => {
  it("beginnt mit dem Share des Dienstes, ohne dass jemand ihn eintragen müsste", async () => {
    const werkstatt = baueWerkstatt();
    const schale = werkstatt.oeffne(SCHLUESSEL_A);
    const einstellungen = await ruf<Einstellungen>(schale, { art: "einstellungenLesen" });
    expect(einstellungen.sharePfad).toBe(werkstatt.sharePfad);
    const umgebung = await ruf<Umgebung>(schale, { art: "umgebung" });
    expect(umgebung.plattform).toBe("web");
    expect(umgebung.electron).toBe("keine");
    expect(umgebung.clientId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("lässt den Share nicht vom Browser umstellen, wohl aber den Anzeigenamen", async () => {
    const werkstatt = baueWerkstatt();
    const schale = werkstatt.oeffne(SCHLUESSEL_A);
    const gesetzt = await ruf<Einstellungen>(schale, {
      art: "einstellungenSetzen",
      einstellungen: { sharePfad: "/etc", anzeigename: "S1 Lage" },
    });
    expect(gesetzt).toEqual({ sharePfad: werkstatt.sharePfad, anzeigename: "S1 Lage" });
    expect(await ruf(schale, { art: "einstellungenLesen" })).toEqual(gesetzt);
  });

  it("legt das Profil unter der Datenwurzel ab — je Schlüssel eines, ohne den Schlüssel im Namen", async () => {
    const werkstatt = baueWerkstatt();
    await ruf(werkstatt.oeffne(SCHLUESSEL_A), { art: "umgebung" });
    await ruf(werkstatt.oeffne(SCHLUESSEL_B), { art: "umgebung" });
    const ordner = readdirSync(path.join(werkstatt.datenwurzel, "arbeitsplaetze")).sort();
    expect(ordner).toEqual([arbeitsplatzOrdner(SCHLUESSEL_A), arbeitsplatzOrdner(SCHLUESSEL_B)].sort());
    expect(ordner.join()).not.toContain(SCHLUESSEL_A);
  });

  it("behält die Client-Kennung eines Schlüssels über einen Neustart des Dienstes", async () => {
    const werkstatt = baueWerkstatt();
    const erste = await ruf<Umgebung>(werkstatt.oeffne(SCHLUESSEL_A), { art: "umgebung" });
    // Ein zweiter Aufruf der Fabrik ist ein Neustart: neue Vermittlung, altes Profil.
    const zweite = await ruf<Umgebung>(werkstatt.oeffne(SCHLUESSEL_A), { art: "umgebung" });
    expect(zweite.clientId).toBe(erste.clientId);
    const fremd = await ruf<Umgebung>(werkstatt.oeffne(SCHLUESSEL_B), { art: "umgebung" });
    expect(fremd.clientId).not.toBe(erste.clientId);
  });

  it("stellt einen gemerkten, aber veralteten Share-Pfad auf den des Dienstes um", async () => {
    const werkstatt = baueWerkstatt();
    const alt = webSchalenfabrik({
      sharePfad: path.join(werkstatt.wurzel, "alter-share"),
      datenwurzel: werkstatt.datenwurzel,
      arbeiterFabrik: (start) => baueDirektenArbeiter(start, new Map()),
      programmversion: "0.0.0-web",
      rechnername: "container",
      protokolliere: () => undefined,
    })(SCHLUESSEL_A, () => undefined);
    await ruf(alt, { art: "einstellungenSetzen", einstellungen: { sharePfad: "", anzeigename: "Lage" } });

    const neu = werkstatt.oeffne(SCHLUESSEL_A);
    expect(await ruf(neu, { art: "einstellungenLesen" })).toEqual({
      sharePfad: werkstatt.sharePfad,
      anzeigename: "Lage",
    });
  });

  it("schreibt den Anzeigenamen als Akteur in Anker und Ereignisse", async () => {
    const werkstatt = baueWerkstatt();
    const schale = werkstatt.oeffne(SCHLUESSEL_A);
    await ruf(schale, {
      art: "einstellungenSetzen",
      einstellungen: { sharePfad: "", anzeigename: "Lagekartenführer" },
    });
    const angelegt = await ruf<{ ordner: string }>(schale, ANLEGEN);
    const einsatzOrdner = path.join(werkstatt.sharePfad, "einsaetze", angelegt.ordner);
    const anker = JSON.parse(readFileSync(path.join(einsatzOrdner, "einsatz.json"), "utf8")) as {
      angelegtVon: string;
    };
    expect(anker.angelegtVon).toBe("Lagekartenführer");

    // Das erste Ereignis liegt im Spiegel des Arbeitsplatzes, Zeilenformat
    // `länge \t crc32 \t json` (§2.1); geprüft wird nur der Akteur.
    const spiegel = path.join(
      werkstatt.datenwurzel, "arbeitsplaetze", arbeitsplatzOrdner(SCHLUESSEL_A),
      "spiegel", angelegt.ordner, "ereignisse",
    );
    const zeilen = readdirSync(spiegel)
      .filter((n) => n.endsWith(".jsonl"))
      .flatMap((n) => readFileSync(path.join(spiegel, n), "utf8").split("\n"))
      .filter((z) => z.includes("EinsatzAngelegt"))
      .map((z) => JSON.parse(z.split("\t")[2] ?? "{}") as { akteur?: { benutzer?: string } });
    expect(zeilen.length).toBeGreaterThan(0);
    expect(zeilen[0]?.akteur?.benutzer).toBe("Lagekartenführer");
  });

  it("lässt zwei Browser als zwei Arbeitsplätze denselben Einsatz führen und einander sehen", async () => {
    const werkstatt = baueWerkstatt();
    const a = werkstatt.oeffne(SCHLUESSEL_A);
    const b = werkstatt.oeffne(SCHLUESSEL_B);
    await ruf(a, { art: "einstellungenSetzen", einstellungen: { sharePfad: "", anzeigename: "Platz A" } });
    await ruf(b, { art: "einstellungenSetzen", einstellungen: { sharePfad: "", anzeigename: "Platz B" } });

    const angelegt = await ruf<{ akteId: string; ordner: string }>(a, ANLEGEN);
    expect(angelegt.ordner).toBe(einsatzKennung("2026-09-11", "Sturmflut Jadebusen").ordner);
    await werkstatt.takte();

    const liste = await ruf<readonly { ordner: string }[]>(b, { art: "einsaetzeAuflisten" });
    expect(liste.map((e) => e.ordner)).toEqual([angelegt.ordner]);
    const geoeffnet = await ruf<{ akteId: string }>(b, { art: "einsatzOeffnen", ordner: angelegt.ordner });
    await werkstatt.takte();

    const ergebnis = await ruf<{ art: string }>(a, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: {
        typ: "AbschnittAngelegt",
        nutzlast: { abschnittId: "EO", name: "Deich Süd", typ: "EINSATZORT", reihenfolge: 1 },
      },
    });
    expect(ergebnis.art).toBe("geschrieben");
    await werkstatt.takte(6);

    // Beide Arbeitsplaetze haben eine `akte-1` — das ist richtig so.
    expect(geoeffnet.akteId).toBe(angelegt.akteId);
    const dienstB = werkstatt.dienst(SCHLUESSEL_B, geoeffnet.akteId);
    expect(dienstB?.zustand.abschnitte["EO"]?.name.wert).toBe("Deich Süd");

    const letzterStandB = werkstatt.mitteilungen
      .get(SCHLUESSEL_B)
      ?.filter((m) => m.art === "stand")
      .reduce<Partial<Lagebild>>((bild, m) => ({ ...bild, ...(m.voll ?? m.geaendert ?? {}) }), {});
    expect(letzterStandB?.peers?.map((p) => p.anzeigename)).toEqual(["Platz A"]);
    expect(letzterStandB?.einsatzName).toBe("Sturmflut Jadebusen");

    await a.schliesse();
    await b.schliesse();
    expect([...werkstatt.dienste.values()].every((platz) => platz.size === 0)).toBe(true);
  });
});
