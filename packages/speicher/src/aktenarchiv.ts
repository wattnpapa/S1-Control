/**
 * Die Einsatzakte als Archiv — der gemeinsame Kern von `s1 akte exportiere`
 * und dem Knopf „Einsatzakte erzeugen" der Oberfläche (M4.4).
 *
 * **Wozu ein Archiv, wenn der Share doch alles hat.** Der Share ist der
 * Arbeitsplatz, nicht das Archiv. Nach dem Einsatz wird der Ordner abgebaut;
 * was bleiben muss, ist eine einzelne Datei, die man weitergeben, ablegen und
 * Jahre später wieder aufmachen kann — und der man ansieht, ob sie unterwegs
 * beschädigt wurde: die Ereignisse (§1.4), die Schnappschüsse, die Anhänge
 * und die Ausgaben, dazu ein Manifest mit einer SHA-256 über jede Datei.
 *
 * **Warum `praesenz/` fehlt.** Die Präsenzdateien (§6.4) sagen „dieser
 * Client ist gerade da" — in einem Archiv wäre das falsch, sobald es
 * geschrieben ist.
 *
 * **Warum das ZIP hereingereicht wird.** Der Schreiber des Formats liegt in
 * `@s1/ausgaben`, und die Speicherschicht darf ihr Geschwister nicht sehen
 * (02-ZIELBILD.md, „Vier Ringe"). Statt den Packer zu verdoppeln, nimmt
 * {@link packeAkte} ihn als Parameter — dieselbe Naht wie `sha256Hex` beim
 * `zustandsHash`. Kommandozeile und Worker reichen beide `schreibeZip` hinein
 * und bekommen bitgleiche Archive.
 */

import path from "node:path";

import { pruefeOrdner, endgueltigeBefunde, widerspruechlicheDoppel } from "./aktenpruefung.js";
import { DateisystemFehler, type Dateisystem } from "./dateisystem.js";
import {
  DATEI_EINSATZ,
  ORDNER_ANHAENGE,
  ORDNER_AUSGABEN,
  ORDNER_EREIGNISSE,
  ORDNER_SCHNAPPSCHUESSE,
} from "./pfade.js";
import { sha256HexBytes } from "./pruefsummen.js";

/**
 * Die Ordner, die mitfahren — in dieser Reihenfolge, damit zwei Exporte
 * desselben Bestands dieselbe Datei ergeben. `praesenz/` fehlt mit Absicht.
 */
export const EXPORT_ORDNER = [
  ORDNER_EREIGNISSE,
  ORDNER_SCHNAPPSCHUESSE,
  ORDNER_ANHAENGE,
  ORDNER_AUSGABEN,
] as const;

/** Der Name des Manifests im Archiv. */
export const MANIFEST_DATEI = "manifest.json";

/**
 * Die Fassung des Archivformats — im Manifest, damit ein späterer Leser eine
 * ältere Datei erkennt, statt an ihr zu scheitern (KONZEPT-EREIGNISSE.md §7.4).
 */
export const EXPORT_FASSUNG = 1;

/** Ein Eintrag des Archivs: Pfad mit `/` als Trenner und Inhalt. */
export interface Akteneintrag {
  readonly pfad: string;
  readonly bytes: Uint8Array;
}

/** Der hereingereichte Packer — im Betrieb `schreibeZip` aus `@s1/ausgaben`. */
export type Aktenpacker = (
  eintraege: readonly Akteneintrag[],
  optionen: { readonly zeitpunkt: Date },
) => Uint8Array;

/** Ein Eintrag im Manifest: was drin ist, wie groß, und mit welcher Prüfsumme. */
export interface Manifesteintrag {
  readonly pfad: string;
  readonly bytes: number;
  readonly sha256: string;
}

/** Das Manifest — die Inhaltsangabe des Archivs. */
export interface Manifest {
  readonly fassung: number;
  /** Wanduhrzeit des Exports, ISO-8601 mit Zone; rein informativ. */
  readonly erzeugt: string;
  readonly einsatzId?: string;
  readonly einsatzName?: string;
  readonly einsatzDatum?: string;
  /** Gefaltete fachliche Ereignisse zum Zeitpunkt des Exports. */
  readonly ereignisse: number;
  readonly foldVersion: number;
  /** SHA-256 über die kanonische Serialisierung des Zustands (§7.6). */
  readonly zustandsHash: string;
  /** Waren beim Export endgültige Befunde offen (§8.2)? */
  readonly befunde: number;
  readonly dateien: readonly Manifesteintrag[];
}

/**
 * Sammelt alle Dateien unterhalb von `ordner` rekursiv, relativ zu ihm und mit
 * `/` als Trenner.
 *
 * Datei oder Ordner entscheidet der Leseversuch (`EISDIR`): Der Port kennt
 * bewusst kein `stat` (§2.2, §6.6). Sortiert wird nach Codepunkten und nicht
 * nach Gebietsschema — ein Archiv, das auf zwei Rechnern verschieden
 * herauskommt, ließe sich nicht vergleichen (§5.3).
 */
