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

import type { Dateisystem } from "./dateisystem.js";
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
import { TYP_SEGMENT_ABGESCHLOSSEN } from "./verwaltungsereignisse.js";
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
  | { readonly art: "gescheitert"; readonly meldung: string; readonly naechsterVersuchMs: number };

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

  /** Schreibt `upload-state.json` fort. */
  async speichereZustand(): Promise<void> {
    await schreibeUploadZustand(
      this.#optionen.dateisystem,
      this.#optionen.ablage.uploadZustandDatei,
      this.zustand,
    );
  }

  /** Siehe {@link oeffneAkte}. */
  async oeffnen(): Promise<Oeffnungsergebnis> {
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
    const ungespiegelte = await this.#ungespiegelteEigeneZeilen();
    const ergebnis = await this.#schreiber.kennungswechsel(neueClientId, ungespiegelte);

    // Die alten `eigen`-Einträge bleiben stehen und werden nie wieder angefasst
    // (§4.6, „Die lokale Seite", Schritt 3, sinngemäß auch hier): Sie gehören zu
    // einer Datei, die ab jetzt fremd ist. Der Leser baut seinen Stand für sie
    // aus dem Spiegel auf (§4.5 Schritt 6).
    this.#leser = this.#baueLeser({ eigen: {}, fremd: this.#leser.zustand.fremd });
    this.#spiegelung = this.#baueSpiegelung({
      eigen: this.#spiegelung.zustand.eigen,
      fremd: {},
    });
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
      meldung:
        "Dieses Benutzerprofil wurde offenbar kopiert. Der Rechner arbeitet ab jetzt unter einer " +
        "neuen Kennung weiter; bereits geschriebene Einträge bleiben erhalten.",
    };
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
    const namen = await this.#optionen.dateisystem.listeVerzeichnis(
      this.#optionen.ablage.lokalEreignisse,
    );
    const eigene = namen
      .flatMap((name) => {
        const kennung = zerlegeEreignisDateiname(name);
        return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
      })
      .sort((a: Dateikennung, b: Dateikennung) => a.segment - b.segment);

    const zeilen: GeleseneZeile[] = [];
    for (const kennung of eigene) {
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
            // §4.3: Eine Abschlusszeile sagt „dieses Segment ist fertig, es geht
            // bei N weiter". In einer **anderen** Datei ist das eine falsche
            // Aussage: Ein Leser, dessen Abschnitt darauf endet, hielte den
            // neuen Arbeitsplatz für abgeschlossen und läse ihn nie wieder —
            // ohne Meldung und ohne Quarantäne. Sie wird deshalb nicht
            // mitgenommen; die alte Datei wächst ohnehin nicht mehr und fällt
            // nach §6.2 aus Takt A heraus.
            z.rahmen.typ !== TYP_SEGMENT_ABGESCHLOSSEN,
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
      },
      zustand,
    );
  }
}
