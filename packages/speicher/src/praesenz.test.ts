import { describe, expect, it } from "vitest";

import {
  deutePraesenz,
  hinweiseAufEigeneDateien,
  istVeraltet,
  Praesenzbeobachtung,
  liesFremdePraesenz,
  schreibePraesenz,
  type PraesenzOptionen,
} from "./praesenz.js";
import { arbeitsplatz } from "./pruefhilfen/aufbau.js";
import { PRAESENZ_VERALTET_MS } from "./startwerte.js";
import type { Arbeitsplatz } from "./pruefhilfen/aufbau.js";

function optionen(platz: Arbeitsplatz, clientId: string): PraesenzOptionen {
  return {
    dateisystem: platz.dateisystem,
    zeit: platz.uhr.lies,
    ablage: platz.ablage,
    clientId,
    anzeigename: `Bediener ${clientId}`,
    rechnername: `rechner-${clientId}`,
    programmversion: "2.0.0",
  };
}

const stand = { hlc: { millisekunden: 1_757_340_000_000, zaehler: 3, clientId: "9f3c1a20" }, segment: 2, offset: 4711 };

describe("Präsenz nach §6.4", () => {
  it("schreibt die eigene Datei und liest fremde, ohne die eigene mitzuzählen", async () => {
    await using platz = await arbeitsplatz();
    await schreibePraesenz(optionen(platz, "9f3c1a20"), stand);
    await schreibePraesenz(optionen(platz, "8899aabb"), { ...stand, segment: 0, offset: 12 });

    const fremde = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(fremde.map((f) => f.praesenz.clientId)).toEqual(["8899aabb"]);
    expect(fremde[0]?.praesenz.segment).toBe(0);
    expect(fremde[0]?.praesenz.offset).toBe(12);
    expect(fremde[0]?.veraltet).toBe(false);
  });

  it("überschreibt an Ort und Stelle und kürzt dabei — kein Rename (§6.4)", async () => {
    await using platz = await arbeitsplatz();
    const eigene = optionen(platz, "9f3c1a20");
    await schreibePraesenz(eigene, stand, [{ datei: "8899aabb.0000.jsonl", offset: 900 }]);
    const lang = await platz.dateisystem.liesAb(platz.ablage.praesenzDatei("9f3c1a20"), 0);
    await schreibePraesenz(eigene, stand);
    const kurz = await platz.dateisystem.liesAb(platz.ablage.praesenzDatei("9f3c1a20"), 0);
    expect(kurz.byteLength).toBeLessThan(lang.byteLength);
    // Kein Rest der alten, längeren Fassung bleibt stehen.
    expect(deutePraesenz(new TextDecoder().decode(kurz))?.quarantaene).toBeUndefined();
    // Und keine `.tmp`-Datei daneben: Rename ist hier ausgeschlossen.
    expect(await platz.dateisystem.listeVerzeichnis(platz.ablage.sharePraesenz)).toEqual([
      "9f3c1a20.json",
    ]);
  });

  it("ignoriert eine halb geschriebene Datei, ohne zu melden (§6.4)", async () => {
    await using platz = await arbeitsplatz();
    await schreibePraesenz(optionen(platz, "8899aabb"), stand);
    // Ein Leser sieht die Datei mitten im Überschreiben.
    await platz.dateisystem.schreibeUeberOhneSync(
      platz.ablage.praesenzDatei("8899aabb"),
      new TextEncoder().encode('{"clientId":"8899aab'),
    );
    const fremde = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(fremde).toEqual([]);
  });

  it("gilt nach 60 Sekunden ohne Fortschreibung als veraltet (§6.4, §10)", async () => {
    await using platz = await arbeitsplatz();
    await schreibePraesenz(optionen(platz, "8899aabb"), stand);
    const frisch = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(frisch[0]?.veraltet).toBe(false);

    platz.uhr.weiter(PRAESENZ_VERALTET_MS + 1);
    const alt = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(alt[0]?.veraltet).toBe(true);
    // Und die Datei wird dabei nicht gelöscht — nie von fremden Clients (§6.4).
    expect(await platz.dateisystem.listeVerzeichnis(platz.ablage.sharePraesenz)).toContain(
      "8899aabb.json",
    );
  });

  it("hält eine unbrauchbare Wanduhr für veraltet, statt sie für frisch zu halten", () => {
    const kaputt = deutePraesenz(JSON.stringify({ clientId: "x", wanduhr: "kein datum" }));
    expect(kaputt).toBeDefined();
    expect(istVeraltet(kaputt as NonNullable<typeof kaputt>, 1_000)).toBe(true);
  });
});

