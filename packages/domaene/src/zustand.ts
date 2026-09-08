/**
 * Der materialisierte Zustand des Minimalfolds.
 *
 * Jedes materialisierte Feld traegt die HLC des Ereignisses, das es gesetzt
 * hat — Auflage 4 und KONZEPT-SPEICHER.md §7.4. Diese Feld-HLC ist
 * ausdruecklich Bestandteil des Zustands und fliesst in die kanonische
 * Serialisierung und damit in den `zustandsHash` ein (§7.6): Zwei Clients mit
 * gleichen Werten, aber verschiedenen Gewinner-HLC sind *nicht* konvergent,
 * weil der naechste Rebase bei ihnen unterschiedlich entschiede.
 *
 * Der Zustand ist bewusst eine reine JSON-Struktur ohne `Map` und ohne
 * Klassen: Nur so laesst er sich unveraendert an die kanonische
 * Serialisierung reichen.
 */

import type {
  Abschnittstyp,
  EinheitStatus,
  EinsatzArt,
  EreignisId,
  Organisation,
  PersonalErfassung,
  Schicht,
  Schichtmodell,
  Staerke,
  TaktischeEbene,
} from "./ereignis.js";
import type { Hlc } from "./hlc.js";
import type { KanonischerWert } from "./kanonisch.js";

/**
 * Version der Fold-Implementierung; harte Schranke fuer Schnappschuesse
 * (§7.3, Auflage 4).
 *
 * Jede Aenderung an den Fold-Regeln erhoeht diese Zahl. M0.2 liefert die
 * erste; ein Schnappschuss mit abweichender Version wird stillschweigend
 * ignoriert und der Zustand aus den Ereignissen gefaltet.
 */
export const FOLD_VERSION = 1;

/**
 * Auffangabschnitt fuer Einheiten, deren Abschnitt (noch) nicht existiert.
 *
 * Auflage 10 verlangt eine Auffangregel fuer aufgeloeste Abschnitte, und der
 * Ereigniskatalog begruendet sie: „eine Einheit darf nie in einem nicht
 * existierenden Abschnitt haengen" (§4.2, `AbschnittAufgeloest`). Solange
 * `AbschnittAufgeloest` nicht zum Minimalset gehoert, greift die Regel hier
 * fuer den verwandten Fall des unbekannten Abschnitts — etwa weil das
 * `AbschnittAngelegt` eines anderen Clients noch unterwegs ist.
 *
 * Der Typ ist `EINSATZORT` und damit zaehlend: Die Staerke einer real
 * gemeldeten Einheit darf nicht dadurch aus der Gesamtstaerke verschwinden,
 * dass ein Ereignis noch fehlt.
 */
export const AUFFANG_ABSCHNITT_ID = "AUFFANG";

/** Ein materialisiertes Feld mit der HLC seines Gewinners (§7.4). */
export interface Feld<T> {
  readonly wert: T;
  readonly hlc: Hlc;
  /**
   * Das Ereignis, das dieses Feld gesetzt hat — fuer das Einsatztagebuch und
   * die Diagnose.
   *
   * Fehlt allein bei den Feldern des systemseitigen Auffangabschnitts: sie
   * entstehen ohne Ereignis, und eine erfundene Ereignis-Id waere eine, die
   * `zerlegeEreignisId` zu Recht zurueckwiese (§3.3).
   */
  readonly durch?: EreignisId;
}

export interface EinsatzZustand {
  readonly id: string;
  /** Die Anlage selbst: das Ereignis mit der kleinsten HLC (§4.2). */
  readonly angelegtDurch: EreignisId;
  readonly angelegtMit: Hlc;
  readonly name: Feld<string>;
  readonly art: Feld<EinsatzArt>;
  readonly fuestName: Feld<string>;
  readonly uebergeordneteFuestName?: Feld<string>;
  readonly beginn: Feld<string>;
  readonly schichtmodell: Feld<Schichtmodell>;
}

export interface AbschnittZustand {
  readonly id: string;
  readonly name: Feld<string>;
  readonly abschnittstyp: Feld<Abschnittstyp>;
  readonly parentId?: Feld<string>;
  readonly reihenfolge: Feld<number>;
  /** `true` beim systemseitigen Auffangabschnitt; er entsteht ohne Ereignis. */
  readonly systemAbschnitt?: boolean;
}

