/**
 * `s1 akte pruefe <einsatzordner>` — die Abnahme von M2.4
 * (05-UMSETZUNGSPLAN.md: „Konvergenz per `s1 akte pruefe`, kein
 * Datenverlust").
 *
 * Das Kommando nimmt einen Einsatzordner — auf dem Share oder einen lokalen
 * Spiegel — und beantwortet die zwei Fragen, die nach einem Übungslauf offen
 * sind:
 *
 *  1. **Ist die Akte heil?** Jede Ereignisdatei wird von Offset 0 nach den
 *     Regeln aus KONZEPT-SPEICHER.md §2.1 bis §2.3 gelesen: Zeilenformat
 *     `länge \t crc32 \t json`, CRC, Hash-Kette. Was nicht durchgeht, wird mit
 *     Datei, Offset und Grund benannt — und dabei nach §8.1 (unvollständige
 *     letzte Zeile, **kein** Fehler) und §8.2 (Defekt, endgültige Quarantäne)
 *     unterschieden. Diese Unterscheidung ist der Kern der Auskunft: Ein
 *     abgebrochener Anhang am Dateiende ist der Normalfall eines gezogenen
 *     Kabels, ein gekipptes Byte in der Mitte ist es nicht.
 *  2. **Führen zwei Rechner denselben Einsatz?** Mit `--vergleiche <ordner>`
 *     wird beides geprüft und der `zustandsHash` nach §7.6 verglichen. Das ist
 *     das Konvergenzkriterium, und es ist der eigentliche Zweck von M2.4: Zwei
 *     physische Rechner am selben Share müssen nach einer Stunde mit Störungen
 *     denselben Zustand halten.
 *
 * **Warum ein eigenes Kommando und nicht die Diagnoseansicht.** Die Abnahme
 * läuft auf zwei Rechnern, deren Anwendung nach dem Versuch geschlossen ist;
 * geprüft wird der Dateibestand, nicht ein laufender Prozess. Das Kommando
 * greift deshalb ausschließlich lesend auf den Ordner zu und öffnet keine
 * Akte: Es darf weder spiegeln noch reparieren noch eine Präsenzdatei
 * hinterlassen. Ein Prüfwerkzeug, das seinen Prüfgegenstand verändert, taugt
 * für eine Abnahme nicht.
 *
 * **Der Exitcode trägt das Urteil, nicht der Text.** Wie `s1 simuliere`
 * (Auflage 18) muss dieser Schritt ohne Textauswertung entscheidbar sein:
 * 0 heißt in Ordnung, 1 heißt Befunde, 2 heißt Aufruffehler.
 */

import path from "node:path";

import {
  falte,
  zustandsHash,
  type EingehendesEreignis,
  type KanonischerWert,
  type Zustand,
} from "@s1/domaene";
import {
  DATEI_EINSATZ,
  DateisystemFehler,
  ORDNER_EREIGNISSE,
  inhaltsSchluessel,
  istVerwaltungsereignis,
  kettenanker,
  knotenDateisystem,
  leseAbschnitt,
  leseZeilengrenzen,
  liesEinsatzanker,
  sha256Hex,
  zerlegeEreignisDateiname,
  type Abschnittsergebnis,
  type Dateisystem,
  type Defektgrund,
  type Einsatzanker,
  type GeleseneZeile,
  type Identitaetenblick,
  type Rahmenblick,
} from "@s1/speicher";

/**
 * Ergebnis eines Kommandos: Ausgabetext und Exitcode.
 *
 * Hier noch einmal beschrieben statt aus `index.ts` geholt: Die Verdrahtung
 * geht von dort hierher, und ein Rückimport machte aus zwei Dateien einen
 * Kreis. Beide Formen sind dieselbe, und TypeScript prüft das bei der
 * Verdrahtung strukturell.
 */
export interface Ergebnis {
  readonly text: string;
  readonly code: number;
}

