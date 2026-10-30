/**
 * Die Prüfung eines abgelegten Einsatzordners — der Kern von `s1 akte pruefe`
 * (M2.4) und der Einsatzakte (M4.4).
 *
 * **Warum sie hier steht und nicht mehr in der Kommandozeile.** Sie lag bis
 * zum Abschluss-Bedienweg in `@s1/cli`. Seit die Einsatzakte auch aus der
 * Oberfläche erzeugt wird, braucht der Worker der Schale dieselbe Prüfung —
 * und `apps/desktop` importiert die Kommandozeile nicht. Sie gehört ohnehin
 * hierher: Sie liest nichts als die Ereignisdateien nach §2.1 bis §2.3 und
 * faltet sie, und beides ist Sache der Speicherschicht und ihres inneren
 * Rings. Die Kommandozeile behält nur, was sie ausmacht: Bericht und Exitcode.
 *
 * **Sie liest ausschließlich.** Geprüft wird ein Dateibestand, keine laufende
 * Akte: kein Spiegeln, kein Reparieren, keine Präsenzdatei. Ein Prüfwerkzeug,
 * das seinen Prüfgegenstand verändert, taugt für eine Abnahme nicht.
 */

import path from "node:path";

import {
  falte,
  zustandsHash,
  type EingehendesEreignis,
  type KanonischerWert,
  type Zustand,
} from "@s1/domaene";

import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import { liesEinsatzanker, type Einsatzanker } from "./einsatzordner.js";
import { kettenanker, type Segmentquelle } from "./kettenanker.js";
import { DATEI_EINSATZ, ORDNER_EREIGNISSE, zerlegeEreignisDateiname, type Dateikennung } from "./pfade.js";
import { sha256Hex } from "./pruefsummen.js";
import { istVerwaltungsereignis } from "./verwaltungsereignisse.js";
import {
  inhaltsSchluessel,
  leseAbschnitt,
  leseZeilengrenzen,
  type Abschnittsergebnis,
  type Defektgrund,
  type GeleseneZeile,
  type Identitaetenblick,
  type Rahmenblick,
} from "./zeile.js";

/**
 * Wie schwer ein Befund wiegt — die Unterscheidung aus §8.1 gegen §8.2.
 *
 * §8.1 verfügt für die unvollständige letzte Zeile ausdrücklich „keine
 * Meldung, kein Hinweis": Sie entsteht bei jedem Anhang und verschwindet mit
 * dem nächsten. §8.2 dagegen ist ein Defekt, ab dem die Datei nicht weiter
 * ausgewertet wird. Ein Bericht, der beides gleich behandelte, meldete nach
 * jedem gezogenen Kabel einen Datenverlust, den es nicht gibt.
 */
export type Befundklasse = "vorlaeufig" | "endgueltig";

/** Ein einzelner Befund mit Fundstelle — nie „irgendetwas stimmt nicht". */
export interface Befund {
  /** Dateiname innerhalb von `ereignisse\`, oder der Name der geprüften Datei. */
  readonly datei: string;
  /** Byte-Offset der Fundstelle; fehlt, wo der Befund die ganze Datei betrifft. */
  readonly offset?: number;
  readonly grund: string;
  readonly klasse: Befundklasse;
}

/** Was eine einzelne Ereignisdatei ergeben hat. */
export interface Dateibefund {
  readonly name: string;
  /** Zahl der vollständigen, kettenrichtigen Zeilen. */
  readonly zeilen: number;
  /** Byte-Offset hinter der letzten geprüften Zeile — das geprüfte Präfix (§5.5). */
  readonly geprueftBis: number;
  /** Zahl der Bytes, die die Datei tatsächlich hat. */
  readonly bytes: number;
}

/** Eine Ereignis-Identität, die an mehr als einer Stelle steht (§4.6). */
export interface Doppelbefund {
  readonly id: string;
  readonly zuerst: string;
  readonly wieder: string;
  /** `true`, wenn beide Stellen denselben Inhalt tragen — dann ist es dasselbe Ereignis. */
  readonly gleicherInhalt: boolean;
}

