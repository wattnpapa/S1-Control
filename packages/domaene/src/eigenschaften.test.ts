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
 * 4. **Die Erzeugung wird gemessen, nicht behauptet.** Ein Property-Test ist
 *    nur so viel wert wie seine Eingaben. Der Block „Die erzeugten
 *    Ereignismengen sind aussagekraeftig" haelt fest, dass die HLC-Ordnung in
 *    der ueberwiegenden Zahl der Laeufe von der Ordnung nach `(clientId,
 *    laufnummer)` abweicht — sonst pruefte P1 nicht, dass *die HLC*
 *    entscheidet, sondern nur Reihenfolgeunabhaengigkeit im Allgemeinen —,
 *    und dass HLC-Gleichstaende (geklontes Profil) **auf demselben Feld**
 *    tatsaechlich vorkommen — nur die kann der Gleichstandsbruch in
 *    `vergleicheBeobachtung` ueberhaupt entscheiden.
 *
 * Der zweite Teil von P1 prueft den Live-Pfad: dieselbe Menge, in zufaellige
 * Schuebe zerlegt und nacheinander per `falteHinzu` in einen bestehenden
 * Zustand eingerechnet, ergibt denselben Zustand. Das ist der Rebase, und er
 * ist mit einem sortierenden Fold gar nicht darstellbar — er sieht die
 * Gesamtmenge nie.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { staerkeGeklemmt, type Staerke } from "./werte.js";
import {
  falte,
  falteHinzu,
  leereFaltung,
  materialisiere,
  type EingehendesEreignis,
} from "./fold.js";
import { vergleicheHlc, type Hlc } from "./hlc.js";
import { vergleicheNachCodepunkt } from "./kanonisch.js";
import { kanonischeSerialisierung, type KanonischerWert } from "./kanonisch.js";

import { SCHEMA_VERSION, ereignisId } from "./ereignis.js";
import {
  abschnittAngelegt,
  akteur,
  einheitGemeldet,
  einheitVerschoben,
  einsatzAngelegt,
  fremdesEreignis,
  hlc,
  staerke,
  staerkeGeaendert,
} from "./pruefhilfen/ereignisbau.js";
import { EINGANG_ABSCHNITT_ID, type Zustand } from "./zustand.js";

const CLIENTS = ["aa", "bb", "cc"] as const;
const ABSCHNITTE = ["A", "B", "C"] as const;
/** „D" kommt in keinem `AbschnittAngelegt` vor — der Fall fuer die Eingangsregel (P5). */
const ZIELE = ["A", "B", "C", "D"] as const;
const EINHEITEN = ["U1", "U2", "U3"] as const;
/** Die Ids, unter denen eine Aufteilung ihre neue Einheit anlegt. */
const TEILEINHEITEN = ["V1", "V2", "V3"] as const;
const ANFORDERUNGEN = ["AN1", "AN2"] as const;
/** Nicht zaehlende Typen — §11.1 verlangt Mengen mit ihnen. */
const NICHT_ZAEHLEND = ["ANGEFORDERT", "ARCHIV"] as const;

// ---------------------------------------------------------------------------
// Erzeugung realistischer Ereignismengen
// ---------------------------------------------------------------------------

type Befehl =
  | { readonly art: "einsatz"; readonly client: string; readonly name: string }
  | { readonly art: "abschnitt"; readonly client: string; readonly abschnittId: string }
  | { readonly art: "einheit"; readonly client: string; readonly einheitId: string; readonly abschnittId: string }
  | { readonly art: "verschieben"; readonly client: string; readonly einheitId: string; readonly ziel: string; readonly vorherEcht: boolean }
  | { readonly art: "staerke"; readonly client: string; readonly einheitId: string; readonly neu: Staerke; readonly vorherEcht: boolean }
  | { readonly art: "status"; readonly client: string; readonly einheitId: string; readonly neu: string }
  | { readonly art: "aufteilen"; readonly client: string; readonly quelle: string; readonly neueId: string; readonly ab: Staerke; readonly gesehenEcht: boolean }
  | { readonly art: "zusammenfuehren"; readonly client: string; readonly ziel: string; readonly quelle: string; readonly gesehenEcht: boolean }
  | { readonly art: "entfernen"; readonly client: string; readonly einheitId: string }
  | { readonly art: "wiederherstellen"; readonly client: string; readonly einheitId: string }
  | { readonly art: "typAendern"; readonly client: string; readonly abschnittId: string; readonly typ: string }
  | { readonly art: "aufloesen"; readonly client: string; readonly abschnittId: string; readonly ziel: string }
  | { readonly art: "umhaengen"; readonly client: string; readonly abschnittId: string; readonly parent: string }
  | { readonly art: "anforderung"; readonly client: string; readonly anforderungId: string }
  | { readonly art: "zusage"; readonly client: string; readonly anforderungId: string }
  | { readonly art: "erledigt"; readonly client: string; readonly anforderungId: string }
  | { readonly art: "storno"; readonly client: string; readonly anforderungId: string }
  | { readonly art: "erledigungZurueck"; readonly client: string; readonly anforderungId: string }
  | { readonly art: "fremd"; readonly client: string };

/**
 * Das geklonte Profil (03-MEILENSTEINE.md, M0-Fehlerinjektion).
 *
 * Ein geklontes Profil schreibt unter derselben `clientId` mit einem eigenen
 * Laufnummern- und Uhrenlauf. Damit entstehen zwei **verschiedene** Ereignisse
 * mit derselben HLC — der einzige Weg, wie ein HLC-Gleichstand ueberhaupt
 * zustande kommt, weil die `clientId` sonst jeden Gleichstand bricht (§3.2).
 * Ohne diesen Fall koennte kein Property-Test pruefen, ob der Fold auch dann
 * eine Mengenfunktion bleibt.
 */
const KLON_VON = "aa";
const KLON_LAUFNUMMER_VERSATZ = 500;

const clientArb = fc.constantFrom(...CLIENTS);
const staerkeArb: fc.Arbitrary<Staerke> = fc
  .tuple(fc.integer({ min: 0, max: 2 }), fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 20 }))
  .map(([f, uf, m]) => staerke(f, uf, m));

