/**
 * Ein Paket aus der Veröffentlichung holen und in den Share legen (M9.1).
 *
 * **Was dieser Weg tut.** Ein Mensch drückt an **einem** Arbeitsplatz einen
 * Knopf. Dieser Arbeitsplatz holt die Auskunft über die neueste
 * Veröffentlichung, lädt Manifest und Paket, prüft die Signatur und den Hash —
 * und legt beides in `programm\` auf dem Share. Danach bekommen es die übrigen
 * Arbeitsplätze über den Weg aus M7.2 angeboten, unverändert.
 *
 * **Was er nicht tut.** Er installiert nichts, er startet nichts neu, und er
 * läuft nie von selbst. Entscheidung 7 bleibt: Der Verteilweg **ist** der
 * Share; die Veröffentlichung ist die Quelle, aus der ihn ein Mensch befüllt.
 *
 * **Geprüft wird vor dem Schreiben, nicht danach.** Das ist die Festlegung,
 * an der hier alles hängt: Zwischen „heruntergeladen" und „auf dem Share"
 * liegt die vollständige Prüfung aus M7.2 — Schlüssel, Signatur, Plattform,
 * Fassung, Hash. Kommt eine davon nicht durch, wird nichts geschrieben. Ein
 * Paket, das erst auf dem Share landet und dort auffällt, hätte man den
 * anderen Arbeitsplätzen bereits hingelegt.
 *
 * **Die Reihenfolge des Schreibens ist umgekehrt zur Reihenfolge des Lesens.**
 * Ein Leser nimmt zuerst das Manifest und sucht dann die Datei daneben
 * (§ M7.2). Geschrieben wird deshalb erst das Paket und zuletzt das Manifest:
 * Bis das Manifest steht, sieht ein anderer Arbeitsplatz den alten Stand, und
 * danach einen vollständigen. Ein halber Stand entsteht in keinem Augenblick.
 *
 * **Das Netz ist eingespritzt.** Diese Datei ruft `fetch` nicht selbst — sie
 * bekommt einen Holer. Ohne diese Naht wäre kein einziger der Ablehnungsfälle
 * prüfbar, und genau die sind es, auf die es ankommt.
 */

import {
  DATEI_MANIFEST,
  anhang,
  deuteRelease,
  pruefeManifest,
  vergleicheVersionen,
  type Ablehnungsgrund,
} from "@s1/domaene";
import { sha256HexBytes, type Dateisystem } from "@s1/speicher";

import { ERLAUBTE_WIRTE } from "./verteilquelle.js";

/**
 * Der Griff ins Netz, so schmal wie möglich.
 *
 * Zwei Verfahren und eine Grenze je Aufruf; alles Weitere — Zeitausstieg,
 * Kopfzeilen, Umleitungen — gehört in die Umsetzung und nicht in diese Naht.
 */
export interface Netzholer {
  /** Holt eine Antwort als Text; wirft bei Fehler oder Überschreitung der Grenze. */
  text(url: string, grenzeBytes: number): Promise<string>;
  /** Holt eine Antwort als Bytes; wirft bei Fehler oder Überschreitung der Grenze. */
  bytes(url: string, grenzeBytes: number): Promise<Uint8Array>;
}

/** Warum ein Bezug nicht zustande kam. */
export type Bezugsgrund =
  | Ablehnungsgrund
  /** Diese Fassung hat keinen Vertrauensanker; ohne ihn wird nichts geholt. */
  | "keinSchluessel"
  /** Es ist kein Share eingestellt, in den zu legen wäre. */
  | "keinShare"
  /** Das Netz oder die Gegenstelle hat nicht geantwortet. */
  | "netzfehler"
  /** Die Veröffentlichung führt kein Manifest oder kein Paket dieses Namens. */
  | "unvollstaendig";

export type Bezugsbefund =
  | {
      readonly art: "geholt";
      readonly version: string;
      readonly datei: string;
      readonly groesse: number;
      readonly pfad: string;
      readonly kurzform: string;
    }
  /** Es gibt nichts Neueres als das, was schon da ist. */
  | { readonly art: "aktuell"; readonly vorhanden: string }
  | { readonly art: "abgelehnt"; readonly grund: Bezugsgrund; readonly meldung: string };

