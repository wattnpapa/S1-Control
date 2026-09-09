/**
 * Ein simulierter Arbeitsplatz — eine geöffnete Einsatzakte mit eigenem
 * lokalem Spiegel (§5.1), eigener Uhr (§3.2) und eigener feindlicher
 * Dateisystem-Schicht.
 *
 * Die Schicht ist bewusst **je Client** eine eigene Instanz: Der
 * Verzeichnis-Cache, der `FileNotFound`-Cache und die verzögerte Sichtbarkeit
 * aus §6.6 sind Caches des jeweiligen SMB-Clients, nicht des Servers. Eine
 * gemeinsame Instanz zeigte allen Clients dieselbe verspätete Sicht und
 * verschwiege damit genau den Fall, um den es geht: dass zwei Arbeitsplätze zur
 * selben Zeit verschieden weit sind.
 *
 * Der Client hält zwei Sichten auf seinen Zustand, und die Trennung ist
 * beabsichtigt:
 *
 *  * eine **fortgeschriebene Faltung** aus dem, was er selbst geschrieben und
 *    gelesen hat. Sie liefert die Vorher-Werte für den nächsten Bedienschritt
 *    (§2.5, Auflage 6) — ein Client kennt nur, was er gesehen hat.
 *  * den **Stand von der Platte** (`konvergenz.ts`), der für den Vergleich nach
 *    §7.6 aus dem lokalen Spiegel neu gefaltet wird. Er ist der Messwert; die
 *    fortgeschriebene Faltung ist Teil des Messgegenstands und taugt nicht als
 *    Maßstab für sich selbst.
 */

import {
  HlcUhr,
  falteHinzu,
  leereFaltung,
  materialisiere,
  type EingehendesEreignis,
  type Faltung,
  type Zustand,
} from "@s1/domaene";
import {
  Akte,
  clientPraefix,
  ersetzteSegmente,
  leseZeilengrenzen,
  oeffneAkte,
  segmentText,
  zerlegeEreignisDateiname,
  istVerwaltungsereignis,
  type Dateisystem,
  type Einsatzablage,
  type Oeffnungsergebnis,
  type Pollergebnis,
  type Quarantaenemeldung,
  type Reaktion,
  type Schreibergebnis,
  type Spiegelergebnis,
} from "@s1/speicher";

import { FeindlichesDateisystem } from "./feindlichesDateisystem.js";
import { naechsterSchritt } from "./kommandos.js";
import { Clientuhr, Simulationsuhr } from "./uhr.js";
import type { Plan } from "./plan.js";
import { Zufall } from "./zufall.js";

/**
 * Trennt die Quarantänestellen nach ihrer **Herkunft**.
 *
 * §8.1 und §8.2 erzeugen beide eine Quarantäne, meinen aber Verschiedenes.
 * §8.1 ist die unvollständige letzte Zeile — dort ausdrücklich „kein
 * Fehler": Die Datei wird in jedem Takt-B-Durchlauf erneut geprüft, und die
 * Stelle verschwindet, sobald der Schreiber die Zeile vervollständigt. §8.2
 * ist die verfälschte Zeile; sie bleibt, und §8.6.1 Regel 3 nimmt ihren
 * Leser aus dem Vergleich.
 *
 * Bis zum 2026-09-09 zählte die Simulation beide gleich. Damit wurden Phasen
 * aus einem Zustand heraus unbewertbar, den das Konzept als Nicht-Zustand
 * führt. Befund 7.6 des Messprotokolls, beobachtet.
 */
export function teileQuarantaenen(meldungen: readonly Quarantaenemeldung[]): {
  readonly endgueltig: readonly string[];
  readonly vorlaeufig: readonly string[];
} {
  const text = (q: Quarantaenemeldung): string =>
    `${q.datei}@${q.offset} (${q.grund}${q.vorlaeufig ? ", vorläufig nach §8.1" : ", endgültig nach §8.2"})`;
  return {
    endgueltig: meldungen.filter((q) => !q.vorlaeufig).map(text),
    vorlaeufig: meldungen.filter((q) => q.vorlaeufig).map(text),
  };
}

/** Was ein Durchlauf ergeben hat — für Bericht und Ruhephase. */
export interface Klientmeldung {
  readonly art: string;
  readonly text: string;
}

