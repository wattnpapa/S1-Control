/**
 * Der Tail-Leser — KONZEPT-SPEICHER.md §5.5 (Leseweg), §6.1 und §6.2 (Poll in
 * zwei Takten), §8.1 (unvollständige Zeile) und §8.2 (Quarantäne ab Offset,
 * Auflage 7).
 *
 * Grundsatz von §8: **Kein Fehlerbild führt zum Stillstand des Lesers.** Ein
 * Defekt in einer Datei darf immer nur diese eine Datei ab der Fehlerstelle
 * betreffen; alle anderen Schreiber werden weiter ausgewertet.
 *
 * Gepollt wird, nicht beobachtet (§6.1): `fs.watch` ist über NFS und SMB nicht
 * verlässlich (`nas-speicher-recherche.md` §1.5). Und gepollt wird **am
 * bekannten Offset**, nie über `stat` oder `mtime` (§6.2) — ein
 * Datenlesezugriff geht ohne gültige Lease zum Server durch, während die
 * Attribut-Caches bis zu 10 Sekunden alte Werte liefern.
 */

import type { HlcUhr, Uhrmeldung } from "@s1/domaene";

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import type { Identitaetenbuch } from "./identitaeten.js";
import { clientPraefix, zerlegeEreignisDateiname, segmentText, type Einsatzablage } from "./pfade.js";
import { KETTE_ANFANG, kettenPruefsumme } from "./pruefsummen.js";
import { angekuendigterNachfolger } from "./segmentlese.js";
import { TYP_SEGMENT_ERSETZT, ersatzAus } from "./verwaltungsereignisse.js";
import { UNVOLLSTAENDIG_FRIST_MS, VERFALL_MS } from "./startwerte.js";
import {
  neuerFremderOffset,
  type FremderOffset,
  type UploadZustand,
} from "./uploadZustand.js";
import {
  leseAbschnitt,
  leseZeilengrenzen,
  type Defektgrund,
  type GeleseneZeile,
} from "./zeile.js";
import { wanduhrText, type Zeitquelle } from "./zeit.js";

/** In welchem Takt eine Datei geführt wird (§6.2). */
export type Takt = "A" | "B";

/** Eine Quarantänestelle mit dem Text, den §8.2 Punkt 3 verlangt. */
export interface Quarantaenemeldung {
  readonly datei: string;
  readonly offset: number;
  readonly grund: Defektgrund | "fristAbgelaufen";
  /** §8.1: vorläufig heißt, die Datei wird in jedem Takt-B-Durchlauf erneut geprüft. */
  readonly vorlaeufig: boolean;
  readonly meldung: string;
}

/** Das Ergebnis eines Takt-Durchlaufs. */
export interface Pollergebnis {
  /**
   * Die neu gelesenen Zeilen **als Bündel** über alle Dateien.
   *
   * Bewusst gesammelt und nicht je Zeile herausgegeben: `falteHinzu` in
   * `@s1/domaene` kopiert die Faltung je Aufruf. Für ein Bündel ist das
   * unbedenklich, für einen Aufruf je Einzelereignis wäre es quadratisch — bei
   * 50.000 Ereignissen je Einsatz (§2.6) relevant.
   */
  readonly neueZeilen: readonly GeleseneZeile[];
  /** Dateien, die dieser Durchlauf zum ersten Mal gesehen hat (§6.2, Takt B). */
  readonly neueDateien: readonly string[];
  /** Neu entstandene Quarantänestellen (§8.1, §8.2). */
  readonly neueQuarantaenen: readonly Quarantaenemeldung[];
  /** Meldungen der Uhr beim Empfang fremder HLC (§3.2). */
  readonly uhrmeldungen: readonly Uhrmeldung[];
  /** Zahl der neu gelesenen Bytes; 0 in **allen** Dateien ist Bedingung 2 der Ruhephase (§7.6). */
  readonly gelesenBytes: number;
}

