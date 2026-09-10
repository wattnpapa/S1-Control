/**
 * Der materialisierte Zustand — Zielmodell nach KONZEPT-EREIGNISSE.md §3.2.
 *
 * Jede Beobachtung traegt die HLC des Ereignisses, das sie gemacht hat
 * (Auflage 4, KONZEPT-SPEICHER.md §7.4). Diese HLC ist ausdruecklich
 * Bestandteil des Zustands und fliesst in die kanonische Serialisierung und
 * damit in den `zustandsHash` ein (§7.6): Zwei Clients mit gleichen Werten,
 * aber verschiedenen Gewinner-HLC sind *nicht* konvergent, weil der naechste
 * Rebase bei ihnen unterschiedlich entschiede.
 *
 * Der Zustand ist bewusst eine reine JSON-Struktur ohne `Map` und ohne
 * Klassen: Nur so laesst er sich unveraendert an die kanonische
 * Serialisierung reichen. **Ein nie gesetztes Feld fehlt** (§3.2); ein
 * erfundener Anfangswert stuende im Hash und machte zwei Umsetzungen bei
 * jedem gesunden Einsatz nicht konvergent.
 *
 * Paragraphenverweise zeigen auf `docs/v2/konzepte/KONZEPT-EREIGNISSE.md`,
 * sofern nichts anderes dabeisteht.
 */

import type { EreignisId } from "./ereignis.js";
import type { Hlc } from "./hlc.js";
import type { KanonischerWert } from "./kanonisch.js";
import type {
  HierarchieEbene,
  Id,
  Kontakt,
  Sofortbedarf,
  Staerke,
  StaerkeRechnerisch,
  Zeitpunkt,
} from "./werte.js";

/**
 * Version der Fold-Implementierung; harte Schranke fuer Schnappschuesse
 * (KONZEPT-SPEICHER.md §7.3, Auflage 4).
 *
 * Jede Aenderung an den Fold-Regeln erhoeht diese Zahl. Ein Schnappschuss mit
 * abweichender Version wird stillschweigend ignoriert und der Zustand aus den
 * Ereignissen gefaltet. **2** seit dem Zielmodell aus M1.3: Der Zustand traegt
 * jetzt die Eingangsdaten der Hinweise mit, die M0.2 nur im Akkumulator
 * hielt (§3.8).
 */
export const FOLD_VERSION = 2;

/**
 * Auffangabschnitt fuer Einheiten, deren Abschnitt (noch) nicht existiert
 * oder aufgeloest ist (Auflage 10, §5.3.2 und §5.3.3).
 *
 * Der Typ ist `EINSATZORT` und damit zaehlend: Die Staerke einer real
 * gemeldeten Einheit darf nicht dadurch aus der Gesamtstaerke verschwinden,
 * dass ein Ereignis noch fehlt. Die Id ist **reserviert**; eine Anlage oder
 * Aenderung darauf wirkt nicht und erzeugt `reservierteIdVerworfen` (§5.3.4).
 */
export const AUFFANG_ABSCHNITT_ID = "AUFFANG";

/** Systemseitiger Archivabschnitt; ebenfalls reservierte Id (§5.3.4). */
export const ARCHIV_ABSCHNITT_ID = "ARCHIV";

// ---------------------------------------------------------------------------
// Beobachtung, Feld, Erstwert (§3.2, §3.3)
// ---------------------------------------------------------------------------

/**
 * Eine einzelne Beobachtung eines Feldes.
 *
 * `wert` darf `null` sein — das ist ein **gesetztes** Nichts (`einsatz.ende`
 * nach einer Wiedereroeffnung) und von „nie gesetzt" zu unterscheiden, das
 * durch Abwesenheit der ganzen Beobachtung ausgedrueckt wird (§3.2).
 */