const befehlArb: fc.Arbitrary<Befehl> = fc.oneof(
  { arbitrary: fc.record({ art: fc.constant("einsatz" as const), client: clientArb, name: fc.constantFrom("Hochwasser", "Sturm", "Uebung") }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("abschnitt" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE) }), weight: 3 },
  { arbitrary: fc.record({ art: fc.constant("einheit" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), abschnittId: fc.constantFrom(...ZIELE) }), weight: 4 },
  { arbitrary: fc.record({ art: fc.constant("verschieben" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), ziel: fc.constantFrom(...ZIELE), vorherEcht: fc.boolean() }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("staerke" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), neu: staerkeArb, vorherEcht: fc.boolean() }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("status" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), neu: fc.constantFrom("IM_EINSATZ", "RUHE", "RUECKMARSCH", "SELTSAM") }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("aufteilen" as const), client: clientArb, quelle: fc.constantFrom(...EINHEITEN), neueId: fc.constantFrom(...TEILEINHEITEN), ab: staerkeArb, gesehenEcht: fc.boolean() }), weight: 4 },
  { arbitrary: fc.record({ art: fc.constant("zusammenfuehren" as const), client: clientArb, ziel: fc.constantFrom(...EINHEITEN, ...TEILEINHEITEN), quelle: fc.constantFrom(...EINHEITEN, ...TEILEINHEITEN), gesehenEcht: fc.boolean() }), weight: 4 },
  { arbitrary: fc.record({ art: fc.constant("entfernen" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN, ...TEILEINHEITEN) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("wiederherstellen" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN, ...TEILEINHEITEN) }), weight: 1 },
  { arbitrary: fc.record({ art: fc.constant("typAendern" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE), typ: fc.constantFrom(...NICHT_ZAEHLEND, "EINSATZORT") }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("aufloesen" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE), ziel: fc.constantFrom(...ZIELE) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("umhaengen" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE), parent: fc.constantFrom(...ABSCHNITTE) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("anforderung" as const), client: clientArb, anforderungId: fc.constantFrom(...ANFORDERUNGEN) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("zusage" as const), client: clientArb, anforderungId: fc.constantFrom(...ANFORDERUNGEN) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("erledigt" as const), client: clientArb, anforderungId: fc.constantFrom(...ANFORDERUNGEN) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("storno" as const), client: clientArb, anforderungId: fc.constantFrom(...ANFORDERUNGEN) }), weight: 1 },
  { arbitrary: fc.record({ art: fc.constant("erledigungZurueck" as const), client: clientArb, anforderungId: fc.constantFrom(...ANFORDERUNGEN) }), weight: 1 },
  { arbitrary: fc.record({ art: fc.constant("fremd" as const), client: clientArb }), weight: 1 },
);

/** `true`, wenn dieser Befehl vom geklonten Profil stammt. */
const klonArb = fc.boolean();

/** Die HLC-Takte je Client: gemeinsamer Vorrat, eigener Versatz, absichtlich mit Gleichstaenden. */
interface Taktplan {
  /** Startmillisekunde je Client. Gleiche Werte sind erlaubt und erwuenscht. */
  readonly versatz: Readonly<Record<string, number>>;
  /** Schrittweite je Client. Kleine Werte erzeugen Ueberschneidungen. */
  readonly schritt: Readonly<Record<string, number>>;
  /**
   * Ein **gemeinsamer** Takt: Jedes Ereignis bekommt die naechste
   * Millisekunde, gleich von welchem Client.
   *
   * Damit faellt die HLC-Ordnung mit der Befehlsreihenfolge zusammen, und ein
   * Praefix ist vollstaendig. Fuer P1 waere das die falsche Wahl — dort ist
   * gerade der Unterschied zwischen Ankunft und HLC die Aussage. Fuer P4 ist
   * es die richtige: §11.1 begrenzt den Anteil der uebersprungenen Vorgaenge
   * auf ein Fuenftel, und mit lauter vorauslaufenden Uhren praeft der Stand
   * fast nichts. Vorauslaufende Uhren bleiben trotzdem im Bild, weil die
   * P4-Menge sie ueber die Ausreisser unten einstreut.
   */
  readonly gemeinsam?: true;
  /**
   * `gesehen` der strukturellen Vorgaenge aus dem **gefalteten Zustand**
   * nehmen statt aus der eigenen Staerke.
   *
   * Ein Bediener sieht auf der Maske die **wirksame** Staerke (§5.4.2), nicht
   * die eigene. Nimmt der Generator die eigene, weicht `gesehen` nach jeder
   * Aufteilung ab, und `vorgangSummeWeichtAb` sperrt nach §8.1 Bedingung (i)
   * jeden weiteren Vorgang derselben Menge — der Pruefstand misst dann fast
   * nichts. Was uebrig bleibt, ist der echte Fall aus T126: eine Aufteilung
   * **nach** der Zusammenfuehrung ihrer Quelle.
   */
  readonly echteStaerke?: true;
}

const taktplanArb: fc.Arbitrary<Taktplan> = fc
  .tuple(
    fc.array(fc.integer({ min: 0, max: 3 }), { minLength: CLIENTS.length, maxLength: CLIENTS.length }),
    fc.array(fc.integer({ min: 1, max: 3 }), { minLength: CLIENTS.length, maxLength: CLIENTS.length }),
  )
  .map(([versaetze, schritte]) => {
    const versatz: Record<string, number> = {};
    const schritt: Record<string, number> = {};
    CLIENTS.forEach((client, i) => {
      versatz[client] = 1000 + (versaetze[i] as number);
      schritt[client] = schritte[i] as number;
    });
    return { versatz, schritt };
  });

/** Bezugspunkt der abgeleiteten Wanduhr — derselbe wie in den Bauhilfen. */
const BEZUG = Date.parse("2026-09-08T08:00:00+02:00");

/**
 * Baut ein Ereignis beliebiger Katalogart.
 *
 * Die Bauhilfen decken nur die haeufigsten Arten ab; der Pruefstand braucht
 * alle, die eine Eigenschaft beruehren.
 */
function bau(
  h: Hlc,
  laufnummer: number,
  typ: string,
  nutzlast: unknown,
  weiteres: Partial<EingehendesEreignis> = {},
): EingehendesEreignis {
  return {
    id: ereignisId(h.clientId, laufnummer),
    hlc: h,
    schemaVersion: SCHEMA_VERSION,
    akteur: akteur(h.clientId),
    wanduhr: new Date(BEZUG + h.millisekunden).toISOString(),
    typ,
    nutzlast,
    ...weiteres,
  };
}

/**
 * Baut aus den Befehlen eine Ereignismenge in ihrer **Ausgangsreihenfolge**.
 *
 * Drei Dinge sind hier absichtlich so und nicht anders:
 *
 *   * Je Client sind Laufnummer und HLC streng monoton (§3.3, §3.2) — das ist
 *     die Wirklichkeit, in der ein Client nur seine eigene Datei schreibt.
 *   * Die Ausgangsreihenfolge ist die **Ankunftsreihenfolge** und damit
 *     ausdruecklich *nicht* die HLC-Ordnung. Genau dieser Unterschied macht
 *     P1 zu einer Aussage; waeren beide Ordnungen gleich, koennte auch ein
 *     reihenfolgeabhaengiger Fold bestehen.
 *   * Die Taktvorraete der Clients **ueberlappen** und erzeugen absichtlich
 *     HLC-Gleichstaende. Ohne diese Ueberlappung waere die HLC-Ordnung mit
 *     der Sortierung nach `(clientId, laufnummer)` identisch, und die
 *     Property-Tests koennten nicht mehr pruefen, dass wirklich *die HLC*
 *     entscheidet — sie sagten dann nur noch etwas ueber
 *     Reihenfolgeunabhaengigkeit im Allgemeinen aus.
 */
