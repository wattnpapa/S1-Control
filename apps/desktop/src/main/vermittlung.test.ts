/**
 * Die Vermittlung, verdrahtet mit **echten** Aktendiensten statt mit Threads.
 *
 * Der Weg, den ein Ruf nimmt, ist damit vollständig geprüft: Renderer-Ruf →
 * Vermittlung → Arbeiterhof → Aktendienst → Speicherschicht → Dateisystem, und
 * die Mitteilungen denselben Weg zurück. Nur die Thread-Grenze fehlt, und die
 * ist das einzige Stück, das nichts entscheidet.
 *
 * Damit prüft dieser Test auch, was `main.ts` nicht mehr prüfen kann: Einen
 * Electron-Prozess in der Testumgebung zu starten hieße, für jeden Fall ein
 * Fenster zu öffnen.
 */

import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { Einsatzablage, knotenDateisystem } from "@s1/speicher";
import { einsatzKennung } from "@s1/domaene";

import { Arbeiterhof, type Arbeiter } from "./arbeiterhof.js";
import { Vermittlung } from "./vermittlung.js";
import { Aktendienst } from "../worker/aktendienst.js";
import type { Auftrag, Startdaten, WorkerBotschaft } from "../worker/akte-worker.js";
import type { Bedienergebnis, EinsatzEintrag, Mitteilung, Ruf } from "../kontrakt/index.js";

const wegwerf: string[] = [];
afterEach(() => {
  for (const ordner of wegwerf.splice(0)) rmSync(ordner, { recursive: true, force: true });
});

interface Werkstatt {
  readonly vermittlung: Vermittlung;
  readonly mitteilungen: Mitteilung[];
  readonly dienste: Map<string, Aktendienst>;
  readonly sharePfad: string;
  takte(runden?: number): Promise<void>;
}

/**
 * Ein Arbeiter, der den Aktendienst im selben Thread fährt.
 *
 * `queueMicrotask` für die Antwort ist kein Zierrat: Ein echter Worker
 * antwortet nie im selben Zug, in dem der Auftrag gestellt wurde. Antwortete
 * die Attrappe synchron, liefe der Test durch eine Reihenfolge, die es im
 * Betrieb nicht gibt.
 */
function baueDirektenArbeiter(
  start: Startdaten,
  dienste: Map<string, Aktendienst>,
): Arbeiter {
  let botschaft: ((b: WorkerBotschaft) => void) | undefined;
  const dienst = new Aktendienst({
    akteId: start.akteId,
    dateisystem: knotenDateisystem(),
    zeit: () => Date.now(),
    ablage: new Einsatzablage(start.shareEinsatzOrdner, start.lokalerEinsatzOrdner),
    clientId: start.clientId,
    einsatzId: start.einsatzId,
    akteur: { benutzer: start.benutzer, host: "pruefrechner", clientId: start.clientId },
    anzeigename: start.anzeigename,
    rechnername: "pruefrechner",
    programmversion: start.programmversion,
    neueKennung: () => "9".repeat(32),
    sende: (mitteilung) => botschaft?.({ art: "mitteilung", mitteilung }),
    takte: { spiegelungMs: 0, taktAMs: 0, taktBMs: 0, praesenzMs: 0 },
  });
  dienste.set(start.akteId, dienst);

  return {
    sende(auftrag: Auftrag) {
      void (async () => {
        try {
          const wert = await bearbeite(dienst, auftrag);
          queueMicrotask(() => botschaft?.({ art: "antwort", nummer: auftrag.nummer, wert }));
        } catch (fehler) {
          queueMicrotask(() =>
            botschaft?.({
              art: "fehler",
              nummer: auftrag.nummer,
              meldung: (fehler as Error).message,
            }),
          );
        }
      })();
    },
    aufBotschaft(hoerer) {
      botschaft = hoerer;
    },
    aufEnde() {
      // Ein direkter Arbeiter stürzt nicht ab; den Fall prüft arbeiterhof.test.ts.
    },
    async beende() {
      dienste.delete(start.akteId);
    },
  };
}

async function bearbeite(dienst: Aktendienst, auftrag: Auftrag): Promise<unknown> {
  switch (auftrag.art) {
    case "oeffne":
      return { befund: (await dienst.oeffne()).befund.art };
    case "bediene":
      return dienst.bediene(auftrag.entwurf);
    case "zurueck":
      return dienst.zurueck(auftrag.grund);
    case "undoStapel":
      return dienst.undoStapel();
    case "standAnfordern":
      dienst.sendeVollenStand();
      return null;
    case "schliesse":
      dienst.schliesse();
      return null;
  }
}