export interface Beobachtung<T> {
  readonly wert: T | null;
  readonly hlc: Hlc;
  /** Das Ereignis, das diese Beobachtung gemacht hat; fehlt bei den Systemabschnitten (§5.3.4). */
  readonly durch?: EreignisId;
  /**
   * Der gesehene Vorher-Wert (§2.2a, Auflage 6).
   *
   * Ein **Objekt** und kein blosser Wert, weil `undefined` und `null` sich
   * sonst nicht unterscheiden liessen: „kein Vorher-Wert mitgefuehrt" gegen
   * „ausdruecklich als ungesetzt gesehen".
   */
  readonly gesehenerVorher?: { readonly wert: T | null };
  /** ISO-8601 des setzenden Ereignisses; fehlt nur bei den Systemabschnitten (§5.3.4). */
  readonly wanduhr?: string;
  /** Die fachliche Zeit aus §2.5, sofern die Art eine traegt. */
  readonly fachlicheZeit?: string;
  /** Welche Schwelle fuer `meldezeitUnplausibel` gilt (§2.5). */
  readonly zeitklasse?: "IST" | "PLAN";
  /**
   * An jeder Beobachtung, deren Ereignis eines traegt — am Gewinner, am
   * `zweiter`, in `verdraengt` und in `wartend` (§6, U6).
   */
  readonly undoOf?: EreignisId;
}

/**
 * Ein Feld mit gewoehnlicher Auswahl: die groesste HLC gewinnt (§3.3).
 *
 * Der `zweiter` ist kein Zierat: Ohne ihn liesse sich `vorherPasstNicht` nach
 * einem Schnappschuss nicht mehr bilden, und der Akkumulator waere keine
 * Mengenfunktion mehr.
 */
export interface Feld<T> extends Beobachtung<T> {
  readonly zweiter?: Beobachtung<T>;
}

/**
 * Ein Feld, dessen **erste** Beobachtung gilt (§3.3, Sammelform „Erstwert").
 *
 * Die verdraengten stehen daneben, weil ohne sie weder der Hinweis noch die
 * Mengeneigenschaft traegt: Ein Max-2-Akkumulator verloere bei drei Vorgaengen
 * ausgerechnet den Gewinner.
 */
export interface Erstwert<T> extends Beobachtung<T> {
  readonly verdraengt: readonly Beobachtung<T>[];
}

/** Eine verworfene Zweitanlage — Eingangsdatum von `zweiteAnlageVerworfen` (§3.11). */
export interface VerworfeneAnlage {
  readonly durch: EreignisId;
  readonly hlc: Hlc;
  /**
   * Die Ereignisart der verworfenen Anlage.
   *
   * Noetig, weil die Entitaet die Art nur eingrenzt: `EinheitGemeldet` und
   * `EinheitAufgeteilt` legen beide eine Einheit an (§3.6).
   */
  readonly ereignisart: string;
  /** Die reine Nutzlast — ohne Rahmenfelder (§3.6). */
  readonly inhalt: KanonischerWert;
  /** Getrennt gehalten, weil `grund` ein Rahmenfeld ist (§2.4). */
  readonly grund?: string;
}

/**
 * Die Anlagedaten, die jede Entitaet mitfuehrt (§3.2, §3.11).
 *
 * Zusammen mit `verworfeneAnlagen` haelt der Zustand damit **alle** Anlagen
 * einer Entitaet; die Auswahl daraus ist eine reine Funktion und ueberlebt
 * jeden Schnappschuss.
 */
export interface Anlage {
  readonly angelegtDurch: EreignisId;
  readonly angelegtMit: Hlc;
  readonly angelegtMitNutzlast: KanonischerWert;
  readonly angelegtMitGrund?: string;
  readonly angelegtMitArt: string;
}

// ---------------------------------------------------------------------------
// Entitaeten (§3.2)
// ---------------------------------------------------------------------------

export interface EinsatzZustand extends Anlage {
  readonly name: Feld<string>;
  readonly art: Feld<string>;
  readonly fuestName: Feld<string>;
  readonly uebergeordneteFuestName?: Feld<string>;
  readonly ort?: Feld<string>;
  readonly beginn: Feld<Zeitpunkt>;
  readonly schichtmodell: Feld<string>;
  /** `null` = wiedereroeffnet; fehlt = nie beendet (§3.2). */
  readonly ende?: Feld<Zeitpunkt>;
  readonly kosten: {
    readonly psaKostenProSatz?: Feld<number>;
    readonly vdaProTag?: Feld<number>;
    readonly ukVerpflegungProTag?: Feld<number>;
    readonly geplanteEinsatztage?: Feld<number>;
  };
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  // abgeleitet:
  /** §7.1 — das einzige Kennungsfeld ohne Kartenschluessel. */
  readonly id: Id;
  readonly status: "AKTIV" | "BEENDET" | "ARCHIVIERT";
  readonly archiviertDurch?: EreignisId;
  readonly archiviertMit?: Hlc;
}