/** Laufzeitzustand einer beobachteten fremden Datei. */
interface Dateilage {
  readonly name: string;
  offsets: FremderOffset;
  takt: Takt;
  /** Wann zuletzt **neue** Bytes kamen — Grundlage des Verfalls aus §6.2. */
  letzteBytes: number;
  /**
   * Das weiteste bisher gesehene Dateiende (`leseOffset` plus gelesene Bytes).
   *
   * Nötig, um „neue Bytes" von „dieselben Bytes noch einmal" zu unterscheiden:
   * Eine unvollständige Zeile wird bei jedem Durchlauf erneut mitgelesen, ohne
   * dass die Datei gewachsen wäre. Ohne diese Unterscheidung setzte sie den
   * Verfall aus §6.2 endlos zurück, und die Datei bliebe für den Rest der Lage
   * im kurzen Takt.
   */
  gesehenesEnde: number;
  /** Seit wann dieselbe unvollständige Zeile unverändert unvollständig ist (§8.1). */
  unvollstaendigSeit: number | undefined;
  /** Byte-Offset, an dem die unvollständige Zeile beginnt — zur Prüfung „unverändert". */
  unvollstaendigAb: number | undefined;
  /** §4.3: durch eine Abschlusszeile angekündigt, aber noch nicht vorhanden. */
  angekuendigt: boolean;
  /**
   * Ob der Kettenanker dieser Datei feststeht (§2.3, Sonderfälle).
   *
   * Für Segment `0000` sind es 32 Nullen; für ein Folgesegment die
   * Kettenprüfsumme der letzten Zeile des Vorgängers; für ein Ersatzsegment die
   * der letzten unbeschädigten Zeile des ersetzten Segments (§4.6, Schritt 3).
   * Solange er nicht feststeht, wird die Datei **nicht** ausgewertet — sonst
   * bräche die Kettenprüfung an einer Stelle, an der gar nichts kaputt ist.
   */
  ankerBekannt: boolean;
}

export interface LeserOptionen {
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  /** Die eigene Kennung; nur ihre Dateien sind eigene. */
  readonly clientId: string;
  /** Die gesehenen Identitäten (§5.3) — gemeinsam mit dem Schreiber geführt. */
  readonly identitaeten: Identitaetenbuch;
  /** Optional: Die eigene HLC wird beim Lesen fremder Ereignisse fortgeschrieben (§3.2). */
  readonly uhr?: HlcUhr;
}

export class Leser {
  readonly #optionen: LeserOptionen;
  readonly #lagen = new Map<string, Dateilage>();
  #zustand: UploadZustand;

  constructor(optionen: LeserOptionen, zustand: UploadZustand) {
    this.#optionen = optionen;
    this.#zustand = zustand;
    for (const [schluessel, offsets] of Object.entries(zustand.fremd)) {
      const name = `${schluessel}.jsonl`;
      this.#lagen.set(name, this.#neueLage(name, offsets));
    }
  }

  /** Der fortgeschriebene Uploadzustand (§5.3); der Aufrufer schreibt ihn weg. */
  get zustand(): UploadZustand {
    return this.#zustand;
  }

