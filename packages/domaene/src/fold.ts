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
 * ist: je Feld werden die **beiden hoechsten Beobachtungen** nach
 * HLC-Ordnung gehalten (mehr braucht keine der fuenf Konfliktregeln). Es gibt
 * keine Stelle, an der eine Ereignisliste sortiert und dann der Reihe nach
 * angewandt wuerde.
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
 * Sortiert wird an genau einer Stelle: bei der Ausgabe der Konflikthinweise
 * in {@link materialisiere}. Das ist eine Darstellungsreihenfolge einer
 * bereits feststehenden Menge, keine Entscheidung des Folds.
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
import { kanonischeSerialisierung, type KanonischerWert } from "./kanonisch.js";
import {
  AUFFANG_ABSCHNITT_ID,
  FOLD_VERSION,
  type AbschnittZustand,
  type EinheitZustand,
  type EinsatzZustand,
  type Feld,
  type Konflikthinweis,
  type UnbekanntesEreignis,
  type Zustand,
} from "./zustand.js";

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

function nimmBeobachtung<T>(stand: FeldStand<T> | undefined, neu: Beobachtung<T>): FeldStand<T> {
  if (stand === undefined) return { gewinner: neu };

  const gegenGewinner = vergleicheHlc(neu.hlc, stand.gewinner.hlc);
  if (gegenGewinner === 0) return stand; // dasselbe Ereignis noch einmal — idempotent (P2)
  if (gegenGewinner > 0) return { gewinner: neu, zweiter: stand.gewinner };

  if (stand.zweiter === undefined) return { gewinner: stand.gewinner, zweiter: neu };
  return vergleicheHlc(neu.hlc, stand.zweiter.hlc) > 0
    ? { gewinner: stand.gewinner, zweiter: neu }
    : stand;
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

interface EinheitFaltung {
  /** Aus `EinheitGemeldet`; ohne sie ist die Einheit noch nicht materialisierbar. */
  readonly stamm?: FeldStand<EinheitStammWerte>;
  /** Aus `EinheitGemeldet` (ohne Vorher-Wert) und `EinheitVerschoben` (mit). */
  readonly abschnittId?: FeldStand<string>;
  /** Aus `EinheitGemeldet` (ohne Vorher-Wert) und `StaerkeGeaendert` (mit). */
  readonly staerke?: FeldStand<Staerke>;
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
  einsatzAnlage?: Beobachtung<EinsatzWerte>;
  /** Verworfene zweite Anlagen; wird zum Konflikthinweis. */
  readonly einsatzVerworfen: Map<EreignisId, Hlc>;
  readonly abschnitte: Map<string, FeldStand<AbschnittWerte>>;
  readonly einheiten: Map<string, EinheitFaltung>;
  readonly unbekannt: Map<EreignisId, UnbekanntesEreignis>;
}

/** Eine leere Faltung. */
export function leereFaltung(): Faltung {
  return {
    foldVersion: FOLD_VERSION,
    gesehen: new Set(),
    einsatzVerworfen: new Map(),
    abschnitte: new Map(),
    einheiten: new Map(),
    unbekannt: new Map(),
  };
}

function kopiere(faltung: Faltung): Faltung {
  return {
    foldVersion: faltung.foldVersion,
    gesehen: new Set(faltung.gesehen),
    einsatzAnlage: faltung.einsatzAnlage,
    einsatzVerworfen: new Map(faltung.einsatzVerworfen),
    abschnitte: new Map(faltung.abschnitte),
    einheiten: new Map(faltung.einheiten),
    unbekannt: new Map(faltung.unbekannt),
  };
}

// ---------------------------------------------------------------------------
// Die Aufnahmeoperation
// ---------------------------------------------------------------------------

function nimmEinsatzAnlage(faltung: Faltung, ereignis: Ereignis & { typ: "EinsatzAngelegt" }): void {
  const beobachtung: Beobachtung<EinsatzWerte> = {
    hlc: ereignis.hlc,
    ereignisId: ereignis.id,
    neu: {
      einsatzId: ereignis.nutzlast.einsatzId,
      name: ereignis.nutzlast.name,
      art: ereignis.nutzlast.art,
      fuestName: ereignis.nutzlast.fuestName,
      uebergeordneteFuestName: ereignis.nutzlast.uebergeordneteFuestName,
      beginn: ereignis.nutzlast.beginn,
      schichtmodell: ereignis.nutzlast.schichtmodell,
    },
  };

  const bisher = faltung.einsatzAnlage;
  if (bisher === undefined) {
    faltung.einsatzAnlage = beobachtung;
    return;
  }
  // „erstes Ereignis der Akte; ein zweites wird verworfen" (§4.2): die
  // kleinste HLC gilt. Auch das ist eine Mengenoperation — trifft die
  // kleinere spaeter ein, uebernimmt sie und verdraengt die bisherige.
  if (vergleicheHlc(beobachtung.hlc, bisher.hlc) < 0) {
    faltung.einsatzAnlage = beobachtung;
    faltung.einsatzVerworfen.set(bisher.ereignisId, bisher.hlc);
  } else {
    faltung.einsatzVerworfen.set(beobachtung.ereignisId, beobachtung.hlc);
  }
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
    });
    return;
  }

  switch (ereignis.typ) {
    case "EinsatzAngelegt":
      nimmEinsatzAnlage(faltung, ereignis);
      return;

    case "AbschnittAngelegt": {
      const id = ereignis.nutzlast.abschnittId;
      faltung.abschnitte.set(
        id,
        nimmBeobachtung(faltung.abschnitte.get(id), {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
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
        stamm: nimmBeobachtung(bisher.stamm, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          neu: {
            bezeichnung: nutzlast.bezeichnung,
            organisation: nutzlast.organisation,
            organisationName: nutzlast.organisationName,
            ebene: nutzlast.ebene,
            personalErfassung: nutzlast.personalErfassung,
            status: nutzlast.status,
            schicht: nutzlast.schicht,
          },
        }),
        // Die Anlage setzt `abschnittId` und `staerke` mit, aber ohne
        // gesehenen Vorher-Wert — es gab vorher nichts zu sehen.
        abschnittId: nimmBeobachtung(bisher.abschnittId, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          neu: nutzlast.abschnittId,
        }),
        staerke: nimmBeobachtung(bisher.staerke, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          neu: nutzlast.staerke,
        }),
      }));
      return;
    }

    case "EinheitVerschoben":
      aendereEinheit(faltung, ereignis.nutzlast.einheitId, (bisher) => ({
        ...bisher,
        abschnittId: nimmBeobachtung(bisher.abschnittId, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
          neu: ereignis.neu,
          vorher: ereignis.vorher,
        }),
      }));
      return;

    case "StaerkeGeaendert":
      aendereEinheit(faltung, ereignis.nutzlast.einheitId, (bisher) => ({
        ...bisher,
        staerke: nimmBeobachtung(bisher.staerke, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
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

function feld<T>(beobachtung: Beobachtung<unknown>, wert: T): Feld<T> {
  return { wert, hlc: beobachtung.hlc, durch: beobachtung.ereignisId };
}

/** `undefined` bleibt `undefined` — §7.6 laesst Felder ohne Wert weg, statt `null` zu schreiben. */
function feldOptional<T>(beobachtung: Beobachtung<unknown>, wert: T | undefined): Feld<T> | undefined {
  return wert === undefined ? undefined : { wert, hlc: beobachtung.hlc, durch: beobachtung.ereignisId };
}

/**
 * Prueft den gesehenen Vorher-Wert des Gewinners gegen das, was der
 * naechstniedrigere Schreiber gesetzt hat (§2.5, Auflage 6).
 *
 * Ohne zweite Beobachtung gibt es nichts, was dem gesehenen Wert
 * widerspraeche — dann auch keinen Hinweis.
 */
function vorherHinweis<T>(stand: FeldStand<T>, feldpfad: string): Konflikthinweis | undefined {
  const { gewinner, zweiter } = stand;
  if (gewinner.vorher === undefined || zweiter === undefined) return undefined;
  if (wertGleich(gewinner.vorher, zweiter.neu)) return undefined;
  return {
    art: "vorherPasstNicht",
    feldpfad,
    gewinner: gewinner.ereignisId,
    verdraengt: zweiter.ereignisId,
  };
}

function idsAus(...staende: ReadonlyArray<FeldStand<unknown> | undefined>): EreignisId[] {
  const ids = new Set<EreignisId>();
  for (const stand of staende) {
    if (stand === undefined) continue;
    ids.add(stand.gewinner.ereignisId);
    if (stand.zweiter !== undefined) ids.add(stand.zweiter.ereignisId);
  }
  return [...ids].sort();
}

/** Der systemseitige Auffangabschnitt (Auflage 10); er entsteht ohne Ereignis. */
const AUFFANG: AbschnittZustand = {
  id: AUFFANG_ABSCHNITT_ID,
  name: { wert: "Auffang", hlc: { millisekunden: 0, zaehler: 0, clientId: "system" }, durch: "system:0" },
  abschnittstyp: {
    wert: "EINSATZORT",
    hlc: { millisekunden: 0, zaehler: 0, clientId: "system" },
    durch: "system:0",
  },
  reihenfolge: {
    wert: 0,
    hlc: { millisekunden: 0, zaehler: 0, clientId: "system" },
    durch: "system:0",
  },
  systemAbschnitt: true,
};

/**
 * Erzeugt aus der Faltung den materialisierten Zustand nach §7.4.
 *
 * Rein und ohne Zustand: derselbe Akkumulator ergibt immer denselben Zustand.
 * Die Hinweise werden am Ende in eine feste Darstellungsreihenfolge gebracht —
 * das ist eine Ausgabeordnung einer bereits feststehenden Menge und keine
 * Entscheidung des Folds (siehe Modulkopf).
 */
export function materialisiere(faltung: Faltung): Zustand {
  const hinweise: Konflikthinweis[] = [];

  let einsatz: EinsatzZustand | undefined;
  const anlage = faltung.einsatzAnlage;
  if (anlage !== undefined) {
    einsatz = {
      id: anlage.neu.einsatzId,
      angelegtDurch: anlage.ereignisId,
      angelegtMit: anlage.hlc,
      name: feld(anlage, anlage.neu.name),
      art: feld(anlage, anlage.neu.art),
      fuestName: feld(anlage, anlage.neu.fuestName),
      uebergeordneteFuestName: feldOptional(anlage, anlage.neu.uebergeordneteFuestName),
      beginn: feld(anlage, anlage.neu.beginn),
      schichtmodell: feld(anlage, anlage.neu.schichtmodell),
    };
    for (const verworfen of faltung.einsatzVerworfen.keys()) {
      hinweise.push({
        art: "zweiteAnlageVerworfen",
        feldpfad: "einsatz",
        verworfen,
        gilt: anlage.ereignisId,
      });
    }
  }

  const abschnitte: Record<string, AbschnittZustand> = { [AUFFANG_ABSCHNITT_ID]: AUFFANG };
  for (const [id, stand] of faltung.abschnitte) {
    const g = stand.gewinner;
    abschnitte[id] = {
      id,
      name: feld(g, g.neu.name),
      abschnittstyp: feld(g, g.neu.abschnittstyp),
      parentId: feldOptional(g, g.neu.parentId),
      reihenfolge: feld(g, g.neu.reihenfolge),
    };
  }

  const einheiten: Record<string, EinheitZustand> = {};
  for (const [id, faltungDerEinheit] of faltung.einheiten) {
    const { stamm, abschnittId, staerke } = faltungDerEinheit;
    if (stamm === undefined || abschnittId === undefined || staerke === undefined) {
      // Feldaenderungen ohne Anlage: die Beobachtungen bleiben in der Faltung
      // stehen und wirken, sobald das `EinheitGemeldet` eintrifft (Rebase).
      hinweise.push({
        art: "anlageFehlt",
        feldpfad: `einheit/${id}`,
        ereignisse: idsAus(stamm, abschnittId, staerke),
      });
      continue;
    }

    const gewaehlt = abschnittId.gewinner.neu;
    const existiert = Object.hasOwn(abschnitte, gewaehlt);
    if (!existiert) {
      hinweise.push({
        art: "abschnittUnbekannt",
        feldpfad: `einheit/${id}/abschnittId`,
        abschnittId: gewaehlt,
        gewinner: abschnittId.gewinner.ereignisId,
      });
    }

    const s = stamm.gewinner;
    einheiten[id] = {
      id,
      abschnittId: feld(abschnittId.gewinner, gewaehlt),
      wirksamerAbschnittId: existiert ? gewaehlt : AUFFANG_ABSCHNITT_ID,
      bezeichnung: feld(s, s.neu.bezeichnung),
      organisation: feld(s, s.neu.organisation),
      organisationName: feldOptional(s, s.neu.organisationName),
      ebene: feld(s, s.neu.ebene),
      staerke: feld(staerke.gewinner, staerke.gewinner.neu),
      personalErfassung: feld(s, s.neu.personalErfassung),
      status: feld(s, s.neu.status),
      schicht: feldOptional(s, s.neu.schicht),
    };

    const abschnittHinweis = vorherHinweis(abschnittId, `einheit/${id}/abschnittId`);
    if (abschnittHinweis !== undefined) hinweise.push(abschnittHinweis);
    const staerkeHinweis = vorherHinweis(staerke, `einheit/${id}/staerke`);
    if (staerkeHinweis !== undefined) hinweise.push(staerkeHinweis);
  }

  hinweise.sort((a, b) => {
    const links = kanonischeSerialisierung(a as unknown as KanonischerWert);
    const rechts = kanonischeSerialisierung(b as unknown as KanonischerWert);
    return links === rechts ? 0 : links < rechts ? -1 : 1;
  });

  const unbekannt = [...faltung.unbekannt.values()].sort((a, b) =>
    a.id === b.id ? 0 : a.id < b.id ? -1 : 1,
  );

  return { foldVersion: faltung.foldVersion, einsatz, abschnitte, einheiten, hinweise, unbekannt };
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
