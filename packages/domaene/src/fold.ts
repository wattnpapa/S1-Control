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
import {
  kanonischeSerialisierung,
  vergleicheNachCodepunkt,
  type KanonischerWert,
} from "./kanonisch.js";
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
 */
interface AnlageStand<T> {
  readonly gewinner: Beobachtung<T>;
  readonly verworfen: ReadonlyMap<EreignisId, true>;
}

function nimmAnlage<T>(stand: AnlageStand<T> | undefined, neu: Beobachtung<T>): AnlageStand<T> {
  if (stand === undefined) return { gewinner: neu, verworfen: new Map() };

  const gegenGewinner = vergleicheBeobachtung(neu, stand.gewinner);
  if (gegenGewinner === 0) return stand;

  const verworfen = new Map(stand.verworfen);
  if (gegenGewinner < 0) {
    // Die kleinere HLC uebernimmt, auch wenn sie spaeter eintrifft.
    verworfen.set(stand.gewinner.ereignisId, true);
    return { gewinner: neu, verworfen };
  }
  verworfen.set(neu.ereignisId, true);
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
  /** Anlagen, die die fuer den Auffang reservierte Abschnitts-Id belegen wollten. */
  readonly reservierteId: Map<EreignisId, true>;
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
    });
    return;
  }

  switch (ereignis.typ) {
    case "EinsatzAngelegt":
      nimmEinsatzAnlage(faltung, ereignis);
      return;

    case "AbschnittAngelegt": {
      const id = ereignis.nutzlast.abschnittId;
      if (id === AUFFANG_ABSCHNITT_ID) {
        // Der Auffang ist systemseitig (Auflage 10). Wuerde eine Anlage ihn
        // ueberschreiben, koennte sie ihm einen nicht zaehlenden Typ geben —
        // und die Staerke jeder Einheit, die dort landet, verschwaende aus der
        // Gesamtstaerke. Die Id ist deshalb reserviert.
        faltung.reservierteId.set(ereignis.id, true);
        return;
      }
      faltung.abschnitte.set(
        id,
        nimmAnlage(faltung.abschnitte.get(id), {
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
        ...bisher,
        anlage: nimmAnlage(bisher.anlage, {
          hlc: ereignis.hlc,
          ereignisId: ereignis.id,
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
 *
 * **Bekannte Beschraenkung von M0.2.** Der Akkumulator haelt je Feld zwei
 * Beobachtungen; damit erhaelt bei drei und mehr nebenlaeufigen Schreibern nur
 * der zweithoechste einen Hinweis, die darunter nicht. Die Schranke ist keine
 * Bequemlichkeit, sondern folgt aus §7.4: Ein Schnappschuss traegt den
 * Zustand samt Feld-HLC, nicht den Ereignisstrom — ein Akkumulator, der alle
 * Beobachtungen braeuchte, waere aus einem Schnappschuss nicht wiederher-
 * stellbar, und der Rebase nach dem Laden entschiede anders als der volle
 * Fold. Die vollstaendige Hinweiskette ueber mehr als zwei Schreiber ist
 * deshalb in `KONZEPT-EREIGNISSE.md` (M1.2) zu entscheiden, zusammen mit der
 * Frage, was ein Schnappschuss dafuer zusaetzlich mitschreiben muss.
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
    gesehenerVorher: gewinner.vorher as KanonischerWert,
    verdraengterWert: zweiter.neu as KanonischerWert,
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
 * Der systemseitige Auffangabschnitt (Auflage 10).
 *
 * Er entsteht ohne Ereignis; deshalb traegt er weder eine echte Feld-HLC noch
 * eine Ereignis-Id. Die Platzhalter-HLC ist die kleinstmoegliche und kann
 * damit nie eine echte Entscheidung verdraengen.
 */
const SYSTEM_HLC: Hlc = { millisekunden: 0, zaehler: 0, clientId: "system" };

const AUFFANG: AbschnittZustand = {
  id: AUFFANG_ABSCHNITT_ID,
  name: { wert: "Auffang", hlc: SYSTEM_HLC },
  abschnittstyp: { wert: "EINSATZORT", hlc: SYSTEM_HLC },
  reihenfolge: { wert: 0, hlc: SYSTEM_HLC },
  systemAbschnitt: true,
};

/** Schluessel in Codepoint-Ordnung — §7.6 ordnet so, und der Zustand soll es auch tun. */
function sortierteSchluessel<T>(quelle: ReadonlyMap<string, T>): string[] {
  return [...quelle.keys()].sort(vergleicheNachCodepunkt);
}

/**
 * Erzeugt aus der Faltung den materialisierten Zustand nach §7.4.
 *
 * Rein und ohne Zustand: derselbe Akkumulator ergibt immer denselben Zustand,
 * und zwar bis in die Schluesselreihenfolge der Datensammlungen hinein. Das
 * ist mehr, als die kanonische Serialisierung braeuchte — aber ein Verbraucher,
 * der `Object.entries` rendert, soll nicht auf zwei Rechnern zwei
 * Reihenfolgen zeigen.
 *
 * Sortiert wird hier ausschliesslich zur Ausgabe bereits feststehender
 * Mengen; keine dieser Sortierungen entscheidet einen Konflikt (siehe
 * Modulkopf zu Auflage 18).
 */
export function materialisiere(faltung: Faltung): Zustand {
  const hinweise: Konflikthinweis[] = [];

  let einsatz: EinsatzZustand | undefined;
  const einsatzAnlage = faltung.einsatzAnlage;
  if (einsatzAnlage !== undefined) {
    const anlage = einsatzAnlage.gewinner;
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
    for (const verworfen of einsatzAnlage.verworfen.keys()) {
      hinweise.push({
        art: "zweiteAnlageVerworfen",
        feldpfad: "einsatz",
        verworfen,
        gilt: anlage.ereignisId,
      });
    }
  }

  for (const verworfen of faltung.reservierteId.keys()) {
    hinweise.push({ art: "reservierteIdVerworfen", feldpfad: `abschnitt/${AUFFANG_ABSCHNITT_ID}`, verworfen });
  }

  const gebaut = new Map<string, AbschnittZustand>([[AUFFANG_ABSCHNITT_ID, AUFFANG]]);
  for (const [id, stand] of faltung.abschnitte) {
    const g = stand.gewinner;
    gebaut.set(id, {
      id,
      name: feld(g, g.neu.name),
      abschnittstyp: feld(g, g.neu.abschnittstyp),
      parentId: feldOptional(g, g.neu.parentId),
      reihenfolge: feld(g, g.neu.reihenfolge),
    });
    for (const verworfen of stand.verworfen.keys()) {
      hinweise.push({
        art: "zweiteAnlageVerworfen",
        feldpfad: `abschnitt/${id}`,
        verworfen,
        gilt: g.ereignisId,
      });
    }
  }
  const abschnitte: Record<string, AbschnittZustand> = {};
  for (const id of sortierteSchluessel(gebaut)) {
    abschnitte[id] = gebaut.get(id) as AbschnittZustand;
  }

  const einheiten: Record<string, EinheitZustand> = {};
  for (const id of sortierteSchluessel(faltung.einheiten)) {
    const faltungDerEinheit = faltung.einheiten.get(id) as EinheitFaltung;
    const { anlage, verschiebungen, staerkemeldungen } = faltungDerEinheit;
    if (anlage === undefined) {
      // Feldaenderungen ohne Anlage: die Beobachtungen bleiben in der Faltung
      // stehen und wirken, sobald das `EinheitGemeldet` eintrifft (Rebase).
      hinweise.push({
        art: "anlageFehlt",
        feldpfad: `einheit/${id}`,
        ereignisse: idsAus(verschiebungen, staerkemeldungen),
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
      neu: g.neu.abschnittId,
    });
    const staerkeStand = nimmBeobachtung(staerkemeldungen, {
      hlc: g.hlc,
      ereignisId: g.ereignisId,
      neu: g.neu.staerke,
    });

    const gewaehlt = abschnittStand.gewinner.neu;
    const existiert = Object.hasOwn(abschnitte, gewaehlt);
    if (!existiert) {
      hinweise.push({
        art: "abschnittUnbekannt",
        feldpfad: `einheit/${id}/abschnittId`,
        abschnittId: gewaehlt,
        gewinner: abschnittStand.gewinner.ereignisId,
      });
    }

    einheiten[id] = {
      id,
      abschnittId: feld(abschnittStand.gewinner, gewaehlt),
      wirksamerAbschnittId: existiert ? gewaehlt : AUFFANG_ABSCHNITT_ID,
      bezeichnung: feld(g, g.neu.stamm.bezeichnung),
      organisation: feld(g, g.neu.stamm.organisation),
      organisationName: feldOptional(g, g.neu.stamm.organisationName),
      ebene: feld(g, g.neu.stamm.ebene),
      staerke: feld(staerkeStand.gewinner, staerkeStand.gewinner.neu),
      personalErfassung: feld(g, g.neu.stamm.personalErfassung),
      status: feld(g, g.neu.stamm.status),
      schicht: feldOptional(g, g.neu.stamm.schicht),
    };

    for (const verworfen of anlage.verworfen.keys()) {
      hinweise.push({
        art: "zweiteAnlageVerworfen",
        feldpfad: `einheit/${id}`,
        verworfen,
        gilt: g.ereignisId,
      });
    }

    const abschnittHinweis = vorherHinweis(abschnittStand, `einheit/${id}/abschnittId`);
    if (abschnittHinweis !== undefined) hinweise.push(abschnittHinweis);
    const staerkeHinweis = vorherHinweis(staerkeStand, `einheit/${id}/staerke`);
    if (staerkeHinweis !== undefined) hinweise.push(staerkeHinweis);
  }

  hinweise.sort((a, b) =>
    vergleicheNachCodepunkt(
      kanonischeSerialisierung(a as unknown as KanonischerWert),
      kanonischeSerialisierung(b as unknown as KanonischerWert),
    ),
  );

  const unbekannt = [...faltung.unbekannt.values()].sort((a, b) =>
    vergleicheNachCodepunkt(a.id, b.id),
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
