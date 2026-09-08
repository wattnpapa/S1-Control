import { describe, expect, it } from "vitest";

import { falte, falteHinzu, leereFaltung, materialisiere } from "./fold.js";
import {
  abschnittAngelegt,
  einheitGemeldet,
  einheitVerschoben,
  einsatzAngelegt,
  fremdesEreignis,
  hlc,
  staerke,
  staerkeGeaendert,
} from "./pruefhilfen/ereignisbau.js";
import { AUFFANG_ABSCHNITT_ID, FOLD_VERSION } from "./zustand.js";

const einsatz = einsatzAngelegt(hlc(1000, 0, "aa"), 1, {
  einsatzId: "E",
  name: "Hochwasser Sued",
  art: "EINSATZ",
  fuestName: "FueSt Oldenburg",
  beginn: "2026-09-08T08:00:00+02:00",
  schichtmodell: "ZWEI_SCHICHT",
});

const abschnittA = abschnittAngelegt(hlc(1001, 0, "aa"), 2, {
  abschnittId: "A",
  name: "Einsatzort 1",
  abschnittstyp: "EINSATZORT",
  reihenfolge: 1,
});

const abschnittB = abschnittAngelegt(hlc(1002, 0, "aa"), 3, {
  abschnittId: "B",
  name: "Bereitstellung 1",
  abschnittstyp: "BEREITSTELLUNGSRAUM",
  reihenfolge: 2,
});

const einheit = einheitGemeldet(hlc(1003, 0, "aa"), 4, {
  einheitId: "U1",
  abschnittId: "A",
  bezeichnung: "1. Bergungsgruppe",
  organisation: "THW",
  ebene: "GRUPPE",
  staerke: staerke(0, 1, 8),
  personalErfassung: "NUR_STAERKE",
  status: "IM_EINSATZ",
  schicht: "TAG",
});

const grundmenge = [einsatz, abschnittA, abschnittB, einheit];

describe("Minimalfold — Grundverhalten", () => {
  it("materialisiert Einsatz, Abschnitte und Einheiten mit Feld-HLC (§7.4)", () => {
    const zustand = falte(grundmenge);

    expect(zustand.foldVersion).toBe(FOLD_VERSION);
    expect(zustand.einsatz?.name.wert).toBe("Hochwasser Sued");
    expect(zustand.einsatz?.name.hlc).toEqual(hlc(1000, 0, "aa"));
    expect(zustand.einsatz?.name.durch).toBe("aa:1");
    expect(Object.keys(zustand.abschnitte).sort()).toEqual([AUFFANG_ABSCHNITT_ID, "A", "B"].sort());
    expect(zustand.einheiten["U1"]?.staerke.wert).toEqual(staerke(0, 1, 8));
    expect(zustand.einheiten["U1"]?.staerke.hlc).toEqual(hlc(1003, 0, "aa"));
    expect(zustand.hinweise).toEqual([]);
  });

  it("verwirft ein zweites EinsatzAngelegt und behaelt das mit der kleineren HLC (§4.2)", () => {
    const zweiteAnlage = einsatzAngelegt(hlc(900, 0, "bb"), 1, {
      einsatzId: "E",
      name: "Falscher Name",
      art: "UEBUNG",
      fuestName: "Andere FueSt",
      beginn: "2026-09-08T09:00:00+02:00",
      schichtmodell: "DREI_SCHICHT",
    });

    // Die kleinere HLC gilt, unabhaengig davon, wann sie eintrifft.
    for (const menge of [
      [einsatz, zweiteAnlage],
      [zweiteAnlage, einsatz],
    ]) {
      const zustand = falte(menge);
      expect(zustand.einsatz?.name.wert).toBe("Falscher Name");
      expect(zustand.hinweise).toEqual([
        { art: "zweiteAnlageVerworfen", feldpfad: "einsatz", verworfen: "aa:1", gilt: "bb:1" },
      ]);
    }
  });

  it("reicht unbekannte Ereignisarten durch, statt sie zu verwerfen (§4.1 Regel 4)", () => {
    const zustand = falte([...grundmenge, fremdesEreignis(hlc(1004, 0, "bb"), 1, "EinsatzArchiviert")]);

    expect(zustand.unbekannt).toEqual([
      {
        id: "bb:1",
        typ: "EinsatzArchiviert",
        schemaVersion: 1,
        hlc: hlc(1004, 0, "bb"),
        akteurBenutzer: "Bediener bb",
        akteurHost: "rechner-bb",
      },
    ]);
  });
});

