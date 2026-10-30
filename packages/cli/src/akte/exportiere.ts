/**
 * `s1 akte exportiere` und `s1 akte importiere` — das Arbeitspaket M4.4
 * (05-UMSETZUNGSPLAN.md: „Einsatzakte als ZIP … Reimport per `s1 akte pruefe`
 * konsistent; Manifest mit Hashes über jede Datei").
 *
 * **Wozu ein Export, wenn der Share doch schon alles hat.** Der Share ist der
 * Arbeitsplatz, nicht das Archiv. Nach dem Einsatz wird der Ordner abgebaut,
 * die Freigabe verschwindet, das NAS geht zurück in den Fuhrpark. Was von
 * einem Einsatz bleiben muss, ist eine einzelne Datei, die man weitergeben,
 * ablegen und Jahre später wieder aufmachen kann — und der man ansieht, ob sie
 * unterwegs beschädigt wurde. Genau das ist dieses Archiv: die Ereignisse
 * (§1.4), die Schnappschüsse, die Anhänge und die Ausgaben aus M4.1 bis M4.3,
 * dazu ein Manifest mit einer SHA-256 über jede einzelne Datei.
 *
 * **Warum die Ereignisse und nicht nur der Endzustand.** Der Zustand ist eine
 * Ableitung; die Ereignisse sind die Aufzeichnung (KONZEPT-EREIGNISSE.md §1).
 * Ein Archiv, das nur den Endzustand hielte, könnte die Frage „wann wurde das
 * eingetragen und von wem" nicht mehr beantworten — und das ist die Frage,
 * derentwegen eine Einsatzdokumentation aufbewahrt wird. Die Schnappschüsse
 * fahren mit, weil sie das Wiederöffnen beschleunigen; nachprüfbar sind sie
 * ohnehin nur gegen die Ereignisse (§7.6).
 *
 * **Warum `praesenz/` fehlt.** Die Präsenzdateien nach §6.4 sind die Aussage
 * „dieser Client ist gerade da". In einem Archiv wäre diese Aussage falsch,
 * sobald sie geschrieben ist. Sie sind Betriebsdaten des laufenden Einsatzes
 * und gehören nicht in die Überlieferung.
 *
 * **Warum ein eigenes `importiere` neben `pruefe`.** Der Reimport ist der
 * Beweis, dass der Export etwas taugt, und ein Beweis, den nur ein fremdes
 * Werkzeug führen kann, wird in der Abnahme nicht geführt. `importiere` packt
 * mit `liesZip` aus demselben Ring aus, prüft dabei jede Datei gegen das
 * Manifest und stellt anschließend dieselbe Prüfung an wie `pruefe` — samt
 * Vergleich des `zustandsHash` gegen den, der beim Export galt (§7.6). Erst
 * dieser Vergleich sagt: Es ist derselbe Einsatz, nicht bloß dieselbe Menge
 * Bytes.
 *
 * **Der Kern steht in `@s1/speicher`** (`aktenarchiv.ts`): Prüfen, Sammeln,
 * Manifest und Ablegen. Die Oberfläche erzeugt dieselbe Akte über den
 * Worker; hier bleiben Aufruf, Bericht und der Reimport.
 */

import path from "node:path";

import { liesZip, schreibeZip } from "@s1/ausgaben";
import {
  EXPORT_FASSUNG,
  MANIFEST_DATEI,
  archivName,
  endgueltigeBefunde,
  knotenDateisystem,
  legeArchivAb,
  packeAkte,
  pruefeOrdner,
  sha256HexBytes,
  widerspruechlicheDoppel,
  type Dateisystem,
  type Manifest,
} from "@s1/speicher";

import { berichte } from "./pruefe.js";
import type { Ergebnis } from "./pruefe.js";

const ERLAUBTE_OPTIONEN = new Set(["ziel"]);

/** Liest die Stellen und `--ziel` aus `argv`; Unbekanntes wird gemeldet, nicht verschluckt. */
function deute(argv: readonly string[]): { readonly stelle: string; readonly ziel?: string } {
  const stellen: string[] = [];
  let ziel: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    const wort = argv[i] as string;
    if (!wort.startsWith("--")) {
      stellen.push(wort);
      continue;
    }
    const name = wort.slice(2);
    if (!ERLAUBTE_OPTIONEN.has(name)) throw new SyntaxError(`Unbekannte Option --${name}`);
    const wert = argv[i + 1];
    if (wert === undefined || wert.startsWith("--")) throw new SyntaxError(`--${name} braucht einen Pfad`);
    ziel = wert;
    i += 1;
  }
  const stelle = stellen[0];
  if (stelle === undefined) throw new SyntaxError("Es fehlt der Pfad");
  if (stellen.length > 1) throw new SyntaxError(`Unerwartetes Wort: ${stellen[1] as string}`);
  return ziel === undefined ? { stelle } : { stelle, ziel };
}

/**
 * `s1 akte exportiere <einsatzordner> [--ziel <datei>]`.
 *
 * **Eine Akte mit Befunden wird trotzdem exportiert.** Wer nach einem Einsatz
 * feststellt, dass eine Ereignisdatei einen Defekt nach §8.2 hat, braucht das
 * Archiv gerade dann — verweigerte der Export, bliebe der Rest auf einem
 * Share liegen, der abgebaut wird. Der Befund steht im Manifest und der
 * Exitcode ist 1, damit ein Ablauf ohne Textauswertung ihn nicht übersieht
 * (Auflage 18). Geschrieben wird die Datei in beiden Fällen.
 */
