/**
 * Der Minimalfold von M0.2 — eine **Mengenfunktion mit Rebase**.
 *
 * Auflage 4 und 02-ZIELBILD.md Nr. 3: „Der Fold ist eine Mengenfunktion, der
 * Live-Pfad ist ein Rebase, jedes materialisierte Feld traegt die HLC seines
 * Gewinners."
 *
 * ## Warum hier nirgends sortiert wird
 *
 * Der Fold nimmt Ereignisse einzeln entgegen und verrechnet sie in einen
 * Akkumulator, dessen Aufnahmeoperation kommutativ, assoziativ und idempotent
 * ist: je Feld werden die **beiden hoechsten Beobachtungen** nach einer
 * totalen Ordnung gehalten — HLC nach §3.2, bei Gleichstand die Ereignis-Id
 * (siehe {@link vergleicheBeobachtung}). Es gibt keine Stelle, an der eine
 * Ereignisliste sortiert und dann der Reihe nach angewandt wuerde.
 *
 * Das ist keine Stilfrage, sondern die Voraussetzung fuer beides zugleich:
 *
 *   * **Rebase.** Ein nachtraeglich eintreffendes Ereignis darf ein Feld noch
 *     ueberschreiben, wenn seine HLC hoeher ist als die des bisherigen
 *     Gewinners — und darf es nicht, wenn sie niedriger ist. Ein Fold, der
 *     erst sortiert und dann anwendet, muesste dafuer die gesamte
 *     Ereignismenge erneut lesen; hier genuegt der Akkumulator.
 *   * **Auflage 18.** Ein Fold, der intern sortiert, macht die Eigenschaft P1
 *     (Permutation) zur Tautologie ueber die Sortierfunktion. Weil hier nicht
 *     sortiert wird, ist P1 eine echte Aussage ueber die Aufnahmeoperation.
 *     `eigenschaften.test.ts` fuehrt dazu die Gegenprobe.
 *
 * Sortiert wird ausschliesslich in {@link materialisiere}, und dort nur zur
 * Ausgabe bereits feststehender Mengen: die Schluessel der Datensammlungen,
 * die Konflikthinweise, die Liste der unbekannten Ereignisse und die Ids
 * innerhalb eines Hinweises. Keine dieser Sortierungen entscheidet einen
 * Konflikt, und keine sieht je die Ereignismenge.
 */

import type {
  Abschnittstyp,
  EingehendesEreignis,
  EinheitStatus,
  EinsatzArt,
  Ereignis,
  EreignisId,
  Organisation,
  PersonalErfassung,
  Schicht,
  Schichtmodell,
  Staerke,
  TaktischeEbene,
} from "./ereignis.js";
import { istBekannteArt } from "./ereignis.js";
import { vergleicheHlc, type Hlc } from "./hlc.js";
import {
  kanonischeSerialisierung,
  vergleicheNachCodepunkt,
  type KanonischerWert,
} from "./kanonisch.js";
import {
  ARCHIV_ABSCHNITT_ID,
  AUFFANG_ABSCHNITT_ID,
  FOLD_VERSION,
  type AbschnittZustand,
  type EinheitZustand,
  type EinsatzZustand,
  type Feld,
  type Konflikthinweis,
  type UnbekanntesEreignis,
  type VerworfeneAnlage,
  type WartendeBeobachtung,
  type Zustand,
} from "./zustand.js";
import { staerkeGeklemmt } from "./werte.js";

// ---------------------------------------------------------------------------
// Der Akkumulator je Feld
// ---------------------------------------------------------------------------

/** Was ein einzelnes Ereignis fuer ein Feld gesetzt hat. */
interface Beobachtung<T> {
  readonly hlc: Hlc;
  readonly ereignisId: EreignisId;
  readonly neu: T;
  /** Der beim Bedienen gesehene Vorher-Wert (§2.5); fehlt bei Anlage-Ereignissen. */
  readonly vorher?: T;
  /**
   * Die Wanduhr des setzenden Ereignisses.
   *
   * Sie ordnet nichts (§3.1) und steht trotzdem im Zustand: `meldezeitUnplausibel`
   * braucht sie als Eingangsdatum, und ein Hinweis muss nach einem Schnappschuss
   * neu rechenbar sein (§3.8).
   */
  readonly wanduhr?: string;
  /** Die Ereignisart — die Entitaet grenzt sie nur ein, sie bestimmt sie nicht (§3.6). */
  readonly ereignisart?: string;
  /** Rahmenfeld `grund` (§2.4); getrennt von der Nutzlast gehalten. */
  readonly grund?: string;
  /**
   * Die **reine Nutzlast** des Ereignisses, unveraendert (§3.6).
   *
   * Nur bei Anlagen gesetzt. Sie ist nicht dasselbe wie `neu`: `neu` ist die
   * Form, in der der Akkumulator rechnet, die Nutzlast die Form, in der jemand
   * geschrieben hat. `inhalt` eines Hinweises und `angelegtMitNutzlast` zeigen
   * ausschliesslich diese; ein Zustand, der die interne Form abliesse, waere
   * zwischen zwei Umsetzungen nicht bytegleich.
   */
  readonly nutzlast?: unknown;
}

