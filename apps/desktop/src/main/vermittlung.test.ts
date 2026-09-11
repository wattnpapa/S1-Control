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

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { knotenDateisystem } from "@s1/speicher";
import { einsatzKennung } from "@s1/domaene";

import { Arbeiterhof } from "./arbeiterhof.js";
import { baueDirektenArbeiter } from "./pruefhilfen/direkterArbeiter.js";
import { Vermittlung } from "./vermittlung.js";
import type { Aktendienst } from "../worker/aktendienst.js";
import type {
  Bedienergebnis,
  Diagnose,
  EinsatzEintrag,
  Mitteilung,
  Protokollzeile,
  Ruf,
} from "../kontrakt/index.js";

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

function baueWerkstatt(): Werkstatt {
  const wurzel = mkdtempSync(path.join(os.tmpdir(), "s1-m2-vermittlung-"));
  wegwerf.push(wurzel);
  const sharePfad = path.join(wurzel, "share");
  const mitteilungen: Mitteilung[] = [];
  const dienste = new Map<string, Aktendienst>();
  // Der Ringpuffer der Schale, hier von Hand — die Vermittlung liest ihn nur.
  const gemeldet: Protokollzeile[] = [];

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
    protokolliere: (stufe, text) => {
      gemeldet.push({ wanduhr: "2026-09-10T12:00:00.000Z", stufe, text });
    },
    protokolldatei: path.join(wurzel, "profil", "s1-control.log"),
    letzteMeldungen: () => [...gemeldet].reverse(),
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
    // Drei: der angelegte Abschnitt und die beiden Systemabschnitte `EINGANG`
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

describe("Jeder Ansichtsruf erreicht den Aktendienst", () => {
  /**
   * **Warum dieser Test die Naht misst und nicht die Ansicht.**
   *
   * Die Vermittlung reicht die Ansichtsrufe mit einem `switch` an den Worker
   * weiter. Der `switch` hat keinen Vorgabezweig — was er nicht kennt, fällt
   * hindurch und wird zu `undefined`, und der Aufrufer bekommt eine Antwort,
   * die formal in Ordnung ist und nichts enthält. Genau das ist mit
   * `kostenAnfordern` aus M5.2 passiert: Die Ansicht war gebaut, ihre Tests
   * gegen den Aktendienst waren grün, und über die Prozessgrenze kam nichts
   * an. Deshalb steht hier **jeder** Ansichtsruf, und ein neuer gehört
   * hinzugefügt.
   */
  it("liefert zu jedem Ansichtsruf eine Antwort mit Zeigerstand", async () => {
    const werkstatt = await mitShare();
    const { akteId } = await ruf<{ akteId: string }>(werkstatt, ANLEGEN);

    const rufe: Ruf[] = [
      { art: "baumAnfordern", akteId },
      { art: "tabelleAnfordern", akteId },
      { art: "tagebuchAnfordern", akteId },
      { art: "kostenAnfordern", akteId },
      { art: "anforderungenAnfordern", akteId },
      { art: "fuestAnfordern", akteId },
      { art: "eingangskorbAnfordern", akteId },
    ];

    // `fassungsvergleichAnfordern` steht bewusst nicht in der Liste: Er
    // antwortet mit `null`, wenn es nichts zu vergleichen gibt, und trägt
    // deshalb keinen Zeigerstand. Geprüft wird er trotzdem — nur anders.
    const vergleich = await werkstatt.vermittlung.beantworte({
      art: "fassungsvergleichAnfordern",
      akteId,
      einheitSchluessel: "gibt-es-nicht",
    });
    expect(vergleich.ok, "fassungsvergleichAnfordern wurde abgewiesen").toBe(true);
    expect((vergleich as { wert: unknown }).wert).toBeNull();

    for (const anfrage of rufe) {
      const antwort = await werkstatt.vermittlung.beantworte(anfrage);
      expect(antwort.ok, `${anfrage.art} wurde abgewiesen`).toBe(true);
      const wert = (antwort as { wert: unknown }).wert as { lageZeiger?: number } | null;
      expect(wert, `${anfrage.art} lieferte nichts`).not.toBeNull();
      // Jede Ansichtsantwort trägt den Zeigerstand, zu dem sie gebaut wurde
      // (M3.7) — ohne ihn hätte der Renderer ein Wettrennen.
      expect(typeof wert?.lageZeiger, `${anfrage.art} ohne Zeigerstand`).toBe("number");
    }
  });
});

describe("Der Programmstand auf dem Share (M7.2)", () => {
  /**
   * **Warum dieser Test den Weg misst und nicht die Prüfung.**
   *
   * Jeden Ablehnungsgrund einzeln fährt `verteilung.test.ts` in Ring 2 —
   * rein, ohne Share. Hier steht die Naht: dass die Vermittlung im richtigen
   * Ordner nachsieht, dass sie den Hash der Datei daneben bildet, und dass
   * ein Share ohne Programmordner **kein** Fehler ist.
   *
   * Ein Angebot lässt sich hier nicht erzeugen: `VERTRAUTER_SCHLUESSEL` ist
   * in dieser Fassung leer, und das ist die sichere Vorbelegung (siehe
   * `verteilschluessel.ts`). Genau das prüft der zweite Fall.
   */
  it("meldet einen Share ohne Programmordner als Normalzustand", async () => {
    const werkstatt = await mitShare();
    const befund = await ruf<{ art: string; ordner?: string }>(werkstatt, {
      art: "programmstandPruefen",
    });

    // Auf den meisten Shares liegt kein Manifest. Eine Fehlermeldung darüber
    // wäre eine Meldung über einen Normalzustand.
    expect(befund.art).toBe("keinManifest");
    expect(befund.ordner).toContain("programm");
  });

  it("bietet ohne hinterlegten Verteilschlüssel nichts an und sagt warum", async () => {
    const werkstatt = await mitShare();
    const ordner = path.join(werkstatt.sharePfad, "programm");
    mkdirSync(ordner, { recursive: true });
    // Ein Manifest, das formal in Ordnung ist. Ohne Vertrauensanker kann
    // diese Fassung nicht entscheiden, wem sie glaubt — also glaubt sie
    // niemandem.
    writeFileSync(
      path.join(ordner, "manifest.json"),
      JSON.stringify({
        stand: {
          version: "9.9.9",
          datei: "S1-Control-9.9.9.exe",
          groesse: 1,
          sha256: "a".repeat(64),
          plattform: "linux",
          veroeffentlicht: "2026-09-10T12:00:00+02:00",
        },
        signatur: "aa".repeat(32),
        pubkey: "bb".repeat(32),
      }),
    );

    const befund = await ruf<{ art: string; grund?: string; meldung?: string }>(werkstatt, {
      art: "programmstandPruefen",
    });
    expect(befund.art).toBe("abgelehnt");
    expect(befund.meldung).toContain("kein Verteilschlüssel");
  });
});

describe("Die Diagnoseauskunft (M7.3)", () => {
  it("nennt Pfade, Fassung und die letzten Meldungen — jüngste zuerst", async () => {
    const werkstatt = baueWerkstatt();
    await ruf(werkstatt, { art: "einstellungenSetzen", einstellungen: { sharePfad: werkstatt.sharePfad, anzeigename: "Prüfer" } });
    // Ein Ruf, der scheitert, damit etwas im Protokoll steht: Die Ansicht soll
    // zeigen, was schiefging, und nicht nur, dass es ein Protokoll gibt.
    await werkstatt.vermittlung.beantworte({ art: "einsatzOeffnen", ordner: "gibtesnicht" });

    const auskunft = await ruf<Diagnose>(werkstatt, { art: "diagnoseAnfordern" });

    expect(auskunft.sharePfad).toBe(werkstatt.sharePfad);
    expect(auskunft.programmversion).toBe("0.0.0-test");
    expect(auskunft.rechnername).toBe("pruefrechner");
    expect(auskunft.protokolldatei).toContain("s1-control.log");
    expect(auskunft.einstellungsdatei).toContain("einstellungen.json");
    expect(auskunft.spiegelwurzel).toContain("spiegel");
    expect(auskunft.letzteMeldungen[0]?.stufe).toBe("fehler");
    expect(auskunft.letzteMeldungen[0]?.text).toContain("einsatzOeffnen");
  });

  it("meldet einen unlesbaren Share als nicht lesbar statt zu scheitern", async () => {
    // §6.4 im Kleinen: Die Auskunft über einen unerreichbaren Share ist
    // selbst dann zu geben, wenn der Share weg ist — sonst fehlte sie genau
    // in dem Fall, für den die Ansicht gebaut ist.
    const werkstatt = baueWerkstatt();
    await ruf(werkstatt, {
      art: "einstellungenSetzen",
      einstellungen: { sharePfad: path.join(werkstatt.sharePfad, "weg"), anzeigename: "Prüfer" },
    });

    const auskunft = await ruf<Diagnose>(werkstatt, { art: "diagnoseAnfordern" });

    expect(auskunft.shareLesbar).toBe(false);
  });
});

describe("Das Holen eines Pakets über die Vermittlung (M9.1)", () => {
  it("meldet ohne eingerichteten Netzzugang, dass der Weg nicht verfügbar ist", async () => {
    // Die Werkstatt zum Datenpfad hat keinen Holer — und das ist die Probe
    // auf die Naht: Ohne Netz tut die Vermittlung alles Übrige, und der eine
    // Weg, der es braucht, sagt es, statt zu werfen.
    const werkstatt = baueWerkstatt();
    await ruf(werkstatt, {
      art: "einstellungenSetzen",
      einstellungen: { sharePfad: werkstatt.sharePfad, anzeigename: "Prüfer" },
    });

    const befund = await ruf<{ art: string; grund?: string }>(werkstatt, {
      art: "programmpaketHolen",
    });

    expect(befund.art).toBe("abgelehnt");
    expect(befund.grund).toBe("netzfehler");
  });

  it("lehnt ohne eingestellten Share ab, bevor irgendetwas gerufen wird", async () => {
    const werkstatt = baueWerkstatt();
    const befund = await ruf<{ art: string; grund?: string }>(werkstatt, {
      art: "programmpaketHolen",
    });

    expect(befund.art).toBe("abgelehnt");
    expect(befund.grund).toBe("keinShare");
  });
});