function baueEreignisse(
  befehle: readonly Befehl[],
  plan: Taktplan,
  klone: readonly boolean[],
): EingehendesEreignis[] {
  const laufnummern = new Map<string, number>();
  const takte = new Map<string, number>();
  // Der gesehene Stand je Bediener — der Vorher-Wert aus §2.5.
  const gesehenerAbschnitt = new Map<string, string>();
  const gesehendeStaerke = new Map<string, Staerke>();

  const ereignisse: EingehendesEreignis[] = [];
  befehle.forEach((befehl, i) => {
    // Der Klon tritt unter der clientId von KLON_VON auf, fuehrt aber eigene
    // Laufnummern und eine eigene Uhr — daher die getrennten Zaehler.
    const istKlon = befehl.client === KLON_VON && (klone[i] ?? false);
    const zaehlerSchluessel = istKlon ? `${befehl.client}#klon` : befehl.client;
    const laufnummer =
      (laufnummern.get(zaehlerSchluessel) ?? (istKlon ? KLON_LAUFNUMMER_VERSATZ : 0)) + 1;
    laufnummern.set(zaehlerSchluessel, laufnummer);
    const takt = (takte.get(zaehlerSchluessel) ?? 0) + 1;
    takte.set(zaehlerSchluessel, takt);
    const gemeinsamerTakt = (takte.get("#gemeinsam") ?? 0) + 1;
    takte.set("#gemeinsam", gemeinsamerTakt);
    const h =
      plan.gemeinsam === true
        ? hlc(1000 + gemeinsamerTakt * 2, 0, befehl.client)
        : hlc(
            (plan.versatz[befehl.client] as number) + takt * (plan.schritt[befehl.client] as number),
            0,
            befehl.client,
          );

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

      case "status":
        ereignisse.push(
          bau(h, laufnummer, "StatusGesetzt", { einheitId: befehl.einheitId }, {
            vorher: "IM_EINSATZ",
            neu: befehl.neu,
          }),
        );
        break;

      case "aufteilen": {
        // **Geklemmt**: Die Maske zeigt die geklemmte Staerke (§5.4.2), und
        // `zStaerke` verlangt nichtnegative Zahlen (§5.1) — ein negatives
        // `gesehen` waere eine ungueltige Nutzlast und kein Bediener koennte
        // es eintragen.
        const echt =
          plan.echteStaerke === true
            ? staerkeGeklemmt(
                falte(ereignisse).einheiten[befehl.quelle]?.wirksameStaerkeRechnerisch ??
                  staerke(0, 1, 8),
              )
            : (gesehendeStaerke.get(befehl.quelle) ?? staerke(0, 1, 8));
        const gesehen = befehl.gesehenEcht ? echt : staerke(9, 9, 9);
        ereignisse.push(
          bau(h, laufnummer, "EinheitAufgeteilt", {
            quellEinheitId: befehl.quelle,
            neueEinheitId: befehl.neueId,
            neueEinheit: {
              abschnittId: "A",
              bezeichnung: `Teil ${befehl.neueId}`,
              organisation: "THW",
              hierarchie: [],
              ebene: "TRUPP",
              staerke: befehl.ab,
              personalErfassung: "NUR_STAERKE",
              status: "IM_EINSATZ",
              reihenfolge: 0,
              istFuehrungDesAbschnitts: false,
            },
            abgeteilteStaerke: befehl.ab,
            gesehen,
            uebernommeneFahrzeuge: [],
            uebernommenePersonen: [],
          }),
        );
        gesehendeStaerke.set(befehl.neueId, befehl.ab);
        gesehenerAbschnitt.set(befehl.neueId, "A");
        break;
      }

      case "zusammenfuehren": {
        if (befehl.ziel === befehl.quelle) break; // §5.4.3: im Schema ungueltig
        // **Geklemmt**: Die Maske zeigt die geklemmte Staerke (§5.4.2), und
        // `zStaerke` verlangt nichtnegative Zahlen (§5.1) — ein negatives
        // `gesehen` waere eine ungueltige Nutzlast und kein Bediener koennte
        // es eintragen.
        const echt =
          plan.echteStaerke === true
            ? staerkeGeklemmt(
                falte(ereignisse).einheiten[befehl.quelle]?.wirksameStaerkeRechnerisch ??
                  staerke(0, 1, 8),
              )
            : (gesehendeStaerke.get(befehl.quelle) ?? staerke(0, 1, 8));
        ereignisse.push(
          bau(h, laufnummer, "EinheitZusammengefuehrt", {
            zielEinheitId: befehl.ziel,
            quellen: [
              {
                einheitId: befehl.quelle,
                gesehen: befehl.gesehenEcht ? echt : staerke(9, 9, 9),
              },
            ],
          }),
        );
        break;
      }

      case "entfernen":
        ereignisse.push(
          bau(h, laufnummer, "EinheitEntfernt", { einheitId: befehl.einheitId }, {
            neu: true,
            grund: "im Pruefstand entfernt",
          }),
        );
        break;

      case "wiederherstellen":
        ereignisse.push(
          bau(h, laufnummer, "EinheitWiederhergestellt", { einheitId: befehl.einheitId }, {
            neu: false,
          }),
        );
        break;

      case "typAendern":
        ereignisse.push(
          bau(h, laufnummer, "AbschnittTypGeaendert", { abschnittId: befehl.abschnittId }, {
            vorher: "EINSATZORT",
            neu: befehl.typ,
            grund: "im Pruefstand umgetypt",
          }),
        );
        break;

      case "aufloesen":
        ereignisse.push(
          bau(h, laufnummer, "AbschnittAufgeloest", { abschnittId: befehl.abschnittId }, {
            neu: {
              zielAbschnittId: befehl.ziel,
              aufgeloestAm: "2026-09-08T10:00:00+02:00",
            },
          }),
        );
        break;

      case "umhaengen":
        ereignisse.push(
          bau(h, laufnummer, "AbschnittUmgehaengt", { abschnittId: befehl.abschnittId }, {
            neu: befehl.parent,
          }),
        );
        break;

      case "anforderung":
        ereignisse.push(
          bau(h, laufnummer, "AnforderungAngelegt", {
            anforderungId: befehl.anforderungId,
            angefordertAm: "2026-09-08T09:00:00+02:00",
            kennung: "FueSt-1",
          }),
        );
        break;

      case "zusage":
        ereignisse.push(
          bau(h, laufnummer, "AbloesungZugesagt", { anforderungId: befehl.anforderungId }, {
            neu: { zugesagtFuer: "2026-09-08T12:00:00+02:00", zugesagtVon: "Regionalstelle" },
          }),
        );
        break;

      case "erledigt":
        ereignisse.push(
          bau(h, laufnummer, "AnforderungErledigt", { anforderungId: befehl.anforderungId }, {
            neu: { erledigtAm: "2026-09-08T12:30:00+02:00", abloesendeEinheitId: "U1" },
          }),
        );
        break;

      case "storno":
        ereignisse.push(
          bau(h, laufnummer, "AnforderungStorniert", { anforderungId: befehl.anforderungId }, {
            neu: true,
            grund: "im Pruefstand storniert",
          }),
        );
        break;

      case "erledigungZurueck":
        ereignisse.push(
          bau(h, laufnummer, "ErledigungZurueckgenommen", { anforderungId: befehl.anforderungId }, {
            neu: null,
          }),
        );
        break;

      case "fremd":
        ereignisse.push(fremdesEreignis(h, laufnummer, "NochNichtErfundeneArt"));
        break;
    }
  });
  return ereignisse;
}