/**
 * Die beiden hoechsten Beobachtungen eines Feldes.
 *
 * Mehr wird nicht gebraucht: Der Gewinner liefert Wert und Feld-HLC (§7.4),
 * der Zweite liefert den Wert, gegen den der gesehene Vorher-Wert des
 * Gewinners geprueft wird (§2.5). „Die beiden groessten Elemente einer Menge
 * bezueglich einer totalen Ordnung" ist kommutativ, assoziativ und idempotent
 * — daher ist es die ganze Aufnahmeoperation.
 */
interface FeldStand<T> {
  readonly gewinner: Beobachtung<T>;
  readonly zweiter?: Beobachtung<T>;
}

/**
 * Die totale Ordnung auf Beobachtungen: erst die HLC nach §3.2, bei
 * Gleichstand die Ereignis-Id.
 *
 * Der zweite Schritt ist keine Verzierung. Zwei **verschiedene** Ereignisse
 * mit derselben HLC sind ein Protokollbruch — §3.2 erhoeht den Zaehler je
 * eigenem Ereignis, §3.3 verbietet die Doppelvergabe der Laufnummer. Genau
 * diesen Bruch erzeugt aber das **geklonte Profil**, dessen Injektion M0
 * ausdruecklich verlangt (03-MEILENSTEINE.md, M0). Ohne den zweiten Schritt
 * entschiede der Akkumulator dann nach Eintreffreihenfolge, und der Fold
 * waere ausgerechnet in dem Fall keine Mengenfunktion mehr, fuer den die
 * Fehlerinjektion gebaut ist. Erst mit ihm ist die Ordnung auf Beobachtungen
 * total — und nur dann traegt die Begruendung „die beiden groessten Elemente
 * bezueglich einer totalen Ordnung".
 */
function vergleicheBeobachtung(a: Beobachtung<unknown>, b: Beobachtung<unknown>): number {
  const nachHlc = vergleicheHlc(a.hlc, b.hlc);
  if (nachHlc !== 0) return nachHlc;
  return vergleicheNachCodepunkt(a.ereignisId, b.ereignisId);
}

function nimmBeobachtung<T>(stand: FeldStand<T> | undefined, neu: Beobachtung<T>): FeldStand<T> {
  if (stand === undefined) return { gewinner: neu };

  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand; // dasselbe Ereignis noch einmal — idempotent (P2)
  if (gegenGewinner > 0) return { gewinner: neu, zweiter: stand.gewinner };

  if (stand.zweiter === undefined) return { gewinner: stand.gewinner, zweiter: neu };
  return vergleicheBeobachtung(neu, stand.zweiter) > 0
    ? { gewinner: stand.gewinner, zweiter: neu }
    : stand;
}

/**
 * Der Akkumulator einer **Anlage**: das Ereignis mit der kleinsten HLC gilt,
 * jedes weitere wird verworfen und gemeldet.
 *
 * Der Ereigniskatalog nennt `EinsatzAngelegt` „erstes Ereignis der Akte; ein
 * zweites wird verworfen" und `AbschnittAngelegt`/`EinheitGemeldet` „additiv
 * (eindeutige Id)" (§4.2). „Erstes" kann nicht die Ankunft meinen — das waere
 * nicht konvergent; die Analogie zu `EinsatzArchiviert` („die mit kleinerer
 * `hlc` gilt") gibt die Lesart vor. Und „additiv ueber die eindeutige Id"
 * heisst, dass eine zweite Anlage derselben Id gar nicht vorkommen sollte;
 * kommt sie doch, darf sie die spaetere Arbeit an dieser Entitaet nicht
 * ueberschreiben. Deshalb dieselbe Regel fuer alle drei Anlagen.
 *
 * **Zwei Folgen, die zu M0.2 gehoeren und benannt sein wollen.** Erstens
 * verliert eine abweichende Zweitanlage ihre Werte — deshalb traegt der
 * Hinweis `zweiteAnlageVerworfen` den verworfenen Inhalt mit. Zweitens sind
 * die Stammfelder einer Einheit (`bezeichnung`, `organisation`, `ebene`,
 * `status`, `schicht`, `personalErfassung`) im Minimalset damit nach der
 * ersten Anlage nicht mehr aenderbar: Die Ereignisarten, die sie aendern
 * duerften — `EinheitStammdatenGeaendert`, `StatusGesetzt`, `SchichtGesetzt`
 * — gehoeren zum Katalog von M1.2, nicht zu den fuenf Arten von M0.2. Das ist
 * eine Luecke des Minimalsets, keine der Regel.
 */
interface AnlageStand<T> {
  readonly gewinner: Beobachtung<T>;
  /**
   * Verworfene Anlagen mit Inhalt, Art und Grund (§3.11).
   *
   * Alle drei gehoeren in den Hinweis und damit in den Zustand: Der Inhalt,
   * weil er sonst spurlos verschwaende; die Art, weil die Entitaet sie nur
   * eingrenzt; der Grund, weil die Ablage zeigen soll, warum jemand geschrieben
   * hat, und `grund` ein Rahmenfeld ist.
   */
  readonly verworfen: ReadonlyMap<EreignisId, Beobachtung<T>>;
}