/**
 * Wie schwer ein Befund wiegt — die Unterscheidung aus §8.1 gegen §8.2.
 *
 * §8.1 verfügt für die unvollständige letzte Zeile ausdrücklich „keine
 * Meldung, kein Hinweis": Sie entsteht bei jedem Anhang und verschwindet mit
 * dem nächsten. §8.2 dagegen ist ein Defekt, ab dem die Datei nicht weiter
 * ausgewertet wird. Ein Bericht, der beides gleich behandelte, meldete nach
 * jedem gezogenen Kabel einen Datenverlust, den es nicht gibt — und machte die
 * Abnahme von M2.4 unbeantwortbar.
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
 * Bericht nennt sie beim Namen.
 *
 * Ein Bericht, der „defekt" sagt, hilft bei der Auswertung eines Übungslaufs
 * nicht weiter: Ein CRC-Fehler zeigt auf eine Verfälschung der Bytes, ein
 * Kettenfehler auf eine falsch zusammengesetzte Datei, `identitaetAnders` auf
 * zwei Schreiber mit derselben Kennung (§4.5).
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

/**
 * Die gesehenen Identitäten über **alle** Dateien des Ordners hinweg (§8.2,
 * §4.6).
 *
 * `leseAbschnitt` fragt sie je Zeile: Dieselbe Identität mit gleichem Inhalt
 * ist dasselbe Ereignis und wird als Wiederholung übersprungen (§4.6, „Was
 * ‚gleicher Inhalt' heißt"), dieselbe mit anderem Inhalt ist ein Defekt. Die
 * Sicht wird über den ganzen Ordner geführt und nicht je Datei, weil beide
 * Fälle gerade zwischen Dateien auftreten: Ein Ersatzsegment nach §4.6 trägt
 * die Zeilen des ersetzten Segments erneut, ein geklontes Benutzerprofil
 * (§4.5) trägt fremde Zeilen unter derselben Kennung.
 */
class Identitaetensicht implements Identitaetenblick {
  readonly #inhalte = new Map<string, { readonly inhalt: string; readonly stelle: string }>();
  readonly doppelte: Doppelbefund[] = [];

  inhaltVon(id: string): string | undefined {
    return this.#inhalte.get(id)?.inhalt;
  }