  /** Alle bestehenden Quarantänestellen — Grundlage von `s1 akte pruefe` (§8.2 Punkt 6). */
  get quarantaenen(): readonly Quarantaenemeldung[] {
    return [...this.#lagen.values()]
      .filter((lage) => lage.offsets.quarantaeneAb !== null)
      .map((lage) => this.#meldung(lage, lage.offsets.quarantaeneAb as number, "kette", lage.offsets.vorlaeufig === true));
  }

  /** Die Dateien, die gerade im kurzen Takt geführt werden (§6.2). */
  get inTaktA(): readonly string[] {
    return [...this.#lagen.values()].filter((l) => this.#gehoertZuTaktA(l)).map((l) => l.name);
  }

  /**
   * Gleicht `leseOffset` gegen den lokalen Spiegel ab — beim Öffnen, vor allem
   * anderen.
   *
   * §5.5 sagt zu, dass der Spiegel einer fremden Datei „ihr geprüftes Präfix"
   * ist; daraus folgt, dass seine Länge genau `leseOffset` ist. Der Abgleich
   * macht `upload-state.json` damit zu dem, was §4.4 auch über `schreiber.json`
   * sagt: einem Beschleuniger, keinem Wahrheitsträger. Er ist nicht bloß
   * Vorsicht, sondern nötig — nach einem Kennungswechsel (§4.5, Schritt 6) ist
   * die eigene alte Datei plötzlich eine fremde, deren Spiegel bereits
   * vollständig dasteht. Ohne Abgleich läse der Leser sie ab Byte 0 erneut und
   * hängte ihren gesamten Inhalt ein zweites Mal an den eigenen Spiegel an.
   *
   * Zugleich baut er die Menge der gesehenen Identitäten auf, die §5.3 „beim
   * Öffnen aus dem lokalen Spiegel" verlangt.
   */
  async gleicheMitSpiegelAb(): Promise<void> {
    const namen = await this.#optionen.dateisystem.listeVerzeichnis(this.#optionen.ablage.lokalEreignisse);
    const jePraefix = new Map<string, { name: string; segment: number }[]>();
    for (const name of namen) {
      const kennung = zerlegeEreignisDateiname(name);
      if (kennung === undefined || this.#istEigen(kennung.praefix)) continue;
      const liste = jePraefix.get(kennung.praefix) ?? [];
      liste.push({ name, segment: kennung.segment });
      jePraefix.set(kennung.praefix, liste);
    }

    for (const liste of jePraefix.values()) {
      // Die Kette läuft über den Segmentwechsel hinweg durch (§2.3); deshalb
      // aufsteigend und mit durchgereichter Kette.
      let kette = KETTE_ANFANG;
      for (const { name } of liste.sort((a, b) => a.segment - b.segment)) {
        const bytes = await this.#optionen.dateisystem.liesAb(this.#optionen.ablage.lokalDatei(name), 0);
        const gelesen = leseAbschnitt(bytes, 0, kette, this.#optionen.identitaeten);
        this.#optionen.identitaeten.merkeAlle(gelesen.zeilen);
        const lage = this.#lagen.get(name) ?? this.#neueLage(name, neuerFremderOffset());
        lage.offsets = {
          ...lage.offsets,
          leseOffset: gelesen.endeOffset,
          letzteKette: gelesen.letzteKette,
          abgeschlossen:
            lage.offsets.abgeschlossen || angekuendigterNachfolger(gelesen.zeilen) !== undefined,
        };
        this.#lagen.set(name, lage);
        kette = gelesen.letzteKette;
      }
    }
    this.#schreibeZustandFort();
  }

  /**
   * §8.2 Punkt 5: „Bei jedem Programmstart wird die Quarantänestelle **einmal**
   * erneut geprüft. Ein Defekt, der aus einem Lesefehler des Netzes stammte,
   * verschwindet damit; ein echter Defekt bleibt."
   */
  async pruefeQuarantaenenErneut(): Promise<Pollergebnis> {
    const betroffen = [...this.#lagen.values()].filter((l) => l.offsets.quarantaeneAb !== null);
    for (const lage of betroffen) {
      lage.offsets = { ...lage.offsets, quarantaeneAb: null };
      lage.takt = "A";
    }
    return this.#lies(betroffen);
  }

  /**
   * Takt A — bekannte, noch wachsende Dateien (§6.2).
   *
   * Für jede fremde Datei, die weder abgeschlossen noch in Quarantäne ist, wird
   * **direkt am bekannten `leseOffset`** gelesen. Kein `stat`, kein
   * `mtime`-Vergleich. Kommen 0 Bytes zurück, ist nichts Neues da.
   *
   * Entscheidend für die Kosten: Nur das jeweils letzte Segment eines
   * Schreibers kann wachsen; abgeschlossene Segmente sind durch ihre
   * Abschlusszeile endgültig erkennbar.
   */
  async taktA(): Promise<Pollergebnis> {
    return this.#lies([...this.#lagen.values()].filter((l) => this.#gehoertZuTaktA(l)));
  }

  /**
   * Takt B — neue Dateien entdecken (§6.2).
   *
   * Eine Verzeichnisauflistung von `ereignisse\` findet Dateien neuer Clients
   * und angekündigte Nachfolgesegmente. Zusätzlich werden hier die Dateien
   * gelesen, die aus Takt A herausgefallen sind: verfallene, vorläufig
   * quarantänisierte und angekündigte. Ohne diesen Zusatz wäre Bedingung 3 der
   * Ruhephase (§7.6) für genau diese Dateien unbestimmt.
   */
  async taktB(): Promise<Pollergebnis> {
    const neueDateien: string[] = [];
    for (const name of await this.#optionen.dateisystem.listeVerzeichnis(this.#optionen.ablage.shareEreignisse)) {
      const kennung = zerlegeEreignisDateiname(name);
      if (kennung === undefined || this.#istEigen(kennung.praefix)) continue;
      const bekannt = this.#lagen.get(name);
      if (bekannt === undefined) {
        this.#lagen.set(name, this.#neueLage(name, neuerFremderOffset()));
        neueDateien.push(name);
      } else if (bekannt.angekuendigt) {
        // Das angekündigte Nachfolgesegment ist da (§4.3).
        bekannt.angekuendigt = false;
        bekannt.takt = "A";
      }
    }
    const zuLesen = [...this.#lagen.values()].filter(
      (l) => !l.offsets.abgeschlossen && (!this.#gehoertZuTaktA(l) || neueDateien.includes(l.name)),
    );
    const ergebnis = await this.#lies(zuLesen);
    return { ...ergebnis, neueDateien: [...neueDateien, ...ergebnis.neueDateien] };
  }

  /** Der Leseweg nach §5.5, angewandt auf eine Auswahl von Dateien. */
  async #lies(lagen: readonly Dateilage[]): Promise<Pollergebnis> {
    const neueZeilen: GeleseneZeile[] = [];
    const neueQuarantaenen: Quarantaenemeldung[] = [];
    const uhrmeldungen: Uhrmeldung[] = [];
    const neueDateien: string[] = [];
    let gelesenBytes = 0;
    const zurueckgestellt: Dateilage[] = [];

    for (const lage of lagen) {
      let bytes: Uint8Array;
      try {
        bytes = await this.#optionen.dateisystem.liesAb(
          this.#optionen.ablage.shareDatei(lage.name),
          lage.offsets.leseOffset,
        );
      } catch (fehler) {
        if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
          // Ein angekündigtes, noch nicht vorhandenes Nachfolgesegment ist kein
          // Fehler, sondern ein Wartezustand (§4.3).
          this.#verfallPruefen(lage);
          continue;
        }
        // §8: Ein Fehler an einer Datei hält die anderen nicht auf.
        continue;
      }
      gelesenBytes += bytes.byteLength;
      const gesehenesEnde = lage.offsets.leseOffset + bytes.byteLength;
      if (gesehenesEnde > lage.gesehenesEnde) {
        lage.gesehenesEnde = gesehenesEnde;
        lage.letzteBytes = this.#optionen.zeit();
        lage.takt = "A";
      }
      if (bytes.byteLength === 0) {
        this.#verfallPruefen(lage);
        this.#fristPruefen(lage, neueQuarantaenen);
        continue;
      }
      if (!lage.ankerBekannt) {
        const anker = await this.#anfangsKette(lage, bytes);
        if (anker === undefined) {
          // Der Vorgänger ist noch nicht gelesen. Zurückstellen, nicht als
          // Defekt melden — sonst setzte der Leser eine gesunde Datei allein
          // deshalb in Quarantäne, weil er sie in der falschen Reihenfolge
          // angefasst hat.
          zurueckgestellt.push(lage);
          continue;
        }
        lage.offsets = { ...lage.offsets, letzteKette: anker };
        lage.ankerBekannt = true;
      }
      const geprueft = await this.#verarbeite(lage, bytes, neueQuarantaenen, uhrmeldungen);
      neueZeilen.push(...geprueft);
      // §8.1: Die Frist läuft auch dann, wenn bei jedem Durchlauf dieselben
      // unvollständigen Bytes zurückkommen — genau das ist ihr Anwendungsfall.
      this.#verfallPruefen(lage);
      this.#fristPruefen(lage, neueQuarantaenen);
    }

    this.#schreibeZustandFort();
    const ergebnis = { neueZeilen, neueDateien, neueQuarantaenen, uhrmeldungen, gelesenBytes };
    if (zurueckgestellt.length === 0 || zurueckgestellt.length === lagen.length) return ergebnis;
    // Ein zweiter Durchgang genügt, wenn im ersten etwas gelesen wurde: Der
    // Vorgänger einer zurückgestellten Datei kann jetzt bekannt sein.
    const nachzuegler = await this.#lies(zurueckgestellt);
    return {
      neueZeilen: [...neueZeilen, ...nachzuegler.neueZeilen],
      neueDateien: [...neueDateien, ...nachzuegler.neueDateien],
      neueQuarantaenen: [...neueQuarantaenen, ...nachzuegler.neueQuarantaenen],
      uhrmeldungen: [...uhrmeldungen, ...nachzuegler.uhrmeldungen],
      gelesenBytes: gelesenBytes + nachzuegler.gelesenBytes,
    };
  }

  /**
   * Der Kettenanker einer neu entdeckten Datei (§2.3, Sonderfälle).
   *
   * - Erste Zeile des **ersten** Segments eines Clients: 32 Nullen.
   * - Erste Zeile eines **Folgesegments**: Kettenprüfsumme der letzten Zeile
   *   des Vorgängersegments — die Kette läuft über den Segmentwechsel hinweg
   *   durch (§4.3).
   * - Erste Zeile eines **Ersatzsegments** (§4.6, Schritt 3): Kettenprüfsumme
   *   der letzten **unbeschädigten** Zeile des ersetzten Segments, also der
   *   Zeile, die genau am genannten Offset endet. Bewusst nicht dessen letzte
   *   Zeile — die Kette schließt an der Stelle an, ab der repariert wird.
   *
   * Der Wert wird aus dem eigenen Spiegel **berechnet**, nie aus der Zeile
   * übernommen: Ein aus der Datei übernommener Anker prüfte nichts.
   */
  async #anfangsKette(lage: Dateilage, bytes: Uint8Array): Promise<string | undefined> {
    const kennung = zerlegeEreignisDateiname(lage.name);
    if (kennung === undefined) return undefined;
    if (kennung.segment === 0) return KETTE_ANFANG;

    const erste = leseZeilengrenzen(bytes, 0).zeilen[0];
    if (erste === undefined) return undefined;

    if (erste.rahmen.typ === TYP_SEGMENT_ERSETZT) {
      const ersatz = ersatzAus(erste.rahmen["nutzlast"]);
      if (ersatz === undefined) return undefined;
      return this.#ketteAnStelle(kennung.praefix, ersatz.ersetztesSegment, ersatz.abOffset);
    }
    return this.#ketteAmEndeVon(kennung.praefix, kennung.segment - 1);
  }

  /** Die Kettenprüfsumme der Zeile, die im eigenen Spiegel genau bei `offset` endet. */
  async #ketteAnStelle(praefix: string, segment: number, offset: number): Promise<string | undefined> {
    if (offset === 0) {
      return segment === 0 ? KETTE_ANFANG : this.#ketteAmEndeVon(praefix, segment - 1);
    }
    const name = `${praefix}.${segmentText(segment)}.jsonl`;
    let bytes: Uint8Array;
    try {
      bytes = await this.#optionen.dateisystem.liesAb(this.#optionen.ablage.lokalDatei(name), 0);
    } catch {
      return undefined;
    }
    const zeile = leseZeilengrenzen(bytes, 0).zeilen.find((z) => z.offset + z.laenge === offset);
    return zeile === undefined ? undefined : kettenPruefsumme(zeile.bytes);
  }

  /** Die Kettenprüfsumme am Ende eines vollständig gelesenen Vorgängersegments. */
  #ketteAmEndeVon(praefix: string, segment: number): string | undefined {
    const vorgaenger = this.#lagen.get(`${praefix}.${segmentText(segment)}.jsonl`);
    if (vorgaenger === undefined || !vorgaenger.offsets.abgeschlossen) return undefined;
    return vorgaenger.offsets.letzteKette;
  }

  /**
   * §5.5: „Der Leser holt für jede fremde Datei die Bytes ab `leseOffset` **in
   * einen Puffer**, prüft die Zeilen dort, hängt **nur die geprüften,
   * vollständigen Zeilen** an die lokale Spiegelkopie an und schreibt danach
   * `leseOffset` fort. Die Reihenfolge ist verbindlich: geprüft wird **vor**
   * dem Anhängen, nie danach."
   *
   * Die gewollte Folge: Ab einer Quarantänestelle ist der lokale Spiegel einer
   * fremden Datei **nicht** byteweise identisch mit der Share-Datei — er ist
   * ihr geprüftes Präfix.
   */
  async #verarbeite(
    lage: Dateilage,
    bytes: Uint8Array,
    neueQuarantaenen: Quarantaenemeldung[],
    uhrmeldungen: Uhrmeldung[],
  ): Promise<readonly GeleseneZeile[]> {
    const gelesen = leseAbschnitt(
      bytes,
      lage.offsets.leseOffset,
      lage.offsets.letzteKette,
      this.#optionen.identitaeten,
    );

    const gepruefteBytes = gelesen.endeOffset - lage.offsets.leseOffset;
    if (gepruefteBytes > 0) {
      await this.#optionen.dateisystem.legeVerzeichnisAn(this.#optionen.ablage.lokalEreignisse);
      await this.#optionen.dateisystem.haengeAnUndSynchronisiere(
        this.#optionen.ablage.lokalDatei(lage.name),
        bytes.subarray(0, gepruefteBytes),
      );
    }

    this.#optionen.identitaeten.merkeAlle(gelesen.zeilen);
    for (const zeile of gelesen.zeilen) {
      const hlc = zeile.rahmen["hlc"];
      if (this.#optionen.uhr !== undefined && istHlc(hlc)) {
        const empfang = this.#optionen.uhr.empfangen(hlc);
        if (empfang.meldung !== undefined) uhrmeldungen.push(empfang.meldung);
      }
    }

    const abgeschlossen = angekuendigterNachfolger(gelesen.zeilen);
    lage.offsets = {
      ...lage.offsets,
      leseOffset: gelesen.endeOffset,
      letzteKette: gelesen.letzteKette,
      abgeschlossen: lage.offsets.abgeschlossen || abgeschlossen !== undefined,
    };
    if (abgeschlossen !== undefined) this.#kuendigeNachfolgerAn(lage, abgeschlossen);

    if (gelesen.abschluss.art === "unvollstaendig") {
      // §8.1: Der Rest wird nicht ausgewertet, der Offset bleibt davor stehen.
      // Keine Meldung, kein Hinweis — dies ist kein Fehler. Die Frist beginnt
      // erst dann neu, wenn die Zeile an einer anderen Stelle beginnt.
      if (lage.unvollstaendigAb !== gelesen.endeOffset) {
        lage.unvollstaendigAb = gelesen.endeOffset;
        lage.unvollstaendigSeit = this.#optionen.zeit();
      }
    } else {
      lage.unvollstaendigAb = undefined;
      lage.unvollstaendigSeit = undefined;
    }

    if (gelesen.abschluss.art === "defekt") {
      this.#quarantaene(lage, gelesen.abschluss.offset, gelesen.abschluss.grund, false, neueQuarantaenen);
    }

    // Wiederholungen sind dasselbe Ereignis (§8.2) und gehören nicht ein
    // zweites Mal in das Bündel für den Fold.
    return gelesen.zeilen.filter((zeile) => !zeile.wiederholung);
  }