function nimmAnlage<T>(stand: AnlageStand<T> | undefined, neu: Beobachtung<T>): AnlageStand<T> {
  if (stand === undefined) return { gewinner: neu, verworfen: new Map() };

  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand;

  const verworfen = new Map(stand.verworfen);
  if (gegenGewinner < 0) {
    // Die kleinere HLC uebernimmt, auch wenn sie spaeter eintrifft.
    verworfen.set(stand.gewinner.ereignisId, stand.gewinner);
    return { gewinner: neu, verworfen };
  }
  verworfen.set(neu.ereignisId, neu);
  return { gewinner: stand.gewinner, verworfen };
}

/** Wertgleichheit ueber die kanonische Serialisierung (§7.6) — gilt fuer Skalare wie fuer das Staerke-Tripel. */
function wertGleich(a: unknown, b: unknown): boolean {
  return (
    kanonischeSerialisierung(a as KanonischerWert) === kanonischeSerialisierung(b as KanonischerWert)
  );
}

// ---------------------------------------------------------------------------
// Der Akkumulator des ganzen Einsatzes
// ---------------------------------------------------------------------------

interface EinsatzWerte {
  readonly einsatzId: string;
  readonly name: string;
  readonly art: EinsatzArt;
  readonly fuestName: string;
  readonly uebergeordneteFuestName?: string;
  readonly beginn: string;
  readonly schichtmodell: Schichtmodell;
}

interface AbschnittWerte {
  readonly name: string;
  readonly abschnittstyp: Abschnittstyp;
  readonly parentId?: string;
  readonly reihenfolge: number;
}

interface EinheitStammWerte {
  readonly bezeichnung: string;
  readonly organisation: Organisation;
  readonly organisationName?: string;
  readonly ebene: TaktischeEbene;
  readonly personalErfassung: PersonalErfassung;
  readonly status: EinheitStatus;
  readonly schicht?: Schicht;
}

/** Die Anlagewerte einer Einheit — alles, was `EinheitGemeldet` setzt. */
interface EinheitAnlageWerte {
  readonly stamm: EinheitStammWerte;
  readonly abschnittId: string;
  readonly staerke: Staerke;
}

interface EinheitFaltung {
  /** Aus `EinheitGemeldet`; ohne sie ist die Einheit noch nicht materialisierbar. */
  readonly anlage?: AnlageStand<EinheitAnlageWerte>;
  /** Ausschliesslich aus `EinheitVerschoben`; die Anlage kommt erst beim Materialisieren dazu. */
  readonly verschiebungen?: FeldStand<string>;
  /** Ausschliesslich aus `StaerkeGeaendert`; die Anlage kommt erst beim Materialisieren dazu. */
  readonly staerkemeldungen?: FeldStand<Staerke>;
}

/**
 * Der Faltungszustand — der Akkumulator, aus dem {@link materialisiere} den
 * Zustand nach §7.4 erzeugt.
 *
 * Er wird nie an die kanonische Serialisierung gereicht; dafuer ist der
 * materialisierte Zustand da. Hier stehen bewusst `Map` und `Set`, weil sie
 * die Aufnahmeoperation billig machen.
 */
export interface Faltung {
  readonly foldVersion: number;
  /** Ereigniskatalog §4.1 Regel 2: ein Ereignis mit bereits gefalteter `id` wird verworfen. */
  readonly gesehen: Set<EreignisId>;
  /** Die Anlage mit der **kleinsten** HLC gilt (§4.2). */
  einsatzAnlage?: AnlageStand<EinsatzWerte>;
  readonly abschnitte: Map<string, AnlageStand<AbschnittWerte>>;
  readonly einheiten: Map<string, EinheitFaltung>;
  /** Anlagen, die eine reservierte Abschnitts-Id belegen wollten — Wert ist die Id (§5.3.4). */
  readonly reservierteId: Map<EreignisId, string>;
  readonly unbekannt: Map<EreignisId, UnbekanntesEreignis>;
}

/** Eine leere Faltung. */
export function leereFaltung(): Faltung {
  return {
    foldVersion: FOLD_VERSION,
    gesehen: new Set(),
    abschnitte: new Map(),
    einheiten: new Map(),
    reservierteId: new Map(),
    unbekannt: new Map(),
  };
}

function kopiere(faltung: Faltung): Faltung {
  return {
    foldVersion: faltung.foldVersion,
    gesehen: new Set(faltung.gesehen),
    einsatzAnlage: faltung.einsatzAnlage,
    abschnitte: new Map(faltung.abschnitte),
    einheiten: new Map(faltung.einheiten),
    reservierteId: new Map(faltung.reservierteId),
    unbekannt: new Map(faltung.unbekannt),
  };
}

// ---------------------------------------------------------------------------
// Die Aufnahmeoperation
// ---------------------------------------------------------------------------

