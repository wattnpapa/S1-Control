import path from "node:path";

import { describe, expect, it } from "vitest";

import { knotenDateisystem } from "./knotenDateisystem.js";
import {
  Einsatzablage,
  clientPraefix,
  ereignisDateiname,
  segmentText,
  zerlegeEreignisDateiname,
} from "./pfade.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import {
  deuteSchreiberzustand,
  liesSchreiberzustand,
  neuerSchreiberzustand,
  schreibeSchreiberzustand,
} from "./schreiberzustand.js";
import { deuteUploadZustand, liesUploadZustand, schreibeUploadZustand } from "./uploadZustand.js";
import { spielwiese } from "./pruefhilfen/spielwiese.js";

const dateisystem = knotenDateisystem();

describe("Benennung nach §4.1", () => {
  it("kürzt die Kennung auf acht Hexziffern und füllt die Segmentnummer auf vier Stellen", () => {
    expect(ereignisDateiname("9f3c1a20-1111-2222-3333-444455556666", 7)).toBe("9f3c1a20.0007.jsonl");
    expect(segmentText(0)).toBe("0000");
    expect(clientPraefix("9f3c1a20-aaaa")).toBe("9f3c1a20");
  });

  it("zerlegt einen Dateinamen und lässt Fremdes unangetastet", () => {
    expect(zerlegeEreignisDateiname("9f3c1a20.0007.jsonl")).toEqual({
      praefix: "9f3c1a20",
      segment: 7,
      name: "9f3c1a20.0007.jsonl",
    });
    expect(zerlegeEreignisDateiname("notizen.txt")).toBeUndefined();
    expect(zerlegeEreignisDateiname("9f3c1a20.7.jsonl")).toBeUndefined();
  });

  it("hält Share und lokalen Spiegel auseinander", () => {
    const ablage = new Einsatzablage(path.join("/", "share", "e1"), path.join("/", "lokal", "e1"));
    expect(ablage.shareSegment("9f3c1a20", 0)).toBe(
      path.join("/", "share", "e1", "ereignisse", "9f3c1a20.0000.jsonl"),
    );
    expect(ablage.lokalSegment("9f3c1a20", 0)).toBe(
      path.join("/", "lokal", "e1", "ereignisse", "9f3c1a20.0000.jsonl"),
    );
    // §4.4 und §5.3: beide Dateien liegen ausschließlich lokal.
    expect(ablage.schreiberDatei.startsWith(ablage.lokal)).toBe(true);
    expect(ablage.uploadZustandDatei.startsWith(ablage.lokal)).toBe(true);
  });
});

describe("schreiber.json nach §4.4", () => {
  it("schreibt und liest den Zustand zurück", async () => {
    await using wiese = await spielwiese();
    const pfad = path.join(wiese.pfad, "schreiber.json");
    const zustand = { ...neuerSchreiberzustand("9f3c1a20"), laufnummer: 4711, segment: 3 };
    await schreibeSchreiberzustand(dateisystem, pfad, zustand);
    expect(await liesSchreiberzustand(dateisystem, pfad)).toEqual(zustand);
  });

  it("hält frühereClientIds fest (§4.5, Schritt 1)", async () => {
    await using wiese = await spielwiese();
    const pfad = path.join(wiese.pfad, "schreiber.json");
    const zustand = { ...neuerSchreiberzustand("neu1234"), frühereClientIds: ["9f3c1a20"] };
    await schreibeSchreiberzustand(dateisystem, pfad, zustand);
    expect((await liesSchreiberzustand(dateisystem, pfad))?.frühereClientIds).toEqual(["9f3c1a20"]);
  });

  it.each([
    ["fehlend", undefined],
    ["leer", ""],
    ["verstümmelt", '{"clientId": "9f3c'],
    ["fremde Struktur", "[]"],
    ["Laufnummer als Text", '{"clientId":"a","laufnummer":"7","segment":0,"lokalerOffset":0,"letzteKette":"' + KETTE_ANFANG + '"}'],
    ["Kette unbrauchbar", '{"clientId":"a","laufnummer":7,"segment":0,"lokalerOffset":0,"letzteKette":"xx"}'],
  ])("meldet %s als nicht brauchbar, statt zu raten", async (_name, inhalt) => {
    await using wiese = await spielwiese();
    const pfad = path.join(wiese.pfad, "schreiber.json");
    if (inhalt !== undefined) await wiese.schreibe("schreiber.json", inhalt);
    expect(await liesSchreiberzustand(dateisystem, pfad)).toBeUndefined();
    if (inhalt !== undefined) expect(deuteSchreiberzustand(inhalt)).toBeUndefined();
  });
});

describe("upload-state.json nach §5.3", () => {
  it("schreibt und liest eigene und fremde Offsets", async () => {
    await using wiese = await spielwiese();
    const pfad = path.join(wiese.pfad, "upload-state.json");
    const zustand = {
      eigen: { "0003": { shareOffset: 1_234_567, letzteKette: "a".repeat(32) } },
      fremd: {
        "9f3c1a20.0000": {
          leseOffset: 890_123,
          letzteKette: "c".repeat(32),
          abgeschlossen: true,
          quarantaeneAb: null,
        },
      },
    };
    await schreibeUploadZustand(dateisystem, pfad, zustand);
    expect(await liesUploadZustand(dateisystem, pfad)).toEqual(zustand);
  });

  it("reicht stuetzstellen unverändert durch, ohne sie zu erzeugen (§7.5)", () => {
    const text = JSON.stringify({
      eigen: {},
      fremd: {
        "9f3c1a20.0000": {
          leseOffset: 10,
          letzteKette: "c".repeat(32),
          abgeschlossen: false,
          quarantaeneAb: null,
          stuetzstellen: [{ offset: 10, kette: "d".repeat(32) }],
        },
      },
    });
    const gedeutet = deuteUploadZustand(text);
    expect(gedeutet.fremd["9f3c1a20.0000"]?.stuetzstellen).toEqual([
      { offset: 10, kette: "d".repeat(32) },
    ]);
  });

  it("unterscheidet die vorläufige Quarantäne aus §8.1 von der endgültigen aus §8.2", () => {
    const gedeutet = deuteUploadZustand(
      JSON.stringify({
        eigen: {},
        fremd: {
          a: { leseOffset: 5, letzteKette: "c".repeat(32), abgeschlossen: false, quarantaeneAb: 5, vorlaeufig: true },
          b: { leseOffset: 5, letzteKette: "c".repeat(32), abgeschlossen: false, quarantaeneAb: 5 },
        },
      }),
    );
    expect(gedeutet.fremd["a"]?.vorlaeufig).toBe(true);
    expect(gedeutet.fremd["b"]?.vorlaeufig).toBeUndefined();
  });

  it("liefert bei unbrauchbarem Inhalt den leeren Zustand, statt zu scheitern", () => {
    expect(deuteUploadZustand("kein json")).toEqual({ eigen: {}, fremd: {} });
    expect(deuteUploadZustand("")).toEqual({ eigen: {}, fremd: {} });
    // Ein einzelner unbrauchbarer Eintrag darf die übrigen nicht mitreißen.
    const teils = deuteUploadZustand(
      JSON.stringify({ eigen: { "0000": { shareOffset: "x" }, "0001": { shareOffset: 9, letzteKette: "e".repeat(32) } }, fremd: {} }),
    );
    expect(Object.keys(teils.eigen)).toEqual(["0001"]);
  });
});