  /**
   * §6.2, Verfallsregel: „Liefert eine Datei in Takt A über fünf Minuten hinweg
   * keine neuen Bytes, fällt sie in Takt B zurück." Sie gilt damit nicht als
   * verloren — liefert sie in Takt B wieder Bytes, kehrt sie unmittelbar nach
   * Takt A zurück. Die Regel ist rein zeitgesteuert und hängt an keiner
   * anderen Datei; insbesondere nicht an der Präsenzdatei, die nach §6.4
   * ausfallen **darf**.
   */
  #verfallPruefen(lage: Dateilage): void {
    if (this.#optionen.zeit() - lage.letzteBytes > VERFALL_MS) lage.takt = "B";
  }

  /**
   * §8.1, Frist: „Bleibt dieselbe unvollständige Zeile fünf Minuten lang
   * unverändert unvollständig, ist der Normalfall ausgeschlossen — kein
   * Schreibvorgang dauert so lange." Die Datei geht in eine **vorläufige**
   * Quarantäne über; wird die Zeile später doch vollständig und kettenrichtig,
   * fällt sie ohne Zutun weg.
   *
   * Ohne diese Frist bliebe der Datenstrom eines Arbeitsplatzes für alle
   * anderen dauerhaft stehen, während die Statuszeile weiter erfolgreiche
   * Abfragen meldete — ein stiller Falschzustand in Reinform.
   */
  #fristPruefen(lage: Dateilage, neueQuarantaenen: Quarantaenemeldung[]): void {
    if (lage.unvollstaendigSeit === undefined || lage.offsets.quarantaeneAb !== null) return;
    if (this.#optionen.zeit() - lage.unvollstaendigSeit <= UNVOLLSTAENDIG_FRIST_MS) return;
    this.#quarantaene(lage, lage.offsets.leseOffset, "fristAbgelaufen", true, neueQuarantaenen);
  }