function nimmEinsatzAnlage(faltung: Faltung, ereignis: Ereignis & { typ: "EinsatzAngelegt" }): void {
  faltung.einsatzAnlage = nimmAnlage(faltung.einsatzAnlage, {
    hlc: ereignis.hlc,
    ereignisId: ereignis.id,
    wanduhr: ereignis.wanduhr,
    ereignisart: ereignis.typ,
    grund: ereignis.grund,
    nutzlast: ereignis.nutzlast,
    neu: {
      einsatzId: ereignis.nutzlast.einsatzId,
      name: ereignis.nutzlast.name,
      art: ereignis.nutzlast.art,
      fuestName: ereignis.nutzlast.fuestName,
      uebergeordneteFuestName: ereignis.nutzlast.uebergeordneteFuestName,
      beginn: ereignis.nutzlast.beginn,
      schichtmodell: ereignis.nutzlast.schichtmodell,
    },
  });
}

function aendereEinheit(
  faltung: Faltung,
  einheitId: string,
  aenderung: (bisher: EinheitFaltung) => EinheitFaltung,
): void {
  const bisher = faltung.einheiten.get(einheitId) ?? {};
  faltung.einheiten.set(einheitId, aenderung(bisher));
}

function nimmAuf(faltung: Faltung, ereignis: EingehendesEreignis): void {
  if (faltung.gesehen.has(ereignis.id)) return; // §4.1 Regel 2
  faltung.gesehen.add(ereignis.id);

  if (!istBekannteArt(ereignis)) {
    // §4.1 Regel 4: unbekannte Typen werden durchgereicht, nicht verworfen.
    faltung.unbekannt.set(ereignis.id, {
      id: ereignis.id,
      typ: ereignis.typ,
      schemaVersion: ereignis.schemaVersion,
      hlc: ereignis.hlc,
      akteurBenutzer: ereignis.akteur.benutzer,
      akteurHost: ereignis.akteur.host,
      grund: "ART",
    });
    return;
  }

  switch (ereignis.typ) {
    case "EinsatzAngelegt":
      nimmEinsatzAnlage(faltung, ereignis);
      return;

    case "AbschnittAngelegt": {
      const id = ereignis.nutzlast.abschnittId;
      if (id === AUFFANG_ABSCHNITT_ID || id === ARCHIV_ABSCHNITT_ID) {
        // Der Auffang ist systemseitig (Auflage 10). Wuerde eine Anlage ihn
        // ueberschreiben, koennte sie ihm einen nicht zaehlenden Typ geben —
        // und die Staerke jeder Einheit, die dort landet, verschwaende aus der
        // Gesamtstaerke. Die Id ist deshalb reserviert.
        faltung.reservierteId.set(ereignis.id, id);
        return;
      }
      faltung.abschnitte.set(
        id,
        nimmAnlage(faltung.abschnitte.get(id), {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          wanduhr: ereignis.wanduhr,
          ereignisart: ereignis.typ,
          grund: ereignis.grund,
          nutzlast: ereignis.nutzlast,
          neu: {
            name: ereignis.nutzlast.name,
            abschnittstyp: ereignis.nutzlast.abschnittstyp,
            parentId: ereignis.nutzlast.parentId,
            reihenfolge: ereignis.nutzlast.reihenfolge,
          },
        }),
      );
      return;
    }

    case "EinheitGemeldet": {
      const nutzlast = ereignis.nutzlast;
      aendereEinheit(faltung, nutzlast.einheitId, (bisher) => ({
        ...bisher,
        anlage: nimmAnlage(bisher.anlage, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          wanduhr: ereignis.wanduhr,
          ereignisart: ereignis.typ,
          grund: ereignis.grund,
          nutzlast: ereignis.nutzlast,
          neu: {
            stamm: {
              bezeichnung: nutzlast.bezeichnung,
              organisation: nutzlast.organisation,
              organisationName: nutzlast.organisationName,
              ebene: nutzlast.ebene,
              personalErfassung: nutzlast.personalErfassung,
              status: nutzlast.status,
              schicht: nutzlast.schicht,
            },
            abschnittId: nutzlast.abschnittId,
            staerke: nutzlast.staerke,
          },
        }),
      }));
      return;
    }

    case "EinheitVerschoben":
      aendereEinheit(faltung, ereignis.nutzlast.einheitId, (bisher) => ({
        ...bisher,
        verschiebungen: nimmBeobachtung(bisher.verschiebungen, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          wanduhr: ereignis.wanduhr,
          ereignisart: ereignis.typ,
          grund: ereignis.grund,
          neu: ereignis.neu,
          vorher: ereignis.vorher,
        }),
      }));
      return;

    case "StaerkeGeaendert":
      aendereEinheit(faltung, ereignis.nutzlast.einheitId, (bisher) => ({
        ...bisher,
        staerkemeldungen: nimmBeobachtung(bisher.staerkemeldungen, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          wanduhr: ereignis.wanduhr,
          ereignisart: ereignis.typ,
          grund: ereignis.grund,
          neu: ereignis.neu,
          vorher: ereignis.vorher,
        }),
      }));
      return;
  }
}

