/**
 * Der Schreiber — KONZEPT-SPEICHER.md §5.2 (Schreibweg), §4.2 und §4.3
 * (Segmentwechsel), §4.6 (Ersatzsegment), §4.5 (Kennungswechsel) und §8.8
 * (lokale Schreibstörung).
 *
 * Tragender Satz ist §1.3 Nr. 2: **zuerst lokal, dann auf den Share.** Erst
 * Schritt 2 des Schreibwegs macht ein Ereignis wirklich; die Spiegelung
 * (§5.4) darf beliebig lange dauern oder scheitern.
 *
 * Genau **ein** `fsync` je Ereignis (§5.2): der des lokalen Anhangs.
 * `schreiber.json` wird zweimal fortgeschrieben — vor der Zeile wegen der
 * Laufnummer (§3.3) und danach wegen Offset und Kette —, beide Male ohne
 * `fsync`, weil die Datei nach §4.4 rekonstruierbar ist.
 */

import { naechsteLaufnummer, type Akteur, type HlcUhr } from "@s1/domaene";

import {
  type Ereignisentwurf,
  type GeschriebeneZeile,
  type Schreibergebnis,
} from "./schreibergebnis.js";

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { lokalDauerhafterHinweis, lokalWiederholbar, lokaleSchreibstoerungMeldung } from "./fehler.js";
import type { Identitaetenbuch } from "./identitaeten.js";
import {
  clientPraefix,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
import { kettenanker, type Segmentquelle } from "./kettenanker.js";
import { kettenPruefsumme, KETTE_ANFANG } from "./pruefsummen.js";
import { bereiteSchreiberVor, type Schreiberbestand } from "./schreiberStart.js";
import { schreibeSchreiberzustand, type Schreiberzustand } from "./schreiberzustand.js";
import { liesSegment } from "./segmentlese.js";
import { LOKALE_WIEDERHOLUNG_MS, SEGMENTGROESSE_BYTE } from "./startwerte.js";
import { TYP_SEGMENT_ABGESCHLOSSEN, TYP_SEGMENT_ERSETZT } from "./verwaltungsereignisse.js";
import { zieheHlc } from "./hlcZiehen.js";
import { baueRahmen } from "./rahmenbau.js";
import { baueZeile, type GeleseneZeile, type Rahmenblick } from "./zeile.js";
import { wanduhrText, type Zeitquelle } from "./zeit.js";

export interface SchreiberOptionen {
  readonly dateisystem: Dateisystem;
  readonly zeit: Zeitquelle;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
  readonly akteur: Akteur;
  readonly uhr: HlcUhr;
  /** Startwert 4 MiB (§4.2, §10); überschreibbar für Tests und für die Kalibrierung in M0.5. */
  readonly segmentgroesse?: number;
  /** §8.8: Warten vor dem einen Wiederholversuch. Injizierbar, damit Tests keine Viertelsekunde stehen. */
  readonly warte?: (ms: number) => Promise<void>;
}

const schlafe = (ms: number): Promise<void> =>
  new Promise((fertig) => {
    setTimeout(fertig, ms);
  });

/**
 * Öffnet den Schreiber eines Einsatzes.
 *
 * Der Ausgangszustand kommt aus {@link bereiteSchreiberVor} — also aus dem
 * lokalen Dateibestand, nicht aus `schreiber.json` (§4.3).
 */
export async function oeffneSchreiber(optionen: SchreiberOptionen): Promise<Schreiber> {
  const bestand = await bereiteSchreiberVor({
    dateisystem: optionen.dateisystem,
    ablage: optionen.ablage,
    clientId: optionen.clientId,
  });
  const schreiber = new Schreiber(optionen, bestand);
  // §4.3: „`schreiber.json` wird nur als Beschleuniger gelesen und bei
  // Abweichung überschrieben." Der Start schreibt sie deshalb immer einmal
  // fort — ohne `fsync`.
  await schreiber.speichereZustand();
  return schreiber;
}

export type {
  Ereignisentwurf,
  GeschriebeneZeile,
  Schreibergebnis,
} from "./schreibergebnis.js";

export class Schreiber {
  readonly #dateisystem: Dateisystem;
  readonly #zeit: Zeitquelle;
  readonly #ablage: Einsatzablage;
  readonly #akteur: Akteur;
  readonly #uhr: HlcUhr;
  readonly #segmentgroesse: number;
  readonly #warte: (ms: number) => Promise<void>;
  readonly #identitaeten: Identitaetenbuch;
  readonly #bestand: Schreiberbestand;
  #zustand: Schreiberzustand;
  /**
   * Pfad der Datei, hinter deren bekanntem guten Stand Bytes stehen können, die
   * zu keiner vollständigen Zeile gehören (§8.1, §5.4.1) — `undefined`, wenn
   * keine Reparatur aussteht.
   *
   * **Der Pfad, nicht ein Ja/Nein.** Ein Merker ohne Datei wurde von der
   * nächsten Schreibbewegung quittiert, auch wenn die auf eine **andere** Datei
   * ging: Ein Ersatzsegment (§4.6) oder ein Kennungswechsel (§4.5) legt eine
   * neue Datei an, dort greift die Kürzung ins Leere, der Merker fiele — und
   * das Bruchstück in der alten Datei bliebe für immer stehen, in einer Datei,
   * die nach §4.6 Schritt 5 nie wieder beschrieben wird. Befund aus der
   * Simulation M0.4.
   */
  #reparaturNoetigFuer: string | undefined = undefined;

  constructor(optionen: SchreiberOptionen, bestand: Schreiberbestand) {
    this.#dateisystem = optionen.dateisystem;
    this.#zeit = optionen.zeit;
    this.#ablage = optionen.ablage;
    this.#akteur = optionen.akteur;
    this.#uhr = optionen.uhr;
    this.#segmentgroesse = optionen.segmentgroesse ?? SEGMENTGROESSE_BYTE;
    this.#warte = optionen.warte ?? schlafe;
    this.#identitaeten = bestand.identitaeten;
    this.#bestand = bestand;
    this.#zustand = bestand.zustand;
  }

  /** Der aktuelle Schreiberzustand (§4.4). */
  get zustand(): Schreiberzustand {
    return this.#zustand;
  }

  /** Die eigene Kennung; sie kann sich durch §4.5 ändern. */
  get clientId(): string {
    return this.#zustand.clientId;
  }

  /** Das laufende eigene Segment (§4.2). */
  get segment(): number {
    return this.#zustand.segment;
  }

  /**
   * Der `lokalerVollstaendigerOffset` des laufenden Segments (§5.4.1) — das
   * Byte hinter dem `\n` der letzten lokal vollständigen, kettenrichtigen
   * Zeile. Die Spiegelung überträgt höchstens bis dorthin.
   */
  get lokalerVollstaendigerOffset(): number {
    return this.#zustand.lokalerOffset;
  }

  /** Die gesehenen Identitäten aus dem lokalen Spiegel (§5.3). */
  get identitaeten(): Identitaetenbuch {
    return this.#identitaeten;
  }

  /** Was der Start ergeben hat — Kürzung nach §8.1, Rekonstruktion nach §4.4. */
  get startbefund(): Schreiberbestand {
    return this.#bestand;
  }

  /**
   * Schreibt `schreiber.json` fort — ohne `fsync` (§5.2).
   *
   * `false` heißt: Der Beschleuniger konnte nicht fortgeschrieben werden. Das
   * ist nach §4.4 folgenlos — das laufende Segment kommt aus dem Dateibestand
   * (§4.3), die Laufnummer aus dem Maximum von Datei und Dateibestand (§3.3) —,
   * und es reißt deshalb den Bedienschritt nicht ab. Wer es gleichwohl anzeigen
   * will, bekommt hier die Auskunft.
   */
  async speichereZustand(): Promise<boolean> {
    return schreibeSchreiberzustand(this.#dateisystem, this.#ablage.schreiberDatei, this.#zustand);
  }

  /**
   * Der Schreibweg nach §5.2.
   *
   * 1. Ereignis erzeugen, HLC ziehen, Laufnummer erhöhen und dauerhaft machen.
   * 2. Zeile an die lokale eigene Segmentdatei anhängen, `fsync`.
   * 3. `schreiber.json` fortschreiben.
   * 4. Der Zustand ist ab hier gültig.
   *
   * Schritt 5 — die Spiegelung — steht in `spiegelung.ts` und läuft asynchron.
   */
  async schreibe(entwurf: Ereignisentwurf): Promise<Schreibergebnis> {
    const wechsel = await this.#segmentwechselWennNoetig();
    if (wechsel !== undefined) return wechsel;
    return this.#schreibeZeile(entwurf);
  }

  /**
   * Segmentwechsel nach Größe (§4.2), in der verbindlichen Reihenfolge aus
   * §4.3: (1) Abschlusszeile anhängen, (2) `fsync`, (3) `schreiber.json` auf
   * das neue Segment fortschreiben, (4) erste Zeile des neuen Segments.
   *
   * Ein Programmstart, ein Tageswechsel oder ein Verbindungsabbruch beginnt
   * **kein** neues Segment (§4.2). Und das Beginnen hängt allein an der
   * Größenschwelle, niemals am Übertragungsstand (§5.4.4) — sonst wüchse ein
   * Segment während eines längeren NAS-Ausfalls unbegrenzt, und die Schwelle
   * wäre wirkungslos, gerade wenn sie gebraucht wird.
   *
   * @returns ein Fehlerergebnis, wenn schon die Abschlusszeile scheitert; sonst `undefined`.
   */
  async #segmentwechselWennNoetig(): Promise<Schreibergebnis | undefined> {
    if (this.#zustand.lokalerOffset < this.#segmentgroesse) return undefined;
    const nachfolger = this.#zustand.segment + 1;
    // Schritte 1 und 2.
    const ergebnis = await this.#schreibeZeile({
      typ: TYP_SEGMENT_ABGESCHLOSSEN,
      nutzlast: { nachfolger },
    });
    if (ergebnis.art !== "geschrieben") return ergebnis;
    // Schritt 3. Danach ist das laufende Segment der Nachfolger; er entsteht
    // erst mit Schritt 4, also mit der nächsten Zeile.
    this.#zustand = {
      ...this.#zustand,
      segment: nachfolger,
      lokalerOffset: 0,
      letzteKette: ergebnis.zeile.kette,
    };
    await this.speichereZustand();
    return undefined;
  }

  /** Eine einzelne Zeile in das laufende Segment, ohne Prüfung auf Segmentwechsel. */
  async #schreibeZeile(entwurf: Ereignisentwurf): Promise<Schreibergebnis> {
    const gezogen = zieheHlc(this.#uhr, this.#zeit);
    if (gezogen.art === "uhrSteht") return gezogen;

    // §3.3: Die Laufnummer wird **vor** dem Schreiben der Zeile erhöht und
    // dauerhaft gemacht. Eine Lücke ist erlaubt, ein Rückschritt oder eine
    // Doppelvergabe ist ein Fehler.
    const laufnummer = naechsteLaufnummer(
      this.#zustand.laufnummer === 0 ? undefined : this.#zustand.laufnummer,
    );
    this.#zustand = { ...this.#zustand, laufnummer };
    await this.speichereZustand();

    const rahmen = baueRahmen(entwurf, {
      clientId: this.#zustand.clientId,
      laufnummer,
      hlc: gezogen.hlc,
      vorgaenger: this.#zustand.letzteKette,
      akteur: this.#akteur,
      wanduhr: wanduhrText(this.#zeit()),
    });
    const bytes = baueZeile(rahmen);
    const pfad = this.#ablage.lokalSegment(this.#zustand.clientId, this.#zustand.segment);
    const offset = this.#zustand.lokalerOffset;

    const angehaengt = await this.#haengeAn(pfad, bytes);
    if (angehaengt !== undefined) return angehaengt;

    const kette = kettenPruefsumme(bytes);
    this.#zustand = { ...this.#zustand, lokalerOffset: offset + bytes.byteLength, letzteKette: kette };
    await this.speichereZustand();

    const zeile: GeschriebeneZeile = { segment: this.#zustand.segment, offset, bytes, rahmen, kette };
    this.#identitaeten.merke({
      offset,
      laenge: bytes.byteLength,
      bytes,
      rahmen,
      kette,
      wiederholung: false,
    });
    return gezogen.meldung === undefined
      ? { art: "geschrieben", zeile }
      : { art: "geschrieben", zeile, meldung: gezogen.meldung };
  }

  /**
   * Der lokale Anhang mit `fsync` und der Behandlung aus §8.8.
   *
   * `EBUSY` und `EACCES` werden **einmal** nach 250 ms wiederholt. Danach —
   * und bei jedem anderen Code sofort — wird der Bedienschritt sichtbar
   * abgewiesen. Die bereits erhöhte Laufnummer bleibt vergeben (§8.8 Punkt 2):
   * ein Rückschritt wäre der gefährlichere Fehler.
   *
   * **Ein gescheiterter Anhang kann Bytes hinterlassen haben.** Ein `write`
   * kann teilweise durchgehen und dann scheitern — §5.4.1 nennt genau das für
   * den Share („Was dort ankommt, ist ein Präfix dessen, was gesendet wurde"),
   * und lokal ist es derselbe Vorgang wie der Kill mitten im Append aus §8.1.
   * Ohne Behandlung stünde danach ein Bruchstück in der Datei, die nächste
   * Zeile würde dahinter geschrieben, und ab dieser Stelle wäre die eigene
   * Datei **dauerhaft** nicht mehr auswertbar: Das Längenfeld des Bruchstücks
   * kündigt Bytes an, an deren Ende kein `\n` steht — Regel 3 aus §8.2, also
   * defekt. `lokalerVollstaendigerOffset` bliebe stehen, die Spiegelung
   * überträge nichts mehr, und jeder Leser fiele an derselben Stelle in
   * Quarantäne, während der Arbeitsplatz munter weiterschriebe. Genau der
   * stille Falschzustand, den §6.3 ausschließt. Befund aus der Simulation M0.4.
   *
   * Behandelt wird er mit der Regel, die §8.1 ohnehin vorgibt — Kürzen auf die
   * letzte vollständige Zeile —, nur zum selben Auslöser statt erst beim
   * nächsten Start. Gekürzt wird auf {@link Schreiberzustand.lokalerOffset},
   * den Stand **vor** dieser Zeile. Das kann nie ein bereits gespiegeltes Byte
   * entfernen: §5.4.1 überträgt höchstens bis genau dorthin.
   */
  async #haengeAn(pfad: string, bytes: Uint8Array): Promise<Schreibergebnis | undefined> {
    const stand = this.#zustand.lokalerOffset;
    // Eine Reparatur, die beim letzten Mal selbst gescheitert ist, wird zuerst
    // nachgeholt — aber nur an **derselben** Datei. Ohne das schriebe der
    // nächste Bedienschritt hinter das Bruchstück und machte es endgültig.
    if (this.#reparaturNoetigFuer === pfad) {
      const repariert = await this.#kuerzeAufStand(pfad, stand);
      if (repariert !== undefined) return repariert;
    }
    for (let versuch = 0; versuch < 2; versuch += 1) {
      try {
        await this.#dateisystem.haengeAnUndSynchronisiere(pfad, bytes);
        if (this.#reparaturNoetigFuer === pfad) this.#reparaturNoetigFuer = undefined;
        return undefined;
      } catch (fehler) {
        if (versuch === 0 && lokalWiederholbar(fehler)) {
          // Vor dem zweiten Versuch dasselbe Kürzen: Auch der erste Versuch
          // kann Bytes hinterlassen haben, und ein zweites `haengeAn` dahinter
          // erzeugte dieselbe unauswertbare Stelle.
          this.#reparaturNoetigFuer = pfad;
          await this.#warte(LOKALE_WIEDERHOLUNG_MS);
          const repariert = await this.#kuerzeAufStand(pfad, stand);
          if (repariert !== undefined) return repariert;
          continue;
        }
        this.#reparaturNoetigFuer = pfad;
        const code = fehler instanceof Error && "code" in fehler ? String(fehler.code) : undefined;
        const basis = {
          art: "abgewiesen",
          meldung: lokaleSchreibstoerungMeldung(fehler),
          dauerhafterHinweis: lokalDauerhafterHinweis(fehler),
        } as const;
        const abgewiesen = code === undefined ? basis : { ...basis, code };
        // Das Kürzen darf selbst scheitern; dann bleibt die Reparatur offen
        // und wird vor dem nächsten Anhang nachgeholt. Abgewiesen wird der
        // Bedienschritt so oder so (§8.8 Punkt 1).
        await this.#kuerzeAufStand(pfad, stand);
        return abgewiesen;
      }
    }
    return undefined;
  }

  /**
   * Kürzt die eigene laufende Datei auf den bekannten guten Stand (§8.1).
   *
   * Liefert ein abweisendes Ergebnis, wenn auch das Kürzen scheitert — dann
   * darf nicht weitergeschrieben werden, denn die nächste Zeile käme hinter
   * das Bruchstück zu stehen.
   */
  async #kuerzeAufStand(pfad: string, stand: number): Promise<Schreibergebnis | undefined> {
    try {
      await this.#dateisystem.kuerzeAuf(pfad, stand);
      if (this.#reparaturNoetigFuer === pfad) this.#reparaturNoetigFuer = undefined;
      return undefined;
    } catch (fehler) {
      // `ENOENT` heißt: Die Datei gibt es noch gar nicht, also auch kein
      // Bruchstück. Das ist der Normalfall beim ersten Anhang an ein neues
      // Segment (§4.2) und beim Ersatzsegment (§4.6). Es als Fehler zu werten
      // hieße, den Bedienschritt dauerhaft abzuweisen: Die Reparatur bliebe
      // offen, und jeder weitere Anhang scheiterte an derselben Stelle.
      if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") {
        if (this.#reparaturNoetigFuer === pfad) this.#reparaturNoetigFuer = undefined;
        return undefined;
      }
      this.#reparaturNoetigFuer = pfad;
      const code = fehler instanceof Error && "code" in fehler ? String(fehler.code) : undefined;
      const basis = {
        art: "abgewiesen",
        meldung: lokaleSchreibstoerungMeldung(fehler),
        dauerhafterHinweis: lokalDauerhafterHinweis(fehler),
      } as const;
      return code === undefined ? basis : { ...basis, code };
    }
  }

  /**
   * Ersatzsegment nach einer Beschädigung auf dem Share (§4.6).
   *
   * Repariert wird durch **Anhängen an anderer Stelle**: Ein Read-Modify-Write
   * auf dem Share ist nach §1.3 und §2.2 ausgeschlossen, und „ein Schreiber je
   * Datei" bleibt unangetastet, weil ausschließlich in eine eigene, neu
   * angelegte Datei geschrieben wird.
   *
   * Die lokale Seite wird mitgezogen (§4.6, „Die lokale Seite"): Ohne sie
   * stünden im Ersatzsegment auf dem Share Bytes, die es lokal nicht gibt, und
   * §4.5 Schritt 4 meldete beim nächsten Öffnen, das Profil sei kopiert worden
   * — derselbe Falschalarm, den §5.4.1 gerade ausschließt.
   *
   * @param ersetztesSegment Das Segment, dessen Share-Bytes beschädigt sind.
   * @param abOffset         Offset der ersten abweichenden Zeile.
   */
  async schreibeErsatzsegment(ersetztesSegment: number, abOffset: number): Promise<Schreibergebnis> {
    const quelle = await this.#liesEigenesSegment(ersetztesSegment);
    if (quelle === undefined) {
      // Ohne bestimmbaren Anker ist nicht feststellbar, welche Zeilen zu
      // wiederholen sind. Ein Ersatzsegment ins Blaue zu schreiben wäre
      // schlimmer als keines: Es sähe wie eine Reparatur aus und wäre keine
      // (§6.3, §4.6 Schritt 4).
      return {
        art: "abgewiesen",
        meldung:
          "Ein Teil der bereits übertragenen Einträge dieses Arbeitsplatzes ist auf dem Server " +
          "beschädigt. Die Reparatur konnte nicht vorbereitet werden.",
        dauerhafterHinweis: false,
      };
    }
    const bisStelle = quelle.zeilen.filter((z) => z.offset + z.laenge <= abOffset);
    // §4.3: Eine Abschlusszeile des ersetzten Segments gehört nicht in das
    // Ersatzsegment. Sie sagt „dieses Segment ist fertig, es geht bei N
    // weiter" — im Ersatzsegment, in das gleich weitergeschrieben wird, wäre
    // das eine falsche Aussage, und ein Leser hielte das Ersatzsegment sofort
    // für abgeschlossen.
    const abStelle = quelle.zeilen.filter(
      (z) => z.offset >= abOffset && z.rahmen.typ !== TYP_SEGMENT_ABGESCHLOSSEN,
    );

    // §4.6 Schritt 3: `vorgaenger` ist die Kettenprüfsumme der letzten
    // **unbeschädigten** Zeile des ersetzten Segments — bewusst nicht dessen
    // letzter Zeile. Die Kette schließt an der Stelle an, ab der repariert wird.
    const anschluss = bisStelle.at(-1)?.kette ?? quelle.startkette;
    // **Der Offset in der Nutzlast ist eine lokale Zeilengrenze.**
    //
    // `abOffset` kommt aus dem Vergleich mit dem Share (§5.4.3) und ist dort
    // eine Zeilengrenze — aber nicht notwendig auch lokal: Liegt die Abweichung
    // hinter allen auswertbaren Share-Zeilen, ist es das Parse-Ende der
    // Share-Datei, und das fällt mitten in eine lokale Zeile, sobald auf dem
    // Share ein Bruchstück steht (§5.4.1, Teilschreiben).
    //
    // §4.6 Schritt 3 verlangt als Anker „die Kettenprüfsumme der letzten
    // unbeschädigten Zeile des ersetzten Segments", und `kettenanker` sucht
    // beim nächsten Öffnen genau die Zeile, die bei diesem Offset **endet**.
    // Findet er sie nicht, gilt der Anker als unbestimmbar, und
    // `bereiteSchreiberVor` bricht mit `LokalerKettenbruch` ab — der Client
    // kommt an seine eigene Akte nie wieder heran. Deshalb steht in der
    // Nutzlast die Grenze, an der der Ersatz **tatsächlich** ansetzt: das Ende
    // der letzten mitgenommenen lokalen Zeile. Sie ist dieselbe Stelle, deren
    // Kette `anschluss` trägt. Befund aus der Simulation M0.4.
    const abGrenze = bisStelle.at(-1) === undefined ? 0 : (bisStelle.at(-1) as GeleseneZeile).offset + (bisStelle.at(-1) as GeleseneZeile).laenge;

    const ersatz = await this.#naechstesFreiesSegment();
    const vorherigerZustand = this.#zustand;
    this.#zustand = { ...this.#zustand, segment: ersatz, lokalerOffset: 0, letzteKette: anschluss };
    await this.speichereZustand();

    // Schritt 2: erste Zeile ist `SegmentErsetzt`.
    const kopf = await this.#schreibeZeile({
      typ: TYP_SEGMENT_ERSETZT,
      nutzlast: { ersetztesSegment, abOffset: abGrenze },
    });
    if (kopf.art !== "geschrieben") {
      // **Der halb vollzogene Wechsel wird zurückgenommen.**
      //
      // Scheitert die Kopfzeile (§8.8), stünde der Schreiber sonst auf einem
      // leeren Segment `ersatz` mit der Kette aus §4.6 Schritt 3 im Rücken. Die
      // nächste gewöhnliche Zeile ginge dann als **erste** Zeile dieses
      // Segments hinaus — ohne `SegmentErsetzt` davor. Damit ist es für
      // `kettenanker` kein Ersatzsegment mehr, sondern ein gewöhnliches
      // Folgesegment, dessen Anker die letzte Zeile des Vorgängers wäre — und
      // die trägt eine andere Kette. Beim nächsten Start bricht
      // `bereiteSchreiberVor` mit `LokalerKettenbruch` an Byte 0 ab, und der
      // Client kommt an seine eigene Akte nie wieder heran (§8, Grundsatz;
      // §8.8 Punkt 5). Befund aus der Simulation M0.4.
      //
      // Zurückgenommen wird nur der **Zustand**; geschrieben wurde nichts.
      // Die Reparatur wird beim nächsten Öffnen erneut versucht (§4.6.1
      // Auslöser 1) — sie ist wiederholbar, weil das Ersatzsegment erst mit
      // seiner ersten Zeile entsteht.
      this.#zustand = vorherigerZustand;
      await this.speichereZustand();
      return kopf;
    }

    // Schritt 4: dieselben Ereignisse noch einmal — mit **unveränderten**
    // Identitäten, unveränderter HLC und unveränderter Nutzlast. Es sind
    // dieselben Ereignisse, nicht neue; der Fold ist eine Mengenfunktion über
    // die Identitäten (Auflage 4), für ihn ist die Wiederholung folgenlos.
    let letzte = kopf.zeile;
    for (const zeile of abStelle) {
      const wiederholt = { ...zeile.rahmen, vorgaenger: this.#zustand.letzteKette } as Rahmenblick;
      const bytes = baueZeile(wiederholt);
      const pfad = this.#ablage.lokalSegment(this.#zustand.clientId, ersatz);
      const offset = this.#zustand.lokalerOffset;
      const fehler = await this.#haengeAn(pfad, bytes);
      if (fehler !== undefined) return fehler;
      const kette = kettenPruefsumme(bytes);
      this.#zustand = { ...this.#zustand, lokalerOffset: offset + bytes.byteLength, letzteKette: kette };
      await this.speichereZustand();
      letzte = { segment: ersatz, offset, bytes, rahmen: wiederholt, kette };
    }
    return { art: "geschrieben", zeile: letzte };
  }

  /**
   * Kennungswechsel nach §4.5, Reaktion.
   *
   * Der Client schreibt nicht weiter unter der alten Kennung. Die noch nicht
   * gespiegelten lokalen Ereignisse **behalten ihre Identität**
   * `<alteClientId>:<laufnummer>` und werden unverändert in die neue Datei
   * geschrieben (Schritt 3): Neue Identitäten zu vergeben hieße, dasselbe
   * Ereignis zweimal in die Menge zu geben, und der Fold könnte sie nicht mehr
   * zusammenführen — doppelte Einträge im Einsatztagebuch wären die Folge.
   *
   * Die Laufnummer läuft fort (Schritt 4); eine Kollision mit den mitgenommenen
   * Identitäten ist ausgeschlossen, weil der Präfixteil verschieden ist.
   */
  async kennungswechsel(
    neueClientId: string,
    ungespiegelte: readonly GeleseneZeile[],
  ): Promise<Schreibergebnis | undefined> {
    const frühere = [...(this.#zustand.frühereClientIds ?? []), this.#zustand.clientId];
    this.#zustand = {
      ...this.#zustand,
      clientId: neueClientId,
      frühereClientIds: frühere,
      // Schritt 2: ein Segment `0000` unter dem neuen Präfix.
      segment: 0,
      lokalerOffset: 0,
      letzteKette: KETTE_ANFANG,
    };
    await this.speichereZustand();

    for (const zeile of ungespiegelte) {
      const uebernommen = { ...zeile.rahmen, vorgaenger: this.#zustand.letzteKette } as Rahmenblick;
      const bytes = baueZeile(uebernommen);
      const pfad = this.#ablage.lokalSegment(neueClientId, 0);
      const offset = this.#zustand.lokalerOffset;
      const fehler = await this.#haengeAn(pfad, bytes);
      if (fehler !== undefined) return fehler;
      this.#zustand = {
        ...this.#zustand,
        lokalerOffset: offset + bytes.byteLength,
        letzteKette: kettenPruefsumme(bytes),
      };
      await this.speichereZustand();
    }
    return undefined;
  }

  /**
   * Liest ein eigenes lokales Segment vollständig und liefert dazu die Kette an
   * seinem Anfang.
   *
   * Die Kette läuft über den Segmentwechsel hinweg durch (§2.3, §4.3); deshalb
   * müssen die Vorgängersegmente in aufsteigender Reihenfolge mitgelesen
   * werden, statt bei 32 Nullen anzusetzen.
   */
  async #liesEigenesSegment(
    segment: number,
  ): Promise<{ zeilen: readonly GeleseneZeile[]; startkette: string } | undefined> {
    // **Der Anker kommt aus `kettenanker`, nicht aus einer mitgeschleiften
    // Variablen.** §2.3 kennt drei Fälle, und der dritte ist genau der, der
    // hier vorkommt: Die erste Zeile eines **Ersatzsegments** setzt auf der
    // letzten unbeschädigten Zeile des ersetzten Segments auf — „bewusst nicht
    // dessen letzte Zeile". Wer die Kette stattdessen von Segment zu Segment
    // durchreicht, hält jedes Ersatzsegment für kettenfalsch, findet keine
    // einzige Zeile und schreibt bei der **zweiten** Reparatur ein
    // Ersatzsegment, das nur seine eigene Kopfzeile enthält: §4.6 Schritt 4
    // („schreibt alle Ereignisse ab dieser Stelle noch einmal") wäre verletzt,
    // die Ereignisse erreichten keinen Leser mehr, und der Bediener läse
    // trotzdem „er wird neu geschrieben". `schreiberStart.ts` warnt im
    // Kommentar wörtlich vor diesem Fehler und macht es richtig; hier stand er.
    // Befund des zweiten Gutachtens zu M0.4.
    const bytesJeSegment = new Map<number, Uint8Array>();
    for (const kennung of await this.#eigeneSegmente()) {
      bytesJeSegment.set(
        kennung.segment,
        await this.#dateisystem.liesAb(this.#ablage.lokalDatei(kennung.name), 0),
      );
    }
    const quelle: Segmentquelle = async (s) => bytesJeSegment.get(s);
    const eigene = bytesJeSegment.get(segment) ?? new Uint8Array(0);
    // `true`: Die Quelle sind die **eigenen** lokalen Segmente, und die sind
    // vollständig — anders als der Spiegel eines Lesers (§5.5).
    const kette = await kettenanker(segment, eigene, quelle, true);
    if (kette === undefined) return undefined;
    const befund = await liesSegment(
      this.#dateisystem,
      this.#ablage.lokalSegment(this.#zustand.clientId, segment),
      0,
      kette,
    );
    return { zeilen: befund.zeilen, startkette: kette };
  }

  async #eigeneSegmente(): Promise<readonly Dateikennung[]> {
    const praefix = clientPraefix(this.#zustand.clientId);
    const namen = await this.#dateisystem.listeVerzeichnis(this.#ablage.lokalEreignisse);
    return namen
      .flatMap((name) => {
        const kennung = zerlegeEreignisDateiname(name);
        return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
      })
      .sort((a, b) => a.segment - b.segment);
  }

  /** Die nächste freie eigene Segmentnummer, aus dem Dateibestand (§4.3, §4.6 Schritt 1). */
  async #naechstesFreiesSegment(): Promise<number> {
    const hoechste = (await this.#eigeneSegmente()).at(-1)?.segment ?? this.#zustand.segment;
    return Math.max(hoechste, this.#zustand.segment) + 1;
  }
}
