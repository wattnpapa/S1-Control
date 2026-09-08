/**
 * Property-Tests P1 bis P6 aus dem Ereigniskatalog (Zieldatenmodell §4.4).
 *
 * ## Warum P1 hier keine Tautologie ist (Auflage 18)
 *
 * Auflage 18 verbietet, das Abbruchkriterium als Tautologie ueber die
 * Sortierfunktion zu fuehren. Ein Fold, der seine Eingabe erst sortiert und
 * dann der Reihenfolge nach anwendet, besteht P1 zwangslaeufig — beide Seiten
 * laufen dann durch dieselbe Sortierung, und der Test sagt nur aus, dass
 * `sort` deterministisch ist. Drei Vorkehrungen schliessen das hier aus:
 *
 * 1. **Der Fold sortiert nicht.** `fold.ts` nimmt jedes Ereignis einzeln in
 *    einen Akkumulator auf, der je Feld die beiden hoechsten Beobachtungen
 *    haelt. Es gibt keine Ereignisliste, die sortiert wuerde.
 * 2. **P1 vergleicht die echte Permutation gegen die Ausgangsreihenfolge**,
 *    und zwar ueber die kanonische Serialisierung nach §7.6 — nicht ueber
 *    einen Objektvergleich, der Feldreihenfolge oder fehlende Felder
 *    verschluckt. Verglichen wird der vollstaendige Zustand einschliesslich
 *    der Feld-HLC (§7.4) und der Konflikthinweise.
 * 3. **Gegenprobe.** Dieselbe Pruefung laeuft gegen `naivFalte` — einen Fold,
 *    der schlicht der Ankunftsreihenfolge folgt. Er faellt durch. Damit ist
 *    belegt, dass die Pruefung Unterscheidungskraft hat und nicht jeden
 *    beliebigen Fold durchwinkt.
 *
 * Der zweite Teil von P1 prueft den Live-Pfad: dieselbe Menge, in zufaellige
 * Schuebe zerlegt und nacheinander per `falteHinzu` in einen bestehenden
 * Zustand eingerechnet, ergibt denselben Zustand. Das ist der Rebase, und er
 * ist mit einem sortierenden Fold gar nicht darstellbar — er sieht die
 * Gesamtmenge nie.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { EingehendesEreignis, Ereignis, Staerke } from "./ereignis.js";
import { falte, falteHinzu, leereFaltung, materialisiere } from "./fold.js";
import { kanonischeSerialisierung, type KanonischerWert } from "./kanonisch.js";
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
import { AUFFANG_ABSCHNITT_ID, type Zustand } from "./zustand.js";

const CLIENTS = ["aa", "bb", "cc"] as const;
const ABSCHNITTE = ["A", "B", "C"] as const;
/** „D" kommt in keinem `AbschnittAngelegt` vor — der Fall fuer die Auffangregel (P5). */
const ZIELE = ["A", "B", "C", "D"] as const;
const EINHEITEN = ["U1", "U2", "U3"] as const;

// ---------------------------------------------------------------------------
// Erzeugung realistischer Ereignismengen
// ---------------------------------------------------------------------------

type Befehl =
  | { readonly art: "einsatz"; readonly client: string; readonly name: string }
  | { readonly art: "abschnitt"; readonly client: string; readonly abschnittId: string }
  | { readonly art: "einheit"; readonly client: string; readonly einheitId: string; readonly abschnittId: string }
  | { readonly art: "verschieben"; readonly client: string; readonly einheitId: string; readonly ziel: string; readonly vorherEcht: boolean }
  | { readonly art: "staerke"; readonly client: string; readonly einheitId: string; readonly neu: Staerke; readonly vorherEcht: boolean }
  | { readonly art: "fremd"; readonly client: string };

const clientArb = fc.constantFrom(...CLIENTS);
const staerkeArb: fc.Arbitrary<Staerke> = fc
  .tuple(fc.integer({ min: 0, max: 2 }), fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 20 }))
  .map(([f, uf, m]) => staerke(f, uf, m));

