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
import { shareklasse, type Shareklasse } from "./fehler.js";
import type { Identitaetenbuch } from "./identitaeten.js";
import { grenzeUndKette, kettenanker, type Segmentquelle } from "./kettenanker.js";
import { Dateilage } from "./leserlage.js";
import { clientPraefix, segmentText, zerlegeEreignisDateiname, type Einsatzablage } from "./pfade.js";
import { angekuendigterNachfolger } from "./segmentlese.js";
import { neuerFremderOffset, type FremderOffset, type UploadZustand } from "./uploadZustand.js";
import { leseAbschnitt, leseZeilengrenzen, type Defektgrund, type GeleseneZeile } from "./zeile.js";
import { wanduhrText, type Zeitquelle } from "./zeit.js";

export type { Takt } from "./leserlage.js";

/** Warum eine Datei in Quarantäne steht. */
export type Quarantaenegrund = Defektgrund | "fristAbgelaufen";

/** Eine Quarantänestelle mit dem Text, den §8.2 Punkt 3 verlangt. */
export interface Quarantaenemeldung {
  readonly datei: string;
  readonly offset: number;
  readonly grund: Quarantaenegrund;
  /** §8.1: vorläufig heißt, die Datei wird in jedem Takt-B-Durchlauf erneut geprüft. */
  readonly vorlaeufig: boolean;
  /** §8.2 Punkt 6 verlangt für `s1 akte pruefe` Datei, Offset **und** Zeitpunkt. */
  readonly seit: number;
  readonly meldung: string;
}

/**
 * Ein gescheiterter Lesezugriff (§8.3).
 *
 * „Das Lesen fremder Dateien liefert Fehler, die als ‚nicht erreichbar' gezählt
 * werden. Die Statuszeile nennt Dauer und Anzahl der wartenden Einträge."
 * Deshalb wird der Fehler gemeldet und nicht verschluckt: Verschluckt sähe ein
 * Share-Ausfall aus wie Bedingung 2 der Ruhephase (§7.6) — überall 0 Bytes —,
 * und ein Konvergenzlauf hielte Stillstand für Ruhe.
 */
export interface Lesefehler {
  readonly datei: string;
  readonly klasse: Shareklasse;
  readonly code: string;
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
  /** Quarantänestellen, die ohne Zutun weggefallen sind (§8.1). */
  readonly geheilteQuarantaenen: readonly string[];
  /** Gescheiterte Zugriffe (§8.3). Nicht leer heißt: Dies war **keine** Ruhephase. */
  readonly lesefehler: readonly Lesefehler[];
  /** Meldungen der Uhr beim Empfang fremder HLC (§3.2). */
  readonly uhrmeldungen: readonly Uhrmeldung[];
  /** Zahl der neu gelesenen Bytes; 0 in **allen** Dateien ist Bedingung 2 der Ruhephase (§7.6). */
  readonly gelesenBytes: number;
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

/** Sammelt, was ein Durchlauf ergeben hat. */
class Sammler {
  readonly neueZeilen: GeleseneZeile[] = [];
  readonly neueDateien: string[] = [];
  readonly neueQuarantaenen: Quarantaenemeldung[] = [];
  readonly geheilteQuarantaenen: string[] = [];
  readonly lesefehler: Lesefehler[] = [];
  readonly uhrmeldungen: Uhrmeldung[] = [];
  gelesenBytes = 0;

  fertig(): Pollergebnis {
    return {
      neueZeilen: this.neueZeilen,
      neueDateien: this.neueDateien,
      neueQuarantaenen: this.neueQuarantaenen,
      geheilteQuarantaenen: this.geheilteQuarantaenen,
      lesefehler: this.lesefehler,
      uhrmeldungen: this.uhrmeldungen,
      gelesenBytes: this.gelesenBytes,
    };
  }

