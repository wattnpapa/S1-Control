/**
 * Die geöffnete Einsatzakte — die Stelle, an der Schreiber, Spiegelung und
 * Leser zusammengeschaltet sind.
 *
 * Sie steht hier, weil die Reaktionen aus §4.5 und §4.6 sonst kein Aufrufer
 * hätten: `schreibeErsatzsegment` (§4.6) und `kennungswechsel` (§4.5) sind die
 * beiden Wege, die §8.6.1 Regel 4 als „den einzigen Weg zurück" bezeichnet,
 * und ohne diese Verdrahtung wäre keiner von beiden je erreicht. Zugleich ist
 * hier die **eine** Stelle festgelegt, die §4.5 Schritt 3 offenlässt: welche
 * lokalen Ereignisse als „noch nicht gespiegelt" gelten und deshalb mit ihrer
 * Identität mitgenommen werden.
 *
 * Kein Takt, kein Zeitgeber, kein Worker: Die Akte wird gerufen, sie ruft
 * nicht. Der Worker je Akte ist M2.1 (§5.4.4); diese Schicht erzwingt keinen
 * synchronen Aufruf und läuft ohne Electron.
 */

import type { Akteur, HlcUhr } from "@s1/domaene";

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { ersetzteSegmente } from "./ersetzteSegmente.js";
import { Identitaetenbuch } from "./identitaeten.js";
import { Leser, type Pollergebnis } from "./leser.js";
import { pruefeBeimOeffnen, type Oeffnungsbefund } from "./oeffnungspruefung.js";
import {
  clientPraefix,
  segmentText,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
import { oeffneSchreiber, type Ereignisentwurf, type Schreibergebnis, type Schreiber } from "./schreiber.js";
import { Spiegelung, type Spiegelergebnis } from "./spiegelung.js";
import { liesUploadZustand, schreibeUploadZustand, type UploadZustand } from "./uploadZustand.js";
import { istVerwaltungsereignis } from "./verwaltungsereignisse.js";
import { leseZeilengrenzen, type GeleseneZeile } from "./zeile.js";
import type { Zeitquelle } from "./zeit.js";

/** Was beim Öffnen der Akte geschehen ist. */
export interface Oeffnungsergebnis {
  /** Der Befund der Prüfung nach §4.5 und §4.6.1. */
  readonly befund: Oeffnungsbefund;
  /** Die Reaktion, falls eine nötig war. */
  readonly reaktion?: Reaktion;
  /** Was der Quarantäne-Nachlauf aus §8.2 Punkt 5 ergeben hat. */
  readonly quarantaeneNachlauf: Pollergebnis;
}

/** Die beiden Reaktionen aus §5.4.3, mit dem Text, den der Bediener sieht. */
export type Reaktion =
  /** §4.6: Ersatzsegment geschrieben. Kein Kennungswechsel. */
  | { readonly art: "repariert"; readonly ersetztesSegment: number; readonly abOffset: number; readonly meldung: string }
  /** §4.6: Die Reparatur selbst ist gescheitert (§8.8). Kein Erfolg melden. */
  | { readonly art: "reparaturGescheitert"; readonly ersetztesSegment: number; readonly meldung: string }
  /** §4.5 Fall 2: neue Kennung, mitgenommene Identitäten. */
  | { readonly art: "kennungGewechselt"; readonly alteClientId: string; readonly neueClientId: string; readonly mitgenommen: number; readonly meldung: string }
  /** §4.5 Fall 2, aber das Übernehmen der Zeilen brach ab (§8.8). */
  | { readonly art: "kennungswechselUnvollstaendig"; readonly alteClientId: string; readonly neueClientId: string; readonly meldung: string }
  /** §5.7: Der Ordner ist fort; die Spiegelung ruht. */
  | { readonly art: "ordnerFort"; readonly meldung: string }
  /** §8.9: Der Zugriff scheiterte; der Rückstau bestimmt den nächsten Versuch. */
  | { readonly art: "gescheitert"; readonly meldung: string; readonly naechsterVersuchMs: number }
  /**
   * §8.3: Der Share war beim Öffnen nicht erreichbar.
   *
   * §1.3 Satz 2: „Der NAS-Ausfall ist der Normalpfad, kein Fehlerpfad." Die
   * Akte ist trotzdem offen und benutzbar — es wird lokal geschrieben (§5.2),
   * und die Prüfung wird nachgeholt.
   */
  | { readonly art: "shareNichtErreichbar"; readonly code: string; readonly meldung: string };

export interface AkteOptionen {
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  readonly einsatzId: string;
  readonly akteur: Akteur;
  readonly uhr: HlcUhr;
  /** Erzeugt eine neue Kennung für §4.5, Reaktion Schritt 1. Injiziert, damit Tests sie festlegen können. */
  readonly neueKennung: () => string;
  readonly segmentgroesse?: number;
}

/**
 * Öffnet eine Einsatzakte in der Reihenfolge, die das Konzept vorgibt.
 *
 * 1. Schreiber starten — laufendes Segment aus dem Dateibestand, Kürzung nach
 *    §8.1 (`bereiteSchreiberVor`).
 * 2. `upload-state.json` lesen und gegen den Spiegel abgleichen (§5.3, §5.5).
 * 3. Quarantänestellen einmal erneut prüfen (§8.2 Punkt 5).
 * 4. Eigene Share-Segmente vollständig prüfen (§4.6.1 Auslöser 1, §4.5) und auf
 *    den Befund reagieren.
 */
export async function oeffneAkte(
  optionen: AkteOptionen,
): Promise<{ readonly akte: Akte; readonly ergebnis: Oeffnungsergebnis }> {
  const schreiber = await oeffneSchreiber({
    dateisystem: optionen.dateisystem,
    zeit: optionen.zeit,
    ablage: optionen.ablage,
    clientId: optionen.clientId,
    akteur: optionen.akteur,
    uhr: optionen.uhr,
    ...(optionen.segmentgroesse === undefined ? {} : { segmentgroesse: optionen.segmentgroesse }),
  });
  const zustand = await liesUploadZustand(optionen.dateisystem, optionen.ablage.uploadZustandDatei);
  const akte = new Akte(optionen, schreiber, zustand);
  const ergebnis = await akte.oeffnen();
  return { akte, ergebnis };
}

export class Akte {
  readonly #optionen: AkteOptionen;
  readonly #schreiber: Schreiber;
  #leser: Leser;
  #spiegelung: Spiegelung;
  /** Reiht die Schreibvorgänge auf `upload-state.json` (§8.4). */
  #zustandSchreiben: Promise<boolean> = Promise.resolve(true);

  constructor(optionen: AkteOptionen, schreiber: Schreiber, zustand: UploadZustand) {
    this.#optionen = optionen;
    this.#schreiber = schreiber;
    this.#leser = this.#baueLeser(zustand);
    this.#spiegelung = this.#baueSpiegelung(zustand);
  }

  get schreiber(): Schreiber {
    return this.#schreiber;
  }

  get leser(): Leser {
    return this.#leser;
  }

  /** Der zusammengeführte Uploadzustand aus Leser und Spiegelung (§5.3). */
  get zustand(): UploadZustand {
    return { eigen: this.#spiegelung.zustand.eigen, fremd: this.#leser.zustand.fremd };
  }

  /**
   * Schreibt `upload-state.json` fort — serialisiert.
   *
   * §6.2 lässt `spiegle()`, `taktA()` und `taktB()` unabhängig laufen, und alle
   * drei schreiben denselben Zustand. Ohne diese Reihung überschnitten sich
   * zwei Schreibvorgänge auf derselben Datei; §8.4 verlangt genau das nicht:
   * „Je Datei ist höchstens ein Zugriff offen; die Speicherschicht serialisiert
   * das selbst und überlässt es nicht dem Aufrufer."
   */
  async speichereZustand(): Promise<boolean> {
    this.#zustandSchreiben = this.#zustandSchreiben.then(async () =>
      schreibeUploadZustand(
        this.#optionen.dateisystem,
        this.#optionen.ablage.uploadZustandDatei,
        this.zustand,
      ),
    );
    return this.#zustandSchreiben;
  }

  /** Siehe {@link oeffneAkte}. */
  async oeffnen(): Promise<Oeffnungsergebnis> {
    // §4.5 Schritt 6 nachholen, bevor der Spiegelabgleich läuft: Blieb das
    // Kürzen beim Wechsel unvollständig (§8.8), setzte `gleicheMitSpiegelAb`
    // den `leseOffset` der aufgegebenen Datei hinter ihr Share-Ende, und sie
    // würde nie wieder gelesen. Befund aus der Simulation M0.4.
    await this.#kuerzeAufgegebeneDateien(
      (this.#schreiber.zustand.frühereClientIds ?? []).map(clientPraefix),
    );
    await this.#leser.gleicheMitSpiegelAb();
    const quarantaeneNachlauf = await this.#leser.pruefeQuarantaenenErneut();
    const befund = await pruefeBeimOeffnen({
      dateisystem: this.#optionen.dateisystem,
      ablage: this.#optionen.ablage,
      clientId: this.#schreiber.clientId,
      identitaeten: this.#schreiber.identitaeten,
      eigeneLaufnummer: this.#schreiber.zustand.laufnummer,
      // §4.6 Schritt 5: Ein ersetztes Segment wird nicht mehr beschrieben, und
      // seine Beschädigung auf dem Share bleibt liegen. Ohne diese Auskunft
      // erzeugte jedes Öffnen ein weiteres Ersatzsegment.
      bereitsErsetzt: await ersetzteSegmente(
        this.#optionen.dateisystem,
        this.#optionen.ablage,
        this.#schreiber.clientId,
      ),
      ...(this.#schreiber.zustand.frühereClientIds === undefined
        ? {}
        : { frühereClientIds: this.#schreiber.zustand.frühereClientIds }),
    });
    const reaktion = await this.#reagiereAufBefund(befund);
    await this.speichereZustand();
    return reaktion === undefined
      ? { befund, quarantaeneNachlauf }
      : { befund, reaktion, quarantaeneNachlauf };
  }

  /** Ein Ereignis schreiben (§5.2). */
  async schreibe(entwurf: Ereignisentwurf): Promise<Schreibergebnis> {
    return this.#schreiber.schreibe(entwurf);
  }

  /**
   * Ein Spiegelungslauf samt Reaktion (§5.4, §5.4.3).
   *
   * Ausgang B führt zur Reparatur nach §4.6, Ausgang C zum Kennungswechsel nach
   * §4.5 — ohne diese Verdrahtung wären beide Wege unerreichbar.
   */
  async spiegle(): Promise<{ readonly ergebnis: Spiegelergebnis; readonly reaktion?: Reaktion }> {
    const ergebnis = await this.#spiegelung.lauf();
    const reaktion = await this.#reagiereAufSpiegel(ergebnis);
    await this.speichereZustand();
    return reaktion === undefined ? { ergebnis } : { ergebnis, reaktion };
  }

  /** Takt A (§6.2). */
  async taktA(): Promise<Pollergebnis> {
    const ergebnis = await this.#leser.taktA();
    await this.speichereZustand();
    return ergebnis;
  }

  /** Takt B (§6.2). */
  async taktB(): Promise<Pollergebnis> {
    const ergebnis = await this.#leser.taktB();
    await this.speichereZustand();
    return ergebnis;
  }

  async #reagiereAufBefund(befund: Oeffnungsbefund): Promise<Reaktion | undefined> {
    if (befund.art === "beschaedigt") {
      return this.#repariere(befund.segment, befund.abOffset);
    }
    if (befund.art === "fremdschreiber") {
      return this.#wechsleKennung();
    }
    if (befund.art === "nichtErreichbar") {
      return {
        art: "shareNichtErreichbar",
        code: befund.code,
        meldung:
          "Der Server war beim Öffnen nicht erreichbar. Der Einsatz ist geöffnet, es wird lokal " +
          "gespeichert und übertragen, sobald der Server wieder antwortet.",
      };
    }
    return undefined;
  }

  async #reagiereAufSpiegel(ergebnis: Spiegelergebnis): Promise<Reaktion | undefined> {
    if (ergebnis.art === "beschaedigt") {
      return this.#repariere(ergebnis.segment, ergebnis.abOffset);
    }
    if (ergebnis.art === "fremdeSchreibspur") {
      return this.#wechsleKennung();
    }
    if (ergebnis.art === "ordnerFort") {
      return { art: "ordnerFort", meldung: ergebnis.meldung };
    }
    if (ergebnis.art === "laeuftBereits") {
      // §6.2 lässt die Takte unabhängig laufen; die Überlappung ist vorgesehen
      // und wird dem Bediener nicht als Störung gemeldet (§6.3).
      return undefined;
    }
    if (ergebnis.art === "gescheitert") {
      return {
        art: "gescheitert",
        meldung: ergebnis.meldung,
        naechsterVersuchMs: ergebnis.naechsterVersuchMs,
      };
    }
    return undefined;
  }

  /**
   * §4.6: Reparatur durch Anhängen an anderer Stelle. Kein Kennungswechsel.
   *
   * Scheitert der lokale Anhang, wird das **gemeldet** und nicht als Erfolg
   * ausgegeben: §8.8 Punkt 1 verlangt, dass ein gescheiterter Schreibvorgang
   * sichtbar abgewiesen wird, und §6.3 verbietet eine Anzeige, die Erfolg
   * suggeriert.
   */
  async #repariere(segment: number, abOffset: number): Promise<Reaktion> {
    const ergebnis = await this.#schreiber.schreibeErsatzsegment(segment, abOffset);
    if (ergebnis.art !== "geschrieben") {
      return {
        art: "reparaturGescheitert",
        ersetztesSegment: segment,
        meldung:
          ergebnis.art === "abgewiesen"
            ? ergebnis.meldung
            : "Die Reparatur konnte nicht abgeschlossen werden.",
      };
    }
    return {
      art: "repariert",
      ersetztesSegment: segment,
      abOffset,
      meldung:
        "Ein Teil der bereits übertragenen Einträge dieses Arbeitsplatzes ist auf dem Server " +
        "beschädigt; er wird neu geschrieben.",
    };
  }

  /**
   * §4.5, Reaktion: neue Kennung, mitgenommene Identitäten, fortlaufende
   * Laufnummer.
   *
   * Nach dem Wechsel werden Leser und Spiegelung neu aufgesetzt: Der Leser
   * behandelt die alte eigene Datei ab jetzt als fremde (§4.5 Schritt 6), und
   * die Spiegelung schlüsselt ihre Offsets unter dem neuen Präfix.
   */
  async #wechsleKennung(): Promise<Reaktion> {
    const alteClientId = this.#schreiber.clientId;
    const neueClientId = this.#optionen.neueKennung();
    // Vor dem Wechsel festhalten: Danach schlüsselt die Spiegelung unter dem
    // neuen Präfix, und die alten Offsets wären nicht mehr auffindbar. Sie
    // werden weitergeführt, aber nie wieder beschrieben (§4.6, „Die lokale
    // Seite", Schritt 3, sinngemäß auch hier).
    const alteOffsets = this.#spiegelung.zustand.eigen;
    const ungespiegelte = await this.#ungespiegelteEigeneZeilen();
    const ergebnis = await this.#schreiber.kennungswechsel(neueClientId, ungespiegelte);

    const gekuerzt =
      ergebnis === undefined
        ? await this.#kuerzeAufgegebeneDateien([
            clientPraefix(alteClientId),
            ...(this.#schreiber.zustand.frühereClientIds ?? []).map(clientPraefix),
          ])
        : false;

    // Die alten `eigen`-Einträge bleiben stehen und werden nie wieder angefasst
    // (§4.6, „Die lokale Seite", Schritt 3, sinngemäß auch hier): Sie gehören zu
    // einer Datei, die ab jetzt fremd ist. Der Leser baut seinen Stand für sie
    // aus dem Spiegel auf (§4.5 Schritt 6).
    this.#leser = this.#baueLeser({ eigen: {}, fremd: this.#leser.zustand.fremd });
    this.#spiegelung = this.#baueSpiegelung({ eigen: alteOffsets, fremd: {} });
    await this.#leser.gleicheMitSpiegelAb();

    if (ergebnis !== undefined) {
      // §8.8 und §6.3: Bricht das Übernehmen der Zeilen ab, darf hier keine
      // Erfolgsmeldung stehen. Die Kennung ist gewechselt und persistiert — was
      // fehlt, sind die restlichen mitzunehmenden Zeilen, und genau das wird
      // gesagt.
      return {
        art: "kennungswechselUnvollstaendig",
        alteClientId,
        neueClientId,
        meldung:
          "Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer " +
          "neuen Kennung weiter. Ein Teil der noch nicht übertragenen Einträge konnte dabei nicht " +
          "übernommen werden und ist auf diesem Rechner weiterhin vorhanden.",
      };
    }
    return {
      art: "kennungGewechselt",
      alteClientId,
      neueClientId,
      mitgenommen: ungespiegelte.length,
      // §4.5 Schritt 6 ist erst mit der Kürzung erfüllt; scheitert sie an einer
      // lokalen Schreibstörung (§8.8), wird das gesagt statt verschwiegen
      // (§6.3). Der Wechsel selbst gilt, und die Kürzung wird beim nächsten
      // Öffnen über `gleicheMitSpiegelAb` und den Leser nachgeholt.
      meldung: gekuerzt
        ? "Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer " +
          "neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten."
        : "Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer " +
          "neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten. Das Aufräumen der " +
          "alten Dateien auf diesem Rechner konnte noch nicht abgeschlossen werden.",
    };
  }

  /**
   * Bringt die Dateien aufgegebener Kennungen auf das, was §4.5 Schritt 6 aus
   * ihnen macht: den **Spiegel einer fremden Datei** (§5.5).
   *
   * §4.5 Schritt 6 erklärt den lokalen Spiegel der alten eigenen Datei ab dem
   * Wechsel zum „Spiegel einer fremden Datei — nämlich der des Klons". Das
   * setzt nach §5.5 voraus, dass er das **geprüfte Präfix** der Share-Datei
   * ist. Im Augenblick des Wechsels ist er das nicht: Er enthält zusätzlich die
   * noch nicht gespiegelten Zeilen, deretwegen Schritt 3 überhaupt existiert.
   *
   * Ohne diese Kürzung setzte der Spiegelabgleich `leseOffset` auf die lokale
   * Länge — also hinter das Share-Ende. Der Klon würde nie wieder gelesen: kein
   * Byte, keine Meldung, keine Quarantäne. Genau der stille Falschzustand, den
   * §6.3 ausschließt.
   *
   * **Gekürzt wird auf das, was der Share hergibt, nicht auf den gemerkten
   * `shareOffset`.** Der gemerkte Offset wird erst nach erfolgreichem `fsync`
   * fortgeschrieben (§5.4.2); nach einem abgebrochenen Übertragungsversuch
   * liegen auf dem Share bereits Bytes, die er nicht kennt. Auf ihn zu kürzen
   * entfernte lokal Zeilen, die auf dem Share stehen — der Spiegel wäre danach
   * dauerhaft kürzer als die Datei, die er spiegelt, und der Leser holte sie
   * nie nach, weil die Kette an einer anderen Stelle stünde. Maßgeblich ist
   * deshalb das gelesene Share-Ende, so weit es byteweise mit der lokalen Datei
   * übereinstimmt, abgerundet auf die letzte vollständige Zeile (§5.5).
   *
   * Verworfen wird dabei nichts: Die abgeschnittenen Zeilen sind nach Schritt 3
   * unverändert und mit derselben Identität in die Datei der neuen Kennung
   * übernommen worden.
   *
   * Die Behandlung **aller** früheren Kennungen und der Aufruf bei jedem Öffnen
   * sind Befunde aus der Simulation M0.4: Ein Client kann die Kennung mehrfach
   * wechseln (§4.5 kennt keine Obergrenze), und scheitert das Kürzen an einer
   * lokalen Schreibstörung (§8.8), bleibt Schritt 6 sonst dauerhaft unerfüllt.
   * Der Vorgang ist wiederholbar: Er entfernt nie Bytes, die auf dem Share
   * stehen.
   *
   * Das Konzept sagt zu dieser Kürzung nichts; sie ist die Auslegung, mit der
   * Schritt 6 überhaupt erfüllbar wird.
   */
  async #kuerzeAufgegebeneDateien(praefixe: Iterable<string>): Promise<boolean> {
    let vollstaendig = true;
    for (const praefix of new Set(praefixe)) {
      if (praefix === clientPraefix(this.#schreiber.clientId)) continue;
      for (const kennung of await this.#eigeneDateien(praefix)) {
        try {
          if (!(await this.#kuerzeAufShareStand(kennung))) vollstaendig = false;
        } catch (fehler) {
          // §8.8 verlangt eine sichtbare Abweisung, §8 Grundsatz verbietet den
          // Stillstand: Ein lokaler Dateisystemfehler darf den Kennungswechsel
          // nicht abbrechen. Befund aus der Simulation M0.4.
          if (!(fehler instanceof DateisystemFehler)) throw fehler;
          vollstaendig = false;
        }
      }
    }
    return vollstaendig;
  }

  /** Kürzt eine einzelne aufgegebene Datei; `false`, wenn der Share nicht lesbar war. */
  async #kuerzeAufShareStand(kennung: Dateikennung): Promise<boolean> {
    const lokalPfad = this.#optionen.ablage.lokalDatei(kennung.name);
    const lokal = await this.#optionen.dateisystem.liesAb(lokalPfad, 0);
    let share: Uint8Array;
    try {
      share = await this.#optionen.dateisystem.liesAb(
        this.#optionen.ablage.shareDatei(kennung.name),
        0,
      );
    } catch (fehler) {
      if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
        share = new Uint8Array(0);
      } else {
        // Share nicht lesbar: nichts kürzen. Beim nächsten Öffnen erneut.
        return false;
      }
    }
    let gleich = 0;
    while (gleich < share.byteLength && gleich < lokal.byteLength && share[gleich] === lokal[gleich]) {
      gleich += 1;
    }
    // §5.5: Der Spiegel endet an einer Zeilengrenze, nie mitten in einer Zeile.
    const ziel = leseZeilengrenzen(lokal.subarray(0, gleich), 0).endeOffset;
    if (ziel < lokal.byteLength) await this.#optionen.dateisystem.kuerzeAuf(lokalPfad, ziel);
    return true;
  }

  /** Die lokalen Segmentdateien einer Kennung, aufsteigend. */
  async #eigeneDateien(praefix: string): Promise<readonly Dateikennung[]> {
    const namen = await this.#optionen.dateisystem.listeVerzeichnis(
      this.#optionen.ablage.lokalEreignisse,
    );
    return namen
      .flatMap((name) => {
        const kennung = zerlegeEreignisDateiname(name);
        return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
      })
      .sort((a: Dateikennung, b: Dateikennung) => a.segment - b.segment);
  }

  /**
   * §4.5 Schritt 3: „Die noch nicht gespiegelten lokalen Ereignisse behalten
   * ihre Identität."
   *
   * Welche das sind, legt das Konzept nicht aus — hier ist es festgelegt: alle
   * lokalen Zeilen der eigenen Segmente jenseits ihres `shareOffset`. Sie
   * werden unverändert in die neue Datei geschrieben; neue Identitäten zu
   * vergeben hiesse, dasselbe Ereignis zweimal in die Menge zu geben, und der
   * Fold könnte sie nicht mehr zusammenführen.
   */
  async #ungespiegelteEigeneZeilen(): Promise<readonly GeleseneZeile[]> {
    const praefix = clientPraefix(this.#schreiber.clientId);
    const zeilen: GeleseneZeile[] = [];
    for (const kennung of await this.#eigeneDateien(praefix)) {
      const bytes = await this.#optionen.dateisystem.liesAb(
        this.#optionen.ablage.lokalDatei(kennung.name),
        0,
      );
      const stand =
        this.#spiegelung.zustand.eigen[`${praefix}.${segmentText(kennung.segment)}`]?.shareOffset ?? 0;
      zeilen.push(
        ...leseZeilengrenzen(bytes, 0).zeilen.filter(
          (z) =>
            z.offset >= stand &&
            // Verwaltungsereignisse (§2.4) reden über **die Datei**, in der sie
            // stehen, und werden deshalb nicht mitgenommen:
            //
            // `SegmentAbgeschlossen` sagt nach §4.3 „dieses Segment ist fertig,
            // es geht bei N weiter". In einer anderen Datei ist das falsch: Ein
            // Leser, dessen Abschnitt darauf endet, hielte den neuen
            // Arbeitsplatz für abgeschlossen und läse ihn nie wieder — ohne
            // Meldung, ohne Quarantäne.
            //
            // `SegmentErsetzt` nennt nach §4.6 Schritt 2 ein Segment des
            // **alten** Präfixes. Stünde es am Anfang der neuen Datei, hielte
            // `ersetzteSegmente` das laufende Segment `0000` der neuen Kennung
            // für ersetzt — es fiele dauerhaft aus der Vollprüfung nach §4.6.1.
            !istVerwaltungsereignis(z.rahmen.typ),
        ),
      );
    }
    return zeilen;
  }

  #baueLeser(zustand: UploadZustand): Leser {
    return new Leser(
      {
        dateisystem: this.#optionen.dateisystem,
        zeit: this.#optionen.zeit,
        ablage: this.#optionen.ablage,
        clientId: this.#schreiber.clientId,
        identitaeten: this.#schreiber.identitaeten as Identitaetenbuch,
        uhr: this.#optionen.uhr,
      },
      zustand,
    );
  }

  #baueSpiegelung(zustand: UploadZustand): Spiegelung {
    return new Spiegelung(
      {
        dateisystem: this.#optionen.dateisystem,
        zeit: this.#optionen.zeit,
        ablage: this.#optionen.ablage,
        clientId: this.#schreiber.clientId,
        einsatzId: this.#optionen.einsatzId,
        vollstaendigerOffset: () => ({
          segment: this.#schreiber.segment,
          offset: this.#schreiber.lokalerVollstaendigerOffset,
        }),
        identitaeten: this.#schreiber.identitaeten,
        // §4.6 Schritt 5, auch hier: Ein ersetztes Segment wird nicht mehr
        // beschrieben. Ohne diese Auskunft fiele jeder Spiegelungslauf erneut
        // in Ausgang B und erzeugte ein weiteres Ersatzsegment — und weil der
        // Lauf beim ersten `beschaedigt` zurückkehrt, erreichte keines davon je
        // den Share.
        bereitsErsetzt: () =>
          ersetzteSegmente(
            this.#optionen.dateisystem,
            this.#optionen.ablage,
            this.#schreiber.clientId,
          ),
      },
      zustand,
    );
  }
}