export interface KlientOptionen {
  readonly nummer: number;
  readonly clientId: string;
  readonly ablage: Einsatzablage;
  /** Das ungestörte Dateisystem, über das die feindliche Schicht liegt. */
  readonly echt: Dateisystem;
  readonly plan: Plan;
  readonly zufall: Zufall;
  readonly uhr: Simulationsuhr;
}

/** Die vier beobachtbaren Größen der Ruhephase (§7.6); Bedingung 4 kommt aus dem Plan. */
export interface Ruhemerkmale {
  /** Bedingung 1: keine unübertragenen eigenen Bytes. */
  readonly bedingung1: boolean;
  /** Bedingung 2: der letzte Takt-A-Durchlauf lieferte 0 Bytes und keinen Lesefehler. */
  readonly bedingung2: boolean;
  /** Bedingung 3: der letzte Takt-B-Durchlauf fand nichts Neues und lieferte 0 Bytes. */
  readonly bedingung3: boolean;
  /** Wie viele Takt-A-Durchläufe in Folge Bedingung 2 erfüllt haben (§7.6: zwei sind nötig). */
  readonly aInFolge: number;
  readonly bInFolge: number;
  /** Zahl der eigenen Bytes, die noch nicht auf dem Share liegen — für den Bericht. */
  readonly unuebertragen: number;
}

export class Klient {
  readonly nummer: number;
  readonly ablage: Einsatzablage;
  readonly dateisystem: FeindlichesDateisystem;
  readonly uhr: Clientuhr;
  readonly meldungen: Klientmeldung[] = [];

  readonly #o: KlientOptionen;
  #clientId: string;
  #akte: Akte | undefined;
  #hlcUhr: HlcUhr;
  #faltung: Faltung = leereFaltung();
  #zustand: Zustand = materialisiere(leereFaltung());
  #laufendeNummer = 0;

  #letzterTaktA = -Infinity;
  #letzterTaktB = -Infinity;
  #letzteSpiegelung = -Infinity;
  #aInFolge = 0;
  #bInFolge = 0;

  /** Zählt die geschriebenen Ereignisse und ihre Bytes — Grundlage der Prüfung von A2 (§2.6). */
  geschrieben = 0;
  geschriebeneBytes = 0;
  /**
   * Die Identität **jedes** Ereignisses, dessen Schreibvorgang mit
   * `geschrieben` beantwortet wurde.
   *
   * Das ist die Sollmenge der Vollständigkeitsprüfung. Bis zum 2026-09-09
   * merkte sich der Klient nur den Zähler, und `pruefeVollstaendigkeit`
   * baute das Soll aus den überlebenden lokalen Dateien — eine lokal
   * **gelöschte** Zeile fehlte damit auf beiden Seiten und fiel nicht auf,
   * also gerade der Schaden, den die Prüfung fangen soll. Befund 7.6 des
   * dritten Gutachterdurchgangs.
   *
   * §1.3 Satz 2 macht den lokalen Anhang zur Wahrheit; ein Bedienschritt,
   * den der Schreiber mit „geschrieben" quittiert hat, gehört von da an
   * dazu, unabhängig davon, ob die Datei später noch existiert.
   */
  readonly geschriebeneIdentitaeten = new Set<string>();
  /** Kleinste und größte geschriebene Zeile — A2 ist eine Spanne, kein Mittelwert (§2.6, §10). */
  kleinsteZeile = Number.POSITIVE_INFINITY;
  groessteZeile = 0;
  /** Wie oft der Öffnungsweg gelaufen ist — Grundlage der Abschätzung zu A7 und A10 (§10). */
  oeffnungen = 0;
  oeffnungsdauerMs = 0;
  /** Wie oft das Öffnen an einem lokalen Dateisystemfehler gescheitert ist (§8.8 Punkt 5). */
  oeffnenGescheitert = 0;
  /** Zusätzliche Öffnungen, weil eine Reparatur nach §4.6 noch nicht fertig war. */
  reparaturrunden = 0;
  /** Wie oft eine Reparatur auch nach mehreren Öffnungen nicht abgeschlossen war. */
  reparaturNichtAbgeschlossen = 0;

