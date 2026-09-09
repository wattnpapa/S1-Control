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

import type { Dateisystem } from "./dateisystem.js";
import { lokalDauerhafterHinweis, lokalWiederholbar, lokaleSchreibstoerungMeldung } from "./fehler.js";
import type { Identitaetenbuch } from "./identitaeten.js";
import {
  clientPraefix,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
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

  /** Schreibt `schreiber.json` fort — ohne `fsync` (§5.2). */
  async speichereZustand(): Promise<void> {
    await schreibeSchreiberzustand(this.#dateisystem, this.#ablage.schreiberDatei, this.#zustand);
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
   */
  async #haengeAn(pfad: string, bytes: Uint8Array): Promise<Schreibergebnis | undefined> {
    for (let versuch = 0; versuch < 2; versuch += 1) {
      try {
        await this.#dateisystem.haengeAnUndSynchronisiere(pfad, bytes);
        return undefined;
      } catch (fehler) {
        if (versuch === 0 && lokalWiederholbar(fehler)) {
          await this.#warte(LOKALE_WIEDERHOLUNG_MS);
          continue;
        }
        const code = fehler instanceof Error && "code" in fehler ? String(fehler.code) : undefined;
        const basis = {
          art: "abgewiesen",
          meldung: lokaleSchreibstoerungMeldung(fehler),
          dauerhafterHinweis: lokalDauerhafterHinweis(fehler),
        } as const;
        return code === undefined ? basis : { ...basis, code };
      }
    }
    return undefined;
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

    const ersatz = await this.#naechstesFreiesSegment();
    this.#zustand = { ...this.#zustand, segment: ersatz, lokalerOffset: 0, letzteKette: anschluss };
    await this.speichereZustand();

    // Schritt 2: erste Zeile ist `SegmentErsetzt`.
    const kopf = await this.#schreibeZeile({
      typ: TYP_SEGMENT_ERSETZT,
      nutzlast: { ersetztesSegment, abOffset },
    });
    if (kopf.art !== "geschrieben") return kopf;

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
  ): Promise<{ zeilen: readonly GeleseneZeile[]; startkette: string }> {
    let kette = KETTE_ANFANG;
    for (const kennung of await this.#eigeneSegmente()) {
      if (kennung.segment >= segment) break;
      const vorher = await liesSegment(
        this.#dateisystem,
        this.#ablage.lokalDatei(kennung.name),
        0,
        kette,
      );
      kette = vorher.letzteKette;
    }
    const befund = await liesSegment(
      this.#dateisystem,
      this.#ablage.lokalSegment(this.#zustand.clientId, segment),
      0,
      kette,
    );
    return { zeilen: befund.zeilen, startkette: kette };
  }

  /**
   * Die eigenen lokalen Segmentdateien, aufsteigend — **frisch aufgelistet**.
   *
   * Der Bestand aus dem Start (§4.3) veraltet, sobald ein Segmentwechsel oder
   * ein Ersatzsegment eine Datei hinzugefügt hat. Eine veraltete Liste
   * vergäbe in §4.6 Schritt 1 eine Nummer, die schon belegt ist — und ein
   * zweiter Schreiber derselben Datei ist genau das, was „ein Schreiber je
   * Datei" ausschließen soll.
   */
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