/**
 * Nimmt Ereignisse in eine bestehende Faltung auf — der Live-Pfad (Rebase).
 *
 * Rein: die uebergebene Faltung bleibt unveraendert, das Ergebnis ist eine
 * neue. Die Reihenfolge der uebergebenen Ereignisse ist ohne Bedeutung, und
 * ebenso, ob sie in einem Aufruf oder in mehreren kommen. Genau das prueft P1.
 */
export function falteHinzu(faltung: Faltung, ereignisse: Iterable<EingehendesEreignis>): Faltung {
  const naechste = kopiere(faltung);
  for (const ereignis of ereignisse) nimmAuf(naechste, ereignis);
  return naechste;
}

/** Faltet eine Ereignismenge von Grund auf. */
export function falteAuf(ereignisse: Iterable<EingehendesEreignis>): Faltung {
  return falteHinzu(leereFaltung(), ereignisse);
}

// ---------------------------------------------------------------------------
// Materialisierung (§7.4 und §7.6)
// ---------------------------------------------------------------------------

function beobachtungAus<T>(b: Beobachtung<unknown>, wert: T): Feld<T> {
  return {
    wert,
    hlc: b.hlc,
    durch: b.ereignisId,
    ...(b.wanduhr === undefined ? {} : { wanduhr: b.wanduhr }),
    ...(b.vorher === undefined ? {} : { gesehenerVorher: { wert: b.vorher as T } }),
  };
}

/**
 * Baut ein Feld samt seiner zweithoechsten Beobachtung (§3.3).
 *
 * Der `zweiter` steht im Zustand und nicht nur im Akkumulator: Ohne ihn liesse
 * sich `vorherPasstNicht` nach einem Schnappschuss nicht mehr bilden, und der
 * Rebase nach dem Laden entschiede anders als der volle Fold (P7).
 */
function feldAus<T>(stand: FeldStand<T>): Feld<T> {
  const gewinner = beobachtungAus(stand.gewinner, stand.gewinner.neu);
  if (stand.zweiter === undefined) return gewinner;
  return { ...gewinner, zweiter: beobachtungAus(stand.zweiter, stand.zweiter.neu) };
}

function feld<T>(beobachtung: Beobachtung<unknown>, wert: T): Feld<T> {
  return beobachtungAus(beobachtung, wert);
}

/** `undefined` bleibt `undefined` — §7.6 laesst Felder ohne Wert weg, statt `null` zu schreiben. */
function feldOptional<T>(
  beobachtung: Beobachtung<unknown>,
  wert: T | undefined,
): Feld<T> | undefined {
  return wert === undefined ? undefined : beobachtungAus(beobachtung, wert);
}

/**
 * Prueft den gesehenen Vorher-Wert des Gewinners gegen das, was der
 * naechstniedrigere Schreiber gesetzt hat (§2.2a, Auflage 6).
 *
 * Ohne zweite Beobachtung gibt es nichts, was dem gesehenen Wert
 * widerspraeche — dann auch keinen Hinweis.
 *
 * Der Akkumulator haelt je Feld zwei Beobachtungen; damit erhaelt bei drei und
 * mehr nebenlaeufigen Schreibern nur der zweithoechste einen Hinweis, die
 * darunter nicht. Das ist keine Bequemlichkeit, sondern folgt aus §3.1: Ein
 * Schnappschuss traegt den Zustand samt Feld-HLC, nicht den Ereignisstrom —
 * ein Akkumulator, der alle Beobachtungen braeuchte, waere aus einem
 * Schnappschuss nicht wiederherstellbar. KONZEPT-EREIGNISSE.md §8.2 fuehrt die
 * Schranke als Nicht-Zusicherung.
 */
function vorherHinweis<T>(stand: FeldStand<T>, feldpfad: string): Konflikthinweis | undefined {
  const { gewinner, zweiter } = stand;
  if (zweiter === undefined) return undefined; // nichts, was dem Gewinner widerspraeche

  if (gewinner.vorher === undefined) {
    // Der Gewinner hat keinen Vorher-Wert mitgefuehrt — das ist die Anlage —
    // und verdraengt trotzdem eine Aenderung. Er kann sie nicht gesehen haben;
    // ohne Hinweis waere das genau das stille Verwerfen, das §2.3 ausschliesst.
    return wertGleich(gewinner.neu, zweiter.neu)
      ? undefined
      : {
          art: "ohneVorherWertVerdraengt",
          feldpfad,
          gewinner: gewinner.ereignisId,
          verdraengt: zweiter.ereignisId,
          verdraengterWert: zweiter.neu as KanonischerWert,
        };
  }

  if (wertGleich(gewinner.vorher, zweiter.neu)) return undefined;
  return {
    art: "vorherPasstNicht",
    feldpfad,
    gewinner: gewinner.ereignisId,
    verdraengt: zweiter.ereignisId,
    gesehen: gewinner.vorher as KanonischerWert,
    verdraengterWert: zweiter.neu as KanonischerWert,
  };
}

/**
 * Die verworfenen Anlagen einer Entitaet, wie §3.2 sie im Zustand haelt —
 * nach `durch` geordnet, damit die Serialisierung stabil ist.
 */