export interface AbschnittZustand {
  readonly id: Id;
  /** Fehlt bei den Systemabschnitten; sie entstehen ohne Ereignis (§5.3.4). */
  readonly angelegtDurch?: EreignisId;
  readonly angelegtMit: Hlc;
  readonly angelegtMitNutzlast?: KanonischerWert;
  readonly angelegtMitGrund?: string;
  readonly angelegtMitArt?: string;
  readonly name: Feld<string>;
  readonly typ: Feld<string>;
  readonly reihenfolge: Feld<number>;
  readonly parentId?: Feld<Id>;
  readonly bemerkung?: Feld<string>;
  readonly aufgeloest?: Feld<{ readonly zielAbschnittId: Id; readonly aufgeloestAm: Zeitpunkt }>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  /** `true` bei `AUFFANG` und `ARCHIV` (§5.3.4). */
  readonly systemAbschnitt?: true;
  // abgeleitet:
  readonly wirksamerParentId?: Id;
  readonly zaehltInGesamtstaerke: boolean;
}

export interface EinheitZustand extends Anlage {
  readonly id: Id;
  readonly abschnittId: Feld<Id>;
  readonly reihenfolge: Feld<number>;
  readonly bezeichnung: Feld<string>;
  readonly organisation: Feld<string>;
  readonly organisationName?: Feld<string>;
  readonly hierarchie?: Feld<readonly HierarchieEbene[]>;
  readonly standortRef?: Feld<number>;
  readonly fuestKennung?: Feld<string>;
  readonly ebene: Feld<string>;
  readonly teilEtikett?: Feld<string>;
  readonly vorlageId?: Feld<Id>;
  readonly meldungId?: Feld<Id>;
  readonly einheitSchluessel?: Feld<string>;
  readonly istFuehrungDesAbschnitts?: Feld<boolean>;
  readonly bemerkung?: Feld<string>;
  readonly fuehrungskraft?: Feld<{ readonly name: string; readonly kontakte: readonly Kontakt[] }>;
  readonly erreichbarkeitOverride?: Feld<string>;
  readonly taktischesZeichen?: Feld<KanonischerWert>;
  /** Absolut, nie relativ (§5.4.2). */
  readonly staerke: Feld<Staerke>;
  readonly personalErfassung: Feld<string>;
  readonly status: Feld<string>;
  readonly schicht?: Feld<string>;
  readonly eingetroffenAm?: Feld<Zeitpunkt>;
  readonly verfuegbarBis?: Feld<Zeitpunkt>;
  readonly einsatzendeAm?: Feld<Zeitpunkt>;
  readonly rueckfuehrungAm?: Feld<Zeitpunkt>;
  /** Override je Feld (§5.4). */
  readonly logistik: { readonly [feld: string]: Feld<number> };
  readonly sofortbedarf?: Feld<Sofortbedarf>;
  readonly psaSaetzeProTag?: Feld<number>;
  readonly abgeteiltVon?: Erstwert<{
    readonly quellEinheitId: Id;
    readonly abgeteilteStaerke: Staerke;
    readonly gesehen: Staerke;
  }>;
  readonly aufgegangenIn?: Erstwert<{ readonly zielEinheitId: Id; readonly gesehen: Staerke }>;
  /** Fehlt = nie entfernt (§3.2). */
  readonly entfernt?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  // abgeleitet:
  readonly wirksamerAbschnittId: Id;
  /** Ungeklemmt, kann negativ sein — die Bilanzgroesse fuer P4 (§5.4.2). */
  readonly wirksameStaerkeRechnerisch: StaerkeRechnerisch;
  /** Je Rolle bei 0 geklemmt (§5.4.2). */
  readonly wirksameStaerke: Staerke;
  readonly wirksamAufgegangen: boolean;
  readonly zaehlt: boolean;
}