const ereignismengeArb = fc
  .tuple(fc.array(befehlArb, { minLength: 6, maxLength: 40 }), taktplanArb, fc.array(klonArb, { maxLength: 40 }))
  .map(([befehle, plan, klone]) => baueEreignisse(befehle, plan, klone));

/**
 * Die Mengen fuer P4 (§11.1): zwei bis fuenf strukturelle Vorgaenge, darunter
 * Mengen mit entfernten Einheiten, mit nicht zaehlenden Abschnitten und mit
 * vorauslaufenden Uhren.
 *
 * Der Unterschied zur allgemeinen Menge ist zweifach und in beiden Punkten
 * begruendet: Ein **Vorspann** legt Einsatz, drei Abschnitte und drei
 * Einheiten an, und der Takt ist **gemeinsam**. Ohne beides waere fast jedes
 * Praefix unvollstaendig — eine Aufteilung vor der Anlage ihrer Quelle ist
 * bei drei unabhaengigen Uhren der Normalfall —, und §11.1 begrenzt den
 * Anteil der uebersprungenen Vorgaenge ausdruecklich auf ein Fuenftel.
 * Vorauslaufende Uhren bleiben im Bild: `ausreisser` verschiebt einzelne
 * Ereignisse weit nach vorn.
 */
/**
 * Kleine Abteilungsmengen fuer P4.
 *
 * Teilt der Generator regelmaessig mehr ab, als die Quelle hat, wird ihre
 * wirksame Staerke negativ; `gesehen` muss dann geklemmt werden (die Maske
 * zeigt nichts anderes, und `zStaerke` verlangt nichtnegative Zahlen), und die
 * ungeklemmte Vergleichsgroesse weicht ab. Der Fall ist echt und in T150
 * geprueft — als Dauerzustand macht er den Pruefstand blind, weil §8.1
 * Bedingung (i) mit **einem** Widerspruch jeden weiteren Vorgang sperrt.
 */
const p4StaerkeArb: fc.Arbitrary<Staerke> = fc
  .tuple(
    fc.integer({ min: 0, max: 1 }),
    fc.integer({ min: 0, max: 1 }),
    fc.integer({ min: 0, max: 3 }),
  )
  .map(([f, uf, m]) => staerke(f, uf, m));

const p4BefehlArb: fc.Arbitrary<Befehl> = fc.oneof(
  { arbitrary: fc.record({ art: fc.constant("aufteilen" as const), client: clientArb, quelle: fc.constantFrom(...EINHEITEN), neueId: fc.constant("V"), ab: p4StaerkeArb, gesehenEcht: fc.constant(true) }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("zusammenfuehren" as const), client: clientArb, ziel: fc.constantFrom(...EINHEITEN), quelle: fc.constantFrom(...EINHEITEN), gesehenEcht: fc.constant(true) }), weight: 5 },
  { arbitrary: fc.record({ art: fc.constant("staerke" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), neu: staerkeArb, vorherEcht: fc.constant(true) }), weight: 2 },
  { arbitrary: fc.record({ art: fc.constant("entfernen" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN) }), weight: 1 },
  { arbitrary: fc.record({ art: fc.constant("typAendern" as const), client: clientArb, abschnittId: fc.constantFrom(...ABSCHNITTE), typ: fc.constantFrom(...NICHT_ZAEHLEND) }), weight: 1 },
  { arbitrary: fc.record({ art: fc.constant("verschieben" as const), client: clientArb, einheitId: fc.constantFrom(...EINHEITEN), ziel: fc.constantFrom(...ABSCHNITTE), vorherEcht: fc.constant(true) }), weight: 1 },
);

const VORSPANN: readonly Befehl[] = [
  { art: "einsatz", client: "aa", name: "Hochwasser" },
  ...ABSCHNITTE.map((abschnittId) => ({ art: "abschnitt" as const, client: "aa", abschnittId })),
  ...EINHEITEN.map((einheitId) => ({
    art: "einheit" as const,
    client: "aa",
    einheitId,
    abschnittId: "A",
  })),
];

