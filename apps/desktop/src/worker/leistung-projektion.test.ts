/**
 * Der Ausschnitt bei 5.000 Einheiten (Entscheidung 10 des Umsetzungsplans).
 *
 * **Warum die Messung nicht in Ring 2 steht**, obwohl sie eine Ring-2-Funktion
 * misst: `@s1/domaene` ist plattformneutral und hat weder `lib.dom` noch
 * Node-Typen (02-ZIELBILD.md, „Vier Ringe“) — `performance.now()` gibt es dort
 * nicht, und das ist dieselbe Grenze, die auch `Date.now()` fernhält. Eine
 * Messung braucht eine Uhr; sie gehört dorthin, wo es eine gibt.
 *
 * **Warum ohne Dateisystem**, anders als `leistung.test.ts` daneben: Gemessen
 * wird die **Projektion** — Filtern, Sortieren, Zeilen bauen. Dieselbe Zahl
 * über den Aktendienst zu fahren hieße, 5.000 Ereignisse einzeln mit `fsync`
 * zu schreiben (§2.2 Speicher); das dauert Minuten und misst die Platte.
 *
 * Der Prüffall hält zwei Dinge fest, und das zweite ist das wichtigere:
 *
 *  1. Eine Seite von hundert Zeilen bleibt auch bei 5.000 Einheiten weit
 *     unter einer Zehntelsekunde.
 *  2. Sie ist **deutlich** billiger als dieselbe Anfrage ohne Ausschnitt.
 *     Genau darauf beruht der Zuschnitt aus M3.7: Gefiltert und sortiert wird
 *     über den schmalen Zustandsobjekten, gebaut werden nur die Zeilen, die
 *     jemand sieht.
 */

import { describe, expect, it } from "vitest";

import {
  SCHEMA_VERSION,
  ereignisId,
  falteHinzu,
  leereFaltung,
  materialisiere,
  projektion,
  type EingehendesEreignis,
  type Zustand,
} from "@s1/domaene";

/** Eine Seite von hundert Zeilen — so viel holt der Renderer (M3.7, `SEITE`). */
const SEITE = 100;

/** Großzügig: Ein Test mit enger Schranke misst auf einem ausgelasteten Läufer die Auslastung. */
const SCHRANKE_MS = 100;

const CLIENT = "leistung0000000000000000000000";

/** Der gemeinsame Rahmen; die Wanduhr ist abgeleitet, damit keine echte Uhr nötig ist (§3.1). */
function rahmen(laufnummer: number): Omit<EingehendesEreignis, "typ" | "nutzlast"> {
  return {
    id: ereignisId(CLIENT, laufnummer),
    hlc: { millisekunden: laufnummer, zaehler: 0, clientId: CLIENT },
    schemaVersion: SCHEMA_VERSION,
    akteur: { benutzer: "Messung", host: "messrechner", clientId: CLIENT },
    wanduhr: new Date(Date.parse("2026-09-10T08:00:00+02:00") + laufnummer).toISOString(),
  };
}

function baueLage(anzahl: number): Zustand {
  const ereignisse: EingehendesEreignis[] = [
    {
      ...rahmen(1),
      typ: "EinsatzAngelegt",
      nutzlast: {
        einsatzId: "E1",
        name: "Großschadenslage",
        art: "EINSATZ",
        fuestName: "FüSt 1",
        beginn: "2026-09-10T08:00:00+02:00",
        schichtmodell: "ZWEI_SCHICHT",
        kosten: { psaKostenProSatz: 180, vdaProTag: 150, ukVerpflegungProTag: 20, geplanteEinsatztage: 5 },
      },
    },
    {
      ...rahmen(2),
      typ: "AbschnittAngelegt",
      nutzlast: { abschnittId: "EO", name: "Einsatzort", typ: "EINSATZORT", reihenfolge: 1 },
    },
  ];
  for (let nummer = 0; nummer < anzahl; nummer += 1) {
    ereignisse.push({
      ...rahmen(3 + nummer),
      typ: "EinheitGemeldet",
      nutzlast: {
        einheitId: `E-${String(nummer).padStart(5, "0")}`,
        abschnittId: "EO",
        bezeichnung: `Fachgruppe ${String(nummer)}`,
        organisation: "THW",
        hierarchie: [],
        ebene: "GRUPPE",
        staerke: { fuehrer: 0, unterfuehrer: 1, mannschaft: 8 },
        personalErfassung: "NUR_STAERKE",
        status: nummer % 2 === 0 ? "IM_EINSATZ" : "ANMARSCH",
        reihenfolge: nummer,
        istFuehrungDesAbschnitts: false,
      },
    });
  }
  return materialisiere(falteHinzu(leereFaltung(), ereignisse));
}

/** Der Mittelwert über mehrere Läufe, nach einem Vorlauf. */
function miss(laeufe: number, tue: () => void): number {
  tue();
  const beginn = performance.now();
  for (let lauf = 0; lauf < laeufe; lauf += 1) tue();
  return (performance.now() - beginn) / laeufe;
}

describe("Der Tabellenausschnitt bei 5.000 Einheiten", () => {
  it("baut eine Seite von hundert Zeilen weit unter einer Zehntelsekunde", () => {
    const zustand = baueLage(5_000);
    const dauer = miss(10, () => {
      projektion.einheitentabelle(zustand, { von: 0, anzahl: SEITE });
    });
    expect(dauer).toBeLessThan(SCHRANKE_MS);
  });

  it("ist mit Ausschnitt deutlich billiger als ohne", () => {
    const zustand = baueLage(5_000);
    const seite = miss(10, () => {
      projektion.einheitentabelle(zustand, { von: 0, anzahl: SEITE });
    });
    const alles = miss(3, () => {
      projektion.einheitentabelle(zustand);
    });
    // „Deutlich“ heißt hier: um ein Vielfaches, nicht um ein paar Prozent.
    // Fiele der Unterschied weg, wäre der Ausschnitt im Kontrakt nutzlos —
    // und die Antwort auf 5.000 Einheiten trüge 5.000 Zeilen über die
    // Prozessgrenze.
    expect(alles).toBeGreaterThan(seite * 3);
  });

  it("liefert bei einem Ausschnitt trotzdem die volle Trefferzahl", () => {
    const zustand = baueLage(5_000);
    const ausschnitt = projektion.einheitentabelle(zustand, { von: 4_950, anzahl: SEITE });
    expect(ausschnitt.gesamtzahl).toBe(5_000);
    expect(ausschnitt.zeilen).toHaveLength(50);
  });
});