const befehlArb: fc.Arbitrary<Befehl> = fc.oneof(
  { arbitrary: fc.record({ art: fc.constant("einsatz" as const), client: clientArb, name: fc.constantFrom("Hochwasser", "Sturm", "Uebung") }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("abschnitt" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE) }), weight: 3 },
  { arbitrary: fc.record({ art: fc.constant("einheit" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), abschnittId: fc.constantFrom(...ZIELE) }), weight: 3 },
  { arbitrary: fc.record({ art: fc.constant("verschieben" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), ziel: fc.constantFrom(...ZIELE), vorherEcht: fc.boolean() }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("staerke" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), neu: staerkeArb, vorherEcht: fc.boolean() }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("fremd" as const), client: clientArb }), weight: 1 },
);

/**
 * Baut aus den Befehlen eine Ereignismenge in ihrer **Ausgangsreihenfolge**.
 *
 * Zwei Dinge sind hier absichtlich so und nicht anders:
 *
 *   * Je Client sind Laufnummer und HLC streng monoton (§3.3, §3.2) — das ist
 *     die Wirklichkeit, in der ein Client nur seine eigene Datei schreibt.
 *   * Die Ausgangsreihenfolge ist die **Ankunftsreihenfolge** und damit
 *     ausdruecklich *nicht* die HLC-Ordnung: die Clients ziehen ihre
 *     HLC-Takte aus getrennten Vorraeten. Genau dieser Unterschied macht P1
 *     zu einer Aussage; waeren beide Ordnungen gleich, koennte auch ein
 *     reihenfolgeabhaengiger Fold bestehen.
 */
function baueEreignisse(befehle: readonly Befehl[]): EingehendesEreignis[] {
  const laufnummern = new Map<string, number>();
  const takte = new Map<string, number>();
  // Der gesehene Stand je Bediener — der Vorher-Wert aus §2.5.
  const gesehenerAbschnitt = new Map<string, string>();
  const gesehendeStaerke = new Map<string, Staerke>();

  const ereignisse: EingehendesEreignis[] = [];
  for (const befehl of befehle) {
    const laufnummer = (laufnummern.get(befehl.client) ?? 0) + 1;
    laufnummern.set(befehl.client, laufnummer);
    // Getrennte Taktvorraete je Client: aa zaehlt ab 1000, bb ab 1300, cc ab
    // 1600, jeweils in Zehnerschritten. Innerhalb eines Clients monoton,
    // ueber die Clients hinweg verschraenkt.
    const basis = 1000 + CLIENTS.indexOf(befehl.client as (typeof CLIENTS)[number]) * 300;
    const takt = (takte.get(befehl.client) ?? 0) + 1;
    takte.set(befehl.client, takt);
    const h = hlc(basis + takt * 10, 0, befehl.client);

    switch (befehl.art) {
      case "einsatz":
        ereignisse.push(
          einsatzAngelegt(h, laufnummer, {
            einsatzId: "E",
            name: befehl.name,
            art: "EINSATZ",
            fuestName: "FueSt Oldenburg",
            beginn: "2026-09-08T08:00:00+02:00",
            schichtmodell: "ZWEI_SCHICHT",
          }),
        );
        break;

      case "abschnitt":
        ereignisse.push(
          abschnittAngelegt(h, laufnummer, {
            abschnittId: befehl.abschnittId,
            name: `Abschnitt ${befehl.abschnittId}`,
            abschnittstyp: "EINSATZORT",
            reihenfolge: ABSCHNITTE.indexOf(befehl.abschnittId as (typeof ABSCHNITTE)[number]),
          }),
        );
        break;

      case "einheit":
        ereignisse.push(
          einheitGemeldet(h, laufnummer, {
            einheitId: befehl.einheitId,
            abschnittId: befehl.abschnittId,
            bezeichnung: `Einheit ${befehl.einheitId}`,
            organisation: "THW",
            ebene: "GRUPPE",
            staerke: staerke(0, 1, 8),
            personalErfassung: "NUR_STAERKE",
            status: "IM_EINSATZ",
            schicht: "TAG",
          }),
        );
        gesehenerAbschnitt.set(befehl.einheitId, befehl.abschnittId);
        gesehendeStaerke.set(befehl.einheitId, staerke(0, 1, 8));
        break;

      case "verschieben": {
        const echt = gesehenerAbschnitt.get(befehl.einheitId) ?? "A";
        const vorher = befehl.vorherEcht ? echt : "C";
        ereignisse.push(einheitVerschoben(h, laufnummer, befehl.einheitId, vorher, befehl.ziel));
        gesehenerAbschnitt.set(befehl.einheitId, befehl.ziel);
        break;
      }

      case "staerke": {
        const echt = gesehendeStaerke.get(befehl.einheitId) ?? staerke(0, 1, 8);
        const vorher = befehl.vorherEcht ? echt : staerke(9, 9, 9);
        ereignisse.push(staerkeGeaendert(h, laufnummer, befehl.einheitId, vorher, befehl.neu));
        gesehendeStaerke.set(befehl.einheitId, befehl.neu);
        break;
      }

      case "fremd":
        ereignisse.push(fremdesEreignis(h, laufnummer, "EinsatzArchiviert"));
        break;
    }
  }
  return ereignisse;
}