  /**
   * Nimmt eine gelesene Zeile auf und meldet dabei die Doppelung.
   *
   * Gemeldet, nicht bewertet: Eine wiederholte Identität mit gleichem Inhalt
   * ist nach §4.6 der **vorgesehene** Ausgang einer Reparatur und kein Mangel.
   * Der Bericht nennt sie trotzdem, weil sie die einzige Spur ist, an der sich
   * eine stattgefundene Reparatur im Dateibestand ablesen lässt.
   */
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

/** `<datei> @ <offset>` — die Fundstelle, wie sie im Bericht steht. */
function stelle(datei: string, offset: number): string {
  return `${datei} @ ${offset}`;
}

/**
 * Liest eine Datei ganz; `undefined`, wenn es sie nicht gibt.
 *
 * `liesAb(pfad, 0)` und keine Größenabfrage: Der Dateisystem-Port bietet
 * bewusst keine an (§5.4.2, §6.2), und das gilt auch für ein Prüfwerkzeug.
 */
async function liesGanz(
  dateisystem: Dateisystem,
  pfad: string,
): Promise<Uint8Array | undefined> {
  try {
    return await dateisystem.liesAb(pfad, 0);
  } catch (fehler) {
    if (fehler instanceof DateisystemFehler && fehler.code === "ENOENT") return undefined;
    throw fehler;
  }
}

/**
 * Prüft einen Einsatzordner vollständig.
 *
 * Wirft `SyntaxError`, wenn der angegebene Pfad gar kein Ordner ist, den man
 * prüfen könnte — das ist ein Aufruffehler (Exitcode 2) und kein Befund über
 * eine Akte (Exitcode 1). Die Unterscheidung ist nicht kosmetisch: Ein
 * vertippter Pfad darf in einem Abnahmeprotokoll nicht als beschädigte
 * Einsatzakte erscheinen.
 */
export async function pruefeOrdner(
  dateisystem: Dateisystem,
  ordner: string,
): Promise<Pruefergebnis> {
  const befunde: Befund[] = [];

  // 1. `einsatz.json` (§5.6). Sie ist der Anker, an dem §5.7 vor jedem
  //    Spiegelungsversuch prüft, ob unter diesem Pfad noch derselbe Einsatz
  //    liegt. Fehlt sie, ist der Ordner für jeden Client unbrauchbar, auch
  //    wenn die Ereignisdateien tadellos sind.
  const anker = await liesEinsatzanker(dateisystem, path.join(ordner, DATEI_EINSATZ));
  if (anker === undefined) {
    befunde.push({
      datei: DATEI_EINSATZ,
      grund: "fehlt oder ist nicht lesbar (§5.6); ohne sie hält §5.7 jede Spiegelung an",
      klasse: "endgueltig",
    });
  }

  const ereignisordner = path.join(ordner, ORDNER_EREIGNISSE);
  // `listeVerzeichnis` liefert für einen fehlenden Ordner eine leere Liste und
  // keinen Fehler — der Port kennt keine Existenzabfrage (§5.4.2). Ein leeres
  // Ergebnis heißt hier deshalb „hier ist nichts", nicht „hier ist ein leerer
  // Einsatz": Der leere Einsatz hat seine `einsatz.json` (§5.6).
  const namen = await dateisystem.listeVerzeichnis(ereignisordner);
  if (anker === undefined && namen.length === 0) {
    throw new SyntaxError(`Kein Einsatzordner: ${ordner}`);
  }

  // §4.1: Ein fremdes Werkzeug darf in `ereignisse\` eine Datei ablegen, ohne
  // dass die Prüfung darüber stolpert. Was nicht dem Muster entspricht, wird
  // übergangen — geprüft wird das Protokoll, nicht der Ordnerinhalt.
  const kennungen = [...namen]
    .map((name) => zerlegeEreignisDateiname(name))
    .filter((kennung): kennung is NonNullable<typeof kennung> => kennung !== undefined)
    .sort((a, b) => (a.praefix === b.praefix ? a.segment - b.segment : a.praefix < b.praefix ? -1 : 1));

  const bytesJeName = new Map<string, Uint8Array>();
  for (const kennung of kennungen) {
    const bytes = await liesGanz(dateisystem, path.join(ereignisordner, kennung.name));
    if (bytes !== undefined) bytesJeName.set(kennung.name, bytes);
  }

  /**
   * Die übrigen Segmente derselben Kennung — die Quelle für {@link kettenanker}.
   *
   * Sie liest ausschließlich aus dem Bestand, der ohnehin gelesen wurde; ein
   * Prüfwerkzeug fasst den Ordner nur einmal an.
   */
  const quelle = async (segment: number, praefix?: string): Promise<Uint8Array | undefined> => {
    const gesucht = kennungen.find(
      (k) => k.segment === segment && (praefix === undefined || k.praefix === praefix),
    );
    return gesucht === undefined ? undefined : bytesJeName.get(gesucht.name);
  };

  const identitaeten = new Identitaetensicht();
  const dateien: Dateibefund[] = [];
  const ereignisse: EingehendesEreignis[] = [];
  let verwaltungsereignisse = 0;

  /**
   * Die Segmente, deren Lesung an einem Defekt endete — `<praefix>:<segment>`.
   *
   * Sie sind der Grund, warum ihr **Nachfolger** nicht kettengeprüft werden
   * kann: Dessen Anker ist nach §2.3 die letzte Zeile des Vorgängers, und die
   * ist hinter der Quarantänestelle nicht mehr erreichbar (§8.2 Punkt 7). Ohne
   * diese Merkliste meldete der Bericht den gesunden Nachfolger als
   * kettenfalsch und ließe seine Ereignisse aus dem Fold fallen — aus einer
   * beschädigten Zeile würde ein Datenverlust über alle folgenden Segmente,
   * und die Abnahmefrage von M2.4 („kein Datenverlust") wäre falsch
   * beantwortet.
   */
  const beschaedigt = new Set<string>();

  for (const kennung of kennungen) {
    const bytes = bytesJeName.get(kennung.name);
    if (bytes === undefined) {
      // Zwischen Auflisten und Lesen verschwunden — auf einem Share nicht
      // ausgeschlossen (§8.9).
      befunde.push({
        datei: kennung.name,
        grund: "war beim Auflisten da und beim Lesen fort",
        klasse: "endgueltig",
      });
      continue;
    }

    // §2.3: Der Anker der ersten Zeile ist **nicht** immer der Kettenanfang.
    // Ein Folgesegment setzt auf der letzten Zeile seines Vorgängers auf, ein
    // Ersatzsegment nach §4.6 mitten im ersetzten Segment. Wer für jede Datei
    // 32 Nullen annimmt, hält jede Datei ab Segment 1 für kettenfalsch.
    //
    // `quelleIstVollstaendig` ist hier `true`: Geprüft wird ein abgelegter
    // Ordner und nicht der laufende Spiegel eines Lesers — was dort steht, ist
    // alles, was es gibt, und die letzte Zeile eines Segments ist seine letzte
    // Zeile, auch ohne Abschlusszeile nach §4.3.
    const vorgaengerKrank = beschaedigt.has(`${kennung.praefix}:${kennung.segment - 1}`);
    const anker0 = vorgaengerKrank
      ? undefined
      : await kettenanker(kennung.segment, bytes, quelle, true, kennung.praefix);
    let gelesen: Abschnittsergebnis;
    if (anker0 === undefined) {
      // Der Anker ist nicht bestimmbar — weil das Vorgänger- oder ersetzte
      // Segment im Ordner fehlt, oder weil es in Quarantäne steht. Die Kette
      // bleibt dann ungeprüft; das wird gemeldet und nicht stillschweigend als
      // „in Ordnung" verbucht. Format, CRC und Rahmen prüft
      // `leseZeilengrenzen` weiterhin vollständig, und die Ereignisse dieser
      // Datei bleiben gezählt.
      befunde.push({
        datei: kennung.name,
        offset: 0,
        grund: vorgaengerKrank
          ? "Kette über den Segmentwechsel nicht prüfbar — das Vorgängersegment steht in Quarantäne (§2.3, §8.2); Zeilenformat und CRC geprüft"
          : "Kettenanker nicht bestimmbar — Vorgänger- oder ersetztes Segment fehlt im Ordner (§2.3); Kette ungeprüft",
        klasse: "endgueltig",
      });
      gelesen = leseZeilengrenzen(bytes, 0);
    } else {
      gelesen = leseAbschnitt(bytes, 0, anker0, identitaeten);
    }

    if (gelesen.abschluss.art === "defekt") {
      beschaedigt.add(`${kennung.praefix}:${kennung.segment}`);
      befunde.push({
        datei: kennung.name,
        offset: gelesen.abschluss.offset,
        grund: `${DEFEKTTEXT[gelesen.abschluss.grund]} — Quarantäne ab dieser Stelle`,
        klasse: "endgueltig",
      });
    } else if (gelesen.abschluss.art === "unvollstaendig") {
      // §8.1: „keine Meldung, kein Hinweis" — für den Leser im Betrieb. Der
      // Prüfbericht nennt die Stelle trotzdem, weil sie in einer Abnahme die
      // Frage beantwortet, wo ein gezogenes Kabel die Zeile abgeschnitten hat.
      // Als Fehler zählt sie nicht.
      befunde.push({
        datei: kennung.name,
        offset: gelesen.endeOffset,
        grund: "letzte Zeile unvollständig (§8.1) — kein Fehler, wird beim Weiterschreiben ergänzt",
        klasse: "vorlaeufig",
      });
    }

    for (const zeile of gelesen.zeilen) {
      identitaeten.vermerke(stelle(kennung.name, zeile.offset), zeile);
      // §2.4: `SegmentAbgeschlossen` und `SegmentErsetzt` reden über die Datei,
      // in der sie stehen. Sie gehören nicht in den Fold; er führte sie sonst
      // als unbekannte Ereignisart im Zustand, und damit läge Dateiverwaltung
      // im `zustandsHash`.
      if (istVerwaltungsereignis(zeile.rahmen.typ)) {
        verwaltungsereignisse += 1;
        continue;
      }
      // §4.6: Dieselbe Identität mit gleichem Inhalt ist dasselbe Ereignis und
      // geht genau einmal in den Fold.
      if (zeile.wiederholung) continue;
      ereignisse.push(alsEreignis(zeile.rahmen));
    }

    dateien.push({
      name: kennung.name,
      zeilen: gelesen.zeilen.length,
      geprueftBis: gelesen.endeOffset,
      bytes: bytes.byteLength,
    });
  }

  const zustand: Zustand = falte(ereignisse);
  return {
    ordner,
    ...(anker === undefined ? {} : { anker }),
    dateien,
    befunde,
    doppelte: identitaeten.doppelte,
    ereignisse: ereignisse.length,
    verwaltungsereignisse,
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
 * Der Rahmen der Speicherschicht als Eingang des Folds.
 *
 * Beide Seiten beschreiben dieselben Bytes: §2.4 legt den Rahmen fest, die
 * Speicherschicht kennt davon nur `id`, `vorgaenger` und `typ` und reicht
 * alles Weitere unverändert durch (§2.5). Der Fold liest die übrigen Felder;
 * was fehlt oder nicht passt, führt er nach §3.7 als unbekanntes Ereignis
 * mit — er verwirft nichts. Deshalb ist die Umdeutung hier zulässig und
 * braucht keine Vorprüfung, die den Bericht gerade um die Ereignisse brächte,
 * über die er berichten soll.
 */
function alsEreignis(rahmen: Rahmenblick): EingehendesEreignis {
  return rahmen as unknown as EingehendesEreignis;
}

/** Zahl der Befunde, die ein Urteil tragen — die vorläufigen aus §8.1 tun es nicht. */
export function endgueltigeBefunde(ergebnis: Pruefergebnis): readonly Befund[] {
  return ergebnis.befunde.filter((b) => b.klasse === "endgueltig");
}

/**
 * Doppelte Identitäten, die ein Mangel sind.
 *
 * Gleicher Inhalt ist nach §4.6 keiner: So sieht jede Reparatur über ein
 * Ersatzsegment aus. **Anderer** Inhalt unter derselben Id käme durch
 * `leseAbschnitt` gar nicht erst durch — er ist nach §8.2 ein Defekt und steht
 * bereits als solcher im Bericht; erreichbar ist dieser Fall hier nur für
 * Dateien, deren Kette mangels Anker ungeprüft blieb.
 */
export function widerspruechlicheDoppel(ergebnis: Pruefergebnis): readonly Doppelbefund[] {
  return ergebnis.doppelte.filter((d) => !d.gleicherInhalt);
}

function befundzeile(befund: Befund): string {
  const zeichen = befund.klasse === "endgueltig" ? "!" : "·";
  const ort = befund.offset === undefined ? befund.datei : stelle(befund.datei, befund.offset);
  return `  ${zeichen} ${ort}: ${befund.grund}`;
}

/** Der Bericht zu einem Ordner. Lesbar für einen Menschen, der ihn ausdruckt. */
export function berichte(ergebnis: Pruefergebnis): string {
  const zeilen: string[] = [];
  zeilen.push(`Einsatzordner:     ${ergebnis.ordner}`);
  if (ergebnis.anker === undefined) {
    zeilen.push(`Einsatz:           — (${DATEI_EINSATZ} nicht lesbar)`);
  } else {
    zeilen.push(`Einsatz:           ${ergebnis.anker.name} (${ergebnis.anker.einsatzId})`);
    zeilen.push(`Angelegt:          ${ergebnis.anker.angelegtAm} durch ${ergebnis.anker.angelegtVon}`);
  }

  const zeilenzahl = ergebnis.dateien.reduce((summe, d) => summe + d.zeilen, 0);
  zeilen.push(`Ereignisdateien:   ${ergebnis.dateien.length} mit ${zeilenzahl} geprüften Zeilen`);
  for (const datei of ergebnis.dateien) {
    const rest = datei.bytes - datei.geprueftBis;
    const anhang = rest === 0 ? "" : ` (${rest} Byte dahinter nicht ausgewertet)`;
    zeilen.push(`  ${datei.name}: ${datei.zeilen} Zeilen, geprüft bis Byte ${datei.geprueftBis}${anhang}`);
  }

  zeilen.push("");
  const endgueltig = endgueltigeBefunde(ergebnis);
  const vorlaeufig = ergebnis.befunde.filter((b) => b.klasse === "vorlaeufig");
  if (ergebnis.befunde.length === 0) {
    zeilen.push("Befunde:           keine");
  } else {
    zeilen.push(`Befunde:           ${endgueltig.length} endgültig (§8.2), ${vorlaeufig.length} vorläufig (§8.1)`);
    for (const befund of ergebnis.befunde) zeilen.push(befundzeile(befund));
  }

  if (ergebnis.doppelte.length > 0) {
    zeilen.push("");
    zeilen.push(`Doppelte Ereignis-Ids: ${ergebnis.doppelte.length}`);
    for (const doppel of ergebnis.doppelte) {
      const urteil = doppel.gleicherInhalt
        ? "gleicher Inhalt — dasselbe Ereignis (§4.6), einmal gefaltet"
        : "ANDERER Inhalt — zwei Schreiber unter derselben Kennung (§4.5, §8.2)";
      zeilen.push(`  ${doppel.id}: ${doppel.zuerst} und ${doppel.wieder} — ${urteil}`);
    }
  }

  zeilen.push("");
  zeilen.push("Gefalteter Zustand (§7.6):");
  zeilen.push(`  Ereignisse:      ${ergebnis.ereignisse}`);
  zeilen.push(`  Verwaltung:      ${ergebnis.verwaltungsereignisse} ausgesondert (§2.4)`);
  zeilen.push(`  foldVersion:     ${ergebnis.foldVersion}`);
  zeilen.push(`  zustandsHash:    ${ergebnis.zustandsHash}`);
  zeilen.push(`  Abschnitte:      ${ergebnis.abschnitte}`);
  zeilen.push(`  Einheiten:       ${ergebnis.einheiten}`);
  zeilen.push(`  Konflikthinweise: ${ergebnis.hinweise}`);
  zeilen.push(`  Unbekannte Arten: ${ergebnis.unbekannt}`);
  return zeilen.join("\n");
}

/**
 * Der Vergleich zweier Ordner — das Konvergenzkriterium aus §7.6.
 *
 * Verglichen wird der `zustandsHash` und **nicht** der Dateibestand. Zwei
 * Rechner haben nach einer Stunde mit Störungen zwangsläufig verschieden
 * geschnittene Dateien: Jeder hat eigene Segmente, ein reparierter hat ein
 * Ersatzsegment (§4.6), und der lokale Spiegel eines Lesers endet bei fremden
 * Dateien an seinem geprüften Präfix (§5.5). Gleich sein muss die Wirkung der
 * Ereignisse, und genau die misst der Hash.
 *
 * Anders als in der Simulation M0.4 wird hier **kein** Versionsvektor
 * herangezogen. Der Vektor beantwortet die Frage „haben beide dieselbe Eingabe
 * gesehen"; in M2.4 ist der Versuch beendet und beide Ordner sind ausgespiegelt
 * — gefragt ist das Ergebnis. Ein Unterschied in der Ereigniszahl wird deshalb
 * getrennt genannt, damit ein gleicher Hash bei ungleicher Menge nicht als
 * Konvergenz durchgeht.
 */
export function vergleichsbericht(links: Pruefergebnis, rechts: Pruefergebnis): {
  readonly text: string;
  readonly gleich: boolean;
} {
  const gleich = links.zustandsHash === rechts.zustandsHash;
  const zeilen = ["", "Konvergenzvergleich (§7.6):"];
  zeilen.push(`  ${links.ordner}`);
  zeilen.push(`    ${links.zustandsHash} über ${links.ereignisse} Ereignisse`);
  zeilen.push(`  ${rechts.ordner}`);
  zeilen.push(`    ${rechts.zustandsHash} über ${rechts.ereignisse} Ereignisse`);
  if (gleich) {
    zeilen.push("  Beide Ordner ergeben denselben zustandsHash — konvergent.");
    if (links.ereignisse !== rechts.ereignisse) {
      zeilen.push(
        "  Hinweis: verschieden viele Ereignisse bei gleichem Hash — die zusätzlichen sind wirkungslos.",
      );
    }
  } else {
    zeilen.push("  FEHLER — verschiedener zustandsHash: die beiden Rechner führen nicht denselben Einsatz.");
  }
  return { text: zeilen.join("\n"), gleich };
}

/** Alle Optionen, die `akte pruefe` kennt. Alles Übrige ist ein Aufruffehler. */
const ERLAUBTE_OPTIONEN = new Set(["vergleiche"]);

/**
 * Führt `s1 akte pruefe <ordner> [--vergleiche <ordner>]` aus.
 *
 * `argv` sind die Wörter **nach** `akte pruefe`. Wie in `index.ts` nimmt das
 * Kommando `argv` entgegen und greift nicht nach `process`: So ist es ohne
 * Unterprozess testbar, und der Exitcode ist Rückgabewert statt Nebenwirkung.
 */
export async function pruefe(
  argv: readonly string[],
  dateisystem: Dateisystem = knotenDateisystem(),
): Promise<Ergebnis> {
  const stellen: string[] = [];
  let vergleichsordner: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) {
      stellen.push(wort);
      continue;
    }
    const name = wort.slice(2);
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith("--")) {
      throw new SyntaxError(`--${name} braucht einen Ordner`);
    }
    vergleichsordner = wert;
    i += 1;
  }