  uebernimm(anderer: Pollergebnis): void {
    this.neueZeilen.push(...anderer.neueZeilen);
    this.neueDateien.push(...anderer.neueDateien);
    this.neueQuarantaenen.push(...anderer.neueQuarantaenen);
    this.geheilteQuarantaenen.push(...anderer.geheilteQuarantaenen);
    this.lesefehler.push(...anderer.lesefehler);
    this.uhrmeldungen.push(...anderer.uhrmeldungen);
    this.gelesenBytes += anderer.gelesenBytes;
  }
}

export class Leser {
  readonly #optionen: LeserOptionen;
  readonly #lagen = new Map<string, Dateilage>();
  /**
   * §8.4: „**Kein zweiter Versuch, solange der erste unterwegs ist.** Je Datei
   * ist höchstens ein Zugriff offen; die Speicherschicht serialisiert das
   * selbst und überlässt es nicht dem Aufrufer."
   *
   * Takt A (3 s) und Takt B (4 s) laufen nach §6.2 unabhängig, und ein
   * SMB-Zugriff darf bis zu 60 Sekunden hängen (§8.4) — die Überlappung ist der
   * Normalfall, nicht die Ausnahme. Ohne diesen Riegel läsen zwei Durchläufe
   * denselben `leseOffset` und hängten beide dieselben geprüften Bytes an den
   * lokalen Spiegel an. Der Spiegel wäre danach kettenwidrig, und §8.6.1
   * Regel 4 („Der ausgeleitete Spiegel enthält nur geprüfte Zeilen") gälte
   * nicht mehr.
   */
  readonly #inArbeit = new Set<string>();
  #zustand: UploadZustand;

  constructor(optionen: LeserOptionen, zustand: UploadZustand) {
    this.#optionen = optionen;
    this.#zustand = zustand;
    for (const [schluessel, offsets] of Object.entries(zustand.fremd)) {
      const name = `${schluessel}.jsonl`;
      this.#lagen.set(name, new Dateilage(name, offsets, optionen.zeit()));
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
      .map((lage) =>
        this.#meldung(
          lage,
          lage.offsets.quarantaeneAb as number,
          // Der tatsächliche Grund, nicht ein angenommener: §8.2 Punkt 6
          // verlangt eine Auskunft, und eine falsch behauptete Ursache ist
          // schlechter als gar keine.
          (lage.quarantaenegrund ?? "fristAbgelaufen") as Quarantaenegrund,
          lage.offsets.vorlaeufig === true,
        ),
      );
  }