  constructor(optionen: KlientOptionen) {
    this.#o = optionen;
    this.nummer = optionen.nummer;
    this.ablage = optionen.ablage;
    this.#clientId = optionen.clientId;
    this.uhr = new Clientuhr(optionen.uhr);
    this.dateisystem = new FeindlichesDateisystem({
      echt: optionen.echt,
      profil: optionen.plan.profil,
      zufall: optionen.zufall.abzweig(`fs-${optionen.clientId}`),
      jetzt: () => optionen.uhr.jetzt(),
      vorstellen: (ms) => optionen.uhr.weiter(ms),
      istShare: (pfad) => pfad.startsWith(optionen.ablage.share),
      // §6.6, „Wann die Lease-Annahme kippt": Für die eigenen Segmente öffnet
      // der Schreiber neu und liest zum Server durch. Eine verzögerte Sicht
      // auf die eigene Datei wäre ein Angriff auf Annahme A5 (§10), die in
      // M0.5 am echten Gerät gemessen wird — nicht hier.
      istEigen: (pfad) => pfad.includes(`${clientPraefix(this.#clientId)}.`),
    });
    this.#hlcUhr = new HlcUhr({ clientId: optionen.clientId, wanduhr: this.uhr.lies });
  }

  get clientId(): string {
    return this.#clientId;
  }