function baueWerkstatt(): Werkstatt {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-m2-vermittlung-"));
  wegwerf.push(wurzel);
  const sharePfad = path.join(wurzel, "share");
  const mitteilungen: Mitteilung[] = [];
  const dienste = new Map<string, Aktendienst>();

  const hof = new Arbeiterhof({
    fabrik: (start) => baueDirektenArbeiter(start, dienste),
    sende: (m) => mitteilungen.push(m),
  });

  const vermittlung = new Vermittlung({
    hof,
    dateisystem: knotenDateisystem(),
    einstellungsdatei: path.join(wurzel, "profil", "einstellungen.json"),
    spiegelwurzel: path.join(wurzel, "profil", "spiegel"),
    plattform: "linux",
    electron: "43.0.0",
    programmversion: "0.0.0-test",
    rechnername: "pruefrechner",
    benutzer: "pruefer",
    protokolliere: () => undefined,
  });

  return {
    vermittlung,
    mitteilungen,
    dienste,
    sharePfad,
    async takte(runden = 4) {
      for (let i = 0; i < runden; i += 1) {
        for (const dienst of dienste.values()) await dienst.takt();
      }
    },
  };
}

/** Ruft und packt aus; ein `ok: false` wird zum geworfenen Fehler, damit Tests kurz bleiben. */
async function ruf<T>(werkstatt: Werkstatt, anfrage: Ruf): Promise<T> {
  const antwort = await werkstatt.vermittlung.beantworte(anfrage);
  if (!antwort.ok) throw new Error(antwort.meldung);
  return antwort.wert as T;
}

async function mitShare(): Promise<Werkstatt> {
  const werkstatt = baueWerkstatt();
  await ruf(werkstatt, {
    art: "einstellungenSetzen",
    einstellungen: { sharePfad: werkstatt.sharePfad, anzeigename: "Führungsstelle 1" },
  });
  return werkstatt;
}

/** Der Ordnername, den `einsatzKennung` aus Datum und Name bildet (§1.4). */
const ORDNER = einsatzKennung("2026-09-10", "Hochwasser Weser-Ems").ordner;

const ANLEGEN = {
  art: "einsatzAnlegen",
  name: "Hochwasser Weser-Ems",
  datum: "2026-09-10",
  einsatzArt: "EINSATZ",
  fuestName: "FueSt Oldenburg",
  beginn: "2026-09-10T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
} as const satisfies Ruf;

describe("Einstellungen und Umgebung", () => {
  it("legt beim ersten Lesen eine Client-Kennung an und behält sie", async () => {
    const werkstatt = baueWerkstatt();
    const erste = await ruf<{ clientId: string }>(werkstatt, { art: "umgebung" });
    expect(erste.clientId).toMatch(/^[0-9a-f]{32}$/);
    const zweite = await ruf<{ clientId: string }>(werkstatt, { art: "umgebung" });
    expect(zweite.clientId).toBe(erste.clientId);
  });

  it("lässt die Client-Kennung nicht vom Renderer setzen (§4.1)", async () => {
    const werkstatt = baueWerkstatt();
    const vorher = await ruf<{ clientId: string }>(werkstatt, { art: "umgebung" });
    await ruf(werkstatt, {
      art: "einstellungenSetzen",
      // Der Kontrakt kennt das Feld gar nicht; hier steht es trotzdem, weil
      // die Vermittlung sich nicht darauf verlassen soll.
      einstellungen: { sharePfad: "/woanders", anzeigename: "Fremd" } as never,
    });
    const nachher = await ruf<{ clientId: string }>(werkstatt, { art: "umgebung" });
    expect(nachher.clientId).toBe(vorher.clientId);
  });

  it("gibt die eingestellten Werte zurück", async () => {
    const werkstatt = await mitShare();
    expect(await ruf(werkstatt, { art: "einstellungenLesen" })).toEqual({
      sharePfad: werkstatt.sharePfad,
      anzeigename: "Führungsstelle 1",
    });
  });
});

describe("Einsatz anlegen und öffnen (M2.3)", () => {
  it("weist das Anlegen ohne Share-Pfad ab", async () => {
    const werkstatt = baueWerkstatt();
    const antwort = await werkstatt.vermittlung.beantworte(ANLEGEN);
    expect(antwort).toEqual({ ok: false, meldung: "Es ist kein Share-Pfad eingestellt." });
  });

  it("legt den Ordner an, öffnet ihn und schreibt EinsatzAngelegt", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string; einsatzId: string }>(werkstatt, ANLEGEN);
    expect(angelegt.einsatzId).toBe(ORDNER);

    const dienst = werkstatt.dienste.get(angelegt.akteId);
    expect(dienst?.zustand.einsatz?.name.wert).toBe("Hochwasser Weser-Ems");
    expect(dienst?.zustand.einsatz?.art.wert).toBe("EINSATZ");
  });

  it("findet den angelegten Einsatz wieder", async () => {
    const werkstatt = await mitShare();
    await ruf(werkstatt, ANLEGEN);
    const liste = await ruf<readonly EinsatzEintrag[]>(werkstatt, { art: "einsaetzeAuflisten" });
    expect(liste).toEqual([
      {
        ordner: ORDNER,
        name: "Hochwasser Weser-Ems",
        datum: "2026-09-10",
      },
    ]);
  });

  it("liefert eine leere Liste, solange kein Share eingestellt ist", async () => {
    const werkstatt = baueWerkstatt();
    expect(await ruf(werkstatt, { art: "einsaetzeAuflisten" })).toEqual([]);
  });

  it("öffnet denselben Einsatz kein zweites Mal (§4.4)", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    const erneut = await ruf<{ akteId: string }>(werkstatt, {
      art: "einsatzOeffnen",
      ordner: ORDNER,
    });
    expect(erneut.akteId).toBe(angelegt.akteId);
    expect(werkstatt.dienste.size).toBe(1);
  });

  it("weist das Öffnen eines Ordners ohne einsatz.json ab", async () => {
    const werkstatt = await mitShare();
    const antwort = await werkstatt.vermittlung.beantworte({
      art: "einsatzOeffnen",
      ordner: "gibt-es-nicht",
    });
    expect(antwort.ok).toBe(false);
  });

  it("schließt die Akte und vergisst sie", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    await ruf(werkstatt, { art: "einsatzSchliessen", akteId: angelegt.akteId });
    expect(werkstatt.dienste.size).toBe(0);
    // Danach ist derselbe Ordner wieder zu öffnen — ein anderer Platz.
    const wieder = await ruf<{ akteId: string }>(werkstatt, {
      art: "einsatzOeffnen",
      ordner: ORDNER,
    });
    expect(wieder.akteId).not.toBe(angelegt.akteId);
  });
});