/** Der vollständige Befund eines Einsatzordners. */
export interface Pruefergebnis {
  readonly ordner: string;
  /** Der Anker aus `einsatz.json` (§5.6); fehlt, wenn er nicht lesbar war. */
  readonly anker?: Einsatzanker;
  readonly dateien: readonly Dateibefund[];
  readonly befunde: readonly Befund[];
  readonly doppelte: readonly Doppelbefund[];
  /** Gefaltete fachliche Ereignisse — ohne Verwaltungsereignisse, ohne Wiederholungen. */
  readonly ereignisse: number;
  /** Ausgesonderte Verwaltungsereignisse nach §2.4 (`SegmentAbgeschlossen`, `SegmentErsetzt`). */
  readonly verwaltungsereignisse: number;
  readonly foldVersion: number;
  /** SHA-256 über die kanonische Serialisierung des Zustands (§7.6). */
  readonly zustandsHash: string;
  readonly abschnitte: number;
  readonly einheiten: number;
  readonly hinweise: number;
  readonly unbekannt: number;
}

/**
 * Der Grund eines Defekts im Klartext — §8.2 nennt vier Regeln, und der
 * Bericht nennt sie beim Namen: Ein CRC-Fehler zeigt auf verfälschte Bytes,
 * ein Kettenfehler auf eine falsch zusammengesetzte Datei, `identitaetAnders`
 * auf zwei Schreiber mit derselben Kennung (§4.5).
 */
const DEFEKTTEXT: Readonly<Record<Defektgrund, string>> = {
  laenge: "Längenfeld unzulässig (§8.2 Regel 1)",
  keinZeilenende: "kein Zeilenende an der angekündigten Stelle (§8.2 Regel 3)",
  trennzeichen: "Trennzeichen ist kein Tabulator (§2.1, §8.2 Regel 3)",
  crc: "CRC-32 stimmt nicht (§8.2 Regel 4)",
  json: "JSON nicht lesbar oder kein gültiger Rahmen (§2.4, §8.2 Regel 4)",
  kette: "vorgaenger passt nicht zur berechneten Kette (§2.3, §8.2 Regel 4)",
  identitaetAnders: "dieselbe Ereignis-Id mit anderem Inhalt (§8.2, §4.6)",
};

/** `<datei> @ <offset>` — die Fundstelle, wie sie im Bericht steht. */
export function fundstelle(datei: string, offset: number): string {
  return `${datei} @ ${offset}`;
}

/**
 * Die gesehenen Identitäten über **alle** Dateien des Ordners hinweg (§8.2,
 * §4.6) — über den ganzen Ordner und nicht je Datei, weil Wiederholung und
 * Widerspruch gerade zwischen Dateien auftreten: Ein Ersatzsegment trägt die
 * Zeilen des ersetzten erneut, ein geklontes Profil (§4.5) fremde Zeilen
 * unter derselben Kennung.
 */
class Identitaetensicht implements Identitaetenblick {
  readonly #inhalte = new Map<string, { readonly inhalt: string; readonly stelle: string }>();
  readonly doppelte: Doppelbefund[] = [];

  inhaltVon(id: string): string | undefined {
    return this.#inhalte.get(id)?.inhalt;
  }

  /** Vermerkt eine Zeile und meldet Doppelungen — gemeldet, nicht bewertet (§4.6: so sieht eine Reparatur aus). */
  vermerke(stelle: string, zeile: GeleseneZeile): void {
    const inhalt = inhaltsSchluessel(zeile.rahmen);
    const bekannt = this.#inhalte.get(zeile.rahmen.id);
    if (bekannt === undefined) {
      this.#inhalte.set(zeile.rahmen.id, { inhalt, stelle });
      return;
    }
    this.doppelte.push({
      id: zeile.rahmen.id,
      zuerst: bekannt.stelle,
      wieder: stelle,
      gleicherInhalt: bekannt.inhalt === inhalt,
    });
  }
}