export interface FahrzeugZustand extends Anlage {
  readonly id: Id;
  readonly typ: Feld<string>;
  readonly bezeichnung: Feld<string>;
  readonly kennzeichen?: Feld<string>;
  readonly funkrufname?: Feld<string>;
  readonly stanKonform?: Feld<boolean>;
  readonly aenderungen?: Feld<string>;
  readonly nutzlastText?: Feld<string>;
  readonly status?: Feld<string>;
  readonly taktischesZeichen?: Feld<KanonischerWert>;
  readonly abschnittId?: Feld<Id>;
  readonly einheitId?: Feld<Id>;
  readonly entfernt?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  // abgeleitet:
  /**
   * **Abwesend**, wenn der gemeldete Abschnitt unmittelbar unbekannt ist
   * (§5.3.3): Das Fahrzeug haengt dann an seiner Einheit. Den Auffang bekommt
   * es nie — der ist eine Zusicherung ueber Staerkezahlen, und ein Fahrzeug
   * traegt keine.
   */
  readonly wirksamerAbschnittId?: Id;
}

export interface PersonZustand extends Anlage {
  readonly id: Id;
  readonly nachname: Feld<string>;
  readonly vorname: Feld<string>;
  readonly rolle?: Feld<string>;
  readonly funktionen?: Feld<readonly string[]>;
  readonly fahrerlaubnisse?: Feld<readonly string[]>;
  readonly geschlecht?: Feld<string>;
  readonly ernaehrung?: Feld<string>;
  readonly kontakte?: Feld<readonly Kontakt[]>;
  readonly zusatzqualifikationen?: Feld<readonly string[]>;
  readonly bemerkung?: Feld<string>;
  readonly einheitId?: Feld<Id>;
  readonly entfernt?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
}

export interface AuftragZustand extends Anlage {
  readonly id: Id;
  readonly einheitId?: Feld<Id>;
  readonly von?: Feld<Zeitpunkt>;
  readonly bis?: Feld<Zeitpunkt>;
  readonly abschnittId?: Feld<Id>;
  readonly text: Feld<string>;
  readonly quelle?: Feld<string>;
  readonly zurueckgenommen?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
}

export interface AnforderungZustand extends Anlage {
  readonly id: Id;
  readonly kennung: Feld<string>;
  readonly abzuloesendeEinheitId?: Feld<Id>;
  readonly vorgeseheneEinheitText?: Feld<string>;
  readonly vorgesehenerAuftrag?: Feld<string>;
  readonly angefordertAm?: Feld<Zeitpunkt>;
  readonly bemerkung?: Feld<string>;
  readonly zusage?: Feld<{ readonly einheitText: string; readonly zugesagtAm: Zeitpunkt }>;
  readonly erledigung?: Feld<{ readonly erledigtAm: Zeitpunkt }>;
  readonly storno?: Feld<{ readonly storniertAm: Zeitpunkt }>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
  // abgeleitet (§5.6.2):
  readonly zustand: "OFFEN" | "ZUGESAGT" | "EINGETROFFEN" | "STORNIERT";
}

export interface DienstpostenZustand extends Anlage {
  readonly id: Id;
  readonly teileinheit: Feld<string>;
  readonly funktion: Feld<string>;
  readonly schicht?: Feld<string>;
  readonly reihenfolge: Feld<number>;
  readonly besetzung?: Feld<string>;
  readonly entfernt?: Feld<boolean>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
}

