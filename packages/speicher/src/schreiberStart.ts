/**
 * Der Start des Schreibers — KONZEPT-SPEICHER.md §4.3 („Woraus der Schreiber
 * beim Start sein laufendes Segment bestimmt"), §4.4 (Rekonstruktion) und
 * §8.1 („Für den Schreiber").
 *
 * Die tragende Festlegung steht in §4.3: **Das laufende Segment bestimmt der
 * Schreiber aus dem lokalen Dateibestand, nicht aus `schreiber.json`.**
 * Maßgeblich ist die höchste vorhandene eigene Segmentnummer; trägt deren
 * Datei eine Abschlusszeile als letzte Zeile, ist das laufende Segment das
 * angekündigte Nachfolgesegment. `schreiber.json` wird nur als Beschleuniger
 * gelesen und bei Abweichung überschrieben.
 *
 * Damit ist der Fall unabhängig davon eindeutig, an welcher Stelle ein Absturz
 * die vier Schritte des Segmentwechsels unterbrochen hat — auch zwischen
 * Schritt 2 und 3, wo `schreiber.json` noch das alte Segment nennt.
 */

import { naechsteLaufnummer, zerlegeEreignisId } from "@s1/domaene";

import type { Dateisystem } from "./dateisystem.js";
import { Identitaetenbuch } from "./identitaeten.js";
import {
  ERSTES_SEGMENT,
  clientPraefix,
  ereignisDateiname,
  zerlegeEreignisDateiname,
  type Dateikennung,
  type Einsatzablage,
} from "./pfade.js";
import { kettenanker, type Segmentquelle } from "./kettenanker.js";
import { KETTE_ANFANG } from "./pruefsummen.js";
import { angekuendigterNachfolger, liesSegment } from "./segmentlese.js";
import { liesSchreiberzustand, type Schreiberzustand } from "./schreiberzustand.js";
import type { GeleseneZeile } from "./zeile.js";

/**
 * Ein lokaler Kettenbruch in einem eigenen Segment, dessen Anker feststeht.
 *
 * Nicht gemeint ist der Fall, in dem der Anker nach §2.3 schlicht ein anderer
 * ist als 32 Nullen — den bestimmt {@link kettenanker}, und ein Ersatzsegment
 * (§4.6, Schritt 3) ist deshalb **kein** Kettenbruch. Gemeint ist der Fall, in
 * dem der Anker bekannt ist und die Zeilen trotzdem nicht darauf aufsetzen.
 *
 * Dafür gibt das Konzept keine Regel her: §8.1 kürzt ausdrücklich nur „sein
 * eigenes letztes Segment", §4.6 repariert den Share bei intaktem lokalem
 * Bestand, und §8.2 gilt für fremde Dateien. Weiterzuschreiben hieße, die Kette
 * auf einer Stelle aufzusetzen, deren Vorgeschichte nicht mehr belegt ist —
 * also unbestätigte Daten als bestätigt zu führen. Deshalb ein lauter Abbruch
 * statt einer stillen Annahme.
 */
export class LokalerKettenbruch extends Error {
  readonly segment: number;
  readonly offset: number;

  constructor(segment: number, offset: number) {
    super(
      `Das eigene lokale Segment ${segment} ist ab Byte ${offset} nicht kettenrichtig. ` +
        "Für diesen Fall gibt KONZEPT-SPEICHER.md keine Regel her (§8.1 kürzt nur das letzte Segment).",
    );
    this.name = "LokalerKettenbruch";
    this.segment = segment;
    this.offset = offset;
  }
}

/** Was der Start ergeben hat. */
export interface Schreiberbestand {
  /** Der wiederhergestellte oder gelesene Schreiberzustand (§4.4). */
  readonly zustand: Schreiberzustand;
  /** Die lokal vorhandenen eigenen Segmentdateien, aufsteigend. */
  readonly eigeneSegmente: readonly Dateikennung[];
  /** Alle eigenen Identitäten aus dem lokalen Spiegel (§5.3). */
  readonly identitaeten: Identitaetenbuch;
  /**
   * Auf welche Länge das letzte eigene Segment gekürzt wurde (§8.1); `undefined`,
   * wenn nichts zu kürzen war.
   */
  readonly gekuerztAuf?: number;
  /** `true`, wenn `schreiber.json` nicht brauchbar war und rekonstruiert wurde (§4.4). */
  readonly rekonstruiert: boolean;
}

/** Optionen des Starts. */
export interface StartOptionen {
  readonly dateisystem: Dateisystem;
  readonly ablage: Einsatzablage;
  readonly clientId: string;
}