const p4MengeArb = fc
  .tuple(
    fc.array(p4BefehlArb, { minLength: 4, maxLength: 20 }),
    // Nur etwa jedes zehnte Ereignis laeuft der Uhr voraus. §11.1 nennt die
    // Gegenprobe ausdruecklich: „Ueberspringt die Pruefung mehr [als ein
    // Fuenftel], erzeugt der Generator zu viele vorauslaufende Uhren und
    // prueft zu wenig." Bei jedem zweiten war genau das der Fall.
    fc.array(fc.integer({ min: 0, max: 19 }).map((n) => n === 0), { maxLength: 30 }),
  )
  .map(([befehle, ausreisser]) => {
    // **Jede Aufteilung legt eine eigene Einheit an.** Zoege der Generator
    // aus einem festen Vorrat, traefen zwei Aufteilungen dieselbe Id, die
    // zweite verloere nach §3.11 ihren Anlageteil, und P4 uebersprunge sie
    // nach Bedingung (iii) — ein Artefakt des Vorrats, keine Eigenschaft.
    const eindeutig = befehle.map((b, i) =>
      b.art === "aufteilen" ? { ...b, neueId: `V${i}` } : b,
    );
    // **Eine aufgegangene Quelle wird nicht mehr angefasst.** Wird aus ihr
    // spaeter abgeteilt oder waechst ihr etwas zu, passt das eingefrorene
    // `gesehen` der Zusammenfuehrung nicht mehr zu ihrer wirksamen Staerke —
    // der Fall aus §5.4.2a, fuer den es ausdruecklich **keine** fuenfte
    // Wirksamkeitsbedingung gibt, weil er ueber `vorgangSummeWeichtAb`
    // sichtbar wird (T126). Er gehoert in die Pruefung, aber nicht in jede
    // zweite Menge: §8.1 Bedingung (i) sperrt mit **einem** solchen
    // Widerspruch jeden strukturellen Vorgang derselben Menge, und §11.1
    // begrenzt den Anteil deshalb auf ein Fuenftel.
    const aufgegangen = new Set<string>();
    const gefiltert: Befehl[] = [];
    for (const b of eindeutig) {
      if (b.art === "zusammenfuehren") {
        if (aufgegangen.has(b.quelle) || aufgegangen.has(b.ziel)) continue;
        aufgegangen.add(b.quelle);
      }
      if (b.art === "aufteilen" && aufgegangen.has(b.quelle)) continue;
      gefiltert.push(b);
    }
    const menge = baueEreignisse([...VORSPANN, ...gefiltert], { versatz: {}, schritt: {}, gemeinsam: true, echteStaerke: true }, []);
    // Vorauslaufende Uhren: einzelne Ereignisse springen weit nach vorn. Das
    // erzeugt genau die Lage aus §8.1 — eine Anlage **hinter** dem Vorgang,
    // der sie braucht — und damit die Uebersprungsquote, die §11.1 misst.
    return menge.map((e, i) =>
      ausreisser[i] === true
        ? { ...e, hlc: { ...e.hlc, millisekunden: e.hlc.millisekunden + 5000 } }
        : e,
    );
  });

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
    if (id !== EINGANG_ABSCHNITT_ID) abschnitte[id] = abschnitt.name.wert ?? "";
  }
  const einheiten: Record<string, { abschnittId: string; staerke: Staerke }> = {};
  for (const [id, einheit] of Object.entries(zustand.einheiten)) {
    einheiten[id] = {
      abschnittId: einheit.abschnittId.wert ?? "",
      staerke: einheit.staerke.wert ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0 },
    };
  }
  return { einsatzName: zustand.einsatz?.name.wert ?? undefined, abschnitte, einheiten };
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
    // Der naive Fold liest die Nutzlast ungetypt — er ist die Gegenprobe und
    // kein Produktionspfad.
    const bekannt = ereignis as EingehendesEreignis & {
      nutzlast: Record<string, string> & { staerke: Staerke };
      neu: string & Staerke;
    };
    switch (bekannt.typ) {
      case "EinsatzAngelegt":
        einsatzName ??= bekannt.nutzlast["name"];
        break;
      case "AbschnittAngelegt":
        abschnitte[bekannt.nutzlast["abschnittId"] as string] =
          `Abschnitt ${bekannt.nutzlast["abschnittId"]}`;
        break;
      case "EinheitGemeldet":
        einheiten[bekannt.nutzlast["einheitId"] as string] = {
          abschnittId: bekannt.nutzlast["abschnittId"] as string,
          staerke: bekannt.nutzlast.staerke,
        };
        break;
      case "EinheitVerschoben": {
        const bisher = einheiten[bekannt.nutzlast["einheitId"] as string];
        if (bisher !== undefined) bisher.abschnittId = bekannt.neu;
        break;
      }
      case "StaerkeGeaendert": {
        const bisher = einheiten[bekannt.nutzlast["einheitId"] as string];
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
// Aussagekraft der Erzeugung
// ---------------------------------------------------------------------------

/**
 * Property-Tests sind nur so viel wert wie die Mengen, gegen die sie laufen.
 * Dieser Block misst die Erzeugung, statt ihre Guete zu behaupten — sonst
 * koennte P1 jahrelang gruen bleiben, waehrend die Mengen laengst degeneriert
 * sind.
 */
describe("Die erzeugten Ereignismengen sind aussagekraeftig", () => {
  it("erzeugt Lagen mit Einheiten, konkurrierenden Schreibern und HLC-Gleichstaenden", () => {
    let laeufe = 0;
    let mitEinheiten = 0;
    let hlcOrdnungAndersAlsIdOrdnung = 0;
    let ankunftAndersAlsHlc = 0;
    let gleichstandAufDemselbenFeld = 0;
    let konkurrenzAufFeld = 0;

    /** Welches Akkumulatorfeld ein Ereignis beruehrt — Gleichstand zaehlt nur hier. */
    const feldSchluessel = (e: EingehendesEreignis): string | undefined => {
      const nutzlast = e.nutzlast as Record<string, string>;
      if (e.typ === "EinheitVerschoben" || e.typ === "StaerkeGeaendert" || e.typ === "StatusGesetzt") {
        return `einheit/${nutzlast["einheitId"]}/${e.typ}`;
      }
      if (e.typ === "EinheitEntfernt" || e.typ === "EinheitWiederhergestellt") {
        return `einheit/${nutzlast["einheitId"]}/entfernt`;
      }
      if (e.typ === "EinheitGemeldet") return `einheit/${nutzlast["einheitId"]}/anlage`;
      if (e.typ === "EinheitAufgeteilt") return `einheit/${nutzlast["neueEinheitId"]}/anlage`;
      if (e.typ === "EinheitZusammengefuehrt") {
        const quellen = (e.nutzlast as { quellen: { einheitId: string }[] }).quellen;
        return `einheit/${quellen[0]?.einheitId}/aufgegangenIn`;
      }
      if (e.typ === "AbschnittAngelegt") return `abschnitt/${nutzlast["abschnittId"]}`;
      if (e.typ === "AbschnittTypGeaendert") return `abschnitt/${nutzlast["abschnittId"]}/typ`;
      if (e.typ === "AbschnittAufgeloest") return `abschnitt/${nutzlast["abschnittId"]}/aufgeloest`;
      if (e.typ === "AbschnittUmgehaengt") return `abschnitt/${nutzlast["abschnittId"]}/parentId`;
      if (e.typ === "AnforderungAngelegt") return `anforderung/${nutzlast["anforderungId"]}`;
      if (e.typ === "AbloesungZugesagt") return `anforderung/${nutzlast["anforderungId"]}/zusage`;
      if (e.typ === "AnforderungErledigt" || e.typ === "ErledigungZurueckgenommen") {
        return `anforderung/${nutzlast["anforderungId"]}/erledigung`;
      }
      if (e.typ === "AnforderungStorniert") return `anforderung/${nutzlast["anforderungId"]}/storno`;
      if (e.typ === "EinsatzAngelegt") return "einsatz";
      return undefined;
    };

    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        laeufe += 1;
        const zustand = falte(ausgang);
        if (Object.keys(zustand.einheiten).length > 0) mitEinheiten += 1;

        const nachHlc = [...ausgang].sort((a, b) => vergleicheHlc(a.hlc, b.hlc)).map((e) => e.id);
        const nachId = [...ausgang]
          .sort((a, b) => vergleicheNachCodepunkt(a.id, b.id))
          .map((e) => e.id);
        // Der Kern: Waeren HLC-Ordnung und die Ordnung nach der Ereignis-Id
        // immer identisch, koennte P1 nicht pruefen, dass die HLC entscheidet
        // — ein Fold, der die HLC ignoriert und nach der Id ordnet, bestuende
        // dann ebenfalls.
        if (kanonischeSerialisierung(nachHlc) !== kanonischeSerialisierung(nachId)) {
          hlcOrdnungAndersAlsIdOrdnung += 1;
        }
        if (kanonischeSerialisierung(permutation.map((e) => e.id)) !== kanonischeSerialisierung(nachHlc)) {
          ankunftAndersAlsHlc += 1;
        }

        // Nur ein Gleichstand auf **demselben** Feld kann vom
        // Gleichstandsbruch ueberhaupt entschieden werden. Ein Gleichstand
        // irgendwo im Lauf waere die falsche Groesse: er liesse sich
        // erreichen, ohne dass der Fold je darueber entscheiden muesste.
        const jeHlcUndFeld = new Map<string, string>();
        for (const e of ausgang) {
          const feld = feldSchluessel(e);
          if (feld === undefined) continue;
          const schluessel = `${e.hlc.millisekunden}/${e.hlc.zaehler}/${e.hlc.clientId}#${feld}`;
          const vorheriges = jeHlcUndFeld.get(schluessel);
          if (vorheriges !== undefined && vorheriges !== e.id) gleichstandAufDemselbenFeld += 1;
          jeHlcUndFeld.set(schluessel, e.id);
        }

        // Zwei verschiedene Clients schreiben auf dasselbe Feld derselben Einheit.
        const schreiberJeFeld = new Map<string, Set<string>>();
        for (const e of ausgang) {
          const feld = feldSchluessel(e);
          if (feld === undefined) continue;
          const menge = schreiberJeFeld.get(feld) ?? new Set<string>();
          menge.add(e.akteur.clientId);
          schreiberJeFeld.set(feld, menge);
        }
        if ([...schreiberJeFeld.values()].some((m) => m.size > 1)) konkurrenzAufFeld += 1;
      }),
      // 2500 statt 400 seit dem vollen Katalog: Die Befehlsarten haben sich
      // verzehnfacht, und ein HLC-Gleichstand **auf demselben Feld** wird
      // damit seltener. Bei 400 Laeufen lag die Zahl im einstelligen Bereich
      // und die Pruefung war am Rand ihrer eigenen Schranke — das ist der
      // Kalibrierungsfall, den §11.1 fuer S10 vorsieht. 2500, weil die Zahl
      // bei 1000 zwischen 7 und 15 schwankte und die Schranke gestreift hat.
      { numRuns: 2500 },
    );

    expect(laeufe).toBe(2500);
    expect(mitEinheiten / laeufe).toBeGreaterThan(0.5);
    expect(hlcOrdnungAndersAlsIdOrdnung / laeufe).toBeGreaterThan(0.5);
    expect(ankunftAndersAlsHlc / laeufe).toBeGreaterThan(0.5);
    // Ohne Gleichstaende auf demselben Feld liefe der Gleichstandsbruch aus
    // `vergleicheBeobachtung` ungeprueft mit — die Suite bliebe gruen, auch
    // wenn man ihn entfernte.
    expect(gleichstandAufDemselbenFeld).toBeGreaterThan(12);
    expect(konkurrenzAufFeld / laeufe).toBeGreaterThan(0.3);
  });
});

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