/** Was die Prüfung je Datei fortschreibt — ein Sammelbehälter, kein Zustand darüber hinaus. */
interface Pruefkontext {
  readonly befunde: Befund[];
  readonly dateien: Dateibefund[];
  readonly ereignisse: EingehendesEreignis[];
  readonly identitaeten: Identitaetensicht;
  /**
   * Die Segmente, deren Lesung an einem Defekt endete — `<praefix>:<segment>`.
   *
   * Sie sind der Grund, warum ihr **Nachfolger** nicht kettengeprüft werden
   * kann: Dessen Anker ist nach §2.3 die letzte Zeile des Vorgängers, und die
   * ist hinter der Quarantänestelle nicht erreichbar (§8.2 Punkt 7). Ohne
   * diese Merkliste fiele der gesunde Nachfolger als kettenfalsch aus dem
   * Fold — aus einer beschädigten Zeile würde ein Datenverlust über alle
   * folgenden Segmente.
   */
  readonly beschaedigt: Set<string>;
  readonly quelle: Segmentquelle;
  verwaltungsereignisse: number;
}

/** Liest eine Datei ganz; `undefined`, wenn es sie nicht gibt — ohne Größenabfrage (§5.4.2). */
async function liesGanz(dateisystem: Dateisystem, pfad: string): Promise<Uint8Array | undefined> {
  try {
    return await dateisystem.liesAb(pfad, 0);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") return undefined;
    throw fehler;
  }
}

/**
 * Die Ereignisdateien in Prüfreihenfolge, mit ihren Bytes.
 *
 * §4.1: Ein fremdes Werkzeug darf in `ereignisse\` eine Datei ablegen, ohne
 * dass die Prüfung darüber stolpert — was nicht dem Muster entspricht, wird
 * übergangen. Gelesen wird jede Datei genau einmal; auch die Kettenanker
 * kommen aus diesem Bestand.
 */
async function liesEreignisbestand(
  dateisystem: Dateisystem,
  ereignisordner: string,
  namen: readonly string[],
): Promise<{ readonly kennungen: readonly Dateikennung[]; readonly bytesJeName: Map<string, Uint8Array> }> {
  const kennungen = [...namen]
    .map((name) => zerlegeEreignisDateiname(name))
    .filter((kennung): kennung is Dateikennung => kennung !== undefined)
    .sort((a, b) => (a.praefix === b.praefix ? a.segment - b.segment : a.praefix < b.praefix ? -1 : 1));
  const bytesJeName = new Map<string, Uint8Array>();
  for (const kennung of kennungen) {
    const bytes = await liesGanz(dateisystem, path.join(ereignisordner, kennung.name));
    if (bytes !== undefined) bytesJeName.set(kennung.name, bytes);
  }
  return { kennungen, bytesJeName };
}

/**
 * Liest eine Datei nach §2.3 — mit Kettenanker, wo er bestimmbar ist.
 *
 * Der Anker der ersten Zeile ist **nicht** immer der Kettenanfang: Ein
 * Folgesegment setzt auf seinem Vorgänger auf, ein Ersatzsegment nach §4.6
 * mitten im ersetzten. `quelleIstVollstaendig` ist `true`, weil ein
 * abgelegter Ordner geprüft wird und nicht der laufende Spiegel eines Lesers.
 * Ist der Anker nicht bestimmbar, bleibt die Kette ungeprüft — gemeldet und
 * nicht stillschweigend als „in Ordnung" verbucht; Format, CRC und Rahmen
 * prüft `leseZeilengrenzen` weiterhin, und die Ereignisse bleiben gezählt.
 */
async function liesMitKette(
  kontext: Pruefkontext,
  kennung: Dateikennung,
  bytes: Uint8Array,
): Promise<Abschnittsergebnis> {
  const vorgaengerKrank = kontext.beschaedigt.has(`${kennung.praefix}:${kennung.segment - 1}`);
  const anker0 = vorgaengerKrank
    ? undefined
    : await kettenanker(kennung.segment, bytes, kontext.quelle, true, kennung.praefix);
  if (anker0 !== undefined) return leseAbschnitt(bytes, 0, anker0, kontext.identitaeten);
  kontext.befunde.push({
    datei: kennung.name,
    offset: 0,
    grund: vorgaengerKrank
      ? "Kette über den Segmentwechsel nicht prüfbar — das Vorgängersegment steht in Quarantäne (§2.3, §8.2); Zeilenformat und CRC geprüft"
      : "Kettenanker nicht bestimmbar — Vorgänger- oder ersetztes Segment fehlt im Ordner (§2.3); Kette ungeprüft",
    klasse: "endgueltig",
  });
  return leseZeilengrenzen(bytes, 0);
}