function verworfeneAnlagenAus<T>(stand: AnlageStand<T>): VerworfeneAnlage[] {
  return [...stand.verworfen.values()]
    .map((b) => ({
      durch: b.ereignisId,
      hlc: b.hlc,
      ereignisart: b.ereignisart ?? "",
      inhalt: (b.nutzlast ?? b.neu) as KanonischerWert,
      ...(b.grund === undefined ? {} : { grund: b.grund }),
    }))
    .sort((a, c) => vergleicheNachCodepunkt(a.durch, c.durch));
}

/**
 * Der Hinweis zu jeder verworfenen Anlage (§3.11).
 *
 * **Auch bei Inhaltsgleichheit.** Zwei Clients, die dieselbe Einheit gleich
 * anlegen, sind eine Auskunft ueber die Lage der Arbeitsplaetze — anders als
 * bei den Inhaltsschluesseln aus §3.6, wo dieselbe Meldung zweimal zu scannen
 * ein Alltagsvorgang ist (T100, T52).
 */
function anlageHinweise(
  feldpfad: string,
  stand: AnlageStand<unknown>,
  verworfene: readonly VerworfeneAnlage[],
): Konflikthinweis[] {
  return verworfene.map((v) => ({
    art: "zweiteAnlageVerworfen" as const,
    feldpfad,
    verworfen: v.durch,
    gilt: stand.gewinner.ereignisId,
    ereignisart: v.ereignisart,
    inhalt: v.inhalt,
    ...(v.grund === undefined ? {} : { grund: v.grund }),
  }));
}

/** Die Anlagedaten, die §3.2 an jeder Entitaet verlangt. */
function anlageAus<T>(stand: AnlageStand<T>): {
  angelegtDurch: EreignisId;
  angelegtMit: Hlc;
  angelegtMitNutzlast: KanonischerWert;
  angelegtMitArt: string;
  angelegtMitGrund?: string;
} {
  const g = stand.gewinner;
  return {
    angelegtDurch: g.ereignisId,
    angelegtMit: g.hlc,
    angelegtMitNutzlast: (g.nutzlast ?? g.neu) as KanonischerWert,
    angelegtMitArt: g.ereignisart ?? "",
    ...(g.grund === undefined ? {} : { angelegtMitGrund: g.grund }),
  };
}

function idsAus(...staende: ReadonlyArray<FeldStand<unknown> | undefined>): EreignisId[] {
  const ids = new Set<EreignisId>();
  for (const stand of staende) {
    if (stand === undefined) continue;
    ids.add(stand.gewinner.ereignisId);
    if (stand.zweiter !== undefined) ids.add(stand.zweiter.ereignisId);
  }
  return [...ids].sort(vergleicheNachCodepunkt);
}

/**
 * Die beiden systemseitigen Abschnitte (§5.3.4).
 *
 * Sie entstehen ohne Ereignis; deshalb tragen sie weder eine echte Feld-HLC
 * noch eine Ereignis-Id noch eine Wanduhr. Die Platzhalter-HLC steht nur in
 * ihren Feldern und wird nirgends verglichen — beide nehmen an keinem Konflikt
 * teil, weil ihre Ids reserviert sind.
 */
const SYSTEM_HLC: Hlc = { millisekunden: 0, zaehler: 0, clientId: "system" };

/** Die acht Abschnittstypen aus §5.3.3; `ANGEFORDERT` und `ARCHIV` zaehlen nicht. */
const NICHT_ZAEHLENDE_TYPEN: ReadonlySet<string> = new Set(["ANGEFORDERT", "ARCHIV"]);

function zaehlt(typ: string): boolean {
  return !NICHT_ZAEHLENDE_TYPEN.has(typ);
}

const AUFFANG: AbschnittZustand = {
  id: AUFFANG_ABSCHNITT_ID,
  angelegtMit: SYSTEM_HLC,
  name: { wert: "Auffang", hlc: SYSTEM_HLC },
  typ: { wert: "EINSATZORT", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 0, hlc: SYSTEM_HLC },
  verworfeneAnlagen: [],
  systemAbschnitt: true,
  zaehltInGesamtstaerke: true,
};

const ARCHIV: AbschnittZustand = {
  id: ARCHIV_ABSCHNITT_ID,
  angelegtMit: SYSTEM_HLC,
  name: { wert: "Archiv", hlc: SYSTEM_HLC },
  typ: { wert: "ARCHIV", hlc: SYSTEM_HLC },
  reihenfolge: { wert: Number.MAX_SAFE_INTEGER, hlc: SYSTEM_HLC },
  verworfeneAnlagen: [],
  systemAbschnitt: true,
  zaehltInGesamtstaerke: false,
};

/** Schluessel in Codepoint-Ordnung — §7.6 ordnet so, und der Zustand soll es auch tun. */
function sortierteSchluessel<T>(quelle: ReadonlyMap<string, T>): string[] {
  return [...quelle.keys()].sort(vergleicheNachCodepunkt);
}