  const ordner = stellen[0];
  if (ordner === undefined) throw new SyntaxError("Es fehlt der Einsatzordner");
  if (stellen.length > 1) throw new SyntaxError(`Unerwartetes Wort: ${stellen[1] as string}`);

  const ergebnis = await pruefeOrdner(dateisystem, ordner);
  const teile = [berichte(ergebnis)];
  let mangel = endgueltigeBefunde(ergebnis).length > 0 || widerspruechlicheDoppel(ergebnis).length > 0;

  if (vergleichsordner !== undefined) {
    const zweites = await pruefeOrdner(dateisystem, vergleichsordner);
    teile.push("", berichte(zweites));
    const vergleich = vergleichsbericht(ergebnis, zweites);
    teile.push(vergleich.text);
    mangel =
      mangel ||
      !vergleich.gleich ||
      endgueltigeBefunde(zweites).length > 0 ||
      widerspruechlicheDoppel(zweites).length > 0;
  }

  teile.push("");
  teile.push(mangel ? "Ergebnis: Befunde — siehe oben." : "Ergebnis: in Ordnung.");
  // Der Exitcode trägt das Urteil: 0 in Ordnung, 1 Befunde. Ein Abnahmeschritt
  // muss ohne Textauswertung entscheidbar sein (Auflage 18).
  return { text: teile.join("\n"), code: mangel ? 1 : 0 };
}