describe("P4 Summenerhaltung — die Bilanzsumme ueber Praefixe (§8.1)", () => {
  /**
   * Die Bilanzsumme aus §8.1: Σ `wirksameStaerkeRechnerisch` ueber alle
   * Einheiten, die **weder entfernt noch wirksam aufgegangen** sind.
   *
   * Das ist `zaehlt` **ohne** seine Abschnittsbedingung und mit dem
   * **ungeklemmten** Wert. Beides ist noetig: Die Gesamtstaerke haengt am
   * Abschnittstyp und stiege, wenn eine angeforderte Einheit an den Einsatzort
   * uebernommen wird, ohne dass ein Helfer hinzugekommen waere; und die
   * Klemmung liesse eine Schuld verschwinden, die ein spaeterer Zuwachs tilgt.
   */
  function bilanzsumme(zustand: Zustand): number {
    let summe = 0;
    for (const einheit of Object.values(zustand.einheiten)) {
      if (einheit.entfernt?.wert === true || einheit.wirksamAufgegangen) continue;
      const r = einheit.wirksameStaerkeRechnerisch;
      summe += r.fuehrer + r.unterfuehrer + r.mannschaft;
    }
    return summe;
  }

  /** Die von `e` beruehrten Einheiten — abschliessend definiert (§8.1). */
  function beruehrt(e: EingehendesEreignis): string[] {
    const n = e.nutzlast as Record<string, unknown>;
    if (e.typ === "EinheitAufgeteilt") {
      return [n["quellEinheitId"] as string, n["neueEinheitId"] as string];
    }
    const quellen = (n["quellen"] ?? []) as { einheitId: string }[];
    return [n["zielEinheitId"] as string, ...quellen.map((q) => q.einheitId)];
  }

  /**
   * Warum ein strukturelles Ereignis uebersprungen wird — **je Grund getrennt
   * gezaehlt**, wie §11.1 es verlangt.
   */
  type Uebersprungsgrund = "PRAEFIX" | "ZUSAMMENFUEHRUNG_WEICHT_AB" | "ENTFERNT";

  function ausschlussgrund(
    e: EingehendesEreignis,
    vorher: Zustand,
    nachher: Zustand,
  ): Uebersprungsgrund | undefined {
    const ids = new Set(beruehrt(e));
    for (const zustand of [vorher, nachher]) {
      for (const h of zustand.hinweise) {
        // (i) gilt ausdruecklich **nicht** nur fuer `e`: Eine fremde, falsche
        // Zusammenfuehrung im Praefix friert ein `gesehen` ein, das spaeter
        // nicht mehr zur Quelle passt.
        if (h.art === "vorgangSummeWeichtAb" && h.vorgangsart === "ZUSAMMENFUEHRUNG") {
          return "ZUSAMMENFUEHRUNG_WEICHT_AB";
        }
        // Bei `fremdreferenzUnbekannt` zaehlt die **Gegenseite**, nicht der
        // Traeger: Die gefaehrliche Lage ist die, in der eine fremde Einheit
        // auf eine von `e` angelegte zeigt (T158).
        if (
          h.art === "fremdreferenzUnbekannt" &&
          (h.feldpfad.endsWith("/abgeteiltVon") || h.feldpfad.endsWith("/aufgegangenIn")) &&
          ids.has(h.verweistAuf)
        ) {
          return "PRAEFIX";
        }
        // Bei `anlageFehlt` zaehlt der Traeger.
        if (h.art === "anlageFehlt" && ids.has(h.feldpfad.replace("einheit/", ""))) {
          return "PRAEFIX";
        }
        if (h.art === "aufteilungKreis" || h.art === "zusammenfuehrungKreis") {
          // Die Kreis-Hinweise zaehlen unter „unvollstaendiges Praefix" mit,
          // obwohl sie keine Unvollstaendigkeit anzeigen — sie sind selten,
          // und ein vierter Zaehlstand fuer zwei Hinweisarten lohnt nicht.
          if (h.kanten.some(() => true) && ids.has(h.feldpfad.split("/")[1] as string)) {
            return "PRAEFIX";
          }
        }
      }
    }
    for (const id of ids) {
      if (nachher.einheiten[id]?.entfernt?.wert === true) return "ENTFERNT";
    }
    // (iii): Bei einer Aufteilung muss `angelegtDurch` der neuen Einheit `e`
    // sein. Sonst hat der Vorgang nichts verschoben, sondern nur zwei
    // Meldungen gegeneinandergestellt (§3.11).
    if (e.typ === "EinheitAufgeteilt") {
      const neueId = (e.nutzlast as Record<string, string>)["neueEinheitId"] as string;
      if (nachher.einheiten[neueId]?.angelegtDurch !== e.id) return "PRAEFIX";
    }
    return undefined;
  }

  it("die Bilanzsumme aendert sich durch kein strukturelles Ereignis (T20, T26, T145)", () => {
    let strukturelle = 0;
    let geprueft = 0;
    const uebersprungen: Record<Uebersprungsgrund, number> = {
      PRAEFIX: 0,
      ZUSAMMENFUEHRUNG_WEICHT_AB: 0,
      ENTFERNT: 0,
    };

    fc.assert(
      fc.property(p4MengeArb, (menge) => {
        // `P(e)` ist eindeutig, weil `vergleicheHlc` eine **totale** Ordnung
        // ist; der Tie-Break nach Ereignis-Id schliesst den Rest (§3.5).
        const geordnet = [...menge].sort(
          (a, b) => vergleicheHlc(a.hlc, b.hlc) || vergleicheNachCodepunkt(a.id, b.id),
        );
        geordnet.forEach((e, i) => {
          if (e.typ !== "EinheitAufgeteilt" && e.typ !== "EinheitZusammengefuehrt") return;
          strukturelle += 1;
          const praefix = geordnet.slice(0, i);
          const vorher = falte(praefix);
          const nachher = falte([...praefix, e]);
          const grund = ausschlussgrund(e, vorher, nachher);
          if (grund !== undefined) {
            uebersprungen[grund] += 1;
            return;
          }
          geprueft += 1;
          expect(bilanzsumme(nachher), `${e.typ} ${e.id}`).toBe(bilanzsumme(vorher));
        });
      }),
      { numRuns: 150 },
    );

    // §11.1: Die Quoten werden **ueber alle Mengen zusammen** gemessen.
    expect(strukturelle).toBeGreaterThan(100);
    expect(uebersprungen.PRAEFIX / strukturelle).toBeLessThan(0.2);
    expect(uebersprungen.ZUSAMMENFUEHRUNG_WEICHT_AB / strukturelle).toBeLessThan(0.2);
    // Fuer „entfernte beteiligte Einheit" gilt die Schranke ausdruecklich
    // nicht — dieselbe Zeile verlangt Mengen mit entfernten Einheiten.
    expect(geprueft / strukturelle).toBeGreaterThanOrEqual(0.4);
  });

  it("`staerkeGeklemmt` ist kein Ausschlussgrund — sonst waere T154 verdeckt", () => {
    // Die Bilanz rechnet ungeklemmt: `z` hat 0/0/0, jemand teilt 0/0/5 ab
    // (rechnerisch −5), danach geht `q` mit 0/0/5 in `z` auf. Rechnerisch
    // geht die Bilanz auf; ueber die geklemmten Werte fielen fuenf Kraefte
    // weg, und P4 meldete einen Bruch an einer korrekten Umsetzung.
    const grund = [
      einsatzAngelegt(hlc(1, 0, "aa"), 1, {
        einsatzId: "E",
        name: "Hochwasser",
        art: "EINSATZ",
        fuestName: "FueSt",
        beginn: "2026-09-08T08:00:00+02:00",
        schichtmodell: "ZWEI_SCHICHT",
      }),
      abschnittAngelegt(hlc(2, 0, "aa"), 2, {
        abschnittId: "A",
        name: "Einsatzort",
        abschnittstyp: "EINSATZORT",
        reihenfolge: 1,
      }),
      einheitGemeldet(hlc(3, 0, "aa"), 3, {
        einheitId: "z",
        abschnittId: "A",
        bezeichnung: "Ziel",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: staerke(0, 0, 0),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
      }),
      einheitGemeldet(hlc(4, 0, "aa"), 4, {
        einheitId: "q",
        abschnittId: "A",
        bezeichnung: "Quelle",
        organisation: "THW",
        ebene: "GRUPPE",
        staerke: staerke(0, 0, 5),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
      }),
    ];
    const teilung = bau(hlc(10, 0, "bb"), 1, "EinheitAufgeteilt", {
      quellEinheitId: "z",
      neueEinheitId: "w",
      neueEinheit: {
        abschnittId: "A",
        bezeichnung: "Teil",
        organisation: "THW",
        hierarchie: [],
        ebene: "TRUPP",
        staerke: staerke(0, 0, 5),
        personalErfassung: "NUR_STAERKE",
        status: "IM_EINSATZ",
        reihenfolge: 0,
        istFuehrungDesAbschnitts: false,
      },
      abgeteilteStaerke: staerke(0, 0, 5),
      gesehen: staerke(0, 0, 0),
      uebernommeneFahrzeuge: [],
      uebernommenePersonen: [],
    });
    const zusammen = bau(hlc(20, 0, "bb"), 2, "EinheitZusammengefuehrt", {
      zielEinheitId: "z",
      quellen: [{ einheitId: "q", gesehen: staerke(0, 0, 5) }],
    });

    const vorTeilung = falte(grund);
    const nachTeilung = falte([...grund, teilung]);
    expect(bilanzsumme(nachTeilung)).toBe(bilanzsumme(vorTeilung));
    expect(nachTeilung.hinweise.some((h) => h.art === "staerkeGeklemmt")).toBe(true);

    const nachZusammen = falte([...grund, teilung, zusammen]);
    expect(bilanzsumme(nachZusammen)).toBe(bilanzsumme(nachTeilung));
    expect(nachZusammen.einheiten["z"]?.wirksameStaerkeRechnerisch).toEqual(staerke(0, 0, 0));
  });
});

