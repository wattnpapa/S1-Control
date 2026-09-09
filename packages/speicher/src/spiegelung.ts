/**
 * Spiegelung auf den Share — KONZEPT-SPEICHER.md §5.4 mit §5.4.1 bis §5.4.4,
 * dazu die Pfadprüfung aus §5.7 und die Fehlerklassen aus §8.9.
 *
 * Die tragende Zusicherung dieses Abschnitts steht in §5.4.1:
 *
 * > **Die Share-Datei ist zu jedem Zeitpunkt ein Byte-Präfix der lokalen Datei
 * > desselben Segments.**
 *
 * Sie gilt über einen Absturz hinweg, weil nur bis zur letzten lokal
 * vollständigen, kettenrichtigen Zeile gespiegelt wird und der Schreiber seine
 * lokale Datei beim Start auf genau diese Stelle kürzt (§8.1). Ohne sie wäre
 * der Gegenfall möglich: Ein Spiegelungslauf nimmt eine gerade entstehende
 * Zeile mit, der Rechner stürzt ab, die lokale Datei wird gekürzt — und die
 * Share-Datei wäre **länger** als die lokale. Der Vergleich fände dann fremde
 * Bytes an einer Stelle, an der es lokal keine gibt, und meldete dem Bediener
 * nach einem gewöhnlichen Absturz, sein Benutzerprofil sei kopiert worden.
 *
 * Das wahre Dateiende wird ausschließlich durch **Lesen** bestimmt (§5.4.2).
 * Der Port bietet gar keine Größenabfrage an.
 */

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { pruefeEinsatzordner } from "./einsatzordner.js";
import { shareklasse } from "./fehler.js";
import { grenzeUndKette } from "./kettenanker.js";
import {
  MELDUNG_BESCHAEDIGT,
  MELDUNG_KEIN_SCHREIBRECHT,
  MELDUNG_NICHT_ERREICHBAR,
  MELDUNG_ORDNER_FORT,
  MELDUNG_PROFIL_KOPIERT,
  type Spiegelergebnis,
} from "./spiegelergebnis.js";
import type { Identitaetenblick } from "./zeile.js";
import {
  clientPraefix,
  segmentText,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
import { vergleicheSpiegel, type Vergleichsausgang } from "./spiegelvergleich.js";
import { RUECKSTAU_STAFFEL_MS } from "./startwerte.js";
import {
  neuerEigenerOffset,
  type EigenerOffset,
  type UploadZustand,
} from "./uploadZustand.js";
import type { Zeitquelle } from "./zeit.js";

export interface SpiegelungOptionen {
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  /** Kennung des Einsatzes; §5.7 prüft sie vor jedem Lauf gegen `einsatz.json`. */
  readonly einsatzId: string;
  /** Der `lokalerVollstaendigerOffset` des laufenden Segments (§5.4.1). */
  readonly vollstaendigerOffset: () => { readonly segment: number; readonly offset: number };
  /** Die lokal vergebenen Identitäten (§5.3) — Grundlage der Trennung von B und C. */
  readonly identitaeten: Identitaetenblick;
}

/**
 * Ein Spiegelungslauf.
 *
 * Nach §5.4.4 läuft er „aus dem Worker, nie aus dem Main-Prozess": Ein
 * blockierender SMB-Aufruf kann bis zu 60 Sekunden hängen
 * (`SessTimeout`, `nas-speicher-recherche.md` §1.8). M0.3 baut keinen Worker
 * (das ist M2.1); hier heißt der Satz nur, dass diese Klasse keinen synchronen
 * Aufruf erzwingt und ohne Electron läuft.
 */
export type {
  Spiegelergebnis,
} from "./spiegelergebnis.js";
export {
  MELDUNG_BESCHAEDIGT,
  MELDUNG_KEIN_SCHREIBRECHT,
  MELDUNG_NICHT_ERREICHBAR,
  MELDUNG_ORDNER_FORT,
  MELDUNG_PROFIL_KOPIERT,
} from "./spiegelergebnis.js";

export class Spiegelung {
  readonly #optionen: SpiegelungOptionen;
  #zustand: UploadZustand;
  #rueckstauStufe = 0;
  #laeuft = false;
  #ausfallSeit: number | undefined;

  constructor(optionen: SpiegelungOptionen, zustand: UploadZustand) {
    this.#optionen = optionen;
    this.#zustand = zustand;
  }

  /** Der fortgeschriebene Uploadzustand (§5.3); der Aufrufer schreibt ihn weg. */
  get zustand(): UploadZustand {
    return this.#zustand;
  }

  /** Seit wann der Share nicht mehr erreichbar ist (§6.3), sonst `undefined`. */
  get ausfallSeit(): number | undefined {
    return this.#ausfallSeit;
  }

  /** Wartezeit bis zum nächsten Versuch nach der Staffel aus §5.4.4. */
  get naechsterVersuchMs(): number {
    const stufe = Math.min(this.#rueckstauStufe, RUECKSTAU_STAFFEL_MS.length - 1);
    return RUECKSTAU_STAFFEL_MS[stufe] as number;
  }

  /**
   * Ein Durchlauf.
   *
   * §8.4: „Kein zweiter Versuch, solange der erste unterwegs ist. Je Datei ist
   * höchstens ein Zugriff offen; die Speicherschicht serialisiert das selbst
   * und überlässt es nicht dem Aufrufer." Ein Wiederholversuch neben einem noch
   * hängenden Anhänge-Vorgang brächte zwei gleichzeitige Schreibvorgänge auf
   * dieselbe Datei — genau den Zustand, den „ein Schreiber je Datei"
   * ausschließen soll, und zwar unbemerkt, weil beide demselben Prozess
   * gehören.
   */
  async lauf(): Promise<Spiegelergebnis> {
    if (this.#laeuft) {
      return {
        art: "gescheitert",
        klasse: "voruebergehend",
        meldung: "Ein Spiegelungslauf ist noch unterwegs (§8.4).",
        naechsterVersuchMs: this.naechsterVersuchMs,
      };
    }
    this.#laeuft = true;
    try {
      return await this.#durchlauf();
    } finally {
      this.#laeuft = false;
    }
  }

  async #durchlauf(): Promise<Spiegelergebnis> {
    const pfadPruefung = await this.#pruefeEinsatzordner();
    if (pfadPruefung !== undefined) return pfadPruefung;

    let uebertragen = 0;
    try {
      // Der Ereignisordner darf angelegt werden — der **Einsatz**ordner nicht
      // (§5.7). Die Prüfung oben ist genau deshalb vorgeschaltet: Sie belegt,
      // dass der Einsatzordner der erwartete ist, bevor hier irgendetwas
      // entsteht.
      await this.#optionen.dateisystem.legeVerzeichnisAn(this.#optionen.ablage.shareEreignisse);

      // §5.4.4: „Segmente aufsteigend … und ein Segment wird erst übertragen,
      // wenn das vorhergehende vollständig übertragen ist." Sonst erschiene bei
      // den Lesern ein Nachfolgesegment vor der Abschlusszeile seines
      // Vorgängers, und §8.6.2 meldete eine fehlende Kettenfortsetzung, wo
      // keine fehlt.
      for (const kennung of await this.#eigeneSegmente()) {
        const lokal = await this.#lokaleBytesBisVollstaendig(kennung);
        const ergebnis = await this.#spiegleSegment(kennung, lokal);
        if (ergebnis.art !== "uebertragen") return ergebnis;
        uebertragen += ergebnis.uebertragen;
        const stand = this.#zustand.eigen[this.#schluessel(kennung.segment)]?.shareOffset ?? 0;
        // Erst wenn dieses Segment vollstaendig uebertragen ist, darf das
        // naechste folgen (§5.4.4).
        if (stand < lokal.byteLength) break;
      }
    } catch (fehler) {
      return this.#scheitern(fehler);
    }
    this.#rueckstauStufe = 0;
    this.#ausfallSeit = undefined;
    return { art: "uebertragen", uebertragen };
  }

  /**
   * §5.7: Prüft vor jedem Lauf, ob unter dem gemerkten Pfad eine
   * `einsatz.json` mit der erwarteten Kennung liegt. Ausgeführt in
   * `einsatzordner.ts`.
   */
  async #pruefeEinsatzordner(): Promise<Spiegelergebnis | undefined> {
    const befund = await pruefeEinsatzordner(
      this.#optionen.dateisystem,
      this.#optionen.ablage,
      this.#optionen.einsatzId,
    );
    if (befund === "inOrdnung") return undefined;
    if (befund === "ordnerFort") return { art: "ordnerFort", meldung: MELDUNG_ORDNER_FORT };
    return this.#scheitern(befund.fehler);
  }

  /**
   * Der Schlüssel eines eigenen Segments in `upload-state.json`.
   *
   * §5.3 zeigt die reine Segmentnummer (`"0003"`). Das reicht nicht, sobald
   * §4.5 Schritt 2 greift: Nach einem Kennungswechsel „beginnt der Client ein
   * Segment `0000` unter dem neuen Präfix" — der Schlüssel `"0000"` wäre dann
   * schon vom alten Präfix belegt, mitsamt dessen `shareOffset`. Deshalb steht
   * hier der Dateiname ohne Endung, genau wie bei `fremd`.
   */
  #schluessel(segment: number): string {
    return `${clientPraefix(this.#optionen.clientId)}.${segmentText(segment)}`;
  }

  /**
   * Ein einzelnes eigenes Segment übertragen (§5.4.1 bis §5.4.3).
   *
   * `lokal` ist der lokale Vergleichsmaßstab: die Datei bis zur letzten
   * vollständigen, kettenrichtigen Zeile (§5.4.1). Nie weiter — daran hängt
   * die Präfix-Invariante.
   */
  async #spiegleSegment(kennung: Dateikennung, lokal: Uint8Array): Promise<Spiegelergebnis> {
    const schluessel = this.#schluessel(kennung.segment);
    const offsets: EigenerOffset = this.#zustand.eigen[schluessel] ?? neuerEigenerOffset();
    if (lokal.byteLength <= offsets.shareOffset) return { art: "uebertragen", uebertragen: 0 };

    // §5.4.2: Das wahre Ende wird durch Lesen bestimmt — ab `shareOffset` wird
    // gelesen, bis nichts mehr kommt. Nach einem Abbruch kann die Share-Datei
    // weiter sein als der gemerkte Offset.
    const sharePfad = this.#optionen.ablage.shareDatei(kennung.name);
    let shareBytes: Uint8Array;
    try {
      shareBytes = await this.#optionen.dateisystem.liesAb(sharePfad, offsets.shareOffset);
    } catch (fehler) {
      if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
        shareBytes = new Uint8Array(0);
      } else {
        throw fehler;
      }
    }

    const ausgang = vergleicheSpiegel({
      shareBytes,
      shareOffset: offsets.shareOffset,
      lokaleBytes: lokal,
      lokaleInhalte: this.#optionen.identitaeten,
    });
    return this.#behandleAusgang(ausgang, kennung, offsets, lokal, sharePfad);
  }

  async #behandleAusgang(
    ausgang: Vergleichsausgang,
    kennung: Dateikennung,
    offsets: EigenerOffset,
    lokal: Uint8Array,
    sharePfad: string,
  ): Promise<Spiegelergebnis> {
    if (ausgang.art === "B") {
      return {
        art: "beschaedigt",
        segment: kennung.segment,
        abOffset: ausgang.abOffset,
        meldung: MELDUNG_BESCHAEDIGT,
      };
    }
    if (ausgang.art === "C") {
      return {
        art: "fremdeSchreibspur",
        segment: kennung.segment,
        abOffset: ausgang.abOffset,
        id: ausgang.id,
        meldung: MELDUNG_PROFIL_KOPIERT,
      };
    }

    // Ausgang A: ab dem festgestellten Ende wird weiter angehängt, danach
    // `shareOffset` fortgeschrieben — erst nach erfolgreichem `fsync` (§5.4.2).
    const shareEnde = offsets.shareOffset + ausgang.gepruefteBytes;
    const anzuhaengen = lokal.subarray(shareEnde);
    if (anzuhaengen.byteLength === 0) {
      this.#merkeOffset(kennung.segment, shareEnde, lokal);
      return { art: "uebertragen", uebertragen: 0 };
    }
    await this.#optionen.dateisystem.haengeAnUndSynchronisiere(sharePfad, anzuhaengen);
    this.#merkeOffset(kennung.segment, lokal.byteLength, lokal);
    return { art: "uebertragen", uebertragen: anzuhaengen.byteLength };
  }

  /**
   * Schreibt `shareOffset` und die Kette an dieser Stelle fort (§5.3).
   *
   * Fortgeschrieben wird nur bis zur letzten Zeilengrenze, deren Kette geprüft
   * ist. Die Kette wird dabei aus den **lokalen** Bytes berechnet: Bis hierher
   * sind beide Seiten byteweise gleich (Ausgang A), und die lokalen Bytes
   * liegen ohnehin geprüft vor.
   *
   * Ein zu klein fortgeschriebener Offset ist unschädlich — der nächste Lauf
   * liest die Share-Bytes ab dort, findet sie gleich und fällt wieder in
   * Ausgang A. Ein zu groß fortgeschriebener wäre schädlich: Er behauptete,
   * Bytes seien übertragen, deren Kette niemand geprüft hat.
   */
  #merkeOffset(segment: number, offset: number, lokal: Uint8Array): void {
    const schluessel = this.#schluessel(segment);
    const bisher = this.#zustand.eigen[schluessel] ?? neuerEigenerOffset();
    // **Ohne Kettenpruefung, und das ist Absicht.** Die eigenen lokalen Bytes
    // sind beim Start geprueft worden (§8.1, `bereiteSchreiberVor`) und stammen
    // im laufenden Betrieb aus dem eigenen Schreibweg. Eine Pruefung braeuchte
    // den Anker dieses Segments, und der ist fuer jedes Segment ab 1 nicht 32
    // Nullen (§2.3) — mit dem falschen Anker braeche sie an Byte 0 ab, der
    // Offset bliebe fuer immer auf 0 stehen, und Bedingung 1 der Ruhephase
    // (§7.6) waere nie mehr erfuellbar.
    const { endeOffset, letzteKette } = grenzeUndKette(
      lokal.subarray(bisher.shareOffset, offset),
      bisher.shareOffset,
      bisher.letzteKette,
    );
    this.#zustand = {
      ...this.#zustand,
      eigen: {
        ...this.#zustand.eigen,
        [schluessel]: { ...bisher, shareOffset: endeOffset, letzteKette },
      },
    };
  }

  /**
   * Die lokalen Bytes bis zum `lokalerVollstaendigerOffset` (§5.4.1).
   *
   * Für das laufende Segment kommt der Offset vom Schreiber; für ältere
   * Segmente ergibt er sich aus dem geprüften Lesen — beides ohne
   * Größenabfrage.
   */
  async #lokaleBytesBisVollstaendig(kennung: Dateikennung): Promise<Uint8Array> {
    const bytes = await this.#optionen.dateisystem.liesAb(
      this.#optionen.ablage.lokalDatei(kennung.name),
      0,
    );
    const laufend = this.#optionen.vollstaendigerOffset();
    if (laufend.segment === kennung.segment) return bytes.subarray(0, laufend.offset);
    // Aeltere Segmente sind abgeschlossen; gesucht ist allein die letzte
    // Zeilengrenze. Die Kette wird hier **nicht** geprueft: Ihr Anker ist fuer
    // jedes Segment ab 1 nicht 32 Nullen (§2.3), und mit dem falschen Anker
    // braeche die Pruefung an Byte 0 ab. Das Ergebnis waere eine leer wirkende
    // Datei — das Segment wuerde nie uebertragen, waehrend der Lauf
    // „uebertragen" meldete.
    return bytes.subarray(0, grenzeUndKette(bytes).endeOffset);
  }

  /** Die eigenen lokalen Segmentdateien, aufsteigend (§5.4.4). */
  async #eigeneSegmente(): Promise<readonly Dateikennung[]> {
    const praefix = clientPraefix(this.#optionen.clientId);
    const namen = await this.#optionen.dateisystem.listeVerzeichnis(
      this.#optionen.ablage.lokalEreignisse,
    );
    return namen
      .flatMap((name) => {
        const kennung = zerlegeEreignisDateiname(name);
        return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
      })
      .sort((a, b) => a.segment - b.segment);
  }

  /** §8.9: vorübergehende und dauerhafte Fehler werden verschieden behandelt. */
  #scheitern(fehler: unknown): Spiegelergebnis {
    const klasse = shareklasse(fehler);
    this.#ausfallSeit ??= this.#optionen.zeit();
    if (klasse === "ordnerFort") {
      return { art: "ordnerFort", meldung: MELDUNG_ORDNER_FORT };
    }
    if (klasse === "dauerhaft") {
      // „Der Rückstau geht sofort auf den langsamsten Takt (30 s), und die
      // Statuszeile trennt den Zustand von der Erreichbarkeit."
      this.#rueckstauStufe = RUECKSTAU_STAFFEL_MS.length - 1;
      return {
        art: "gescheitert",
        klasse,
        meldung: MELDUNG_KEIN_SCHREIBRECHT,
        naechsterVersuchMs: this.naechsterVersuchMs,
      };
    }
    // Der erste Fehlversuch wartet die erste Stufe ab (2 s), nicht die zweite;
    // die Staffel waechst danach.
    const wartezeit = this.naechsterVersuchMs;
    this.#rueckstauStufe = Math.min(this.#rueckstauStufe + 1, RUECKSTAU_STAFFEL_MS.length - 1);
    return {
      art: "gescheitert",
      klasse,
      meldung: MELDUNG_NICHT_ERREICHBAR,
      naechsterVersuchMs: wartezeit,
    };
  }
}