export async function sammleDateien(
  dateisystem: Dateisystem,
  ordner: string,
  praefix = "",
): Promise<readonly Akteneintrag[]> {
  const namen = [...(await dateisystem.listeVerzeichnis(ordner))].sort();
  const gefunden: Akteneintrag[] = [];
  for (const name of namen) {
    const voll = path.join(ordner, name);
    const relativ = praefix === "" ? name : `${praefix}/${name}`;
    let bytes: Uint8Array;
    try {
      bytes = await dateisystem.liesAb(voll, 0);
    } catch (fehler) {
      if (fehler instanceof DateisystemFehler && fehler.code === "EISDIR") {
        gefunden.push(...(await sammleDateien(dateisystem, voll, relativ)));
        continue;
      }
      throw fehler;
    }
    gefunden.push({ pfad: relativ, bytes });
  }
  return gefunden;
}

/** `einsatz.json` zuerst: Sie ist der Anker (§5.6), und wer das Archiv aufmacht, sieht zuerst, welcher Einsatz es ist. */
async function sammleInhalte(dateisystem: Dateisystem, ordner: string): Promise<Akteneintrag[]> {
  const inhalte: Akteneintrag[] = [];
  try {
    inhalte.push({ pfad: DATEI_EINSATZ, bytes: await dateisystem.liesAb(path.join(ordner, DATEI_EINSATZ), 0) });
  } catch (fehler) {
    if (!(fehler instanceof DateisystemFehler) || fehler.code !== "ENOENT") throw fehler;
  }
  for (const unterordner of EXPORT_ORDNER) {
    inhalte.push(...(await sammleDateien(dateisystem, path.join(ordner, unterordner), unterordner)));
  }
  return inhalte;
}

/**
 * Baut das Archiv im Speicher.
 *
 * Der Zeitpunkt geht als Parameter hinein und wird nicht der Systemuhr
 * entnommen: Nur so ist ein Export im Test bitgleich wiederholbar.
 */
export async function packeAkte(
  dateisystem: Dateisystem,
  ordner: string,
  zeitpunkt: Date,
  packe: Aktenpacker,
): Promise<{ readonly bytes: Uint8Array; readonly manifest: Manifest }> {
  const ergebnis = await pruefeOrdner(dateisystem, ordner);
  const inhalte = await sammleInhalte(dateisystem, ordner);
  const manifest: Manifest = {
    fassung: EXPORT_FASSUNG,
    erzeugt: zeitpunkt.toISOString(),
    ...(ergebnis.anker === undefined
      ? {}
      : { einsatzId: ergebnis.anker.einsatzId, einsatzName: ergebnis.anker.name, einsatzDatum: ergebnis.anker.datum }),
    ereignisse: ergebnis.ereignisse,
    foldVersion: ergebnis.foldVersion,
    zustandsHash: ergebnis.zustandsHash,
    befunde: endgueltigeBefunde(ergebnis).length + widerspruechlicheDoppel(ergebnis).length,
    dateien: inhalte.map((eintrag) => ({
      pfad: eintrag.pfad,
      bytes: eintrag.bytes.length,
      sha256: sha256HexBytes(eintrag.bytes),
    })),
  };
  // Das Manifest steht am Ende und trägt keine Prüfsumme über sich selbst —
  // seine Unversehrtheit sichert die CRC-32 des Formats (APPNOTE 4.4.7).
  const text = new TextEncoder().encode(`${JSON.stringify(manifest, undefined, 2)}\n`);
  return { bytes: packe([...inhalte, { pfad: MANIFEST_DATEI, bytes: text }], { zeitpunkt }), manifest };
}

/** Der vorgeschlagene Dateiname eines Archivs. */
export function archivName(manifest: Manifest): string {
  return `${manifest.einsatzId ?? "einsatz"}.zip`;
}

/**
 * Legt ein Archiv dauerhaft ab.
 *
 * Anhängen an eine geleerte Datei statt Überschreiben: `haengeAnUndSynchronisiere`
 * ist der einzige Ruf des Ports, der synchronisiert (§2.2) — ein Archiv ohne
 * `fsync` wäre nach einem Stromausfall genau das, wogegen es geschrieben wurde.
 * `loesche` davor, weil ein zweiter Lauf sonst an das erste anhängte.
 */
export async function legeArchivAb(dateisystem: Dateisystem, datei: string, bytes: Uint8Array): Promise<void> {
  await dateisystem.legeVerzeichnisAn(path.dirname(datei));
  await dateisystem.loesche(datei);
  await dateisystem.haengeAnUndSynchronisiere(datei, bytes);
}