/** Vermerkt den Abschluss einer Lesung: Defekt nach §8.2 oder offene letzte Zeile nach §8.1. */
function vermerkeAbschluss(kontext: Pruefkontext, kennung: Dateikennung, gelesen: Abschnittsergebnis): void {
  if (gelesen.abschluss.art === "defekt") {
    kontext.beschaedigt.add(`${kennung.praefix}:${kennung.segment}`);
    kontext.befunde.push({
      datei: kennung.name,
      offset: gelesen.abschluss.offset,
      grund: `${DEFEKTTEXT[gelesen.abschluss.grund]} — Quarantäne ab dieser Stelle`,
      klasse: "endgueltig",
    });
  } else if (gelesen.abschluss.art === "unvollstaendig") {
    // §8.1 gilt dem Leser im Betrieb. Der Prüfbericht nennt die Stelle
    // trotzdem — sie sagt, wo ein gezogenes Kabel die Zeile abgeschnitten
    // hat —, als Fehler zählt sie nicht.
    kontext.befunde.push({
      datei: kennung.name,
      offset: gelesen.endeOffset,
      grund: "letzte Zeile unvollständig (§8.1) — kein Fehler, wird beim Weiterschreiben ergänzt",
      klasse: "vorlaeufig",
    });
  }
}

/**
 * Nimmt die Zeilen einer Datei auf. Verwaltungsereignisse (§2.4) reden über
 * die Datei, in der sie stehen, und gehören nicht in den Fold; eine
 * Wiederholung (§4.6) geht genau einmal hinein.
 */
function nimmZeilenAuf(kontext: Pruefkontext, kennung: Dateikennung, gelesen: Abschnittsergebnis): void {
  for (const zeile of gelesen.zeilen) {
    kontext.identitaeten.vermerke(fundstelle(kennung.name, zeile.offset), zeile);
    if (istVerwaltungsereignis(zeile.rahmen.typ)) {
      kontext.verwaltungsereignisse += 1;
      continue;
    }
    if (zeile.wiederholung) continue;
    kontext.ereignisse.push(alsEreignis(zeile.rahmen));
  }
}

async function pruefeDatei(
  kontext: Pruefkontext,
  kennung: Dateikennung,
  bytes: Uint8Array | undefined,
): Promise<void> {
  if (bytes === undefined) {
    // Zwischen Auflisten und Lesen verschwunden — auf einem Share nicht
    // ausgeschlossen (§8.9).
    kontext.befunde.push({ datei: kennung.name, grund: "war beim Auflisten da und beim Lesen fort", klasse: "endgueltig" });
    return;
  }
  const gelesen = await liesMitKette(kontext, kennung, bytes);
  vermerkeAbschluss(kontext, kennung, gelesen);
  nimmZeilenAuf(kontext, kennung, gelesen);
  kontext.dateien.push({
    name: kennung.name,
    zeilen: gelesen.zeilen.length,
    geprueftBis: gelesen.endeOffset,
    bytes: bytes.byteLength,
  });
}

/**
 * Prüft einen Einsatzordner vollständig.
 *
 * Wirft `SyntaxError`, wenn der Pfad gar kein Ordner ist, den man prüfen
 * könnte — ein Aufruffehler und kein Befund über eine Akte: Ein vertippter
 * Pfad darf in einem Abnahmeprotokoll nicht als beschädigte Akte erscheinen.
 */