/**
 * Baut aus einer Map die Datensammlung des Zustands: Schluessel in
 * Codepoint-Ordnung, **ohne Prototyp**.
 *
 * Der fehlende Prototyp ist kein Feinschliff. Eine Abschnitts- oder
 * Einheiten-Id ist eine Nutzlast aus einer fremden Datei; heisst sie
 * `__proto__`, waere `sammlung[id] = wert` an einem gewoehnlichen Objekt kein
 * Eintrag, sondern ein Aufruf des Prototyp-Setzers. Der Abschnitt verschwaende
 * spurlos, die Einheit ebenso — und P5 waere trivial erfuellt, weil es die
 * Einheit gar nicht mehr gaebe.
 */
function alsDatensammlung<T>(quelle: ReadonlyMap<string, T>): { readonly [id: string]: T } {
  const sammlung = Object.create(null) as Record<string, T>;
  for (const id of sortierteSchluessel(quelle)) {
    sammlung[id] = quelle.get(id) as T;
  }
  return sammlung;
}

/** Eine leere Datensammlung — die Zielstruktur haelt sie vor, auch wenn sie leer bleibt. */
function leereSammlung<T>(): { readonly [id: string]: T } {
  return Object.create(null) as Record<string, T>;
}

/**
 * Erzeugt aus der Faltung den materialisierten Zustand nach §3.2.
 *
 * Rein und ohne Zustand: derselbe Akkumulator ergibt immer denselben Zustand,
 * und zwar bis in die Schluesselreihenfolge der Datensammlungen hinein.
 *
 * Sortiert wird hier ausschliesslich zur Ausgabe bereits feststehender
 * Mengen; keine dieser Sortierungen entscheidet einen Konflikt (siehe
 * Modulkopf zu Auflage 18).
 */