const ereignismengeArb = fc
  .array(befehlArb, { minLength: 4, maxLength: 40 })
  .map((befehle) => baueEreignisse(befehle));

/** Menge in Ausgangsreihenfolge plus eine echte Permutation derselben Menge. */
const mengeUndPermutation = ereignismengeArb.chain((menge) =>
  fc.tuple(
    fc.constant(menge),
    fc.shuffledSubarray(menge, { minLength: menge.length, maxLength: menge.length }),
  ),
);

/** Der Vergleichsmassstab nach §7.6 — nicht `toEqual`. */
function kanon(zustand: Zustand): string {
  return kanonischeSerialisierung(zustand as unknown as KanonischerWert);
}

// ---------------------------------------------------------------------------
// Die Gegenprobe: ein reihenfolgeabhaengiger Fold
// ---------------------------------------------------------------------------

/** Der Zustand auf die blossen Werte verkuerzt — die Vergleichsbasis der Gegenprobe. */
interface NurWerte {
  readonly einsatzName?: string;
  readonly abschnitte: Record<string, string>;
  readonly einheiten: Record<string, { abschnittId: string; staerke: Staerke }>;
}

function nurWerte(zustand: Zustand): NurWerte {
  const abschnitte: Record<string, string> = {};
  for (const [id, abschnitt] of Object.entries(zustand.abschnitte)) {
    if (id !== AUFFANG_ABSCHNITT_ID) abschnitte[id] = abschnitt.name.wert;
  }
  const einheiten: Record<string, { abschnittId: string; staerke: Staerke }> = {};
  for (const [id, einheit] of Object.entries(zustand.einheiten)) {
    einheiten[id] = { abschnittId: einheit.abschnittId.wert, staerke: einheit.staerke.wert };
  }
  return { einsatzName: zustand.einsatz?.name.wert, abschnitte, einheiten };
}

/**
 * Ein Fold, der schlicht der Ankunftsreihenfolge folgt: der zuletzt
 * eingetroffene Schreiber gewinnt, die HLC bleibt unbeachtet.
 *
 * Das ist die naheliegende falsche Umsetzung — und genau der Fold, den P1
 * aussortieren muss. Er steht hier, damit die Pruefung ihre
 * Unterscheidungskraft belegen kann statt sie zu behaupten.
 */
function naivFalte(ereignisse: readonly EingehendesEreignis[]): NurWerte {
  let einsatzName: string | undefined;
  const abschnitte: Record<string, string> = {};
  const einheiten: Record<string, { abschnittId: string; staerke: Staerke }> = {};

  for (const ereignis of ereignisse) {
    const bekannt = ereignis as Ereignis;
    switch (bekannt.typ) {
      case "EinsatzAngelegt":
        einsatzName ??= bekannt.nutzlast.name;
        break;
      case "AbschnittAngelegt":
        abschnitte[bekannt.nutzlast.abschnittId] = `Abschnitt ${bekannt.nutzlast.abschnittId}`;
        break;
      case "EinheitGemeldet":
        einheiten[bekannt.nutzlast.einheitId] = {
          abschnittId: bekannt.nutzlast.abschnittId,
          staerke: bekannt.nutzlast.staerke,
        };
        break;
      case "EinheitVerschoben": {
        const bisher = einheiten[bekannt.nutzlast.einheitId];
        if (bisher !== undefined) bisher.abschnittId = bekannt.neu;
        break;
      }
      case "StaerkeGeaendert": {
        const bisher = einheiten[bekannt.nutzlast.einheitId];
        if (bisher !== undefined) bisher.staerke = bekannt.neu;
        break;
      }
      default:
        break;
    }
  }
  return { einsatzName, abschnitte, einheiten };
}