export interface Bezugsoptionen {
  readonly netz: Netzholer;
  readonly dateisystem: Dateisystem;
  /** Die Adresse der Auskunft über die neueste Veröffentlichung. */
  readonly auskunft: string;
  /** Der Ordner `programm\` auf dem Share, absolut. */
  readonly programmordner: string;
  /** Wie Pfade in diesem Ordner zusammengesetzt werden — `path.join` der Schale. */
  readonly verbinde: (ordner: string, name: string) => string;
  readonly vertrauterSchluessel: string;
  readonly laufendeVersion: string;
  /**
   * Die Fassung, die schon im Share liegt — falls eine liegt.
   *
   * Sie geht **zusätzlich** zur laufenden in den Vergleich ein: Wer an einem
   * alten Arbeitsplatz sitzt, soll nicht ein Paket herunterladen, das drüben
   * längst liegt. Beide Fassungen zu prüfen kostet nichts und erspart einen
   * Download von neunzig Megabyte.
   */
  readonly vorhandeneVersion?: string;
  readonly plattform: string;
  readonly manifestGrenze: number;
  readonly paketGrenze: number;
  readonly protokolliere: (stufe: "info" | "warnung" | "fehler", text: string) => void;
}

function abgelehnt(grund: Bezugsgrund, meldung: string): Bezugsbefund {
  return { art: "abgelehnt", grund, meldung };
}

/** Die höhere von laufender und bereits abgelegter Fassung. */
function messlatte(o: Bezugsoptionen): string {
  const vorhanden = o.vorhandeneVersion;
  if (vorhanden === undefined) return o.laufendeVersion;
  return vergleicheVersionen(vorhanden, o.laufendeVersion) > 0 ? vorhanden : o.laufendeVersion;
}

/**
 * Der ganze Vorgang, in der Reihenfolge, in der er stattfindet.
 *
 * Jeder Schritt kann abbrechen, und jeder Abbruch nennt seinen Grund. Was
 * **nicht** vorkommt, ist ein Abbruch nach dem Schreiben: Geschrieben wird
 * erst, wenn alles geprüft ist.
 */