  get akte(): Akte {
    if (this.#akte === undefined) throw new Error(`Klient ${this.nummer}: Akte ist nicht geöffnet`);
    return this.#akte;
  }

  get zustand(): Zustand {
    return this.#zustand;
  }

  /**
   * Die **endgültigen** Quarantänestellen nach §8.2 — Eingang in §8.6.1 Regel 3.
   *
   * Bis zum 2026-09-09 stand hier jede Quarantäne, auch die vorläufige aus
   * §8.1. Das war zu streng: §8.1 führt die unvollständige letzte Zeile
   * ausdrücklich als „kein Fehler" — sie wird in jedem Takt-B-Durchlauf
   * erneut geprüft und verschwindet, sobald der Schreiber sie
   * vervollständigt. §8.6.1 Regel 3 meint die Quarantäne aus §8.2, die
   * bleibt. Ein Client mit bloß vorläufiger Quarantäne aus dem Vergleich zu
   * nehmen, machte Phasen unbewertbar aus einem Zustand heraus, der keiner
   * ist. Befund 7.6 des dritten Gutachterdurchgangs, beobachtet.
   */
  get quarantaenen(): readonly string[] {
    return teileQuarantaenen(this.#akte === undefined ? [] : this.akte.leser.quarantaenen)
      .endgueltig;
  }

  /**
   * Die **vorläufigen** Quarantänestellen nach §8.1.
   *
   * Sie werden berichtet, aber nicht bewertet: §8.1 nennt sie „kein Fehler",
   * und §7.6 misst den Fortschritt am gesehenen Dateiende, nicht an ihnen.
   */
  get vorlaeufigeQuarantaenen(): readonly string[] {
    return teileQuarantaenen(this.#akte === undefined ? [] : this.akte.leser.quarantaenen)
      .vorlaeufig;
  }

  /**
   * Öffnet so oft, bis die Vollprüfung nichts mehr zu reparieren findet.
   *
   * §4.6.1 Auslöser 1 hängt am **Programmstart**: „Beim Öffnen eines Einsatzes
   * liest der Schreiber seine eigenen Share-Segmente vollständig." Bricht das
   * Wiederholen der Ereignisse dabei an einer lokalen Schreibstörung ab (§8.8),
   * bleibt der Rest bis zum **nächsten** Öffnen liegen — das ist nach §4.6
   * richtig so, heißt aber, dass ein einzelner Programmstart nicht genügt, um
   * den Endzustand zu erreichen. Ein Bediener startet in einer solchen Lage
   * erneut; die Simulation tut dasselbe, sonst misst sie einen Zwischenstand
   * und nennt ihn Verlust.
   *
   * Bleibt nach `runden` Öffnungen noch etwas zu reparieren, wird abgebrochen
   * und gemeldet: Dann ist es kein Zwischenstand mehr, sondern ein Zustand, aus
   * dem das Verfahren nicht mehr herausfindet.
   */
  async oeffneBisNichtsMehrZuTun(runden = 5): Promise<Oeffnungsergebnis> {
    let ergebnis = await this.oeffneMitWiederholung();
    for (let runde = 1; runde < runden && ergebnis.befund.art === "beschaedigt"; runde += 1) {
      this.reparaturrunden += 1;
      ergebnis = await this.oeffneMitWiederholung();
    }
    if (ergebnis.befund.art === "beschaedigt") {
      this.meldungen.push({
        art: "reparaturNichtAbgeschlossen",
        text: `Client ${this.nummer}: nach ${runden} Öffnungen ist Segment ${ergebnis.befund.segment} weiterhin beschädigt`,
      });
      this.reparaturNichtAbgeschlossen += 1;
    }
    return ergebnis;
  }

  /**
   * Öffnet erneut und wiederholt, wenn der **lokale** Weg dabei scheitert.
   *
   * Das ist eine Zutat der Simulation, keine der Speicherschicht, und deshalb
   * hier und nicht dort: `oeffneAkte` wirft heute, wenn die Kürzung nach §8.1
   * oder ein anderer lokaler Schreibvorgang beim Öffnen mit `EIO`/`ENOSPC`
   * scheitert. §8.8 Punkt 5 verlangt an dieser Stelle einen Nur-Lesen-Platz —
   * „nicht zum toten Fenster" —, und für einen solchen Zustand gibt das Konzept
   * keine Regel her. Ihn hier zu erfinden wäre falsch; die Entscheidung gehört
   * Johannes. Bis dahin verhält sich die Simulation wie ein Bediener, der es
   * noch einmal versucht, und **zählt** die Fehlschläge, damit der Befund im
   * Bericht steht statt zu verschwinden.
   */
  async oeffneMitWiederholung(versuche = 8): Promise<Oeffnungsergebnis> {
    let letzter: unknown;
    for (let versuch = 0; versuch < versuche; versuch += 1) {
      try {
        return await this.oeffne();
      } catch (fehler) {
        letzter = fehler;
        this.oeffnenGescheitert += 1;
        // Der Dateibestand gehört in die Meldung: Ohne ihn ist ein
        // Kettenbruch beim Start (§8.1, §2.3) hinterher nicht mehr zu
        // untersuchen — der Lauf ist dann vorbei und die Lage verändert.
        const bestand = await this.#o.echt
          .listeVerzeichnis(this.ablage.lokalEreignisse)
          .catch(() => [] as readonly string[]);
        this.meldungen.push({
          art: "oeffnenGescheitert",
          text:
            `Client ${this.nummer} (${this.#clientId}): ${(fehler as Error).name} — ` +
            `${(fehler as Error).message} | lokal: ${bestand.join(", ")}`,
        });
      }
    }
    throw letzter;
  }

  /** Öffnet oder öffnet erneut — der Neustart nach einem Kill (§8.1, §4.6.1 Auslöser 1). */
  async oeffne(): Promise<Oeffnungsergebnis> {
    const vorher = this.#o.uhr.jetzt();
    const { akte, ergebnis } = await oeffneAkte({
      dateisystem: this.dateisystem,
      zeit: this.uhr.lies,
      ablage: this.ablage,
      clientId: this.#clientId,
      einsatzId: this.#o.plan.einsatzId,
      akteur: {
        benutzer: `Bediener ${this.nummer}`,
        host: `arbeitsplatz-${this.nummer}`,
        clientId: this.#clientId,
      },
      uhr: this.#hlcUhr,
      neueKennung: () => this.#neueKennung(),
      segmentgroesse: this.#o.plan.segmentgroesse,
    });
    this.#akte = akte;
    this.oeffnungen += 1;
    this.oeffnungsdauerMs += this.#o.uhr.jetzt() - vorher;
    // §4.5: Wechselt die Akte die Kennung, wechselt auch die HLC-Uhr — die
    // clientId ist Bestandteil jeder HLC (§3.2) und damit des Tiebreaks.
    if (akte.schreiber.clientId !== this.#clientId) {
      this.#clientId = akte.schreiber.clientId;
      this.#hlcUhr = new HlcUhr({ clientId: this.#clientId, wanduhr: this.uhr.lies });
    }
    if (ergebnis.befund.art !== "inOrdnung") {
      // §4.5 Fall 2 und §4.6 werden beim Öffnen ausgelöst (§4.6.1 Auslöser 1).
      // Welcher Befund es war, gehört in den Bericht: Ein zu Unrecht
      // ausgelöster Ausgang C trifft eine Aussage über den Rechner des
      // Bedieners und muss auffindbar sein (§5.4.3).
      this.meldungen.push({ art: `oeffnungsbefund:${ergebnis.befund.art}`, text: JSON.stringify(ergebnis.befund).slice(0, 240) });
    }
    this.#merke(ergebnis.reaktion);
    // §4.6.1 Auslöser 1 spricht im Plural: Beim Öffnen kann **mehr als eine**
    // Beschädigung repariert werden. Ohne diese Zeile zeigte der Bericht nur
    // die erste Reaktion, und ob die zweite und dritte Reparatur gelungen
    // sind, stand nirgends. Befund aus der Simulation M0.4.
    for (const weitere of ergebnis.weitereReaktionen ?? []) this.#merke(weitere);
    this.#nimmAuf(ergebnis.quarantaeneNachlauf.neueZeilen);
    // Ein Neustart macht die Taktzähler ungültig: Was vor dem Neustart leer
    // war, sagt über den neuen Leser nichts (§7.6, „zwei aufeinanderfolgende").
    this.#aInFolge = 0;
    this.#bInFolge = 0;
    return ergebnis;
  }

  /** Ein fachlicher Bedienschritt (§5.2). `false` heißt: Es gab nichts zu tun. */
  async bediene(): Promise<boolean> {
    this.#laufendeNummer += 1;
    const schritt = naechsterSchritt(
      this.#o.zufall,
      this.#zustand,
      this.#clientId,
      this.#o.plan.einsatzId,
      this.#laufendeNummer,
    );
    if (schritt === undefined) return false;
    const ergebnis: Schreibergebnis = await this.akte.schreibe(schritt);
    if (ergebnis.art === "geschrieben") {
      this.geschrieben += 1;
      this.geschriebeneBytes += ergebnis.zeile.bytes.byteLength;
      this.geschriebeneIdentitaeten.add(ergebnis.zeile.rahmen.id);
      this.kleinsteZeile = Math.min(this.kleinsteZeile, ergebnis.zeile.bytes.byteLength);
      this.groessteZeile = Math.max(this.groessteZeile, ergebnis.zeile.bytes.byteLength);
      this.#nimmAuf([{ rahmen: ergebnis.zeile.rahmen }]);
      return true;
    }
    // §8.8 Punkt 1: Der Bedienschritt wird sichtbar abgewiesen und **nicht**
    // in den Zustand übernommen. Er zählt deshalb auch hier nicht als
    // ausgeführtes Kommando.
    this.meldungen.push({ art: ergebnis.art, text: JSON.stringify(ergebnis).slice(0, 200) });
    return false;
  }

  /** Spiegelungslauf, wenn der Takt es zulässt (§5.4). */
  async spiegleWennFaellig(): Promise<Spiegelergebnis | undefined> {
    const jetzt = this.#o.uhr.jetzt();
    if (jetzt - this.#letzteSpiegelung < this.#o.plan.taktAMs) return undefined;
    this.#letzteSpiegelung = jetzt;
    return this.spiegle();
  }

  async spiegle(): Promise<Spiegelergebnis> {
    const { ergebnis, reaktion } = await this.akte.spiegle();
    if (ergebnis.art === "fremdeSchreibspur") {
      // §5.4.3 Ausgang C zieht einen Kennungswechsel und eine Aussage über den
      // Rechner des Bedieners nach sich. Welche Zeile den Ausschlag gab, gehört
      // deshalb in den Bericht — ein falsch ausgelöster Ausgang C wäre ein
      // schwerer Fehler und muss auffindbar sein.
      this.meldungen.push({
        art: "ausgangC",
        text: `Segment ${ergebnis.segment} ab Offset ${ergebnis.abOffset}, ausschlaggebend ${ergebnis.id}`,
      });
    }
    if (ergebnis.art === "beschaedigt") {
      this.meldungen.push({
        art: "ausgangB",
        text: `Segment ${ergebnis.segment} ab Offset ${ergebnis.abOffset}`,
      });
    }
    this.#merke(reaktion);
    if (reaktion?.art === "kennungGewechselt" || reaktion?.art === "kennungswechselUnvollstaendig") {
      this.#uebernimmNeueKennung(reaktion.neueClientId);
    }
    return ergebnis;
  }

  /** Takt A (§6.2). */
  async taktAWennFaellig(): Promise<Pollergebnis | undefined> {
    const jetzt = this.#o.uhr.jetzt();
    if (jetzt - this.#letzterTaktA < this.#o.plan.taktAMs) return undefined;
    this.#letzterTaktA = jetzt;
    return this.taktA();
  }

  async taktA(): Promise<Pollergebnis> {
    const ergebnis = await this.akte.taktA();
    this.#nimmAuf(ergebnis.neueZeilen);
    // §7.6 Bedingung 2 — und `lesefehler`, ohne das ein Share-Ausfall wie Ruhe
    // aussähe und der Konvergenzvergleich Stillstand als bestanden wertete.
    this.#aInFolge =
      ergebnis.fortschrittBytes === 0 &&
      ergebnis.lesefehler.length === 0 &&
      // §5.5: Ein stehen gebliebener Spiegel ist keine Ruhe. Der Offset ist
      // dann nicht fortgeschrieben, die Bytes kommen wieder.
      ergebnis.spiegelfehler.length === 0
        ? this.#aInFolge + 1
        : 0;
    return ergebnis;
  }

  /** Takt B (§6.2). */
  async taktBWennFaellig(): Promise<Pollergebnis | undefined> {
    const jetzt = this.#o.uhr.jetzt();
    if (jetzt - this.#letzterTaktB < this.#o.plan.taktBMs) return undefined;
    this.#letzterTaktB = jetzt;
    return this.taktB();
  }

  async taktB(): Promise<Pollergebnis> {
    const ergebnis = await this.akte.taktB();
    this.#nimmAuf(ergebnis.neueZeilen);
    // §7.6 Bedingung 3: keine neue Datei, kein angekündigtes Nachfolgesegment,
    // 0 Bytes in jeder in Takt B geführten Datei, kein Lesefehler.
    //
    // Das angekündigte, aber noch nicht vorhandene Nachfolgesegment ist damit
    // mit abgedeckt: Es taucht als **neue Datei** in genau dem Takt-B-Durchlauf
    // auf, in dem es sichtbar wird. Dass es nicht dauerhaft unsichtbar bleibt,
    // sichert Bedingung 1 beim Ankündigenden — seine Abschlusszeile und die
    // erste Zeile des Nachfolgers sind dann bereits gespiegelt.
    this.#bInFolge =
      ergebnis.fortschrittBytes === 0 &&
      ergebnis.neueDateien.length === 0 &&
      ergebnis.lesefehler.length === 0 &&
      ergebnis.spiegelfehler.length === 0
        ? this.#bInFolge + 1
        : 0;
    return ergebnis;
  }

  /**
   * Die Ruhemerkmale dieses Clients (§7.6).
   *
   * Bedingung 1 wird **unabhängig vom Spiegelungslauf** erhoben: Für jedes
   * eigene Segment wird der `shareOffset` aus `upload-state.json` gegen den
   * lokal vollständigen Offset derselben Datei gehalten. Den Lauf selbst zu
   * fragen hieße, den Messgegenstand nach dem Messwert zu fragen.
   *
   * Ausgenommen sind Segmente, die nach §4.6 **ersetzt** wurden: Ihre lokale
   * Datei bleibt unverändert liegen und ist damit länger als ihre
   * Share-Entsprechung (§4.6, „Die lokale Seite", Punkt 4). Sie tragen keine
   * unübertragenen Bytes, sondern Bytes, die nie wieder übertragen werden.
   */
  async ruhemerkmale(): Promise<Ruhemerkmale> {
    let unuebertragen = 0;
    if (this.#akte !== undefined) {
      const praefix = clientPraefix(this.#clientId);
      const ersetzt = await ersetzteSegmente(
        this.#o.echt,
        this.ablage,
        this.#clientId,
        this.akte.schreiber.zustand.frühereClientIds ?? [],
      );
      const eigen = this.akte.zustand.eigen;
      for (const name of await this.#o.echt.listeVerzeichnis(this.ablage.lokalEreignisse)) {
        const kennung = zerlegeEreignisDateiname(name);
        if (kennung === undefined || kennung.praefix !== praefix) continue;
        if (ersetzt.has(name)) continue;
        const bytes = await this.#o.echt.liesAb(this.ablage.lokalDatei(name), 0);
        const vollstaendig = leseZeilengrenzen(bytes, 0).endeOffset;
        const stand = eigen[`${praefix}.${segmentText(kennung.segment)}`]?.shareOffset ?? 0;
        unuebertragen += Math.max(0, vollstaendig - stand);
      }
    }
    return {
      bedingung1: unuebertragen === 0,
      bedingung2: this.#aInFolge >= this.#noetigeDurchlaeufeA(),
      bedingung3: this.#bInFolge >= this.#noetigeDurchlaeufeB(),
      aInFolge: this.#aInFolge,
      bInFolge: this.#bInFolge,
      unuebertragen,
    };
  }

  /**
   * Wie viele leere Takt-A-Durchläufe in Folge Bedingung 2 verlangt.
   *
   * §7.6 nennt **zwei**, und begründet sie damit, dass „ein einzelner leerer
   * Takt A auch dann entsteht, wenn ein anderer Client gerade zwischen zwei
   * Zeilen steht". Das ist richtig, deckt aber nur den Fall ab, in dem der
   * Leser die Wahrheit sieht.
   *
   * **Befund aus M0.4:** Die Caches aus §6.6 halten eine Falschauskunft über
   * ihre Lebensdauer aufrecht — der `FileNotFound`-Cache 5 Sekunden, der
   * Verzeichnis-Cache 10. Bei einem Takt B von 4 Sekunden (§6.2) können zwei
   * aufeinanderfolgende Durchläufe aus **derselben** zwischengespeicherten
   * Auskunft bedient werden. Zwei leere Durchläufe belegen dann nicht, dass
   * nichts da ist, sondern nur, dass der Cache noch dieselbe Antwort gibt —
   * und die Ruhephase gälte als erreicht, während eine Datei unentdeckt auf dem
   * Share liegt. Der Konvergenzvergleich fiele danach in den dritten Ausgang
   * („nicht vergleichbar"), ohne dass irgendetwas kaputt wäre.
   *
   * Deshalb spannt die Zahl der geforderten Durchläufe hier über die längste
   * Cache-Lebensdauer plus die zwei aus §7.6. Für einen Lauf ohne Caches ergibt
   * das genau die zwei, die das Konzept nennt.
   */
  #noetigeDurchlaeufeA(): number {
    const cache = Math.max(
      this.#o.plan.profil.fileNotFoundCacheMs,
      this.#o.plan.profil.sichtbarkeitsverzoegerungMs,
    );
    return 2 + Math.ceil(cache / this.#o.plan.taktAMs);
  }

  #noetigeDurchlaeufeB(): number {
    const cache = Math.max(
      this.#o.plan.profil.verzeichnisCacheMs,
      this.#o.plan.profil.fileNotFoundCacheMs,
    );
    return 2 + Math.ceil(cache / this.#o.plan.taktBMs);
  }

  // -------------------------------------------------------------------------

  #uebernimmNeueKennung(neue: string): void {
    this.#clientId = neue;
    this.#hlcUhr = new HlcUhr({ clientId: neue, wanduhr: this.uhr.lies });
  }

  #neueKennung(): string {
    // Deterministisch aus dem gesetzten Startwert — sonst wäre ein Lauf mit
    // Kennungswechsel nicht wiederholbar (DoD M0.4).
    const hex = this.#o.zufall.bis(0xffff_ffff).toString(16).padStart(8, "0");
    return `${hex}${this.#o.zufall.bis(0xffff_ffff).toString(16).padStart(8, "0")}`;
  }

  #merke(reaktion: Reaktion | undefined): void {
    if (reaktion === undefined) return;
    this.meldungen.push({ art: reaktion.art, text: reaktion.meldung });
  }

  /** Nimmt Zeilen in die fortgeschriebene Faltung auf — die Quelle der Vorher-Werte (§2.5). */
  #nimmAuf(zeilen: readonly { readonly rahmen: { readonly typ: string } }[]): void {
    const ereignisse: EingehendesEreignis[] = [];
    for (const zeile of zeilen) {
      if (istVerwaltungsereignis(zeile.rahmen.typ)) continue;
      ereignisse.push(zeile.rahmen as unknown as EingehendesEreignis);
    }
    if (ereignisse.length === 0) return;
    this.#faltung = falteHinzu(this.#faltung, ereignisse);
    this.#zustand = materialisiere(this.#faltung);
  }
}