export interface EinheitZustand {
  readonly id: string;
  /** Der Gewinner des Feldes `abschnittId` — die Entscheidung des Folds, unveraendert. */
  readonly abschnittId: Feld<string>;
  /**
   * Der Abschnitt, in dem die Einheit tatsaechlich haengt.
   *
   * Gleich `abschnittId.wert`, solange dieser Abschnitt existiert; sonst
   * {@link AUFFANG_ABSCHNITT_ID}. Abgeleitet, aber Bestandteil des Zustands:
   * jeder Client leitet ihn aus derselben Ereignismenge gleich ab.
   */
  readonly wirksamerAbschnittId: string;
  readonly bezeichnung: Feld<string>;
  readonly organisation: Feld<Organisation>;
  readonly organisationName?: Feld<string>;
  readonly ebene: Feld<TaktischeEbene>;
  readonly staerke: Feld<Staerke>;
  readonly personalErfassung: Feld<PersonalErfassung>;
  readonly status: Feld<EinheitStatus>;
  readonly schicht?: Feld<Schicht>;
}

/**
 * Ein Konflikthinweis ist Teil des Zustands, nicht der Oberflaeche.
 *
 * Auflage 6 und §2.5: Last-Writer-Wins ohne diesen Hinweis waere stilles
 * Verwerfen. Prueflkriterium P3 verlangt ausdruecklich, dass zwei Clients mit
 * derselben Ereignismenge auch dieselben Hinweise fuehren.
 */
export type Konflikthinweis =
  /** Der gesehene Vorher-Wert des Gewinners passt nicht zu dem, was der Vorgaenger gesetzt hat (§2.5). */
  | {
      readonly art: "vorherPasstNicht";
      readonly feldpfad: string;
      readonly gewinner: EreignisId;
      readonly verdraengt: EreignisId;
      /**
       * Beide Werte gehoeren in den Hinweis — der Ereigniskatalog verlangt bei
       * `StaerkeGeaendert` ausdruecklich „Konflikthinweis mit beiden Werten"
       * (§4.2). Ohne sie kann die Oberflaeche daraus keinen Satz bauen.
       */
      readonly gesehenerVorher: KanonischerWert;
      readonly verdraengterWert: KanonischerWert;
    }
  /** Eine zweite Anlage derselben Entitaet wurde verworfen (Ereigniskatalog §4.2). */
  | {
      readonly art: "zweiteAnlageVerworfen";
      readonly feldpfad: string;
      readonly verworfen: EreignisId;
      readonly gilt: EreignisId;
    }
  /** Eine Anlage wollte die fuer den Auffang reservierte Id belegen; sie wurde verworfen. */
  | {
      readonly art: "reservierteIdVerworfen";
      readonly feldpfad: string;
      readonly verworfen: EreignisId;
    }
  /** Die Einheit zeigt auf einen Abschnitt, den es (noch) nicht gibt; sie liegt im Auffang (Auflage 10). */
  | {
      readonly art: "abschnittUnbekannt";
      readonly feldpfad: string;
      readonly abschnittId: string;
      readonly gewinner: EreignisId;
    }
  /** Es liegen Feldaenderungen vor, aber die Anlage der Entitaet fehlt noch. */
  | {
      readonly art: "anlageFehlt";
      readonly feldpfad: string;
      readonly ereignisse: readonly EreignisId[];
    };

/** Ein Ereignis, dessen Art dieser Client nicht kennt (§4.1 Regel 4). */
export interface UnbekanntesEreignis {
  readonly id: EreignisId;
  readonly typ: string;
  readonly schemaVersion: number;
  readonly hlc: Hlc;
  readonly akteurBenutzer: string;
  readonly akteurHost: string;
}

/** Das Ergebnis des Folds. */
export interface Zustand {
  readonly foldVersion: number;
  readonly einsatz?: EinsatzZustand;
  readonly abschnitte: { readonly [id: string]: AbschnittZustand };
  readonly einheiten: { readonly [id: string]: EinheitZustand };
  /** Deterministisch geordnet, damit die kanonische Serialisierung stabil ist. */
  readonly hinweise: readonly Konflikthinweis[];
  readonly unbekannt: readonly UnbekanntesEreignis[];
}