/**
 * Ermittelt den Ausgangszustand des Schreibers aus dem lokalen Bestand.
 *
 * Reihenfolge, und zwar in dieser: (1) `schreiber.json` lesen, aber nur als
 * Beschleuniger und wegen `frühereClientIds`; (2) den Dateibestand auflisten;
 * (3) die eigenen Segmente aufsteigend geprüft lesen und dabei die Kette
 * durchziehen; (4) das letzte Segment nach §8.1 kürzen; (5) das laufende
 * Segment nach §4.3 bestimmen; (6) die Laufnummer nach §4.4 festlegen.
 */
export async function bereiteSchreiberVor(optionen: StartOptionen): Promise<Schreiberbestand> {
  const { dateisystem, ablage, clientId } = optionen;
  await dateisystem.legeVerzeichnisAn(ablage.lokalEreignisse);

  const gelesen = await liesSchreiberzustand(dateisystem, ablage.schreiberDatei);
  const brauchbar = gelesen !== undefined && gelesen.clientId === clientId ? gelesen : undefined;

  const eigeneSegmente = await eigeneSegmenteFinden(dateisystem, ablage, clientId);
  const identitaeten = new Identitaetenbuch();

  // (3) Aufsteigend lesen und je Segment den Anker nach §2.3 bestimmen. Ein
  // Folgesegment erbt die Kette des Vorgängerendes, ein Ersatzsegment die der
  // letzten unbeschädigten Zeile des ersetzten Segments (§4.6, Schritt 3) —
  // beides bestimmt `kettenanker`, nicht eine mitgeschleifte Variable. Wer hier
  // stattdessen die Kette durchreicht, hält jedes Ersatzsegment für
  // kettenfalsch und sperrt genau den Client aus, der als einziger reparieren
  // kann (§8.6.1 Regel 4).
  const bytesJeSegment = new Map<number, Uint8Array>();
  for (const kennung of eigeneSegmente) {
    bytesJeSegment.set(
      kennung.segment,
      await dateisystem.liesAb(ablage.lokalDatei(kennung.name), 0),
    );
  }
  const eigenesPraefix = clientPraefix(clientId);
  // **Auch die Dateien aufgegebener Kennungen sind Quelle.** Seit
  // Entscheidung 17 kann ein Ersatzsegment unter der laufenden Kennung ein
  // Segment unter einer aufgegebenen ersetzen; sein Anker liegt nach §4.6
  // Schritt 3 in deren Datei. Wer sie nicht anböte, fände den Anker nicht —
  // und `bereiteSchreiberVor` bräche mit `LokalerKettenbruch` an Byte 0 ab,
  // der Client käme an seine eigene Akte nie wieder heran (§8.8 Punkt 5).
  const quelle: Segmentquelle = async (segment, praefix) => {
    if (praefix === undefined || praefix === eigenesPraefix) return bytesJeSegment.get(segment);
    try {
      return await dateisystem.liesAb(
        ablage.lokalDatei(ereignisDateiname(praefix, segment)),
        0,
      );
    } catch {
      return undefined;
    }
  };

  let kette = KETTE_ANFANG;
  let offsetImLetzten = 0;
  let hoechsteLaufnummer = 0;
  let gekuerztAuf: number | undefined;
  let letzteZeilen: readonly GeleseneZeile[] = [];

  for (let i = 0; i < eigeneSegmente.length; i += 1) {
    const kennung = eigeneSegmente[i] as Dateikennung;
    const bytes = bytesJeSegment.get(kennung.segment) as Uint8Array;
    // `true`: Die Quelle sind die **eigenen** lokalen Segmente, und die sind
    // vollständig — anders als der Spiegel eines Lesers (§5.5).
    const anker = await kettenanker(kennung.segment, bytes, quelle, true, eigenesPraefix);
    if (anker === undefined) throw new LokalerKettenbruch(kennung.segment, 0);

    const befund = await liesSegment(dateisystem, ablage.lokalDatei(kennung.name), 0, anker);
    identitaeten.merkeAlle(befund.zeilen);
    hoechsteLaufnummer = Math.max(hoechsteLaufnummer, hoechsteAus(befund.zeilen));

    if (befund.abschluss.art === "defekt") {
      throw new LokalerKettenbruch(kennung.segment, befund.abschluss.offset);
    }

    // (4) §8.1, „Für den Schreiber": Beim Start kürzt er sein eigenes letztes
    // Segment lokal auf die letzte vollständige, kettenrichtige Zeile. Weil
    // nur bis genau dorthin gespiegelt wurde (§5.4.1), kann diese Kürzung nie
    // Bytes entfernen, die auf dem Share schon liegen.
    //
    // **Auch ein früheres Segment wird gekürzt, wenn es unvollständig endet.**
    // §8.1 nennt nur „sein eigenes letztes Segment", und für den Normalfall
    // genügt das: Ein Segment wird verlassen, indem eine Abschlusszeile
    // geschrieben wird (§4.3), und danach wächst es nicht mehr. Ein
    // **abgebrochener** Anhang kann aber ein Bruchstück hinterlassen, und wenn
    // dieser Client danach in ein Ersatzsegment (§4.6) oder unter eine neue
    // Kennung (§4.5) wechselt, wird das alte Segment nie wieder beschrieben —
    // das Bruchstück bliebe für immer stehen. Ein lauter Abbruch an dieser
    // Stelle sperrte den Client dauerhaft aus seiner eigenen Akte aus, und zwar
    // gegen §8, Grundsatz, und gegen §8.8 Punkt 5 („Der Arbeitsplatz wird zum
    // Nur-Lesen-Platz, nicht zum toten Fenster").
    //
    // Die Kürzung ist dieselbe Regel auf denselben Anlass, nur an einem
    // anderen Segment: Ein unvollständiger Rest am Ende einer eigenen Datei ist
    // nach §5.4.1 nie gespiegelt worden. Eine **defekte** Zeile bleibt dagegen
    // ein Abbruch — dafür gibt das Konzept keine Regel her (siehe
    // {@link LokalerKettenbruch}). Befund aus der Simulation M0.4.
    if (befund.endeOffset < befund.neueBytes) {
      await dateisystem.kuerzeAuf(ablage.lokalDatei(kennung.name), befund.endeOffset);
      gekuerztAuf = befund.endeOffset;
      bytesJeSegment.set(kennung.segment, bytes.subarray(0, befund.endeOffset));
    }

    kette = befund.letzteKette;
    offsetImLetzten = befund.endeOffset;
    letzteZeilen = befund.zeilen;
  }

  // (5) Das laufende Segment nach §4.3.
  const letztes = eigeneSegmente.at(-1);
  let segment = letztes?.segment ?? ERSTES_SEGMENT;
  let lokalerOffset = offsetImLetzten;
  const nachfolger = angekuendigterNachfolger(letzteZeilen);
  if (nachfolger !== undefined) {
    // Die höchste vorhandene Datei trägt eine Abschlusszeile — das laufende
    // Segment ist der angekündigte Nachfolger, der dann neu anzulegen ist.
    segment = nachfolger;
    lokalerOffset = 0;
  }

  // (6) Laufnummer nach §4.4. Ein Rückschritt ist ausgeschlossen; eine Lücke
  // ist ausdrücklich erlaubt (§3.3).
  const laufnummer =
    brauchbar === undefined
      ? hoechsteLaufnummer === 0
        ? 0
        : naechsteLaufnummer(hoechsteLaufnummer)
      : Math.max(brauchbar.laufnummer, hoechsteLaufnummer);

  const basis: Schreiberzustand = {
    clientId,
    laufnummer,
    segment,
    lokalerOffset,
    letzteKette: kette,
  };
  const frühere = brauchbar?.frühereClientIds ?? gelesen?.frühereClientIds;
  const zustand: Schreiberzustand =
    frühere === undefined ? basis : { ...basis, frühereClientIds: frühere };

  return {
    zustand,
    eigeneSegmente,
    identitaeten,
    rekonstruiert: brauchbar === undefined,
    ...(gekuerztAuf === undefined ? {} : { gekuerztAuf }),
  };
}