  #quarantaene(
    lage: Dateilage,
    offset: number,
    grund: Defektgrund | "fristAbgelaufen",
    vorlaeufig: boolean,
    gesammelt: Quarantaenemeldung[],
  ): void {
    lage.offsets = vorlaeufig
      ? { ...lage.offsets, quarantaeneAb: offset, vorlaeufig: true }
      : { ...lage.offsets, quarantaeneAb: offset, vorlaeufig: false };
    // §8.2 Punkt 2: Diese Datei wird ab dort nicht weiter ausgewertet und nicht
    // weiter gepollt. Punkt 4: Alle anderen Dateien laufen unverändert weiter.
    lage.takt = "B";
    gesammelt.push(this.#meldung(lage, offset, grund, vorlaeufig));
  }

  /** Der Text aus §8.2 Punkt 3: sichtbar und dauerhaft, kein technischer Text, keine Verharmlosung. */
  #meldung(
    lage: Dateilage,
    offset: number,
    grund: Defektgrund | "fristAbgelaufen",
    vorlaeufig: boolean,
  ): Quarantaenemeldung {
    const kennung = zerlegeEreignisDateiname(lage.name);
    const arbeitsplatz = kennung?.praefix ?? lage.name;
    return {
      datei: lage.name,
      offset,
      grund,
      vorlaeufig,
      meldung:
        `Die Einträge von Arbeitsplatz ${arbeitsplatz} ab ${wanduhrText(this.#optionen.zeit())} ` +
        "sind beschädigt und werden nicht angezeigt. " +
        "Die Einträge aller anderen Arbeitsplätze sind vollständig.",
    };
  }

  /**
   * §4.3: Ein durch eine Abschlusszeile angekündigtes Nachfolgesegment wird
   * abweichend von Takt B **bereits in Takt A gepollt**, damit ein
   * Segmentwechsel keine Lücke von einem Takt-B-Abstand erzeugt.
   */
  #kuendigeNachfolgerAn(lage: Dateilage, nachfolger: number): void {
    const kennung = zerlegeEreignisDateiname(lage.name);
    if (kennung === undefined) return;
    const name = `${kennung.praefix}.${segmentText(nachfolger)}.jsonl`;
    if (this.#lagen.has(name)) return;
    const neue = this.#neueLage(name, {
      ...neuerFremderOffset(),
      // Die Kette läuft über den Segmentwechsel hinweg durch (§2.3).
      letzteKette: lage.offsets.letzteKette,
    });
    neue.angekuendigt = true;
    // Der Anker steht fest: Die Kette läuft über den Segmentwechsel hinweg
    // durch (§2.3), also ist es die Kettenprüfsumme der Abschlusszeile.
    neue.ankerBekannt = true;
    this.#lagen.set(name, neue);
  }

  #gehoertZuTaktA(lage: Dateilage): boolean {
    if (lage.offsets.abgeschlossen) return false;
    if (lage.offsets.quarantaeneAb !== null) return false;
    return lage.takt === "A" || lage.angekuendigt;
  }

  /**
   * Eigen ist allein die **aktuelle** Kennung.
   *
   * §4.5 Schritt 6: „Der lokale Spiegel der alten eigenen Datei wird **nicht**
   * verworfen. Er ist ab jetzt der Spiegel einer fremden Datei — nämlich der
   * des Klons." Aufgegebene Kennungen sind deshalb ausdrücklich nicht eigen und
   * werden normal weitergelesen.
   */
  #istEigen(praefix: string): boolean {
    return praefix === clientPraefix(this.#optionen.clientId);
  }

  #neueLage(name: string, offsets: FremderOffset): Dateilage {
    return {
      name,
      offsets,
      takt: offsets.quarantaeneAb === null ? "A" : "B",
      letzteBytes: this.#optionen.zeit(),
      gesehenesEnde: offsets.leseOffset,
      unvollstaendigSeit: undefined,
      unvollstaendigAb: undefined,
      angekuendigt: false,
      ankerBekannt: offsets.leseOffset > 0 || zerlegeEreignisDateiname(name)?.segment === 0,
    };
  }

  /**
   * Der Schlüssel in `upload-state.json` ist der Dateiname **ohne** Endung, wie
   * §5.3 ihn zeigt: `"9f3c1a20.0000"`.
   */
  #schreibeZustandFort(): void {
    const fremd: Record<string, FremderOffset> = {};
    for (const [name, lage] of this.#lagen) fremd[schluesselVon(name)] = lage.offsets;
    this.#zustand = { ...this.#zustand, fremd };
  }
}

function istHlc(wert: unknown): wert is { millisekunden: number; zaehler: number; clientId: string } {
  if (typeof wert !== "object" || wert === null) return false;
  const objekt = wert as Record<string, unknown>;
  return (
    typeof objekt["millisekunden"] === "number" &&
    typeof objekt["zaehler"] === "number" &&
    typeof objekt["clientId"] === "string"
  );
}

/** Dateiname ohne Endung — der Schlüssel in `upload-state.json` (§5.3). */
function schluesselVon(name: string): string {
  return name.endsWith(".jsonl") ? name.slice(0, -".jsonl".length) : name;
}