export function materialisiere(faltung: Faltung): Zustand {
  const hinweise: Konflikthinweis[] = [];
  const wartend = new Map<string, WartendeBeobachtung[]>();

  let einsatz: EinsatzZustand | undefined;
  const einsatzAnlage = faltung.einsatzAnlage;
  if (einsatzAnlage !== undefined) {
    const anlage = einsatzAnlage.gewinner;
    const verworfeneAnlagen = verworfeneAnlagenAus(einsatzAnlage);
    einsatz = {
      ...anlageAus(einsatzAnlage),
      id: anlage.neu.einsatzId,
      name: feld(anlage, anlage.neu.name),
      art: feld(anlage, anlage.neu.art),
      fuestName: feld(anlage, anlage.neu.fuestName),
      uebergeordneteFuestName: feldOptional(anlage, anlage.neu.uebergeordneteFuestName),
      beginn: feld(anlage, anlage.neu.beginn),
      schichtmodell: feld(anlage, anlage.neu.schichtmodell),
      kosten: {},
      verworfeneAnlagen,
      status: "AKTIV",
    };
    hinweise.push(...anlageHinweise("einsatz", einsatzAnlage, verworfeneAnlagen));
  }

  for (const [verworfen, id] of faltung.reservierteId) {
    hinweise.push({
      art: "reservierteIdVerworfen",
      feldpfad: `abschnitt/${id}`,
      verworfen,
      id,
    });
  }

  const gebaut = new Map<string, AbschnittZustand>([
    [AUFFANG_ABSCHNITT_ID, AUFFANG],
    [ARCHIV_ABSCHNITT_ID, ARCHIV],
  ]);
  for (const [id, stand] of faltung.abschnitte) {
    const g = stand.gewinner;
    const verworfeneAnlagen = verworfeneAnlagenAus(stand);
    gebaut.set(id, {
      ...anlageAus(stand),
      id,
      name: feld(g, g.neu.name),
      typ: feld(g, g.neu.abschnittstyp),
      parentId: feldOptional(g, g.neu.parentId),
      reihenfolge: feld(g, g.neu.reihenfolge),
      verworfeneAnlagen,
      zaehltInGesamtstaerke: zaehlt(g.neu.abschnittstyp),
    });
    hinweise.push(...anlageHinweise(`abschnitt/${id}`, stand, verworfeneAnlagen));
  }
  const abschnitte = alsDatensammlung(gebaut);

  const gebauteEinheiten = new Map<string, EinheitZustand>();
  for (const id of sortierteSchluessel(faltung.einheiten)) {
    const faltungDerEinheit = faltung.einheiten.get(id) as EinheitFaltung;
    const { anlage, verschiebungen, staerkemeldungen } = faltungDerEinheit;
    if (anlage === undefined) {
      // Feldaenderungen ohne Anlage: die Beobachtungen warten sichtbar im
      // Zustand und wirken, sobald das `EinheitGemeldet` eintrifft (§3.10).
      const wartende: WartendeBeobachtung[] = [];
      if (verschiebungen !== undefined) {
        wartende.push({
          feld: "abschnittId",
          beobachtung: feldAus(verschiebungen) as never,
        });
      }
      if (staerkemeldungen !== undefined) {
        wartende.push({ feld: "staerke", beobachtung: feldAus(staerkemeldungen) as never });
      }
      wartend.set(`einheit/${id}`, wartende);
      hinweise.push({
        art: "anlageFehlt",
        feldpfad: `einheit/${id}`,
        wartende: idsAus(verschiebungen, staerkemeldungen),
      });
      continue;
    }

    const g = anlage.gewinner;
    // Die Anlage setzt `abschnittId` und `staerke` mit, aber ohne gesehenen
    // Vorher-Wert — es gab vorher nichts zu sehen. Sie wird erst hier mit den
    // Feldaenderungen zusammengefuehrt, damit eine verworfene zweite Anlage
    // die spaetere Arbeit an der Einheit nicht ueberschreiben kann.
    const abschnittStand = nimmBeobachtung(verschiebungen, {
      hlc: g.hlc,
      ereignisId: g.ereignisId,
      wanduhr: g.wanduhr,
      ereignisart: g.ereignisart,
      neu: g.neu.abschnittId,
    });
    const staerkeStand = nimmBeobachtung(staerkemeldungen, {
      hlc: g.hlc,
      ereignisId: g.ereignisId,
      wanduhr: g.wanduhr,
      ereignisart: g.ereignisart,
      neu: g.neu.staerke,
    });

    const gewaehlt = abschnittStand.gewinner.neu;
    const existiert = Object.hasOwn(abschnitte, gewaehlt);
    if (!existiert) {
      hinweise.push({
        art: "abschnittUnbekannt",
        feldpfad: `einheit/${id}/abschnittId`,
        gemeldeterAbschnittId: gewaehlt,
      });
    }
    const wirksamerAbschnittId = existiert ? gewaehlt : AUFFANG_ABSCHNITT_ID;
    const staerke = staerkeStand.gewinner.neu;
    const verworfeneAnlagen = verworfeneAnlagenAus(anlage);

    gebauteEinheiten.set(id, {
      ...anlageAus(anlage),
      id,
      abschnittId: feldAus(abschnittStand),
      reihenfolge: feld(g, 0),
      bezeichnung: feld(g, g.neu.stamm.bezeichnung),
      organisation: feld(g, g.neu.stamm.organisation),
      organisationName: feldOptional(g, g.neu.stamm.organisationName),
      ebene: feld(g, g.neu.stamm.ebene),
      staerke: feldAus(staerkeStand),
      personalErfassung: feld(g, g.neu.stamm.personalErfassung),
      status: feld(g, g.neu.stamm.status),
      schicht: feldOptional(g, g.neu.stamm.schicht),
      logistik: leereSammlung<Feld<number>>(),
      verworfeneAnlagen,
      wirksamerAbschnittId,
      wirksameStaerkeRechnerisch: staerke,
      wirksameStaerke: staerkeGeklemmt(staerke),
      wirksamAufgegangen: false,
      zaehlt: (abschnitte[wirksamerAbschnittId]?.zaehltInGesamtstaerke ?? false),
    });

    hinweise.push(...anlageHinweise(`einheit/${id}`, anlage, verworfeneAnlagen));

    const abschnittHinweis = vorherHinweis(abschnittStand, `einheit/${id}/abschnittId`);
    if (abschnittHinweis !== undefined) hinweise.push(abschnittHinweis);
    const staerkeHinweis = vorherHinweis(staerkeStand, `einheit/${id}/staerke`);
    if (staerkeHinweis !== undefined) hinweise.push(staerkeHinweis);
  }

  // `hinweise` ist eine **Menge** (§3.8): bytegleiche Eintraege fallen zusammen,
  // sonst haenge ihre Zahl daran, wie oft eine Umsetzung die Ableitung aufruft.
  const nachSerialisierung = new Map<string, Konflikthinweis>();
  for (const hinweis of hinweise) {
    nachSerialisierung.set(
      kanonischeSerialisierung(hinweis as unknown as KanonischerWert),
      hinweis,
    );
  }
  const geordnet = [...nachSerialisierung.keys()]
    .sort(vergleicheNachCodepunkt)
    .map((schluessel) => nachSerialisierung.get(schluessel) as Konflikthinweis);

  const unbekannt = [...faltung.unbekannt.values()].sort((a, b) =>
    vergleicheNachCodepunkt(a.id, b.id),
  );

  return {
    foldVersion: faltung.foldVersion,
    einsatz,
    abschnitte,
    einheiten: alsDatensammlung(gebauteEinheiten),
    fahrzeuge: leereSammlung(),
    personen: leereSammlung(),
    auftraege: leereSammlung(),
    anforderungen: leereSammlung(),
    dienstposten: leereSammlung(),
    schichtplan: leereSammlung(),
    meldungen: leereSammlung(),
    anhaenge: leereSammlung(),
    etbEintraege: leereSammlung(),
    archivierungen: leereSammlung(),
    hinweise: geordnet,
    unbekannt,
    wartend: alsDatensammlung(wartend),
    verworfeneSchluessel: [],
  };
}

/**
 * Faltet eine Ereignismenge zum Zustand — die Mengenfunktion aus Auflage 4.
 *
 * Das Ergebnis haengt allein von der Menge der Ereignisse ab, nicht von ihrer
 * Reihenfolge und nicht davon, in wie vielen Schueben sie ankommen.
 */
export function falte(ereignisse: Iterable<EingehendesEreignis>): Zustand {
  return materialisiere(falteAuf(ereignisse));
}