export interface MeldungZustand extends Anlage {
  readonly id: Id;
  readonly einheitSchluessel?: Feld<string>;
  readonly meldeStatus?: Feld<string>;
  /** `null` = Uebernahme zurueckgenommen; fehlt = nie uebernommen (§5.8.1). */
  readonly uebernahme?: Feld<{
    readonly einheitId: Id;
    readonly uebernommeneFelder: readonly string[];
  }>;
  readonly abgelehnt?: Feld<boolean>;
  // unveraenderliche Anlagewerte, trotzdem `Feld<T>` (§3.2):
  readonly stand: Feld<Zeitpunkt>;
  readonly empfangenAm: Feld<Zeitpunkt>;
  readonly quelle?: Feld<string>;
  readonly signatur?: Feld<string>;
  readonly rohPayload?: Feld<string>;
  readonly bogen?: Feld<KanonischerWert>;
  // abgeleitet (§5.8.1):
  readonly uebernahmeZustand: "NEU" | "UEBERNOMMEN" | "GEAENDERT" | "ABGELEHNT";
}

export interface AnhangZustand extends Anlage {
  readonly id: Id;
  readonly einheitId?: Feld<Id>;
  readonly dateiname: Feld<string>;
  readonly mimeTyp?: Feld<string>;
  readonly groesse?: Feld<number>;
  readonly hinzugefuegtAm?: Feld<Zeitpunkt>;
  readonly entfernt?: Feld<boolean>;
}

export interface EtbEintragZustand extends Anlage {
  readonly id: Id;
  readonly zeitpunkt: Feld<Zeitpunkt>;
  readonly text: Feld<string>;
  readonly bezug?: Feld<string>;
  /** Nur bei der Berichtigung (§5.9.2). */
  readonly berichtigtEintragId?: Feld<Id>;
  readonly verworfeneAnlagen: readonly VerworfeneAnlage[];
}

/**
 * Eine Archivierung — an der Wurzel und nicht unter `einsatz` (§7.2).
 *
 * Ein Grabstein kann vor `EinsatzAngelegt` eintreffen, und `wartend` kann ihn
 * nicht halten: Er hat keine HLC und gehoert in keine der beiden
 * Akkumulatorklassen.
 */
export interface ArchivierungZustand {
  readonly gilt: boolean;
  /** Fehlen beim reinen Grabstein (§7.2). */
  readonly hlc?: Hlc;
  readonly wanduhr?: string;
  readonly zeitpunkt?: Zeitpunkt;
  readonly snapshotHash?: string;
  /** Nach `ereignisId` sortiert (§7.2). */
  readonly zurueckgenommenDurch: readonly {
    readonly ereignisId: EreignisId;
    /** Textform der erwarteten Archivierungs-HLC (§7.2). */
    readonly erwarteteHlc: string;
    /** Die eigene HLC der Ruecknahme (§7.3). */
    readonly hlc: Hlc;
  }[];
}

// ---------------------------------------------------------------------------
// Hinweise (§3.8, §3.8a)
// ---------------------------------------------------------------------------

/** Die sechs Stellen aus §3.12 — geschlossene Liste. */
export const WIRKUNGSLOSGRUENDE = [
  "STORNO_NACH_EINGETROFFEN",
  "ZUSAGE_NACH_ERLEDIGUNG",
  "ZWEITE_ARCHIVIERUNG",
  "QUELLE_BEREITS_AUFGEGANGEN",
  "ZWEITE_AUFTEILUNG",
  "RUECKNAHME_OHNE_PASSENDE_ARCHIVIERUNG",
] as const;
export type Wirkungslosgrund = (typeof WIRKUNGSLOSGRUENDE)[number];

/**
 * Ein Konflikthinweis ist Teil des Zustands, nicht der Oberflaeche (§3.8).
 *
 * Auflage 6 und §2.2a: Last-Writer-Wins ohne diesen Hinweis waere stilles
 * Verwerfen. P3 verlangt, dass zwei Clients mit derselben Ereignismenge auch
 * dieselben Hinweise fuehren. **Kein Hinweis traegt eine Wanduhr, einen
 * Akteur oder einen Text** (§3.8a): Ein Freitext waere in zwei
 * Sprachfassungen zwei Hashes.
 */