// ---------------------------------------------------------------------------
// P1 Kommutativitaet
// ---------------------------------------------------------------------------

describe("P1 Kommutativitaet — jede Permutation ergibt denselben Zustand", () => {
  it("vergleicht Permutation gegen Ausgangsreihenfolge ueber die kanonische Serialisierung (§7.6)", () => {
    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        expect(kanon(falte(permutation))).toBe(kanon(falte(ausgang)));
      }),
      { numRuns: 300 },
    );
  });

  it("gilt auch fuer den Live-Pfad: beliebige Schuebe per falteHinzu (Rebase)", () => {
    fc.assert(
      fc.property(mengeUndPermutation, fc.integer({ min: 1, max: 6 }), ([ausgang, permutation], schubgroesse) => {
        let faltung = leereFaltung();
        for (let i = 0; i < permutation.length; i += schubgroesse) {
          faltung = falteHinzu(faltung, permutation.slice(i, i + schubgroesse));
        }
        expect(kanon(materialisiere(faltung))).toBe(kanon(falte(ausgang)));
      }),
      { numRuns: 300 },
    );
  });

  it("Gegenprobe: ein Fold nach Ankunftsreihenfolge faellt an dieser Pruefung durch", () => {
    // Zwei Clients aendern dieselbe Staerke. bb hat die hoehere HLC und muss
    // gewinnen — unabhaengig davon, wer zuerst ankommt.
    const anlage = [
      einsatzAngelegt(hlc(1000, 0, "aa"), 1, {
        einsatzId: "E",
        name: "Hochwasser",
        art: "EINSATZ",
        fuestName: "FueSt",
        beginn: "2026-09-08T08:00:00+02:00",
        schichtmodell: "ZWEI_SCHICHT",
      }),
      abschnittAngelegt(hlc(1010, 0, "aa"), 2, {
        abschnittId: "A",
        name: "Abschnitt A",
        abschnittstyp: "EINSATZORT",
        reihenfolge: 0,
      }),
      einheitGemeldet(hlc(1020, 0, "aa"), 3, {
        einheitId: "U1",
        abschnittId: "A",
        bezeichnung: "Einheit U1",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: staerke(0, 1, 8),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
        schicht: "TAG",
      }),
    ];
    const frueher = staerkeGeaendert(hlc(2000, 0, "aa"), 4, "U1", staerke(0, 1, 8), staerke(1, 1, 1));
    const spaeter = staerkeGeaendert(hlc(3000, 0, "bb"), 1, "U1", staerke(0, 1, 8), staerke(2, 2, 2));

    const ausgang = [...anlage, frueher, spaeter];
    const permutation = [...anlage, spaeter, frueher];

    // Der echte Fold: gleiches Ergebnis, und zwar das nach HLC richtige.
    expect(kanon(falte(permutation))).toBe(kanon(falte(ausgang)));
    expect(falte(ausgang).einheiten["U1"]?.staerke.wert).toEqual(staerke(2, 2, 2));

    // Der naive Fold: unterschiedliches Ergebnis. Waere P1 eine Tautologie
    // ueber eine Sortierfunktion, koennte auch er nicht durchfallen.
    const naivAusgang = kanonischeSerialisierung(naivFalte(ausgang) as unknown as KanonischerWert);
    const naivPermutation = kanonischeSerialisierung(naivFalte(permutation) as unknown as KanonischerWert);
    expect(naivPermutation).not.toBe(naivAusgang);

    // Und derselbe Vergleich auf derselben Vergleichsbasis: der echte Fold
    // ist auch auf die blossen Werte verkuerzt reihenfolgeunabhaengig.
    expect(kanonischeSerialisierung(nurWerte(falte(permutation)) as unknown as KanonischerWert)).toBe(
      kanonischeSerialisierung(nurWerte(falte(ausgang)) as unknown as KanonischerWert),
    );
  });

  it("der Akkumulator behaelt die Ereignisse nicht — ein nachtraegliches Sortieren ist ausgeschlossen", () => {
    // Der schaerfste maschinelle Beleg gegen die Tautologie aus Auflage 18:
    // Wer sortieren wollte, muesste die Ereignisse aufheben. Der Akkumulator
    // haelt je Feld hoechstens zwei Beobachtungen — die dritte ist danach
    // nirgends mehr auffindbar.
    const anlage = einheitGemeldet(hlc(1000, 0, "aa"), 1, {
      einheitId: "U1",
      abschnittId: "A",
      bezeichnung: "Einheit U1",
      organisation: "THW",
      ebene: "GRUPPE",
      staerke: staerke(0, 1, 8),
      personalErfassung: "NUR_STAERKE",
      status: "IM_EINSATZ",
      schicht: "TAG",
    });
    // Diese Beobachtung ist die niedrigste, und ihr Wert 444 taucht in keiner
    // anderen als gesehener Vorher-Wert auf — sie muss spurlos verschwinden.
    const niedrigste = staerkeGeaendert(hlc(1500, 0, "aa"), 2, "U1", staerke(0, 1, 8), staerke(0, 0, 444));
    const vorletzte = staerkeGeaendert(hlc(2000, 0, "aa"), 3, "U1", staerke(0, 1, 8), staerke(0, 0, 111));
    const mittlere = staerkeGeaendert(hlc(3000, 0, "bb"), 1, "U1", staerke(0, 0, 111), staerke(0, 0, 222));
    const hoechste = staerkeGeaendert(hlc(4000, 0, "cc"), 1, "U1", staerke(0, 0, 222), staerke(0, 0, 333));

    const faltung = falteHinzu(leereFaltung(), [anlage, niedrigste, vorletzte, mittlere, hoechste]);
    const abzug = JSON.stringify(faltung, (_schluessel, wert: unknown) =>
      wert instanceof Map || wert instanceof Set ? [...(wert as Iterable<unknown>)] : wert,
    );

    expect(abzug).toContain("333"); // Gewinner
    expect(abzug).toContain("222"); // Zweiter, fuer den Konflikthinweis nach §2.5
    expect(abzug).not.toContain("444"); // alles darunter ist fort
  });

  it("Gegenprobe ueber erzeugte Mengen: der naive Fold faellt regelmaessig durch", () => {
    let unterschiede = 0;
    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        const links = kanonischeSerialisierung(naivFalte(ausgang) as unknown as KanonischerWert);
        const rechts = kanonischeSerialisierung(naivFalte(permutation) as unknown as KanonischerWert);
        if (links !== rechts) unterschiede += 1;
        // Der echte Fold bleibt auf derselben Vergleichsbasis gleich.
        expect(kanonischeSerialisierung(nurWerte(falte(permutation)) as unknown as KanonischerWert)).toBe(
          kanonischeSerialisierung(nurWerte(falte(ausgang)) as unknown as KanonischerWert),
        );
      }),
      { numRuns: 300 },
    );
    expect(unterschiede).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// P2 Idempotenz