/** Die höchste Laufnummer, die in diesen Zeilen vorkommt (§3.3). */
function hoechsteAus(zeilen: readonly GeleseneZeile[]): number {
  let hoechste = 0;
  for (const zeile of zeilen) {
    try {
      // §4.5 Schritt 3: Nach einem Kennungswechsel stehen in der neuen Datei
      // Zeilen mit dem alten Kennungspräfix. Für die Laufnummer zählt die
      // Nummer, nicht das Präfix — sie läuft fort (§4.5 Schritt 4).
      const { laufnummer } = zerlegeEreignisId(zeile.rahmen.id);
      if (laufnummer > hoechste) hoechste = laufnummer;
    } catch {
      // Eine Identität ohne Laufnummer stammt nicht von diesem Verfahren; sie
      // zählt hier nicht mit und wird sonst unverändert durchgereicht (§8.7).
    }
  }
  return hoechste;
}

/** Alle lokal vorhandenen eigenen Segmentdateien, aufsteigend nach Segmentnummer. */
async function eigeneSegmenteFinden(
  dateisystem: Dateisystem,
  ablage: Einsatzablage,
  clientId: string,
): Promise<readonly Dateikennung[]> {
  const praefix = clientPraefix(clientId);
  const namen = await dateisystem.listeVerzeichnis(ablage.lokalEreignisse);
  return namen
    .flatMap((name) => {
      const kennung = zerlegeEreignisDateiname(name);
      return kennung !== undefined && kennung.praefix === praefix ? [kennung] : [];
    })
    .sort((a, b) => a.segment - b.segment);
}