export type Konflikthinweis =
  | {
      readonly art: "vorherPasstNicht";
      readonly feldpfad: string;
      readonly gewinner: EreignisId;
      readonly verdraengt: EreignisId;
      readonly gesehen: KanonischerWert;
      readonly verdraengterWert: KanonischerWert;
    }
  | {
      readonly art: "ohneVorherWertVerdraengt";
      readonly feldpfad: string;
      readonly gewinner: EreignisId;
      readonly verdraengt: EreignisId;
      readonly verdraengterWert: KanonischerWert;
    }
  | {
      readonly art: "zweiteAnlageVerworfen";
      readonly feldpfad: string;
      readonly verworfen: EreignisId;
      readonly gilt: EreignisId;
      readonly ereignisart: string;
      readonly inhalt: KanonischerWert;
      readonly grund?: string;
    }
  | {
      readonly art: "reservierteIdVerworfen";
      readonly feldpfad: string;
      readonly verworfen: EreignisId;
      readonly id: Id;
    }
  | {
      readonly art: "inhaltsschluesselWidersprochen";
      readonly feldpfad: string;
      readonly verworfen: EreignisId;
      readonly gilt: EreignisId;
      readonly schluessel: string;
    }
  | {
      readonly art: "anlageFehlt";
      readonly feldpfad: string;
      /** Aufsteigend, und nur die, die `wartend` haelt (§3.10). */
      readonly wartende: readonly EreignisId[];
    }
  | {
      readonly art: "fremdreferenzUnbekannt";
      readonly feldpfad: string;
      /** Am Ende einer Aufloesungskette das unbekannte **Ende** (§3.10). */
      readonly verweistAuf: Id;
    }
  | {
      readonly art: "abschnittUnbekannt";
      readonly feldpfad: string;
      readonly gemeldeterAbschnittId: Id;
    }
  | {
      readonly art: "abschnittAufgeloest";
      readonly feldpfad: string;
      /** Beides vom **ersten** Kettenglied (§5.3.2). */
      readonly aufgeloesterAbschnittId: Id;
      readonly zielAbschnittId: Id;
    }
  | {
      readonly art: "zyklusAufgeloest";
      readonly feldpfad: string;
      readonly ereignis: EreignisId;
      readonly gewuenschterParentId: Id;
    }
  | {
      readonly art: "staerkeGeklemmt";
      readonly feldpfad: string;
      readonly rechnerisch: StaerkeRechnerisch;
    }
  | {
      readonly art: "aufteilungKreis";
      readonly feldpfad: string;
      readonly kanten: readonly EreignisId[];
      readonly unwirksam: EreignisId;
    }
  | {
      readonly art: "zusammenfuehrungKreis";
      readonly feldpfad: string;
      readonly kanten: readonly EreignisId[];
      readonly unwirksam: EreignisId;
    }
  | {
      readonly art: "entfernungNimmtZugewachsenes";
      readonly feldpfad: string;
      readonly entfernt: EreignisId;
      /** Nach `einheitId` sortiert; `staerke` ist das `gesehen` der Kante (§3.8a). */
      readonly betroffene: readonly {
        readonly einheitId: Id;
        readonly richtung: "QUELLE" | "ZIEL";
        readonly staerke: Staerke;
      }[];
    }
  | {
      readonly art: "vorgangSummeWeichtAb";
      readonly feldpfad: string;
      readonly vorgangsart: "AUFTEILUNG" | "ZUSAMMENFUEHRUNG";
      readonly vorgang: EreignisId;
      readonly gesehen: Staerke;
      readonly berechnet: StaerkeRechnerisch;
    }
  | {
      readonly art: "moeglicheDublette";
      readonly feldpfad: string;
      readonly schluessel: string;
      readonly ids: readonly Id[];
    }
  | {
      readonly art: "meldezeitUnplausibel";
      readonly feldpfad: string;
      readonly ereignis: EreignisId;
      readonly fachlicheZeit: string;
      readonly wanduhr: string;
      readonly zeitklasse: "IST" | "PLAN";
    }
  | {
      readonly art: "unbekannterWert";
      readonly feldpfad: string;
      readonly wert: string;
    }
  | {
      readonly art: "wirkungslosGegenTerminalzustand";
      readonly feldpfad: string;
      readonly ereignis: EreignisId;
      readonly grund: Wirkungslosgrund;
    }
  | {
      readonly art: "nachArchivierungEingegangen";
      readonly feldpfad: string;
      readonly archivierung: EreignisId;
      readonly betroffeneFelder: readonly string[];
    }
  | {
      readonly art: "undoTrifftFremdenStand";
      readonly feldpfad: string;
      /** Die Kompensation. */
      readonly undo: EreignisId;
      /** Das Ereignis, das sie zuruecknimmt, aus `undoOf`. */
      readonly original: EreignisId;
      readonly verdraengt: EreignisId;
      readonly verdraengterWert: KanonischerWert;
    };