// ---------------------------------------------------------------------------
// P5 Kein Waisenzustand
// ---------------------------------------------------------------------------

describe("P5 Kein Waisenzustand — keine Einheit haengt in einem Abschnitt, den es nicht gibt", () => {
  it("die wirksame Zuordnung zeigt immer auf einen vorhandenen Abschnitt", () => {
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

  it("jeder Verweis ins Leere ist als Hinweis sichtbar — die nicht triviale Haelfte", () => {
    // Die Pruefung oben allein waere eine Tautologie ueber die Umsetzung:
    // `wirksamerAbschnittId` wird als `existiert ? gewaehlt : EINGANG` gesetzt
    // und EINGANG steht immer in der Sammlung — sie kann nicht fehlschlagen,
    // solange diese beiden Zeilen nebeneinanderstehen.
    //
    // Die eigentliche Aussage ist eine andere: Der Fold behaelt die
    // Entscheidung `abschnittId.wert` unveraendert, damit ein spaeter
    // eintreffendes `AbschnittAngelegt` noch wirken kann (Rebase). Damit steht
    // in jedem solchen Zustand ein Verweis, der ins Leere zeigt — und genau
    // der muss sichtbar sein, sonst waere die Eingangsregel ein stilles
    // Verschieben (§2.5, Auflage 10).
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const zustand = falte(menge);
        for (const [id, einheit] of Object.entries(zustand.einheiten)) {
          const feldpfad = `einheit/${id}/abschnittId`;
          const gemeldet = einheit.abschnittId.wert ?? "";
          const zeigtInsLeere = !Object.hasOwn(zustand.abschnitte, gemeldet);
          if (zeigtInsLeere) {
            // Der gemeldete Abschnitt fehlt: Eingang, und der Verweis steht
            // mit **seiner eigenen Id** im Hinweis.
            expect(zustand.hinweise).toContainEqual({
              art: "abschnittUnbekannt",
              feldpfad,
              gemeldeterAbschnittId: gemeldet,
            });
            expect(einheit.wirksamerAbschnittId).toBe(EINGANG_ABSCHNITT_ID);
          }
          // Und die eigentliche Aussage, jetzt auch fuer den aufgeloesten
          // Abschnitt (§5.3.2): **Wo die Einheit woanders steht, als sie
          // gemeldet wurde, steht ein Hinweis.** Sonst waere es ein stilles
          // Verschieben (Auflage 10).
          if (einheit.wirksamerAbschnittId !== gemeldet) {
            expect(
              zustand.hinweise.some(
                (h) =>
                  h.feldpfad === feldpfad &&
                  (h.art === "abschnittUnbekannt" || h.art === "abschnittAufgeloest"),
              ),
            ).toBe(true);
          }
        }
      }),
      { numRuns: 300 },
    );
  });

  it("die Erzeugung trifft den Fall auch wirklich", () => {
    // Ohne diesen Nachweis waeren die Pruefungen oben moeglicherweise leer:
    // die Erzeugung muss Verweise auf den nirgends angelegten Abschnitt „D"
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

describe("P6 Monotone Zustandsmaschine — `anforderung.zustand` (§5.6.2)", () => {
  /** Die HLC-Ordnung, gegen die „nie zurueck" gemessen wird (§3.5). */
  function nachHlc(menge: readonly EingehendesEreignis[]): EingehendesEreignis[] {
    return [...menge].sort(
      (a, b) => vergleicheHlc(a.hlc, b.hlc) || vergleicheNachCodepunkt(a.id, b.id),
    );
  }

  it("geht nie von EINGETROFFEN zurueck — ueber alle Praefixe", () => {
    // **Bedingt** (§8.1): ueber einer Menge ohne `ErledigungZurueckgenommen`.
    // Eine unbedingte Zusage waere falsch — das Gegenereignis existiert, und
    // §5.6.2 laesst es ausdruecklich wirken.
    let mitEingetroffen = 0;
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const ohneRuecknahme = menge.filter((e) => e.typ !== "ErledigungZurueckgenommen");
        const geordnet = nachHlc(ohneRuecknahme);
        const erreicht = new Set<string>();
        for (let i = 1; i <= geordnet.length; i += 1) {
          const zustand = falte(geordnet.slice(0, i));
          for (const [id, anforderung] of Object.entries(zustand.anforderungen)) {
            if (anforderung.zustand === "EINGETROFFEN") {
              erreicht.add(id);
              continue;
            }
            expect(erreicht.has(id), `Anforderung ${id} faellt auf ${anforderung.zustand}`).toBe(
              false,
            );
          }
        }
        if (erreicht.size > 0) mitEingetroffen += 1;
      }),
      { numRuns: 400 },
    );
    // Die Pruefung waere ohne diesen Nachweis leer: Eine Menge, in der nie
    // eine Anforderung eintrifft, erfuellt P6 trivial.
    expect(mitEingetroffen).toBeGreaterThan(15);
  });

  it("gilt in **jeder** Permutation, nicht nur in der HLC-Ordnung", () => {
    // Der Zustand ist eine Mengenfunktion; die Monotonie darf deshalb nicht
    // davon abhaengen, in welcher Reihenfolge die Ereignisse ankommen.
    fc.assert(
      fc.property(mengeUndPermutation, ([ausgang, permutation]) => {
        const filter = (m: readonly EingehendesEreignis[]) =>
          m.filter((e) => e.typ !== "ErledigungZurueckgenommen");
        expect(kanon(falte(filter(permutation)))).toBe(kanon(falte(filter(ausgang))));
      }),
      { numRuns: 150 },
    );
  });

  it("das Gegenereignis wirkt — sonst waere die Zusage unbedingt (§5.6.2)", () => {
    const anforderung = bau(hlc(10, 0, "aa"), 1, "AnforderungAngelegt", {
      anforderungId: "AN1",
      angefordertAm: "2026-09-08T09:00:00+02:00",
    });
    const erledigt = bau(hlc(20, 0, "aa"), 2, "AnforderungErledigt", { anforderungId: "AN1" }, {
      neu: { erledigtAm: "2026-09-08T12:30:00+02:00", abloesendeEinheitId: "U1" },
    });
    const zurueck = bau(hlc(30, 0, "bb"), 1, "ErledigungZurueckgenommen", {
      anforderungId: "AN1",
    }, { neu: null });
    expect(falte([anforderung, erledigt]).anforderungen["AN1"]?.zustand).toBe("EINGETROFFEN");
    expect(falte([anforderung, erledigt, zurueck]).anforderungen["AN1"]?.zustand).toBe("OFFEN");
  });
});