describe("Bedienen über die Vermittlung", () => {
  it("reicht einen Bedienschritt durch und meldet den neuen Stand", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    const ergebnis = await ruf<Bedienergebnis>(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: {
        typ: "AbschnittAngelegt",
        nutzlast: {
          abschnittId: "EO",
          name: "Deich Nord",
          typ: "EINSATZORT",
          reihenfolge: 1,
        },
      },
    });
    expect(ergebnis.art).toBe("geschrieben");
    const staende = werkstatt.mitteilungen.filter((m) => m.art === "stand");
    // Drei: der angelegte Abschnitt und die beiden Systemabschnitte `AUFFANG`
    // und `ARCHIV`, die der Fold immer führt (§5.3).
    expect(staende.at(-1)?.geaendert?.abschnitte).toBe(3);
  });

  it("gibt einen abgewiesenen Bedienschritt als Ergebnis zurück, nicht als Fehler (§8.8)", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    const ergebnis = await ruf<Bedienergebnis>(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      // Die Nutzlast passt nicht zum Schema der Art.
      entwurf: { typ: "AbschnittAngelegt", nutzlast: { abschnittId: "EO" } },
    });
    expect(ergebnis.art).toBe("abgewiesen");
  });

  it("nimmt über die Vermittlung zurück (§6 U3)", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    await ruf(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: {
        typ: "AbschnittAngelegt",
        nutzlast: { abschnittId: "EO", name: "Deich Nord", typ: "EINSATZORT", reihenfolge: 1 },
      },
    });
    await ruf(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: {
        typ: "AbschnittUmbenannt",
        nutzlast: { abschnittId: "EO" },
        vorher: "Deich Nord",
        neu: "Deich Süd",
      },
    });
    const stapel = await ruf<readonly { typ: string }[]>(werkstatt, {
      art: "undoStapel",
      akteId: angelegt.akteId,
    });
    expect(stapel.map((e) => e.typ)).toEqual(["AbschnittUmbenannt", "AbschnittAngelegt"]);

    const ergebnis = await ruf<Bedienergebnis>(werkstatt, {
      art: "zurueck",
      akteId: angelegt.akteId,
    });
    expect(ergebnis.art).toBe("geschrieben");
    expect(werkstatt.dienste.get(angelegt.akteId)?.zustand.abschnitte["EO"]?.name.wert).toBe(
      "Deich Nord",
    );
  });

  it("meldet die Rücknahme einer Anlage als strukturellen Fachvorgang (§6 U2)", async () => {
    // `AbschnittAufgeloest` setzt `{ zielAbschnittId, aufgeloestAm }`; wohin
    // die Einheiten gehen sollen, weiß die Anlage nicht. Die Vermittlung
    // reicht das als eigenen Ausgang durch, damit die Oberfläche die Maske
    // öffnen kann, statt zu raten.
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    await ruf(werkstatt, {
      art: "bedienen",
      akteId: angelegt.akteId,
      entwurf: {
        typ: "AbschnittAngelegt",
        nutzlast: { abschnittId: "EO", name: "Deich Nord", typ: "EINSATZORT", reihenfolge: 1 },
      },
    });
    expect(
      await ruf<Bedienergebnis>(werkstatt, { art: "zurueck", akteId: angelegt.akteId }),
    ).toEqual({
      art: "strukturell",
      inverseArt: "AbschnittAufgeloest",
      meldung: expect.stringContaining("AbschnittAufgeloest") as unknown as string,
    });
  });

  it("weist einen Auftrag an eine geschlossene Akte ab", async () => {
    const werkstatt = await mitShare();
    const angelegt = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);
    await ruf(werkstatt, { art: "einsatzSchliessen", akteId: angelegt.akteId });
    const antwort = await werkstatt.vermittlung.beantworte({
      art: "undoStapel",
      akteId: angelegt.akteId,
    });
    expect(antwort).toEqual({ ok: false, meldung: `Unbekannte Akte: ${angelegt.akteId}` });
  });
});