/** Die 21 Hinweisarten aus §3.8 — geschlossene Liste. */
export type Hinweisart = Konflikthinweis["art"];

// ---------------------------------------------------------------------------
// Zustandsteile ohne Entitaet (§3.2)
// ---------------------------------------------------------------------------

/** Ein Ereignis, das dieser Client nicht deuten kann (§3.7). */
export interface UnbekanntesEreignis {
  readonly id: EreignisId;
  readonly typ: string;
  readonly schemaVersion: number;
  readonly hlc: Hlc;
  readonly akteurBenutzer: string;
  readonly akteurHost: string;
  readonly grund: "ART" | "VERSION" | "SCHEMA";
}

/** Eine Beobachtung, deren Entitaet noch nicht angelegt ist (§3.10). */
export interface WartendeBeobachtung {
  readonly feld: string;
  readonly beobachtung: Beobachtung<unknown>;
}

/** Ein verworfener fachlicher Schluessel (§3.6). */
export interface VerworfenerSchluessel {
  readonly art: "INHALTSSCHLUESSEL" | "RESERVIERTE_ID";
  readonly schluessel: string;
  readonly verworfen: EreignisId;
  readonly hlc: Hlc;
  readonly ereignisart: string;
  /** Stets die reine Nutzlast (§3.6). */
  readonly inhalt: KanonischerWert;
  readonly neu?: KanonischerWert;
  readonly vorher?: KanonischerWert;
  readonly grund?: string;
}

/**
 * Obergrenze fuer die beiden kappbaren Zustandsteile (Startwert S12, §3.2).
 *
 * Gilt **global** fuer `unbekannt` und fuer die Eintraege in
 * `verworfeneSchluessel` mit `art: "RESERVIERTE_ID"`. `wartend` und
 * `archivierungen` werden ausdruecklich **nicht** gekappt: `wartend`
 * schrumpft, und ueber einer schrumpfenden Menge ist die Minimumsauswahl
 * nicht rebase-fest (§3.2, Schranke 4).
 */
export const KAPPUNG_MAX = 50;

/** Das Ergebnis des Folds (§3.2). */
export interface Zustand {
  readonly foldVersion: number;
  readonly einsatz?: EinsatzZustand;
  readonly abschnitte: { readonly [id: string]: AbschnittZustand };
  readonly einheiten: { readonly [id: string]: EinheitZustand };
  readonly fahrzeuge: { readonly [id: string]: FahrzeugZustand };
  readonly personen: { readonly [id: string]: PersonZustand };
  readonly auftraege: { readonly [id: string]: AuftragZustand };
  readonly anforderungen: { readonly [id: string]: AnforderungZustand };
  readonly dienstposten: { readonly [id: string]: DienstpostenZustand };
  readonly schichtplan: {
    readonly [dienstpostenId: string]: { readonly [datum: string]: Feld<string> };
  };
  readonly meldungen: { readonly [meldungId: string]: MeldungZustand };
  readonly anhaenge: { readonly [anhangId: string]: AnhangZustand };
  readonly etbEintraege: { readonly [etbId: string]: EtbEintragZustand };
  readonly archivierungen: { readonly [ereignisId: string]: ArchivierungZustand };
  /** Deterministisch geordnet, und eine **Menge**: bytegleiche Eintraege fallen zusammen (§3.8). */
  readonly hinweise: readonly Konflikthinweis[];
  /** Nach `id` geordnet (§3.7). */
  readonly unbekannt: readonly UnbekanntesEreignis[];
  readonly wartend: { readonly [entitaetspfad: string]: readonly WartendeBeobachtung[] };
  readonly verworfeneSchluessel: readonly VerworfenerSchluessel[];
}