  /** Die Dateien, die gerade im kurzen Takt geführt werden (§6.2). */
  get inTaktA(): readonly string[] {
    return [...this.#lagen.values()].filter((l) => l.inTaktA()).map((l) => l.name);
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
   *
   * **Ohne Kettenprüfung**, und das ist Absicht: Der Spiegel enthält nach §5.5
   * ausschließlich geprüfte Zeilen; gesucht ist hier seine Länge und der
   * Kettenwert an ihr, kein Urteil. Eine Prüfung bräuchte den Anker dieser
   * Datei — bei einem fremden Ersatzsegment ist das eine innere Zeile des
   * ersetzten Segments (§4.6, Schritt 3) —, und mit dem falschen Anker fiele
   * `leseOffset` auf 0 zurück. Genau das erzeugte den doppelten Anhang, den
   * dieser Abgleich verhindern soll.
   */
  async gleicheMitSpiegelAb(): Promise<void> {
    const namen = await this.#optionen.dateisystem.listeVerzeichnis(
      this.#optionen.ablage.lokalEreignisse,
    );
    const jePraefix = new Map<string, { name: string; segment: number }[]>();
    for (const name of namen) {
      const kennung = zerlegeEreignisDateiname(name);
      if (kennung === undefined || this.#istEigen(kennung.praefix)) continue;
      const liste = jePraefix.get(kennung.praefix) ?? [];
      liste.push({ name, segment: kennung.segment });
      jePraefix.set(kennung.praefix, liste);
    }

    for (const liste of jePraefix.values()) {
      for (const { name } of liste.sort((a, b) => a.segment - b.segment)) {
        const bytes = await this.#optionen.dateisystem.liesAb(
          this.#optionen.ablage.lokalDatei(name),
          0,
        );
        const { endeOffset, letzteKette } = grenzeUndKette(bytes);
        const zeilen = leseZeilengrenzen(bytes, 0).zeilen;
        this.#optionen.identitaeten.merkeAlle(zeilen);
        const lage =
          this.#lagen.get(name) ?? new Dateilage(name, neuerFremderOffset(), this.#optionen.zeit());
        lage.offsets = {
          ...lage.offsets,
          leseOffset: endeOffset,
          letzteKette,
          abgeschlossen:
            lage.offsets.abgeschlossen || angekuendigterNachfolger(zeilen) !== undefined,
        };
        lage.ankerBekannt = true;
        lage.gesehenesEnde = endeOffset;
        this.#lagen.set(name, lage);
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
    const namen = betroffen.map((l) => l.name);
    for (const lage of betroffen) lage.quarantaeneAufheben();
    const ergebnis = await this.#lies(betroffen);
    return { ...ergebnis, geheilteQuarantaenen: this.#nochGeheilt(namen, ergebnis) };
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
    return this.#lies([...this.#lagen.values()].filter((l) => l.inTaktA()));
  }

  /**
   * Takt B — neue Dateien entdecken (§6.2).
   *
   * Eine Verzeichnisauflistung von `ereignisse\` findet Dateien neuer Clients
   * und angekündigte Nachfolgesegmente. Zusätzlich werden hier die Dateien
   * gelesen, die aus Takt A herausgefallen sind: verfallene, vorläufig
   * quarantänisierte und angekündigte — genau die drei, die §7.6 Bedingung 3
   * aufzählt.
   *
   * **Die vorläufige Quarantäne wird dabei aufgehoben** (§8.1): „Wird die Zeile
   * später doch vollständig und kettenrichtig, fällt die Quarantäne ohne Zutun
   * weg und die Datei kehrt in Takt A zurück." Bleibt die Zeile unvollständig,
   * setzt die Frist sie im selben Durchlauf wieder.
   */
  async taktB(): Promise<Pollergebnis> {
    const sammler = new Sammler();
    let namen: readonly string[];
    try {
      namen = await this.#optionen.dateisystem.listeVerzeichnis(
        this.#optionen.ablage.shareEreignisse,
      );
    } catch (fehler) {
      sammler.lesefehler.push(this.#lesefehler("ereignisse", fehler));
      return sammler.fertig();
    }

    for (const name of namen) {
      const kennung = zerlegeEreignisDateiname(name);
      if (kennung === undefined || this.#istEigen(kennung.praefix)) continue;
      const bekannt = this.#lagen.get(name);
      if (bekannt === undefined) {
        this.#lagen.set(name, new Dateilage(name, neuerFremderOffset(), this.#optionen.zeit()));
        sammler.neueDateien.push(name);
      } else if (bekannt.angekuendigt) {
        // Das angekündigte Nachfolgesegment ist da (§4.3).
        bekannt.angekuendigt = false;
        bekannt.takt = "A";
      }
    }

    const zuLesen = [...this.#lagen.values()].filter(
      (l) => l.inTaktB() || sammler.neueDateien.includes(l.name),
    );
    const aufgehoben = zuLesen.filter((l) => l.vorlaeufigeQuarantaene()).map((l) => l.name);
    for (const lage of zuLesen) {
      if (lage.vorlaeufigeQuarantaene()) lage.quarantaeneAufheben();
    }
    const gelesen = await this.#lies(zuLesen);
    sammler.uebernimm(gelesen);
    return { ...sammler.fertig(), geheilteQuarantaenen: this.#nochGeheilt(aufgehoben, gelesen) };
  }

  /** Welche der aufgehobenen Quarantänen im selben Durchlauf nicht wieder zuschlugen. */
  #nochGeheilt(aufgehoben: readonly string[], ergebnis: Pollergebnis): readonly string[] {
    const wiederKrank = new Set(ergebnis.neueQuarantaenen.map((q) => q.datei));
    return aufgehoben.filter((name) => !wiederKrank.has(name));
  }

  /** Der Leseweg nach §5.5, angewandt auf eine Auswahl von Dateien. */
  async #lies(lagen: readonly Dateilage[]): Promise<Pollergebnis> {
    const sammler = new Sammler();
    const zurueckgestellt: Dateilage[] = [];

    for (const lage of lagen) {
      // §8.4: kein zweiter Zugriff auf dieselbe Datei, solange der erste läuft.
      if (this.#inArbeit.has(lage.name)) continue;
      this.#inArbeit.add(lage.name);
      try {
        if (await this.#liesEine(lage, sammler)) zurueckgestellt.push(lage);
      } finally {
        this.#inArbeit.delete(lage.name);
      }
    }

    this.#schreibeZustandFort();
    const ergebnis = sammler.fertig();
    if (zurueckgestellt.length === 0 || zurueckgestellt.length === lagen.length) return ergebnis;
    // Ein zweiter Durchgang genügt, wenn im ersten etwas gelesen wurde: Der
    // Vorgänger einer zurückgestellten Datei kann jetzt bekannt sein.
    const gesamt = new Sammler();
    gesamt.uebernimm(ergebnis);
    gesamt.uebernimm(await this.#lies(zurueckgestellt));
    return gesamt.fertig();
  }

  /** @returns `true`, wenn die Datei zurückgestellt wurde (Kettenanker noch unbekannt). */
  async #liesEine(lage: Dateilage, sammler: Sammler): Promise<boolean> {
    let bytes: Uint8Array;
    try {
      bytes = await this.#optionen.dateisystem.liesAb(
        this.#optionen.ablage.shareDatei(lage.name),
        lage.offsets.leseOffset,
      );
    } catch (fehler) {
      if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
        // Ein angekündigtes, noch nicht vorhandenes Nachfolgesegment ist kein
        // Fehler, sondern ein Wartezustand (§4.3) — und es verfällt wie jede
        // andere Datei (§6.2).
        lage.verfallPruefen(this.#optionen.zeit);
        return false;
      }
      // §8, Grundsatz: Ein Fehler an einer Datei hält die anderen nicht auf.
      // §8.3: Er wird trotzdem gezählt und gemeldet.
      sammler.lesefehler.push(this.#lesefehler(lage.name, fehler));
      lage.verfallPruefen(this.#optionen.zeit);
      return false;
    }

    sammler.gelesenBytes += bytes.byteLength;
    lage.merkeBytes(lage.offsets.leseOffset + bytes.byteLength, this.#optionen.zeit());

    if (bytes.byteLength === 0) {
      lage.verfallPruefen(this.#optionen.zeit);
      this.#fristPruefen(lage, sammler);
      return false;
    }

    if (!lage.ankerBekannt) {
      const anker = await this.#anfangsKette(lage, bytes);
      if (anker === undefined) {
        // Der Vorgänger ist noch nicht gelesen. Zurückstellen, nicht als Defekt
        // melden — sonst setzte der Leser eine gesunde Datei allein deshalb in
        // Quarantäne, weil er sie in der falschen Reihenfolge angefasst hat.
        // Der Verfall aus §6.2 gilt trotzdem: Eine dauerhaft unauflösbare Datei
        // darf nicht für den Rest der Lage jeden kurzen Takt kosten.
        lage.verfallPruefen(this.#optionen.zeit);
        return true;
      }
      lage.offsets = { ...lage.offsets, letzteKette: anker };
      lage.ankerBekannt = true;
    }

    await this.#verarbeite(lage, bytes, sammler);
    // §8.1: Die Frist läuft auch dann, wenn bei jedem Durchlauf dieselben
    // unvollständigen Bytes zurückkommen — genau das ist ihr Anwendungsfall.
    lage.verfallPruefen(this.#optionen.zeit);
    this.#fristPruefen(lage, sammler);
    return false;
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
  async #verarbeite(lage: Dateilage, bytes: Uint8Array, sammler: Sammler): Promise<void> {
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
        if (empfang.meldung !== undefined) sammler.uhrmeldungen.push(empfang.meldung);
      }
    }

    const nachfolger = angekuendigterNachfolger(gelesen.zeilen);
    lage.offsets = {
      ...lage.offsets,
      leseOffset: gelesen.endeOffset,
      letzteKette: gelesen.letzteKette,
      abgeschlossen: lage.offsets.abgeschlossen || nachfolger !== undefined,
    };
    if (nachfolger !== undefined) this.#kuendigeNachfolgerAn(lage, nachfolger);

    if (gelesen.abschluss.art === "unvollstaendig") {
      // §8.1: Der Rest wird nicht ausgewertet, der Offset bleibt davor stehen.
      // Keine Meldung, kein Hinweis — dies ist kein Fehler.
      lage.merkeUnvollstaendig(gelesen.endeOffset, this.#optionen.zeit());
    } else {
      lage.merkeVollstaendig();
    }

    if (gelesen.abschluss.art === "defekt") {
      this.#quarantaene(lage, gelesen.abschluss.offset, gelesen.abschluss.grund, false, sammler);
    }

    // Wiederholungen sind dasselbe Ereignis (§8.2) und gehören nicht ein
    // zweites Mal in das Bündel für den Fold.
    sammler.neueZeilen.push(...gelesen.zeilen.filter((zeile) => !zeile.wiederholung));
  }

  /**
   * §8.1, Frist: „Bleibt dieselbe unvollständige Zeile fünf Minuten lang
   * unverändert unvollständig, ist der Normalfall ausgeschlossen — kein
   * Schreibvorgang dauert so lange." Die Datei geht in eine **vorläufige**
   * Quarantäne über.
   *
   * Ohne diese Frist bliebe der Datenstrom eines Arbeitsplatzes für alle
   * anderen dauerhaft stehen, während die Statuszeile weiter erfolgreiche
   * Abfragen meldete — ein stiller Falschzustand in Reinform.
   */
  #fristPruefen(lage: Dateilage, sammler: Sammler): void {
    if (lage.offsets.quarantaeneAb !== null) return;
    if (!lage.fristAbgelaufen(this.#optionen.zeit)) return;
    this.#quarantaene(lage, lage.offsets.leseOffset, "fristAbgelaufen", true, sammler);
  }

  #quarantaene(
    lage: Dateilage,
    offset: number,
    grund: Quarantaenegrund,
    vorlaeufig: boolean,
    sammler: Sammler,
  ): void {
    // §8.2 Punkt 2: Diese Datei wird ab dort nicht weiter ausgewertet und nicht
    // weiter gepollt. Punkt 4: Alle anderen Dateien laufen unverändert weiter.
    lage.quarantaene(offset, grund, vorlaeufig, this.#optionen.zeit());
    sammler.neueQuarantaenen.push(this.#meldung(lage, offset, grund, vorlaeufig));
  }

  /** Der Text aus §8.2 Punkt 3: sichtbar und dauerhaft, kein technischer Text, keine Verharmlosung. */
  #meldung(
    lage: Dateilage,
    offset: number,
    grund: Quarantaenegrund,
    vorlaeufig: boolean,
  ): Quarantaenemeldung {
    const kennung = zerlegeEreignisDateiname(lage.name);
    const arbeitsplatz = kennung?.praefix ?? lage.name;
    const seit = lage.quarantaeneSeit ?? this.#optionen.zeit();
    return {
      datei: lage.name,
      offset,
      grund,
      vorlaeufig,
      seit,
      meldung:
        `Die Einträge von Arbeitsplatz ${arbeitsplatz} ab ${wanduhrText(seit)} ` +
        "sind beschädigt und werden nicht angezeigt. " +
        "Die Einträge aller anderen Arbeitsplätze sind vollständig.",
    };
  }

  #lesefehler(datei: string, fehler: unknown): Lesefehler {
    return {
      datei,
      klasse: shareklasse(fehler),
      code: fehler instanceof DateisystemFehler ? fehler.code : "EUNKNOWN",
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
    const neue = new Dateilage(
      name,
      // Die Kette läuft über den Segmentwechsel hinweg durch (§2.3).
      { ...neuerFremderOffset(), letzteKette: lage.offsets.letzteKette },
      this.#optionen.zeit(),
    );
    neue.angekuendigt = true;
    neue.ankerBekannt = true;
    this.#lagen.set(name, neue);
  }

  /**
   * Der Kettenanker einer neu entdeckten Datei (§2.3, Sonderfälle).
   *
   * Bestimmt wird er aus dem **eigenen Spiegel** dieser Schreiberkennung, nie
   * aus der Share-Datei selbst: Ein aus der zu prüfenden Datei übernommener
   * Anker prüfte nichts.
   */
  async #anfangsKette(lage: Dateilage, bytes: Uint8Array): Promise<string | undefined> {
    const kennung = zerlegeEreignisDateiname(lage.name);
    if (kennung === undefined) return undefined;
    return kettenanker(kennung.segment, bytes, this.#spiegelquelle(kennung.praefix));
  }

  /** Die Segmente einer fremden Kennung aus dem lokalen Spiegel (§5.5). */
  #spiegelquelle(praefix: string): Segmentquelle {
    return async (segment) => {
      const name = `${praefix}.${segmentText(segment)}.jsonl`;
      try {
        return await this.#optionen.dateisystem.liesAb(this.#optionen.ablage.lokalDatei(name), 0);
      } catch {
        return undefined;
      }
    };
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