describe("Quarantänehinweis als Beschleuniger (§4.6.1, Auslöser 2)", () => {
  it("trägt Datei und Offset in die **eigene** Präsenzdatei ein", async () => {
    await using platz = await arbeitsplatz();
    await schreibePraesenz(optionen(platz, "8899aabb"), stand, [
      { datei: "9f3c1a20.0001.jsonl", offset: 2048 },
      { datei: "ccddeeff.0000.jsonl", offset: 64 },
    ]);
    const fremde = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    const meineDateien = hinweiseAufEigeneDateien(fremde, "9f3c1a20");
    // Nur die Hinweise auf eigene Dateien; ein Leser repariert nichts Fremdes.
    expect(meineDateien).toEqual([{ datei: "9f3c1a20.0001.jsonl", offset: 2048 }]);
  });

  it("bleibt ein Beschleuniger: ohne Hinweis gibt es schlicht keinen", async () => {
    await using platz = await arbeitsplatz();
    await schreibePraesenz(optionen(platz, "8899aabb"), stand);
    const fremde = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(hinweiseAufEigeneDateien(fremde, "9f3c1a20")).toEqual([]);
  });
});

describe("Veraltung ohne Vergleich fremder Uhren (§6.4, §3.2)", () => {
  it("misst die Zeit ohne Fortschreibung mit der eigenen Uhr", async () => {
    await using platz = await arbeitsplatz();
    const beobachtung = new Praesenzbeobachtung();
    await schreibePraesenz(optionen(platz, "8899aabb"), stand);

    expect((await liesFremdePraesenz(optionen(platz, "9f3c1a20"), beobachtung))[0]?.veraltet).toBe(false);
    platz.uhr.weiter(PRAESENZ_VERALTET_MS + 1);
    expect((await liesFremdePraesenz(optionen(platz, "9f3c1a20"), beobachtung))[0]?.veraltet).toBe(true);

    // Fortschreibung heißt: Der Inhalt ändert sich. Danach gilt sie wieder als
    // frisch, ohne dass irgendeine fremde Uhr befragt würde.
    await schreibePraesenz(optionen(platz, "8899aabb"), { ...stand, offset: 5000 });
    expect((await liesFremdePraesenz(optionen(platz, "9f3c1a20"), beobachtung))[0]?.veraltet).toBe(false);
  });

  it("hält einen Arbeitsplatz mit weit abweichender Uhr nicht dauerhaft für offline", async () => {
    // §3.2 behandelt eine um Minuten abweichende Fremduhr ausdrücklich als
    // möglichen Betriebszustand. Ein Vergleich der fremden Wanduhr mit der
    // eigenen zeigte ihn dauerhaft als offline — eine unehrliche Anzeige
    // gegenüber §6.3.
    await using platz = await arbeitsplatz();
    const beobachtung = new Praesenzbeobachtung();
    // Die Uhr des anderen Rechners geht eine Stunde nach; die eigene bleibt,
    // wo sie ist.
    const nachgehend = platz.uhr.lies() - 60 * 60 * 1000;
    await schreibePraesenz(
      { ...optionen(platz, "8899aabb"), zeit: () => nachgehend },
      stand,
    );

    const mitBeobachtung = await liesFremdePraesenz(optionen(platz, "9f3c1a20"), beobachtung);
    expect(mitBeobachtung[0]?.veraltet).toBe(false);
    // Der Rückfallweg über die fremde Wanduhr täuschte sich hier.
    const ohne = await liesFremdePraesenz(optionen(platz, "9f3c1a20"));
    expect(ohne[0]?.veraltet).toBe(true);
  });
});