export async function holePaket(o: Bezugsoptionen): Promise<Bezugsbefund> {
  if (o.vertrauterSchluessel === "") {
    return abgelehnt(
      "keinSchluessel",
      "Für diese Fassung ist kein Verteilschlüssel hinterlegt; ein Paket kann deshalb nicht geprüft und nicht geholt werden.",
    );
  }
  if (o.programmordner === "") {
    return abgelehnt("keinShare", "Es ist kein Share eingestellt, in den ein Paket zu legen wäre.");
  }

  // 1. Die Auskunft. Sie ist der einzige Ruf, der ohne vorherige Prüfung
  //    hinausgeht — deshalb geht er an eine Adresse aus dem Quelltext.
  let auskunft: string;
  try {
    auskunft = await o.netz.text(o.auskunft, o.manifestGrenze);
  } catch (fehler) {
    return abgelehnt("netzfehler", `Die Veröffentlichungsstelle antwortet nicht: ${meldungVon(fehler)}`);
  }

  const befund = deuteRelease(auskunft, ERLAUBTE_WIRTE);
  if (befund.art !== "gefunden") return abgelehnt("unlesbar", befund.meldung);
  const release = befund.release;

  // 2. Ein früher Vergleich über die Marke: Er erspart im Regelfall zwei Rufe.
  //    Verlassen wird sich darauf **nicht** — die Marke ist unsigniert, und
  //    die verbindliche Aussage über die Fassung steht im Manifest.
  const latte = messlatte(o);
  if (vergleicheVersionen(release.version, latte) <= 0) {
    return { art: "aktuell", vorhanden: latte };
  }

  // 3. Das Manifest.
  const manifestAnhang = anhang(release, DATEI_MANIFEST);
  if (manifestAnhang === undefined) {
    return abgelehnt(
      "unvollstaendig",
      `Die Veröffentlichung ${release.version} führt kein ${DATEI_MANIFEST}; ohne Manifest wird nichts geholt.`,
    );
  }
  let manifestText: string;
  try {
    manifestText = await o.netz.text(manifestAnhang.url, o.manifestGrenze);
  } catch (fehler) {
    return abgelehnt("netzfehler", `Das Manifest ließ sich nicht laden: ${meldungVon(fehler)}`);
  }

  // 4. Die Prüfung ohne Dateihash — sie sagt, **ob** und **was** zu laden ist.
  //    Erst ab hier ist der Inhalt beglaubigt; vorher wird aus ihm nichts
  //    abgeleitet, auch kein Dateiname.
  const geprueft = await pruefeManifest({
    text: manifestText,
    vertrauterSchluessel: o.vertrauterSchluessel,
    laufendeVersion: latte,
    plattform: o.plattform,
  });
  if (geprueft.art === "abgelehnt") {
    if (geprueft.grund === "nichtNeuer") return { art: "aktuell", vorhanden: latte };
    return abgelehnt(geprueft.grund, geprueft.meldung);
  }
  const stand = geprueft.stand;

  // 5. Das Paket. Der Anhang muss genau so heißen, wie das beglaubigte
  //    Manifest ihn nennt — nicht ähnlich, nicht der einzige mit `.exe`.
  const paketAnhang = anhang(release, stand.datei);
  if (paketAnhang === undefined) {
    return abgelehnt(
      "unvollstaendig",
      `Das Manifest nennt ${stand.datei}; die Veröffentlichung führt keinen Anhang dieses Namens.`,
    );
  }
  if (stand.groesse > o.paketGrenze) {
    return abgelehnt(
      "unlesbar",
      `Das Paket ist mit ${String(stand.groesse)} Byte größer als die Grenze dieses Weges.`,
    );
  }
  let bytes: Uint8Array;
  try {
    // Geladen wird höchstens, was das **beglaubigte** Manifest ansagt. Wer
    // mehr schickt, als er angesagt hat, wird abgeschnitten und abgelehnt —
    // die Grenze steht nicht auf der Grenze dieses Weges, sondern auf der
    // Zusage, die geprüft wurde.
    bytes = await o.netz.bytes(paketAnhang.url, stand.groesse);
  } catch (fehler) {
    return abgelehnt("netzfehler", `Das Paket ließ sich nicht laden: ${meldungVon(fehler)}`);
  }

  // 6. Die vollständige Prüfung, jetzt mit dem Hash dessen, was tatsächlich
  //    angekommen ist.
  const dateiHash = sha256HexBytes(bytes);
  const mitDatei = await pruefeManifest({
    text: manifestText,
    vertrauterSchluessel: o.vertrauterSchluessel,
    laufendeVersion: latte,
    plattform: o.plattform,
    dateiHash,
  });
  if (mitDatei.art !== "angeboten") {
    const grund: Bezugsgrund = mitDatei.art === "abgelehnt" ? mitDatei.grund : "unlesbar";
    const meldung = mitDatei.art === "abgelehnt" ? mitDatei.meldung : "Das Manifest kam nicht durch.";
    o.protokolliere("warnung", `Geholtes Paket abgelehnt: ${meldung}`);
    return abgelehnt(grund, meldung);
  }

  // 7. Erst jetzt wird geschrieben. Paket zuerst, Manifest zuletzt.
  const paketPfad = o.verbinde(o.programmordner, stand.datei);
  const teilPfad = `${paketPfad}.teil`;
  try {
    await o.dateisystem.legeVerzeichnisAn(o.programmordner);
    await o.dateisystem.loesche(teilPfad).catch(() => undefined);
    await o.dateisystem.schreibeNeuAnlegen(teilPfad, bytes);
    // Über den Zwischennamen, damit kein Leser eine halbe Datei sieht. Ein
    // Umbenennen ist auf SMB nicht als atomar zugesichert (§8.4) — es ist
    // hier trotzdem der bessere Weg, weil das Manifest ohnehin erst danach
    // kommt und bis dahin niemand nach dieser Datei sucht.
    await o.dateisystem.loesche(paketPfad).catch(() => undefined);
    await o.dateisystem.benenneUm(teilPfad, paketPfad);
    await o.dateisystem.schreibeUeberOhneSync(
      o.verbinde(o.programmordner, DATEI_MANIFEST),
      new TextEncoder().encode(manifestText),
    );
  } catch (fehler) {
    return abgelehnt(
      "keinShare",
      `Das Paket ließ sich nicht in den Share legen: ${meldungVon(fehler)}`,
    );
  }

  o.protokolliere(
    "info",
    `Paket ${stand.version} geholt und in ${o.programmordner} gelegt (${stand.datei}, ${String(stand.groesse)} Byte).`,
  );
  return {
    art: "geholt",
    version: stand.version,
    datei: stand.datei,
    groesse: stand.groesse,
    pfad: paketPfad,
    kurzform: mitDatei.kurzform,
  };
}

function meldungVon(fehler: unknown): string {
  return fehler instanceof Error ? fehler.message : String(fehler);
}