export async function pruefeOrdner(dateisystem: Dateisystem, ordner: string): Promise<Pruefergebnis> {
  const befunde: Befund[] = [];
  // `einsatz.json` (§5.6) ist der Anker, an dem §5.7 vor jedem
  // Spiegelungsversuch prüft, ob unter diesem Pfad noch derselbe Einsatz liegt.
  const anker = await liesEinsatzanker(dateisystem, path.join(ordner, DATEI_EINSATZ));
  if (anker === undefined) {
    befunde.push({
      datei: DATEI_EINSATZ,
      grund: "fehlt oder ist nicht lesbar (§5.6); ohne sie hält §5.7 jede Spiegelung an",
      klasse: "endgueltig",
    });
  }
  const ereignisordner = path.join(ordner, ORDNER_EREIGNISSE);
  // Ein fehlender Ordner liefert eine leere Liste (§5.4.2). Ohne Anker und
  // ohne Ereignisse ist hier nichts — der leere Einsatz hat seine `einsatz.json`.
  const namen = await dateisystem.listeVerzeichnis(ereignisordner);
  if (anker === undefined && namen.length === 0) throw new SyntaxError(`Kein Einsatzordner: ${ordner}`);

  const { kennungen, bytesJeName } = await liesEreignisbestand(dateisystem, ereignisordner, namen);
  const kontext: Pruefkontext = {
    befunde,
    dateien: [],
    ereignisse: [],
    identitaeten: new Identitaetensicht(),
    beschaedigt: new Set(),
    quelle: async (segment, praefix) => {
      const gesucht = kennungen.find((k) => k.segment === segment && (praefix === undefined || k.praefix === praefix));
      return gesucht === undefined ? undefined : bytesJeName.get(gesucht.name);
    },
    verwaltungsereignisse: 0,
  };
  for (const kennung of kennungen) await pruefeDatei(kontext, kennung, bytesJeName.get(kennung.name));
  return ergebnisAus(ordner, anker, kontext);
}

function ergebnisAus(ordner: string, anker: Einsatzanker | undefined, kontext: Pruefkontext): Pruefergebnis {
  const zustand: Zustand = falte(kontext.ereignisse);
  return {
    ordner,
    ...(anker === undefined ? {} : { anker }),
    dateien: kontext.dateien,
    befunde: kontext.befunde,
    doppelte: kontext.identitaeten.doppelte,
    ereignisse: kontext.ereignisse.length,
    verwaltungsereignisse: kontext.verwaltungsereignisse,
    foldVersion: zustand.foldVersion,
    // `sha256Hex` wird hereingereicht: `@s1/domaene` ist plattformneutral und
    // darf `node:crypto` nicht sehen (02-ZIELBILD.md, „Vier Ringe").
    zustandsHash: zustandsHash(zustand as unknown as KanonischerWert, sha256Hex),
    abschnitte: Object.keys(zustand.abschnitte).length,
    einheiten: Object.keys(zustand.einheiten).length,
    hinweise: zustand.hinweise.length,
    unbekannt: zustand.unbekannt.length,
  };
}

/**
 * Der Rahmen der Speicherschicht als Eingang des Folds. Beide beschreiben
 * dieselben Bytes (§2.4); was nicht passt, führt der Fold nach §3.7 als
 * unbekannt mit — er verwirft nichts, deshalb braucht es keine Vorprüfung.
 */
function alsEreignis(rahmen: Rahmenblick): EingehendesEreignis {
  return rahmen as unknown as EingehendesEreignis;
}

/** Die Befunde, die ein Urteil tragen — die vorläufigen aus §8.1 tun es nicht. */
export function endgueltigeBefunde(ergebnis: Pruefergebnis): readonly Befund[] {
  return ergebnis.befunde.filter((b) => b.klasse === "endgueltig");
}

/**
 * Doppelte Identitäten, die ein Mangel sind. Gleicher Inhalt ist nach §4.6
 * keiner — so sieht jede Reparatur aus. Anderer Inhalt käme durch
 * `leseAbschnitt` gar nicht durch; erreichbar ist der Fall nur für Dateien,
 * deren Kette mangels Anker ungeprüft blieb.
 */
export function widerspruechlicheDoppel(ergebnis: Pruefergebnis): readonly Doppelbefund[] {
  return ergebnis.doppelte.filter((d) => !d.gleicherInhalt);
}