describe("Rebase — der Live-Pfad (Auflage 4, 02-ZIELBILD.md Nr. 3)", () => {
  it("laesst ein nachtraeglich eintreffendes Ereignis mit hoeherer HLC noch gewinnen", () => {
    // Client aa hat schon gefaltet und materialisiert.
    const nachGrundmenge = falteHinzu(leereFaltung(), grundmenge);
    expect(materialisiere(nachGrundmenge).einheiten["U1"]?.staerke.wert).toEqual(staerke(0, 1, 8));

    // Jetzt trifft ein aelteres Ereignis eines anderen Clients ein — aelter
    // in der Ankunft, aber hoeher in der HLC.
    const spaet = staerkeGeaendert(hlc(2000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(0, 2, 17));
    const zustand = materialisiere(falteHinzu(nachGrundmenge, [spaet]));

    expect(zustand.einheiten["U1"]?.staerke.wert).toEqual(staerke(0, 2, 17));
    expect(zustand.einheiten["U1"]?.staerke.hlc).toEqual(hlc(2000, 0, "bb"));
  });

  it("laesst ein nachtraeglich eintreffendes Ereignis mit niedrigerer HLC nicht gewinnen", () => {
    const gewinner = staerkeGeaendert(hlc(3000, 0, "cc"), 1, "U1", staerke(0, 1, 8), staerke(1, 1, 1));
    const bisher = falteHinzu(leereFaltung(), [...grundmenge, gewinner]);

    const nachzuegler = staerkeGeaendert(hlc(2000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(9, 9, 9));
    const zustand = materialisiere(falteHinzu(bisher, [nachzuegler]));

    expect(zustand.einheiten["U1"]?.staerke.wert).toEqual(staerke(1, 1, 1));
    expect(zustand.einheiten["U1"]?.staerke.hlc).toEqual(hlc(3000, 0, "cc"));
  });

  it("faltet Feldaenderungen, die vor ihrer Anlage eintreffen, nachtraeglich ein", () => {
    const vorAnlage = staerkeGeaendert(hlc(5000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(2, 2, 2));

    const ohneAnlage = falteHinzu(leereFaltung(), [einsatz, abschnittA, vorAnlage]);
    const zwischenzustand = materialisiere(ohneAnlage);
    expect(zwischenzustand.einheiten["U1"]).toBeUndefined();
    expect(zwischenzustand.hinweise).toEqual([
      { art: "anlageFehlt", feldpfad: "einheit/U1", ereignisse: ["bb:1"] },
    ]);

    const zustand = materialisiere(falteHinzu(ohneAnlage, [einheit]));
    expect(zustand.einheiten["U1"]?.staerke.wert).toEqual(staerke(2, 2, 2));
    expect(zustand.hinweise).toEqual([]);
  });
});

describe("Konflikthinweise sind Teil des Zustands (Auflage 6, §2.5)", () => {
  it("meldet einen nicht passenden Vorher-Wert am Staerke-Feld", () => {
    const erste = staerkeGeaendert(hlc(2000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(0, 2, 17));
    // cc hat 0/1/8 gesehen, nicht 0/2/17 — es hat den Stand von bb nie gesehen.
    const zweite = staerkeGeaendert(hlc(3000, 0, "cc"), 1, "U1", staerke(0, 1, 8), staerke(0, 3, 20));

    const zustand = falte([...grundmenge, erste, zweite]);

    expect(zustand.einheiten["U1"]?.staerke.wert).toEqual(staerke(0, 3, 20));
    expect(zustand.hinweise).toEqual([
      { art: "vorherPasstNicht", feldpfad: "einheit/U1/staerke", gewinner: "cc:1", verdraengt: "bb:1" },
    ]);
  });

  it("meldet keinen Hinweis, wenn der Gewinner den Stand des Vorgaengers gesehen hat", () => {
    const erste = staerkeGeaendert(hlc(2000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(0, 2, 17));
    const zweite = staerkeGeaendert(hlc(3000, 0, "cc"), 1, "U1", staerke(0, 2, 17), staerke(0, 3, 20));

    expect(falte([...grundmenge, erste, zweite]).hinweise).toEqual([]);
  });

  it("meldet einen nicht passenden Vorher-Wert beim Verschieben", () => {
    const nachB = einheitVerschoben(hlc(2000, 0, "bb"), 1, "U1", "A", "B");
    const wiederNachA = einheitVerschoben(hlc(3000, 0, "cc"), 1, "U1", "A", "A");

    const zustand = falte([...grundmenge, nachB, wiederNachA]);

    expect(zustand.einheiten["U1"]?.abschnittId.wert).toBe("A");
    expect(zustand.hinweise).toEqual([
      { art: "vorherPasstNicht", feldpfad: "einheit/U1/abschnittId", gewinner: "cc:1", verdraengt: "bb:1" },
    ]);
  });
});

describe("Auffangregel fuer unbekannte Abschnitte (Auflage 10)", () => {
  it("haengt eine Einheit in den Auffang, statt sie ins Leere zeigen zu lassen", () => {
    const insNichts = einheitVerschoben(hlc(4000, 0, "bb"), 1, "U1", "A", "gibtEsNicht");
    const zustand = falte([...grundmenge, insNichts]);

    // Die Entscheidung des Folds bleibt sichtbar — sie wird gebraucht, damit
    // ein spaeter eintreffendes AbschnittAngelegt noch wirken kann.
    expect(zustand.einheiten["U1"]?.abschnittId.wert).toBe("gibtEsNicht");
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe(AUFFANG_ABSCHNITT_ID);
    expect(zustand.hinweise).toContainEqual({
      art: "abschnittUnbekannt",
      feldpfad: "einheit/U1/abschnittId",
      abschnittId: "gibtEsNicht",
      gewinner: "bb:1",
    });
  });

  it("holt die Einheit aus dem Auffang, sobald der Abschnitt eintrifft", () => {
    const insNichts = einheitVerschoben(hlc(4000, 0, "bb"), 1, "U1", "A", "C");
    const spaeterAbschnitt = abschnittAngelegt(hlc(9000, 0, "cc"), 1, {
      abschnittId: "C",
      name: "Logistik",
      abschnittstyp: "LOGISTIK",
      reihenfolge: 3,
    });

    const zustand = falte([...grundmenge, insNichts, spaeterAbschnitt]);
    expect(zustand.einheiten["U1"]?.wirksamerAbschnittId).toBe("C");
    expect(zustand.hinweise).toEqual([]);
  });
});

describe("Idempotenz ueber die Ereignis-Id (§4.1 Regel 2)", () => {
  it("aendert nichts, wenn dasselbe Ereignis mehrfach ankommt", () => {
    const doppelt = [...grundmenge, ...grundmenge, einheit, einheit];
    expect(falte(doppelt)).toEqual(falte(grundmenge));
  });
});