// ---------------------------------------------------------------------------
// P7 Rebase-Treue
// ---------------------------------------------------------------------------

describe("P7 Rebase-Treue — jeder Schnitt ergibt denselben Zustand (§3.1)", () => {
  it("Praefix falten, Rest nachfalten — fuer **jeden** Schnitt", () => {
    // Ohne P7 prueft P1 nur den vollen Fold, waehrend im Betrieb jeder Client
    // nach dem ersten Schnappschuss den anderen Weg geht.
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const voll = kanon(falte(menge));
        for (let schnitt = 0; schnitt <= menge.length; schnitt += 1) {
          const praefix = falteHinzu(leereFaltung(), menge.slice(0, schnitt));
          const ueberSchnitt = materialisiere(falteHinzu(praefix, menge.slice(schnitt)));
          expect(kanon(ueberSchnitt), `Schnitt ${schnitt}`).toBe(voll);
        }
      }),
      { numRuns: 120 },
    );
  });

  it("gilt auch, wenn der Schnitt durch die HLC-Ordnung statt der Ankunft geht", () => {
    // Der Schnappschuss entsteht im Betrieb an einer HLC-Grenze, nicht an
    // einer Ankunftsgrenze — beide Wege muessen dasselbe ergeben.
    fc.assert(
      fc.property(ereignismengeArb, (menge) => {
        const geordnet = [...menge].sort(
          (a, b) => vergleicheHlc(a.hlc, b.hlc) || vergleicheNachCodepunkt(a.id, b.id),
        );
        const voll = kanon(falte(menge));
        for (let schnitt = 0; schnitt <= geordnet.length; schnitt += 1) {
          const praefix = falteHinzu(leereFaltung(), geordnet.slice(0, schnitt));
          expect(kanon(materialisiere(falteHinzu(praefix, geordnet.slice(schnitt))))).toBe(voll);
        }
      }),
      { numRuns: 120 },
    );
  });
});