// ---------------------------------------------------------------------------

describe("P2 Idempotenz — doppelt gefaltete Ereignisse aendern den Zustand nicht", () => {
  it("gilt fuer die ganze Menge und fuer einzelne Wiederholungen (§4.1 Regel 2)", () => {
    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        expect(kanon(falte([...ausgang, ...permutation]))).toBe(kanon(falte(ausgang)));
        expect(kanon(falte([...ausgang, ...ausgang, ...permutation]))).toBe(kanon(falte(ausgang)));
      }),
      { numRuns: 200 },
    );
  });

  it("gilt auch im Live-Pfad: dieselbe Menge zweimal einrechnen aendert nichts", () => {
    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        const einmal = falteHinzu(leereFaltung(), ausgang);
        const zweimal = falteHinzu(einmal, permutation);
        expect(kanon(materialisiere(zweimal))).toBe(kanon(materialisiere(einmal)));
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// P3 Konvergenz
// ---------------------------------------------------------------------------

describe("P3 Konvergenz — gleiche Ereignismenge, gleicher Zustand samt Hinweisen", () => {
  it("zwei Clients mit derselben Menge, aber verschiedener Ankunft und Schubgroesse", () => {
    fc.assert(
      fc.property(
        mengeUndPermutation,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 7 }),
        ([ausgang, permutation], schubA, schubB) => {
          const laufe = (menge: readonly EingehendesEreignis[], schub: number): Zustand => {
            let faltung = leereFaltung();
            for (let i = 0; i < menge.length; i += schub) {
              faltung = falteHinzu(faltung, menge.slice(i, i + schub));
            }
            return materialisiere(faltung);
          };

          const clientA = laufe(ausgang, schubA);
          const clientB = laufe(permutation, schubB);

          // §7.6: gleicher Versionsvektor — hier gleiche Ereignismenge — muss
          // dieselbe kanonische Serialisierung ergeben. Alles andere ist der
          // rote Ausgang, an dem M0 abbricht.
          expect(kanon(clientB)).toBe(kanon(clientA));
          // Die Konflikthinweise sind ausdruecklich Teil des Zustands (§4.4 P3).
          expect(clientB.hinweise).toEqual(clientA.hinweise);
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ---------------------------------------------------------------------------
// P4 Summenerhaltung — noch nicht im Minimalset
// ---------------------------------------------------------------------------

describe("P4 Summenerhaltung", () => {
  it.skip(
    "EinheitAufgeteilt + EinheitZusammengefuehrt lassen die Gesamtstaerke unveraendert " +
      "— braucht die beiden Ereignisarten, die erst M1.2/M1.3 liefern",
    () => {
      // Bewusst uebersprungen und nicht ersatzweise anders formuliert:
      // P4 ist eine Aussage ueber die relative Reduktion der Quellstaerke bei
      // `EinheitAufgeteilt` und die additive Zielstaerke bei
      // `EinheitZusammengefuehrt` (Zieldatenmodell §4.2). Beide Arten gehoeren
      // nicht zu den fuenf Arten, die M0.2 abgrenzt. Ein Ersatztest ueber
      // `StaerkeGeaendert` waere kein P4, sondern eine andere Aussage unter
      // demselben Namen — und damit genau die Art von Schein-Gruen, die
      // Auflage 18 fuer P1 verbietet.
    },
  );
});

// ---------------------------------------------------------------------------
// P5 Kein Waisenzustand
// ---------------------------------------------------------------------------

describe("P5 Kein Waisenzustand — keine Einheit haengt in einem Abschnitt, den es nicht gibt", () => {
  it("gilt fuer jede erzeugte Menge, auch mit Verweisen ins Leere", () => {
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const zustand = falte(menge);
        for (const einheit of Object.values(zustand.einheiten)) {
          expect(Object.hasOwn(zustand.abschnitte, einheit.wirksamerAbschnittId)).toBe(true);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("die Erzeugung trifft den Fall auch wirklich", () => {
    // Ohne diesen Nachweis waere der Test oben moeglicherweise leer: die
    // Erzeugung muss Verweise auf den nirgends angelegten Abschnitt „D"
    // tatsaechlich hervorbringen.
    let getroffen = 0;
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const zustand = falte(menge);
        if (zustand.hinweise.some((h) => h.art === "abschnittUnbekannt")) getroffen += 1;
      }),
      { numRuns: 300 },
    );
    expect(getroffen).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// P6 Monotone Zustandsmaschine — noch nicht im Minimalset
// ---------------------------------------------------------------------------

describe("P6 Monotone Zustandsmaschine", () => {
  it.skip(
    "Anforderung.zustand geht nie von EINGETROFFEN zurueck " +
      "— braucht die Entitaet Anforderung, die erst M1.2/M1.3 liefert",
    () => {
      // Die Zustandsmaschine OFFEN | ZUGESAGT -> EINGETROFFEN haengt an
      // `AnforderungAngelegt`, `AbloesungZugesagt`, `AnforderungErledigt` und
      // `AnforderungStorniert` (Zieldatenmodell §4.2). Keine dieser Arten
      // gehoert zum Minimalset von M0.2; unter den fuenf Arten gibt es
      // ueberhaupt keine monotone Zustandsmaschine, auf die sich P6 sinnvoll
      // beziehen liesse.
    },
  );
});