export async function exportiere(
  argv: readonly string[],
  dateisystem: Dateisystem = knotenDateisystem(),
  jetzt: () => number = Date.now,
): Promise<Ergebnis> {
  const { stelle, ziel } = deute(argv);
  const { bytes, manifest } = await packeAkte(dateisystem, stelle, new Date(jetzt()), schreibeZip);
  const datei = ziel ?? path.join(process.cwd(), archivName(manifest));
  await legeArchivAb(dateisystem, datei, bytes);

  const zeilen = [
    `Einsatz:       ${manifest.einsatzName ?? "(ohne Anker)"} (${manifest.einsatzId ?? "?"})`,
    `Archiv:        ${datei}`,
    `Dateien:       ${manifest.dateien.length}`,
    `Bytes:         ${bytes.length}`,
    `Ereignisse:    ${manifest.ereignisse} (foldVersion ${manifest.foldVersion})`,
    `zustandsHash:  ${manifest.zustandsHash}`,
    "",
    manifest.befunde > 0
      ? `Ergebnis: ${manifest.befunde} Befund(e) in der Akte — das Archiv ist geschrieben, die Akte ist es nicht wert.`
      : "Ergebnis: in Ordnung.",
  ];
  return { text: zeilen.join("\n"), code: manifest.befunde > 0 ? 1 : 0 };
}

/**
 * `s1 akte importiere <archiv.zip> --ziel <ordner>`.
 *
 * Der Zielordner muss leer oder nicht vorhanden sein. Ein Import **in** eine
 * bestehende Akte wäre ein Mischen zweier Ereignisströme unter Umgehung der
 * Speicherschicht; wer zwei Bestände zusammenführen will, tut das über die
 * Spiegelung (§5) und nicht mit einem Auspacker.
 */
export async function importiere(
  argv: readonly string[],
  dateisystem: Dateisystem = knotenDateisystem(),
): Promise<Ergebnis> {
  const { stelle, ziel } = deute(argv);
  if (ziel === undefined) throw new SyntaxError("Es fehlt --ziel <ordner>");
  const vorhanden = await dateisystem.listeVerzeichnis(ziel);
  if (vorhanden.length > 0) throw new SyntaxError(`Zielordner ist nicht leer: ${ziel}`);

  const eintraege = liesZip(await dateisystem.liesAb(stelle, 0));
  const manifestEintrag = eintraege.find((eintrag) => eintrag.pfad === MANIFEST_DATEI);
  if (manifestEintrag === undefined) throw new SyntaxError(`Kein ${MANIFEST_DATEI} im Archiv`);
  const manifest = JSON.parse(new TextDecoder().decode(manifestEintrag.bytes)) as Manifest;
  if (manifest.fassung !== EXPORT_FASSUNG) {
    throw new SyntaxError(`Archivfassung ${manifest.fassung}, erwartet ${EXPORT_FASSUNG}`);
  }

  // Erst prüfen, dann schreiben: Ein halb ausgepacktes Archiv sähe aus wie
  // eine Akte und wäre keine.
  const abweichungen: string[] = [];
  const nachPfad = new Map(eintraege.map((eintrag) => [eintrag.pfad, eintrag]));
  for (const soll of manifest.dateien) {
    const ist = nachPfad.get(soll.pfad);
    if (ist === undefined) {
      abweichungen.push(`${soll.pfad}: fehlt im Archiv`);
      continue;
    }
    if (ist.bytes.length !== soll.bytes) {
      abweichungen.push(`${soll.pfad}: ${ist.bytes.length} statt ${soll.bytes} Bytes`);
      continue;
    }
    if (sha256HexBytes(ist.bytes) !== soll.sha256) abweichungen.push(`${soll.pfad}: SHA-256 stimmt nicht`);
  }
  const ueberzaehlig = eintraege
    .map((eintrag) => eintrag.pfad)
    .filter((pfad) => pfad !== MANIFEST_DATEI && !manifest.dateien.some((soll) => soll.pfad === pfad));
  for (const pfad of ueberzaehlig) abweichungen.push(`${pfad}: steht nicht im Manifest`);

  if (abweichungen.length > 0) {
    return {
      text: [`Archiv: ${stelle}`, "", ...abweichungen.map((zeile) => `  ${zeile}`), "", "Ergebnis: Befunde — nichts ausgepackt."].join("\n"),
      code: 1,
    };
  }

  for (const eintrag of eintraege) {
    if (eintrag.pfad === MANIFEST_DATEI) continue;
    const datei = path.join(ziel, ...eintrag.pfad.split("/"));
    await dateisystem.legeVerzeichnisAn(path.dirname(datei));
    await dateisystem.haengeAnUndSynchronisiere(datei, eintrag.bytes);
  }

  // Die eigentliche Abnahme von M4.4: derselbe Prüflauf wie `s1 akte pruefe`
  // auf dem ausgepackten Ordner, und der Vergleich des `zustandsHash` gegen
  // den des Exports (§7.6). Gleiche Bytes sind noch kein gleicher Einsatz.
  const ergebnis = await pruefeOrdner(dateisystem, ziel);
  const gleich = ergebnis.zustandsHash === manifest.zustandsHash;
  const mangel =
    !gleich || endgueltigeBefunde(ergebnis).length > 0 || widerspruechlicheDoppel(ergebnis).length > 0;

  const zeilen = [
    `Archiv:        ${stelle}`,
    `Ausgepackt:    ${ziel} (${manifest.dateien.length} Dateien)`,
    "",
    berichte(ergebnis),
    "",
    gleich
      ? `zustandsHash stimmt mit dem Export überein: ${ergebnis.zustandsHash}`
      : `zustandsHash weicht ab: ${ergebnis.zustandsHash} statt ${manifest.zustandsHash}`,
    "",
    mangel ? "Ergebnis: Befunde — siehe oben." : "Ergebnis: in Ordnung.",
  ];
  return { text: zeilen.join("\n"), code: mangel ? 1 : 0 };
}
